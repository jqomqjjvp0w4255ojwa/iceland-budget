// render.js — 核心：靜態資料、工具函式、renderAll、路由

// render.js — 渲染邏輯、靜態資料、路由（從 index.html 拆出）
// ══════════════════════════════════════════════════════════
//  Google Sheets 公開 CSV 網址（發布到網路後填入）
//  格式: .../pub?gid=SHEET_GID&single=true&output=csv
// ══════════════════════════════════════════════════════════

// ── 住宿類型圖示判斷
// ══════════════════════════════════════════════════════════
//  手冊：資訊（讀「手冊」表）＋ 工具（靜態教學）
// ══════════════════════════════════════════════════════════
const MANUAL_CAT_ICONS = { '實用資訊':'💡', '緊急聯絡':'🆘', '購物補給':'🛒', '交通':'🚗', '其他':'📌' };

function renderManualPage(d) {
  const info = d.manualInfo || [];

  // ── 資訊區：依分類分組
  let infoHtml = '';
  if (!info.length) {
    infoHtml = `<div class="empty">💡 在「手冊」表填入旅遊情報後顯示<br>
      <span style="font-size:.7rem;color:var(--muted)">欄位：分類／標題／內容／連結</span></div>`;
  } else {
    const groups = new Map();
    info.forEach(x => {
      const cat = x.category || '其他';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(x);
    });
    infoHtml = [...groups.entries()].map(([cat, rows]) => `
      <div class="section-title">${MANUAL_CAT_ICONS[cat] || '📌'} ${esc(cat)}</div>
      ${rows.map(r => `
        <div class="card" style="padding:11px 14px;margin-bottom:8px;">
          <div style="font-size:.8rem;color:var(--text);margin-bottom:3px;">${esc(r.title)}</div>
          ${r.content ? `<div style="font-size:.7rem;color:var(--muted);line-height:1.8;white-space:pre-wrap;">${esc(r.content)}</div>` : ''}
          ${safeUrl(r.url) ? `<a href="${safeUrl(r.url)}" target="_blank" rel="noopener"
            style="display:inline-block;margin-top:5px;font-size:.68rem;color:var(--accent2);">🔗 開啟連結 ›</a>` : ''}
        </div>`).join('')}
    `).join('');
  }

  // ── 工具區：靜態教學（不吃資料）
  const toolsHtml = `
    <div class="section-title">🔧 工具</div>
    <div class="card" style="padding:12px 14px;margin-bottom:8px;">
      <div style="font-size:.8rem;color:var(--text);margin-bottom:4px;">📲 把小帳加到手機桌面</div>
      <div style="font-size:.7rem;color:var(--muted);line-height:1.9;">
        <b>iPhone</b>：Safari 開本站 → 分享 <span style="border:1px solid var(--border);border-radius:3px;padding:0 4px;">⎋</span> → 「加入主畫面」<br>
        <b>Android</b>：Chrome 開本站 → 右上 ⋮ → 「加到主畫面」<br>
        加入後像 App 一樣全螢幕開啟，斷網也能看快取資料
      </div>
    </div>
    <div class="card" style="padding:12px 14px;margin-bottom:8px;">
      <div style="font-size:.8rem;color:var(--text);margin-bottom:4px;">🗺 下載離線地圖（出發前務必做）</div>
      <div style="font-size:.7rem;color:var(--muted);line-height:1.9;">
        冰島郊區常沒訊號，先把整島地圖抓下來：<br>
        <b>Google Maps</b>：搜尋「Iceland」→ 下方地名列 → 「下載離線地圖」→ 框住全島<br>
        （離線導航可用，約 300–400MB，建議連 Wi-Fi 下載）
      </div>
      <a href="https://support.google.com/maps/answer/6291838" target="_blank" rel="noopener"
        style="display:inline-block;margin-top:5px;font-size:.68rem;color:var(--accent2);">🔗 官方教學 ›</a>
    </div>
    <div class="card" style="padding:12px 14px;margin-bottom:8px;">
      <div style="font-size:.8rem;color:var(--text);margin-bottom:4px;">🌦 冰島官方即時資訊</div>
      <div style="font-size:.7rem;color:var(--muted);line-height:1.9;">
        出發每天早上看一眼再上路：
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">
        <a href="https://safetravel.is" target="_blank" rel="noopener" style="font-size:.68rem;color:var(--accent2);border:1px solid var(--border);border-radius:6px;padding:4px 10px;">SafeTravel 安全警示</a>
        <a href="https://umferdin.is/en" target="_blank" rel="noopener" style="font-size:.68rem;color:var(--accent2);border:1px solid var(--border);border-radius:6px;padding:4px 10px;">路況地圖</a>
        <a href="https://en.vedur.is" target="_blank" rel="noopener" style="font-size:.68rem;color:var(--accent2);border:1px solid var(--border);border-radius:6px;padding:4px 10px;">氣象局（風/極光）</a>
      </div>
    </div>`;

  return `
    <div class="tabs" style="margin-top:4px;">
      <button class="tab active" onclick="showBagTab('info',this)">💡 資訊</button>
      <button class="tab" onclick="showBagTab('tools',this)">🔧 工具</button>
    </div>
    <div id="bagTab-info" class="section active">${infoHtml}</div>
    <div id="bagTab-tools" class="section">${toolsHtml}</div>
  `;
}

