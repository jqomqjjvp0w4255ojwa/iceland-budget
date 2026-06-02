# 🇮🇸 冰島預算清單

手機友善的旅遊預算查詢 App，支援離線存取（PWA）。

## 功能
- 📱 手機優先設計，可安裝到桌面
- 📵 離線也能查詢（Service Worker 快取）
- 💱 即時匯率顯示
- ✅ 付款狀態追蹤
- 🔍 篩選已付款 / 未付款項目

---

## 🚀 部署步驟

### 1. 上傳到 GitHub
```bash
git init
git add .
git commit -m "init: 冰島預算清單"
git remote add origin https://github.com/你的帳號/iceland-budget.git
git push -u origin main
```

### 2. 部署到 Netlify
1. 登入 [netlify.com](https://netlify.com)
2. 點「Add new site」→「Import an existing project」
3. 選 GitHub → 選你的 repo
4. Build command：留空
5. Publish directory：`.`（根目錄）
6. 點「Deploy site」

部署完成後會得到類似 `https://your-site.netlify.app` 的網址。

### 3. 設定 Google Sheets 自動同步

#### 3a. 發布試算表為 CSV
1. 打開 Google Sheets
2. 檔案 → 共用 → **發布到網路**
3. 選擇各分頁（住宿、租車等）→ 格式選 **逗號分隔值 (.csv)**
4. 點「發布」→ 複製 CSV 網址

#### 3b. 更新 index.html 裡的 CSV_URL
```javascript
const CSV_URL = '你的 Google Sheets CSV 網址';
```

---

## 📵 離線使用方式

**第一次使用**（需要網路）：
1. 用手機瀏覽器開啟網址
2. iOS Safari：點「分享」→「加入主畫面」
3. Android Chrome：點「新增到主畫面」

之後即使沒網路，也能從桌面圖示開啟查詢！

---

## 📂 檔案結構
```
iceland-budget/
├── index.html      # 主頁面
├── sw.js           # Service Worker（離線快取）
├── manifest.json   # PWA 設定
├── netlify.toml    # Netlify 設定
└── README.md       # 說明文件
```
