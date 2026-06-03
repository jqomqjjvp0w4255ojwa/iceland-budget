// render.js — 畫面渲染、靜態資料、路由

// ══ 靜態備用資料 ══
window.STATIC = {
  exchangeISK: 0.2537, exchangeEUR: 36.48,
  car: {
    company: 'ZERO CAR', model: 'Toyota RAV4 (Used Model)', code: '',
    pickup: '9月15日 上午9:30', dropoff: '9月29日 下午11:00', days: 14,
    location: 'Blikavöllur 3, 235 Keflavík Airport, Iceland',
    totalTWD: 74454, perPerson: 25479.33,
    driver1: '花🌼', driver2: '猴🙉', payer: '猴🙉',
    insurance: ['碰撞損害豁免險 CDW/SCDW','竊盜險 TP','碎石險 GP','道路救援免責聲明','零免賠額保險','額外司機']
  },
  accommodation: [
    {name:'Hekla Nordicabin Wild Cottage',   date:'9/15–9/16',nights:2,cur:'EU', orig:null,   twd:0,        paid:false,cancel:false,payer:'花🌼',payDate:null,  deductDate:null,  foreignFee:null,note:''},
    {name:'Þakgil',                           date:'9/17',     nights:1,cur:'ISK',orig:34000, twd:8625.10,  paid:true, cancel:false,payer:'寧',  payDate:'5/14',deductDate:null,  foreignFee:null,note:'訂金已付一半'},
    {name:'Tjaldsvæðið í Svínafelli',         date:'9/18–9/19',nights:2,cur:'ISK',orig:47200, twd:11973.67, paid:false,cancel:true, payer:'寧',  payDate:null,  deductDate:'9/18',foreignFee:null,note:'現場付'},
    {name:'Framtid Camping Lodging Barrels 富瑞麥德',date:'9/20',nights:1,cur:'EU',orig:null, twd:0,         paid:false,cancel:false,payer:'花🌼',payDate:null,  deductDate:null,  foreignFee:null,note:''},
    {name:'Húsey Hostel & Horsefarm',         date:'9/21',     nights:1,cur:'EUR',orig:132.56,twd:4835.91,  paid:false,cancel:true, payer:'猴🙉',payDate:null,  deductDate:'9/21',foreignFee:null,note:''},
    {name:'Guesthouse Stöng 米湖斯通小屋旅館', date:'9/22',     nights:1,cur:'NT', orig:6678,  twd:6678,     paid:true, cancel:false,payer:'寧',  payDate:'5/14',deductDate:null,  foreignFee:null,note:''},
    {name:'Ósar Hostel 怪石頭小屋',           date:'9/23',     nights:1,cur:'EUR',orig:139.29,twd:5081.43,  paid:false,cancel:true, payer:'猴🙉',payDate:null,  deductDate:'9/23',foreignFee:null,note:''},
    {name:'Sea, fjord & mountain view house', date:'9/24',     nights:1,cur:'EUR',orig:188.85,twd:6889.42,  paid:true, cancel:false,payer:'猴🙉',payDate:'5/14',deductDate:null,  foreignFee:null,note:''},
    {name:'Miðjanes Reykhólahrepp 米歐傑恩瑞科拉',date:'9/25', nights:1,cur:'EUR',orig:121.06,twd:4416.38,  paid:false,cancel:true, payer:'猴🙉',payDate:null,  deductDate:'9/25',foreignFee:null,note:''},
    {name:'Between sea and big mountains',    date:'9/26',     nights:1,cur:'EUR',orig:160,   twd:5836.95,  paid:false,cancel:true, payer:'寧',  payDate:null,  deductDate:'9/26',foreignFee:null,note:''},
    {name:'Icelandic Apartments by Heimaleiga',date:'9/27–9/28',nights:2,cur:'EUR',orig:351,  twd:12804.81, paid:false,cancel:true, payer:'猴🙉',payDate:null,  deductDate:'9/27',foreignFee:null,note:''},
  ],
  activity: [],
  daily: [],
};
window.APP_DATA = JSON.parse(JSON.stringify(window.STATIC));

