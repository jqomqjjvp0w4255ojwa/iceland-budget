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
  task:          '寫入_任務',
  schedule:      '日程',
  insurance:     '保險',
  manual:        '手冊',
};

// ── 保險表欄位 ───────────────────────────────────────────
// 一列＝一個理賠項目；同公司/方案多列即可
var INSURANCE_HEADER = [
  '保險公司','方案','理賠項目','理賠金額','理賠方法','備註'
];

// ── 手冊資訊表欄位 ───────────────────────────────────────
// 分類例：實用資訊／緊急聯絡／購物補給／交通…（自由填）
var MANUAL_HEADER = [
  '分類','標題','內容','連結'
];

// ── 一次性：建立保險表（在編輯器選這個函式按執行）──
function setupInsuranceSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.insurance);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAMES.insurance);
  var first = String(sheet.getRange(1, 1).getValue() || '').trim();
  if (first === '保險公司') return '已是新結構，未變更';
  sheet.getRange(1, 1, 1, INSURANCE_HEADER.length).setValues([INSURANCE_HEADER]);
  sheet.setFrozenRows(1);
  var widths = [110, 130, 180, 110, 260, 200];
  for (var c = 0; c < widths.length; c++) sheet.setColumnWidth(c + 1, widths[c]);
  return '保險表已建立';
}

// ── 一次性：建立手冊資訊表 ──
function setupManualSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.manual);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAMES.manual);
  var first = String(sheet.getRange(1, 1).getValue() || '').trim();
  if (first === '分類') return '已是新結構，未變更';
  sheet.getRange(1, 1, 1, MANUAL_HEADER.length).setValues([MANUAL_HEADER]);
  sheet.setFrozenRows(1);
  var widths = [90, 160, 420, 240];
  for (var c = 0; c < widths.length; c++) sheet.setColumnWidth(c + 1, widths[c]);
  // 先塞幾筆你們「雜」分頁整理出來的情報當種子
  var seed = [
    ['實用資訊', '刷卡', '冰島消費全面無紙化，上廁所都能刷卡；店家收歐元找克朗，想留紀念幣可帶點歐元。匯率約 1000 ISK ≈ 300 台幣', ''],
    ['實用資訊', '時差', '冰島比台灣慢 8 小時（台灣 10:00＝冰島凌晨 02:00）', ''],
    ['實用資訊', '電壓', '220V 歐規雙圓孔，飯店沒有萬國插頭，要自備', ''],
    ['緊急聯絡', '緊急電話', '冰島報警／救護／消防統一：112', ''],
    ['實用資訊', '網路', '歐洲 eSIM', 'https://esim.djbcard.com/product-category/esim/europe/?aid=16'],
    ['購物補給', '便宜超市', 'Bónus（小豬超市，最便宜）、Krónan、Nettó；N1 加油站可補給', ''],
  ];
  sheet.getRange(2, 1, seed.length, MANUAL_HEADER.length).setValues(seed);
  return '手冊表已建立（含 ' + seed.length + ' 筆種子資料）';
}

// ── 日程表欄位 ───────────────────────────────────────────
// A日期(9/17) B時間(可空/可寫「上午」) C分類 D標題 E說明 F地點 G緯度 H經度
//   分類：景點／住宿／活動／其他（住宿列可留空，會自動從住宿表帶入）
//   時間：填了就顯示，沒填就按列的順序排
var SCHEDULE_HEADER = [
  '日期','時間','分類','標題','說明','地點','緯度','經度','停留','網址'
];

// ── 一次性：建立日程表（在編輯器選這個函式按執行）──
function setupScheduleSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.schedule);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.schedule);
  }
  var rows = sheet.getDataRange().getValues();
  var header = rows[0].map(function(h){ return String(h || '').trim(); });
  if (header[0] === '日期' && header[2] === '分類') {
    applyScheduleValidation_(sheet);
    sheet.setFrozenRows(1);
    return '已是新結構，已重設驗證規則';
  }
  sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).clearDataValidations();
  sheet.getRange(1, 1, 1, SCHEDULE_HEADER.length).setValues([SCHEDULE_HEADER]);
  applyScheduleValidation_(sheet);
  sheet.setFrozenRows(1);
  return '日程表已建立';
}

