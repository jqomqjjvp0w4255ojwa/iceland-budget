// render.js — 核心：靜態資料、工具函式、renderAll、路由

// render.js — 渲染邏輯、靜態資料、路由（從 index.html 拆出）
// ══════════════════════════════════════════════════════════
//  Google Sheets 公開 CSV 網址（發布到網路後填入）
//  格式: .../pub?gid=SHEET_GID&single=true&output=csv
// ══════════════════════════════════════════════════════════

// ── 住宿類型圖示判斷
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

// ── 角色頭像（靜態第1格）
// ── memoized avatar
const _avatarCache = {};
function avatarSvg(name) {
  const s = String(name||'').trim();
  if (_avatarCache[s] !== undefined) return _avatarCache[s];
  const maps = {
    '花': `<rect x="5" y="6" width="6" height="1" fill="#feae34"/><rect x="3" y="7" width="10" height="1" fill="#feae34"/><rect x="2" y="8" width="12" height="1" fill="#feae34"/><rect x="1" y="9" width="4" height="1" fill="#feae34"/><rect x="5" y="9" width="6" height="1" fill="#fee761"/><rect x="11" y="9" width="4" height="1" fill="#feae34"/><rect x="1" y="10" width="3" height="1" fill="#feae34"/><rect x="4" y="10" width="8" height="1" fill="#fee761"/><rect x="12" y="10" width="3" height="1" fill="#feae34"/><rect x="0" y="11" width="4" height="1" fill="#feae34"/><rect x="4" y="11" width="8" height="1" fill="#fee761"/><rect x="12" y="11" width="4" height="1" fill="#feae34"/><rect x="0" y="12" width="3" height="1" fill="#feae34"/><rect x="3" y="12" width="2" height="1" fill="#fee761"/><rect x="5" y="12" width="1" height="1" fill="#3f2832"/><rect x="6" y="12" width="4" height="1" fill="#fee761"/><rect x="10" y="12" width="1" height="1" fill="#3f2832"/><rect x="11" y="12" width="2" height="1" fill="#fee761"/><rect x="13" y="12" width="3" height="1" fill="#feae34"/><rect x="0" y="13" width="3" height="1" fill="#feae34"/><rect x="3" y="13" width="1" height="1" fill="#fee761"/><rect x="4" y="13" width="1" height="1" fill="#3f2832"/><rect x="5" y="13" width="1" height="1" fill="#fee761"/><rect x="6" y="13" width="1" height="1" fill="#3f2832"/><rect x="7" y="13" width="2" height="1" fill="#fee761"/><rect x="9" y="13" width="1" height="1" fill="#3f2832"/><rect x="10" y="13" width="1" height="1" fill="#fee761"/><rect x="11" y="13" width="1" height="1" fill="#3f2832"/><rect x="12" y="13" width="1" height="1" fill="#fee761"/><rect x="13" y="13" width="3" height="1" fill="#feae34"/><rect x="0" y="14" width="3" height="1" fill="#feae34"/><rect x="3" y="14" width="10" height="1" fill="#fee761"/><rect x="13" y="14" width="3" height="1" fill="#feae34"/><rect x="0" y="15" width="3" height="1" fill="#feae34"/><rect x="3" y="15" width="4" height="1" fill="#fee761"/><rect x="7" y="15" width="2" height="1" fill="#f6757a"/><rect x="9" y="15" width="4" height="1" fill="#fee761"/><rect x="13" y="15" width="3" height="1" fill="#feae34"/><rect x="1" y="16" width="3" height="1" fill="#feae34"/><rect x="4" y="16" width="8" height="1" fill="#fee761"/><rect x="12" y="16" width="3" height="1" fill="#feae34"/><rect x="1" y="17" width="4" height="1" fill="#feae34"/><rect x="5" y="17" width="6" height="1" fill="#fee761"/><rect x="11" y="17" width="4" height="1" fill="#feae34"/><rect x="2" y="18" width="5" height="1" fill="#feae34"/><rect x="7" y="18" width="2" height="1" fill="#fee761"/><rect x="9" y="18" width="5" height="1" fill="#feae34"/><rect x="3" y="19" width="10" height="1" fill="#feae34"/><rect x="5" y="20" width="6" height="1" fill="#feae34"/><rect x="7" y="21" width="2" height="1" fill="#3e8948"/><rect x="2" y="22" width="1" height="1" fill="#57ab62"/><rect x="3" y="22" width="1" height="1" fill="#3e8948"/><rect x="7" y="22" width="2" height="1" fill="#3e8948"/><rect x="12" y="22" width="1" height="1" fill="#3e8948"/><rect x="13" y="22" width="1" height="1" fill="#57ab62"/><rect x="2" y="23" width="1" height="1" fill="#57ab62"/><rect x="3" y="23" width="3" height="1" fill="#3e8948"/><rect x="7" y="23" width="2" height="1" fill="#3e8948"/><rect x="10" y="23" width="3" height="1" fill="#3e8948"/><rect x="13" y="23" width="1" height="1" fill="#57ab62"/><rect x="3" y="24" width="1" height="1" fill="#57ab62"/><rect x="4" y="24" width="8" height="1" fill="#3e8948"/><rect x="12" y="24" width="1" height="1" fill="#57ab62"/><rect x="3" y="25" width="1" height="1" fill="#57ab62"/><rect x="4" y="25" width="8" height="1" fill="#3e8948"/><rect x="12" y="25" width="1" height="1" fill="#57ab62"/><rect x="4" y="26" width="2" height="1" fill="#57ab62"/><rect x="6" y="26" width="4" height="1" fill="#3e8948"/><rect x="10" y="26" width="2" height="1" fill="#57ab62"/><rect x="6" y="27" width="1" height="1" fill="#57ab62"/><rect x="7" y="27" width="2" height="1" fill="#3e8948"/><rect x="9" y="27" width="1" height="1" fill="#57ab62"/>`,
    '猴': `<rect x="5" y="7" width="6" height="1" fill="#b86f50"/><rect x="4" y="8" width="8" height="1" fill="#b86f50"/><rect x="3" y="9" width="10" height="1" fill="#b86f50"/><rect x="3" y="10" width="2" height="1" fill="#b86f50"/><rect x="5" y="10" width="2" height="1" fill="#ffc8b5"/><rect x="7" y="10" width="2" height="1" fill="#b86f50"/><rect x="9" y="10" width="2" height="1" fill="#ffc8b5"/><rect x="11" y="10" width="2" height="1" fill="#b86f50"/><rect x="1" y="11" width="3" height="1" fill="#b86f50"/><rect x="4" y="11" width="8" height="1" fill="#ffc8b5"/><rect x="12" y="11" width="3" height="1" fill="#b86f50"/><rect x="1" y="12" width="1" height="1" fill="#b86f50"/><rect x="2" y="12" width="1" height="1" fill="#ffb89f"/><rect x="3" y="12" width="1" height="1" fill="#b86f50"/><rect x="4" y="12" width="2" height="1" fill="#ffc8b5"/><rect x="6" y="12" width="1" height="1" fill="#3f2832"/><rect x="7" y="12" width="2" height="1" fill="#ffc8b5"/><rect x="9" y="12" width="1" height="1" fill="#3f2832"/><rect x="10" y="12" width="2" height="1" fill="#ffc8b5"/><rect x="12" y="12" width="1" height="1" fill="#b86f50"/><rect x="13" y="12" width="1" height="1" fill="#ffb89f"/><rect x="14" y="12" width="1" height="1" fill="#b86f50"/><rect x="1" y="13" width="3" height="1" fill="#b86f50"/><rect x="4" y="13" width="2" height="1" fill="#ffb89f"/><rect x="6" y="13" width="4" height="1" fill="#ffc8b5"/><rect x="10" y="13" width="2" height="1" fill="#ffb89f"/><rect x="12" y="13" width="3" height="1" fill="#b86f50"/><rect x="2" y="14" width="2" height="1" fill="#b86f50"/><rect x="4" y="14" width="2" height="1" fill="#ffb89f"/><rect x="6" y="14" width="1" height="1" fill="#ffc8b5"/><rect x="7" y="14" width="2" height="1" fill="#f6757a"/><rect x="9" y="14" width="1" height="1" fill="#ffc8b5"/><rect x="10" y="14" width="2" height="1" fill="#ffb89f"/><rect x="12" y="14" width="2" height="1" fill="#b86f50"/><rect x="2" y="15" width="1" height="1" fill="#3f2832"/><rect x="3" y="15" width="2" height="1" fill="#b86f50"/><rect x="5" y="15" width="6" height="1" fill="#ffc8b5"/><rect x="11" y="15" width="2" height="1" fill="#b86f50"/><rect x="13" y="15" width="1" height="1" fill="#925237"/><rect x="1" y="16" width="1" height="1" fill="#925237"/><rect x="2" y="16" width="1" height="1" fill="#b86f50"/><rect x="3" y="16" width="1" height="1" fill="#3f2832"/><rect x="4" y="16" width="10" height="1" fill="#b86f50"/><rect x="14" y="16" width="1" height="1" fill="#925237"/><rect x="1" y="17" width="1" height="1" fill="#925237"/><rect x="2" y="17" width="2" height="1" fill="#b86f50"/><rect x="4" y="17" width="2" height="1" fill="#3f2832"/><rect x="6" y="17" width="8" height="1" fill="#b86f50"/><rect x="14" y="17" width="1" height="1" fill="#925237"/><rect x="1" y="18" width="1" height="1" fill="#925237"/><rect x="2" y="18" width="4" height="1" fill="#b86f50"/><rect x="6" y="18" width="1" height="1" fill="#3f2832"/><rect x="7" y="18" width="7" height="1" fill="#b86f50"/><rect x="14" y="18" width="1" height="1" fill="#925237"/><rect x="1" y="19" width="1" height="1" fill="#925237"/><rect x="2" y="19" width="5" height="1" fill="#b86f50"/><rect x="7" y="19" width="2" height="1" fill="#3f2832"/><rect x="9" y="19" width="5" height="1" fill="#b86f50"/><rect x="14" y="19" width="1" height="1" fill="#925237"/><rect x="1" y="20" width="1" height="1" fill="#925237"/><rect x="2" y="20" width="2" height="1" fill="#b86f50"/><rect x="4" y="20" width="1" height="1" fill="#925237"/><rect x="5" y="20" width="4" height="1" fill="#b86f50"/><rect x="9" y="20" width="2" height="1" fill="#3f2832"/><rect x="11" y="20" width="1" height="1" fill="#925237"/><rect x="12" y="20" width="2" height="1" fill="#b86f50"/><rect x="14" y="20" width="1" height="1" fill="#925237"/><rect x="2" y="21" width="1" height="1" fill="#ffc8b5"/><rect x="3" y="21" width="1" height="1" fill="#ffb89f"/><rect x="4" y="21" width="6" height="1" fill="#b86f50"/><rect x="10" y="21" width="2" height="1" fill="#3f2832"/><rect x="12" y="21" width="1" height="1" fill="#ffb89f"/><rect x="13" y="21" width="1" height="1" fill="#ffc8b5"/><rect x="14" y="21" width="1" height="1" fill="#3f2832"/><rect x="2" y="22" width="8" height="1" fill="#b86f50"/><rect x="10" y="22" width="5" height="1" fill="#3f2832"/><rect x="2" y="23" width="9" height="1" fill="#b86f50"/><rect x="11" y="23" width="3" height="1" fill="#3f2832"/><rect x="2" y="24" width="12" height="1" fill="#b86f50"/><rect x="2" y="25" width="4" height="1" fill="#b86f50"/><rect x="6" y="25" width="4" height="1" fill="#925237"/><rect x="10" y="25" width="4" height="1" fill="#b86f50"/><rect x="3" y="26" width="3" height="1" fill="#b86f50"/><rect x="10" y="26" width="3" height="1" fill="#b86f50"/><rect x="3" y="27" width="3" height="1" fill="#5a6988"/><rect x="10" y="27" width="3" height="1" fill="#5a6988"/>`,
    '寧': `<rect x="3" y="4" width="1" height="1" fill="#434659"/><rect x="12" y="4" width="1" height="1" fill="#444559"/><rect x="3" y="5" width="1" height="1" fill="#41425e"/><rect x="4" y="5" width="1" height="1" fill="#3b3c58"/><rect x="11" y="5" width="1" height="1" fill="#3b3c58"/><rect x="12" y="5" width="1" height="1" fill="#41425e"/><rect x="2" y="6" width="1" height="1" fill="#3c4157"/><rect x="3" y="6" width="1" height="1" fill="#9598b9"/><rect x="4" y="6" width="1" height="1" fill="#393c5d"/><rect x="5" y="6" width="1" height="1" fill="#474b64"/><rect x="10" y="6" width="1" height="1" fill="#474b64"/><rect x="11" y="6" width="1" height="1" fill="#393c5d"/><rect x="12" y="6" width="1" height="1" fill="#9598b9"/><rect x="13" y="6" width="1" height="1" fill="#3c4157"/><rect x="2" y="7" width="1" height="1" fill="#414560"/><rect x="3" y="7" width="1" height="1" fill="#898caf"/><rect x="4" y="7" width="1" height="1" fill="#4a4c72"/><rect x="5" y="7" width="1" height="1" fill="#3f4360"/><rect x="6" y="7" width="1" height="1" fill="#3b414d"/><rect x="7" y="7" width="1" height="1" fill="#444c4e"/><rect x="8" y="7" width="1" height="1" fill="#444c4f"/><rect x="9" y="7" width="1" height="1" fill="#3b414d"/><rect x="10" y="7" width="1" height="1" fill="#3f4360"/><rect x="11" y="7" width="1" height="1" fill="#4a4c72"/><rect x="12" y="7" width="1" height="1" fill="#898bb1"/><rect x="13" y="7" width="1" height="1" fill="#414560"/><rect x="1" y="8" width="1" height="1" fill="#3d444c"/><rect x="2" y="8" width="1" height="1" fill="#464a65"/><rect x="3" y="8" width="1" height="1" fill="#3c3e64"/><rect x="4" y="8" width="1" height="1" fill="#3e4067"/><rect x="5" y="8" width="1" height="1" fill="#434665"/><rect x="6" y="8" width="1" height="1" fill="#3a404e"/><rect x="7" y="8" width="2" height="1" fill="#f9ffff"/><rect x="9" y="8" width="1" height="1" fill="#3c4250"/><rect x="10" y="8" width="1" height="1" fill="#424564"/><rect x="11" y="8" width="1" height="1" fill="#3f4167"/><rect x="12" y="8" width="1" height="1" fill="#43456b"/><rect x="13" y="8" width="1" height="1" fill="#3b3f5a"/><rect x="14" y="8" width="1" height="1" fill="#40474f"/><rect x="2" y="9" width="1" height="1" fill="#414560"/><rect x="3" y="9" width="1" height="1" fill="#3d4063"/><rect x="4" y="9" width="1" height="1" fill="#3a3c62"/><rect x="5" y="9" width="1" height="1" fill="#4a4e6b"/><rect x="6" y="9" width="1" height="1" fill="#f3f9ff"/><rect x="7" y="9" width="1" height="1" fill="#f8ffff"/><rect x="8" y="9" width="1" height="1" fill="#f4fbff"/><rect x="9" y="9" width="1" height="1" fill="#f9ffff"/><rect x="10" y="9" width="1" height="1" fill="#393d5a"/><rect x="11" y="9" width="1" height="1" fill="#484a70"/><rect x="12" y="9" width="1" height="1" fill="#3d4063"/><rect x="13" y="9" width="1" height="1" fill="#454964"/><rect x="2" y="10" width="1" height="1" fill="#46485f"/><rect x="3" y="10" width="1" height="1" fill="#424362"/><rect x="4" y="10" width="1" height="1" fill="#4a4a6c"/><rect x="6" y="10" width="1" height="1" fill="#fbfeff"/><rect x="7" y="10" width="1" height="1" fill="#f9fdff"/><rect x="8" y="10" width="1" height="1" fill="#fbffff"/><rect x="9" y="10" width="1" height="1" fill="#f6f9ff"/><rect x="10" y="10" width="1" height="1" fill="#0f102c"/><rect x="11" y="10" width="1" height="1" fill="#38385a"/><rect x="12" y="10" width="1" height="1" fill="#444564"/><rect x="13" y="10" width="1" height="1" fill="#404259"/><rect x="2" y="11" width="1" height="1" fill="#3d3e52"/><rect x="3" y="11" width="1" height="1" fill="#4b4d66"/><rect x="4" y="11" width="1" height="1" fill="#f8f8ff"/><rect x="5" y="11" width="1" height="1" fill="#f5f7ff"/><rect x="6" y="11" width="1" height="1" fill="#f3f5ff"/><rect x="7" y="11" width="1" height="1" fill="#12161f"/><rect x="9" y="11" width="1" height="1" fill="#fbfeff"/><rect x="10" y="11" width="1" height="1" fill="#fcfcff"/><rect x="11" y="11" width="1" height="1" fill="#fbfcff"/><rect x="12" y="11" width="1" height="1" fill="#3c3c56"/><rect x="13" y="11" width="1" height="1" fill="#414455"/><rect x="2" y="12" width="1" height="1" fill="#484755"/><rect x="3" y="12" width="1" height="1" fill="#f1f2ff"/><rect x="4" y="12" width="1" height="1" fill="#fefcff"/><rect x="5" y="12" width="1" height="1" fill="#48495d"/><rect x="6" y="12" width="1" height="1" fill="#4b4a5a"/><rect x="7" y="12" width="1" height="1" fill="#434551"/><rect x="8" y="12" width="1" height="1" fill="#4a4957"/><rect x="9" y="12" width="1" height="1" fill="#f5f7ff"/><rect x="10" y="12" width="1" height="1" fill="#413f54"/><rect x="11" y="12" width="1" height="1" fill="#fcfdff"/><rect x="12" y="12" width="1" height="1" fill="#f9f8ff"/><rect x="13" y="12" width="1" height="1" fill="#484a57"/><rect x="1" y="13" width="1" height="1" fill="#f5f6fb"/><rect x="2" y="13" width="1" height="1" fill="#fafaff"/><rect x="3" y="13" width="1" height="1" fill="#fefeff"/><rect x="4" y="13" width="1" height="1" fill="#f9f8ff"/><rect x="5" y="13" width="1" height="1" fill="#3d3c4c"/><rect x="6" y="13" width="1" height="1" fill="#454452"/><rect x="7" y="13" width="1" height="1" fill="#9a99a7"/><rect x="8" y="13" width="1" height="1" fill="#9897a5"/><rect x="9" y="13" width="1" height="1" fill="#42414f"/><rect x="10" y="13" width="1" height="1" fill="#4b4a5a"/><rect x="11" y="13" width="1" height="1" fill="#f9f8ff"/><rect x="12" y="13" width="1" height="1" fill="#f6f6ff"/><rect x="13" y="13" width="1" height="1" fill="#fefeff"/><rect x="14" y="13" width="1" height="1" fill="#fcfdff"/><rect x="1" y="14" width="1" height="1" fill="#fdfcff"/><rect x="2" y="14" width="1" height="1" fill="#fffeff"/><rect x="3" y="14" width="1" height="1" fill="#f9f8fe"/><rect x="4" y="14" width="2" height="1" fill="#fffdff"/><rect x="6" y="14" width="1" height="1" fill="#3a3846"/><rect x="7" y="14" width="2" height="1" fill="#484556"/><rect x="9" y="14" width="1" height="1" fill="#42404e"/><rect x="10" y="14" width="1" height="1" fill="#fffdff"/><rect x="11" y="14" width="1" height="1" fill="#fcfaff"/><rect x="12" y="14" width="1" height="1" fill="#fffeff"/><rect x="13" y="14" width="1" height="1" fill="#fbfaff"/><rect x="14" y="14" width="1" height="1" fill="#efeef3"/><rect x="2" y="15" width="1" height="1" fill="#9b9ca0"/><rect x="3" y="15" width="1" height="1" fill="#fcfbff"/><rect x="4" y="15" width="1" height="1" fill="#fffeff"/><rect x="5" y="15" width="1" height="1" fill="#f6f5fd"/><rect x="6" y="15" width="2" height="1" fill="#fffdff"/><rect x="8" y="15" width="1" height="1" fill="#faf8ff"/><rect x="9" y="15" width="1" height="1" fill="#fffdff"/><rect x="10" y="15" width="1" height="1" fill="#fdfcff"/><rect x="11" y="15" width="1" height="1" fill="#fefdff"/><rect x="12" y="15" width="1" height="1" fill="#fcfbff"/><rect x="13" y="15" width="1" height="1" fill="#939498"/><rect x="1" y="16" width="1" height="1" fill="#9b9ea7"/><rect x="2" y="16" width="1" height="1" fill="#f9fcff"/><rect x="3" y="16" width="1" height="1" fill="#feffff"/><rect x="4" y="16" width="1" height="1" fill="#fefeff"/><rect x="5" y="16" width="1" height="1" fill="#ffffff"/><rect x="6" y="16" width="1" height="1" fill="#fefcff"/><rect x="7" y="16" width="2" height="1" fill="#fffeff"/><rect x="9" y="16" width="1" height="1" fill="#fefcff"/><rect x="10" y="16" width="1" height="1" fill="#ffffff"/><rect x="11" y="16" width="1" height="1" fill="#fefeff"/><rect x="12" y="16" width="1" height="1" fill="#feffff"/><rect x="13" y="16" width="1" height="1" fill="#f9fcff"/><rect x="14" y="16" width="1" height="1" fill="#9b9ea7"/><rect x="1" y="17" width="1" height="1" fill="#a4a8b3"/><rect x="2" y="17" width="1" height="1" fill="#f6f9fe"/><rect x="3" y="17" width="1" height="1" fill="#f7fbfc"/><rect x="4" y="17" width="1" height="1" fill="#ffffff"/><rect x="5" y="17" width="1" height="1" fill="#fffffd"/><rect x="6" y="17" width="1" height="1" fill="#f8f6f7"/><rect x="7" y="17" width="2" height="1" fill="#fffdfe"/><rect x="9" y="17" width="1" height="1" fill="#f8f6f7"/><rect x="10" y="17" width="1" height="1" fill="#fffffd"/><rect x="11" y="17" width="1" height="1" fill="#feffff"/><rect x="12" y="17" width="1" height="1" fill="#f9fafe"/><rect x="13" y="17" width="1" height="1" fill="#f6f9fe"/><rect x="14" y="17" width="1" height="1" fill="#a4a8b3"/><rect x="1" y="18" width="1" height="1" fill="#898d96"/><rect x="2" y="18" width="1" height="1" fill="#fbfeff"/><rect x="3" y="18" width="1" height="1" fill="#fcffff"/><rect x="4" y="18" width="1" height="1" fill="#ffffff"/><rect x="5" y="18" width="1" height="1" fill="#fafafa"/><rect x="6" y="18" width="4" height="1" fill="#ffffff"/><rect x="10" y="18" width="1" height="1" fill="#fafafa"/><rect x="11" y="18" width="2" height="1" fill="#feffff"/><rect x="13" y="18" width="1" height="1" fill="#fbfeff"/><rect x="14" y="18" width="1" height="1" fill="#898d96"/><rect x="1" y="19" width="1" height="1" fill="#999da6"/><rect x="2" y="19" width="2" height="1" fill="#fcffff"/><rect x="4" y="19" width="1" height="1" fill="#fbfcfe"/><rect x="5" y="19" width="1" height="1" fill="#ffffff"/><rect x="6" y="19" width="1" height="1" fill="#f5f5f5"/><rect x="7" y="19" width="2" height="1" fill="#ffffff"/><rect x="9" y="19" width="1" height="1" fill="#f5f5f5"/><rect x="10" y="19" width="1" height="1" fill="#ffffff"/><rect x="11" y="19" width="1" height="1" fill="#fbfcfe"/><rect x="12" y="19" width="2" height="1" fill="#fcffff"/><rect x="14" y="19" width="1" height="1" fill="#999da6"/><rect x="1" y="20" width="1" height="1" fill="#989ba2"/><rect x="2" y="20" width="1" height="1" fill="#fcffff"/><rect x="3" y="20" width="1" height="1" fill="#fbfeff"/><rect x="4" y="20" width="1" height="1" fill="#95969a"/><rect x="5" y="20" width="1" height="1" fill="#fcfdff"/><rect x="6" y="20" width="1" height="1" fill="#fefefe"/><rect x="7" y="20" width="2" height="1" fill="#fffffd"/><rect x="9" y="20" width="1" height="1" fill="#fefefe"/><rect x="10" y="20" width="1" height="1" fill="#fcfdff"/><rect x="11" y="20" width="1" height="1" fill="#95969a"/><rect x="12" y="20" width="1" height="1" fill="#fbfeff"/><rect x="13" y="20" width="1" height="1" fill="#fcffff"/><rect x="14" y="20" width="1" height="1" fill="#989ba2"/><rect x="2" y="21" width="1" height="1" fill="#8f9297"/><rect x="3" y="21" width="1" height="1" fill="#999ca1"/><rect x="4" y="21" width="1" height="1" fill="#feffff"/><rect x="5" y="21" width="1" height="1" fill="#f9fafe"/><rect x="6" y="21" width="1" height="1" fill="#ffffff"/><rect x="7" y="21" width="2" height="1" fill="#fffffd"/><rect x="9" y="21" width="1" height="1" fill="#feffff"/><rect x="10" y="21" width="1" height="1" fill="#f9fafe"/><rect x="11" y="21" width="1" height="1" fill="#feffff"/><rect x="12" y="21" width="1" height="1" fill="#999ca1"/><rect x="13" y="21" width="1" height="1" fill="#8f9297"/><rect x="2" y="22" width="1" height="1" fill="#f9fcff"/><rect x="3" y="22" width="2" height="1" fill="#fcffff"/><rect x="5" y="22" width="1" height="1" fill="#f2f5fa"/><rect x="6" y="22" width="1" height="1" fill="#feffff"/><rect x="7" y="22" width="2" height="1" fill="#fbfdfa"/><rect x="9" y="22" width="1" height="1" fill="#feffff"/><rect x="10" y="22" width="1" height="1" fill="#f4f5fa"/><rect x="11" y="22" width="2" height="1" fill="#fcffff"/><rect x="13" y="22" width="1" height="1" fill="#f9fcff"/><rect x="2" y="23" width="1" height="1" fill="#f8fbff"/><rect x="3" y="23" width="1" height="1" fill="#fcfeff"/><rect x="4" y="23" width="1" height="1" fill="#fafcff"/><rect x="5" y="23" width="1" height="1" fill="#fcffff"/><rect x="6" y="23" width="1" height="1" fill="#fcfdff"/><rect x="7" y="23" width="2" height="1" fill="#fefffd"/><rect x="9" y="23" width="1" height="1" fill="#fcfdff"/><rect x="10" y="23" width="1" height="1" fill="#fcffff"/><rect x="11" y="23" width="1" height="1" fill="#fafcff"/><rect x="12" y="23" width="1" height="1" fill="#fcfeff"/><rect x="13" y="23" width="1" height="1" fill="#f8fbff"/><rect x="2" y="24" width="1" height="1" fill="#fcffff"/><rect x="3" y="24" width="1" height="1" fill="#f9fbff"/><rect x="4" y="24" width="1" height="1" fill="#fcfeff"/><rect x="5" y="24" width="2" height="1" fill="#fcffff"/><rect x="7" y="24" width="2" height="1" fill="#f9fefa"/><rect x="9" y="24" width="2" height="1" fill="#fcffff"/><rect x="11" y="24" width="1" height="1" fill="#fcfeff"/><rect x="12" y="24" width="1" height="1" fill="#f9fbff"/><rect x="13" y="24" width="1" height="1" fill="#fcffff"/><rect x="2" y="25" width="1" height="1" fill="#f8faff"/><rect x="3" y="25" width="2" height="1" fill="#f9faff"/><rect x="5" y="25" width="1" height="1" fill="#fcfeff"/><rect x="6" y="25" width="1" height="1" fill="#8e9295"/><rect x="7" y="25" width="2" height="1" fill="#9a9f9b"/><rect x="9" y="25" width="1" height="1" fill="#8e9295"/><rect x="10" y="25" width="1" height="1" fill="#fcfeff"/><rect x="11" y="25" width="2" height="1" fill="#f9faff"/><rect x="13" y="25" width="1" height="1" fill="#f8faff"/><rect x="3" y="26" width="1" height="1" fill="#414256"/><rect x="4" y="26" width="1" height="1" fill="#4b4d62"/><rect x="5" y="26" width="1" height="1" fill="#383b4a"/><rect x="10" y="26" width="1" height="1" fill="#383b4a"/><rect x="11" y="26" width="1" height="1" fill="#4b4d62"/><rect x="12" y="26" width="1" height="1" fill="#414256"/><rect x="3" y="27" width="1" height="1" fill="#414257"/><rect x="4" y="27" width="1" height="1" fill="#3d3f56"/><rect x="5" y="27" width="1" height="1" fill="#46495a"/><rect x="10" y="27" width="1" height="1" fill="#46495a"/><rect x="11" y="27" width="1" height="1" fill="#3d3f56"/><rect x="12" y="27" width="1" height="1" fill="#414257"/>`,
  };
  // 比對名字開頭（花🌼 → 花，猴🙉 → 猴，etc）
  for(const key of Object.keys(maps)){
    if(s.includes(key)){
      return (_avatarCache[s] = `<svg width="16" height="28" viewBox="0 0 16 28" style="image-rendering:pixelated;vertical-align:middle;">${maps[key]}</svg>`);
    }
  }
  return (_avatarCache[s] = `<span style="font-size:.75rem">${s}</span>`);
}
function fmtPer(n){if(!n||isNaN(n))return'—';return'NT$ '+Math.round(n/3).toLocaleString('zh-TW')+'<span style="font-size:.6em;color:var(--muted)">/人</span>';}
function fmtOrig(n,cur){
  if(!n||isNaN(n))return'';
  const sym={'ISK':'ISK ','EUR':'€','EU':'€','NT':'NT$'}[(cur||'').replace(/\./g,'').toUpperCase()]||(cur+' ');
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
  // ── 記住目前分頁，renderAll 後恢復
  const _activeTab = window._activeMainTab || 'ledger';
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
  const MEMBERS = ['花','猴','寧'];

  // 本地自算 paid（只有住宿＋租車，雜支 GAS 串接後才完整）
  const paidLocal = {'花':0,'猴':0,'寧':0};
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
  const DEPART = new Date('2026-09-14T00:00:00+08:00');
  const ARRIVE = new Date('2026-09-15T00:00:00+00:00');
  const RETURN_NING = new Date('2026-09-28T14:00:00+00:00');  // 寧回程班機（冰島時間，請自行填入）
  const RETURN_ALL  = new Date('2026-09-29T00:00:00+00:00');   // 花猴回程（冰島時間，請自行填入）
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

  // ── 圓餅比例（依 flightMode）
  const { perPersonAmt, grandDisplay, whoLabel, flightForDisplay, flightLabel, expForDisplay } =
    calcFlightDisplay(sharedTotal, totalFlight, d.flights||[], d.expenses||[]);
  const pieTotal   = grandDisplay || 1;
  const carPct     = carTotal/pieTotal;
  const flightPct  = flightForDisplay/pieTotal;
  const accomPct   = totalAccom/pieTotal;
  const actPct     = totalActivity/pieTotal;

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
              <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap" id="donutLegend">
                ${buildLegend(carPct, flightPct, accomPct, actPct)}
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
        <div id="activity" class="section"><div class="empty">🚧 施工中，敬請期待</div></div>
        <div id="daily" class="section"><div id="dailyContent">${renderDaily(d.expenses||[])}</div></div>
        <div id="insurance" class="section"><div id="insuranceContent"><div class="empty">🛡 保險資訊填入後顯示</div></div></div>
        <div id="repay" class="section"><div id="repayContent">${renderRepay(d.repayHistory||[], d.split||{})}</div></div>
      </div>

      <!-- 其他分頁（待開發） -->
      <div id="mainSection-info" style="display:none"><div id="infoContent"></div></div>
      <div id="mainSection-map"  style="display:none"><div class="empty">🐾 腳印頁面施工中</div></div>
      <div id="mainSection-bag"  style="display:none"><div class="empty">📖 手冊頁面施工中</div></div>
    </div>
  `;

  // ── DOM 建立完後初始化圓餅 canvas 和卷軸選擇器，並恢復分頁
  requestAnimationFrame(()=>{
    drawDonutCanvas(carPct, flightPct, accomPct, actPct);
    initDonutPicker();
    refreshDonut(); // 確保個人消費等數字在 renderAll 後也更新
    if (_activeTab !== 'ledger') {
      const btn = document.getElementById('mainTab-' + _activeTab);
      if (btn) switchMainTab(_activeTab, btn);
    }
  });
}

function showTab(id,btn){
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  btn.classList.add('active');
}

function switchMainTab(key, btn){
  window._activeMainTab = key;
  if (key === 'info') {
    setTimeout(() => {
      const el = document.getElementById('infoContent');
      if (el && !el.innerHTML) el.innerHTML = renderInfo(window.APP_DATA || window.STATIC);
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

// ── 同步邏輯
async function syncFromCloud(){
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