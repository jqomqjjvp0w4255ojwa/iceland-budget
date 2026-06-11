// ══════════════════════════════════════════════════════════
//  pixelpad.js — 共用像素畫板模組
//  用法：
//    PixelPad.mount(容器元素, { onDone: res => {...} });
//    PixelPad.reset();                    // 全新空白畫布
//    PixelPad.loadRects(svgData, grid);   // 載入既有塗鴉
//    PixelPad.toPNGBlob(cb, scale);      // 產生 PNG blob（上傳用）
//  res = { svgData: '<rect.../>...', grid: 16 }（空畫布時 svgData 為 null）
//  外觀讀取頁面的 CSS 變數（--panel2/--border/--text…），無變數時用淺色預設
// ══════════════════════════════════════════════════════════
(function(){

const PD_DS = 256;
let pdG=16, pdC=PD_DS/pdG;
let pdPx=[], pdHist=[], pdFut=[], pdX=0, pdY=0;
let pdH=350, pdS=70, pdB=75, pdTool='pen';
let pdMT=null, pdHT=null, pdPalOpen=false, pdCvOpen=false;
const PD_PRESETS=['__trans__','#000000','#ffffff','#c04050','#e06878','#f0a0a8','#ffd0d8','#d06820','#e8a050','#408040','#70b870','#4060c0','#8090d8','#804080','#9a9088','#ece8e0'];
let pdSwatches=[...PD_PRESETS], pdColor='#c04050';
let pdcv=null, pdctx=null, padRoot=null, padOpts={};

// ── 樣式（var() 都帶淺色預設值，沒有主題變數也能看）
const PAD_CSS = `
.pd-app{width:100%;max-width:320px;margin:0 auto;padding:8px;display:flex;flex-direction:column;gap:6px;font-size:11px;font-family:var(--px,'Silkscreen',monospace);}
.pd-row{display:flex;gap:4px;align-items:center;justify-content:center;}
.pd-div{height:1px;background:var(--border,#b8b0a6);}
.pd-toggle{display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:2px 0;user-select:none;-webkit-user-select:none;}
.pd-toggle span{font-size:10px;color:var(--muted,#7a7068);letter-spacing:1px;}
.pd-body{overflow:hidden;max-height:0;transition:max-height .2s ease;display:flex;flex-direction:column;gap:4px;}
.pd-body.open{max-height:60px;}
.pd-palbody{overflow:hidden;max-height:0;transition:max-height .22s ease;display:flex;flex-direction:column;gap:5px;}
.pd-palbody.open{max-height:160px;}
.pd-arr{font-size:9px;color:var(--muted,#9a9088);transition:transform .2s;}
.pd-arr.open{transform:rotate(180deg);}
.pd-smbtn{padding:0;width:36px;height:28px;border:1px solid var(--border,#b8b0a6);background:var(--panel2,#ece8e0);color:var(--text,#3a3530);cursor:pointer;font-family:inherit;font-size:10px;border-radius:2px;display:flex;align-items:center;justify-content:center;touch-action:manipulation;}
.pd-smbtn.on{border-color:var(--text,#5a5248);background:var(--border,#d0c8c0);}
.pd-smbtn:active{transform:translate(1px,1px);}
.pd-clrbtn{width:28px;height:28px;border:1px solid #b07080;background:var(--panel2,#ece8e0);color:#c07080;cursor:pointer;font-size:14px;border-radius:2px;display:flex;align-items:center;justify-content:center;padding:0;touch-action:manipulation;}
.pd-hint{font-size:9px;color:var(--muted,#a09888);letter-spacing:.5px;text-align:center;}
.pd-toolbtn{padding:4px 8px;border:1.5px solid var(--border,#b8b0a6);background:var(--panel2,#ece8e0);color:var(--text,#5a5248);cursor:pointer;font-family:inherit;font-size:10px;border-radius:2px;touch-action:manipulation;}
.pd-toolbtn.on{background:var(--text,#5a5248);color:var(--bg,#ece8e0);border-color:var(--text,#5a5248);}
.pd-toolbtn:active{transform:translate(1px,1px);}
.pd-cvwrap{position:relative;display:flex;justify-content:center;}
#pdcv{image-rendering:pixelated;border:2px solid var(--border,#9a9088);display:block;cursor:crosshair;border-radius:2px;touch-action:none;}
#pd-pos{position:absolute;bottom:6px;right:8px;font-size:9px;color:rgba(120,110,100,0.4);pointer-events:none;line-height:1;}
.pd-swwrap{display:flex;gap:3px;flex-wrap:wrap;align-items:center;}
.pd-sw{width:22px;height:22px;border:2px solid transparent;cursor:pointer;flex-shrink:0;border-radius:2px;position:relative;touch-action:manipulation;}
.pd-sw.on{border-color:var(--text,#3a3530);}
.pd-sw.custom::after{content:'';position:absolute;top:0;right:0;width:6px;height:6px;background:#fff;clip-path:polygon(0 0,100% 0,100% 100%);}
.pd-swtrans{background:linear-gradient(45deg,#bbb 25%,transparent 25%,transparent 75%,#bbb 75%),linear-gradient(45deg,#bbb 25%,#eee 25%,#eee 75%,#bbb 75%);background-size:6px 6px;background-position:0 0,3px 3px;}
.pd-swadd{border:1.5px dashed var(--muted,#9a9088) !important;background:transparent !important;display:flex;align-items:center;justify-content:center;color:var(--muted,#9a9088);font-size:14px;}
.pd-colorbar{display:flex;gap:6px;align-items:center;}
.pd-prev{width:24px;height:24px;border:2px solid var(--border,#9a9088);flex-shrink:0;border-radius:2px;}
.pd-hexin{background:var(--panel2,#ece8e0);border:1px solid var(--border,#b8b0a6);color:var(--text,#3a3530);font-family:inherit;font-size:10px;padding:3px 5px;width:76px;outline:none;border-radius:2px;}
.pd-slrow{display:flex;align-items:center;gap:4px;width:100%;}
.pd-sllbl{font-size:10px;color:var(--muted,#6a6058);width:12px;flex-shrink:0;}
.pd-slval{font-size:10px;color:var(--text,#3a3530);width:22px;text-align:right;flex-shrink:0;}
.pd-app input[type=range]{flex:1;min-width:0;height:4px;-webkit-appearance:none;appearance:none;border-radius:2px;outline:none;cursor:pointer;}
.pd-app input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:var(--text,#5a5248);border:2px solid var(--bg,#d6d0c8);cursor:pointer;}
.pd-navrow{display:flex;gap:3px;align-items:center;justify-content:center;}
.pd-navbtn{width:36px;height:36px;background:var(--panel2,#ece8e0);border:1.5px solid var(--border,#b8b0a6);color:var(--text,#5a5248);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;user-select:none;-webkit-user-select:none;border-radius:2px;flex-shrink:0;touch-action:manipulation;}
.pd-navbtn:active,.pd-navbtn.p{background:var(--border,#d0c8c0);}
.pd-navdot{border-color:var(--text,#5a5248);font-size:16px;}
.pd-donebtn{width:100%;padding:12px;margin-top:2px;border:1.5px solid #4a8a5a;background:#2a4a36;color:#8ad89a;font-family:inherit;font-size:11px;border-radius:6px;cursor:pointer;letter-spacing:1px;touch-action:manipulation;}
.pd-donebtn:active{background:#335a42;}
.pd-iobtn{padding:4px 8px;border:1px solid var(--border,#b8b0a6);background:transparent;color:var(--muted,#7a7068);cursor:pointer;font-family:inherit;font-size:9px;border-radius:2px;touch-action:manipulation;}
.pd-iobtn:active{color:var(--text,#3a3530);}
`;

const PAD_HTML = `
<div class="pd-app">
  <div class="pd-toggle" onclick="pdToggleCanvas()">
    <span>畫布設定</span><span class="pd-arr" id="pdcvarr">▼</span>
  </div>
  <div class="pd-body" id="pdcvbody">
    <div class="pd-row">
      <button class="pd-smbtn on" onclick="pdSg(16)">16</button>
      <button class="pd-smbtn" onclick="pdSg(24)">24</button>
      <button class="pd-smbtn" onclick="pdSg(32)">32</button>
      <button class="pd-smbtn" onclick="pdSg(48)">48</button>
      <button class="pd-clrbtn" onclick="pdClr()" title="清空畫布">🗑</button>
    </div>
    <div class="pd-hint">換尺寸會清空畫布</div>
  </div>
  <div class="pd-div"></div>
  <div class="pd-row">
    <button class="pd-toolbtn" onclick="pdUndo()">↩</button>
    <button class="pd-toolbtn" onclick="pdRedo()">↪</button>
    <div style="width:1px;height:18px;background:var(--border,#b8b0a6);margin:0 2px;"></div>
    <button class="pd-toolbtn on" id="pdt-pen" onclick="pdSt('pen')">✏</button>
    <button class="pd-toolbtn" id="pdt-fill" onclick="pdSt('fill')">▣</button>
    <button class="pd-toolbtn" id="pdt-eye" onclick="pdSt('eye')">◈</button>
  </div>
  <div class="pd-cvwrap">
    <canvas id="pdcv"></canvas>
    <div id="pd-pos">(0,0)</div>
  </div>
  <div class="pd-swwrap" id="pdswatches"></div>
  <div class="pd-div"></div>
  <div class="pd-toggle" onclick="pdTogglePal()">
    <span>調色盤</span><span class="pd-arr" id="pdpalarr">▼</span>
  </div>
  <div class="pd-palbody" id="pdpalbody">
    <div class="pd-colorbar">
      <div class="pd-prev" id="pdprev"></div>
      <input class="pd-hexin" id="pdhexin" maxlength="7" value="#c04050" onchange="pdOnHex()">
      <span style="font-size:10px;color:var(--muted,#9a9088);flex:1;">目前色</span>
    </div>
    <div class="pd-slrow"><span class="pd-sllbl">H</span><input type="range" id="pdsl-h" min="0" max="359" step="1" value="350" oninput="pdOnHSB()"><span class="pd-slval" id="pdvH">350</span></div>
    <div class="pd-slrow"><span class="pd-sllbl">S</span><input type="range" id="pdsl-s" min="0" max="100" step="1" value="70" oninput="pdOnHSB()"><span class="pd-slval" id="pdvS">70</span></div>
    <div class="pd-slrow"><span class="pd-sllbl">B</span><input type="range" id="pdsl-b" min="0" max="100" step="1" value="75" oninput="pdOnHSB()"><span class="pd-slval" id="pdvB">75</span></div>
  </div>
  <div class="pd-div"></div>
  <div class="pd-navrow">
    <button class="pd-navbtn" id="pdb-left" onpointerdown="pdSm('left')" onpointerup="pdStopM()" onpointerleave="pdStopM()">◀</button>
    <button class="pd-navbtn" id="pdb-up" onpointerdown="pdSm('up')" onpointerup="pdStopM()" onpointerleave="pdStopM()">▲</button>
    <button class="pd-navbtn pd-navdot" onclick="pdPaint()" title="畫下這格">●</button>
    <button class="pd-navbtn" id="pdb-down" onpointerdown="pdSm('down')" onpointerup="pdStopM()" onpointerleave="pdStopM()">▼</button>
    <button class="pd-navbtn" id="pdb-right" onpointerdown="pdSm('right')" onpointerup="pdStopM()" onpointerleave="pdStopM()">▶</button>
  </div>
  <div class="pd-row" style="gap:6px;">
    <span style="font-size:9px;color:var(--muted,#9a9088);">匯出</span>
    <button class="pd-iobtn" onclick="PixelPad.exportSVG()">SVG</button>
    <button class="pd-iobtn" onclick="PixelPad.exportPNG()">PNG</button>
    <button class="pd-iobtn" onclick="PixelPad.exportJPG()">JPG</button>
    <div style="width:1px;height:14px;background:var(--border,#b8b0a6);"></div>
    <button class="pd-iobtn" onclick="document.getElementById('pdImportFile').click()">📂 匯入</button>
    <input type="file" id="pdImportFile" accept=".svg" style="display:none" onchange="PixelPad._importFile(this)">
  </div>
  <button class="pd-donebtn" onclick="PixelPad.done()">✓ 完成塗鴉</button>
</div>`;

// ── 色彩工具
function h2r(h,s,b){s/=100;b/=100;const k=n=>(n+h/60)%6,f=n=>b*(1-s*Math.max(0,Math.min(k(n),4-k(n),1)));return[Math.round(f(5)*255),Math.round(f(3)*255),Math.round(f(1)*255)];}
function r2h(r,g,b){return'#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');}
function x2hsb(x){let r=parseInt(x.slice(1,3),16)/255,g=parseInt(x.slice(3,5),16)/255,b=parseInt(x.slice(5,7),16)/255;const M=Math.max(r,g,b),m=Math.min(r,g,b),d=M-m;let h=0,s=M?d/M:0;if(d){if(M===r)h=(g-b)/d%6;else if(M===g)h=(b-r)/d+2;else h=(r-g)/d+4;h=Math.round(h*60+360)%360;}return[h,Math.round(s*100),Math.round(M*100)];}
function pdGetHex(){const[r,g,b]=h2r(pdH,pdS,pdB);return r2h(r,g,b);}

function pdUpdSliders(){
  const $=id=>document.getElementById(id);
  const[r1,g1,b1]=h2r(pdH,0,pdB),[r2,g2,b2]=h2r(pdH,100,pdB);
  $('pdsl-s').style.background=`linear-gradient(to right,${r2h(r1,g1,b1)},${r2h(r2,g2,b2)})`;
  const[r3,g3,b3]=h2r(pdH,pdS,0),[r4,g4,b4]=h2r(pdH,pdS,100);
  $('pdsl-b').style.background=`linear-gradient(to right,${r2h(r3,g3,b3)},${r2h(r4,g4,b4)})`;
}
function pdUpdUI(){
  const $=id=>document.getElementById(id);
  if(pdColor!=='__trans__'){
    $('pdprev').style.cssText='background:'+pdColor+';width:24px;height:24px;border:2px solid var(--border,#9a9088);flex-shrink:0;border-radius:2px;';
    $('pdhexin').value=pdColor;
    $('pdvH').textContent=pdH;$('pdvS').textContent=pdS;$('pdvB').textContent=pdB;
    $('pdsl-h').value=pdH;$('pdsl-s').value=pdS;$('pdsl-b').value=pdB;
    pdUpdSliders();
  } else {
    $('pdprev').style.cssText='width:24px;height:24px;border:2px solid var(--border,#9a9088);flex-shrink:0;border-radius:2px;background:linear-gradient(45deg,#bbb 25%,transparent 25%,transparent 75%,#bbb 75%),linear-gradient(45deg,#bbb 25%,#eee 25%,#eee 75%,#bbb 75%);background-size:6px 6px;background-position:0 0,3px 3px;';
    $('pdhexin').value='透明';
  }
  pdBldSwatches();
}
window.pdOnHSB=function(){pdH=+document.getElementById('pdsl-h').value;pdS=+document.getElementById('pdsl-s').value;pdB=+document.getElementById('pdsl-b').value;pdColor=pdGetHex();pdUpdUI();};
window.pdOnHex=function(){let v=document.getElementById('pdhexin').value.trim();if(!v.startsWith('#'))v='#'+v;if(!/^#[0-9a-fA-F]{6}$/.test(v))return;[pdH,pdS,pdB]=x2hsb(v);pdColor=v;pdUpdUI();};
function pdSetC(c){pdColor=c;if(c!=='__trans__')[pdH,pdS,pdB]=x2hsb(c);if(pdTool==='eye')window.pdSt('pen');pdUpdUI();}
window.pdToggleCanvas=function(){pdCvOpen=!pdCvOpen;document.getElementById('pdcvbody').classList.toggle('open',pdCvOpen);document.getElementById('pdcvarr').classList.toggle('open',pdCvOpen);};
window.pdTogglePal=function(){pdPalOpen=!pdPalOpen;document.getElementById('pdpalbody').classList.toggle('open',pdPalOpen);document.getElementById('pdpalarr').classList.toggle('open',pdPalOpen);};

function pdBldSwatches(){
  const el=document.getElementById('pdswatches');if(!el)return;
  el.innerHTML='';
  pdSwatches.forEach((c,i)=>{
    const isP=i<PD_PRESETS.length,d=document.createElement('div');
    d.className='pd-sw'+(isP?'':' custom')+(c===pdColor?' on':'');
    if(c==='__trans__')d.classList.add('pd-swtrans');else d.style.background=c;
    d.title=c==='__trans__'?'透明（橡皮擦）':c;
    d.onclick=()=>pdSetC(c);
    let lt=null;
    d.addEventListener('pointerdown',()=>{lt=setTimeout(()=>{if(!isP){pdSwatches.splice(i,1);if(pdColor===c)pdSetC('__trans__');else pdBldSwatches();}},700);});
    d.addEventListener('pointerup',()=>clearTimeout(lt));d.addEventListener('pointerleave',()=>clearTimeout(lt));
    el.appendChild(d);
  });
  const a=document.createElement('div');a.className='pd-sw pd-swadd';a.textContent='+';a.title='加入目前色';
  a.onclick=()=>{const hx=pdGetHex();if(!pdSwatches.includes(hx)){pdSwatches.push(hx);pdSetC(hx);}};
  el.appendChild(a);
}

function pdIc(){pdC=PD_DS/pdG;pdcv.width=PD_DS;pdcv.height=PD_DS;pdcv.style.width=PD_DS+'px';pdcv.style.height=PD_DS+'px';pdPx=Array(pdG).fill(null).map(()=>Array(pdG).fill(null));pdX=0;pdY=0;pdHist=[];pdFut=[];pdDraw();}
window.pdSg=function(n){pdG=n;padRoot.querySelectorAll('.pd-smbtn').forEach(b=>b.classList.toggle('on',+b.textContent===n));pdIc();};

function pdDraw(){
  if(!pdctx)return;
  pdctx.clearRect(0,0,PD_DS,PD_DS);pdctx.fillStyle='#faf6ee';pdctx.fillRect(0,0,PD_DS,PD_DS);
  for(let y=0;y<pdG;y++)for(let x=0;x<pdG;x++)if(pdPx[y][x]){pdctx.fillStyle=pdPx[y][x];pdctx.fillRect(x*pdC,y*pdC,pdC,pdC);}
  pdctx.strokeStyle='rgba(150,140,125,0.4)';pdctx.lineWidth=0.5;
  for(let i=0;i<=pdG;i++){pdctx.beginPath();pdctx.moveTo(i*pdC,0);pdctx.lineTo(i*pdC,PD_DS);pdctx.stroke();pdctx.beginPath();pdctx.moveTo(0,i*pdC);pdctx.lineTo(PD_DS,i*pdC);pdctx.stroke();}
  pdctx.strokeStyle=pdTool==='eye'?'#d05868':'#3a3530';pdctx.lineWidth=2;pdctx.strokeRect(pdX*pdC,pdY*pdC,pdC,pdC);
  document.getElementById('pd-pos').textContent=`(${pdX},${pdY})`;
}
function pdSh(){pdHist.push(pdPx.map(r=>[...r]));if(pdHist.length>50)pdHist.shift();pdFut=[];}
window.pdUndo=function(){if(!pdHist.length)return;pdFut.push(pdPx.map(r=>[...r]));pdPx=pdHist.pop();pdDraw();};
window.pdRedo=function(){if(!pdFut.length)return;pdHist.push(pdPx.map(r=>[...r]));pdPx=pdFut.pop();pdDraw();};
window.pdClr=function(){pdSh();pdPx=Array(pdG).fill(null).map(()=>Array(pdG).fill(null));pdDraw();};
window.pdPaint=function(){
  if(pdTool==='eye'){const c=pdPx[pdY][pdX];pdSetC(c||'__trans__');window.pdSt('pen');pdDraw();return;}
  pdSh();
  if(pdColor==='__trans__')pdPx[pdY][pdX]=null;
  else if(pdTool==='pen')pdPx[pdY][pdX]=pdColor;
  else if(pdTool==='fill')pdFlood(pdX,pdY,pdPx[pdY][pdX],pdColor==='__trans__'?null:pdColor);
  pdDraw();
};
function pdFlood(x,y,t,f){if(x<0||x>=pdG||y<0||y>=pdG||pdPx[y][x]!==t||(t===f&&t!==null))return;pdPx[y][x]=f;pdFlood(x+1,y,t,f);pdFlood(x-1,y,t,f);pdFlood(x,y+1,t,f);pdFlood(x,y-1,t,f);}
function pdMv(d){if(d==='up'&&pdY>0)pdY--;if(d==='down'&&pdY<pdG-1)pdY++;if(d==='left'&&pdX>0)pdX--;if(d==='right'&&pdX<pdG-1)pdX++;pdDraw();}
window.pdSm=function(d){pdMv(d);document.getElementById('pdb-'+d).classList.add('p');pdHT=setTimeout(()=>{pdMT=setInterval(()=>pdMv(d),70);},280);};
window.pdStopM=function(){clearTimeout(pdHT);clearInterval(pdMT);pdHT=pdMT=null;padRoot.querySelectorAll('.pd-navbtn').forEach(b=>b.classList.remove('p'));};
window.pdSt=function(t){pdTool=t;['pen','fill','eye'].forEach(n=>{const e=document.getElementById('pdt-'+n);if(e)e.classList.toggle('on',n===t);});pdDraw();};

function pdGetRects(){const r=[];for(let y=0;y<pdG;y++){let x=0;while(x<pdG){if(!pdPx[y][x]){x++;continue;}let run=1;while(x+run<pdG&&pdPx[y][x+run]===pdPx[y][x])run++;r.push(`<rect x="${x}" y="${y}" width="${run}" height="1" fill="${pdPx[y][x]}"/>`);x+=run;}}return r;}

function bindCanvas(){
  // touch-action:none 已擋住捲動，preventDefault 再保險（iOS 舊版）
  pdcv.addEventListener('pointerdown',e=>{
    e.preventDefault();
    const r=pdcv.getBoundingClientRect(),sx=PD_DS/r.width,sy=PD_DS/r.height;
    pdX=Math.max(0,Math.min(pdG-1,Math.floor((e.clientX-r.left)*sx/pdC)));
    pdY=Math.max(0,Math.min(pdG-1,Math.floor((e.clientY-r.top)*sy/pdC)));
    if(pdTool==='eye'){const c=pdPx[pdY][pdX];pdSetC(c||'__trans__');window.pdSt('pen');pdDraw();return;}
    window.pdPaint();
  });
  pdcv.addEventListener('pointermove',e=>{
    if(!e.buttons)return;
    e.preventDefault();
    const r=pdcv.getBoundingClientRect(),sx=PD_DS/r.width,sy=PD_DS/r.height;
    const nx=Math.max(0,Math.min(pdG-1,Math.floor((e.clientX-r.left)*sx/pdC)));
    const ny=Math.max(0,Math.min(pdG-1,Math.floor((e.clientY-r.top)*sy/pdC)));
    if(nx!==pdX||ny!==pdY){pdX=nx;pdY=ny;if(pdTool!=='eye')window.pdPaint();else pdDraw();}
  });
  pdcv.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});
  pdcv.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
  document.addEventListener('keydown',e=>{
    // 畫板隱藏時不攔截鍵盤
    if(!padRoot||padRoot.offsetParent===null)return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();
    if(e.key==='ArrowUp')pdMv('up');if(e.key==='ArrowDown')pdMv('down');
    if(e.key==='ArrowLeft')pdMv('left');if(e.key==='ArrowRight')pdMv('right');
    if(e.key==='Enter'||e.key===' '){e.preventDefault();window.pdPaint();}
    if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();e.shiftKey?window.pdRedo():window.pdUndo();}
    if(e.key==='p')window.pdSt('pen');if(e.key==='f')window.pdSt('fill');if(e.key==='i')window.pdSt('eye');
  });
}

