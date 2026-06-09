// render-ledger.js — 帳簿：圓餅圖、機票選擇器、分帳計算

// ── 各模式計算邏輯
// sharedTotal = 租車 + 住宿 + 活動 + 共同雜支（不含機票、不含個人雜支）
// 模式1 無機票：顯示 sharedTotal/3，分母 sharedTotal，機票隱藏，雜支只含共同
// 模式2 平均：  顯示 (sharedTotal+allFlight)/3，分母同，機票 allFlight/3
// 模式3 成員X：顯示 sharedTotal/3 + X機票 + X雜支burden總和，分母同，機票X個人，雜支X總負擔

function calcFlightDisplay(sharedTotal, totalFlight, flights, expenses, carTotal, totalAccom, totalActivity){
  const flightByPerson = {};
  (flights||[]).forEach(f=>{
    flightByPerson[f.person] = (flightByPerson[f.person]||0) + (f.totalTWD||0);
  });

  // 各成員的雜支負擔總額（含共同分攤 + 個人）
  const expBurdenByPerson = {};
  (expenses||[]).forEach(e=>{
    if(e.burden){
      (window.TRIP_MEMBERS || ['花','猴','寧']).forEach(m=>{
        expBurdenByPerson[m] = (expBurdenByPerson[m]||0) + (e.burden[m]||0);
      });
    }
  });

  // 共同雜支總額（模式1、2用）
  const sharedExpTotal = (expenses||[])
    .filter(e=>e.isShared)
    .reduce((s,e)=>s+(e.total||0),0);

  const mode = window._flightMode || 'equal';
  let perPersonAmt, grandDisplay, whoLabel, flightForDisplay, flightLabel, expForDisplay;

  if(mode==='none'){
    // 模式1：不含機票，雜支只含共同部分（已在 sharedTotal 裡）
    perPersonAmt     = sharedTotal / 3;
    grandDisplay     = sharedTotal;
    flightForDisplay = 0;
    expForDisplay    = sharedExpTotal;   // 進度條顯示共同雜支
    whoLabel         = '不含機票';
    flightLabel      = '—';

  } else if(mode==='equal'){
    // 模式2：含機票均分，雜支只含共同部分
    perPersonAmt     = (sharedTotal + totalFlight) / 3;
    grandDisplay     = sharedTotal + totalFlight;
    flightForDisplay = totalFlight;
    expForDisplay    = sharedExpTotal;
    whoLabel         = '+ 機票均分';
    flightLabel      = fmt(totalFlight / 3);

  } else {
    // 模式3：成員 X 的全部花費
    const personalFlight = flightByPerson[mode] || 0;
    const personalExp    = expBurdenByPerson[mode] || 0;
    // sharedTotal 已含共同雜支，shared/3 裡已含共同雜支分攤
    // personalExp = 該成員 burden 總和（含共同分攤 + 個人），所以要扣掉 shared雜支的 1/3 避免重複
    const sharedExpPerPerson = sharedExpTotal / 3;
    perPersonAmt     = sharedTotal / 3 + personalFlight + (personalExp - sharedExpPerPerson);
    grandDisplay     = perPersonAmt;   // 分母就是這個人的總花費
    flightForDisplay = personalFlight;
    expForDisplay    = personalExp;    // 進度條顯示該成員 burden 總和
    whoLabel = [
      personalFlight ? `+ 機票 ${fmt(personalFlight)}`    : '',
      (personalExp - sharedExpPerPerson) > 0
        ? `+ 個人消費 ${fmt(personalExp - sharedExpPerPerson)}` : '',
    ].filter(Boolean).join('｜') || '含機票及個人消費';
    flightLabel = fmt(personalFlight);
  }

  // ── 圓餅比例（集中在這裡算，外部直接用 pcts，不再各自重算）
  const pt = grandDisplay || 1;
  const isMember = !['none','equal'].includes(mode);
  const pcts = {
    car:    (isMember ? carTotal/3      : carTotal)      / pt,
    flight: flightForDisplay                             / pt,
    accom:  (isMember ? totalAccom/3    : totalAccom)    / pt,
    act:    (isMember ? totalActivity/3 : totalActivity) / pt,
    exp:    expForDisplay                                / pt,
  };

  return {
    perPersonAmt, grandDisplay, whoLabel,
    flightByPerson, flightForDisplay, flightLabel,
    expForDisplay, pcts,
  };
}

