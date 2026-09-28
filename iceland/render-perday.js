// render-perday.js — 帳簿「📅 每日」分頁：每天花多少＋所有類型混在一起的明細
//
// 給不太熟財務的人看的版本，只回答三件事：今天花多少、到目前花多少、錢花去哪。
// - 預設看「我的份」（可切換成員或全團），付錢的人只當小標籤，不參與計算
// - 只顯示台幣，原幣小字附註
// - 已經付掉的錢算在「用掉的那天」：住宿按入住的每一晚拆、活動算活動當天；
//   機票、保險、租車和出發前的消費不攤進每一天，獨立成「出發前固定成本」
// - 疑似重複的記帳（同時間、同類別、同金額、同付款人）不計入，並標出來提醒去 Sheet 刪

const PERDAY_CATS = {
  stay:    { icon:'🏠', label:'住宿',   color:'#7c4dff' },
  act:     { icon:'🎯', label:'活動',   color:'#4caf6e' },
  fuel:    { icon:'⛽', label:'加油',   color:'#f0c040' },
  park:    { icon:'🅿', label:'停車',   color:'#4fc3f7' },
  ticket:  { icon:'🎫', label:'門票',   color:'#26c6da' },
  misc:    { icon:'🛒', label:'吃＆雜支', color:'#f06292' },
  fixed:   { icon:'📌', label:'出發前', color:'#9aa5b1' },
};

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

// ── 把所有資料整理成「每一天的明細」
function perdayModel(d, who) {
  const members = window.TRIP_MEMBERS || ['花', '猴', '寧'];
  const all = who === 'all';
  const n = members.length || 3;
  const share = full => all ? full : full / n;   // 大家均分的項目
  const cfgDates = window.TRIP_CONFIG?.dates || {};
  const tripStart = perdayKey(cfgDates.arrive, 2026) || '2026-09-15';
  const tripEnd   = perdayKey(cfgDates.returnAll, 2026) || '2026-09-29';
  const year = Number(tripStart.slice(0, 4)) || 2026;

  const items = [];   // { key, time, cat, name, sub, amt, payer, dup }
  const fixed = [];

  // 住宿：入住那晚起，按晚數拆
  (d.accommodation || []).forEach(a => {
    const full = (a.twd || 0) + (a.foreignFee || 0);
    if (!full) return;
    const start = perdayKey(a.date, year);
    const nights = Math.max(1, a.nights || 1);
    const name = String(a.name || '').split('\n')[0].trim();
    if (!start) { fixed.push({ cat:'stay', name, amt: share(full), payer: a.payer }); return; }
    for (let i = 0; i < nights; i++) {
      items.push({ key: perdayAddDays(start, i), time: '', cat: 'stay',
        name, sub: nights > 1 ? `第 ${i + 1}/${nights} 晚` : '',
        amt: share(full) / nights, payer: a.payer });
    }
  });

  // 活動：算在活動當天
  (d.activity || []).forEach(a => {
    const full = (a.twd || 0) + (a.foreignFee || 0);
    if (!full) return;
    const key = perdayKey(a.date, year);
    const name = String(a.name || '').split(/[：:]/)[0].trim() || '活動';
    const it = { key, time: '', cat: 'act', name, amt: share(full), payer: a.payer };
    key ? items.push(it) : fixed.push(it);
  });

  // 一般開銷：用實際負擔欄（burden），疑似重複的不計入
  const seen = new Set();
  let dupCount = 0;
  (d.expenses || []).forEach(e => {
    const full = e.total || e.twd || 0;
    const amt = all ? full : (e.burden?.[who] || 0);
    const sig = [e.date, e.category, e.amount, e.currency, e.payer].join('|');
    const dup = seen.has(sig);
    seen.add(sig);
    if (dup) dupCount++;
    if (!amt && !dup) return;
    const key = perdayKey(e.date, year);
    const it = {
      key, time: perdayTime(e.date), cat: perdayCatOf(e.category),
      name: e.title || e.location || e.category || '開銷',
      sub: [e.location && e.title ? e.location : '', e.currency && e.currency !== 'NT' && e.amount ? `${Number(e.amount).toLocaleString()} ${e.currency}` : '']
        .filter(Boolean).join(' · '),
      amt, payer: e.payer, dup,
    };
    // 出發前的消費（eSIM 之類）歸到固定成本
    if (!key || key < tripStart) { if (!dup) fixed.push({ ...it, cat: 'fixed' }); return; }
    items.push(it);
  });

  // 出發前固定成本：機票、保險、租車
  const flightsBy = {};
  (d.flights || []).forEach(f => { flightsBy[f.person] = (flightsBy[f.person] || 0) + (f.totalTWD || 0); });
  const flightAmt = all ? Object.values(flightsBy).reduce((s, v) => s + v, 0) : (flightsBy[who] || 0);
  if (flightAmt) fixed.push({ cat: 'fixed', name: '✈ 機票', amt: flightAmt });
  const insAmt = (d.insurancePremiums || [])
    .filter(p => all || p.member === who).reduce((s, p) => s + (p.twd || 0), 0);
  if (insAmt) fixed.push({ cat: 'fixed', name: '🛡 保險', amt: insAmt });
  const carFull = d.car?.totalTWD || 0;
  if (carFull) fixed.push({ cat: 'fixed', name: '🚗 租車', amt: share(carFull), payer: d.car?.payer });

  // 按天分組；旅程每一天都要有一格（沒花錢的日子也看得到）
  const days = new Map();
  for (let k = tripStart; k <= tripEnd; k = perdayAddDays(k, 1)) days.set(k, []);
  items.forEach(it => {
    if (!days.has(it.key)) days.set(it.key, []);
    days.get(it.key).push(it);
  });
  const sortedDays = [...days.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1).map(([key, list]) => {
    list.sort((a, b) => (a.time || '99') < (b.time || '99') ? -1 : 1);
    const counted = list.filter(x => !x.dup);
    const byCat = {};
    counted.forEach(x => { byCat[x.cat] = (byCat[x.cat] || 0) + x.amt; });
    return { key, list, total: counted.reduce((s, x) => s + x.amt, 0), byCat };
  });

  const fixedTotal = fixed.reduce((s, x) => s + x.amt, 0);
  return { days: sortedDays, fixed, fixedTotal, dupCount, tripStart, tripEnd };
}

