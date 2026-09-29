// render-perday.js — 帳簿的「每日」與「行前」
//
// 給不太熟財務的人看的版本：
// - 每日＝旅途中現場花的錢（一般開銷：吃、加油、停車、門票…），平均每天才有參考價值
// - 行前＝出發前就訂好的大錢（機票、保險、租車、住宿、預訂的活動、出發前買的東西）
// - 預設看「我的份」（可切換成員或全團；全團只算共同消費），付錢的人只當小標籤，不參與計算
// - 只顯示台幣，原幣小字附註
// - 疑似重複的記帳（同時間、同類別、同金額、同付款人）不計入，並標出來提醒去 Sheet 刪

const PERDAY_CATS = {
  fuel:    { icon:'⛽', label:'加油',   color:'#f0c040' },
  park:    { icon:'🅿', label:'停車',   color:'#4fc3f7' },
  ticket:  { icon:'🎫', label:'門票',   color:'#26c6da' },
  misc:    { icon:'🛒', label:'吃＆雜支', color:'#f06292' },
  flight:  { icon:'✈', label:'機票',   color:'#9aa5b1' },
  ins:     { icon:'🛡', label:'保險',   color:'#9aa5b1' },
  car:     { icon:'🚗', label:'租車',   color:'#9aa5b1' },
  stay:    { icon:'🏠', label:'住宿',   color:'#7c4dff' },
  act:     { icon:'🎯', label:'活動',   color:'#4caf6e' },
  pre:     { icon:'📦', label:'出發前購買', color:'#9aa5b1' },
};
const PERDAY_DAILY_ORDER = ['misc', 'fuel', 'park', 'ticket'];

function perdayCatOf(expCategory) {
  const c = String(expCategory || '');
  if (c === '加油') return 'fuel';
  if (c.startsWith('停車')) return 'park';
  if (c.startsWith('門票')) return 'ticket';
  return 'misc';
}

// 日期字串 → 'YYYY-MM-DD'。Sheet 回來的格式很雜：
// '2026-09-22 13:41'、'2026/9/17'、'9/15\n9/16'、'46282'（序號）都可能出現
function perdayKey(raw, fallbackYear) {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  const pad = n => String(n).padStart(2, '0');
  let m = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = s.match(/(\d{1,2})\/(\d{1,2})/);
  if (m) return `${fallbackYear}-${pad(m[1])}-${pad(m[2])}`;
  const serial = parseFloat(s);
  if (isFinite(serial) && serial > 40000 && serial < 60000) {
    const d = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  return '';
}
function perdayTime(raw) {
  const m = String(raw ?? '').match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
}
function perdayAddDays(key, n) {
  const [y, mo, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, mo - 1, d + n));
  return t.toISOString().slice(0, 10);
}
function perdayLocalToday() {
  const n = new Date();
  const pad = x => String(x).padStart(2, '0');
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}