window.showBagTab = function(id, btn) {
  document.querySelectorAll('[id^="bagTab-"]').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('#mainSection-bag .tab').forEach(t => t.classList.remove('active'));
  document.getElementById('bagTab-' + id)?.classList.add('active');
  btn.classList.add('active');
};

function placeTypeIcon(name){
  const n=name.toLowerCase();
  if(n.includes('camp')||n.includes('camping')||n.includes('tjaldsv')||n.includes('þakgil')||n.includes('野營')||n.includes('營'))return{icon:'⛺',label:'營地'};
  if(n.includes('hostel')||n.includes('backpack'))return{icon:'🛏',label:'青旅'};
  if(n.includes('apartment')||n.includes('heimaleiga')||n.includes('公寓'))return{icon:'🏢',label:'公寓'};
  if(n.includes('guesthouse')||n.includes('guest house')||n.includes('民宿'))return{icon:'🏡',label:'民宿'};
  if(n.includes('hotel')||n.includes('酒店')||n.includes('旅館'))return{icon:'🏨',label:'旅館'};
  if(n.includes('cabin')||n.includes('cottage')||n.includes('小屋')||n.includes('barrel'))return{icon:'🪵',label:'小屋'};
  if(n.includes('farm')||n.includes('horse'))return{icon:'🐴',label:'農場'};
  return{icon:'🏠',label:'住宿'};
}

