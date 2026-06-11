// config.js — 旅程設定檔
// ══════════════════════════════════════════════════════════
//  換新旅程時，只需修改這個檔案
//  其他邏輯檔案（render.js / sprites.js / app.js 等）不需改動
// ══════════════════════════════════════════════════════════

window.TRIP_CONFIG = {

  // ── 旅程基本資訊
  tripName:    '冰島 2026',
  tripNameShort: '冰島小帳',
  description: 'Iceland 2026 夏 · 旅遊計劃',
  cacheKey:    'cached_iceland_budget',

  // ── Google Apps Script API
  apiBase: 'https://script.google.com/macros/s/AKfycbwK9MlKsP_Xd2pjGxmtSRgHp3KzCfgAYSiY16Ua3kqbHTBvgvd5wUcOehjG-hoRfEc/exec',

  // ── Cloudflare R2 圖片上傳 Worker
  r2Worker: 'https://worker-little-field-805c.xfish7.workers.dev',

  // ── 腳印地圖（map.html）
  mapCenter: [64.9, -19],
  mapZoom:   6,

  // ── 成員設定
  // name:      用於比對 Google Sheet 欄位名稱（如「猴負擔」「花負擔」）
  // spriteKey: 對應 window.SPRITES 裡的 key（由 sprites.js 定義）
  // icon/color: 腳印地圖頭像與標記顏色
  members: [
    { name: '花', icon: '🌸', color: '#cc4488', spriteKey: 'FLOWER_FRAMES', sceneId: 'svgHana',   charId: 'pxHana',   bubbleId: 'bubbleHana'   },
    { name: '猴', icon: '🐒', color: '#c07020', spriteKey: 'MONKEY_FRAMES', sceneId: 'svgMonkey', charId: 'pxMonkey', bubbleId: 'bubbleMonkey' },
    { name: '寧', icon: '🐱', color: '#7755bb', spriteKey: 'NING_FRAMES',   sceneId: 'svgNing',   charId: 'pxNing',   bubbleId: 'bubbleNing'   },
  ],

  // ── 使用幣別
  currencies: ['ISK', 'EUR', 'USD'],

  // ── 預算上限（每人，台幣）
  budgetPerPerson: 100000,

  // ── 旅程日期（用於倒數計時，UTC+8）
  dates: {
    depart:     '2026-09-14T00:00:00+08:00',
    arrive:     '2026-09-15T00:00:00+00:00',
    returnNing: '2026-09-28T14:00:00+00:00',
    returnAll:  '2026-09-29T00:00:00+00:00',
    arriveTW:   '2026-09-30T00:00:00+08:00',
  },

};

// ── 方便其他模組取用的 shorthand
window.TRIP_MEMBERS = window.TRIP_CONFIG.members.map(m => m.name);