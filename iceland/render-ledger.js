// render-ledger.js — 帳簿：圓餅圖、機票選擇器、分帳計算
//
// ══ 單一來源原則（2026-09-06 重構）══
// 1) 金額：ledgerTotals() 只算一次（住宿/活動含海外手續費，跟分帳表 F+K 對齊）
// 2) 視角：calcLedger() 把三種視角（不含機票/均分/成員）算成一份結果
// 3) 類別：LEDGER_CATS 是唯一的類別清單——進度條、圓餅、圖例、明細
//    全部由它產生。加類別＝加一行，四處自動跟上。

// ── 類別定義（唯一的一份）
// bar(c) → 進度條列 { total, perLabel, noPerPerson?, pct }
// pie(c) → 圓餅/圖例用的金額（0 = 該視角不進餅）
// legendHideOn → 這些視角在圖例整列隱藏（不是顯示 —）
const LEDGER_CATS = [
  { key:'car',    icon:'🚗', label:'租車', color:'#f0c040',
    bar: c => ({ total:c.carTotal, perLabel:fmt(c.carTotal/3), pct:c.carTotal/c.gt }),
    pie: c => c.isMember ? c.carTotal/3 : c.carTotal },
  { key:'flight', icon:'✈️', label:'機票', color:'#4fc3f7', legendHideOn:['none'],
    bar: c => ({ total:c.flightForDisplay, perLabel:c.flightLabel, pct:c.flightForDisplay/c.gt }),
    pie: c => c.flightForDisplay },
  { key:'accom',  icon:'🏕', label:'住宿', color:'#7c4dff',
    bar: c => ({ total:c.totalAccom, perLabel:fmt(c.totalAccom/3), pct:c.totalAccom/c.gt }),
    pie: c => c.isMember ? c.totalAccom/3 : c.totalAccom },
  { key:'act',    icon:'🎯', label:'活動', color:'#4caf6e',
    bar: c => ({ total:c.totalActivity, perLabel:fmt(c.totalActivity/3), pct:c.totalActivity/c.gt }),
    pie: c => c.isMember ? c.totalActivity/3 : c.totalActivity },
  { key:'exp',    icon:'🛒', label:'雜支', color:'#f06292',
    bar: c => ({ total:c.expForDisplay, perLabel:c.isMember?fmt(c.expForDisplay):fmt(c.expForDisplay/3),
                 noPerPerson:c.isMember, pct:c.expForDisplay/c.gt }),
    pie: c => c.expForDisplay },
  // 保險：各自投保。不含機票視角不列；均分視角只列合計（標「各自」，
  // 不進每人應付、不進餅）；成員視角算自己的
  { key:'ins',    icon:'🛡', label:'保險', color:'#26c6da',
    bar: c => ({ total:c.insForDisplay, perLabel:c.isMember?fmt(c.insForDisplay):'各自',
                 noPerPerson:true, pct:c.isMember?c.insForDisplay/c.gt:0 }),
    pie: c => c.isMember ? c.insForDisplay : 0 },
];

// ── 金額總計（只在這裡算）
function ledgerTotals(d){
  const totalAccom    = (d.accommodation||[]).reduce((s,a)=>s+(a.twd||0)+(a.foreignFee||0),0);
  const totalActivity = (d.activity||[]).reduce((s,a)=>s+(a.twd||0)+(a.foreignFee||0),0);
  const totalFlight   = d.totalFlightTWD||0;
  const carTotal      = (d.car&&d.car.totalTWD)||0;
  const sharedExpTotal = (d.expenses||[]).filter(e=>e.isShared).reduce((s,e)=>s+(e.total||0),0);
  const sharedTotal = carTotal + totalAccom + totalActivity + sharedExpTotal;
  return { totalAccom, totalActivity, totalFlight, carTotal, sharedExpTotal, sharedTotal };
}

