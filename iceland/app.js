(function () {
  const API_BASE = "https://script.google.com/macros/s/AKfycbzyPmNe-kINWYdewJabCgN9LjgybMD-PS-Ie_5tQ0lqcvfobR9k0BEcu8awyXHg7gOb/exec";
  window._GAS_BASE = API_BASE; // forms.js 寫入用
  const SHEET_MAP = { overview: "總覽", accommodation: "住宿", car: "租車", activity: "活動", split: "寫入_分帳", lines: "台詞", flight: "航班", expense: "寫入_一般開銷" };

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
  // withRowIndex: true 時每筆加上 _rowIndex（供刪除/修改用，只對寫入類 sheet 啟用）
  function cellsToRows(sheet, withRowIndex = false) {
    const cells = sheet?.cells;
    if (!Array.isArray(cells) || cells.length < 2) return [];
    const headers = cells[0].map(h => String(h ?? '').trim());
    return cells.slice(1).map((row, i) => {
      const obj = {};
      if (withRowIndex) obj._rowIndex = i + 2; // +2：第1行是header，試算表從1起算
      headers.forEach((h, j) => { if (h) obj[h] = row[j] ?? ''; });
      return obj;
    });
  }

  function pick(row, keys, fallback = '') {
    for (const key of keys) if (row && row[key] !== undefined && row[key] !== '') return row[key];
    return fallback;
  }

  function transformData({ overview, accommodation, car, activity, split, lines, flight, expense }) {

    // ── 匯率（總覽）
    const oCells = overview?.cells ?? [];
    const iskRow = oCells.find(r => r.includes('ISK')) || [];
    const eurRow = oCells.find(r => r.includes('EUR')) || [];
    const iskIdx = iskRow.indexOf('ISK');
    const eurIdx = eurRow.indexOf('EUR');
    const exchangeISK = iskIdx >= 0 ? num(iskRow[iskIdx + 1]) : (window.STATIC?.exchangeISK ?? 0);
    const exchangeEUR = eurIdx >= 0 ? num(eurRow[eurIdx + 1]) : (window.STATIC?.exchangeEUR ?? 0);

    // ── 花銷類別清單（總覽 M 欄，由 GAS 回傳 expenseCategories）
    const expenseCategories = (overview?.expenseCategories || []).filter(Boolean);
    const budgetPerPerson = num(oCells?.[1]?.[9]) || 100000; // 總覽 J2

    // ── 住宿
    const accomRows = cellsToRows(accommodation);
    const accom = accomRows
      .filter(row => {
        const name = String(row['住宿地點'] ?? '').trim();
        return name !== '' && !String(Object.values(row).join('')).match(/小計|每人/);
      })
      .map(row => ({
        name:       pick(row, ['住宿地點', '住宿名稱', '名稱']),
        date:       pick(row, ['日期', '入住日期']),
        nights:     num(pick(row, ['天數', '晚數'], 1)) || 1,
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

    const carCells = car?.cells ?? [];
    const d1Row = carCells.find(r => String(r[0] ?? '').includes('主要駕駛'));
    const d2Row = carCells.find(r => String(r[0] ?? '').includes('額外駕駛'));
    if (d1Row) carData.driver1 = String(d1Row[0]).replace(/主要駕駛[:：]?/, '').trim();
    if (d2Row) carData.driver2 = String(d2Row[0]).replace(/額外駕駛[:：]?/, '').trim();

    // ── 分帳明細
    const splitRows = cellsToRows(split, true);  // 需要 rowIndex 供還款刪除用
    const splitData = {};
    splitRows
      .filter(row => ['猴','花','寧'].some(m => String(row['成員'] ?? '').includes(m)))
      .forEach(row => {
        const name = ['猴','花','寧'].find(m => String(row['成員'] ?? '').includes(m));
        if (!name) return;
        splitData[name] = {
          paid:     num(pick(row, ['總付出 (代墊)', '總付出'])),
          burden:   num(pick(row, ['總負擔 (攤帳)', '總負擔'])),
          personal: num(pick(row, ['個人消費'])),
          balance:  num(pick(row, ['還款後結算'])),
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

    // ── 還款記錄（複用已含 _rowIndex 的 splitRows）
    const repayHistory = splitRows
      .filter(row => {
        const from = String(row['還款人'] ?? '').trim();
        const to   = String(row['還給'] ?? '').trim();
        return from && to;
      })
      .map(row => ({
        _rowIndex: row._rowIndex,
        from:   String(row['還款人'] ?? '').trim(),
        to:     String(row['還給'] ?? '').trim(),
        amount: num(pick(row, ['還款金額', '金額'])),
        date:   String(row['還款日期'] ?? '').trim(),
        note:   String(row['備註'] ?? '').trim(),
      }))
      .filter(r => r.amount > 0);

    // ── 一般開銷（含油費，類別=油費時油費欄位才有值）
    const expenseRows = cellsToRows(expense, true);
    const expenses = expenseRows
      .filter(row => num(pick(row, ['合計', '換算台幣'])) > 0)
      .map(row => ({
        _rowIndex:  row._rowIndex,
        location:   String(row['地點']   ?? '').trim(),
        date:       String(row['日期']   ?? '').trim(),
        category:   String(row['類別']   ?? '').trim(),
        amount:     num(pick(row, ['金額'])),
        currency:   String(row['幣別']   ?? '').replace(/\.$/, '').trim() || 'NT',
        twd:        num(pick(row, ['換算台幣'])),
        foreignFee: num(pick(row, ['海外手續費'])),
        total:      num(pick(row, ['合計'])),
        payer:      String(row['付款人'] ?? '').trim(),
        splitMode:  String(row['如何分'] ?? '').trim(),
        burden:     { '猴': num(row['猴負擔']), '花': num(row['花負擔']), '寧': num(row['寧負擔']) },
        note:       String(row['備註']   ?? '').trim(),
        title:      String(row['品項']   ?? '').trim(),
        isShared:   yes(pick(row, ['共同消費?'])),
        fuelBrand:  String(row['品牌(油)'] ?? '').trim(),
        fuelMileage:num(pick(row, ['目前里程 (km)'])),
        fuelLiters: num(pick(row, ['公升數 (L)'])),
        fuelTripKm: num(pick(row, ['單次行駛里程 (km)'])),
        fuelEfficiency: num(pick(row, ['平均油耗'])),
      }));

    // ── 航班（依機票編號分組）
    const flightRows = cellsToRows(flight);
    const flightByTicket = {};
    flightRows.forEach(row => {
      const ticketNo = String(row['機票編號(給程式辨識用的虛假編號)'] ?? '').trim();
      const person   = String(row['乘客'] ?? '').trim();
      if (!ticketNo || !person) return;
      if (!flightByTicket[ticketNo]) {
        flightByTicket[ticketNo] = {
          ticketNo,
          person,
          type:     String(row['票種']      ?? '').trim(),
          airline:  String(row['航空公司']   ?? '').trim(),
          from:     String(row['最初出發地'] ?? '').trim(),
          to:       String(row['最終目的地'] ?? '').trim(),
          totalTWD: 0,
          luggage:  '',
          segments: [],
        };
      }
      const t = flightByTicket[ticketNo];
      const cost = num(pick(row, ['機票費用(寫在第一筆)']));
      const twd  = num(pick(row, ['換算台幣']));
      if (cost > 0) t.totalTWD = twd || cost;
      const luggage = String(row['行李'] ?? '').trim();
      if (luggage) t.luggage = luggage;

      const seg = {
        direction:  String(row['去程/回程']    ?? '').trim(),
        isTransit:  String(row['目的地為中轉?'] ?? '').toLowerCase() === 'true' || row['目的地為中轉?'] === true,
        segNo:      num(pick(row, ['航段'], 0)),
        from:       String(row['出發地']       ?? '').trim(),
        fromTerm:   String(row['出發航廈']     ?? '').trim(),
        to:         String(row['目的地']       ?? '').trim(),
        toTerm:     String(row['目的地航廈']   ?? '').trim(),
        flightTime: String(row['飛行時間']     ?? '').trim(),
        waitTime:   String(row['轉機等待時間'] ?? '').trim(),
        depTime:    String(row['出發時間']     ?? '').trim(),
        arrTime:    String(row['抵達時間']     ?? '').trim(),
        operatedBy: String(row['執飛航空']     ?? '').trim(),
        aircraft:   String(row['機種']         ?? '').trim(),
        flightNo:   String(row['航班號']       ?? '').trim(),
        note:       String(row['備註']         ?? '').trim(),
      };
      if (seg.from || seg.to || seg.flightNo) t.segments.push(seg);
    });

    const flights = Object.values(flightByTicket);
    const totalFlightTWD = flights.reduce((s, f) => s + (f.totalTWD || 0), 0);

    // tag 庫：從 expense sheet U 欄掃描
    const tagLibrary = (expense?.tagLibrary || []).filter(Boolean);

    return {
      exchangeISK,
      exchangeEUR,
      expenseCategories,
      budgetPerPerson,
      tagLibrary,
      car: carData,
      accommodation: accom.length ? accom : clone(window.STATIC?.accommodation ?? []),
      activity: cellsToRows(activity),
      expenses,
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

  const hasCached = !!localStorage.getItem('cached_iceland_budget');
  if (!hasCached) window.setSyncState?.('syncing', '同步中…');

  try {
    // ── 單一請求取得全部 sheets（GAS ?sheet=all）
    const res = await fetch(API_BASE + '?sheet=all', { cache: 'no-store', redirect: 'follow' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const all = await res.json();
    if (all.error) throw new Error(all.error);
    const { overview, accommodation, car, activity, split, lines, flight, expense } = all;

    window.APP_DATA = transformData({ overview, accommodation, car, activity, split, lines, flight, expense });
    localStorage.setItem('cached_iceland_budget', JSON.stringify(window.APP_DATA));
    window.renderAll?.();
    window.setSyncState?.('cloud', '☁ 雲端同步：' + new Date().toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }));

  } catch (error) {
    console.error(error);
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