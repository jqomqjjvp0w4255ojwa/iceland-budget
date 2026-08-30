# 旅程書 · 設計稿

下一個專案（統一旅遊帳）的視覺設計，五個畫面。**這些不是網站程式碼**，
是給人看的設計稿；實際要蓋的東西見 `../NEXT_PROJECT.md`。

線上版（可縮放、可匯出 PNG/PDF）：
https://claude.ai/code/artifact/0f33bff0-4ab0-48d8-a34b-68693bab013f

## 檔案

| 檔案 | 畫面 |
|---|---|
| `Main.dc.html` | 首頁 · 書桌（紙＋兩本書）|
| `WorldMap.dc.html` | 出國旅行 · 世界地圖 |
| `Island.dc.html` | 島內手札 · 台灣地圖 |
| `TripPage.dc.html` | 冰島 2026 · 旅程內頁 |
| `Phone.dc.html` | 旅途中 · 手機 |
| `canvas.json` | 畫布排版（位置、便利貼）|
| `trip-book.html` | 打包後的檔案，用瀏覽器開就能看 |

## 設計依據

色票與字體**直接沿用現有 App**（`iceland/index.html` 的自調水泥灰）：

```
--bg:#424c5a  --card:#3b4756  --bg3:#2c3238  --border:#34384a
--accent:#7fd8ff  --gold:#ffc70f  --green:#99ff8b  --red:#df7687
--text:#ffffff  --muted:#d1d1d3
```

字體：Silkscreen（HUD／數字）、Noto Serif TC（中文標題）、Noto Sans TC（內文）。
Game Boy 綠對話框沿用原本 `px-modal` 的 `#e8f0d0` / `#2a4a1a`。

遊戲感不是另外加的，是把 App 裡本來就有的東西放大：像素小人、預算條、
`▶` 對話框、`[ 方括號 ]` 按鈕。

## 要改設計稿

改 `.dc.html` 後重新打包（`design` skill 的 seed-canvas.mjs），
不要直接編輯 `trip-book.html`。