function renderToCanvas(scale,bg){
  const oc=document.createElement('canvas');
  oc.width=pdG*scale;oc.height=pdG*scale;
  const c2=oc.getContext('2d');
  if(bg){c2.fillStyle=bg;c2.fillRect(0,0,oc.width,oc.height);}
  for(let y=0;y<pdG;y++)for(let x=0;x<pdG;x++)if(pdPx[y][x]){c2.fillStyle=pdPx[y][x];c2.fillRect(x*scale,y*scale,scale,scale);}
  return oc;
}
function download(href,name){const a=document.createElement('a');a.href=href;a.download=name;a.click();}

// ── 對外 API ──────────────────────────────
window.PixelPad = {
  mount(el, opts){
    padOpts = opts || {};
    if(!document.getElementById('pixelpad-style')){
      const st=document.createElement('style');st.id='pixelpad-style';st.textContent=PAD_CSS;
      document.head.appendChild(st);
    }
    el.innerHTML = PAD_HTML;
    padRoot = el;
    pdcv = document.getElementById('pdcv');
    pdctx = pdcv.getContext('2d');
    bindCanvas();
    pdBldSwatches();
    pdIc();
    pdUpdUI();
  },
  reset(grid){
    if(grid) pdG=grid;
    padRoot.querySelectorAll('.pd-smbtn').forEach(b=>b.classList.toggle('on',+b.textContent===pdG));
    pdIc();
  },
  loadRects(svgData, grid){
    this.reset(grid||16);
    const re=/x="(\d+)"\s+y="(\d+)"\s+width="(\d+)"\s+height="(\d+)"\s+fill="([^"]+)"/g;
    let m;
    while((m=re.exec(svgData))!==null){
      const x=+m[1],y=+m[2],w=+m[3],h=+m[4],f=m[5];
      for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++){
        if(y+dy<pdG&&x+dx<pdG)pdPx[y+dy][x+dx]=f;
      }
    }
    pdDraw();
  },
  getResult(){
    const rects=pdGetRects();
    return { svgData: rects.length?rects.join(''):null, grid: pdG };
  },
  toPNGBlob(cb, scale, bg){
    renderToCanvas(scale||8, bg||null).toBlob(cb,'image/png');
  },
  done(){
    if(padOpts.onDone) padOpts.onDone(this.getResult());
  },
  exportSVG(){
    const rects=pdGetRects();if(!rects.length)return;
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${pdG}" height="${pdG}" viewBox="0 0 ${pdG} ${pdG}" style="image-rendering:pixelated">${rects.join('')}</svg>`;
    download('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg),'pixel.svg');
  },
  exportPNG(){
    if(!pdGetRects().length)return;
    download(renderToCanvas(16,null).toDataURL('image/png'),'pixel.png');
  },
  exportJPG(){
    if(!pdGetRects().length)return;
    // JPG 不支援透明，鋪白底
    download(renderToCanvas(16,'#ffffff').toDataURL('image/jpeg',0.92),'pixel.jpg');
  },
  _importFile(input){
    const file=input.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=e=>{
      const text=e.target.result;
      const vb=text.match(/viewBox="0 0 (\d+) (\d+)"/);
      const grid=vb?Math.max(+vb[1],+vb[2]):pdG;
      const valid=[16,24,32,48].includes(grid)?grid:16;
      this.loadRects(text,valid);
    };
    reader.readAsText(file);
    input.value='';
  },
};

})();
