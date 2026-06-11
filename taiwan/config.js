// config.js — 台灣版設定檔（世界旅人帳 · 台灣）
// ══════════════════════════════════════════════════════════
//  ⚠ 防呆設計：每個頁面讀取設定時都有逐欄位預設值，
//  這裡缺欄位不會讓地圖空白或頭像壞掉（冰島版的坑）。
//  部署 GAS 後，把 /exec 網址填入 apiBase 即可。
// ══════════════════════════════════════════════════════════

window.TW_CONFIG = {

  // ── 基本資訊
  appName:      '台灣腳印日記',
  appNameShort: '台灣腳印',
  description:  'Taiwan · 日常與小旅程的腳印地圖',
  cacheKey:     'cached_taiwan_diary',

  // ── Google Apps Script API（部署 gas_taiwan.js 後填入 /exec 網址）
  apiBase: '',

  // ── Cloudflare R2 圖片上傳 Worker（與冰島版共用）
  r2Worker: 'https://worker-little-field-805c.xfish7.workers.dev',

  // ── 地圖預設視角（台灣全島）
  mapCenter: [23.7, 121.0],
  mapZoom:   8,

  // ── 成員設定（用 spritetool.html 綁定後，把生成的程式碼貼到這裡與 sprites.js）
  // name:      顯示名稱，也寫入 Google Sheet
  // spriteKey: 對應 window.SPRITES 的 key（sprites.js 定義；沒有就用 emoji icon）
  // iconKey:   spritetool 的單格 icon（打卡記號用，可省略）
  // icon/color: emoji 備援與代表色
  members: [
    { name: '花', icon: '🌸', color: '#f4538a', spriteKey: 'FLOWER_FRAMES' },
    { name: '猴', icon: '🐒', color: '#ff9f1c', spriteKey: 'MONKEY_FRAMES' },
    { name: '寧', icon: '🐱', color: '#9b5de5', spriteKey: 'NING_FRAMES' },
  ],

  // ── 帳簿（第二階段）：幣別與花銷類別
  currencies: ['TWD'],
  expenseCategories: ['餐飲', '交通', '住宿', '票券', '購物', '保險', '其他'],

};

// ── shorthand
window.TW_MEMBERS = (window.TW_CONFIG.members || []).map(m => m.name);
