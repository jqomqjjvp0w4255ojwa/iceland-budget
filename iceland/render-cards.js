// render-cards.js — 卡片渲染：住宿、日常開銷、還款、交通

function renderDaily(expenses) {
  const items = (expenses||[]).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));
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

function renderFlightSegs(segs) {
  return segs.map(s => {
    const flightNoTag = s.flightNo ? '<span class="tag tag-person" style="margin-left:auto;">' + s.flightNo + '</span>' : '';
    const airlineDiv  = s.airline  ? '<div style="font-size:.68rem;color:var(--muted);">' + s.airline + '</div>' : '';
    const transitDiv  = s.isTransit ? '<div style="font-size:.68rem;color:#ffa726;">🔄 轉機' + (s.wait ? ' · 等待 ' + s.wait : '') + '</div>' : '';
    return '<div style="padding:6px 0;border-bottom:1px solid var(--border);">'
      + '<div style="display:flex;align-items:center;gap:6px;font-size:.78rem;">'
      + '<span style="color:var(--accent2);font-weight:700;">' + s.from + (s.fromTerm ? ' (' + s.fromTerm + ')' : '') + '</span>'
      + '<span style="color:var(--muted);">→</span>'
      + '<span style="color:var(--accent2);font-weight:700;">' + s.to + (s.toTerm ? ' (' + s.toTerm + ')' : '') + '</span>'
      + flightNoTag
      + '</div>'
      + '<div style="font-size:.68rem;color:var(--muted);margin-top:3px;">' + (s.depTime || '—') + ' → ' + (s.arrTime || '—') + '</div>'
      + airlineDiv + transitDiv
      + '</div>';
  }).join('');
}

