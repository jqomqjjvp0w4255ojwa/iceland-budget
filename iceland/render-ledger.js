// render-ledger.js — 帳簿：圓餅圖、機票選擇器、分帳計算

function calcFlightDisplay(sharedTotal, totalFlight, flights){
  const flightByPerson = {};
  (flights||[]).forEach(f=>{ flightByPerson[f.person] = (flightByPerson[f.person]||0) + (f.totalTWD||0); });
  const mode = window._flightMode;
  let perPersonAmt, grandDisplay, whoLabel, flightForDisplay, flightLabel;
  if(mode==='none'){
    perPersonAmt     = sharedTotal/3;
    grandDisplay     = sharedTotal;
    flightForDisplay = 0;
    whoLabel         = '不含機票';
    flightLabel      = '—';
  } else if(mode==='equal'){
    perPersonAmt     = (sharedTotal + totalFlight)/3;
    grandDisplay     = sharedTotal + totalFlight;
    flightForDisplay = totalFlight;
    whoLabel         = '+ 機票均分';
    flightLabel      = fmt(totalFlight/3);
  } else {
    const personal    = flightByPerson[mode]||0;
    const personalExp = (window.APP_DATA||window.STATIC).split?.[mode]?.personal || 0;
    perPersonAmt      = sharedTotal/3 + personal + personalExp;
    grandDisplay      = sharedTotal + personal;
    flightForDisplay  = personal;
    // whoLabel 改成多行，0時不顯示個人消費那行
    whoLabel = [
      personal    ? `+ 機票 ${fmt(personal)}`        : '',
      personalExp ? `+ 個人消費 ${fmt(personalExp)}` : '',
    ].filter(Boolean).join('｜') || '+ 機票及個人消費';
    flightLabel = fmt(personal);
  }
  return { perPersonAmt, grandDisplay, whoLabel, flightByPerson, flightForDisplay, flightLabel };
}