// ── 整理資料：旅途中每一天（一般開銷）＋行前清單
function perdayModel(d, who) {
  const members = window.TRIP_MEMBERS || ['花', '猴', '寧'];
  const all = who === 'all';
  const n = members.length || 3;
  const share = full => all ? full : full / n;
  const cfgDates = window.TRIP_CONFIG?.dates || {};
  const tripStart = perdayKey(cfgDates.arrive, 2026) || '2026-09-15';
  const tripEnd   = perdayKey(cfgDates.returnAll, 2026) || '2026-09-29';
  const year = Number(tripStart.slice(0, 4)) || 2026;

  const items = [];
  const prep = [];   // { cat, name, sub, amt, payer }

  // 一般開銷
  const seen = new Set();
  let dupCount = 0;
  (d.expenses || []).forEach(e => {
    const full = e.total || e.twd || 0;
    const amt = all ? (e.isShared ? full : 0) : (e.burden?.[who] || 0);
    const sig = [e.date, e.category, e.amount, e.currency, e.payer].join('|');
    const dup = seen.has(sig);
    seen.add(sig);
    if (dup) dupCount++;
    if (!amt && !dup) return;
    const key = perdayKey(e.date, year);
    const it = {
      key, time: perdayTime(e.date), cat: perdayCatOf(e.category),
      name: e.title || e.location || e.category || '開銷',
      sub: [e.location && e.title ? e.location : '',
            e.currency && e.currency !== 'NT' && e.amount ? `${Number(e.amount).toLocaleString()} ${e.currency}` : '']
        .filter(Boolean).join(' · '),
      amt, payer: e.payer, dup,
    };
    if (!key || key < tripStart) { if (!dup) prep.push({ ...it, cat: 'pre' }); return; }
    items.push(it);
  });

  // 行前：機票、保險、租車、住宿、活動
  const flightsBy = {};
  (d.flights || []).forEach(f => { flightsBy[f.person] = (flightsBy[f.person] || 0) + (f.totalTWD || 0); });
  const flightAmt = all ? Object.values(flightsBy).reduce((s, v) => s + v, 0) : (flightsBy[who] || 0);
  if (flightAmt) prep.push({ cat: 'flight', name: '機票', amt: flightAmt });
  (d.insurancePremiums || []).filter(p => all || p.member === who)
    .forEach(p => prep.push({ cat: 'ins', name: all ? `${p.member} 的旅平險` : '旅平險', amt: p.twd || 0, payer: p.payer }));
  const carFull = d.car?.totalTWD || 0;
  if (carFull) prep.push({ cat: 'car', name: d.car?.company || '租車', sub: d.car?.model || '', amt: share(carFull), payer: d.car?.payer });
  (d.accommodation || []).forEach(a => {
    const full = (a.twd || 0) + (a.foreignFee || 0);
    if (!full) return;
    const k = perdayKey(a.date, year);
    const nights = Math.max(1, a.nights || 1);
    prep.push({ cat: 'stay', name: String(a.name || '').split('\n')[0].trim(),
      sub: [k ? `${Number(k.slice(5, 7))}/${Number(k.slice(8))}` : '', nights > 1 ? `${nights} 晚` : ''].filter(Boolean).join(' · '),
      amt: share(full), payer: a.payer, key: k });
  });
  (d.activity || []).forEach(a => {
    const full = (a.twd || 0) + (a.foreignFee || 0);
    if (!full) return;
    const k = perdayKey(a.date, year);
    prep.push({ cat: 'act', name: String(a.name || '').split(/[：:]/)[0].trim() || '活動',
      sub: k ? `${Number(k.slice(5, 7))}/${Number(k.slice(8))}` : '', amt: share(full), payer: a.payer, key: k });
  });

  // 旅程每一天都要有一格（沒花錢的日子也看得到）
  const days = new Map();
  for (let k = tripStart; k <= tripEnd; k = perdayAddDays(k, 1)) days.set(k, []);
  items.forEach(it => { if (!days.has(it.key)) days.set(it.key, []); days.get(it.key).push(it); });
  const sortedDays = [...days.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1).map(([key, list]) => {
    list.sort((a, b) => (a.time || '99') < (b.time || '99') ? -1 : 1);
    const counted = list.filter(x => !x.dup);
    const byCat = {};
    counted.forEach(x => { byCat[x.cat] = (byCat[x.cat] || 0) + x.amt; });
    return { key, list, total: counted.reduce((s, x) => s + x.amt, 0), byCat };
  });

  const prepTotal = prep.reduce((s, x) => s + x.amt, 0);
  return { days: sortedDays, prep, prepTotal, dupCount, tripStart, tripEnd };
}

// ── 狀態
window._perdayWho = (() => { try { return localStorage.getItem('perday_who') || '猴'; } catch (e) { return '猴'; } })();
window._perdaySel = null;          // 每日分析選中的那天
window._perdayOpen = new Set();    // 每日清單展開的日子

const perdayNT = v => 'NT$ ' + Math.round(v).toLocaleString('zh-TW');
function perdayDateLabel(key) {
  const [y, mo, dd] = key.split('-').map(Number);
  return `${mo}/${dd}（${'日一二三四五六'[new Date(y, mo - 1, dd).getDay()]}）`;
}