// ── 靜態備用資料
window.STATIC = {
  exchangeISK:0.2537, exchangeEUR:36.48, totalTWD:47859.89,
  car:{
    company:'ZERO CAR', model:'Toyota RAV4 (Used Model)', code:'',
    pickup:'9月15日 上午9:30', dropoff:'9月29日 下午11:00', days:14,
    location:'Blikavöllur 3, 235 Keflavík Airport, Iceland',
    totalTWD:74454, perPerson:25479.33, driver1:'花🌼', driver2:'猴🙉', payer:'猴🙉',
    insurance:['碰撞損害豁免險 CDW/SCDW','竊盜險 TP','碎石險 GP','道路救援免責聲明','零免賠額保險','額外司機']
  },
  accommodation:[
    // paid: bool | payDate: 付款標注 | deductDate: 扣款標注 | foreignFee: 海外手續費(NT) | cur: 幣別
    {name:'Hekla Nordicabin Wild Cottage',   date:'9/15–9/16',nights:2,cur:'EU', orig:null,  twd:0,        paid:false,cancel:false,payer:'花🌼',payDate:null,  deductDate:null,  foreignFee:null,note:''},
    {name:'Þakgil',                           date:'9/17',     nights:1,cur:'ISK',orig:34000,twd:8625.10,  paid:true, cancel:false,payer:'寧',  payDate:'5/14',deductDate:null,  foreignFee:null,note:'訂金已付一半'},
    {name:'Tjaldsvæðið í Svínafelli',         date:'9/18–9/19',nights:2,cur:'ISK',orig:47200,twd:11973.67, paid:false,cancel:true, payer:'寧',  payDate:null,  deductDate:'9/18',foreignFee:null,note:'現場付'},
    {name:'Framtid Camping Lodging Barrels 富瑞麥德',date:'9/20',nights:1,cur:'EU',orig:null,twd:0,         paid:false,cancel:false,payer:'花🌼',payDate:null,  deductDate:null,  foreignFee:null,note:''},
    {name:'Húsey Hostel & Horsefarm',         date:'9/21',     nights:1,cur:'EUR',orig:132.56,twd:4835.91, paid:false,cancel:true, payer:'猴🙉',payDate:null,  deductDate:'9/21',foreignFee:null,note:''},
    {name:'Guesthouse Stöng 米湖斯通小屋旅館', date:'9/22',     nights:1,cur:'NT', orig:6678, twd:6678,     paid:true, cancel:false,payer:'寧',  payDate:'5/14',deductDate:null,  foreignFee:null,note:''},
    {name:'Ósar Hostel 怪石頭小屋',           date:'9/23',     nights:1,cur:'EUR',orig:139.29,twd:5081.43, paid:false,cancel:true, payer:'猴🙉',payDate:null,  deductDate:'9/23',foreignFee:null,note:''},
    {name:'Sea, fjord & mountain view house', date:'9/24',     nights:1,cur:'EUR',orig:188.85,twd:6889.42, paid:true, cancel:false,payer:'猴🙉',payDate:'5/14',deductDate:null,  foreignFee:null,note:''},
    {name:'Miðjanes Reykhólahrepp 米歐傑恩瑞科拉',date:'9/25', nights:1,cur:'EUR',orig:121.06,twd:4416.38, paid:false,cancel:true, payer:'猴🙉',payDate:null,  deductDate:'9/25',foreignFee:null,note:''},
    {name:'Between sea and big mountains',    date:'9/26',     nights:1,cur:'EUR',orig:160,   twd:5836.95,  paid:false,cancel:true, payer:'寧',  payDate:null,  deductDate:'9/26',foreignFee:null,note:''},
    {name:'Icelandic Apartments by Heimaleiga',date:'9/27–9/28',nights:2,cur:'EUR',orig:351,  twd:12804.81, paid:false,cancel:true, payer:'猴🙉',payDate:null,  deductDate:'9/27',foreignFee:null,note:''},
  ],
  activity: [],
  expenseCategories: ['停車費','雜支','訂房','門票與體驗','加油','行前'],
  budgetPerPerson: 100000,
};
window.APP_DATA = JSON.parse(JSON.stringify(window.STATIC));
let currentFilter='all';
let dataSource='local'; // 'local'|'cloud'|'syncing'|'offline'

// ── 格式化
function fmt(n){if(!n||isNaN(n))return'—';return'NT$ '+Math.round(n).toLocaleString('zh-TW');}

// ── 文字跳脫（Sheet 內容進 innerHTML 前用）
function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
// 只允許 http/https 連結，擋掉 javascript: 之類的協定
function safeUrl(u){
  const s = String(u ?? '').trim();
  return /^https?:\/\//i.test(s) ? esc(s) : '';
}
window.esc = esc;
window.safeUrl = safeUrl;

// ── 角色頭像（靜態第1格，從 window.SPRITES 讀取）
const _avatarCache = {};
function avatarSvg(name) {
  const s = String(name||'').trim();
  if (_avatarCache[s] !== undefined) return _avatarCache[s];
  const members = window.TRIP_CONFIG?.members || [];
  for (const m of members) {
    if (s.includes(m.name)) {
      const frames = window.SPRITES?.[m.spriteKey];
      if (frames?.[0]) {
        return (_avatarCache[s] = `<svg width="16" height="28" viewBox="0 0 16 28" style="image-rendering:pixelated;vertical-align:middle;">${frames[0]}</svg>`);
      }
    }
  }
  return (_avatarCache[s] = `<span style="font-size:.75rem">${s}</span>`);
}
function fmtPer(n){if(!n||isNaN(n))return'—';return'NT$ '+Math.round(n/3).toLocaleString('zh-TW')+'<span style="font-size:.6em;color:var(--muted)">/人</span>';}
function fmtOrig(n,cur){
  if(!n||isNaN(n))return'';
  const sym={'ISK':'ISK ','EUR':'€','EU':'€','NT':'NT$','USD':'$'}[(cur||'').replace(/\./g,'').toUpperCase()]||(cur+' ');
  return sym+parseFloat(n).toLocaleString();
}

