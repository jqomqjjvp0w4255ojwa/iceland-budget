// 動態資料同步：Google Sheet -> Netlify Function -> 現有靜態網頁
(function () {
  const API_URL = '/.netlify/functions/sheet';

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function num(value) {
    if (typeof value === 'number') return value;
    const cleaned = String(value ?? '').replace(/[^\d.-]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  function yes(value) {
    const s = String(value ?? '').trim().toLowerCase();
    return ['true', 'yes', 'y', '1', '✓', '勾選', '已付', '已付款'].includes(s);
  }

  function pick(row, keys, fallback = '') {
    for (const key of keys) {
      if (row && row[key] !== undefined && row[key] !== '') return row[key];
    }
    return fallback;
  }

  function rowsOf(sheet) {
    return Array.isArray(sheet?.rows) ? sheet.rows : [];
  }

  function firstDataRow(sheet) {
    return rowsOf(sheet).find(row => Object.values(row).some(v => String(v ?? '').trim() !== '')) || {};
  }

  function findOverviewValue(rows, keywords, fallback) {
    for (const row of rows) {
      const values = Object.values(row);
      const joined = values.join(' ');
      if (keywords.some(k => joined.includes(k))) {
        const found = values.find(v => num(v) !== 0);
        if (found !== undefined) return num(found);
      }
    }
    return fallback;
  }

  function transformData({ overview, accommodation, car, activity }) {
    const overviewRows = rowsOf(overview);
    const accomRows = rowsOf(accommodation);
    const carRow = firstDataRow(car);

    const accom = accomRows
      .filter(row => Object.values(row).some(v => String(v ?? '').trim() !== ''))
      .map(row => ({
        name: pick(row, ['住宿地點', '住宿名稱', '名稱', 'name']),
        date: pick(row, ['日期', '入住日期', 'date']),
        nights: num(pick(row, ['天數', '晚數', 'nights'], 1)) || 1,
        cur: pick(row, ['幣別', 'currency', 'cur'], 'NT'),
        orig: num(pick(row, ['原價', '金額', '原幣金額', 'price', 'orig'])),
        twd: num(pick(row, ['換算台幣', '台幣', 'TWD', 'twd', 'NTD'])),
        paid: yes(pick(row, ['已付款', '付款', 'paid'])),
        cancel: yes(pick(row, ['可取消', 'cancel'])),
        payer: pick(row, ['付款人', 'payer'], ''),
        payDate: pick(row, ['付款日', '付款日期', 'payDate'], ''),
        deductDate: pick(row, ['扣款日', '扣款日期', 'deductDate'], ''),
        foreignFee: num(pick(row, ['海外手續費', '手續費', 'foreignFee'])),
        note: pick(row, ['備註', 'note'], ''),
      }))
      .filter(item => item.name || item.date || item.twd);

    return {
      exchangeISK: findOverviewValue(overviewRows, ['ISK', 'ISK匯率'], window.STATIC?.exchangeISK ?? 0),
      exchangeEUR: findOverviewValue(overviewRows, ['EUR', 'EUR匯率'], window.STATIC?.exchangeEUR ?? 0),
      totalTWD: findOverviewValue(overviewRows, ['花費累計', '累計花費', '總額'], window.STATIC?.totalTWD ?? 0),
      car: {
        company: pick(carRow, ['租車公司', '公司', 'company'], window.STATIC?.car?.company ?? ''),
        model: pick(carRow, ['車種', '車款', 'model'], window.STATIC?.car?.model ?? ''),
        code: pick(carRow, ['確認碼', '訂單編號', 'code'], window.STATIC?.car?.code ?? ''),
        pickup: pick(carRow, ['取車時間', 'pickup'], window.STATIC?.car?.pickup ?? ''),
        dropoff: pick(carRow, ['還車時間', 'dropoff'], window.STATIC?.car?.dropoff ?? ''),
        days: num(pick(carRow, ['天數', 'days'], window.STATIC?.car?.days ?? 0)) || window.STATIC?.car?.days || 0,
        location: pick(carRow, ['地點', '取還車地點', 'location'], window.STATIC?.car?.location ?? ''),
        totalTWD: num(pick(carRow, ['台幣', '總額', 'totalTWD', 'TWD'])) || window.STATIC?.car?.totalTWD || 0,
        perPerson: num(pick(carRow, ['每人付款', '每人', 'perPerson'])) || window.STATIC?.car?.perPerson || 0,
        driver1: pick(carRow, ['主駕', 'driver1'], window.STATIC?.car?.driver1 ?? ''),
        driver2: pick(carRow, ['副駕', 'driver2'], window.STATIC?.car?.driver2 ?? ''),
        payer: pick(carRow, ['付款人', 'payer'], window.STATIC?.car?.payer ?? ''),
        insurance: window.STATIC?.car?.insurance ?? [],
      },
      accommodation: accom.length ? accom : clone(window.STATIC?.accommodation ?? []),
      activity: rowsOf(activity),
    };
  }

  async function fetchSheet(sheet) {
    const res = await fetch(`${API_URL}?sheet=${encodeURIComponent(sheet)}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${sheet} 讀取失敗：HTTP ${res.status}`);
    return res.json();
  }

  window.__syncIcelandBudgetFromSheets = async function () {
    if (!navigator.onLine) {
      window.setSyncState?.('offline', '離線中，使用本地資料');
      return;
    }

    window.setSyncState?.('syncing', '同步中…');

    try {
      const [overview, accommodation, car, activity] = await Promise.all([
        fetchSheet('overview'),
        fetchSheet('accommodation'),
        fetchSheet('car'),
        fetchSheet('activity'),
      ]);

      window.APP_DATA = transformData({ overview, accommodation, car, activity });
      window.renderAll?.();

      window.setSyncState?.(
        'cloud',
        '☁ 雲端同步：' + new Date().toLocaleString('zh-TW', {
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    } catch (error) {
      console.error(error);
      window.APP_DATA = clone(window.STATIC ?? {});
      window.renderAll?.();
      window.setSyncState?.('local', '⚠ 雲端讀取失敗，使用本地資料');
    }
  };
})();