// ══ 狀態 ══
let currentAccomFilter = 'all';
let dataSource = 'local';
const MEMBERS = ['花','猴','寧'];

// ══ 格式化工具 ══
function fmt(n) {
  if (!n || isNaN(n)) return '—';
  return 'NT$ ' + Math.round(n).toLocaleString('zh-TW');
}
function fmtPer(n) {
  if (!n || isNaN(n)) return '—';
  return 'NT$ ' + Math.round(n / 3).toLocaleString('zh-TW') + '<span style="font-size:.6em;color:var(--muted)">/人</span>';
}
function fmtOrig(n, cur) {
  if (!n || isNaN(n)) return '';
  const sym = { 'ISK':'ISK ','EUR':'€','EU':'€','NT':'NT$' }[(cur || '').replace(/\./g,'').toUpperCase()] || (cur + ' ');
  return sym + parseFloat(n).toLocaleString();
}

// ══ 住宿類型圖示 ══
function placeTypeIcon(name) {
  const n = name.toLowerCase();
  if (n.includes('camp') || n.includes('tjaldsv') || n.includes('þakgil') || n.includes('營')) return { icon:'⛺', label:'營地' };
  if (n.includes('hostel') || n.includes('backpack')) return { icon:'🛏', label:'青旅' };
  if (n.includes('apartment') || n.includes('heimaleiga') || n.includes('公寓')) return { icon:'🏢', label:'公寓' };
  if (n.includes('guesthouse') || n.includes('民宿')) return { icon:'🏡', label:'民宿' };
  if (n.includes('hotel') || n.includes('旅館')) return { icon:'🏨', label:'旅館' };
  if (n.includes('cabin') || n.includes('cottage') || n.includes('小屋') || n.includes('barrel')) return { icon:'🪵', label:'小屋' };
  if (n.includes('farm') || n.includes('horse')) return { icon:'🐴', label:'農場' };
  return { icon:'🏠', label:'住宿' };
}

// ══ 角色頭像 SVG（靜態第1格）══
function avatarSvg(name) {
  const s = String(name || '').trim();
  const maps = {
    '花': `<rect x="5" y="6" width="6" height="1" fill="#feae34"/><rect x="3" y="7" width="10" height="1" fill="#feae34"/><rect x="2" y="8" width="12" height="1" fill="#feae34"/><rect x="1" y="9" width="4" height="1" fill="#feae34"/><rect x="5" y="9" width="6" height="1" fill="#fee761"/><rect x="11" y="9" width="4" height="1" fill="#feae34"/><rect x="1" y="10" width="3" height="1" fill="#feae34"/><rect x="4" y="10" width="8" height="1" fill="#fee761"/><rect x="12" y="10" width="3" height="1" fill="#feae34"/><rect x="0" y="11" width="4" height="1" fill="#feae34"/><rect x="4" y="11" width="8" height="1" fill="#fee761"/><rect x="12" y="11" width="4" height="1" fill="#feae34"/><rect x="5" y="12" width="1" height="1" fill="#3f2832"/><rect x="10" y="12" width="1" height="1" fill="#3f2832"/><rect x="7" y="15" width="2" height="1" fill="#f6757a"/><rect x="7" y="21" width="2" height="1" fill="#3e8948"/><rect x="4" y="24" width="8" height="1" fill="#3e8948"/><rect x="4" y="25" width="8" height="1" fill="#3e8948"/>`,
    '猴': `<rect x="5" y="7" width="6" height="1" fill="#b86f50"/><rect x="4" y="8" width="8" height="1" fill="#b86f50"/><rect x="3" y="9" width="10" height="1" fill="#b86f50"/><rect x="1" y="11" width="3" height="1" fill="#b86f50"/><rect x="4" y="11" width="8" height="1" fill="#ffc8b5"/><rect x="12" y="11" width="3" height="1" fill="#b86f50"/><rect x="6" y="12" width="1" height="1" fill="#3f2832"/><rect x="9" y="12" width="1" height="1" fill="#3f2832"/><rect x="7" y="14" width="2" height="1" fill="#f6757a"/><rect x="2" y="24" width="12" height="1" fill="#b86f50"/><rect x="3" y="27" width="3" height="1" fill="#5a6988"/><rect x="10" y="27" width="3" height="1" fill="#5a6988"/>`,
    '寧': `<rect x="3" y="4" width="1" height="1" fill="#434659"/><rect x="12" y="4" width="1" height="1" fill="#444559"/><rect x="7" y="8" width="2" height="1" fill="#f9ffff"/><rect x="6" y="9" width="4" height="1" fill="#f3f9ff"/><rect x="7" y="13" width="2" height="1" fill="#9a99a7"/><rect x="3" y="26" width="1" height="1" fill="#414256"/><rect x="12" y="26" width="1" height="1" fill="#414256"/>`,
  };
  for (const key of Object.keys(maps)) {
    if (s.includes(key)) {
      return `<svg width="16" height="28" viewBox="0 0 16 28" style="image-rendering:pixelated;vertical-align:middle;">${maps[key]}</svg>`;
    }
  }
  return `<span style="font-size:.75rem">${s}</span>`;
}