// ── Sync UI
function setSyncState(state,msg){
  dataSource=state;
  const dot=document.getElementById('syncDot');
  const icon=document.getElementById('syncIcon');
  const label=document.getElementById('syncLabel');
  const status=document.getElementById('syncStatus');
  dot.className='dot';
  if(state==='cloud'){dot.classList.add('dot-cloud');icon.innerHTML='☁';icon.classList.remove('spin-icon');label.textContent='雲端';}
  else if(state==='syncing'){dot.classList.add('dot-syncing');icon.innerHTML='<span class="spin-icon">↻</span>';label.textContent='同步中';}
  else if(state==='offline'){dot.classList.add('dot-offline');icon.innerHTML='📵';icon.classList.remove('spin-icon');label.textContent='離線';}
  else{dot.classList.add('dot-local');icon.innerHTML='💾';icon.classList.remove('spin-icon');label.textContent='本地';}
  if(msg) status.textContent=msg;
}

// ── 住宿卡片渲染

function renderAll(){
  // ── 記住目前分頁與捲動位置，renderAll 後恢復
  // 背景同步（雲端讀取完成）也會呼叫這裡，整個主畫面被整段換掉，
  // 不補這個的話畫面就會彈回最頂端，使用者會以為「跳回首頁」。
  const _activeTab = window._activeMainTab || 'ledger';
  const _scrollY = window.scrollY;
  const d=window.APP_DATA || window.STATIC;
  // ── 同步 tag 庫
  if (d.tagLibrary?.length) window.pxUpdateTagLibrary?.(d.tagLibrary);
  const totalAccom    = d.accommodation.reduce((s,a)=>s+(a.twd||0),0);
  const totalActivity = (d.activity||[]).reduce((s,a)=>s+(a.twd||0),0);
  const totalFlight   = d.totalFlightTWD||0;
  const carTotal      = d.car.totalTWD||0;

  // 雜支分成共同和個人兩類
  const totalExpenseShared   = (d.expenses||[]).filter(e=>e.isShared).reduce((s,e)=>s+(e.total||0),0);
  const totalExpensePersonal = (d.expenses||[]).filter(e=>!e.isShared).reduce((s,e)=>s+(e.total||0),0);

  // sharedTotal = 所有共同費用（住宿＋租車＋活動＋共同雜支）
  const sharedTotal = carTotal + totalAccom + totalActivity + totalExpenseShared;
  const grandTotal  = sharedTotal + totalFlight;

  // ── 負債試算
  // paid：優先用 sheet 寫入_分帳 的「總付出」（含所有代墊）
  // shouldPay：優先用 sheet 的「總負擔」（含自己付自己的正確分攤）
  // 兩者都 fallback 到本地自算（sheet 資料未填時）
  const splitData = d.split || {};
  const MEMBERS = window.TRIP_MEMBERS || ['花','猴','寧'];

  // 本地自算 paid（只有住宿＋租車，雜支 GAS 串接後才完整）
  const paidLocal = Object.fromEntries(MEMBERS.map(m => [m, 0]));
  d.accommodation.forEach(a=>{
    if(!a.payer||!a.twd) return;
    for(const m of MEMBERS){ if(a.payer.includes(m)){ paidLocal[m]+=a.twd; break; } }
  });
  if(d.car.totalTWD && d.car.payer){
    for(const m of MEMBERS){ if(d.car.payer.includes(m)){ paidLocal[m]+=d.car.totalTWD; break; } }
  }

  // hasSheetData：GAS 寫入_分帳 是否有資料
  const hasSheetData = MEMBERS.some(m => splitData[m]?.paid);

  const paid = {};
  MEMBERS.forEach(m=>{
    paid[m] = hasSheetData ? (splitData[m]?.paid ?? 0) : (paidLocal[m] ?? 0);
  });

  // ── 倒數計時
  const _dates = window.TRIP_CONFIG?.dates || {};
  const DEPART      = new Date(_dates.depart     || '2026-09-14T00:00:00+08:00');
  const ARRIVE      = new Date(_dates.arrive     || '2026-09-15T00:00:00+00:00');
  const RETURN_NING = new Date(_dates.returnNing || '2026-09-28T14:00:00+00:00');
  const RETURN_ALL  = new Date(_dates.returnAll  || '2026-09-29T00:00:00+00:00');
  const now = new Date();
  let countdownHtml = '';
  if(now < DEPART){
    const days = Math.ceil((DEPART-now)/86400000);
    countdownHtml = `<div class="countdown-bar">✈️ 距離出發還有 <strong>${days}</strong> 天</div>`;
  } else if(now < ARRIVE){
    countdownHtml = `<div class="countdown-bar">🛫 飛往冰島中！</div>`;
  } else if(now < RETURN_NING){
    const day = Math.floor((now-ARRIVE)/86400000)+1;
    countdownHtml = `<div class="countdown-bar">🇮🇸 冰島旅行第 <strong>${day}</strong> 天</div>`;
  } else if(now < RETURN_ALL){
    countdownHtml = `<div class="countdown-bar">🐱 寧已踏上歸途！花猴明天見～</div>`;
  } else {
    countdownHtml = `<div class="countdown-bar">🎉 旅行結束！回到台灣了！</div>`;
  }

  // ── 角色站位依付款金額排序
  const memberOrder = [...MEMBERS].sort((a,b)=>paid[b]-paid[a]);

  // ── 圓餅比例（由 calcFlightDisplay 統一計算）
  const { perPersonAmt, grandDisplay, whoLabel, flightForDisplay, flightLabel, expForDisplay, pcts } =
    calcFlightDisplay(sharedTotal, totalFlight, d.flights||[], d.expenses||[], carTotal, totalAccom, totalActivity);
  const { car: carPct, flight: flightPct, accom: accomPct, act: actPct } = pcts;

  // ── 圓餅 HTML（canvas + 中心卷軸選擇器，無圓框，圓餅本身即邊界）
  const donutHtml = `
    <div style="position:relative;width:140px;height:140px;flex-shrink:0;">
      <canvas id="donutCanvas" width="140" height="140"
        style="position:absolute;top:0;left:0;image-rendering:pixelated;display:block;"></canvas>
      <!-- 中心卷軸 -->
      <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
                  width:58px;height:58px;overflow:hidden;border-radius:50%;cursor:pointer;z-index:2;">
        <div id="donutPickerList"
          style="overflow-y:scroll;scroll-snap-type:y mandatory;
                 -webkit-overflow-scrolling:touch;scrollbar-width:none;
                 width:100%;height:58px;display:block;"></div>
      </div>
    </div>`;

  // ── 各類別進度條
  // 實際內容由模組級 buildCatRows() 產生，依 _flightMode 決定機票欄位
  const catRows = buildCatRows(carTotal, flightForDisplay, flightLabel, totalAccom, totalActivity, grandDisplay, expForDisplay);

  // ── 分帳明細（從 寫入_分帳 Sheet 讀取，若無則 fallback 自算）
  const maxPaid = Math.max(...MEMBERS.map(m => paid[m] || 0), 1);
  const debtRows = MEMBERS.map(m => {
    const paidAmt = paid[m] ?? 0;
    // balance：GAS 已含還款的最終結算；無 GAS 資料時顯示 null（不估算）
    const balance = hasSheetData ? (splitData[m]?.balance ?? null) : null;
    const barPct   = (paidAmt / maxPaid * 100).toFixed(1);
    const barColor = balance === null ? 'var(--muted)' : balance >= 0 ? 'var(--green)' : '#e8c020';
    const debtLabel = balance === null ? '→ 同步後顯示'
                    : balance > 0 ? `→ 要收回 ${fmt(balance)}`
                    : balance < 0 ? `→ 要給出 ${fmt(-balance)}`
                    : `→ 剛好平`;
    const debtColor = balance === null ? 'var(--muted)' : balance > 0 ? 'var(--green)' : balance < 0 ? 'var(--red)' : 'var(--muted)';
    return `
    <div style="margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
        ${avatarSvg(m)}
        <div style="flex:1;min-width:0">
          <div style="height:8px;background:var(--bg3);border-radius:2px;overflow:hidden">
            <div style="height:100%;width:${barPct}%;background:${barColor};border-radius:2px;transition:width .6s"></div>
          </div>
        </div>
        <span style="font-family:'Cinzel',serif;font-size:.78rem;color:var(--gold);white-space:nowrap">${paidAmt ? fmt(paidAmt) : '—'}</span>
      </div>
      <div style="font-size:.65rem;padding-left:22px;color:${debtColor}">${debtLabel}</div>
    </div>`;
  }).join('');

  document.getElementById('mainContent').innerHTML=`
    <!-- ══ 主分頁標籤：資料夾耳朵樣式 ══ -->
    <div style="display:flex;gap:4px;padding:0 2px;margin-bottom:0;margin-top:12px">
      <button id="mainTab-ledger" onclick="switchMainTab('ledger',this)"
        style="flex:1;padding:6px 4px 9px;font-size:.72rem;display:flex;flex-direction:row;align-items:center;justify-content:center;gap:5px;
               background:var(--card);border:1px solid var(--border);border-bottom:none;
               border-radius:8px 8px 0 0;color:var(--accent);cursor:pointer;font-family:'Lato',sans-serif;font-weight:700;
               box-shadow:inset 0 2px 0 var(--accent);margin-bottom:-1px;z-index:2;position:relative;">
        <span style="font-size:.95rem">🧾</span><span>帳簿</span>
      </button>
      <button id="mainTab-info" onclick="switchMainTab('info',this)"
        style="flex:1;padding:6px 4px 9px;font-size:.72rem;display:flex;flex-direction:row;align-items:center;justify-content:center;gap:5px;
               background:var(--bg3);border:1px solid var(--border);border-bottom:none;
               border-radius:8px 8px 0 0;color:var(--muted);cursor:pointer;font-family:'Lato',sans-serif;position:relative;z-index:1;">
        <span style="font-size:.95rem">📅</span><span>旅途</span>
      </button>
      <button id="mainTab-map" onclick="switchMainTab('map',this)"
        style="flex:1;padding:6px 4px 9px;font-size:.72rem;display:flex;flex-direction:row;align-items:center;justify-content:center;gap:5px;
               background:var(--bg3);border:1px solid var(--border);border-bottom:none;
               border-radius:8px 8px 0 0;color:var(--muted);cursor:pointer;font-family:'Lato',sans-serif;position:relative;z-index:1;">
        <span style="font-size:.95rem">📍</span><span>腳印</span>
      </button>
      <button id="mainTab-bag" onclick="switchMainTab('bag',this)"
        style="flex:1;padding:6px 4px 9px;font-size:.72rem;display:flex;flex-direction:row;align-items:center;justify-content:center;gap:5px;
               background:var(--bg3);border:1px solid var(--border);border-bottom:none;
               border-radius:8px 8px 0 0;color:var(--muted);cursor:pointer;font-family:'Lato',sans-serif;position:relative;z-index:1;">
        <span style="font-size:.95rem">📖</span><span>手冊</span>
      </button>
    </div>

    <!-- ══ 分頁內容容器（接在耳朵下面，共用邊框） ══ -->
    <div style="background:var(--card);border:1px solid var(--border);border-radius:0 0 14px 14px;padding:16px;margin-bottom:14px;">

      <!-- 帳簿 -->
      <div id="mainSection-ledger">
        <!-- 圓餅+累計花費：置中群組 -->
        <div style="display:flex;justify-content:center;margin-bottom:16px">
          <div style="display:flex;gap:16px;align-items:center">
            ${donutHtml}
            <div>
              <div style="font-size:.63rem;color:var(--muted);letter-spacing:.1em;text-transform:uppercase;margin-bottom:2px">✈️ 累計花費</div>
              <div style="font-family:'Cinzel',serif;font-size:1.55rem;color:var(--gold);font-weight:600;line-height:1.1">
                <span id="donutApprox" style="font-size:.7rem;color:var(--muted);font-family:'Lato',sans-serif;margin-right:1px">${window._flightMode==='equal'?'約':''}</span>NT$ <span id="donutPerPerson">${Math.round(perPersonAmt).toLocaleString('zh-TW')}</span><span style="font-size:.5em;color:var(--muted)">/人</span>
              </div>
              <div style="font-size:.65rem;color:var(--accent);margin-top:1px;min-height:14px;line-height:1.6" id="donutWhoLabel">${whoLabel}</div>
              <div style="font-size:.7rem;color:var(--muted);margin-top:2px" id="donutGrandTotal">合計 ${fmt(grandDisplay)}</div>
              <div style="margin-top:8px;width:100%" id="donutLegend">
                ${buildLegend(pcts.car, pcts.flight, pcts.accom, pcts.act, pcts.exp)}
              </div>
            </div>
          </div>
        </div>

        <!-- 小計 | 分帳：左右並排 -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border-top:1px solid var(--border);padding-top:12px;margin-bottom:14px">
          <div style="padding-right:12px;border-right:1px solid var(--border)">
            <div style="font-size:.63rem;color:var(--muted);letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px">小計</div>
            <div id="catRowsContent">${catRows}</div>
          </div>
          <div style="padding-left:12px">
            <div style="font-size:.63rem;color:var(--muted);letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px">分帳明細</div>
            ${debtRows}
          </div>
        </div>

        <div class="rate-bar" style="margin-bottom:14px">
          <span>💱 <strong>ISK</strong> = ${d.exchangeISK.toFixed(4)} NT$</span>
          <span>💱 <strong>EUR</strong> = ${d.exchangeEUR.toFixed(2)} NT$</span>
          ${d.exchangeUSD ? `<span>💱 <strong>USD</strong> = ${d.exchangeUSD.toFixed(2)} NT$</span>` : ''}
        </div>
        <div class="tabs">
          <button class="tab active" onclick="showTab('accommodation',this)">🏕 住宿</button>
          <button class="tab" onclick="showTab('car',this)">🚗 交通</button>
          <button class="tab" onclick="showTab('activity',this)">🎯 活動</button>
          <button class="tab" onclick="showTab('daily',this)">🛒 雜支</button>
          <button class="tab" onclick="showTab('insurance',this)">🛡 保險</button>
          <button class="tab" onclick="showTab('repay',this)">💸 還款</button>
        </div>
        <div id="accommodation" class="section active">
          <div id="accomContent">${renderAccom(d.accommodation)}</div>
        </div>
        <div id="car" class="section"><div id="carContent">${renderTransport(d)}</div></div>
        <div id="activity" class="section"><div id="activityContent">${renderActivity(d.activity)}</div></div>
        <div id="daily" class="section"><div id="dailyContent">${renderDaily(d.expenses||[])}</div></div>
        <div id="insurance" class="section"><div id="insuranceContent"><div class="empty">🛡 保險資訊填入後顯示</div></div></div>
        <div id="repay" class="section"><div id="repayContent">${renderRepay(d.repayHistory||[], d.split||{})}</div></div>
      </div>

      <!-- 其他分頁（待開發） -->
      <div id="mainSection-info" style="display:none"><div id="infoContent"></div></div>
      <!-- 負 margin 把左右 16px、底部 80px 的容器留白吃掉，地圖才能貼滿到邊緣 -->
      <div id="mainSection-map" style="display:none;padding:0;margin:0 -16px -80px;width:calc(100% + 32px);">
        <iframe
          id="mapFrame"
          src="map.html"
          style="width:100%;height:70vh;border:none;display:block;"
          loading="lazy"
        ></iframe>
      </div>
      <div id="mainSection-bag"  style="display:none"><div id="bagContent">${renderManualPage(d)}</div></div>
    </div>
  `;

  // ── DOM 建立完後初始化圓餅 canvas 和卷軸選擇器，並恢復分頁
  requestAnimationFrame(()=>{
    drawDonutCanvas(pcts.car, pcts.flight, pcts.accom, pcts.act, pcts.exp);
    initDonutPicker();
    refreshDonut(); // 確保個人消費等數字在 renderAll 後也更新
    if (_activeTab !== 'ledger') {
      const btn = document.getElementById('mainTab-' + _activeTab);
      if (btn) switchMainTab(_activeTab, btn);
    }
    // 恢復次分頁狀態
    const _subTab = window._activeSubTab;
    if (_subTab && _subTab !== 'accommodation') {
      const subEl  = document.getElementById(_subTab);
      const subBtn = document.querySelector(`.tab[onclick="showTab('${_subTab}',this)"]`);
      if (subEl && subBtn) showTab(_subTab, subBtn);
    }
    // 排在上面幾個 setTimeout(0) 之後執行，確保分頁內容都補回去了才還原捲動位置，
    // 不然內容還沒補齊時頁面高度不夠，scrollTo 會被瀏覽器夾回不夠高的位置
    setTimeout(() => window.scrollTo(0, _scrollY), 0);
  });
}