// ── 畫圓餅（canvas，在 renderAll 之後由 initDonutCanvas 呼叫）
function drawDonutCanvas(carPct, flightPct, accomPct, actPct){
  const cv = document.getElementById('donutCanvas');
  if(!cv) return;
  const ctx = cv.getContext('2d');
  // 140px canvas，32格，每格 4.375px；rI=8 讓中心夠大放選擇器
  const G=32, S=4.375, cx=15.5, cy=15.5, rO=13.5, rI=8.5;
  ctx.clearRect(0,0,cv.width,cv.height);
  const slices=[
    {pct:carPct,    color:'#f0c040'},
    {pct:flightPct, color:'#4fc3f7'},
    {pct:accomPct,  color:'#7c4dff'},
    {pct:actPct,    color:'#4caf6e'},
  ];
  function ac(a){
    let c=0;
    for(const s of slices){if(s.pct<=0)continue;c+=s.pct*2*Math.PI;if(a<=c)return s.color;}
    return '#1e3a5f';
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
    {key:'花'},
    {key:'猴'},
    {key:'寧'},
  ];
  const ITEM_H = 58;
  const list = document.getElementById('donutPickerList');
  if(!list) return;

  function itemIcon(opt){
    if(opt.key==='花'||opt.key==='猴'||opt.key==='寧'){
      // 角色頭像，scale 放大讓圖更清晰
      return `<div style="transform:scale(1.05);transform-origin:center;line-height:0">${avatarSvg(opt.key)}</div>`;
    }
    if(opt.gray){
      // 不含：✈️ + 小叉叉疊加
      return `<div style="position:relative;display:inline-flex;align-items:center;justify-content:center;">
        <span style="font-size:22px;filter:grayscale(1);opacity:.45;">✈️</span>
        <span style="position:absolute;font-size:13px;color:#e05555;font-weight:900;
                     text-shadow:0 0 4px rgba(0,0,0,.8);line-height:1;">✕</span>
      </div>`;
    }
    // 均分：天平
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

  // 捲到選中位置
  const idx = PICKER_OPTIONS.findIndex(o=>o.key===window._flightMode);
  list.scrollTop = (idx+1)*ITEM_H;

  // ── 點選：點一下換下一個選項
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

  // ── 滾動結束後也更新
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
  const totalAccom   = d.accommodation.reduce((s,a)=>s+(a.twd||0),0);
  const totalActivity= (d.activity||[]).reduce((s,a)=>s+(a.twd||0),0);
  const totalFlight  = d.totalFlightTWD||0;
  const carTotal     = d.car.totalTWD||0;
  const sharedTotal  = carTotal+totalAccom+totalActivity;
  const {perPersonAmt, grandDisplay, whoLabel, flightForDisplay, flightLabel} =
    calcFlightDisplay(sharedTotal, totalFlight, d.flights);

  // grandForCat = grandDisplay（已依 mode 計算好）
  const grandForCat = grandDisplay;

  // 數字
  const elAmt    = document.getElementById('donutPerPerson');
  const elWho    = document.getElementById('donutWhoLabel');
  const elAll    = document.getElementById('donutGrandTotal');
  const elApprox = document.getElementById('donutApprox');
  if(elAmt)    elAmt.textContent    = Math.round(perPersonAmt).toLocaleString('zh-TW');
  if(elWho)    elWho.innerHTML    = whoLabel.replace(/｜/g,'<br>');
  if(elAll)    elAll.textContent    = '合計 '+fmt(grandDisplay);
  if(elApprox) elApprox.textContent = (window._flightMode==='equal')?'約':'';

  // 圓餅：分母用 grandDisplay，分子用 flightForDisplay，比例正確
  const pt = grandDisplay||1;
  drawDonutCanvas(carTotal/pt, flightForDisplay/pt, totalAccom/pt, totalActivity/pt);

  // Legend（不含機票時隱藏機票項）
  const elLegend = document.getElementById('donutLegend');
  if(elLegend) elLegend.innerHTML = buildLegend(carTotal/pt, flightForDisplay/pt, totalAccom/pt, totalActivity/pt);

  // 小計進度條
  const elCat = document.getElementById('catRowsContent');
  if(elCat) elCat.innerHTML = buildCatRows(carTotal, flightForDisplay, flightLabel, totalAccom, totalActivity, grandForCat);
}

// ── 各類別進度條（模組級函式，refreshDonut 和 renderAll 都可呼叫）
// flightForDisplay：已依 mode 算好的機票金額（0/個人/三人總）
// flightLabel：已算好的 /人 顯示文字
function buildCatRows(carTotal, flightForDisplay, flightLabel, totalAccom, totalActivity, grandTotal){
  const gt = grandTotal||1;
  const cats=[
    {label:'🚗 租車', total:carTotal,          perLabel:fmt(carTotal/3),      color:'#f0c040', pct:carTotal/gt},
    {label:'✈️ 機票', total:flightForDisplay,  perLabel:flightLabel,          color:'#4fc3f7', pct:flightForDisplay/gt},
    {label:'🏕 住宿', total:totalAccom,        perLabel:fmt(totalAccom/3),    color:'#7c4dff', pct:totalAccom/gt},
    {label:'🎯 活動', total:totalActivity,     perLabel:fmt(totalActivity/3), color:'#4caf6e', pct:totalActivity/gt},
    {label:'🛒 雜支',  total:0,                 perLabel:'—',                  color:'#4fc3f7', pct:0},
    {label:'🛡 保險',  total:0,                 perLabel:'—',                  color:'#e07040', pct:0},
  ];
  return cats.map(c=>`
    <div style="margin-bottom:9px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px">
        <span style="font-size:.72rem;color:var(--text)">${c.label}</span>
        <span style="font-family:'Cinzel',serif;font-size:.8rem;color:var(--gold)">${c.total?c.perLabel:'—'}<span style="font-size:.6em;color:var(--muted)">/人</span></span>
      </div>
      <div style="height:5px;background:var(--bg3);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${(c.pct*100).toFixed(1)}%;background:${c.color};border-radius:3px;transition:width .6s"></div>
      </div>
      <div style="font-size:.63rem;color:var(--muted);margin-top:2px">合計 ${c.total?fmt(c.total):'—'}</div>
    </div>`).join('');
}

// ── 圓餅 Legend（模組級，不含機票時隱藏機票那行）
function buildLegend(carPct, flightPct, accomPct, actPct){
  const mode = window._flightMode||'equal';
  const items = [
    {color:'#f0c040', label:'租車', pct:carPct,    always:true},
    {color:'#4fc3f7', label:'機票', pct:flightPct, always:false},
    {color:'#7c4dff', label:'住宿', pct:accomPct,  always:true},
    {color:'#4caf6e', label:'活動', pct:actPct,    always:true},
  ];
  return items
    .filter(l => l.always || mode!=='none')
    .map(l=>`<span style="font-size:.62rem;display:flex;align-items:center;gap:3px">
      <span style="width:7px;height:7px;background:${l.color};display:inline-block;border-radius:1px"></span>
      ${l.label} ${l.pct>0?(l.pct*100).toFixed(0)+'%':'—'}
    </span>`).join('');
}