function perdayParts(d) {
  const who = window._perdayWho || '猴';
  const m = perdayModel(d, who);
  const today = perdayLocalToday();
  const members = window.TRIP_MEMBERS || ['花', '猴', '寧'];
  const payerName = raw => members.find(x => String(raw || '').includes(x)) || String(raw || '');

  if (!window._perdaySel || !m.days.some(x => x.key === window._perdaySel)) {
    const hasToday = m.days.find(x => x.key === today);
    const lastSpent = [...m.days].reverse().find(x => x.total > 0);
    window._perdaySel = (hasToday || lastSpent || m.days[0] || {}).key;
  }

  const whoChips = [...members, 'all'].map(k => `
    <button onclick="perdaySetWho('${k}');event.stopPropagation();"
      style="border:1.5px solid ${k === who ? 'var(--accent)' : 'var(--border)'};background:${k === who ? 'rgba(79,195,247,.15)' : 'transparent'};
             color:${k === who ? 'var(--accent)' : 'var(--muted)'};border-radius:99px;padding:3px 11px;font-size:.72rem;cursor:pointer;
             display:inline-flex;align-items:center;gap:3px;">
      ${k === 'all' ? '👥 全團' : `${avatarSvg(k)} ${k}`}
    </button>`).join('');

  const row = it => {
    const c = PERDAY_CATS[it.cat] || PERDAY_CATS.misc;
    const pn = payerName(it.payer);
    const payerTag = it.payer && who !== 'all'
      ? `<span style="font-size:.58rem;color:var(--muted);border:1px solid var(--border);border-radius:4px;padding:0 5px;white-space:nowrap;">${pn === who ? '我付' : esc(pn) + '付'}</span>` : '';
    return `
      <div style="display:flex;align-items:center;gap:8px;padding:8px 2px;border-bottom:1px solid var(--border);${it.dup ? 'opacity:.45;' : ''}">
        <span style="width:22px;text-align:center;flex-shrink:0;">${c.icon}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:.8rem;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${esc(it.name)}${it.dup ? ' <span style="font-size:.6rem;color:#ffb74d;">⚠ 疑似重複，未計入</span>' : ''}
          </div>
          ${(it.time || it.sub) ? `<div style="font-size:.6rem;color:var(--muted);">${[it.time, esc(it.sub || '')].filter(Boolean).join(' · ')}</div>` : ''}
        </div>
        ${payerTag}
        <span style="font-family:'Cinzel',serif;font-size:.85rem;color:var(--gold);white-space:nowrap;${it.dup ? 'text-decoration:line-through;' : ''}">${perdayNT(it.amt)}</span>
      </div>`;
  };
  const dupNotice = m.dupCount ? `<div style="font-size:.68rem;color:#ffb74d;background:rgba(255,152,0,.08);border:1px solid rgba(255,152,0,.35);border-radius:8px;padding:6px 10px;margin-bottom:10px;">
      ⚠ 有 ${m.dupCount} 筆疑似重複的記帳沒有算進來（同時間、同金額、同付款人）。確認是重複的話，到 Google Sheet 把多的那列刪掉。</div>` : '';
  return { who, m, today, members, whoChips, row, dupNotice };
}

