// ══════════════════════════════════════════════════════════
//  gas_taiwan.js — 台灣版 Google Apps Script 後端
//  部署方式：
//   1. 開一個空白 Google 試算表 → 擴充功能 → Apps Script
//   2. 貼上本檔全部內容 → 部署 → 網頁應用程式
//      （執行身分：我；存取權：任何人）
//   3. 把 /exec 網址填入 taiwan/config.js 的 apiBase
//  所有工作表都會在第一次寫入／讀取時自動建立並寫入標題列，
//  不需要手動建表。
// ══════════════════════════════════════════════════════════

var SHEET_NAMES = {
  checkin: '寫入_腳印',
  trip:    '寫入_旅程',
  member:  '寫入_成員',
};

// ── 各表標題列 ───────────────────────────────────────────
// 腳印：A打卡ID B時間戳 C類型(checkin/wish) D成員 E地點名稱 F緯度 G經度
//       H日記內容 I圖片URL(R2) J留言JSON K建立時間 L SVG資料 M SVG格數
//       N旅程ID（空＝日常紀錄） O同行者(逗號分隔，選填)
var CHECKIN_HEADER = [
  '打卡ID','時間戳','類型','成員','地點名稱','緯度','經度',
  '日記內容','圖片URL','留言JSON','建立時間','SVG資料','SVG格數','旅程ID','同行者'
];

// 旅程：A旅程ID B名稱 C開始日期 D結束日期 E成員(逗號分隔) F備忘 G建立時間
//       H卡片JSON（行前資訊小卡：車票/住宿/租車/備忘…）
var TRIP_HEADER = [
  '旅程ID','名稱','開始日期','結束日期','成員','備忘','建立時間','卡片JSON'
];

// 成員（角色庫；config.js 固定班底的「覆寫」也存這裡——同名即覆寫色/圖）：
// A成員ID B名稱 C代表色 D Emoji E建立時間 F像素圖JSON({grid,rects})
var MEMBER_HEADER = [
  '成員ID','名稱','代表色','Emoji','建立時間','像素圖JSON'
];

// ── 取得工作表；不存在就自動建立並寫入標題列 ─────────────
function getOrCreateSheet(ss, name, header) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, header.length).setValues([header]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ── 找第一個 A 欄空行 ────────────────────────────────────
function firstEmptyRow(sheet) {
  var aVals = sheet.getRange('A:A').getValues();
  for (var i = 1; i < aVals.length; i++) {
    if (String(aVals[i][0] || '').trim() === '') return i + 1;
  }
  return aVals.length + 1;
}

// ── 用 ID 找列號（A 欄）───────────────────────────────────
function findRowById(sheet, id) {
  var aVals = sheet.getRange('A:A').getValues();
  for (var i = 1; i < aVals.length; i++) {
    if (String(aVals[i][0] || '').trim() === id) return i + 1;
  }
  return -1;
}

// ── 腳印表 → 物件陣列 ────────────────────────────────────
function readCheckinSheet(sheet) {
  var rows = sheet.getDataRange().getDisplayValues();
  var checkins = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0]) continue;
    var comments = [];
    try { comments = JSON.parse(r[9] || '[]'); } catch (e) {}
    var dateStr = '';
    var timeRaw = r[1] || r[10];
    if (timeRaw) {
      var d = new Date(timeRaw);
      if (!isNaN(d.getTime())) {
        dateStr = d.getFullYear() + '/' +
          ('0' + (d.getMonth() + 1)).slice(-2) + '/' +
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
      tripId:    r[13] || '',
      companions: String(r[14] || '').split(',').map(function(s){return s.trim();}).filter(String),
      _rowIndex: i + 1,
    });
  }
  return { checkins: checkins };
}

// ── 旅程表 → 物件陣列 ────────────────────────────────────
function readTripSheet(sheet) {
  var rows = sheet.getDataRange().getDisplayValues();
  var trips = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0]) continue;
    var cards = [];
    try { cards = JSON.parse(r[7] || '[]'); } catch (e) {}
    trips.push({
      id:        r[0],
      name:      r[1] || '',
      dateStart: r[2] || '',
      dateEnd:   r[3] || '',
      members:   String(r[4] || '').split(',').map(function(s){return s.trim();}).filter(String),
      memo:      r[5] || '',
      createdAt: r[6] || '',
      cards:     cards,
      _rowIndex: i + 1,
    });
  }
  return { trips: trips };
}

