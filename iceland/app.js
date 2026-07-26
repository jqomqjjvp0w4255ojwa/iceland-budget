(function () {
  const API_BASE = (window.TRIP_CONFIG && window.TRIP_CONFIG.apiBase) ||
    "https://script.google.com/macros/s/AKfycbxv7Z69Jer0CL03X51DkmAbflI8D8kFDKVKngxBehU2_IDW8R-TftT0kdzs4u4QIf7r/exec";
  const CACHE_KEY = (window.TRIP_CONFIG && window.TRIP_CONFIG.cacheKey) || 'cached_iceland_budget';
  window._GAS_BASE = API_BASE;
  const SHEET_MAP = { overview: "總覽", accommodation: "住宿", car: "租車", activity: "活動", split: "寫入_分帳", lines: "台詞", flight: "航班", expense: "寫入_一般開銷", task: "寫入_任務", schedule: "日程", insurance: "保險", manual: "手冊" };

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function num(value) {
    const s = String(value ?? '').trim();
    // 會計格式負數：(1,234) 或 (1234) → -1234
    if (/^\([\d,. ]+\)$/.test(s)) {
      const n = Number(s.replace(/[^\d.]/g, ''));
      return Number.isFinite(n) ? -n : 0;
    }
    const n = Number(s.replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  function yes(value) {
    const s = String(value ?? '').trim().toLowerCase();
    return ['true', 'yes', 'y', '1', '✓', '勾選', '已付', '已付款'].includes(s);
  }

  function cellsToRows(sheet, withRowIndex = false) {
    const cells = sheet?.cells;
    if (!Array.isArray(cells) || cells.length < 2) return [];
    const headers = cells[0].map(h => String(h ?? '').trim());
    return cells.slice(1).map((row, i) => {
      const obj = {};
      headers.forEach((h, j) => { if (h) obj[h] = row[j] ?? ''; });
      // 優先用 GAS 回傳的真實行號，fallback 才用 i+2
      if (withRowIndex) obj._rowIndex = obj['_rowIndex'] ? Number(obj['_rowIndex']) : i + 2;
      return obj;
    });
  }

  function pick(row, keys, fallback = '') {
    for (const key of keys) if (row && row[key] !== undefined && row[key] !== '') return row[key];
    return fallback;
  }

  function transformData({ overview, accommodation, car, activity, split, lines, flight, expense, task, schedule, insurance, manual }) {

    const oCells = overview?.cells ?? [];
    const iskRow = oCells.find(r => r.includes('ISK')) || [];
    const eurRow = oCells.find(r => r.includes('EUR')) || [];
    const usdRow = oCells.find(r => r.includes('USD')) || [];
    const iskIdx = iskRow.indexOf('ISK');
    const eurIdx = eurRow.indexOf('EUR');
    const usdIdx = usdRow.indexOf('USD');
    const exchangeISK = iskIdx >= 0 ? num(iskRow[iskIdx + 1]) : (window.STATIC?.exchangeISK ?? 0);
    const exchangeEUR = eurIdx >= 0 ? num(eurRow[eurIdx + 1]) : (window.STATIC?.exchangeEUR ?? 0);
    const exchangeUSD = usdIdx >= 0 ? num(usdRow[usdIdx + 1]) : (window.STATIC?.exchangeUSD ?? 0);

    const expenseCategories = (overview?.expenseCategories || []).filter(Boolean);
    const budgetPerPerson = num(oCells?.[1]?.[9]) || 100000;

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
        lat:        num(pick(row, ['lat', '緯度'])),
        lng:        num(pick(row, ['lng', ' lng', '經度'])),
        address:    pick(row, ['地址'], ''),
        stayType:   pick(row, ['類型', '住宿類型'], ''),
        facilities: pick(row, ['提供設備', '設備'], ''),
        extraFee:   pick(row, ['自費項目'], ''),
        bring:      pick(row, ['需自備', '自備與注意', '注意事項'], ''),
        nearby:     pick(row, ['周邊景點'], ''),
      }))
      .filter(item => item.name);

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

    const splitRows = cellsToRows(split, true);
    const splitData = {};
    const _members = window.TRIP_MEMBERS || ['猴','花','寧'];
    splitRows
      .filter(row => _members.some(m => String(row['成員'] ?? '').includes(m)))
      .forEach(row => {
        const name = _members.find(m => String(row['成員'] ?? '').includes(m));
        if (!name) return;
        splitData[name] = {
          paid:     num(pick(row, ['總付出 (代墊)', '總付出'])),
          burden:   num(pick(row, ['總負擔 (攤帳)', '總負擔'])),
          personal: num(pick(row, ['個人消費'])),
          balance:  num(pick(row, ['還款後結算'])),
        };
      });

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

    const repayHistory = splitRows
      .filter(row => {
        const from = String(row['債務人'] ?? row['誰還錢'] ?? row['還款人'] ?? '').trim();
        const to   = String(row['債主']   ?? row['還給誰'] ?? row['還給']   ?? '').trim();
        return from && to;
      })
      .map(row => ({
        _rowIndex: row._rowIndex,
        from:   String(row['債務人'] ?? row['誰還錢'] ?? row['還款人'] ?? '').trim(),
        to:     String(row['債主']   ?? row['還給誰'] ?? row['還給']   ?? '').trim(),
        amount: num(pick(row, ['金額', '還款金額'])),
        date:   String(row['還款日期'] ?? '').trim(),
        note:   String(row['備註']     ?? '').trim(),
      }))
      .filter(r => r.amount > 0);

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
        burden:     Object.fromEntries((window.TRIP_MEMBERS||['猴','花','寧']).map(m=>[m, num(row[m+'負擔'])])),
        note:       String(row['備註']   ?? '').trim(),
        title:      String(row['品項']   ?? '').trim(),
        qty:        num(pick(row, ['數量'], 1)) || 1,
        isShared:   yes(pick(row, ["共同消費?'", '共同消費?'])),
        fuelBrand:  String(row['品牌(油)'] ?? '').trim(),
        fuelMileage:num(pick(row, ['目前里程 (km)'])),
        fuelLiters: num(pick(row, ['公升數 (L)'])),
        fuelTripKm: num(pick(row, ['單次行駛里程 (km)'])),
        fuelEfficiency: num(pick(row, ['平均油耗'])),
        tags:       String(row['標籤'] ?? '').trim(),
      }));

    const activityRows = cellsToRows(activity);
    const activityData = activityRows
      .filter(row => String(row['活動地點'] ?? '').trim() !== '')
      .map(row => ({
        name:       pick(row, ['活動地點'], ''),
        url:        pick(row, ['網址'], ''),
        date:       pick(row, ['日期'], ''),
        meetTime:   pick(row, ['集合時間'], ''),
        meetLoc:    pick(row, ['集合地點'], ''),
        cur:        String(pick(row, ['幣別'], 'NT')).replace(/\.$/, '').replace(/^EU$/, 'EUR').replace(/^ISK$/, 'ISK').replace(/^NT$/, 'NT'),
        orig:       num(pick(row, ['價格'])),
        twd:        num(pick(row, ['換算台幣'])),
        cancel:     yes(pick(row, ['可取消?'])),
        payDate:    pick(row, ['付款期限/時間'], ''),
        payer:      pick(row, ['付款人'], ''),
        paid:       yes(pick(row, ['已付款?'])),
        foreignFee: num(pick(row, ['海外手續費'])),
        perPerson:  num(pick(row, ['每人負擔'])),
        note:       pick(row, ['備註'], ''),
        advance:    Object.fromEntries((window.TRIP_MEMBERS||['猴','花','寧']).map(m=>[m, num(row[m+'代墊'])])),
        lat:        num(pick(row, ['lat'])),
        lng:        num(pick(row, ['lng'])),
        content:    pick(row, ['活動內容'], ''),
        location:   pick(row, ['地點'], ''),
        included:   pick(row, ['提供'], ''),
        excluded:   pick(row, ['不提供'], ''),
        difficulty: pick(row, ['難度'], ''),
        bring:      pick(row, ['自備項目'], ''),
        duration:   pick(row, ['時間長度'], ''),
        returnLoc:  pick(row, ['回程地'], ''),
      }));

    const flightRows = cellsToRows(flight);
    const flightByTicket = {};
    flightRows.forEach(row => {
      const ticketNo = String(row['機票編號(給程式辨識用的虛假編號)'] ?? '').trim();
      const person   = String(row['乘客'] ?? '').trim();
      if (!ticketNo || !person) return;
      if (!flightByTicket[ticketNo]) {
        flightByTicket[ticketNo] = {
          ticketNo, person,
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
    // ── 行前準備清單（GAS 回傳已是物件陣列）
    const members = window.TRIP_MEMBERS || ['猴','花','寧'];
    let tasks = Array.isArray(task?.tasks) ? task.tasks : [];
    if (!tasks.length && task?.cells) {
      // 相容：GAS 還沒更新時，用通用轉換讀
      tasks = cellsToRows(task, true)
        .filter(row => String(row['項目名稱'] ?? '').trim() !== '')
        .map(row => ({
          id: row['項目ID'] || '', category: row['分類'] || '待辦',
          name: row['項目名稱'], priority: num(row['重要度']),
          note: row['說明'] || '', owner: row['負責人'] || '',
          done: Object.fromEntries(members.map(m => [m, yes(row[m + '狀態'])])),
          updated: row['最後更新'] || '', _rowIndex: row._rowIndex,
        }));
    }

    // ── 日程時間軸（GAS 回傳已是物件陣列）
    let scheduleData = Array.isArray(schedule?.schedule) ? schedule.schedule : [];
    if (!scheduleData.length && schedule?.cells) {
      // 相容：GAS 還沒更新時用通用轉換讀
      let lastDate = '';
      scheduleData = cellsToRows(schedule, true)
        .map((row, i) => {
          const d = String(row['日期'] ?? '').trim();
          if (d) lastDate = d;
          return {
            date: d || lastDate,
            time: row['時間'] || '',
            category: row['分類'] || '其他',
            title: String(row['標題'] ?? '').trim(),
            note: row['說明'] || '',
            place: row['地點'] || '',
            lat: num(row['緯度']), lng: num(row['經度']),
            stay: row['停留'] || '',
            url: row['網址'] || '',
            order: i, _rowIndex: row._rowIndex,
          };
        })
        .filter(x => x.title && x.date);
    }

    // ── 保險（一列＝一個理賠項目）
    const insuranceData = cellsToRows(insurance)
      .filter(row => String(row['保險公司'] ?? row['理賠項目'] ?? '').trim() !== '')
      .map(row => ({
        company: pick(row, ['保險公司'], ''),
        plan:    pick(row, ['方案'], ''),
        item:    pick(row, ['理賠項目'], ''),
        amount:  pick(row, ['理賠金額'], ''),
        method:  pick(row, ['理賠方法'], ''),
        note:    pick(row, ['備註'], ''),
      }));

    // ── 手冊資訊
    const manualData = cellsToRows(manual)
      .filter(row => String(row['標題'] ?? '').trim() !== '')
      .map(row => ({
        category: pick(row, ['分類'], '其他'),
        title:    pick(row, ['標題'], ''),
        content:  pick(row, ['內容'], ''),
        url:      pick(row, ['連結'], ''),
      }));

    const totalFlightTWD = flights.reduce((s, f) => s + (f.totalTWD || 0), 0);
    const tagLibrary = (expense?.tagLibrary || []).filter(Boolean);

    return {
      exchangeISK, exchangeEUR, exchangeUSD, expenseCategories, budgetPerPerson, tagLibrary,
      car: carData,
      accommodation: accom.length ? accom : clone(window.STATIC?.accommodation ?? []),
      activity: activityData,
      expenses, split: splitData, dialogLines, flights, totalFlightTWD, repayHistory,
      tasks, schedule: scheduleData,
      insurance: insuranceData, manualInfo: manualData,
    };
  }

  // 地圖深連結：#editExp=rowIndex → 自動打開該筆消費的編輯窗
  function maybeOpenDeepLink() {
    const m = location.hash.match(/^#editExp=(\d+)$/);
    if (!m) return;
    const rowIndex = parseInt(m[1], 10);
    const item = (window.APP_DATA?.expenses || []).find(e => e._rowIndex === rowIndex);
    if (!item) return;
    history.replaceState(null, '', location.pathname + location.search); // 用過即清
    const splitSel = (item.splitMode||'').split(',').map(x=>x.trim())
      .filter(x => (window.TRIP_MEMBERS||[]).includes(x));
    window.openEditExpense?.(rowIndex, {
      category: item.category, amount: item.amount, currency: item.currency,
      twd: item.twd, location: item.location, note: item.note, date: item.date, payer: item.payer,
      isShared: item.isShared, title: item.title, qty: item.qty,
      splitMode: item.splitMode,
      splitSel: splitSel.length ? splitSel : Object.keys(item.burden||{}).filter(k=>(item.burden[k]||0)>0),
      customAmt: item.burden||{},
      tags: item.tags||'',
    });
  }
  window.__maybeOpenDeepLink = maybeOpenDeepLink;

  window.__syncIcelandBudgetFromSheets = async function () {
    // 還有離線記帳未送出時，先送佇列再同步，避免雲端舊資料覆蓋本地新增
    if (window.getPendingCount?.() > 0) {
      const flushed = await window.__flushPendingQueue?.();
      if (!flushed && window.getPendingCount?.() > 0) return;
    }
    if (!navigator.onLine) {
      const cachedData = localStorage.getItem(CACHE_KEY);
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

    const hasCached = !!localStorage.getItem(CACHE_KEY);
    if (!hasCached) window.setSyncState?.('syncing', '同步中…');

    try {
      // 20 秒沒回應就當失敗，避免 GAS 卡住時狀態永遠停在「同步中」
      const ac = new AbortController();
      const killer = setTimeout(() => ac.abort(), 20000);
      // 帶時間戳，避免 Service Worker／中間層回舊資料
      const res = await fetch(API_BASE + '?sheet=all&_=' + Date.now(), { cache: 'no-store', redirect: 'follow', signal: ac.signal })
        .finally(() => clearTimeout(killer));
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const all = await res.json();
      if (all.error) throw new Error(all.error);
      const { overview, accommodation, car, activity, split, lines, flight, expense, task, schedule, insurance, manual } = all;

      const newData = transformData({ overview, accommodation, car, activity, split, lines, flight, expense, task, schedule, insurance, manual });
      window.APP_DATA = newData;
      localStorage.setItem(CACHE_KEY, JSON.stringify(window.APP_DATA));
      // 先更新狀態列再畫面：畫面出錯時才不會一直卡在「同步中」
      window.setSyncState?.('cloud', '☁ 雲端同步：' + new Date().toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
      try { window.renderAll?.(); }
      catch (e) { console.error('renderAll failed', e); window.setSyncState?.('local', '⚠ 資料已同步，但畫面繪製出錯'); }
      window.__maybeOpenDeepLink?.();

    } catch (error) {
      console.error(error);
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        window.APP_DATA = JSON.parse(cachedData);
        window.setSyncState?.('local', '⚠ 雲端讀取失敗，使用上次同步資料');
      } else {
        window.APP_DATA = clone(window.STATIC ?? {});
        window.setSyncState?.('local', '⚠ 雲端讀取失敗，使用預設初始資料');
      }
      try { window.renderAll?.(); } catch (e) { console.error('renderAll failed', e); }
    }
  };
})();