// ── 圓餅區第二頁：每日分析（點長條就在原地顯示那天的總額）
function renderPerDayChart(d) {
  const { who, m, today, members, whoChips } = perdayParts(d);
  const past = m.days.filter(x => x.key <= today);
  const soFar = (past.length ? past : m.days).reduce((s, x) => s + x.total, 0);
  const daysElapsed = Math.max(1, past.length || m.days.filter(x => x.total > 0).length);
  const todayTotal = m.days.find(x => x.key === today)?.total || 0;
  const budget = (d.budgetPerPerson || 100000) * (who === 'all' ? members.length : 1);
  const left = budget - soFar - m.prepTotal;

  const stat = (label, val, hint = '') => `
    <div style="flex:1;min-width:0;background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:6px 9px;">
      <div style="font-size:.6rem;color:var(--muted);">${label}</div>
      <div style="font-family:'Cinzel',serif;font-size:.9rem;color:var(--gold);white-space:nowrap;">${val}</div>
      ${hint ? `<div style="font-size:.56rem;color:var(--muted);">${hint}</div>` : ''}
    </div>`;

  const catTotal = {};
  PERDAY_DAILY_ORDER.forEach(c => { catTotal[c] = m.days.reduce((t, x) => t + (x.byCat[c] || 0), 0); });
  const maxDay = Math.max(1, ...m.days.map(x => x.total));
  const bars = m.days.map(x => {
    const dd = Number(x.key.split('-')[2]);
    const isSel = x.key === window._perdaySel;
    const isToday = x.key === today;
    const segs = PERDAY_DAILY_ORDER.filter(c => x.byCat[c]).map(c =>
      `<div style="height:${(x.byCat[c] / maxDay * 100).toFixed(1)}%;background:${PERDAY_CATS[c].color};"></div>`).join('');
    return `
      <button onclick="perdaySelect('${x.key}');event.stopPropagation();"
        style="flex:1;min-width:14px;background:none;border:none;padding:0;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;">
        <div style="width:100%;height:76px;display:flex;flex-direction:column-reverse;border-radius:3px;overflow:hidden;
                    background:${isSel ? 'rgba(79,195,247,.12)' : 'transparent'};outline:${isSel ? '1.5px solid var(--accent)' : 'none'};">
          ${segs}
        </div>
        <div style="font-size:.55rem;color:${isSel ? 'var(--accent)' : isToday ? 'var(--gold)' : 'var(--muted)'};">${dd}</div>
      </button>`;
  }).join('');

  const sel = m.days.find(x => x.key === window._perdaySel);
  const selBox = sel ? `
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:8px 10px;margin-top:8px;">
      <div style="display:flex;align-items:baseline;justify-content:space-between;">
        <span style="font-size:.8rem;color:var(--text);font-weight:600;">${perdayDateLabel(sel.key)}</span>
        <span style="font-family:'Cinzel',serif;font-size:1rem;color:var(--gold);">${perdayNT(sel.total)}</span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:4px 10px;margin-top:4px;">
        ${PERDAY_DAILY_ORDER.filter(c => sel.byCat[c]).map(c => `
          <span style="font-size:.66rem;color:var(--muted);display:inline-flex;align-items:center;gap:3px;">
            <span style="width:7px;height:7px;border-radius:2px;background:${PERDAY_CATS[c].color};"></span>
            ${PERDAY_CATS[c].label} ${perdayNT(sel.byCat[c])}</span>`).join('') || '<span style="font-size:.66rem;color:var(--muted);">這天沒有花錢</span>'}
      </div>
      ${sel.list.length ? `<button onclick="perdayJump('${sel.key}');event.stopPropagation();"
        style="margin-top:6px;background:none;border:none;color:var(--accent);font-size:.68rem;cursor:pointer;padding:0;">看明細 ›</button>` : ''}
    </div>` : '';

  return `
    <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px;">${whoChips}</div>
    <div style="display:flex;gap:5px;margin-bottom:5px;">
      ${stat('今天', perdayNT(todayTotal))}
      ${stat('旅途中到目前', perdayNT(soFar), `第 ${daysElapsed} 天`)}
    </div>
    <div style="display:flex;gap:5px;margin-bottom:8px;">
      ${stat('平均每天', perdayNT(soFar / daysElapsed))}
      ${stat('預算還剩', `<span style="color:${left < 0 ? 'var(--red)' : 'var(--gold)'}">${perdayNT(left)}</span>`, `已扣行前 ${perdayNT(m.prepTotal)}`)}
    </div>
    <div style="display:flex;gap:3px;align-items:flex-end;">${bars}</div>
    <div style="font-size:.58rem;color:var(--muted);margin:8px 0 3px;">整趟旅途合計（${who === 'all' ? '全團共同' : who + ' 的份'}）</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 10px;">
      ${PERDAY_DAILY_ORDER.map(c => `<div style="display:flex;align-items:center;gap:4px;font-size:.68rem;color:var(--muted);">
        <span style="width:8px;height:8px;border-radius:2px;flex-shrink:0;background:${PERDAY_CATS[c].color};"></span>${PERDAY_CATS[c].label}
        <span style="margin-left:auto;font-family:'Cinzel',serif;color:var(--gold);">${perdayNT(catTotal[c])}</span></div>`).join('')}
    </div>
    ${selBox}`;
}

// ── 「每日」分頁：每天一行，點開才看明細
function renderAllList(d) {
  const { who, m, today, whoChips, row, dupNotice } = perdayParts(d);
  const maxDay = Math.max(1, ...m.days.map(x => x.total));
  const rows = m.days.filter(x => x.key <= today || x.total > 0).map(x => {
    const open = window._perdayOpen.has(x.key);
    const isToday = x.key === today;
    return `
      <div id="allDay-${x.key}" style="border-bottom:1px solid var(--border);scroll-margin-top:60px;">
        <button onclick="perdayToggle('${x.key}')"
          style="width:100%;display:flex;align-items:center;gap:10px;padding:10px 4px;background:none;border:none;cursor:pointer;text-align:left;">
          <span style="width:74px;flex-shrink:0;font-size:.8rem;color:${isToday ? 'var(--gold)' : 'var(--text)'};">${perdayDateLabel(x.key)}</span>
          <span style="flex:1;height:6px;background:var(--bg3);border-radius:3px;overflow:hidden;">
            <span style="display:block;height:100%;width:${(x.total / maxDay * 100).toFixed(1)}%;background:var(--accent);opacity:.7;"></span>
          </span>
          <span style="width:92px;text-align:right;font-family:'Cinzel',serif;font-size:.85rem;color:${x.total ? 'var(--gold)' : 'var(--muted)'};">${x.total ? perdayNT(x.total) : '—'}</span>
          <span style="width:12px;font-size:.65rem;color:var(--muted);">${x.list.length ? (open ? '▾' : '▸') : ''}</span>
        </button>
        ${open && x.list.length ? `<div style="padding:0 4px 8px 12px;">${x.list.map(row).join('')}</div>` : ''}
      </div>`;
  }).join('');
  const past = m.days.filter(x => x.key <= today);
  const soFar = (past.length ? past : m.days).reduce((s, x) => s + x.total, 0);
  return `
    <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;">${whoChips}</div>
    ${dupNotice}
    <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:.72rem;color:var(--muted);margin-bottom:2px;">
      <span>旅途中現場花的錢（${who === 'all' ? '全團共同消費' : '我的份'}）· 點一天看明細</span>
      <span style="font-family:'Cinzel',serif;font-size:.85rem;color:var(--gold);">${perdayNT(soFar)}</span>
    </div>
    <div class="card" style="padding:2px 10px;">${rows || '<div class="empty">還沒有花費紀錄</div>'}</div>`;
}