// ══ Sync UI ══
window.setSyncState = function(state, msg) {
  dataSource = state;
  const dot = document.getElementById('syncDot');
  const icon = document.getElementById('syncIcon');
  const label = document.getElementById('syncLabel');
  const status = document.getElementById('syncStatus');
  dot.className = 'dot';
  if (state === 'cloud') { dot.classList.add('dot-cloud'); icon.innerHTML = '☁'; label.textContent = '雲端'; }
  else if (state === 'syncing') { dot.classList.add('dot-syncing'); icon.innerHTML = '<span class="spin-icon">↻</span>'; label.textContent = '同步中'; }
  else if (state === 'offline') { dot.classList.add('dot-offline'); icon.innerHTML = '📵'; label.textContent = '離線'; }
  else { dot.classList.add('dot-local'); icon.innerHTML = '💾'; label.textContent = '本地'; }
  if (msg) status.textContent = msg;
};

// ══ 主導覽路由 ══
window.showPage = function(id, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.main-nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  btn.classList.add('active');
};

// ══ 錢包子 Tab ══
window.showWalletTab = function(id, btn) {
  document.querySelectorAll('.wallet-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.wallet-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('ws-' + id).classList.add('active');
  btn.classList.add('active');
};

// ══ 住宿篩選 ══
window.setFilter = function(f) {
  currentAccomFilter = f;
  document.getElementById('accomContent').innerHTML = renderAccom(APP_DATA.accommodation);
};

// ══ 渲染：總覽 ══
function renderOverview(d) {
  const totalAccom = d.accommodation.reduce((s, a) => s + (a.twd || 0), 0);
  const totalActivity = (d.activity || []).reduce((s, a) => s + (a.twd || 0), 0);
  const totalDaily = (d.daily || []).reduce((s, a) => s + (a.twd || 0), 0);
  const grandTotal = (d.car.totalTWD || 0) + totalAccom + totalActivity + totalDaily;

  return `
    <div class="summary-grid">
      <div class="summary-card full">
        <div class="summary-label">✈️ 累計花費 / 人</div>
        <div class="summary-value">${fmt(grandTotal / 3)}</div>
        <div class="summary-sub">合計 ${fmt(grandTotal)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">🚗 交通</div>
        <div class="summary-value" style="font-size:1rem">${fmt(d.car.perPerson)}<span style="font-size:.55em;color:var(--muted)">/人</span></div>
        <div class="summary-sub">合計 ${fmt(d.car.totalTWD)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">🏕 住宿</div>
        <div class="summary-value" style="font-size:1rem">${fmt(totalAccom / 3)}<span style="font-size:.55em;color:var(--muted)">/人</span></div>
        <div class="summary-sub">合計 ${fmt(totalAccom)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">🎯 活動</div>
        ${totalActivity
          ? `<div class="summary-value" style="font-size:1rem">${fmt(totalActivity / 3)}<span style="font-size:.55em;color:var(--muted)">/人</span></div><div class="summary-sub">合計 ${fmt(totalActivity)}</div>`
          : '<div class="summary-value" style="font-size:.85rem;color:var(--muted)">待新增</div><div class="summary-sub">—</div>'}
      </div>
      <div class="summary-card">
        <div class="summary-label">🛒 日常</div>
        ${totalDaily
          ? `<div class="summary-value" style="font-size:1rem">${fmt(totalDaily / 3)}<span style="font-size:.55em;color:var(--muted)">/人</span></div><div class="summary-sub">合計 ${fmt(totalDaily)}</div>`
          : '<div class="summary-value" style="font-size:.85rem;color:var(--muted)">旅途中記帳</div><div class="summary-sub">—</div>'}
      </div>
    </div>
    <div class="rate-bar">
      <span>💱 <strong>ISK</strong> = ${(d.exchangeISK || 0).toFixed(4)} NT$</span>
      <span>💱 <strong>EUR</strong> = ${(d.exchangeEUR || 0).toFixed(2)} NT$</span>
    </div>
  `;
}

// ══ 渲染：住宿 ══
function renderAccom(items) {
  const show = currentAccomFilter === 'all' ? items
    : currentAccomFilter === 'paid' ? items.filter(a => a.paid)
    : items.filter(a => !a.paid);
  const total = items.reduce((s, a) => s + (a.twd || 0), 0);
  const paidTotal = items.filter(a => a.paid).reduce((s, a) => s + (a.twd || 0), 0);
  const pct = total ? Math.round(paidTotal / total * 100) : 0;

  return `
    <div class="progress-wrap">
      <div class="progress-label"><span>已付款進度 ${pct}%</span><span>${fmt(paidTotal)} / ${fmt(total)}</span></div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
    </div>
    <div class="filter-row">
      <button class="filter-btn ${currentAccomFilter==='all'?'active':''}" onclick="setFilter('all')">全部 ${items.length}</button>
      <button class="filter-btn ${currentAccomFilter==='paid'?'active':''}" onclick="setFilter('paid')">✓ 已付 ${items.filter(a=>a.paid).length}</button>
      <button class="filter-btn ${currentAccomFilter==='unpaid'?'active':''}" onclick="setFilter('unpaid')">未付 ${items.filter(a=>!a.paid).length}</button>
    </div>
    ${show.map(a => {
      const pt = placeTypeIcon(a.name);
      let payTag = '';
      if (a.paid && a.payDate) payTag = `<span class="tag tag-paid">${a.payDate} 付款</span>`;
      else if (a.paid) payTag = `<span class="tag tag-paid">已付款</span>`;
      else if (a.deductDate) payTag = `<span class="tag tag-unpaid">${a.deductDate} 扣款</span>`;
      else payTag = `<span class="tag tag-unpaid">未付款</span>`;
      const feeTag = a.foreignFee ? `<span class="tag tag-fee">手續費 NT$${a.foreignFee}</span>` : '';
      return `
      <div class="card ${a.paid ? 'paid-card' : 'unpaid-card'}">
        <div class="card-header">
          <div>
            <div class="card-date">${a.date}<span class="card-nights"> · ${a.nights}晚</span></div>
            <div class="card-name-row">
              <span class="place-type-icon" title="${pt.label}">${pt.icon}</span>
              <span class="card-name">${a.name}</span>
            </div>
          </div>
          <div class="card-price">
            ${a.twd ? `
              <div class="price-per-label">&nbsp;</div>
              <div class="price-per">${fmtPer(a.twd)}</div>
              <div class="price-total">${fmt(a.twd)} 合計</div>
              ${a.orig && a.cur !== 'NT' ? `<div class="price-orig">${fmtOrig(a.orig, a.cur)}</div>` : ''}
            ` : `<div class="price-per" style="color:var(--muted);font-size:.85rem">現場付</div>`}
          </div>
        </div>
        <div class="card-body">
          ${payTag}
          <span class="tag ${a.cancel ? 'tag-cancel' : 'tag-nocancel'}">${a.cancel ? '可取消' : '不可退'}</span>
          <span style="display:inline-flex;align-items:center;">${avatarSvg(a.payer)}</span>
          ${feeTag}
        </div>
        ${a.note ? `<div class="card-note">📌 ${a.note}</div>` : ''}
      </div>`;
    }).join('')}
  `;
}

// ══ 渲染：交通（租車 + 子分類佔位）══
function renderTransport(d) {
  const car = d.car;
  return `
    <div class="section-title">🚗 租車</div>
    <div class="car-card">
      <div class="car-header">
        <div class="car-title">${car.company}</div>
        <div class="car-model">${car.model}</div>
      </div>
      <div class="car-grid">
        <div class="car-item">
          <div class="car-item-label">確認碼</div>
          <div class="car-item-value" style="color:var(--gold);font-family:'Cinzel',serif;letter-spacing:.1em">${car.code || '—'}</div>
        </div>
        <div class="car-item">
          <div class="car-item-label">租用天數</div>
          <div class="car-item-value">${car.days} 天</div>
        </div>
        <div class="car-item">
          <div class="car-item-label">取車</div>
          <div class="car-item-value" style="font-size:.8rem">${car.pickup}</div>
        </div>
        <div class="car-item">
          <div class="car-item-label">還車</div>
          <div class="car-item-value" style="font-size:.8rem">${car.dropoff}</div>
        </div>
        <div class="car-item" style="grid-column:1/-1;border-right:none">
          <div class="car-item-label">取還車地點</div>
          <div class="car-item-value" style="font-size:.78rem;font-weight:400;color:var(--muted)">${car.location}</div>
        </div>
      </div>
      <div class="car-price-row">
        <div>
          <div style="font-size:.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;margin-bottom:3px">每人分攤</div>
          <div style="font-family:'Cinzel',serif;font-size:1.25rem;color:var(--gold)">${fmt(car.perPerson)}/人</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;margin-bottom:3px">三人合計</div>
          <div style="font-family:'Cinzel',serif;font-size:1.25rem;color:var(--accent)">${fmt(car.totalTWD)}</div>
        </div>
      </div>
    </div>
    <div class="car-card"><ul class="insurance-list">${car.insurance.map(i => `<li>${i}</li>`).join('')}</ul></div>
    <div class="car-card">
      <div class="card-body" style="padding:13px 16px">
        <span class="tag tag-person" style="display:inline-flex;align-items:center;gap:3px;">主駕 ${avatarSvg(car.driver1)}</span>
        <span class="tag tag-person" style="display:inline-flex;align-items:center;gap:3px;">副駕 ${avatarSvg(car.driver2)}</span>
        <span class="tag tag-paid" style="display:inline-flex;align-items:center;gap:3px;">付款 ${avatarSvg(car.payer)}</span>
      </div>
    </div>
    <div class="section-title">⛽ 加油記錄</div>
    <div class="empty" style="padding:20px">旅途中加油後記入</div>
    <div class="section-title">🅿️ 停車費</div>
    <div class="empty" style="padding:20px">旅途中停車後記入</div>
    <div class="section-title">✈️ 航班</div>
    <div class="empty" style="padding:20px">航班確認後填入</div>
  `;
}

// ══ 分帳計算 ══
function calcDebt(d) {
  const totalAccom = d.accommodation.reduce((s, a) => s + (a.twd || 0), 0);
  const totalActivity = (d.activity || []).reduce((s, a) => s + (a.twd || 0), 0);
  const totalDaily = (d.daily || []).reduce((s, a) => s + (a.twd || 0), 0);
  const grandTotal = (d.car.totalTWD || 0) + totalAccom + totalActivity + totalDaily;
  const shouldPay = grandTotal / 3;

  const paid = { '花': 0, '猴': 0, '寧': 0 };
  d.accommodation.forEach(a => {
    if (!a.payer || !a.twd) return;
    for (const m of MEMBERS) { if (a.payer.includes(m)) { paid[m] += a.twd; break; } }
  });
  if (d.car.totalTWD && d.car.payer) {
    for (const m of MEMBERS) { if (d.car.payer.includes(m)) { paid[m] += d.car.totalTWD; break; } }
  }

  const debt = {};
  MEMBERS.forEach(m => { debt[m] = paid[m] - shouldPay; });
  return { paid, debt, shouldPay, grandTotal };
}

// ══ 分帳對話框 ══
const DEBT_LINES = {
  // 欠錢（負數）
  neg: [
    (name, amt, to) => `${name}：「我欠${to} NT$${amt}⋯⋯旅行結束一定還！」`,
    (name, amt, to) => `${name}：「先記著，回台灣就轉帳給${to}！」`,
    (name, amt, to) => `${name}：「${to}先幫我墊了 NT$${amt}，感謝感謝！」`,
  ],
  // 被欠（正數）
  pos: [
    (name, amt, from) => `${name}：「${from}欠我 NT$${amt}，回去記得還！」`,
    (name, amt, from) => `${name}：「目前代墊最多，大家記得結清哦～」`,
    (name, amt) => `${name}：「我先墊了 NT$${amt}，不急但別忘了！」`,
  ],
  // 剛好平
  zero: [
    name => `${name}：「剛好平！佛系旅行！✨」`,
    name => `${name}：「算數達人！分毫不差！」`,
  ]
};

window.openDebtDialog = function() {
  const d = window.APP_DATA || window.STATIC;
  const { paid, debt, grandTotal } = calcDebt(d);
  const maxPaid = Math.max(...MEMBERS.map(m => paid[m]));

  // 找債主（欠最多錢的人付給誰）
  const creditors = MEMBERS.filter(m => debt[m] > 0);
  const debtors = MEMBERS.filter(m => debt[m] < 0);

  // 建立輪播投影片
  const slides = MEMBERS.map((name, i) => {
    const amt = Math.abs(Math.round(debt[name]));
    const isPos = debt[name] > 0;
    const isZero = Math.abs(debt[name]) < 1;
    let line;
    if (isZero) {
      line = DEBT_LINES.zero[i % DEBT_LINES.zero.length](name);
    } else if (isPos) {
      const from = debtors[0] || '大家';
      line = DEBT_LINES.pos[i % DEBT_LINES.pos.length](name, amt.toLocaleString(), from);
    } else {
      const to = creditors[0] || '大家';
      line = DEBT_LINES.neg[i % DEBT_LINES.neg.length](name, amt.toLocaleString(), to);
    }
    return `
      <div class="debt-slide${i === 0 ? ' active' : ''}" data-idx="${i}">
        <div class="debt-char-row">
          <svg class="debt-char-sprite" width="32" height="56" viewBox="0 0 16 28" style="image-rendering:pixelated">
            ${getAvatarInnerSvg(name)}
          </svg>
          <div class="debt-bubble">${line}</div>
        </div>
      </div>`;
  });

  // 比較圖表
  const maxAmt = Math.max(...MEMBERS.map(m => paid[m]), 1);
  const chartRows = MEMBERS.map(m => {
    const pct = Math.round(paid[m] / maxAmt * 100);
    const isPos = debt[m] >= 0;
    const debtAmt = Math.round(Math.abs(debt[m]));
    const debtText = debt[m] > 1 ? `收回 NT$${debtAmt.toLocaleString()}`
      : debt[m] < -1 ? `還 NT$${debtAmt.toLocaleString()}`
      : '已平衡 ✓';
    return `
      <div class="debt-bar-row">
        <div class="debt-bar-name">${m}</div>
        <div class="debt-bar-track">
          <div class="debt-bar-inner ${isPos ? 'payer' : 'debtor'}" style="width:${pct}%"></div>
        </div>
        <div class="debt-bar-amt">${debtText}</div>
      </div>`;
  }).join('');

  document.getElementById('debtCarousel').innerHTML = `
    ${slides.join('')}
    <div class="debt-nav">
      <button class="debt-nav-btn" onclick="debtPrev()">◀ 上一位</button>
      <div class="debt-dots" id="debtDots">
        ${MEMBERS.map((_, i) => `<div class="debt-dot${i===0?' active':''}" data-i="${i}"></div>`).join('')}
      </div>
      <button class="debt-nav-btn" onclick="debtNext()">下一位 ▶</button>
    </div>`;

  document.getElementById('debtChart').innerHTML = `
    <div class="debt-chart-title">▼ 代墊比較（NT$）</div>
    ${chartRows}`;

  document.getElementById('debtOverlay').classList.add('show');
};

let _debtIdx = 0;
window.debtNext = function() { debtGo(_debtIdx + 1); };
window.debtPrev = function() { debtGo(_debtIdx - 1); };
function debtGo(i) {
  const slides = document.querySelectorAll('.debt-slide');
  const dots = document.querySelectorAll('.debt-dot');
  if (!slides.length) return;
  _debtIdx = ((i % slides.length) + slides.length) % slides.length;
  slides.forEach((s, idx) => s.classList.toggle('active', idx === _debtIdx));
  dots.forEach((d, idx) => d.classList.toggle('active', idx === _debtIdx));
}

window.closeDebtDialog = function(e) {
  if (e.target === document.getElementById('debtOverlay')) closeDebtDialogDirect();
};
window.closeDebtDialogDirect = function() {
  document.getElementById('debtOverlay').classList.remove('show');
};

// ══ 取角色 SVG 內容（給對話框放大用）══
function getAvatarInnerSvg(name) {
  const maps = {
    '花': `<rect x="5" y="6" width="6" height="1" fill="#feae34"/><rect x="3" y="7" width="10" height="1" fill="#feae34"/><rect x="2" y="8" width="12" height="1" fill="#feae34"/><rect x="5" y="12" width="1" height="1" fill="#3f2832"/><rect x="10" y="12" width="1" height="1" fill="#3f2832"/><rect x="7" y="15" width="2" height="1" fill="#f6757a"/><rect x="4" y="22" width="8" height="1" fill="#3e8948"/><rect x="4" y="23" width="8" height="1" fill="#3e8948"/>`,
    '猴': `<rect x="5" y="7" width="6" height="1" fill="#b86f50"/><rect x="4" y="8" width="8" height="1" fill="#b86f50"/><rect x="3" y="9" width="10" height="1" fill="#b86f50"/><rect x="6" y="12" width="1" height="1" fill="#3f2832"/><rect x="9" y="12" width="1" height="1" fill="#3f2832"/><rect x="7" y="14" width="2" height="1" fill="#f6757a"/><rect x="2" y="24" width="12" height="1" fill="#b86f50"/>`,
    '寧': `<rect x="3" y="4" width="1" height="1" fill="#434659"/><rect x="12" y="4" width="1" height="1" fill="#444559"/><rect x="7" y="8" width="2" height="1" fill="#f9ffff"/><rect x="7" y="13" width="2" height="1" fill="#9a99a7"/><rect x="3" y="26" width="1" height="1" fill="#414256"/>`,
  };
  for (const key of Object.keys(maps)) {
    if (name.includes(key)) return maps[key];
  }
  return '';
}

// ══ 主渲染 ══
window.renderAll = function() {
  const d = window.APP_DATA || window.STATIC;
  document.getElementById('overviewContent').innerHTML = renderOverview(d);
  document.getElementById('transportContent').innerHTML = renderTransport(d);
  document.getElementById('accomContent').innerHTML = renderAccom(d.accommodation);
  // daily 由 forms.js 更新
  setTimeout(() => window.updatePixelBudget?.(), 100);
};

// ══ 同步入口 ══
window.syncFromCloud = async function() {
  if (window.__syncIcelandBudgetFromSheets) {
    return window.__syncIcelandBudgetFromSheets();
  }
  setSyncState('local', '同步模組尚未載入');
};

window.manualSync = async function() {
  if (dataSource === 'syncing') return;
  await syncFromCloud();
};

// ══ PWA 安裝 ══
let _deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); _deferredPrompt = e; });
window.installPWA = function() {
  if (_deferredPrompt) { _deferredPrompt.prompt(); _deferredPrompt = null; }
  else alert('請從瀏覽器選單選擇「加入主畫面」');
};

// ══ 初始化 ══
async function init() {
  renderAll();
  setSyncState('local', '載入本地資料中…');
  await syncFromCloud();
  window.addEventListener('offline', () => {
    document.getElementById('offlineBadge').classList.add('show');
    setSyncState('offline', '離線模式');
  });
  window.addEventListener('online', () => {
    document.getElementById('offlineBadge').classList.remove('show');
    syncFromCloud();
  });
  if (!navigator.onLine) document.getElementById('offlineBadge').classList.add('show');
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/iceland-budget/iceland/sw.js').catch(() => {});
}

document.addEventListener('DOMContentLoaded', init);