// ── 畫面
window._perdayWho = (() => { try { return localStorage.getItem('perday_who') || '猴'; } catch (e) { return '猴'; } })();
window._perdaySel = null;

// ── 共用：畫面上會用到的小元件
function perdayParts(d) {
  const who = window._perdayWho || '猴';
  const m = perdayModel(d, who);
  const today = perdayLocalToday();
  const members = window.TRIP_MEMBERS || ['花', '猴', '寧'];
  const nt = v => 'NT$ ' + Math.round(v).toLocaleString('zh-TW');
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
        <span style="font-family:'Cinzel',serif;font-size:.85rem;color:var(--gold);white-space:nowrap;${it.dup ? 'text-decoration:line-through;' : ''}">${nt(it.amt)}</span>
      </div>`;
  };
  return { who, m, today, members, nt, whoChips, row };
}

// ── 圓餅那一區往左滑的第二頁：每日分析
function renderPerDayChart(d) {
  const { who, m, today, members, nt, whoChips } = perdayParts(d);
  const tripSoFar = m.days.filter(x => x.key <= today).reduce((s, x) => s + x.total, 0)
                 || m.days.reduce((s, x) => s + x.total, 0);
  const daysElapsed = Math.max(1, m.days.filter(x => x.key <= today).length || m.days.filter(x => x.total > 0).length);
  const todayTotal = m.days.find(x => x.key === today)?.total || 0;
  const budget = (d.budgetPerPerson || 100000) * (who === 'all' ? members.length : 1);
  const left = budget - tripSoFar - m.fixedTotal;

  const stat = (label, val, hint = '') => `
    <div style="flex:1;min-width:0;background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:6px 9px;">
      <div style="font-size:.6rem;color:var(--muted);">${label}</div>
      <div style="font-family:'Cinzel',serif;font-size:.9rem;color:var(--gold);white-space:nowrap;">${val}</div>
      ${hint ? `<div style="font-size:.56rem;color:var(--muted);">${hint}</div>` : ''}
    </div>`;

  const maxDay = Math.max(1, ...m.days.map(x => x.total));
  const catOrder = ['stay', 'act', 'fuel', 'park', 'ticket', 'misc'];
  const bars = m.days.map(x => {
    const dd = Number(x.key.split('-')[2]);
    const isSel = x.key === window._perdaySel;
    const isToday = x.key === today;
    const segs = catOrder.filter(c => x.byCat[c]).map(c =>
      `<div style="height:${(x.byCat[c] / maxDay * 100).toFixed(1)}%;background:${PERDAY_CATS[c].color};"></div>`).join('');
    return `
      <button onclick="perdayJump('${x.key}');event.stopPropagation();" title="${nt(x.total)}"
        style="flex:1;min-width:14px;background:none;border:none;padding:0;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;">
        <div style="width:100%;height:80px;display:flex;flex-direction:column-reverse;border-radius:3px;overflow:hidden;
                    background:${isSel ? 'rgba(79,195,247,.12)' : 'transparent'};outline:${isSel ? '1.5px solid var(--accent)' : 'none'};">
          ${segs}
        </div>
        <div style="font-size:.55rem;color:${isSel ? 'var(--accent)' : isToday ? 'var(--gold)' : 'var(--muted)'};">${dd}</div>
      </button>`;
  }).join('');
  const legend = catOrder.map(c => `
    <span style="display:inline-flex;align-items:center;gap:3px;font-size:.58rem;color:var(--muted);">
      <span style="width:8px;height:8px;border-radius:2px;background:${PERDAY_CATS[c].color};"></span>${PERDAY_CATS[c].label}
    </span>`).join('');

  return `
    <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px;">${whoChips}</div>
    <div style="display:flex;gap:5px;margin-bottom:5px;">
      ${stat('今天', nt(todayTotal))}
      ${stat('旅途中到目前', nt(tripSoFar), `第 ${daysElapsed} 天`)}
    </div>
    <div style="display:flex;gap:5px;margin-bottom:8px;">
      ${stat('平均每天', nt(tripSoFar / daysElapsed))}
      ${stat('預算還剩', `<span style="color:${left < 0 ? 'var(--red)' : 'var(--gold)'}">${nt(left)}</span>`, `含出發前 ${nt(m.fixedTotal)}`)}
    </div>
    <div style="display:flex;gap:3px;align-items:flex-end;">${bars}</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:6px;">${legend}</div>
    <div style="font-size:.58rem;color:var(--muted);text-align:center;margin-top:4px;">點一天 → 下方「全部」明細跳到那天</div>`;
}

// ── 「全部」分頁：所有類型混在一起，照日期分段
function renderAllList(d) {
  const { who, m, nt, whoChips, row } = perdayParts(d);
  const days = m.days.filter(x => x.list.length);
  const dayBlock = x => {
    const [y, mo, dd] = x.key.split('-').map(Number);
    const wd = '日一二三四五六'[new Date(y, mo - 1, dd).getDay()];
    const isSel = x.key === window._perdaySel;
    return `
      <div class="card" id="allDay-${x.key}" style="padding:10px 12px;margin-bottom:10px;scroll-margin-top:12px;
           ${isSel ? 'border-color:var(--accent);box-shadow:0 0 0 1px rgba(79,195,247,.35);' : ''}">
        <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:2px;">
          <span style="font-size:.85rem;color:var(--text);font-weight:600;">${mo}/${dd}（${wd}）</span>
          <span style="font-family:'Cinzel',serif;font-size:.95rem;color:var(--gold);">${who === 'all' ? '全團' : '我的份'} ${nt(x.total)}</span>
        </div>
        ${x.list.map(row).join('')}
      </div>`;
  };
  return `
    <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;">${whoChips}</div>
    ${m.dupCount ? `<div style="font-size:.68rem;color:#ffb74d;background:rgba(255,152,0,.08);border:1px solid rgba(255,152,0,.35);border-radius:8px;padding:6px 10px;margin-bottom:10px;">
      ⚠ 有 ${m.dupCount} 筆疑似重複的記帳沒有算進來（同時間、同金額、同付款人）。確認是重複的話，到 Google Sheet 把多的那列刪掉。</div>` : ''}
    ${days.length ? days.map(dayBlock).join('') : '<div class="empty">還沒有任何花費紀錄</div>'}
    <div class="card" style="padding:10px 12px;">
      <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:2px;">
        <span style="font-size:.85rem;color:var(--text);font-weight:600;">📌 出發前固定成本</span>
        <span style="font-family:'Cinzel',serif;font-size:.95rem;color:var(--gold);">${nt(m.fixedTotal)}</span>
      </div>
      <div style="font-size:.62rem;color:var(--muted);margin-bottom:2px;">機票、保險、租車、出發前買的東西。不算進每日長條。</div>
      ${m.fixed.map(row).join('')}
    </div>`;
}

window.perdaySetWho = function(k) {
  window._perdayWho = k;
  try { localStorage.setItem('perday_who', k); } catch (e) {}
  perdayRefresh();
};
// 點長條：切到「全部」分頁並捲到那天
window.perdayJump = function(key) {
  window._perdaySel = key;
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
