(function () {
  const API_BASE = "https://script.google.com/macros/s/AKfycbzdizbJL4rRrHaeVNWFqp4mZiJ8BXJdE0wO7beJTIjyLgy4Nmzv9vDGmjRNi5TLgWg0/exec";
  const SHEET_MAP = { overview: "總覽", accommodation: "住宿", car: "租車", activity: "活動" };

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

  function transformData({ overview, accommodation, car, activity }) {

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
      payer:     pick(carRow, ['付款人'],               window.STATIC?.car?.payer ?? ''),
      insurance: window.STATIC?.car?.insurance ?? [],
    };

    // 駕駛資訊從 cells 底部備註列讀
    const carCells = car?.cells ?? [];
    const d1Row = carCells.find(r => String(r[0] ?? '').includes('主要駕駛'));
    const d2Row = carCells.find(r => String(r[0] ?? '').includes('額外駕駛'));
    if (d1Row) carData.driver1 = String(d1Row[0]).replace(/主要駕駛[:：]?/, '').trim();
    if (d2Row) carData.driver2 = String(d2Row[0]).replace(/額外駕駛[:：]?/, '').trim();

    return {
      exchangeISK,
      exchangeEUR,
      car: carData,
      accommodation: accom.length ? accom : clone(window.STATIC?.accommodation ?? []),
      activity: cellsToRows(activity),
    };
  }

  async function fetchSheet(sheetKey) {
    const sheetName = SHEET_MAP[sheetKey] || sheetKey;
    const res = await fetch(API_BASE + '?sheet=' + encodeURIComponent(sheetName), { cache: 'no-store', redirect: 'follow' });
    if (!res.ok) throw new Error(`${sheetKey} 讀取失敗：HTTP ${res.status}`);
    return res.json();
  }

  window.__syncIcelandBudgetFromSheets = async function () {
    if (!navigator.onLine) { window.setSyncState?.('offline', '離線中，使用本地資料'); return; }
    window.setSyncState?.('syncing', '同步中…');
    try {
      const [overview, accommodation, car, activity] = await Promise.all([
        fetchSheet('overview'), fetchSheet('accommodation'), fetchSheet('car'), fetchSheet('activity')
      ]);
      window.APP_DATA = transformData({ overview, accommodation, car, activity });
      window.renderAll?.();
      window.setSyncState?.('cloud', '☁ 雲端同步：' + new Date().toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
    } catch (error) {
      console.error(error);
      window.APP_DATA = clone(window.STATIC ?? {});
      window.renderAll?.();
      window.setSyncState?.('local', '⚠ 雲端讀取失敗，使用本地資料');
    }
  };
})();
