// ══════════════════════════════════════════════════════════
//  util.js — 幾個到處都要用的小函式
//  沒有相依，先載這支再載其他 shared 模組都可以。
// ══════════════════════════════════════════════════════════
(function () {

// 塞進 innerHTML 前一律過這個，資料是使用者打的字
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
  c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

// 05/18 這種短日期；壞掉的日期回空字串而不是 NaN
const fmtMD = iso => {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0');
};

// localStorage 在無痕模式或空間滿的時候會丟例外，包起來
const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  },
};

window.U = { esc, fmtMD, store };

})();