function showTab(id,btn){
  window._activeSubTab = id; // 記住目前次分頁
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  btn.classList.add('active');
}

function switchMainTab(key, btn){
  window._activeMainTab = key;
  if (key === 'map') resizeMapFrame();
  if (key === 'info') {
    setTimeout(() => {
      const el = document.getElementById('infoContent');
      if (el && !el.innerHTML) {
        el.innerHTML = renderInfo(window.APP_DATA || window.STATIC);
        // 恢復次分頁（行前／航班／取車／日程／保險），不然背景同步重繪後
        // 每次都跳回預設的「行前」，使用者會以為畫面跳回首頁
        const sub = window._activeInfoTab;
        if (sub && sub !== 'prep') {
          const subBtn = el.querySelector(`.tab[onclick^="showInfoTab('${sub}'"]`);
          if (subBtn) window.showInfoTab(sub, subBtn);
        }
      }
    }, 0);
  }
  const KEYS = ['ledger','info','map','bag'];
  KEYS.forEach(k=>{
    const s = document.getElementById('mainSection-'+k);
    const b = document.getElementById('mainTab-'+k);
    if(!s||!b) return;
    const isActive = k===key;
    s.style.display           = isActive ? '' : 'none';
    b.style.background        = isActive ? 'var(--card)'  : 'var(--bg3)';
    b.style.color             = isActive ? 'var(--accent)': 'var(--muted)';
    b.style.fontWeight        = isActive ? '700' : '400';
    b.style.boxShadow         = isActive ? 'inset 0 2px 0 var(--accent)' : 'none';
    b.style.borderBottomColor = isActive ? 'var(--card)' : 'var(--border)';
    b.style.zIndex            = isActive ? '2' : '1';
    b.style.marginBottom      = isActive ? '-1px' : '0';
  });
}

