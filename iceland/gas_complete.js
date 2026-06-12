// ══════════════════════════════════════════════════════════
//  gas_complete.js — Google Apps Script 後端（完整版）
//  部署：Apps Script 編輯器貼上 → 部署 → 網頁應用程式
//  注意：重新部署若產生新 /exec 網址，要更新 config.js 的 apiBase
// ══════════════════════════════════════════════════════════

const SHEET_NAMES = {
  overview:      '總覽',
  accommodation: '住宿',
  car:           '租車',
  activity:      '活動',
  split:         '寫入_分帳',
  lines:         '台詞',
  flight:        '航班',
  expense:       '寫入_一般開銷',
  checkin:       '寫入_腳印',
};

// 找某欄第一個空行（從 startRow 起，1-based）
function findFirstEmptyRow(sheet, colLetter, startRow) {
  var vals = sheet.getRange(colLetter + ':' + colLetter).getValues();
  for (var i = startRow - 1; i < vals.length; i++) {
    if (String(vals[i][0] || '').trim() === '') return i + 1;
  }
  return vals.length + 1;
}

function readSheet(sheet) {
  var allCells = sheet.getDataRange().getDisplayValues();
  var cells    = allCells;
  // 寫入 sheet 只回傳有實際內容的行（C欄類別不為空），避免空行膨脹資料
  var writeSheetsNames = ['寫入_一般開銷', '寫入_分帳'];
  if (writeSheetsNames.indexOf(sheet.getName()) >= 0 && allCells.length > 1) {
    var header = ['_rowIndex'].concat(allCells[0]);
    var rows = [];
    for (var i = 1; i < allCells.length; i++) {
      var r = allCells[i];
      if (String(r[2]||'').trim() !== '' || String(r[5]||'').trim() !== '') {
        rows.push([i + 1].concat(r));
      }
    }
    cells = [header].concat(rows);
  }
  var result = {
    sheetName: sheet.getName(),
    gid:       sheet.getSheetId(),
    cells:     cells,
  };
  if (sheet.getName() === '總覽') {
    result.expenseCategories = sheet.getRange('M:M').getValues()
      .flat()
      .filter(function(v){ return v !== '' && v !== '花銷類別'; })
      .map(function(v){ return String(v).trim(); });
  }
  // 一般開銷 U 欄掃描 tag 庫
  if (sheet.getName() === '寫入_一般開銷') {
    var tagCol = sheet.getRange('U:U').getValues().flat();
    var tagSet = {};
    tagCol.forEach(function(v) {
      if (!v) return;
      String(v).split(',').forEach(function(t) {
        t = t.trim();
        if (t) tagSet[t] = true;
      });
    });
    result.tagLibrary = Object.keys(tagSet);
  }
  return result;
}

// ── 打卡 sheet 專用讀取（轉成物件陣列，前端好處理）──────
// 打卡 sheet 欄位：
//   A(1) 打卡ID  B(2) 時間戳  C(3) 類型  D(4) 成員  E(5) 地點名稱
//   F(6) 緯度    G(7) 經度    H(8) 日記內容  I(9) 圖片URL(R2)
//   J(10) 留言JSON  K(11) 建立時間  L(12) SVG資料  M(13) SVG格數
var CHECKIN_HEADER = [
  '打卡ID','時間戳','類型','成員','地點名稱','緯度','經度',
  '日記內容','圖片URL','留言JSON','建立時間','SVG資料','SVG格數'
];

function readCheckinSheet(sheet) {
  var rows = sheet.getDataRange().getDisplayValues();
  if (rows.length < 2) return { checkins: [] };
  var checkins = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0]) continue;
    var comments = [];
    try { comments = JSON.parse(r[9] || '[]'); } catch(e) {}
    // 時間戳（ISO）轉 YYYY/MM/DD 給前端顯示
    var dateStr = '';
    var timeRaw = r[1] || r[10];
    if (timeRaw) {
      var d = new Date(timeRaw);
      if (!isNaN(d.getTime())) {
        dateStr = d.getFullYear() + '/' +
          ('0' + (d.getMonth()+1)).slice(-2) + '/' +
          ('0' + d.getDate()).slice(-2);
      }
    }
    checkins.push({
      id:        r[0],
      type:      r[2] || 'checkin',
      who:       r[3],
      name:      r[4],
      lat:       parseFloat(r[5]) || 0,
      lng:       parseFloat(r[6]) || 0,
      note:      r[7],
      imageUrl:  r[8],
      comments:  comments,
      time:      timeRaw,
      date:      dateStr,
      svgData:   r[11] || '',
      svgGrid:   parseInt(r[12], 10) || 16,
      _rowIndex: i + 1,
    });
  }
  return { checkins: checkins };
}