// ── 成員表 → 物件陣列 ────────────────────────────────────
function readMemberSheet(sheet) {
  var rows = sheet.getDataRange().getDisplayValues();
  var members = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0]) continue;
    var sprite = null;
    try { sprite = r[5] ? JSON.parse(r[5]) : null; } catch (e) {}
    members.push({
      id:     r[0],
      name:   r[1] || '',
      color:  r[2] || '',
      icon:   r[3] || '',
      sprite: sprite,
      _rowIndex: i + 1,
    });
  }
  return { members: members };
}

// ── doGet ────────────────────────────────────────────────
//  ?sheet=all      → { checkins, trips, members }
//  ?sheet=checkin  → { checkins }
//  ?sheet=trips    → { trips }
//  ?sheet=members  → { members }
// 寫入後清掉讀取快取（doPost 各 action 結束前呼叫）
function clearTwCache() {
  CacheService.getScriptCache().remove('tw_all_v1');
}

function doGet(e) {
  var param = (e && e.parameter && e.parameter.sheet) || 'all';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  try {
    // 整包讀取加 30 秒快取：連續開頁不必每次重讀四張表
    var cache = CacheService.getScriptCache();
    if (param === 'all') {
      var cached = cache.get('tw_all_v1');
      if (cached) {
        return ContentService.createTextOutput(cached)
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    var result = {};
    if (param === 'all' || param === 'checkin') {
      var cs = getOrCreateSheet(ss, SHEET_NAMES.checkin, CHECKIN_HEADER);
      result.checkins = readCheckinSheet(cs).checkins;
    }
    if (param === 'all' || param === 'trips') {
      var ts = getOrCreateSheet(ss, SHEET_NAMES.trip, TRIP_HEADER);
      result.trips = readTripSheet(ts).trips;
    }
    if (param === 'all' || param === 'members') {
      var ms = getOrCreateSheet(ss, SHEET_NAMES.member, MEMBER_HEADER);
      result.members = readMemberSheet(ms).members;
    }
    result.updatedAt = new Date().toISOString();
    var json = JSON.stringify(result);
    if (param === 'all') cache.put('tw_all_v1', json, 30);
    return ContentService.createTextOutput(json)
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err2) {
    return ContentService.createTextOutput(JSON.stringify({ error: err2.toString() }))
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

    // ════ 腳印 ════════════════════════════════════════════
    if (action === 'addCheckin') {
      var sheet = getOrCreateSheet(ss, SHEET_NAMES.checkin, CHECKIN_HEADER);
      var id  = 'ck_' + new Date().getTime();
      var now = new Date().toISOString();
      var row = [
        id,
        now,
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
        payload.tripId   || '',
        (payload.companions || []).join(','),
      ];
      sheet.getRange(firstEmptyRow(sheet), 1, 1, row.length).setValues([row]);
      return ok({ msg: 'checkin saved', id: id });
    }

    if (action === 'editCheckin') {
      var sheet = getOrCreateSheet(ss, SHEET_NAMES.checkin, CHECKIN_HEADER);
      var rowIdx = payload.rowIndex || findRowById(sheet, payload.id || '');
      if (rowIdx < 2) throw new Error('找不到打卡：' + (payload.id || payload.rowIndex));
      if (payload.type     !== undefined) sheet.getRange(rowIdx, 3).setValue(payload.type);
      if (payload.name     !== undefined) sheet.getRange(rowIdx, 5).setValue(payload.name);
      if (payload.note     !== undefined) sheet.getRange(rowIdx, 8).setValue(payload.note);
      if (payload.imageUrl !== undefined) sheet.getRange(rowIdx, 9).setValue(payload.imageUrl);
      if (payload.comments !== undefined) sheet.getRange(rowIdx, 10).setValue(JSON.stringify(payload.comments));
      if (payload.svgData  !== undefined) sheet.getRange(rowIdx, 12).setValue(payload.svgData);
      if (payload.svgGrid  !== undefined) sheet.getRange(rowIdx, 13).setValue(payload.svgGrid);
      if (payload.tripId   !== undefined) sheet.getRange(rowIdx, 14).setValue(payload.tripId);
      if (payload.companions !== undefined) sheet.getRange(rowIdx, 15).setValue((payload.companions || []).join(','));
      return ok('checkin updated');
    }

    if (action === 'deleteCheckin') {
      var sheet = getOrCreateSheet(ss, SHEET_NAMES.checkin, CHECKIN_HEADER);
      var rowIdx = payload.rowIndex || findRowById(sheet, payload.id || '');
      if (rowIdx < 2) throw new Error('找不到打卡');
      sheet.deleteRow(rowIdx);
      return ok('checkin deleted');
    }

    if (action === 'addComment') {
      var sheet = getOrCreateSheet(ss, SHEET_NAMES.checkin, CHECKIN_HEADER);
      if (!payload.checkinId) throw new Error('缺少 checkinId');
      var targetRow = findRowById(sheet, payload.checkinId);
      if (targetRow < 0) throw new Error('找不到打卡 ID：' + payload.checkinId);
      var existing = sheet.getRange(targetRow, 10).getValue();
      var comments = [];
      try { comments = JSON.parse(existing || '[]'); } catch (e2) { comments = []; }
      comments.push({
        who:  payload.who  || '',
        text: payload.text || '',
        time: new Date().toISOString(),
      });
      sheet.getRange(targetRow, 10).setValue(JSON.stringify(comments));
      return ok({ msg: 'comment added', count: comments.length });
    }

    // ════ 旅程 ════════════════════════════════════════════
    if (action === 'addTrip') {
      var sheet = getOrCreateSheet(ss, SHEET_NAMES.trip, TRIP_HEADER);
      var id  = 'tp_' + new Date().getTime();
      var now = new Date().toISOString();
      var row = [
        id,
        payload.name      || '',
        payload.dateStart || '',
        payload.dateEnd   || '',
        (payload.members || []).join(','),
        payload.memo      || '',
        now,
        JSON.stringify(payload.cards || []),
      ];
      sheet.getRange(firstEmptyRow(sheet), 1, 1, row.length).setValues([row]);
      return ok({ msg: 'trip saved', id: id });
    }

    if (action === 'editTrip') {
      var sheet = getOrCreateSheet(ss, SHEET_NAMES.trip, TRIP_HEADER);
      var rowIdx = payload.rowIndex || findRowById(sheet, payload.id || '');
      if (rowIdx < 2) throw new Error('找不到旅程：' + (payload.id || ''));
      if (payload.name      !== undefined) sheet.getRange(rowIdx, 2).setValue(payload.name);
      if (payload.dateStart !== undefined) sheet.getRange(rowIdx, 3).setValue(payload.dateStart);
      if (payload.dateEnd   !== undefined) sheet.getRange(rowIdx, 4).setValue(payload.dateEnd);
      if (payload.members   !== undefined) sheet.getRange(rowIdx, 5).setValue((payload.members || []).join(','));
      if (payload.memo      !== undefined) sheet.getRange(rowIdx, 6).setValue(payload.memo);
      if (payload.cards     !== undefined) sheet.getRange(rowIdx, 8).setValue(JSON.stringify(payload.cards));
      return ok('trip updated');
    }

    if (action === 'deleteTrip') {
      var sheet = getOrCreateSheet(ss, SHEET_NAMES.trip, TRIP_HEADER);
      var rowIdx = payload.rowIndex || findRowById(sheet, payload.id || '');
      if (rowIdx < 2) throw new Error('找不到旅程');
      sheet.deleteRow(rowIdx);
      return ok('trip deleted');
    }

    // ════ 成員 ════════════════════════════════════════════
    if (action === 'addMember') {
      var sheet = getOrCreateSheet(ss, SHEET_NAMES.member, MEMBER_HEADER);
      if (!payload.name) throw new Error('缺少成員名稱');
      // 同名不重複建
      var bVals = sheet.getRange('B:B').getValues();
      for (var i = 1; i < bVals.length; i++) {
        if (String(bVals[i][0]||'').trim() === payload.name) {
          return ok({ msg: 'member exists', id: String(sheet.getRange(i+1,1).getValue()) });
        }
      }
      var id  = 'mb_' + new Date().getTime();
      var row = [
        id,
        payload.name,
        payload.color || '',
        payload.icon  || '',
        new Date().toISOString(),
        payload.sprite ? JSON.stringify(payload.sprite) : '',
      ];
      sheet.getRange(firstEmptyRow(sheet), 1, 1, row.length).setValues([row]);
      return ok({ msg: 'member saved', id: id });
    }

    // 編輯成員（色/emoji/像素圖；不含改名，改名走 renameMember）
    if (action === 'editMember') {
      var sheet = getOrCreateSheet(ss, SHEET_NAMES.member, MEMBER_HEADER);
      var rowIdx = payload.rowIndex || findRowById(sheet, payload.id || '');
      // 找不到 id 時用名稱找（config 固定班底第一次編輯會以覆寫列新建）
      if (rowIdx < 2 && payload.name) {
        var bVals = sheet.getRange('B:B').getValues();
        for (var i = 1; i < bVals.length; i++) {
          if (String(bVals[i][0]||'').trim() === payload.name) { rowIdx = i + 1; break; }
        }
      }
      if (rowIdx < 2) {
        if (!payload.name) throw new Error('缺少成員名稱');
        var nid = 'mb_' + new Date().getTime();
        var nrow = [
          nid, payload.name,
          payload.color || '', payload.icon || '',
          new Date().toISOString(),
          payload.sprite ? JSON.stringify(payload.sprite) : '',
        ];
        sheet.getRange(firstEmptyRow(sheet), 1, 1, nrow.length).setValues([nrow]);
        return ok({ msg: 'member override created', id: nid });
      }
      if (payload.color  !== undefined) sheet.getRange(rowIdx, 3).setValue(payload.color);
      if (payload.icon   !== undefined) sheet.getRange(rowIdx, 4).setValue(payload.icon);
      if (payload.sprite !== undefined) sheet.getRange(rowIdx, 6).setValue(payload.sprite ? JSON.stringify(payload.sprite) : '');
      return ok('member updated');
    }

    // 改名：連動所有歷史紀錄（腳印成員/留言/同行者、旅程成員、成員表）
    if (action === 'renameMember') {
      var oldName = String(payload.oldName || '').trim();
      var newName = String(payload.newName || '').trim();
      if (!oldName || !newName) throw new Error('缺少 oldName/newName');
      var changed = { checkins: 0, comments: 0, trips: 0, member: 0 };

      // 腳印：D 欄成員、J 欄留言JSON 的 who、O 欄同行者（逗號清單）
      var cs = getOrCreateSheet(ss, SHEET_NAMES.checkin, CHECKIN_HEADER);
      var cRows = cs.getDataRange().getValues();
      for (var i = 1; i < cRows.length; i++) {
        if (String(cRows[i][3]||'').trim() === oldName) {
          cs.getRange(i+1, 4).setValue(newName); changed.checkins++;
        }
        var cj = String(cRows[i][9]||'');
        if (cj) {
          try {
            var cmts = JSON.parse(cj); var hit = false;
            cmts.forEach(function(c){ if (c.who === oldName) { c.who = newName; hit = true; } });
            if (hit) { cs.getRange(i+1, 10).setValue(JSON.stringify(cmts)); changed.comments++; }
          } catch (e) {}
        }
        var companionList = String(cRows[i][14]||'').split(',').map(function(s){return s.trim();}).filter(String);
        var cIdx = companionList.indexOf(oldName);
        if (cIdx >= 0) {
          companionList[cIdx] = newName;
          cs.getRange(i+1, 15).setValue(companionList.join(','));
        }
      }

      // 旅程：E 欄成員（逗號清單）
      var tsh = getOrCreateSheet(ss, SHEET_NAMES.trip, TRIP_HEADER);
      var tRows = tsh.getDataRange().getValues();
      for (var i = 1; i < tRows.length; i++) {
        var list = String(tRows[i][4]||'').split(',').map(function(s){return s.trim();}).filter(String);
        var idx = list.indexOf(oldName);
        if (idx >= 0) {
          list[idx] = newName;
          tsh.getRange(i+1, 5).setValue(list.join(','));
          changed.trips++;
        }
      }

      // 成員表：B 欄名稱
      var msh = getOrCreateSheet(ss, SHEET_NAMES.member, MEMBER_HEADER);
      var mRows = msh.getDataRange().getValues();
      for (var i = 1; i < mRows.length; i++) {
        if (String(mRows[i][1]||'').trim() === oldName) {
          msh.getRange(i+1, 2).setValue(newName); changed.member++;
        }
      }

      return ok({ msg: 'renamed', changed: changed });
    }

    if (action === 'deleteMember') {
      var sheet = getOrCreateSheet(ss, SHEET_NAMES.member, MEMBER_HEADER);
      var rowIdx = payload.rowIndex || findRowById(sheet, payload.id || '');
      if (rowIdx < 2) throw new Error('找不到成員');
      sheet.deleteRow(rowIdx);
      return ok('member deleted');
    }

    return err('未知的 action：' + action);

  } catch (ex) {
    return err(ex.toString());
  }
}

function ok(msg) {
  clearTwCache();   // 任何成功寫入都讓讀取快取失效

  return ContentService.createTextOutput(JSON.stringify({ ok: true, msg: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

function err(msg) {
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}