// ── 畫圓餅（canvas，在 renderAll 之後由 initDonutCanvas 呼叫）
function drawDonutCanvas(carPct, flightPct, accomPct, actPct, expPct){
  const cv = document.getElementById('donutCanvas');
  if(!cv) return;
  const ctx = cv.getContext('2d');
  const G=32, S=4.375, cx=15.5, cy=15.5, rO=13.5, rI=8.5;
  ctx.clearRect(0,0,cv.width,cv.height);
  const slices=[
    {pct:carPct,       color:'#f0c040'},
    {pct:flightPct,    color:'#4fc3f7'},
    {pct:accomPct,     color:'#7c4dff'},
    {pct:actPct,       color:'#4caf6e'},
    {pct:expPct||0,    color:'#f06292'},
  ];
  // 最後一個有值的 slice 顏色（浮點誤差補救用）
  const lastColor = [...slices].reverse().find(s=>s.pct>0)?.color || '#1e3a5f';
  function ac(a){
    let c=0;
    for(const s of slices){if(s.pct<=0)continue;c+=s.pct*2*Math.PI;if(a<=c)return s.color;}
    return lastColor; // 浮點誤差造成的殘餘像素，用最後一個 slice 的顏色填
  }
  for(let r=0;r<G;r++) for(let c=0;c<G;c++){
    const dx=c-cx, dy=r-cy, d=Math.sqrt(dx*dx+dy*dy);
    const col = d<rI?'#0d1f35': d>rO?null: ac((Math.atan2(dx,-dy)+2*Math.PI)%(2*Math.PI));
    if(!col) continue;
    ctx.fillStyle=col; ctx.fillRect(c*S,r*S,S,S);
  }
}

// ── 初始化圓餅中心卷軸選擇器
function initDonutPicker(){
  const PICKER_OPTIONS=[
    {key:'none',  gray:true },
    {key:'equal', gray:false},
    ...(window.TRIP_MEMBERS || ['花','猴','寧']).map(name => ({key: name})),
  ];
  const ITEM_H = 58;
  const list = document.getElementById('donutPickerList');
  if(!list) return;

  function itemIcon(opt){
    if((window.TRIP_MEMBERS || ['花','猴','寧']).includes(opt.key)){
      return `<div style="transform:scale(1.05);transform-origin:center;line-height:0">${avatarSvg(opt.key)}</div>`;
    }
    if(opt.gray){
      return `<div style="position:relative;display:inline-flex;align-items:center;justify-content:center;">
        <span style="font-size:22px;filter:grayscale(1);opacity:.45;">✈️</span>
        <span style="position:absolute;font-size:13px;color:#e05555;font-weight:900;
                     text-shadow:0 0 4px rgba(0,0,0,.8);line-height:1;">✕</span>
      </div>`;
    }
    return `<span style="font-size:22px;">⚖️</span>`;
  }

  const pad = `<div style="height:${ITEM_H}px;flex-shrink:0;"></div>`;
  list.innerHTML = pad + PICKER_OPTIONS.map(opt=>{
    const isSel = opt.key===window._flightMode;
    return `<div class="donut-picker-item" data-key="${opt.key}"
      style="height:${ITEM_H}px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
             background:${isSel?'rgba(79,195,247,.12)':'rgba(7,17,31,.55)'};
             scroll-snap-align:center;transition:background .15s;cursor:pointer;">
      ${itemIcon(opt)}
    </div>`;
  }).join('') + pad;

  const idx = PICKER_OPTIONS.findIndex(o=>o.key===window._flightMode);
  list.scrollTop = (idx+1)*ITEM_H;

  list.addEventListener('click', e=>{
    const item = e.target.closest('.donut-picker-item');
    if(!item) return;
    const curIdx = PICKER_OPTIONS.findIndex(o=>o.key===window._flightMode);
    const nextIdx = (curIdx+1) % PICKER_OPTIONS.length;
    window._flightMode = PICKER_OPTIONS[nextIdx].key;
    list.scrollTo({top:(nextIdx+1)*ITEM_H, behavior:'smooth'});
    updatePickerStyle();
    refreshDonut();
    window.updatePixelBudget?.();
  });

  let t;
  list.addEventListener('scroll',()=>{
    clearTimeout(t);
    t=setTimeout(()=>{
      const i = Math.round(list.scrollTop/ITEM_H)-1;
      const clamped = Math.max(0,Math.min(i,PICKER_OPTIONS.length-1));
      const newKey = PICKER_OPTIONS[clamped].key;
      if(newKey!==window._flightMode){
        window._flightMode = newKey;
        updatePickerStyle();
        refreshDonut();
        window.updatePixelBudget?.();
      }
    },80);
  },{passive:true});

  function updatePickerStyle(){
    list.querySelectorAll('.donut-picker-item').forEach(el=>{
      el.style.background = el.dataset.key===window._flightMode
        ? 'rgba(79,195,247,.12)' : 'rgba(7,17,31,.55)';
    });
  }
}

