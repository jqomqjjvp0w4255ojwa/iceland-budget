// ══════════════════════════════════════════════════════════
//  theme.js — 共用佈景主題模組（點線面系列頁面）
//  九款配色，六個 CSS 變數驅動：--space/--ink/--faint/--dotA/--dotB/--spark
//
//  用法：
//    <script src="../shared/theme.js"></script>
//    Theme.mount();                  // 自動建出右上角主題鈕＋色票，並套用上次選的
//    Theme.mount({ into: el });       // 指定容器（預設 document.body）
//    Theme.apply('C 苔原');           // 直接切換
//    Theme.get()                      // 目前主題名
//    Theme.list()                     // [{name, colors}, ...]
//
//  選擇記在 localStorage['book_theme']，全站共用同一把鑰匙，
//  所以在書桌切了主題，角色館打開就是同一款。
// ══════════════════════════════════════════════════════════
(function () {

const THEMES = {
  'A 大地':     { space:'#f7f1e6', ink:'#5b4a38', faint:'#b9ab94', dotA:'#cf9d7d', dotB:'#b3ad7e', spark:'#c97b3d' },
  'B 墨青':     { space:'#f4f3ee', ink:'#3f4b55', faint:'#a8b0b5', dotA:'#9fb3c0', dotB:'#b9bfa3', spark:'#c05a41' },
  'C 苔原':     { space:'#f3f0e2', ink:'#494a35', faint:'#adab8d', dotA:'#a9ad72', dotB:'#cbb289', spark:'#bf6b35' },
  'D 藍晒':     { space:'#f2f3f0', ink:'#2f4858', faint:'#9fb0b8', dotA:'#8fb0c4', dotB:'#b7c2ad', spark:'#d08c2e' },
  'E 燒陶':     { space:'#f9f1e5', ink:'#67402b', faint:'#c4a68d', dotA:'#d68f6a', dotB:'#d9c194', spark:'#a83b2c' },
  'F 石墨':     { space:'#f0eeea', ink:'#4c4a47', faint:'#b1aca3', dotA:'#b5aa9b', dotB:'#a8aaa2', spark:'#d29e3a' },
  'G 梅子抹茶': { space:'#f6f2ea', ink:'#4e4553', faint:'#b3a8ac', dotA:'#d8a0b0', dotB:'#a9bd8f', spark:'#c9a53c' },
  'H 鮭魚湖水': { space:'#f7f3ec', ink:'#46524e', faint:'#a3b0aa', dotA:'#e2a68f', dotB:'#93bfb2', spark:'#9a6b8f' },
  'I 藕紫芥末': { space:'#f4f1ea', ink:'#52493f', faint:'#b0a795', dotA:'#b9a3c4', dotB:'#cdb168', spark:'#bf5f4a' },
};
const KEY = 'book_theme';
const FALLBACK = 'A 大地';
let current = FALLBACK;

const CSS = `
.themer{position:absolute; right:clamp(18px,5vw,64px); top:clamp(20px,5vh,58px); z-index:9;
  display:flex; align-items:center; gap:9px; flex-direction:row-reverse;}
.themer .knob{width:30px; height:30px; border-radius:50%; border:1.5px solid var(--ink);
  background:none; cursor:pointer; display:grid; place-items:center; padding:0;}
.themer .knob i{display:block; width:10px; height:10px; border-radius:50%;
  background:radial-gradient(circle at 35% 35%, var(--spark) 0 45%, var(--ink) 46%);}
.themer .tray{display:none; gap:7px;}
.themer.open .tray{display:flex;}
.themer .sw{width:22px; height:22px; border-radius:50%; border:1.5px solid rgba(0,0,0,.25);
  cursor:pointer; padding:0;}
.themer .sw.on{outline:2px solid var(--ink); outline-offset:2px;}
`;

function apply(name) {
  const t = THEMES[name] || THEMES[FALLBACK];
  current = THEMES[name] ? name : FALLBACK;
  const r = document.documentElement.style;
  r.setProperty('--space', t.space); r.setProperty('--ink',   t.ink);
  r.setProperty('--faint', t.faint); r.setProperty('--dotA',  t.dotA);
  r.setProperty('--dotB',  t.dotB);  r.setProperty('--spark', t.spark);
  try { localStorage.setItem(KEY, current); } catch (e) {}
  document.querySelectorAll('.themer .sw').forEach(b =>
    b.classList.toggle('on', b.dataset.t === current));
}

function saved() {
  try { return localStorage.getItem(KEY); } catch (e) { return null; }
}

// 建出主題鈕。已經有 .themer 的頁面（book/）就沿用既有那顆，不重複長。
function mount(opts) {
  opts = opts || {};
  if (!document.getElementById('themeCSS')) {
    const s = document.createElement('style');
    s.id = 'themeCSS'; s.textContent = CSS;
    document.head.appendChild(s);
  }
  let box = document.querySelector('.themer');
  if (!box) {
    box = document.createElement('div');
    box.className = 'themer';
    box.innerHTML = `<button class="knob" title="佈景主題"><i></i></button><div class="tray"></div>`;
    box.querySelector('.knob').addEventListener('click', () => box.classList.toggle('open'));
    (opts.into || document.body).appendChild(box);
  }
  const tray = box.querySelector('.tray');
  if (tray) {
    tray.innerHTML = '';
    Object.entries(THEMES).forEach(([name, t]) => {
      const b = document.createElement('button');
      b.className = 'sw'; b.dataset.t = name; b.title = name;
      b.style.background = `linear-gradient(135deg, ${t.dotA} 0 48%, ${t.dotB} 52% 100%)`;
      b.addEventListener('click', () => apply(name));
      tray.appendChild(b);
    });
  }
  apply(opts.theme || saved() || FALLBACK);
}

window.Theme = {
  mount, apply,
  get:  () => current,
  list: () => Object.entries(THEMES).map(([name, colors]) => ({ name, colors })),
  colors: name => THEMES[name || current] || THEMES[FALLBACK],
  KEY, FALLBACK,
};

})();