// ── 消費地圖讀取（一般開銷裡有座標的，給腳印地圖用）──────
// 欄位：A地點 B日期 C類別 D金額 E幣別 … I付款人 N備註 V品項 W數量 X緯度 Y經度
function readExpenseMap(sheet) {
  var rows = sheet.getDataRange().getDisplayValues();
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var lat = parseFloat(r[23]), lng = parseFloat(r[24]);
    if (!lat || !lng) continue;
    out.push({
      id:       'exp_' + (i + 1),
      lat:      lat,
      lng:      lng,
      location: r[0],
      date:     r[1],
      category: r[2],
      amount:   r[3],
      currency: r[4],
      payer:    r[8],
      note:     r[13],
      title:    r[21],
      qty:      r[22],
      svgData:  r[25] || '',
      svgGrid:  parseInt(r[26], 10) || 16,
      comments: (function(){ try { return JSON.parse(r[27] || '[]'); } catch(e) { return []; } })(),
      _rowIndex: i + 1,
    });
  }
  return { expenses: out };
}

// ── 住宿地圖讀取（住宿 sheet 的 lat/lng 欄）────────────
function readStayMap(sheet) {
  var rows = sheet.getDataRange().getDisplayValues();
  if (rows.length < 2) return { stays: [] };
  // 用標題列找 lat/lng 欄（容忍前後空白，如「' lng'」）
  var header = rows[0].map(function(h){ return String(h||'').trim().toLowerCase(); });
  var latCol = header.indexOf('lat'), lngCol = header.indexOf('lng');
  if (latCol < 0 || lngCol < 0) return { stays: [] };
  var stays = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var lat = parseFloat(r[latCol]), lng = parseFloat(r[lngCol]);
    if (!lat || !lng) continue;
    stays.push({ name: r[0] || '', date: r[1] || '', lat: lat, lng: lng });
  }
  return { stays: stays };
}

