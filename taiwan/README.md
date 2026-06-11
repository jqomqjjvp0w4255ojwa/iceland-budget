# 台灣腳印日記（世界旅人帳 · 台灣版）

紀錄 > 規劃。地圖日記是主頁、帳簿是配角。
核心概念：**小旅程（trip）**——每筆打卡／帳目可選擇掛在某個 trip 下（出遊用），
不掛就是日常紀錄（例如聚餐打卡不記帳）。

## 檔案

| 檔案 | 說明 |
|---|---|
| `index.html` | 主頁：腳印地圖＋打卡（含像素畫板）＋想去清單＋小旅程管理 |
| `stats.html` | 被動式統計：縣市踩點染色（像素台灣）＋足跡時間軸＋旅程回顧 |
| `config.js` | 設定檔（成員、GAS 網址、地圖視角）。每個欄位前端都有預設值，缺欄位不會壞版 |
| `sprites.js` | 成員像素圖（用 `spritetool.html` 生成程式碼貼入；沒綁定就用 emoji 備援） |
| `spritetool.html` | 成員綁定工具（複製自冰島版，生成 sprites.js / config.js 程式碼） |
| `gas_taiwan.js` | Google Apps Script 後端（貼到 Apps Script 部署） |
| `manifest.json` / `sw.js` | PWA（快取名 `taiwan-diary-*`，與冰島版分開） |

## 部署步驟

1. 開一個**空白 Google 試算表** → 擴充功能 → Apps Script
2. 貼上 `gas_taiwan.js` 全部內容 → 部署 → 網頁應用程式（執行身分：我；存取權：任何人）
3. 把 `/exec` 網址填入 `config.js` 的 `apiBase`
4. 工作表（寫入_腳印／寫入_旅程／寫入_帳目）會在第一次讀寫時**自動建立並寫入標題列**，不用手動建表

圖片上傳沿用 Cloudflare R2 Worker（POST FormData `file` → `{ok:true, url}`），不需改 worker。

## 第二階段（帳簿）

GAS 的 `寫入_帳目` 表與 add/edit/deleteExpense action 已就緒
（帳目可掛 tripId；住宿／交通／保險等用「類別」區分，不做規劃頁面）。
前端帳簿頁待第二階段製作。