// ── 「行前」分頁：出發前就訂好的大錢
function renderPrepList(d) {
  const { who, m, whoChips, row } = perdayParts(d);
  const groups = ['flight', 'ins', 'car', 'stay', 'act', 'pre'];
  const blocks = groups.map(g => {
    const list = m.prep.filter(x => x.cat === g);
    if (!list.length) return '';
    if (g === 'stay' || g === 'act') list.sort((a, b) => (a.key || '') < (b.key || '') ? -1 : 1);
    const sum = list.reduce((s, x) => s + x.amt, 0);
    return `
      <div class="card" style="padding:8px 12px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;">
          <span style="font-size:.85rem;color:var(--text);font-weight:600;">${PERDAY_CATS[g].icon} ${PERDAY_CATS[g].label}</span>
          <span style="font-family:'Cinzel',serif;font-size:.9rem;color:var(--gold);">${perdayNT(sum)}</span>
        </div>
        ${list.length > 1 || g === 'stay' || g === 'act' ? list.map(row).join('') : ''}
      </div>`;
  }).join('');
  return `
    <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;">${whoChips}</div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:.72rem;color:var(--muted);margin-bottom:6px;">
      <span>出發前就訂好的錢（${who === 'all' ? '全團' : '我的份'}），不算進每日</span>
      <span style="font-family:'Cinzel',serif;font-size:.95rem;color:var(--gold);">${perdayNT(m.prepTotal)}</span>
    </div>
    ${blocks}`;
}

window.perdaySetWho = function(k) {
  window._perdayWho = k;
  try { localStorage.setItem('perday_who', k); } catch (e) {}
  perdayRefresh();
};
window.perdaySelect = function(key) {
  window._perdaySel = key;
  perdayRefresh();
};
window.perdayToggle = function(key) {
  window._perdayOpen.has(key) ? window._perdayOpen.delete(key) : window._perdayOpen.add(key);
  const el = document.getElementById('allContent');
  if (el) el.innerHTML = renderAllList(window.APP_DATA || window.STATIC);
};
// 「看明細」：切到每日分頁、展開那天、捲過去
window.perdayJump = function(key) {
  window._perdaySel = key;
  window._perdayOpen.add(key);
  perdayRefresh();
  const btn = document.querySelector(`.tab[onclick^="showTab('all'"]`);
  if (btn) showTab('all', btn);
  requestAnimationFrame(() => document.getElementById('allDay-' + key)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
};
function perdayRefresh() {
  const d = window.APP_DATA || window.STATIC;
  const chart = document.getElementById('perdayChart');
  if (chart) chart.innerHTML = renderPerDayChart(d);
  const list = document.getElementById('allContent');
  if (list) list.innerHTML = renderAllList(d);
  const prep = document.getElementById('prepContent');
  if (prep) prep.innerHTML = renderPrepList(d);
  window.ovFitHeight?.();
}

// ── 圓餅區左右滑：兩頁＋可點的圓點，容器高度跟著目前那頁
window.ovCurrent = function() {
  const sw = document.getElementById('ovSwipe');
  return sw ? Math.round(sw.scrollLeft / Math.max(1, sw.clientWidth)) : 0;
};
window.ovGo = function(i) {
  const sw = document.getElementById('ovSwipe');
  if (sw) sw.scrollTo({ left: i * sw.clientWidth, behavior: 'smooth' });
};
window.ovFitHeight = function() {
  const sw = document.getElementById('ovSwipe');
  if (!sw) return;
  const i = window.ovCurrent();
  const panel = sw.children[i];
  if (panel) sw.style.height = panel.scrollHeight + 'px';
  document.querySelectorAll('#ovDots .ov-dot').forEach((dot, j) => {
    dot.style.background = j === i ? 'var(--accent)' : 'var(--border)';
    dot.style.width = j === i ? '18px' : '7px';
  });
};
let _ovTimer = null;
window.ovOnScroll = function() {
  clearTimeout(_ovTimer);
  _ovTimer = setTimeout(window.ovFitHeight, 80);
};