// ── 只更新圓餅+數字+小計（不重建整個頁面）
function refreshDonut(){
  const d = window.APP_DATA||window.STATIC;
  const totalAccom    = d.accommodation.reduce((s,a)=>s+(a.twd||0),0);
  const totalActivity = (d.activity||[]).reduce((s,a)=>s+(a.twd||0),0);
  const totalFlight   = d.totalFlightTWD||0;
  const carTotal      = d.car.totalTWD||0;
  const expenses      = d.expenses||[];

  const totalExpenseShared = expenses.filter(e=>e.isShared).reduce((s,e)=>s+(e.total||0),0);
  const sharedTotal = carTotal + totalAccom + totalActivity + totalExpenseShared;

  const {
    perPersonAmt, grandDisplay, whoLabel,
    flightForDisplay, flightLabel, expForDisplay, pcts,
  } = calcFlightDisplay(sharedTotal, totalFlight, d.flights, expenses, carTotal, totalAccom, totalActivity);

  // 數字區
  const elAmt    = document.getElementById('donutPerPerson');
  const elWho    = document.getElementById('donutWhoLabel');
  const elAll    = document.getElementById('donutGrandTotal');
  const elApprox = document.getElementById('donutApprox');
  if(elAmt)    elAmt.textContent  = Math.round(perPersonAmt).toLocaleString('zh-TW');
  if(elWho)    elWho.innerHTML    = whoLabel.replace(/｜/g,'<br>');
  if(elAll)    elAll.textContent  = '合計 '+fmt(grandDisplay);
  if(elApprox) elApprox.textContent = (window._flightMode==='equal')?'約':'';

  // 圓餅 & Legend（比例由 calcFlightDisplay 統一提供）
  drawDonutCanvas(pcts.car, pcts.flight, pcts.accom, pcts.act, pcts.exp);
  const elLegend = document.getElementById('donutLegend');
  if(elLegend) elLegend.innerHTML = buildLegend(pcts.car, pcts.flight, pcts.accom, pcts.act, pcts.exp);

  // 小計進度條
  const elCat = document.getElementById('catRowsContent');
  if(elCat) elCat.innerHTML = buildCatRows(
    carTotal, flightForDisplay, flightLabel,
    totalAccom, totalActivity,
    grandDisplay, expForDisplay
  );
}