function applyScheduleValidation_(sheet) {
  var last = Math.max(sheet.getMaxRows(), 200);
  // C 分類：交通＝節點間的區間、參考＝掛在上一個節點下的附註、補給＝超市加油
  sheet.getRange(2, 3, last - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['景點', '住宿', '活動', '補給', '交通', '參考', '其他'], true)
      .setAllowInvalid(false).build());
  var widths = [80, 70, 70, 220, 320, 180, 90, 90, 80, 220];
  for (var c = 0; c < widths.length; c++) sheet.setColumnWidth(c + 1, widths[c]);
}

// ── 行前準備清單欄位 ─────────────────────────────────────
// A項目ID B分類 C項目名稱 D重要度 E說明 F對象
// G猴狀態 H花狀態 I寧狀態 J最後更新
//   分類：待辦／行李／共用
//   對象：留空＝全員都要；填成員名（可逗號分隔多人）＝只有那些人要，
//         其他人不列入進度計算。例：國際駕照只有駕駛需要 → 填「猴,花」
//         共用分類則代表「誰負責帶」
var TASK_HEADER = [
  '項目ID','分類','項目名稱','重要度','說明','對象',
  '猴狀態','花狀態','寧狀態','最後更新'
];

// ── 行前準備成員（狀態欄順序）
var TASK_MEMBERS = ['猴', '花', '寧'];

// ── 一次性：建立／升級任務表結構（在編輯器選這個函式按執行）──
// 可重複執行：舊表會搬成新結構，已是新結構則只重設驗證規則。
// 會先清掉舊的資料驗證（舊 C 欄是重要度，有 0–5 規則，會擋住新的文字欄）。
function setupTaskSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAMES.task);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.task);
    sheet.getRange(1, 1, 1, TASK_HEADER.length).setValues([TASK_HEADER]);
    applyTaskValidation_(sheet);
    sheet.setFrozenRows(1);
    return '已建立新表';
  }

  var rows = sheet.getDataRange().getValues();
  var header = rows[0].map(function(h){ return String(h || '').trim(); });
  var isNew  = header[1] === '分類';

  // 整張表先解除資料驗證，否則寫入會被舊規則擋下
  sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).clearDataValidations();

  if (isNew) {
    // 已是新結構：只重設驗證規則，資料不動
    applyTaskValidation_(sheet);
    sheet.setFrozenRows(1);
    return '已是新結構，已重設驗證規則';
  }

  // 舊 → 新：把有名稱的列搬過去，分類先給「待辦」
  var moved = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (String(r[1] || '').trim() === '') continue;   // 舊 B 欄＝項目名稱
    moved.push([
      r[0] || ('re' + ('00' + (moved.length + 1)).slice(-3)),
      '待辦',                       // 分類（之後可改成 行李／共用）
      r[1],                         // 項目名稱
      Number(r[2]) || 3,            // 重要度
      r[3] || '',                   // 說明
      '',                           // 負責人
      r[4] === true, r[5] === true, r[6] === true,   // 猴／花／寧狀態
      r[7] || '',                   // 最後更新
    ]);
  }

  sheet.clear();
  sheet.getRange(1, 1, 1, TASK_HEADER.length).setValues([TASK_HEADER]);
  if (moved.length) {
    sheet.getRange(2, 1, moved.length, TASK_HEADER.length).setValues(moved);
  }
  applyTaskValidation_(sheet);
  sheet.setFrozenRows(1);
  return '已升級，搬移 ' + moved.length + ' 筆';
}

// 任務表的下拉選單與核取方塊（讓手動填表好填）
function applyTaskValidation_(sheet) {
  var last = Math.max(sheet.getMaxRows(), 200);

  // B 分類：待辦／行李／共用
  sheet.getRange(2, 2, last - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['待辦', '行李', '共用'], true)
      .setAllowInvalid(false).build());

  // D 重要度：0–5
  sheet.getRange(2, 4, last - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['0', '1', '2', '3', '4', '5'], true)
      .setAllowInvalid(false).build());

  // F 對象：留空＝全員；可填單人或多人（逗號分隔），故不設下拉限制

  // G/H/I 三人狀態：核取方塊
  sheet.getRange(2, 7, last - 1, 3).insertCheckboxes();

  // 欄寬（純粹好讀）
  var widths = [80, 70, 200, 70, 260, 70, 55, 55, 55, 150];
  for (var c = 0; c < widths.length; c++) sheet.setColumnWidth(c + 1, widths[c]);
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
      twd:      parseFloat(String(r[5]).replace(/,/g,'')) || 0,
      total:    parseFloat(String(r[7]).replace(/,/g,'')) || 0,
      payer:    r[8],
      burden:   { '猴': r[10] || 0, '花': r[11] || 0, '寧': r[12] || 0 },
      note:     r[13],
      isShared: String(r[19]).toUpperCase() === 'TRUE',
      tags:     r[20] || '',
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

