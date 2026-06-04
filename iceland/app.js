(function () {
  const API_BASE = "https://script.google.com/macros/s/AKfycbzdizbJL4rRrHaeVNWFqp4mZiJ8BXJdE0wO7beJTIjyLgy4Nmzv9vDGmjRNi5TLgWg0/exec";
  const SHEET_MAP = { overview: "總覽", accommodation: "住宿", car: "租車", activity: "活動", split: "寫入_分帳", lines: "台詞", flight: "航班" };

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function num(value) {
    if (typeof value === 'number') return value;
    const n = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  function yes(value) {
    const s = String(value ?? '').trim().toLowerCase();
    return ['true', 'yes', 'y', '1', '✓', '勾選', '已付', '已付款'].includes(s);
  }

  // cells 二維陣列 → [{欄位名: 值}] rows 格式
  function cellsToRows(sheet) {
    const cells = sheet?.cells;
    if (!Array.isArray(cells) || cells.length < 2) return [];
    const headers = cells[0].map(h => String(h ?? '').trim());
    return cells.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => { if (h) obj[h] = row[i] ?? ''; });
      return obj;
    });
  }

  function pick(row, keys, fallback = '') {
    for (const key of keys) if (row && row[key] !== undefined && row[key] !== '') return row[key];
    return fallback;
  }

  function transformData({ overview, accommodation, car, activity, split, lines, flight }) {

    // ── 匯率（總覽）
    const oCells = overview?.cells ?? [];
    const iskRow = oCells.find(r => r.includes('ISK')) || [];
    const eurRow = oCells.find(r => r.includes('EUR')) || [];
    const iskIdx = iskRow.indexOf('ISK');
    const eurIdx = eurRow.indexOf('EUR');
    const exchangeISK = iskIdx >= 0 ? num(iskRow[iskIdx + 1]) : (window.STATIC?.exchangeISK ?? 0);
    const exchangeEUR = eurIdx >= 0 ? num(eurRow[eurIdx + 1]) : (window.STATIC?.exchangeEUR ?? 0);

    // ── 住宿
    const accomRows = cellsToRows(accommodation);
    const accom = accomRows
      .filter(row => {
        const name = String(row['住宿地點'] ?? '').trim();
        // 過濾空列與小計/每人列
        return name !== '' && !String(Object.values(row).join('')).match(/小計|每人/);
      })
      .map(row => ({
        name:       pick(row, ['住宿地點', '住宿名稱', '名稱']),
        date:       pick(row, ['日期', '入住日期']),
        nights:     num(pick(row, ['天數', '晚數'], 1)) || 1,
        // 幣別：去掉結尾的點，EU → EUR，ISK → ISK，NT → NT
        cur:        String(pick(row, ['幣別'], 'NT')).replace(/\.$/, '').replace(/^EU$/, 'EUR').replace(/^ISK$/, 'ISK').replace(/^NT$/, 'NT'),
        orig:       num(pick(row, ['價格', '原價', '金額'])),
        twd:        num(pick(row, ['換算台幣', '台幣'])),
        paid:       yes(pick(row, ['已付款?', '已付款', '付款'])),
        cancel:     yes(pick(row, ['可取消?', '可取消'])),
        payer:      pick(row, ['付款人'], ''),
        payDate:    pick(row, ['付款期限/時間', '付款日', '付款日期'], ''),
        deductDate: pick(row, ['扣款日', '扣款日期'], ''),
        foreignFee: num(pick(row, ['海外手續費', '手續費'])),
        note:       pick(row, ['備註'], ''),
      }))
      .filter(item => item.name);

    // ── 租車
    const carRows = cellsToRows(car);
    const carRow = carRows.find(row => Object.values(row).some(v => String(v ?? '').trim() !== '')) || {};
    const carData = {
      company:   pick(carRow, ['租車公司', '公司'],     window.STATIC?.car?.company ?? ''),
      model:     pick(carRow, ['車種', '車款'],         window.STATIC?.car?.model ?? ''),
      code:      pick(carRow, ['確認碼', '訂單編號'],   window.STATIC?.car?.code ?? ''),
      pickup:    pick(carRow, ['取車時間'],             window.STATIC?.car?.pickup ?? ''),
      dropoff:   pick(carRow, ['換車時間', '還車時間'], window.STATIC?.car?.dropoff ?? ''),
      days:      num(pick(carRow, ['天數'], 0))         || window.STATIC?.car?.days || 0,
      location:  pick(carRow, ['取車地點', '取還車地點'],window.STATIC?.car?.location ?? ''),
      totalTWD:  num(pick(carRow, ['台幣', '總額']))    || window.STATIC?.car?.totalTWD || 0,
      perPerson: num(pick(carRow, ['每人付款', '每人'])) || window.STATIC?.car?.perPerson || 0,
      driver1:   pick(carRow, ['主駕'],                 window.STATIC?.car?.driver1 ?? ''),
      driver2:   pick(carRow, ['副駕'],                 window.STATIC?.car?.driver2 ?? ''),
      payer:        pick(carRow, ['付款人'],               window.STATIC?.car?.payer ?? ''),
      insurance:    window.STATIC?.car?.insurance ?? [],
      startMileage: num(pick(carRow, ['取車里程'], 0)) || window.STATIC?.car?.startMileage || 0,
    };

    // 駕駛資訊從 cells 底部備註列讀
    const carCells = car?.cells ?? [];
    const d1Row = carCells.find(r => String(r[0] ?? '').includes('主要駕駛'));
    const d2Row = carCells.find(r => String(r[0] ?? '').includes('額外駕駛'));
    if (d1Row) carData.driver1 = String(d1Row[0]).replace(/主要駕駛[:：]?/, '').trim();
    if (d2Row) carData.driver2 = String(d2Row[0]).replace(/額外駕駛[:：]?/, '').trim();

    // ── 分帳明細（直接從 寫入_分帳 讀現成結果）
    const splitRows = cellsToRows(split);
    const splitData = {};
    splitRows
      .filter(row => ['猴','花','寧'].some(m => String(row['成員'] ?? '').includes(m)))
      .forEach(row => {
        const name = ['猴','花','寧'].find(m => String(row['成員'] ?? '').includes(m));
        if (!name) return;
        splitData[name] = {
          paid:    num(pick(row, ['總付出 (代墊)', '總付出'])),
          balance: num(pick(row, ['還款後結算'])),
        };
      });

    // ── 台詞
    const linesRows = cellsToRows(lines);
    const dialogLines = {};
    linesRows.forEach(row => {
      const char   = String(row['角色'] ?? '').trim();
      const state  = String(row['狀態'] ?? '').trim();
      const line1  = String(row['台詞1'] ?? '').trim();
      const line2  = String(row['台詞2'] ?? '').trim();
      if (!char || !state) return;
      if (!dialogLines[char]) dialogLines[char] = {};
      dialogLines[char][state] = [line1, line2].filter(Boolean);
    });

    // ── 還款記錄（從 寫入_分帳 的還款區讀取）
    const repayRows = cellsToRows(split);
    const repayHistory = repayRows
      .filter(row => {
        const from = String(row['還款人'] ?? '').trim();
        const to   = String(row['還給'] ?? '').trim();
        return from && to;
      })
      .map(row => ({
        from:   String(row['還款人'] ?? '').trim(),
        to:     String(row['還給'] ?? '').trim(),
        amount: num(pick(row, ['還款金額', '金額'])),
        date:   String(row['還款日期'] ?? '').trim(),
        note:   String(row['備註'] ?? '').trim(),
      }))
      .filter(r => r.amount > 0);

    // ── 航班
    const flightRows = cellsToRows(flight);
    // 先找出所有有乘客名的行（第一段），建立乘客索引
    const flightByPerson = {};
    let currentPerson = null;
    flightRows.forEach(row => {
      const person = String(row['乘客'] ?? '').trim();
      if (person) currentPerson = person;
      if (!currentPerson) return;
      if (!flightByPerson[currentPerson]) flightByPerson[currentPerson] = { segments: [], totalTWD: 0, luggage: '' };
      const seg = {
        isGo:      String(row['去?'] ?? '').toLowerCase() === 'true' || row['去?'] === true,
        isTransit: String(row['轉機?'] ?? '').toLowerCase() === 'true' || row['轉機?'] === true,
        segNo:     num(pick(row, ['航段'], 0)),
        from:      String(row['出發地'] ?? '').trim(),
        fromTerm:  String(row['出發航廈'] ?? '').trim(),
        to:        String(row['目的地'] ?? '').trim(),
        toTerm:    String(row['目的地航廈'] ?? '').trim(),
        wait:      String(row['等待時間(轉機用)'] ?? '').trim(),
        depTime:   String(row['出發時間'] ?? '').trim(),
        arrTime:   String(row['抵達時間'] ?? '').trim(),
        airline:   String(row['航空公司'] ?? '').trim(),
        flightNo:  String(row['航班號'] ?? '').trim(),
        luggage:   String(row['行李額度'] ?? '').trim(),
        cost:      num(pick(row, ['機票費用(寫在第一筆)', '費用'])),
        twd:       num(pick(row, ['換算台幣'])),
        note:      String(row['備註'] ?? '').trim(),
      };
      if (seg.cost > 0) flightByPerson[currentPerson].totalTWD = seg.twd || seg.cost;
      if (seg.luggage) flightByPerson[currentPerson].luggage = seg.luggage;
      if (seg.from || seg.to || seg.flightNo) flightByPerson[currentPerson].segments.push(seg);
    });
    const flights = Object.entries(flightByPerson).map(([person, data]) => ({ person, ...data }));
    const totalFlightTWD = flights.reduce((s, f) => s + (f.totalTWD || 0), 0);

    return {
      exchangeISK,
      exchangeEUR,
      car: carData,
      accommodation: accom.length ? accom : clone(window.STATIC?.accommodation ?? []),
      activity: cellsToRows(activity),
      split: splitData,
      dialogLines,
      flights,
      totalFlightTWD,
      repayHistory,
    };
  }

  async function fetchSheet(sheetKey) {
    const sheetName = SHEET_MAP[sheetKey] || sheetKey;
    const res = await fetch(API_BASE + '?sheet=' + encodeURIComponent(sheetName), { cache: 'no-store', redirect: 'follow' });
    if (!res.ok) throw new Error(`${sheetKey} 讀取失敗：HTTP ${res.status}`);
    return res.json();
  }

  window.__syncIcelandBudgetFromSheets = async function () {
  // ─── 【防禦 1：沒網路時】直接讀取手機記憶體 ───
  if (!navigator.onLine) {
    const cachedData = localStorage.getItem('cached_iceland_budget');
    if (cachedData) {
      window.APP_DATA = JSON.parse(cachedData);
      window.renderAll?.();
      window.setSyncState?.('offline', '🔋 離線中，使用上次同步資料');
    } else {
      window.APP_DATA = clone(window.STATIC ?? {});
      window.renderAll?.();
      window.setSyncState?.('offline', '離線中，無暫存，使用預設資料');
    }
    return;
  }

  window.setSyncState?.('syncing', '同步中…');

  try {
    const [overview, accommodation, car, activity, split, lines, flight] = await Promise.all([
      fetchSheet('overview'), fetchSheet('accommodation'), fetchSheet('car'), fetchSheet('activity'), fetchSheet('split'), fetchSheet('lines'), fetchSheet('flight')
    ]);
    
    window.APP_DATA = transformData({ overview, accommodation, car, activity, split, lines, flight });
    
    // ─── 【防禦 2：成功拿到雲端資料時】偷偷打包存進手機口袋 ───
    localStorage.setItem('cached_iceland_budget', JSON.stringify(window.APP_DATA));

    window.renderAll?.();
    window.setSyncState?.('cloud', '☁ 雲端同步：' + new Date().toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
  
  } catch (error) {
    console.error(error);
    
    // ─── 【防禦 3：網路卡住或讀取失敗時】撈看看有沒有歷史存檔，沒有才用 STATIC ───
    const cachedData = localStorage.getItem('cached_iceland_budget');
    if (cachedData) {
      window.APP_DATA = JSON.parse(cachedData);
      window.setSyncState?.('local', '⚠ 雲端讀取失敗，使用上次同步資料');
    } else {
      window.APP_DATA = clone(window.STATIC ?? {});
      window.setSyncState?.('local', '⚠ 雲端讀取失敗，使用預設初始資料');
    }
    window.renderAll?.();
  }
};
})();