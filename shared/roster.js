// ══════════════════════════════════════════════════════════
//  roster.js — 共用角色資料模組（角色館的核心）
//
//  一份角色名冊，兩本書共用。冰島版與台灣版原本各自在 config.js 裡
//  維護一份 members，欄位還不一樣（冰島多 sceneId/charId/bubbleId，
//  台灣多 iconKey）；這裡統一成一種形狀，各 app 需要的額外欄位放在 refs。
//
//  用法：
//    <script src="../shared/sprites.js"></script>   // 像素圖（可省略，會退回 emoji）
//    <script src="../shared/roster.js"></script>
//    const list = Roster.all();
//    el.innerHTML = Roster.spriteSvg(ch);
//    Roster.startTicker();                          // 待機動畫（8 FPS）
//    Roster.upsert({ id:'hana', name:'花', ... }); Roster.save();
//
//  儲存：localStorage['roster_v1']，內容是「改過的部分」疊在種子名冊上。
//  之後接後端時，把 load()/save() 換成 API 即可，其餘介面不變。
// ══════════════════════════════════════════════════════════
(function () {

const KEY = 'roster_v1';

// ── 角色欄位
//  id        永久識別碼，改名不影響既有紀錄（打卡的 author/with 存 id）
//  name      顯示名稱
//  alias     稱號／一句話身分（角色介紹頁的副標）
//  color     代表色（地圖標記、分帳圓點）
//  icon      emoji 備援（沒有像素圖時顯示）
//  spriteKey 對應 window.SPRITES 的 key（四格待機動畫）
//  sprite    自畫的像素圖 { rects, grid }，優先度低於 spriteKey
//  intro     介紹文（遊戲人物頁的那段字）
//  tags      特徵標籤，如 ['怕冷','負責訂房']
//  isMe      是不是本人（打卡 author 預設值；只該有一個 true）
//  since     認識／首次同行年份
//  refs      各 app 需要的額外欄位（冰島版 sceneId/charId/bubbleId…）
const SEED = [
  { id:'hana',   name:'花', alias:'',  color:'#cc4488', icon:'🌸', spriteKey:'FLOWER_FRAMES',
    intro:'', tags:[], isMe:false, since:'', refs:{ sceneId:'svgHana', charId:'pxHana', bubbleId:'bubbleHana' } },
  { id:'monkey', name:'猴', alias:'',  color:'#c07020', icon:'🐒', spriteKey:'MONKEY_FRAMES',
    intro:'', tags:[], isMe:false, since:'', refs:{ sceneId:'svgMonkey', charId:'pxMonkey', bubbleId:'bubbleMonkey' } },
  { id:'ning',   name:'寧', alias:'',  color:'#7755bb', icon:'🐱', spriteKey:'NING_FRAMES',
    intro:'', tags:[], isMe:false, since:'', refs:{ sceneId:'svgNing', charId:'pxNing', bubbleId:'bubbleNing' } },
];

const BLANK = {
  id:'', name:'', alias:'', color:'#9a9088', icon:'🙂', spriteKey:'',
  sprite:null, intro:'', tags:[], isMe:false, since:'', refs:{},
};

let chars = [];

// ── 儲存層（之後換成 API 只要改這兩個函式）
function load() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  if (Array.isArray(saved) && saved.length) {
    // 存過的名冊為準，但補上種子裡有、存檔漏掉的欄位（防呆：舊存檔不會弄壞畫面）
    chars = saved.map(c => Object.assign({}, BLANK, SEED.find(s => s.id === c.id) || {}, c));
    SEED.forEach(s => { if (!chars.some(c => c.id === s.id)) chars.push(Object.assign({}, BLANK, s)); });
  } else {
    chars = SEED.map(s => Object.assign({}, BLANK, s));
  }
  return chars;
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(chars)); return true; }
  catch (e) { return false; }
}

// ── 讀取
function all()      { return chars; }
function get(id)    { return chars.find(c => c.id === id) || null; }
function byName(n)  { return chars.find(c => c.name === n) || null; }
function me()       { return chars.find(c => c.isMe) || null; }

// 舊資料的 who/member 欄位存的是名字，這裡負責換成角色物件
function resolve(nameOrId) {
  return get(nameOrId) || byName(nameOrId);
}

// ── 修改
// 中文名字轉不出英數就用時間碼，總之要一個穩定不重複的 id
function newId(name) {
  const ascii = String(name || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const base = ascii || ('c' + Date.now().toString(36));
  let id = base, n = 2;
  while (chars.some(c => c.id === id)) id = base + (n++);
  return id;
}
function upsert(ch) {
  if (!ch.id) ch.id = newId(ch.name);
  const i = chars.findIndex(c => c.id === ch.id);
  const merged = Object.assign({}, BLANK, i >= 0 ? chars[i] : {}, ch);
  if (merged.isMe) chars.forEach(c => { if (c.id !== merged.id) c.isMe = false; });
  if (i >= 0) chars[i] = merged; else chars.push(merged);
  return merged;
}
function remove(id) {
  const i = chars.findIndex(c => c.id === id);
  if (i >= 0) chars.splice(i, 1);
  return i >= 0;
}

// ── 像素圖：spriteKey（動畫）→ 自畫 sprite → emoji
function spriteSvg(ch) {
  const frames = window.SPRITES && window.SPRITES[ch.spriteKey];
  if (frames && frames[0]) {
    return `<svg viewBox="0 0 16 28" preserveAspectRatio="xMidYMid meet" class="anim-spr"
      data-key="${ch.spriteKey}" style="width:100%;height:100%;image-rendering:pixelated;display:block;">${frames[0]}</svg>`;
  }
  if (ch.sprite && ch.sprite.rects) {
    const g = ch.sprite.grid || 16;
    return `<svg viewBox="0 0 ${g} ${g}" preserveAspectRatio="xMidYMid meet"
      style="width:100%;height:100%;image-rendering:pixelated;display:block;">${ch.sprite.rects}</svg>`;
  }
  return `<span class="ch-emoji">${ch.icon || '🙂'}</span>`;
}

// ── 待機動畫：8 FPS 換格，畫面上所有 .anim-spr 一起換
let ticker = null;
function startTicker() {
  if (ticker) return;
  let frame = 0;
  ticker = setInterval(() => {
    frame++;
    if (document.hidden) return;
    document.querySelectorAll('svg.anim-spr').forEach(el => {
      if (el.offsetParent === null) return;          // 藏起來的不用畫
      const frames = window.SPRITES && window.SPRITES[el.dataset.key];
      if (frames && frames.length) el.innerHTML = frames[frame % frames.length];
    });
  }, 125);
}

// ── 出場統計：各 app 自己提供資料來源，角色館只負責顯示
//    Roster.addStats(ch => ['3 趟旅程', '17 次腳印'])
const statFns = [];
function addStats(fn) { statFns.push(fn); }
function stats(ch) {
  const out = [];
  statFns.forEach(fn => {
    try { const r = fn(ch); if (r) out.push(...[].concat(r)); } catch (e) {}
  });
  return out;
}

// ── 匯出／匯入（接後端之前，這就是備份手段）
function exportJSON() { return JSON.stringify(chars, null, 2); }
function importJSON(text) {
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error('格式不對：應該是一個陣列');
  chars = data.map(c => Object.assign({}, BLANK, c));
  return chars;
}

load();

window.Roster = {
  all, get, byName, me, resolve,
  upsert, remove, save, load,
  spriteSvg, startTicker,
  addStats, stats,
  exportJSON, importJSON,
  BLANK, KEY,
};

})();
