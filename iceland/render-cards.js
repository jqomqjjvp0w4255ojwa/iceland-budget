// render-cards.js — 卡片渲染：住宿、日常開銷、還款、交通

function renderAccom(items){
  const show=currentFilter==='all'?items:currentFilter==='paid'?items.filter(a=>a.paid):items.filter(a=>!a.paid);
  const total=items.reduce((s,a)=>s+(a.twd||0),0);
  const paidTotal=items.filter(a=>a.paid).reduce((s,a)=>s+(a.twd||0),0);
  const pct=total?Math.round(paidTotal/total*100):0;

  return `
    <div class="progress-wrap">
      <div class="progress-label"><span>已付款進度 ${pct}%</span><span>${fmt(paidTotal)} / ${fmt(total)}</span></div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
    </div>
    <div class="filter-row">
      <button class="filter-btn ${currentFilter==='all'?'active':''}" onclick="setFilter('all')">全部 ${items.length}</button>
      <button class="filter-btn ${currentFilter==='paid'?'active':''}" onclick="setFilter('paid')">✓ 已付 ${items.filter(a=>a.paid).length}</button>
      <button class="filter-btn ${currentFilter==='unpaid'?'active':''}" onclick="setFilter('unpaid')">未付 ${items.filter(a=>!a.paid).length}</button>
    </div>
    ${show.map(a=>{
      const pt=placeTypeIcon(a.name);

      // 付款 tag 文字
      let payTag='';
      if(a.paid && a.payDate) payTag=`<span class="tag tag-paid">${a.payDate} 付款</span>`;
      else if(a.paid) payTag=`<span class="tag tag-paid">已付款</span>`;
      else if(a.deductDate) payTag=`<span class="tag tag-unpaid">${a.deductDate} 扣款</span>`;
      else payTag=`<span class="tag tag-unpaid">未付款</span>`;

      // 海外手續費（預留欄位，有值才顯示）
      const feeTag=a.foreignFee?`<span class="tag tag-fee">手續費 NT$${a.foreignFee}</span>`:'';

      return `
      <div class="card ${a.paid?'paid-card':'unpaid-card'}">
        <div class="card-header">
          <div class="card-left">
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
              ${a.orig && a.cur !== 'NT' ? `<div class="price-orig">${fmtOrig(a.orig,a.cur)}</div>` : ''}
            ` : `<div class="price-per" style="color:var(--muted);font-size:.85rem">現場付</div>`}
          </div>
        </div>
        <div class="card-body">
          ${payTag}
          <span class="tag ${a.cancel?'tag-cancel':'tag-nocancel'}">${a.cancel?'可取消':'不可退'}</span>
          <span style="display:inline-flex;align-items:center;">${avatarSvg(a.payer)}</span>
          ${feeTag}
        </div>
        ${a.note?`<div class="card-note">📌 ${a.note}</div>`:''}
      </div>`;
    }).join('')}
  `;
}

function setFilter(f){
  currentFilter=f;
  document.getElementById('accomContent').innerHTML=renderAccom(APP_DATA.accommodation);
}

// ── 租車
// ── 類別中文對應
const CAT_LABEL = {
  food:'🍽 餐飲', shop:'🛍 購物', transport:'🚌 交通', activity:'🎯 活動',
  fuel:'⛽ 油費', accommodation:'🏕 住宿', other:'📦 其他',
};
function catLabel(c){ return CAT_LABEL[c] || c || '📦 其他'; }


function renderDaily(expenses) {
  const TRANSPORT_CATS = ['加油','停車費'];
  const items = (expenses||[]).filter(e => !TRANSPORT_CATS.includes(e.category)).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  if (!items.length) return `<div class="empty">🛒 旅途中新增的日常開銷會顯示在這裡</div>`;

  const html = items.map(item => {
    const date  = item.date ? String(item.date).split('T')[0] : '—';
    const isFuel = item.category === '加油';
    const label = `${item.category||'開銷'} ${item.location||''} NT$${Math.round(item.total||item.twd||0).toLocaleString()}`;
    const sheet = 'expense';

    const burdenTags = ['猴','花','寧']
      .filter(m => (item.burden?.[m]||0) > 0)
      .map(m => `<span style="display:inline-flex;align-items:center;gap:2px;font-size:.62rem;
                   background:var(--bg3);border:1px solid var(--border);
                   border-radius:4px;padding:1px 5px;color:var(--muted)">
                   ${avatarSvg(m)} NT$${Math.round(item.burden[m]).toLocaleString()}
                 </span>`).join('');

    const fuelExtra = isFuel ? `
      <div style="font-size:.63rem;color:var(--muted);margin-top:4px;display:flex;gap:8px;flex-wrap:wrap">
        ${item.fuelBrand  ? `<span>⛽ ${item.fuelBrand}</span>` : ''}
        ${item.fuelLiters ? `<span>${item.fuelLiters}L</span>` : ''}
        ${item.fuelMileage? `<span>📍 ${item.fuelMileage.toLocaleString()} km</span>` : ''}
        ${item.fuelEfficiency ? `<span>🔁 ${Number(item.fuelEfficiency).toFixed(1)} km/L</span>` : ''}
      </div>` : '';

    const editData = JSON.stringify({
      category: item.category, amount: item.amount, currency: item.currency,
      location: item.location, note: item.note, date: item.date, payer: item.payer,
    }).replace(/"/g,'&quot;');

    return `
      <div class="swipe-card-wrap">
        <div class="swipe-card-actions">
          <button class="swipe-action-btn edit"
            onclick="openEditExpense(${item._rowIndex||0}, JSON.parse(this.dataset.d))"
            data-d="${editData}">
            <span>✏️</span>修改
          </button>
          <button class="swipe-action-btn delete"
            onclick="pxConfirmDelete(${item._rowIndex||0},'${sheet}','${label.replace(/'/g,'')}')">
            <span>🗑️</span>刪除
          </button>
        </div>
        <div class="swipe-card-content card">
          <div class="card-header">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
                <span style="font-size:.72rem;color:var(--text)">${item.category||'—'}</span>
                <span style="font-size:.65rem;color:var(--muted)">${date}</span>
                ${item.location ? `<span style="font-size:.65rem;color:var(--muted)">📍 ${item.location}</span>` : ''}
              </div>
              <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
                ${item.payer ? avatarSvg(item.payer) : ''}
                ${burdenTags}
              </div>
              ${fuelExtra}
              ${item.note ? `<div class="card-note" style="margin-top:4px">📌 ${item.note}</div>` : ''}
              ${item.tags ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">${item.tags.split(',').filter(Boolean).map(t=>`<span style="background:rgba(42,74,26,.15);border:1px solid rgba(42,74,26,.3);color:var(--text);font-size:.58rem;padding:1px 6px;border-radius:999px;">${t.trim()}</span>`).join('')}</div>` : ''}
            </div>
            <div class="card-price" style="flex-shrink:0;text-align:right">
              <div style="font-family:'Cinzel',serif;font-size:1rem;color:var(--gold)">
                NT$ ${Math.round(item.total||item.twd||0).toLocaleString()}
              </div>
              ${item.currency&&item.currency!=='NT' ? `<div style="font-size:.62rem;color:var(--muted)">${item.amount} ${item.currency}</div>` : ''}
            </div>
          </div>
        </div>
      </div>`;
  }).join('');

  setTimeout(() => {
    const el = document.getElementById('dailyContent');
    if (el) window.initSwipeCards(el);
  }, 50);
  return html;
}


window.initSwipeCards = function(container) {
  const wraps = container.querySelectorAll('.swipe-card-wrap');
  wraps.forEach(wrap => {
    let startX = 0, startY = 0, isDragging = false, isHoriz = null;
    const content = wrap.querySelector('.swipe-card-content');
    if (!content) return;

    function openCard()  { wraps.forEach(w => w.classList.remove('open')); wrap.classList.add('open'); }
    function closeCard() { wrap.classList.remove('open'); }

    content.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isDragging = false; isHoriz = null;
    }, {passive:true});

    content.addEventListener('touchmove', e => {
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (isHoriz === null) isHoriz = Math.abs(dx) > Math.abs(dy);
      if (!isHoriz) return;
      e.preventDefault();
      isDragging = true;
    }, {passive:false});

    content.addEventListener('touchend', e => {
      if (!isDragging) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (dx < -40) openCard();
      else if (dx > 20) closeCard();
      isDragging = false;
    }, {passive:true});

    // 點擊其他卡片時關閉
    document.addEventListener('touchstart', e => {
      if (!wrap.contains(e.target)) closeCard();
    }, {passive:true});
  });
};

function renderRepay(items) {
  if (!items.length) return `<div class="empty">💸 還款記錄會顯示在這裡</div>`;
  const html = items.map(r => {
    const date  = r.date ? r.date.split('T')[0] : '—';
    const label = `${r.from}→${r.to} NT$${Math.round(r.amount).toLocaleString('zh-TW')}`;
    const editData = JSON.stringify({from:r.from, to:r.to, amount:r.amount, date:r.date||'', note:r.note||''}).replace(/"/g,'&quot;');
    return `
      <div class="swipe-card-wrap">
        <div class="swipe-card-actions">
          <button class="swipe-action-btn edit"
            onclick="openEditRepay(${r._rowIndex||0}, JSON.parse(this.dataset.d))"
            data-d="${editData}">
            <span>✏️</span>修改
          </button>
          <button class="swipe-action-btn delete"
            onclick="pxConfirmDelete(${r._rowIndex||0},'repay','${label.replace(/'/g,'')}')">
            <span>🗑️</span>刪除
          </button>
        </div>
        <div class="swipe-card-content card">
          <div class="card-header">
            <div>
              <div class="card-date" style="font-size:.85rem">${date}</div>
              <div class="card-name-row" style="margin-top:5px;display:flex;align-items:center;gap:6px;">
                ${avatarSvg(r.from)}
                <span style="font-size:.8rem;color:var(--muted)">→</span>
                ${avatarSvg(r.to)}
                <span style="font-size:.75rem;color:var(--muted)">${r.from} 還給 ${r.to}</span>
              </div>
            </div>
            <div class="card-price">
              <div class="price-per" style="font-size:1.1rem">NT$ ${Math.round(r.amount).toLocaleString('zh-TW')}</div>
            </div>
          </div>
          ${r.note ? `<div class="card-note">📌 ${r.note}</div>` : ''}
        </div>
      </div>`;
  }).join('');
  // 初始化滑動（DOM 插入後呼叫）
  setTimeout(() => {
    const el = document.getElementById('repayContent');
    if (el) window.initSwipeCards(el);
  }, 50);
  return html;
}

function renderTransport(d) {
  const car = d.car;
  const flights = d.flights || [];
  const fuelItems   = (d.expenses||[]).filter(e => e.category === '加油');
  const parkItems   = (d.expenses||[]).filter(e => e.category === '停車費');
  const currentFilter = window._transportFilter || 'all';
  const filterBtns = ['all','car','flight','fuel','parking'].map(f => {
    const labels = {all:'全部', car:'🚗 租車', flight:'✈️ 機票', fuel:'⛽ 油費', parking:'🅿 停車'};
    return `<button class="filter-btn${currentFilter===f?' active':''}" onclick="setTransportFilter('${f}')">${labels[f]}</button>`;
  }).join('');
  const carCard = (currentFilter === 'all' || currentFilter === 'car') ? `
    <div class="card paid-card" style="margin-bottom:11px;">
      <div class="card-header">
        <div>
          <div class="card-date" style="font-size:.85rem">${car.pickup||'—'} → ${car.dropoff||'—'}</div>
          <div class="card-name-row" style="margin-top:4px;">
            <span style="font-size:.85rem">🚗</span>
            <span class="card-name">${car.company}　${car.model}</span>
          </div>
          ${car.location ? `<div style="font-size:.72rem;color:var(--muted);margin-top:4px;">📍 ${car.location.replace('Zero Car, ','').replace(', Iceland','')}</div>` : ''}
        </div>
        <div class="card-price">
          <div class="price-per-label">&nbsp;</div>
          <div class="price-per">${fmtPer(car.totalTWD)}</div>
          <div class="price-total">${fmt(car.totalTWD)} 合計</div>
        </div>
      </div>
      <div class="card-body">
        <span class="tag tag-paid" style="display:inline-flex;align-items:center;gap:3px;">付款 ${avatarSvg(car.payer)}</span>
        <span class="tag tag-person">${car.days} 天</span>
        ${car.startMileage ? `<span class="tag" style="background:rgba(79,195,247,.1);color:var(--accent);border:1px solid rgba(79,195,247,.25);">取車 ${car.startMileage.toLocaleString()} km</span>` : ''}
      </div>
    </div>` : '';
  const flightCards = (currentFilter === 'all' || currentFilter === 'flight') ?
    flights.map(f => {
      const goSegs  = f.segments.filter(s => s.direction === '去程');
      const retSegs = f.segments.filter(s => s.direction === '回程');
      const goTransfers  = goSegs.filter(s => s.isTransit).length;
      const retTransfers = retSegs.filter(s => s.isTransit).length;
      const operators = [...new Set(f.segments.map(s=>s.operatedBy).filter(Boolean))].join(' · ');
      const goDepTime  = goSegs[0]?.depTime  ? String(goSegs[0].depTime).replace('T',' ').slice(0,16)  : '—';
      const goArrTime  = goSegs.at(-1)?.arrTime  ? String(goSegs.at(-1).arrTime).replace('T',' ').slice(0,16)  : '—';
      const retDepTime = retSegs[0]?.depTime ? String(retSegs[0].depTime).replace('T',' ').slice(0,16) : '';
      const retArrTime = retSegs.at(-1)?.arrTime ? String(retSegs.at(-1).arrTime).replace('T',' ').slice(0,16) : '';
      return `
      <div class="card" style="margin-bottom:11px;">
        <div class="card-header">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:.6rem;color:var(--muted);background:var(--bg3);border:1px solid var(--border);
                         border-radius:4px;padding:1px 6px;white-space:nowrap;">✈️ 機票</span>
            ${avatarSvg(f.person)}
          </div>
          <div class="card-price">
            <div style="font-family:'Cinzel',serif;font-size:1rem;color:var(--gold);">${f.totalTWD?fmt(f.totalTWD):'—'}</div>
            <div style="font-size:.65rem;color:var(--muted);">各付各的</div>
          </div>
        </div>
        <div style="padding:0 16px 12px;">
          <!-- 航空公司 & 路線 -->
          <div style="margin-bottom:8px;">
            <div style="font-size:.88rem;color:var(--text);font-weight:600;margin-bottom:2px">${f.airline||'—'}</div>
            <div style="font-size:.72rem;color:var(--muted)">${f.from||'—'} → ${f.to||'—'} &nbsp;·&nbsp; ${f.type||'—'}</div>
            ${operators?`<div style="font-size:.65rem;color:var(--muted);margin-top:2px">執飛：${operators}</div>`:''}
          </div>
          <!-- Tags -->
          <div class="card-body" style="padding:0 0 8px;gap:5px;">
            ${goTransfers>0?`<span class="tag tag-cancel">去轉${goTransfers}次</span>`:'<span class="tag tag-paid">去程直飛</span>'}
            ${retSegs.length?(retTransfers>0?`<span class="tag tag-cancel">回轉${retTransfers}次</span>`:'<span class="tag tag-paid">回程直飛</span>'):''}
            ${f.luggage?`<span class="tag tag-fee">🧳 ${f.luggage}</span>`:''}
          </div>
          <!-- 日期 -->
          <div style="display:flex;gap:12px;font-size:.68rem;color:var(--muted);">
            <div><span style="color:var(--accent)">出發</span> ${goDepTime}</div>
            ${retDepTime?`<div><span style="color:var(--aurora3)">回程</span> ${retDepTime}</div>`:''}
          </div>
        </div>
      </div>`;
    }).join('') : '';
  const fuelCard = (currentFilter === 'all' || currentFilter === 'fuel') ?
    (fuelItems.length ? fuelItems.map(item => `
      <div class="card paid-card" style="margin-bottom:8px;">
        <div class="card-header">
          <div>
            <div class="card-date">${String(item.date).split('T')[0]||'—'}</div>
            <div class="card-name-row" style="margin-top:4px">
              <span style="font-size:.85rem">⛽</span>
              <span style="font-size:.85rem">${item.fuelBrand||'加油'}</span>
            </div>
          </div>
          <div class="card-price">
            <div class="price-per" style="font-size:1.1rem">${fmt(item.total||item.twd)}</div>
          </div>
        </div>
        <div class="card-body" style="padding:6px 16px 10px;gap:6px;font-size:.63rem;color:var(--muted)">
          ${item.fuelLiters ? `<span>${item.fuelLiters}L</span>` : ''}
          ${item.fuelMileage ? `<span>📍 ${Number(item.fuelMileage).toLocaleString()} km</span>` : ''}
          ${item.fuelEfficiency ? `<span>🔁 ${Number(item.fuelEfficiency).toFixed(1)} km/L</span>` : ''}
        </div>
        <div class="card-body" style="padding:0 16px 10px;gap:4px">
          ${item.payer ? `<span style="display:inline-flex;align-items:center;gap:3px;font-size:.62rem;background:var(--bg3);border:1px solid var(--border);border-radius:4px;padding:1px 5px;color:var(--muted)">付 ${avatarSvg(item.payer)}</span>` : ''}
          ${['猴','花','寧'].filter(m=>(item.burden?.[m]||0)>0).map(m=>`<span style="display:inline-flex;align-items:center;gap:2px;font-size:.62rem;background:var(--bg3);border:1px solid var(--border);border-radius:4px;padding:1px 5px;color:var(--muted)">${avatarSvg(m)} NT$${Math.round(item.burden[m]).toLocaleString()}</span>`).join('')}
        </div>
      </div>`).join('') : `<div class="empty" style="padding:16px;margin-bottom:8px;">⛽ 旅途中加油記錄會顯示在這裡</div>`)
    : '';
  const parkCard = (currentFilter === 'all' || currentFilter === 'parking') ?
    (parkItems.length ? parkItems.map(item => `
      <div class="card paid-card" style="margin-bottom:8px;">
        <div class="card-header">
          <div>
            <div class="card-date">${String(item.date).split('T')[0]||'—'}</div>
            <div class="card-name-row" style="margin-top:4px">
              <span>🅿</span>
              <span style="font-size:.85rem">${item.location||item.title||'停車費'}</span>
            </div>
          </div>
          <div class="card-price">
            <div class="price-per" style="font-size:1.1rem">${fmt(item.total||item.twd)}</div>
          </div>
        </div>
      </div>`).join('') : `<div class="empty" style="padding:16px;margin-bottom:8px;">🅿 旅途中停車費記錄會顯示在這裡</div>`)
    : '';
  return `<div class="filter-row">${filterBtns}</div>${carCard}${flightCards}${fuelCard}${parkCard}`;
}

window.setTransportFilter = function(f) {
  window._transportFilter = f;
  const d = window.APP_DATA || window.STATIC;
  document.getElementById('carContent').innerHTML = renderTransport(d);
};

function renderCar(car){
  const pickup  = car.pickup  || '—';
  const dropoff = car.dropoff || '—';
  const companyRaw = car.company || '';
  const modelRaw   = car.model   || '';
  const isUsed     = /used/i.test(modelRaw);
  const modelClean = modelRaw.replace(/\(.*?\)/g,'').replace(/\n.*/,'').trim();
  return `
    <div class="car-card">
      <div class="car-header" style="padding:10px 16px 14px">
        <div style="font-size:.6rem;color:var(--muted);background:var(--bg3);
                    border:1px solid var(--border);border-radius:4px;
                    padding:1px 6px;letter-spacing:.08em;display:inline-block;margin-bottom:8px">🚗 租車</div>
        <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
          <div class="car-title" style="font-size:1.05rem">${companyRaw}</div>
          <div class="car-model" style="font-size:.75rem;color:var(--muted)">${modelClean}</div>
        </div>
      </div>
      <div style="padding:0 16px 14px;border-bottom:1px solid var(--border)">
        <div style="font-size:.78rem;color:var(--text);margin-bottom:4px">${pickup}</div>
        <div style="font-size:.72rem;color:var(--muted);margin-bottom:4px">↓</div>
        <div style="font-size:.78rem;color:var(--text);margin-bottom:10px">${dropoff}</div>
        <div style="font-size:.72rem;color:var(--muted);display:flex;align-items:flex-start;gap:4px">
          <span>📍</span>
          <span style="line-height:1.4">${car.location}</span>
        </div>
      </div>
      <!-- Tags -->
      <div class="card-body" style="padding:10px 16px;gap:5px">
        <span class="tag tag-person" style="display:inline-flex;align-items:center;gap:3px">
          付款 ${avatarSvg(car.payer)}
        </span>
        <span class="tag tag-cancel">${car.days} 天</span>
        ${isUsed ? `<span class="tag" style="background:rgba(79,195,247,.08);color:var(--muted);border:1px solid var(--border)">Used Model</span>` : ''}
        ${car.code ? `<span class="tag tag-fee">${car.code}</span>` : ''}
      </div>
      <!-- 金額 -->
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
    <div class="section-title">保險項目</div>
    <div class="car-card"><ul class="insurance-list">${(car.insurance||[]).map(i=>`<li>${i}</li>`).join('')}</ul></div>
    <div class="section-title">駕駛資訊</div>
    <div class="car-card">
      <div class="card-body" style="padding:13px 16px">
        <span class="tag tag-person" style="display:inline-flex;align-items:center;gap:3px;padding:2px 6px;">主要駕駛 ${avatarSvg(car.driver1)}</span>
        <span class="tag tag-person" style="display:inline-flex;align-items:center;gap:3px;padding:2px 6px;">副駕駛 ${avatarSvg(car.driver2)}</span>
      </div>
    </div>
  `;
}

// ── 機票顯示模式（全域狀態，renderAll 和 updatePixelBudget 共用）
// 'none'  → 不含機票
// 'equal' → 三人均分
// '花'/'猴'/'寧' → 顯示該人自己的機票
if(window._flightMode === undefined) window._flightMode = 'equal';

// ── 依 flightMode 算「/人顯示金額」和「合計顯示金額」