// ── 三種視角的一次性計算：回傳數字 + 六個類別的完整呈現資料
// 模式1 none：不含機票——純共同花費，機票/保險等個人項目不列
// 模式2 equal：共同 + 機票均分；保險各自投保只列合計
// 模式3 成員X：共同/3 + X機票 + X雜支負擔 + X保費
function calcLedger(d){
  const t = ledgerTotals(d);
  const members = window.TRIP_MEMBERS || ['花','猴','寧'];

  const flightByPerson = {};
  (d.flights||[]).forEach(f=>{ flightByPerson[f.person]=(flightByPerson[f.person]||0)+(f.totalTWD||0); });

  const insByPerson = {};
  let insTotalAll = 0;
  (d.insurancePremiums||[]).forEach(p=>{
    insByPerson[p.member]=(insByPerson[p.member]||0)+(p.twd||0);
    insTotalAll += (p.twd||0);
  });

  const expBurdenByPerson = {};
  (d.expenses||[]).forEach(e=>{
    if(e.burden) members.forEach(m=>{ expBurdenByPerson[m]=(expBurdenByPerson[m]||0)+(e.burden[m]||0); });
  });

  const mode = window._flightMode || 'equal';
  const isMember = !['none','equal'].includes(mode);
  let perPersonAmt, grandDisplay, whoLabel, flightForDisplay, flightLabel, expForDisplay, insForDisplay;

  if(mode==='none'){
    perPersonAmt=t.sharedTotal/3; grandDisplay=t.sharedTotal;
    flightForDisplay=0; flightLabel='—';
    expForDisplay=t.sharedExpTotal; insForDisplay=0;
    whoLabel='不含機票';
  } else if(mode==='equal'){
    perPersonAmt=(t.sharedTotal+t.totalFlight)/3; grandDisplay=t.sharedTotal+t.totalFlight;
    flightForDisplay=t.totalFlight; flightLabel=fmt(t.totalFlight/3);
    expForDisplay=t.sharedExpTotal; insForDisplay=insTotalAll;
    whoLabel='+ 機票均分';
  } else {
    const personalFlight=flightByPerson[mode]||0;
    const personalExp=expBurdenByPerson[mode]||0;
    const personalIns=insByPerson[mode]||0;
    // sharedTotal 已含共同雜支；personalExp 含共同分攤+個人，扣掉 shared/3 避免重複
    const sharedExpPerPerson=t.sharedExpTotal/3;
    perPersonAmt=t.sharedTotal/3+personalFlight+(personalExp-sharedExpPerPerson)+personalIns;
    grandDisplay=perPersonAmt;
    flightForDisplay=personalFlight; flightLabel=fmt(personalFlight);
    expForDisplay=personalExp; insForDisplay=personalIns;
    whoLabel=[
      personalFlight?`+ 機票 ${fmt(personalFlight)}`:'',
      (personalExp-sharedExpPerPerson)>0?`+ 個人消費 ${fmt(personalExp-sharedExpPerPerson)}`:'',
      personalIns?`+ 保險 ${fmt(personalIns)}`:'',
    ].filter(Boolean).join('｜')||'含機票及個人消費';
  }

  // 六個類別統一從這份 context 產生（進度條與圓餅資料）
  const c = { ...t, mode, isMember, gt:grandDisplay||1,
              flightForDisplay, flightLabel, expForDisplay, insForDisplay };
  const cats = LEDGER_CATS.map(cat=>({
    key:cat.key, icon:cat.icon, label:cat.label, color:cat.color,
    legendHideOn:cat.legendHideOn||[],
    bar:cat.bar(c),
    piePct:cat.pie(c)/(grandDisplay||1),
  }));

  return { mode, perPersonAmt, grandDisplay, whoLabel, cats };
}

// ── 畫圓餅（canvas，在 renderAll 之後由 initDonutCanvas 呼叫）
function drawDonutCanvas(cats){
  const cv = document.getElementById('donutCanvas');
  if(!cv) return;
  const ctx = cv.getContext('2d');
  const G=32, S=4.375, cx=15.5, cy=15.5, rO=13.5, rI=8.5;
  ctx.clearRect(0,0,cv.width,cv.height);
  const slices = cats.map(c=>({ pct:c.piePct||0, color:c.color }));
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
  if(!d || !d.accommodation) return;
  const L = calcLedger(d);

  // 數字區
  const elAmt    = document.getElementById('donutPerPerson');
  const elWho    = document.getElementById('donutWhoLabel');
  const elAll    = document.getElementById('donutGrandTotal');
  const elApprox = document.getElementById('donutApprox');
  if(elAmt)    elAmt.textContent  = Math.round(L.perPersonAmt).toLocaleString('zh-TW');
  if(elWho)    elWho.innerHTML    = L.whoLabel.replace(/｜/g,'<br>');
  if(elAll)    elAll.textContent  = '合計 '+fmt(L.grandDisplay);
  if(elApprox) elApprox.textContent = (L.mode==='equal')?'約':'';

  // 圓餅、圖例、進度條：全部由同一份 L.cats 產生
  drawDonutCanvas(L.cats);
  const elLegend = document.getElementById('donutLegend');
  if(elLegend) elLegend.innerHTML = buildLegend(L.cats);
  const elCat = document.getElementById('catRowsContent');
  if(elCat) elCat.innerHTML = buildCatRows(L.cats);
}

// ── 各類別進度條
// expForDisplay：
//   模式1/2 = 共同雜支總額（已含在 sharedTotal，三人均分）
//   模式3   = 該成員的 burden 加總（含共同分攤 + 個人）
function buildCatRows(cats){
  return cats.map(c=>{
    const b = c.bar;
    return `
    <div style="margin-bottom:9px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px">
        <span style="font-size:.72rem;color:var(--text)">${c.icon} ${c.label}</span>
        <span style="font-family:'Cinzel',serif;font-size:.8rem;color:var(--gold)">${b.total?b.perLabel:'—'}<span style="font-size:.6em;color:var(--muted)">${b.noPerPerson?'':'/人'}</span></span>
      </div>
      <div style="height:5px;background:var(--bg3);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${((b.pct||0)*100).toFixed(1)}%;background:${c.color};border-radius:3px;transition:width .6s"></div>
      </div>
      <div style="font-size:.63rem;color:var(--muted);margin-top:2px">合計 ${b.total?fmt(b.total):'—'}</div>
    </div>`;
  }).join('');
}

// ── 圓餅 Legend（六項，兩排各三個）
function buildLegend(cats){
  const mode = window._flightMode||'equal';
  const visible = cats.filter(c => !c.legendHideOn.includes(mode));
  return `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px 8px;width:100%">
    ${visible.map(c=>`<span style="font-size:.62rem;display:flex;align-items:center;gap:3px;white-space:nowrap;">
      <span style="width:7px;height:7px;flex-shrink:0;background:${c.color};display:inline-block;border-radius:1px"></span>
      ${c.label} ${c.piePct>0?(c.piePct*100).toFixed(0)+'%':'—'}
    </span>`).join('')}
  </div>`;
}