// ── doGet ────────────────────────────────────────────────
function doGet(e) {
  var param = (e && e.parameter && e.parameter.sheet) || '總覽';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  try {
    if (param === 'all') {
      var cache    = CacheService.getScriptCache();
      var cacheKey = 'all_sheets_v1';
      var cached   = cache.get(cacheKey);
      if (cached) {
        return ContentService.createTextOutput(cached)
          .setMimeType(ContentService.MimeType.JSON);
      }
      var result = { updatedAt: new Date().toISOString() };
      for (var key in SHEET_NAMES) {
        var sheet = ss.getSheetByName(SHEET_NAMES[key]);
        if (!sheet) continue;
        // 打卡 sheet 用專屬轉換，其他用通用轉換
        if (key === 'checkin') {
          result[key] = readCheckinSheet(sheet);
        } else {
          result[key] = readSheet(sheet);
        }
      }
      var json = JSON.stringify(result);
      cache.put(cacheKey, json, 60);
      return ContentService.createTextOutput(json)
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 地圖一次載入：?sheet=mapdata（打卡＋消費＋住宿）
    if (param === 'mapdata') {
      var ckSheet  = ss.getSheetByName(SHEET_NAMES.checkin);
      var expSheet = ss.getSheetByName(SHEET_NAMES.expense);
      var stSheet  = ss.getSheetByName(SHEET_NAMES.accommodation);
      var bundle = {
        checkins: ckSheet  ? readCheckinSheet(ckSheet).checkins : [],
        expenses: expSheet ? readExpenseMap(expSheet).expenses  : [],
        stays:    stSheet  ? readStayMap(stSheet).stays         : [],
      };
      return ContentService.createTextOutput(JSON.stringify(bundle))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 單獨讀取打卡資料：?sheet=checkin
    if (param === 'checkin' || param === '寫入_腳印') {      var checkinSheet = ss.getSheetByName(SHEET_NAMES.checkin);
      if (!checkinSheet) {
        return ContentService.createTextOutput(JSON.stringify({ checkins: [] }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify(readCheckinSheet(checkinSheet)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 消費地圖資料：?sheet=expensemap
    if (param === 'expensemap') {
      var expSheet = ss.getSheetByName(SHEET_NAMES.expense);
      if (!expSheet) {
        return ContentService.createTextOutput(JSON.stringify({ expenses: [] }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify(readExpenseMap(expSheet)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 住宿地圖資料：?sheet=staymap
    if (param === 'staymap') {
      var staySheet = ss.getSheetByName(SHEET_NAMES.accommodation);
      if (!staySheet) {
        return ContentService.createTextOutput(JSON.stringify({ stays: [] }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify(readStayMap(staySheet)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = ss.getSheetByName(param);
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ error: '找不到工作表：' + param }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify(readSheet(sheet)))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── doPost ───────────────────────────────────────────────
function doPost(e) {
  try {
    var body = e.postData.contents || e.postData.getDataAsString();
    var payload = JSON.parse(body);
    var action  = payload.action;
    var ss      = SpreadsheetApp.getActiveSpreadsheet();

    function clearCache() {
      CacheService.getScriptCache().remove('all_sheets_v1');
    }

    // ── 新增／修改一般開銷 ────────────────────────────────
    // 欄位：A地點 B日期 C類別 D金額 E幣別 F換算台幣 G海外手續費 H合計
    //        I付款人 J如何分 K猴負擔 L花負擔 M寧負擔 N備註
    //        O品牌(油) P目前里程 Q公升數 R單次行駛里程 S平均油耗
    //        T共同消費 U標籤
    if (action === 'addExpense' || action === 'editExpense') {
      var sheet = ss.getSheetByName(SHEET_NAMES.expense);
      if (!sheet) throw new Error('找不到工作表：' + SHEET_NAMES.expense);
      var row = [
        payload.location       || '',
        payload.date           || '',
        payload.category       || '',
        payload.amount         || 0,
        (payload.currency || 'NT').replace(/\.$/,''),
        payload.twd            || 0,
        payload.foreignFee     || 0,
        payload.total          || 0,
        payload.payer          || '',
        payload.splitMode      || '均分',
        payload['split猴']     || 0,
        payload['split花']     || 0,
        payload['split寧']     || 0,
        payload.note           || '',
        payload.fuelBrand      || '',
        payload.fuelMileage    || '',
        payload.fuelLiters     || '',
        payload.fuelTripKm     || '',
        payload.fuelEfficiency || '',
        payload.isShared ? 'TRUE' : 'FALSE',
        payload.tags           || '',
        payload.title          || '',
        payload.qty            || 1,
      ];
      // X(24) 緯度 Y(25) 經度：記帳時有抓到 GPS 才寫，地圖用
      // 編輯時前端不送 lat/lng（undefined），只寫 23 欄保留原座標
      if (action === 'addExpense' || payload.lat !== undefined || payload.lng !== undefined) {
        row.push(payload.lat || '', payload.lng || '');
      }
      if (action === 'editExpense' && payload.rowIndex) {
        sheet.getRange(payload.rowIndex, 1, 1, row.length).setValues([row]);
      } else {
        // 用 C 欄（類別）找第一個空行，類別沒有預設值
        var insertRow = findFirstEmptyRow(sheet, 'C', 2);
        sheet.getRange(insertRow, 1, 1, row.length).setValues([row]);
      }
      clearCache();
      return ok('expense saved');
    }

    // ── 消費地圖小編輯：備註/塗鴉/座標 ────────────────────
    // N(14) 備註；X(24) 緯度 Y(25) 經度；Z(26) SVG資料 AA(27) SVG格數
    if (action === 'expenseMapEdit') {
      var sheet = ss.getSheetByName(SHEET_NAMES.expense);
      if (!sheet) throw new Error('找不到工作表：' + SHEET_NAMES.expense);
      if (!payload.rowIndex) throw new Error('缺少 rowIndex');
      if (payload.note    !== undefined) sheet.getRange(payload.rowIndex, 14).setValue(payload.note);
      if (payload.lat     !== undefined) sheet.getRange(payload.rowIndex, 24).setValue(payload.lat);
      if (payload.lng     !== undefined) sheet.getRange(payload.rowIndex, 25).setValue(payload.lng);
      if (payload.svgData !== undefined) sheet.getRange(payload.rowIndex, 26).setValue(payload.svgData);
      if (payload.svgGrid !== undefined) sheet.getRange(payload.rowIndex, 27).setValue(payload.svgGrid);
      clearCache();
      return ok('expense map data updated');
    }

    // ── 消費留言（一般開銷 AB 欄存 JSON）──────────────────
    if (action === 'addExpenseComment') {
      var sheet = ss.getSheetByName(SHEET_NAMES.expense);
      if (!sheet) throw new Error('找不到工作表：' + SHEET_NAMES.expense);
      if (!payload.rowIndex) throw new Error('缺少 rowIndex');
      var existing = sheet.getRange(payload.rowIndex, 28).getValue();
      var comments = [];
      try { comments = JSON.parse(existing || '[]'); } catch(e2) { comments = []; }
      comments.push({
        who:  payload.who  || '',
        text: payload.text || '',
        time: new Date().toISOString(),
      });
      sheet.getRange(payload.rowIndex, 28).setValue(JSON.stringify(comments));
      clearCache();
      return ok({ msg: 'expense comment added', count: comments.length });
    }

    // ── 刪除一般開銷 ──────────────────────────────────────
    if (action === 'deleteExpense') {
      var sheet = ss.getSheetByName(SHEET_NAMES.expense);
      if (!sheet) throw new Error('找不到工作表：' + SHEET_NAMES.expense);
      if (!payload.rowIndex) throw new Error('缺少 rowIndex');
      sheet.deleteRow(payload.rowIndex);
      clearCache();
      return ok('expense deleted');
    }

    // ── 新增／修改還款記錄 ────────────────────────────────
    // 寫入_分帳 還款欄：F(6)還款日期 G(7)債務人 H(8)債主 I(9)金額 J(10)備註
    if (action === 'addRepay' || action === 'editRepay') {
      var sheet = ss.getSheetByName(SHEET_NAMES.split);
      if (!sheet) throw new Error('找不到工作表：' + SHEET_NAMES.split);
      var repayRow = [
        payload.date   || new Date().toISOString(),  // F 還款日期
        payload.from   || '',                         // G 債務人（還錢的人）
        payload.to     || '',                         // H 債主（收錢的人）
        payload.amount || 0,                          // I 金額
        payload.note   || '',                         // J 備註
      ];

      if (action === 'editRepay' && payload.rowIndex) {
        sheet.getRange(payload.rowIndex, 6, 1, 5).setValues([repayRow]);
      } else {
        // F 欄第一個空行（前4行是成員資料，從第5行開始）
        var insertRow = findFirstEmptyRow(sheet, 'F', 5);
        sheet.getRange(insertRow, 6, 1, 5).setValues([repayRow]);
      }
      clearCache();
      return ok('repay saved');
    }

    // ── 刪除還款記錄 ──────────────────────────────────────
    if (action === 'deleteRepay') {
      var sheet = ss.getSheetByName(SHEET_NAMES.split);
      if (!sheet) throw new Error('找不到工作表：' + SHEET_NAMES.split);
      if (!payload.rowIndex) throw new Error('缺少 rowIndex');
      sheet.getRange(payload.rowIndex, 6, 1, 5).clearContent();
      clearCache();
      return ok('repay deleted');
    }

    // ── 新增打卡 ──────────────────────────────────────────
    // 打卡 sheet 欄位：
    //   A打卡ID B時間戳 C類型 D成員 E地點名稱 F緯度 G經度
    //   H日記內容 I圖片URL(R2) J留言JSON K建立時間 L SVG資料 M SVG格數
    if (action === 'addCheckin') {
      var sheet = ss.getSheetByName(SHEET_NAMES.checkin);
      if (!sheet) {
        // 自動建立打卡 sheet 並寫入 header
        sheet = ss.insertSheet(SHEET_NAMES.checkin);
        sheet.getRange(1, 1, 1, CHECKIN_HEADER.length).setValues([CHECKIN_HEADER]);
      }
      var id  = 'ck_' + new Date().getTime();
      var now = new Date().toISOString();
      var row = [
        id,
        payload.time || now,   // B 時間戳：可由前端指定（補登舊日期）
        payload.type     || 'checkin',
        payload.who      || '',
        payload.name     || '',
        payload.lat      || 0,
        payload.lng      || 0,
        payload.note     || '',
        payload.imageUrl || '',
        JSON.stringify(payload.comments || []),
        now,
        payload.svgData  || '',
        payload.svgGrid  || 16,
      ];
      var insertRow = findFirstEmptyRow(sheet, 'A', 2);
      sheet.getRange(insertRow, 1, 1, row.length).setValues([row]);
      clearCache();
      return ok({ msg: 'checkin saved', id: id });
    }

    // ── 修改打卡（更新日記、圖片或留言）──────────────────
    if (action === 'editCheckin') {
      var sheet = ss.getSheetByName(SHEET_NAMES.checkin);
      if (!sheet) throw new Error('找不到工作表：' + SHEET_NAMES.checkin);
      if (!payload.rowIndex) throw new Error('缺少 rowIndex');
      if (payload.time     !== undefined) sheet.getRange(payload.rowIndex, 2).setValue(payload.time);
      if (payload.note     !== undefined) sheet.getRange(payload.rowIndex, 8).setValue(payload.note);
      if (payload.imageUrl !== undefined) sheet.getRange(payload.rowIndex, 9).setValue(payload.imageUrl);
      if (payload.comments !== undefined) sheet.getRange(payload.rowIndex, 10).setValue(JSON.stringify(payload.comments));
      if (payload.svgData  !== undefined) sheet.getRange(payload.rowIndex, 12).setValue(payload.svgData);
      if (payload.svgGrid  !== undefined) sheet.getRange(payload.rowIndex, 13).setValue(payload.svgGrid);
      clearCache();
      return ok('checkin updated');
    }

    // ── 刪除打卡 ──────────────────────────────────────────
    if (action === 'deleteCheckin') {
      var sheet = ss.getSheetByName(SHEET_NAMES.checkin);
      if (!sheet) throw new Error('找不到工作表：' + SHEET_NAMES.checkin);
      if (!payload.rowIndex) throw new Error('缺少 rowIndex');
      sheet.deleteRow(payload.rowIndex);
      clearCache();
      return ok('checkin deleted');
    }

    // ── 新增留言 ──────────────────────────────────────────
    if (action === 'addComment') {
      var sheet = ss.getSheetByName(SHEET_NAMES.checkin);
      if (!sheet) throw new Error('找不到工作表：' + SHEET_NAMES.checkin);
      if (!payload.checkinId) throw new Error('缺少 checkinId');

      // 用打卡 ID 找到對應行
      var aVals = sheet.getRange('A:A').getValues();
      var targetRow = -1;
      for (var i = 1; i < aVals.length; i++) {
        if (String(aVals[i][0]||'').trim() === payload.checkinId) {
          targetRow = i + 1;
          break;
        }
      }
      if (targetRow < 0) throw new Error('找不到打卡 ID：' + payload.checkinId);

      var existing = sheet.getRange(targetRow, 10).getValue();
      var comments = [];
      try { comments = JSON.parse(existing || '[]'); } catch(e2) { comments = []; }
      comments.push({
        who:  payload.who  || '',
        text: payload.text || '',
        time: new Date().toISOString(),
      });
      sheet.getRange(targetRow, 10).setValue(JSON.stringify(comments));
      clearCache();
      return ok({ msg: 'comment added', count: comments.length });
    }

    return err('未知的 action：' + action);

  } catch(ex) {
    return err(ex.toString());
  }
}

function ok(msg) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, msg: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

function err(msg) {
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}