function renderInfoFlights(flights) {
  if (!flights || !flights.length) return '<div class="empty">✈️ 航班資訊填入後顯示</div>';

  // 解析時間字串 "2:45:00" 或 "2:45" → 總分鐘數
  function parseTimeToMin(str) {
    if (!str) return 0;
    const s = String(str).trim();
    // 格式 A：3h45 / 3h45m / 3h / 45m
    const hm = s.match(/^(\d+)h(\d*)/);
    if (hm) return parseInt(hm[1]) * 60 + (parseInt(hm[2]) || 0);
    const mOnly = s.match(/^(\d+)m$/);
    if (mOnly) return parseInt(mOnly[1]);
    // 格式 B：HH:MM / H:MM
    const parts = s.split(':').map(Number);
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1]))
      return parts[0] * 60 + parts[1];
    return 0;
  }

  // 分鐘數 → "Xh Ym"
  function minToHM(min) {
    if (!min) return '';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h${m > 0 ? m + 'm' : ''}` : `${m}m`;
  }

  // 總飛行時間 = 各段 flightTime 加總（純飛行，不含轉機等待）
  function totalFlightTime(segs) {
    const total = segs.reduce((s, seg) => s + parseTimeToMin(seg.flightTime), 0);
    return minToHM(total);
  }

  // 段落詳情渲染（接收整個陣列，在段間插入轉機等待）
  function segDetails(segs, direction) {
    return segs.map((s, i) => {
      const parseTime = t => {
        if (!t) return {date:'—', time:'—'};
        const str = String(t).replace('T',' ');
        const parts = str.slice(0,16).split(' ');
        return { date: parts[0]||'—', time: parts[1]||str.slice(0,5)||'—' };
      };
      const dep = parseTime(s.depTime);
      const arr = parseTime(s.arrTime);
      // 這段之後的轉機等待（用下一段的 waitTime）
      const nextWait = segs[i+1]?.waitTime;
      const waitDiv = nextWait ? `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 4px;color:var(--aurora3);font-size:.63rem;">
          <div style="flex:1;height:1px;background:var(--border)"></div>
          ⏱ 轉機等待 ${nextWait}
          <div style="flex:1;height:1px;background:var(--border)"></div>
        </div>` : '';
      return `
        <div style="border-radius:8px;padding:10px 12px;margin-bottom:4px;
          background-color:${direction==='去程'?'#071e30':'#0d2018'};
          background-image:${direction==='去程'?
            'linear-gradient(rgba(79,195,247,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(79,195,247,.08) 1px,transparent 1px)':
            'linear-gradient(rgba(100,210,130,.09) 1px,transparent 1px),linear-gradient(90deg,rgba(100,210,130,.09) 1px,transparent 1px)'};
          background-size:8px 8px;
          border:1px solid ${direction==='去程'?'rgba(79,195,247,.25)':'rgba(100,210,130,.3)'};"
        >
          <!-- 出發→目的地 + 時間 整合 -->
          <div style="display:flex;align-items:stretch;gap:6px;margin-bottom:6px;">
            <!-- 出發 -->
            <div style="text-align:center;min-width:58px;">
              <div style="font-family:'Cinzel',serif;font-size:1.1rem;color:var(--accent2);font-weight:600;line-height:1">${s.from}</div>
              ${s.fromTerm?`<div style="font-size:.58rem;color:var(--muted)">T${s.fromTerm}</div>`:''}
              <div style="font-family:'Cinzel',serif;font-size:.95rem;color:var(--text);font-weight:600;margin-top:4px;line-height:1">${dep.time||'—'}</div>
              <div style="font-size:.58rem;color:var(--muted);margin-top:1px">${dep.date}</div>
            </div>
            <!-- 中間箭頭 -->
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;">
              <div style="font-size:.6rem;color:var(--muted)">${s.flightTime||''}</div>
              <div style="display:flex;align-items:center;width:100%;gap:2px;">
                <div style="flex:1;height:1px;background:linear-gradient(90deg,var(--accent),${s.isTransit?'var(--aurora3)':'var(--green)'})"></div>
                <div style="font-size:.6rem;color:${s.isTransit?'var(--aurora3)':'var(--green)'}">›</div>
              </div>
              <div style="font-size:.58rem;color:var(--muted)">${s.flightNo||''}</div>
            </div>
            <!-- 目的地 -->
            <div style="text-align:center;min-width:58px;">
              <div style="font-family:'Cinzel',serif;font-size:1.1rem;color:${s.isTransit?'var(--aurora3)':'var(--text)'};font-weight:600;line-height:1">${s.to}</div>
              ${s.toTerm?`<div style="font-size:.58rem;color:var(--muted)">T${s.toTerm}</div>`:''}
              ${s.isTransit?`<div style="font-size:.55rem;color:var(--aurora3);margin-top:2px">轉機</div>`:''}
              <div style="font-family:'Cinzel',serif;font-size:.95rem;color:var(--text);font-weight:600;margin-top:4px;line-height:1">${arr.time||'—'}</div>
              <div style="font-size:.58rem;color:var(--muted);margin-top:1px">${arr.date}</div>
            </div>
          </div>
          <!-- 執飛航空 + 機型 -->
          <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:.62rem;color:var(--muted);
                      padding-top:5px;border-top:1px solid var(--border);">
            ${s.operatedBy?`<span>✈️ ${s.operatedBy}</span>`:''}
            ${s.aircraft?`<span>🛩 ${s.aircraft}</span>`:''}
          </div>
          ${s.note?`<div style="font-size:.6rem;color:var(--muted);margin-top:4px;font-style:italic">📌 ${s.note}</div>`:''}
        </div>
        ${waitDiv}`;
    }).join('');
  }

  // 每個人的完整資訊（可能有多張票）
  const byPerson = {};
  flights.forEach(f => {
    if (!byPerson[f.person]) byPerson[f.person] = [];
    byPerson[f.person].push(f);
  });
  const persons = Object.keys(byPerson);
  if (!persons.length) return '<div class="empty">✈️ 航班資訊填入後顯示</div>';

  // 先算每人總飛行時間供標籤顯示
  function personFlightSummary(tickets) {
    const allGo  = tickets.flatMap(t => t.segments.filter(s=>s.direction==='去程'));
    const allRet = tickets.flatMap(t => t.segments.filter(s=>s.direction==='回程'));
    const goTime  = totalFlightTime(allGo);
    const retTime = totalFlightTime(allRet);
    return [goTime?`去 ${goTime}`:'', retTime?`回 ${retTime}`:''].filter(Boolean).join(' · ');
  }

  const tabsHtml = `
    <div style="display:flex;gap:0;margin-bottom:14px;border-bottom:2px solid var(--border);">
      ${persons.map((p,i) => {
        const summary = personFlightSummary(byPerson[p]);
        return `<button onclick="showFlightPerson('${p}')"
          id="flightTab_${p}"
          style="flex:1;background:${i===0?'var(--bg3)':'transparent'};
                 border:none;border-bottom:${i===0?'2px solid var(--accent)':'2px solid transparent'};
                 margin-bottom:-2px;padding:8px 4px;cursor:pointer;
                 display:flex;flex-direction:column;align-items:center;gap:3px;">
          ${avatarSvg(p)}
          <div style="font-family:'Silkscreen',monospace;font-size:7px;color:${i===0?'var(--accent)':'var(--muted)'};line-height:1.5;text-align:center">${summary}</div>
        </button>`;
      }).join('')}
    </div>`;

  const contentHtml = persons.map((p, i) => {
    const tickets = byPerson[p];
    return `<div id="flightContent_${p}" style="display:${i===0?'block':'none'}">
      ${tickets.map(f => {
        const goSegs  = f.segments.filter(s => s.direction === '去程');
        const retSegs = f.segments.filter(s => s.direction === '回程');
        const goTransfers  = goSegs.filter(s => s.isTransit).length;
        const retTransfers = retSegs.filter(s => s.isTransit).length;
        const operators = [...new Set(f.segments.map(s=>s.operatedBy).filter(Boolean))].join(' · ');
        return `
          <!-- 機票摘要卡 -->
          <div style="background:linear-gradient(135deg,var(--bg3),var(--bg2));border:1px solid var(--border);
                      border-radius:10px;padding:12px 14px;margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
              <div>
                <div style="font-size:.9rem;color:var(--text);font-weight:600">${f.airline}</div>
                <div style="font-size:.7rem;color:var(--muted);margin-top:2px">${f.from} → ${f.to} · ${f.type}</div>
                ${operators?`<div style="font-size:.63rem;color:var(--muted);margin-top:2px">執飛：${operators}</div>`:''}
              </div>
              <div style="text-align:right">
                <div style="font-family:'Cinzel',serif;font-size:1rem;color:var(--gold)">${f.totalTWD?fmt(f.totalTWD):'—'}</div>
                <div style="font-size:.62rem;color:var(--muted)">各付各的</div>
              </div>
            </div>
            <div style="display:flex;gap:5px;flex-wrap:wrap;">
              ${goTransfers>0?`<span class="tag tag-cancel">去轉${goTransfers}次</span>`:'<span class="tag tag-paid">去程直飛</span>'}
              ${retSegs.length?(retTransfers>0?`<span class="tag tag-cancel">回轉${retTransfers}次</span>`:'<span class="tag tag-paid">回程直飛</span>'):''}
              ${f.luggage?`<span class="tag tag-fee">🧳 ${f.luggage}</span>`:''}
            </div>
          </div>
          <!-- 去程段落 -->
          ${goSegs.length?`
            <div style="font-size:.68rem;color:var(--accent);letter-spacing:.08em;margin:0 0 6px;
                        display:flex;align-items:center;gap:6px;">
              <span>去程</span>
              <span style="font-size:.6rem;color:var(--muted)">${totalFlightTime(goSegs)||''}</span>
            </div>
            ${segDetails(goSegs,'去程')}`:''}
          <!-- 回程段落 -->
          ${retSegs.length?`
            <div style="font-size:.68rem;color:#a78bfa;letter-spacing:.08em;margin:12px 0 6px;
                        display:flex;align-items:center;gap:6px;">
              <span>回程</span>
              <span style="font-size:.6rem;color:var(--muted)">${totalFlightTime(retSegs)||''}</span>
            </div>
            ${segDetails(retSegs,'回程')}`:''}`;
      }).join('')}
    </div>`;
  }).join('');

  return tabsHtml + contentHtml;
}

window.showFlightPerson = function(person) {
  const persons = Object.keys((window.APP_DATA||window.STATIC).flights?.reduce((acc,f)=>{acc[f.person]=1;return acc;},{})||{});
  persons.forEach(p => {
    const tab = document.getElementById('flightTab_'+p);
    const content = document.getElementById('flightContent_'+p);
    const isActive = p === person;
    if (tab) {
      tab.style.background    = isActive ? 'var(--bg3)' : 'transparent';
      tab.style.borderBottom  = isActive ? '2px solid var(--accent)' : '2px solid transparent';
      tab.querySelector('div').style.color = isActive ? 'var(--accent)' : 'var(--muted)';
    }
    if (content) content.style.display = isActive ? 'block' : 'none';
  });
};

function renderInfo(d) {
  return `
    <div class="tabs" style="margin-top:4px;">
      <button class="tab active" onclick="showInfoTab('prep',this)">📋 行前準備</button>
      <button class="tab" onclick="showInfoTab('flight',this)">✈️ 航班</button>
      <button class="tab" onclick="showInfoTab('car',this)">🚗 取車</button>
      <button class="tab" onclick="showInfoTab('schedule',this)">📅 日程</button>
    </div>
    <div id="infoTab-prep" class="section active">
      <div class="empty">🧳 行前準備清單（建置中）</div>
    </div>
    <div id="infoTab-flight" class="section">
      ${renderInfoFlights(d.flights)}
    </div>
    <div id="infoTab-car" class="section">
      ${renderCarDetail(d.car)}
    </div>
    <div id="infoTab-schedule" class="section">
      <div class="empty">📅 日程 sheet 填入後顯示</div>
    </div>
  `;
}

function renderCarDetail(car) {
  return `
    <div class="car-card">
      <div class="car-header">
        <div class="car-title">${car.company}</div>
        <div class="car-model">${car.model}</div>
      </div>
      <div class="car-grid">
        <div class="car-item">
          <div class="car-item-label">確認碼</div>
          <div class="car-item-value" style="color:var(--gold);font-family:'Cinzel',serif;letter-spacing:.1em">${car.code||'—'}</div>
        </div>
        <div class="car-item">
          <div class="car-item-label">租用天數</div>
          <div class="car-item-value">${car.days} 天</div>
        </div>
        <div class="car-item">
          <div class="car-item-label">取車時間</div>
          <div class="car-item-value" style="font-size:.8rem">${car.pickup}</div>
        </div>
        <div class="car-item">
          <div class="car-item-label">還車時間</div>
          <div class="car-item-value" style="font-size:.8rem">${car.dropoff}</div>
        </div>
        <div class="car-item" style="grid-column:1/-1;border-right:none">
          <div class="car-item-label">取還車地點</div>
          <div class="car-item-value" style="font-size:.78rem;font-weight:400;color:var(--muted)">${car.location}</div>
        </div>
        <div class="car-item" style="grid-column:1/-1;border-right:none;border-top:1px solid var(--border)">
          <div class="car-item-label">取車里程</div>
          <div class="car-item-value">${car.startMileage ? car.startMileage.toLocaleString()+' km' : '<span style="color:var(--muted);font-size:.75rem">待填入</span>'}</div>
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
    <div class="section-title">保險項目</div>
    <div class="car-card"><ul class="insurance-list">${(car.insurance||[]).map(i=>`<li>${i}</li>`).join('')}</ul></div>
    <div class="section-title">駕駛資訊</div>
    <div class="car-card">
      <div class="card-body" style="padding:13px 16px">
        <span class="tag tag-person" style="display:inline-flex;align-items:center;gap:3px;padding:2px 6px;">主要駕駛 ${avatarSvg(car.driver1)}</span>
        <span class="tag tag-person" style="display:inline-flex;align-items:center;gap:3px;padding:2px 6px;">副駕駛 ${avatarSvg(car.driver2)}</span>
        <span class="tag tag-paid" style="display:inline-flex;align-items:center;gap:3px;padding:2px 6px;">付款 ${avatarSvg(car.payer)}</span>
      </div>
    </div>`;
}

window.showInfoTab = function(id, btn) {
  document.querySelectorAll('[id^="infoTab-"]').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('#mainSection-info .tab').forEach(t => t.classList.remove('active'));
  document.getElementById('infoTab-'+id)?.classList.add('active');
  btn.classList.add('active');
};

function renderTransport(d) {
  const car = d.car;
  const flights = d.flights || [];
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
    `<div class="empty" style="padding:16px;margin-bottom:8px;">⛽ 旅途中加油記錄會顯示在這裡</div>` : '';
  const parkCard = (currentFilter === 'all' || currentFilter === 'parking') ?
    `<div class="empty" style="padding:16px;margin-bottom:8px;">🅿 旅途中停車費記錄會顯示在這裡</div>` : '';
  return `<div class="filter-row">${filterBtns}</div>${carCard}${flightCards}${fuelCard}${parkCard}`;
}

window.setTransportFilter = function(f) {
  window._transportFilter = f;
  const d = window.APP_DATA || window.STATIC;
  document.getElementById('carContent').innerHTML = renderTransport(d);
};

function renderCar(car){
  // 取車/還車日期簡化顯示
  const pickup  = car.pickup  || '—';
  const dropoff = car.dropoff || '—';
  return `
    <div class="car-card">
      <div class="car-header" style="position:relative">
        <div style="position:absolute;top:10px;left:12px;font-size:.6rem;color:var(--muted);
                    background:var(--bg3);border:1px solid var(--border);border-radius:4px;
                    padding:1px 6px;letter-spacing:.08em">🚗 租車</div>
        <div style="margin-top:22px">
          <div class="car-title">${car.company}</div>
          <div class="car-model">${car.model}</div>
        </div>
      </div>
      <div style="padding:12px 16px;border-bottom:1px solid var(--border)">
        <!-- 取還車日期 -->
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <div style="flex:1">
            <div style="font-size:.63rem;color:var(--muted);margin-bottom:2px">取車</div>
            <div style="font-size:.82rem;color:var(--text)">${pickup}</div>
          </div>
          <div style="color:var(--muted);font-size:.9rem">→</div>
          <div style="flex:1;text-align:right">
            <div style="font-size:.63rem;color:var(--muted);margin-bottom:2px">還車</div>
            <div style="font-size:.82rem;color:var(--text)">${dropoff}</div>
          </div>
        </div>
        <!-- 取車地點 -->
        <div style="font-size:.72rem;color:var(--muted);display:flex;align-items:flex-start;gap:4px">
          <span>📍</span>
          <span>${car.location}</span>
        </div>
      </div>
      <!-- Tags -->
      <div class="card-body" style="padding:10px 16px;gap:5px">
        <span class="tag tag-person" style="display:inline-flex;align-items:center;gap:3px">
          付款 ${avatarSvg(car.payer)}
        </span>
        <span class="tag tag-cancel">${car.days} 天</span>
        ${car.model ? `<span class="tag" style="background:rgba(79,195,247,.08);color:var(--muted);border:1px solid var(--border)">${car.model.split('\n')[0]}</span>` : ''}
        ${car.code  ? `<span class="tag tag-fee">#{car.code}</span>` : ''}
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