// ── 各類別進度條
// expForDisplay：
//   模式1/2 = 共同雜支總額（已含在 sharedTotal，三人均分）
//   模式3   = 該成員的 burden 加總（含共同分攤 + 個人）
function buildCatRows(carTotal, flightForDisplay, flightLabel, totalAccom, totalActivity, grandTotal, expForDisplay){
  const mode = window._flightMode||'equal';
  const gt   = grandTotal||1;
  const expTotal = expForDisplay||0;

  // 模式1/2：各項 /人 = 三人均分；模式3：顯示該成員自己的數字
  const isMember = (mode!=='none' && mode!=='equal');

  const cats=[
    {
      label:'🚗 租車',
      total: carTotal,
      perLabel: isMember ? fmt(carTotal/3)         : fmt(carTotal/3),
      color:'#f0c040',
      pct: carTotal/gt,
    },
    {
      label:'✈️ 機票',
      total: flightForDisplay,
      perLabel: flightLabel,
      color:'#4fc3f7',
      pct: flightForDisplay/gt,
    },
    {
      label:'🏕 住宿',
      total: totalAccom,
      perLabel: isMember ? fmt(totalAccom/3)       : fmt(totalAccom/3),
      color:'#7c4dff',
      pct: totalAccom/gt,
    },
    {
      label:'🎯 活動',
      total: totalActivity,
      perLabel: isMember ? fmt(totalActivity/3)    : fmt(totalActivity/3),
      color:'#4caf6e',
      pct: totalActivity/gt,
    },
    {
      label: '🛒 雜支',
      total: expTotal,
      perLabel: isMember ? fmt(expTotal) : fmt(expTotal/3),
      color:'#f06292',
      pct: expTotal/gt,
      noPerPerson: isMember,
    },
    {
      label:'🛡 保險',
      total: 0,
      perLabel:'—',
      color:'#26c6da',
      pct: 0,
    },
  ];

  return cats.map(c=>`
    <div style="margin-bottom:9px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px">
        <span style="font-size:.72rem;color:var(--text)">${c.label}</span>
        <span style="font-family:'Cinzel',serif;font-size:.8rem;color:var(--gold)">${c.total?c.perLabel:'—'}<span style="font-size:.6em;color:var(--muted)">${c.noPerPerson?'':'/人'}</span></span>
      </div>
      <div style="height:5px;background:var(--bg3);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${(c.pct*100).toFixed(1)}%;background:${c.color};border-radius:3px;transition:width .6s"></div>
      </div>
      <div style="font-size:.63rem;color:var(--muted);margin-top:2px">合計 ${c.total?fmt(c.total):'—'}</div>
    </div>`).join('');
}

// ── 圓餅 Legend（六項，兩排各三個）
function buildLegend(carPct, flightPct, accomPct, actPct, expPct){
  const mode = window._flightMode||'equal';
  const items = [
    {color:'#f0c040', label:'租車', pct:carPct},
    {color:'#4fc3f7', label:'機票', pct:flightPct, hideOnNone:true},
    {color:'#7c4dff', label:'住宿', pct:accomPct},
    {color:'#4caf6e', label:'活動', pct:actPct},
    {color:'#f06292', label:'雜支', pct:expPct||0},
    {color:'#26c6da', label:'保險', pct:0},
  ];
  const visible = items.filter(l => !(l.hideOnNone && mode==='none'));
  return `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px 8px;width:100%">
    ${visible.map(l=>`<span style="font-size:.62rem;display:flex;align-items:center;gap:3px;white-space:nowrap;">
      <span style="width:7px;height:7px;flex-shrink:0;background:${l.color};display:inline-block;border-radius:1px"></span>
      ${l.label} ${l.pct>0?(l.pct*100).toFixed(0)+'%':'—'}
    </span>`).join('')}
  </div>`;
}