// 地圖高度不能用「目前捲動位置的剩餘空間」算——還沒往下捲時上面的
// 像素場景會吃掉大半視窗，地圖就被壓成一小條。改成固定給接近整個視窗，
// 切到腳印分頁時順便把地圖捲到畫面頂，等於進入全螢幕地圖。
function resizeMapFrame() {
  requestAnimationFrame(() => {
    const frame = document.getElementById('mapFrame');
    if (!frame) return;
    frame.style.height = Math.max(480, window.innerHeight - 66) + 'px';
    frame.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
}
window.addEventListener('resize', () => {
  if (window._activeMainTab === 'map') resizeMapFrame();
});

// ── 同步邏輯
async function syncFromCloud(){
  // 先把離線記帳的待同步佇列送出，避免雲端資料覆蓋掉尚未上傳的本地新增
  if (window.__flushPendingQueue) {
    const flushed = await window.__flushPendingQueue();
    // 佇列還有未送出的記帳時，絕不拉雲端資料覆蓋本地畫面
    if (!flushed && (window.getPendingCount?.() || 0) > 0) return;
  }
  if (window.__syncIcelandBudgetFromSheets) {
    return window.__syncIcelandBudgetFromSheets();
  }
  setSyncState('local','同步模組尚未載入，使用本地資料');
}

async function manualSync(){
  if(dataSource==='syncing') return;
  await syncFromCloud();
}

async function init(){
  // ── 快速首屏：優先用 localStorage 快取立刻渲染，不等網路
  const cachedRaw = localStorage.getItem('cached_iceland_budget');
  if (cachedRaw) {
    try {
      window.APP_DATA = JSON.parse(cachedRaw);
      renderAll();
      setSyncState('local', '⚡ 快取資料，背景同步中…');
    } catch(e) {
      window.APP_DATA = JSON.parse(JSON.stringify(window.STATIC));
      renderAll();
      setSyncState('local', '載入本地資料中…');
    }
  } else {
    window.APP_DATA = JSON.parse(JSON.stringify(window.STATIC));
    renderAll();
    setSyncState('local', '載入本地資料中…');
  }

  // ── 事件監聽
  window.addEventListener('offline',()=>{
    document.getElementById('offlineBadge').classList.add('show');
    setSyncState('offline','離線模式');
  });
  window.addEventListener('online',()=>{
    document.getElementById('offlineBadge').classList.remove('show');
    syncFromCloud();
  });
  if(!navigator.onLine) {
    document.getElementById('offlineBadge').classList.add('show');
    return;
  }

  // ── 背景同步（不阻塞首屏）
  syncFromCloud();
}

// ── init() 由 index.html 最後一個 defer script 呼叫，確保所有模組都已載入字