// ── 行前準備清單讀取 ─────────────────────────────────────
function readTaskSheet(sheet) {
  var rows = sheet.getDataRange().getDisplayValues();
  if (rows.length < 2) return { tasks: [] };
  var tasks = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (String(r[2] || '').trim() === '') continue;   // 沒名稱的空列跳過
    tasks.push({
      id:        r[0],
      category:  r[1] || '待辦',
      name:      r[2],
      priority:  parseInt(r[3], 10) || 0,
      note:      r[4] || '',
      owner:     r[5] || '',
      done: (function(){
        var d = {};
        TASK_MEMBERS.forEach(function(m, k){
          d[m] = String(r[6 + k]).toUpperCase() === 'TRUE';
        });
        return d;
      })(),
      updated:   r[9] || '',
      _rowIndex: i + 1,
    });
  }
  return { tasks: tasks };
}

// ── 日程讀取（時間軸用）─────────────────────────────────
function readScheduleSheet(sheet) {
  var rows = sheet.getDataRange().getDisplayValues();
  if (rows.length < 2) return { schedule: [] };
  var out = [];
  var lastDate = '';
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var date = String(r[0] || '').trim();
    var title = String(r[3] || '').trim();
    // 日期可以只寫在該天第一列，後面留空＝沿用上一列的日期
    if (date) lastDate = date; else date = lastDate;
    if (!title || !date) continue;
    out.push({
      date:     date,
      time:     r[1] || '',
      category: r[2] || '其他',
      title:    title,
      note:     r[4] || '',
      place:    r[5] || '',
      lat:      parseFloat(r[6]) || 0,
      lng:      parseFloat(r[7]) || 0,
      stay:     r[8] || '',         // 預計停留時間（30min／1h30min），留空＝不顯示
      url:      r[9] || '',         // 自訂連結，留空就用座標／標題自動找地圖頁
      order:    i,                  // sheet 原始順序（沒填時間時用它排）
      _rowIndex: i + 1,
    });
  }
  return { schedule: out };
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
        } else if (key === 'task') {
          result[key] = readTaskSheet(sheet);
        } else if (key === 'schedule') {
          result[key] = readScheduleSheet(sheet);
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
      var mapCache  = CacheService.getScriptCache();
      var mapCached = mapCache.get('mapdata_v1');
      if (mapCached) {
        return ContentService.createTextOutput(mapCached)
          .setMimeType(ContentService.MimeType.JSON);
      }
      var ckSheet  = ss.getSheetByName(SHEET_NAMES.checkin);
      var expSheet = ss.getSheetByName(SHEET_NAMES.expense);
      var stSheet  = ss.getSheetByName(SHEET_NAMES.accommodation);
      var bundle = {
        checkins: ckSheet  ? readCheckinSheet(ckSheet).checkins : [],
        expenses: expSheet ? readExpenseMap(expSheet).expenses  : [],
        stays:    stSheet  ? readStayMap(stSheet).stays         : [],
      };
      var mapJson = JSON.stringify(bundle);
      mapCache.put('mapdata_v1', mapJson, 30);   // 30 秒，寫入時會清掉
      return ContentService.createTextOutput(mapJson)
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

    // 日程時間軸：?sheet=schedule
    if (param === 'schedule') {
      var schSheet = ss.getSheetByName(SHEET_NAMES.schedule);
      if (!schSheet) {
        return ContentService.createTextOutput(JSON.stringify({ schedule: [] }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify(readScheduleSheet(schSheet)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 行前準備清單：?sheet=tasks
    if (param === 'tasks') {
      var taskSheet = ss.getSheetByName(SHEET_NAMES.task);
      if (!taskSheet) {
        return ContentService.createTextOutput(JSON.stringify({ tasks: [] }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify(readTaskSheet(taskSheet)))
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

// ── 找第一個「指定欄位是空的」的列 ────────────────────────
// 不能直接用 getLastRow()：表格下方常有公式或殘留格式，會把新資料寫到很下面，
// 所以改用一個「一定會有值」的欄位（例如類別、項目名稱）來判斷哪裡才是真正的空行。
// col 傳欄位字母（'A'／'C'…），startRow 是資料起始列（標題列的下一列）。
function findFirstEmptyRow(sheet, col, startRow) {
  var colIdx = 0;
  var s = String(col).toUpperCase();
  for (var i = 0; i < s.length; i++) {
    colIdx = colIdx * 26 + (s.charCodeAt(i) - 64);
  }
  var last = sheet.getLastRow();
  if (last < startRow) return startRow;
  var values = sheet.getRange(startRow, colIdx, last - startRow + 1, 1).getValues();
  for (var r = 0; r < values.length; r++) {
    if (String(values[r][0]).trim() === '') return startRow + r;
  }
  return last + 1;
}

// ── doPost ───────────────────────────────────────────────
function doPost(e) {
  try {
    var body = e.postData.contents || e.postData.getDataAsString();
    var payload = JSON.parse(body);
    var action  = payload.action;
    var ss      = SpreadsheetApp.getActiveSpreadsheet();

    function clearCache() {
      CacheService.getScriptCache().removeAll(['all_sheets_v1', 'mapdata_v1']);
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

    // ── 行前準備：打勾／取消勾 ────────────────────────────
    // G猴(7) H花(8) I寧(9) J最後更新(10)
    if (action === 'toggleTask') {
      var sheet = ss.getSheetByName(SHEET_NAMES.task);
      if (!sheet) throw new Error('找不到工作表：' + SHEET_NAMES.task);
      if (!payload.rowIndex) throw new Error('缺少 rowIndex');
      var mIdx = TASK_MEMBERS.indexOf(payload.who);
      if (mIdx < 0) throw new Error('未知成員：' + payload.who);
      var col = 7 + mIdx;
      sheet.getRange(payload.rowIndex, col).setValue(payload.done === true);
      sheet.getRange(payload.rowIndex, 10).setValue(new Date().toISOString());
      clearCache();
      return ok('task toggled');
    }

    // ── 行前準備：修改項目（名稱／分類／重要度／說明／負責人）──
    // B分類 C項目名稱 D重要度 E說明 F負責人
    if (action === 'editTask') {
      var sheet = ss.getSheetByName(SHEET_NAMES.task);
      if (!sheet) throw new Error('找不到工作表：' + SHEET_NAMES.task);
      if (!payload.rowIndex) throw new Error('缺少 rowIndex');
      if (payload.category !== undefined) sheet.getRange(payload.rowIndex, 2).setValue(payload.category);
      if (payload.name     !== undefined) sheet.getRange(payload.rowIndex, 3).setValue(payload.name);
      if (payload.priority !== undefined) sheet.getRange(payload.rowIndex, 4).setValue(payload.priority);
      if (payload.note     !== undefined) sheet.getRange(payload.rowIndex, 5).setValue(payload.note);
      if (payload.owner    !== undefined) sheet.getRange(payload.rowIndex, 6).setValue(payload.owner);
      sheet.getRange(payload.rowIndex, 10).setValue(new Date().toISOString());
      clearCache();
      return ok('task updated');
    }

    // ── 行前準備：新增項目 ────────────────────────────────
    if (action === 'addTask') {
      var sheet = ss.getSheetByName(SHEET_NAMES.task);
      if (!sheet) {
        sheet = ss.insertSheet(SHEET_NAMES.task);
        sheet.getRange(1, 1, 1, TASK_HEADER.length).setValues([TASK_HEADER]);
        sheet.setFrozenRows(1);
      }
      var insertRow = findFirstEmptyRow(sheet, 'C', 2);   // C＝項目名稱
      var newId = 're' + ('000' + (insertRow - 1)).slice(-3);
      sheet.getRange(insertRow, 1, 1, TASK_HEADER.length).setValues([[
        newId,
        payload.category || '待辦',
        payload.name     || '',
        payload.priority || 3,
        payload.note     || '',
        payload.owner    || '',
        false, false, false,
        new Date().toISOString(),
      ]]);
      clearCache();
      return ok({ msg: 'task added', id: newId, rowIndex: insertRow });
    }

    // ── 行前準備：刪除項目 ────────────────────────────────
    if (action === 'deleteTask') {
      var sheet = ss.getSheetByName(SHEET_NAMES.task);
      if (!sheet) throw new Error('找不到工作表：' + SHEET_NAMES.task);
      if (!payload.rowIndex) throw new Error('缺少 rowIndex');
      sheet.deleteRow(payload.rowIndex);
      clearCache();
      return ok('task deleted');
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
