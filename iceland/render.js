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
  expenseCategories: ['停車費','旅遊日常','訂房','門票與體驗','加油','行前'],
  budgetPerPerson: 100000,
};
window.APP_DATA = JSON.parse(JSON.stringify(window.STATIC));
let currentFilter='all';
let dataSource='local'; // 'local'|'cloud'|'syncing'|'offline'

// ── 格式化
function fmt(n){if(!n||isNaN(n))return'—';return'NT$ '+Math.round(n).toLocaleString('zh-TW');}

// ── 角色頭像（靜態第1格）
function avatarSvg(name) {
  const s = String(name||'').trim();
  const maps = {
    '花': `<rect x="5" y="6" width="6" height="1" fill="#feae34"/><rect x="3" y="7" width="10" height="1" fill="#feae34"/><rect x="2" y="8" width="12" height="1" fill="#feae34"/><rect x="1" y="9" width="4" height="1" fill="#feae34"/><rect x="5" y="9" width="6" height="1" fill="#fee761"/><rect x="11" y="9" width="4" height="1" fill="#feae34"/><rect x="1" y="10" width="3" height="1" fill="#feae34"/><rect x="4" y="10" width="8" height="1" fill="#fee761"/><rect x="12" y="10" width="3" height="1" fill="#feae34"/><rect x="0" y="11" width="4" height="1" fill="#feae34"/><rect x="4" y="11" width="8" height="1" fill="#fee761"/><rect x="12" y="11" width="4" height="1" fill="#feae34"/><rect x="0" y="12" width="3" height="1" fill="#feae34"/><rect x="3" y="12" width="2" height="1" fill="#fee761"/><rect x="5" y="12" width="1" height="1" fill="#3f2832"/><rect x="6" y="12" width="4" height="1" fill="#fee761"/><rect x="10" y="12" width="1" height="1" fill="#3f2832"/><rect x="11" y="12" width="2" height="1" fill="#fee761"/><rect x="13" y="12" width="3" height="1" fill="#feae34"/><rect x="0" y="13" width="3" height="1" fill="#feae34"/><rect x="3" y="13" width="1" height="1" fill="#fee761"/><rect x="4" y="13" width="1" height="1" fill="#3f2832"/><rect x="5" y="13" width="1" height="1" fill="#fee761"/><rect x="6" y="13" width="1" height="1" fill="#3f2832"/><rect x="7" y="13" width="2" height="1" fill="#fee761"/><rect x="9" y="13" width="1" height="1" fill="#3f2832"/><rect x="10" y="13" width="1" height="1" fill="#fee761"/><rect x="11" y="13" width="1" height="1" fill="#3f2832"/><rect x="12" y="13" width="1" height="1" fill="#fee761"/><rect x="13" y="13" width="3" height="1" fill="#feae34"/><rect x="0" y="14" width="3" height="1" fill="#feae34"/><rect x="3" y="14" width="10" height="1" fill="#fee761"/><rect x="13" y="14" width="3" height="1" fill="#feae34"/><rect x="0" y="15" width="3" height="1" fill="#feae34"/><rect x="3" y="15" width="4" height="1" fill="#fee761"/><rect x="7" y="15" width="2" height="1" fill="#f6757a"/><rect x="9" y="15" width="4" height="1" fill="#fee761"/><rect x="13" y="15" width="3" height="1" fill="#feae34"/><rect x="1" y="16" width="3" height="1" fill="#feae34"/><rect x="4" y="16" width="8" height="1" fill="#fee761"/><rect x="12" y="16" width="3" height="1" fill="#feae34"/><rect x="1" y="17" width="4" height="1" fill="#feae34"/><rect x="5" y="17" width="6" height="1" fill="#fee761"/><rect x="11" y="17" width="4" height="1" fill="#feae34"/><rect x="2" y="18" width="5" height="1" fill="#feae34"/><rect x="7" y="18" width="2" height="1" fill="#fee761"/><rect x="9" y="18" width="5" height="1" fill="#feae34"/><rect x="3" y="19" width="10" height="1" fill="#feae34"/><rect x="5" y="20" width="6" height="1" fill="#feae34"/><rect x="7" y="21" width="2" height="1" fill="#3e8948"/><rect x="2" y="22" width="1" height="1" fill="#57ab62"/><rect x="3" y="22" width="1" height="1" fill="#3e8948"/><rect x="7" y="22" width="2" height="1" fill="#3e8948"/><rect x="12" y="22" width="1" height="1" fill="#3e8948"/><rect x="13" y="22" width="1" height="1" fill="#57ab62"/><rect x="2" y="23" width="1" height="1" fill="#57ab62"/><rect x="3" y="23" width="3" height="1" fill="#3e8948"/><rect x="7" y="23" width="2" height="1" fill="#3e8948"/><rect x="10" y="23" width="3" height="1" fill="#3e8948"/><rect x="13" y="23" width="1" height="1" fill="#57ab62"/><rect x="3" y="24" width="1" height="1" fill="#57ab62"/><rect x="4" y="24" width="8" height="1" fill="#3e8948"/><rect x="12" y="24" width="1" height="1" fill="#57ab62"/><rect x="3" y="25" width="1" height="1" fill="#57ab62"/><rect x="4" y="25" width="8" height="1" fill="#3e8948"/><rect x="12" y="25" width="1" height="1" fill="#57ab62"/><rect x="4" y="26" width="2" height="1" fill="#57ab62"/><rect x="6" y="26" width="4" height="1" fill="#3e8948"/><rect x="10" y="26" width="2" height="1" fill="#57ab62"/><rect x="6" y="27" width="1" height="1" fill="#57ab62"/><rect x="7" y="27" width="2" height="1" fill="#3e8948"/><rect x="9" y="27" width="1" height="1" fill="#57ab62"/>`,
    '猴': `<rect x="5" y="7" width="6" height="1" fill="#b86f50"/><rect x="4" y="8" width="8" height="1" fill="#b86f50"/><rect x="3" y="9" width="10" height="1" fill="#b86f50"/><rect x="3" y="10" width="2" height="1" fill="#b86f50"/><rect x="5" y="10" width="2" height="1" fill="#ffc8b5"/><rect x="7" y="10" width="2" height="1" fill="#b86f50"/><rect x="9" y="10" width="2" height="1" fill="#ffc8b5"/><rect x="11" y="10" width="2" height="1" fill="#b86f50"/><rect x="1" y="11" width="3" height="1" fill="#b86f50"/><rect x="4" y="11" width="8" height="1" fill="#ffc8b5"/><rect x="12" y="11" width="3" height="1" fill="#b86f50"/><rect x="1" y="12" width="1" height="1" fill="#b86f50"/><rect x="2" y="12" width="1" height="1" fill="#ffb89f"/><rect x="3" y="12" width="1" height="1" fill="#b86f50"/><rect x="4" y="12" width="2" height="1" fill="#ffc8b5"/><rect x="6" y="12" width="1" height="1" fill="#3f2832"/><rect x="7" y="12" width="2" height="1" fill="#ffc8b5"/><rect x="9" y="12" width="1" height="1" fill="#3f2832"/><rect x="10" y="12" width="2" height="1" fill="#ffc8b5"/><rect x="12" y="12" width="1" height="1" fill="#b86f50"/><rect x="13" y="12" width="1" height="1" fill="#ffb89f"/><rect x="14" y="12" width="1" height="1" fill="#b86f50"/><rect x="1" y="13" width="3" height="1" fill="#b86f50"/><rect x="4" y="13" width="2" height="1" fill="#ffb89f"/><rect x="6" y="13" width="4" height="1" fill="#ffc8b5"/><rect x="10" y="13" width="2" height="1" fill="#ffb89f"/><rect x="12" y="13" width="3" height="1" fill="#b86f50"/><rect x="2" y="14" width="2" height="1" fill="#b86f50"/><rect x="4" y="14" width="2" height="1" fill="#ffb89f"/><rect x="6" y="14" width="1" height="1" fill="#ffc8b5"/><rect x="7" y="14" width="2" height="1" fill="#f6757a"/><rect x="9" y="14" width="1" height="1" fill="#ffc8b5"/><rect x="10" y="14" width="2" height="1" fill="#ffb89f"/><rect x="12" y="14" width="2" height="1" fill="#b86f50"/><rect x="2" y="15" width="1" height="1" fill="#3f2832"/><rect x="3" y="15" width="2" height="1" fill="#b86f50"/><rect x="5" y="15" width="6" height="1" fill="#ffc8b5"/><rect x="11" y="15" width="2" height="1" fill="#b86f50"/><rect x="13" y="15" width="1" height="1" fill="#925237"/><rect x="1" y="16" width="1" height="1" fill="#925237"/><rect x="2" y="16" width="1" height="1" fill="#b86f50"/><rect x="3" y="16" width="1" height="1" fill="#3f2832"/><rect x="4" y="16" width="10" height="1" fill="#b86f50"/><rect x="14" y="16" width="1" height="1" fill="#925237"/><rect x="1" y="17" width="1" height="1" fill="#925237"/><rect x="2" y="17" width="2" height="1" fill="#b86f50"/><rect x="4" y="17" width="2" height="1" fill="#3f2832"/><rect x="6" y="17" width="8" height="1" fill="#b86f50"/><rect x="14" y="17" width="1" height="1" fill="#925237"/><rect x="1" y="18" width="1" height="1" fill="#925237"/><rect x="2" y="18" width="4" height="1" fill="#b86f50"/><rect x="6" y="18" width="1" height="1" fill="#3f2832"/><rect x="7" y="18" width="7" height="1" fill="#b86f50"/><rect x="14" y="18" width="1" height="1" fill="#925237"/><rect x="1" y="19" width="1" height="1" fill="#925237"/><rect x="2" y="19" width="5" height="1" fill="#b86f50"/><rect x="7" y="19" width="2" height="1" fill="#3f2832"/><rect x="9" y="19" width="5" height="1" fill="#b86f50"/><rect x="14" y="19" width="1" height="1" fill="#925237"/><rect x="1" y="20" width="1" height="1" fill="#925237"/><rect x="2" y="20" width="2" height="1" fill="#b86f50"/><rect x="4" y="20" width="1" height="1" fill="#925237"/><rect x="5" y="20" width="4" height="1" fill="#b86f50"/><rect x="9" y="20" width="2" height="1" fill="#3f2832"/><rect x="11" y="20" width="1" height="1" fill="#925237"/><rect x="12" y="20" width="2" height="1" fill="#b86f50"/><rect x="14" y="20" width="1" height="1" fill="#925237"/><rect x="2" y="21" width="1" height="1" fill="#ffc8b5"/><rect x="3" y="21" width="1" height="1" fill="#ffb89f"/><rect x="4" y="21" width="6" height="1" fill="#b86f50"/><rect x="10" y="21" width="2" height="1" fill="#3f2832"/><rect x="12" y="21" width="1" height="1" fill="#ffb89f"/><rect x="13" y="21" width="1" height="1" fill="#ffc8b5"/><rect x="14" y="21" width="1" height="1" fill="#3f2832"/><rect x="2" y="22" width="8" height="1" fill="#b86f50"/><rect x="10" y="22" width="5" height="1" fill="#3f2832"/><rect x="2" y="23" width="9" height="1" fill="#b86f50"/><rect x="11" y="23" width="3" height="1" fill="#3f2832"/><rect x="2" y="24" width="12" height="1" fill="#b86f50"/><rect x="2" y="25" width="4" height="1" fill="#b86f50"/><rect x="6" y="25" width="4" height="1" fill="#925237"/><rect x="10" y="25" width="4" height="1" fill="#b86f50"/><rect x="3" y="26" width="3" height="1" fill="#b86f50"/><rect x="10" y="26" width="3" height="1" fill="#b86f50"/><rect x="3" y="27" width="3" height="1" fill="#5a6988"/><rect x="10" y="27" width="3" height="1" fill="#5a6988"/>`,
    '寧': `<rect x="3" y="4" width="1" height="1" fill="#434659"/><rect x="12" y="4" width="1" height="1" fill="#444559"/><rect x="3" y="5" width="1" height="1" fill="#41425e"/><rect x="4" y="5" width="1" height="1" fill="#3b3c58"/><rect x="11" y="5" width="1" height="1" fill="#3b3c58"/><rect x="12" y="5" width="1" height="1" fill="#41425e"/><rect x="2" y="6" width="1" height="1" fill="#3c4157"/><rect x="3" y="6" width="1" height="1" fill="#9598b9"/><rect x="4" y="6" width="1" height="1" fill="#393c5d"/><rect x="5" y="6" width="1" height="1" fill="#474b64"/><rect x="10" y="6" width="1" height="1" fill="#474b64"/><rect x="11" y="6" width="1" height="1" fill="#393c5d"/><rect x="12" y="6" width="1" height="1" fill="#9598b9"/><rect x="13" y="6" width="1" height="1" fill="#3c4157"/><rect x="2" y="7" width="1" height="1" fill="#414560"/><rect x="3" y="7" width="1" height="1" fill="#898caf"/><rect x="4" y="7" width="1" height="1" fill="#4a4c72"/><rect x="5" y="7" width="1" height="1" fill="#3f4360"/><rect x="6" y="7" width="1" height="1" fill="#3b414d"/><rect x="7" y="7" width="1" height="1" fill="#444c4e"/><rect x="8" y="7" width="1" height="1" fill="#444c4f"/><rect x="9" y="7" width="1" height="1" fill="#3b414d"/><rect x="10" y="7" width="1" height="1" fill="#3f4360"/><rect x="11" y="7" width="1" height="1" fill="#4a4c72"/><rect x="12" y="7" width="1" height="1" fill="#898bb1"/><rect x="13" y="7" width="1" height="1" fill="#414560"/><rect x="1" y="8" width="1" height="1" fill="#3d444c"/><rect x="2" y="8" width="1" height="1" fill="#464a65"/><rect x="3" y="8" width="1" height="1" fill="#3c3e64"/><rect x="4" y="8" width="1" height="1" fill="#3e4067"/><rect x="5" y="8" width="1" height="1" fill="#434665"/><rect x="6" y="8" width="1" height="1" fill="#3a404e"/><rect x="7" y="8" width="2" height="1" fill="#f9ffff"/><rect x="9" y="8" width="1" height="1" fill="#3c4250"/><rect x="10" y="8" width="1" height="1" fill="#424564"/><rect x="11" y="8" width="1" height="1" fill="#3f4167"/><rect x="12" y="8" width="1" height="1" fill="#43456b"/><rect x="13" y="8" width="1" height="1" fill="#3b3f5a"/><rect x="14" y="8" width="1" height="1" fill="#40474f"/><rect x="2" y="9" width="1" height="1" fill="#414560"/><rect x="3" y="9" width="1" height="1" fill="#3d4063"/><rect x="4" y="9" width="1" height="1" fill="#3a3c62"/><rect x="5" y="9" width="1" height="1" fill="#4a4e6b"/><rect x="6" y="9" width="1" height="1" fill="#f3f9ff"/><rect x="7" y="9" width="1" height="1" fill="#f8ffff"/><rect x="8" y="9" width="1" height="1" fill="#f4fbff"/><rect x="9" y="9" width="1" height="1" fill="#f9ffff"/><rect x="10" y="9" width="1" height="1" fill="#393d5a"/><rect x="11" y="9" width="1" height="1" fill="#484a70"/><rect x="12" y="9" width="1" height="1" fill="#3d4063"/><rect x="13" y="9" width="1" height="1" fill="#454964"/><rect x="2" y="10" width="1" height="1" fill="#46485f"/><rect x="3" y="10" width="1" height="1" fill="#424362"/><rect x="4" y="10" width="1" height="1" fill="#4a4a6c"/><rect x="6" y="10" width="1" height="1" fill="#fbfeff"/><rect x="7" y="10" width="1" height="1" fill="#f9fdff"/><rect x="8" y="10" width="1" height="1" fill="#fbffff"/><rect x="9" y="10" width="1" height="1" fill="#f6f9ff"/><rect x="10" y="10" width="1" height="1" fill="#0f102c"/><rect x="11" y="10" width="1" height="1" fill="#38385a"/><rect x="12" y="10" width="1" height="1" fill="#444564"/><rect x="13" y="10" width="1" height="1" fill="#404259"/><rect x="2" y="11" width="1" height="1" fill="#3d3e52"/><rect x="3" y="11" width="1" height="1" fill="#4b4d66"/><rect x="4" y="11" width="1" height="1" fill="#f8f8ff"/><rect x="5" y="11" width="1" height="1" fill="#f5f7ff"/><rect x="6" y="11" width="1" height="1" fill="#f3f5ff"/><rect x="7" y="11" width="1" height="1" fill="#12161f"/><rect x="9" y="11" width="1" height="1" fill="#fbfeff"/><rect x="10" y="11" width="1" height="1" fill="#fcfcff"/><rect x="11" y="11" width="1" height="1" fill="#fbfcff"/><rect x="12" y="11" width="1" height="1" fill="#3c3c56"/><rect x="13" y="11" width="1" height="1" fill="#414455"/><rect x="2" y="12" width="1" height="1" fill="#484755"/><rect x="3" y="12" width="1" height="1" fill="#f1f2ff"/><rect x="4" y="12" width="1" height="1" fill="#fefcff"/><rect x="5" y="12" width="1" height="1" fill="#48495d"/><rect x="6" y="12" width="1" height="1" fill="#4b4a5a"/><rect x="7" y="12" width="1" height="1" fill="#434551"/><rect x="8" y="12" width="1" height="1" fill="#4a4957"/><rect x="9" y="12" width="1" height="1" fill="#f5f7ff"/><rect x="10" y="12" width="1" height="1" fill="#413f54"/><rect x="11" y="12" width="1" height="1" fill="#fcfdff"/><rect x="12" y="12" width="1" height="1" fill="#f9f8ff"/><rect x="13" y="12" width="1" height="1" fill="#484a57"/><rect x="1" y="13" width="1" height="1" fill="#f5f6fb"/><rect x="2" y="13" width="1" height="1" fill="#fafaff"/><rect x="3" y="13" width="1" height="1" fill="#fefeff"/><rect x="4" y="13" width="1" height="1" fill="#f9f8ff"/><rect x="5" y="13" width="1" height="1" fill="#3d3c4c"/><rect x="6" y="13" width="1" height="1" fill="#454452"/><rect x="7" y="13" width="1" height="1" fill="#9a99a7"/><rect x="8" y="13" width="1" height="1" fill="#9897a5"/><rect x="9" y="13" width="1" height="1" fill="#42414f"/><rect x="10" y="13" width="1" height="1" fill="#4b4a5a"/><rect x="11" y="13" width="1" height="1" fill="#f9f8ff"/><rect x="12" y="13" width="1" height="1" fill="#f6f6ff"/><rect x="13" y="13" width="1" height="1" fill="#fefeff"/><rect x="14" y="13" width="1" height="1" fill="#fcfdff"/><rect x="1" y="14" width="1" height="1" fill="#fdfcff"/><rect x="2" y="14" width="1" height="1" fill="#fffeff"/><rect x="3" y="14" width="1" height="1" fill="#f9f8fe"/><rect x="4" y="14" width="2" height="1" fill="#fffdff"/><rect x="6" y="14" width="1" height="1" fill="#3a3846"/><rect x="7" y="14" width="2" height="1" fill="#484556"/><rect x="9" y="14" width="1" height="1" fill="#42404e"/><rect x="10" y="14" width="1" height="1" fill="#fffdff"/><rect x="11" y="14" width="1" height="1" fill="#fcfaff"/><rect x="12" y="14" width="1" height="1" fill="#fffeff"/><rect x="13" y="14" width="1" height="1" fill="#fbfaff"/><rect x="14" y="14" width="1" height="1" fill="#efeef3"/><rect x="2" y="15" width="1" height="1" fill="#9b9ca0"/><rect x="3" y="15" width="1" height="1" fill="#fcfbff"/><rect x="4" y="15" width="1" height="1" fill="#fffeff"/><rect x="5" y="15" width="1" height="1" fill="#f6f5fd"/><rect x="6" y="15" width="2" height="1" fill="#fffdff"/><rect x="8" y="15" width="1" height="1" fill="#faf8ff"/><rect x="9" y="15" width="1" height="1" fill="#fffdff"/><rect x="10" y="15" width="1" height="1" fill="#fdfcff"/><rect x="11" y="15" width="1" height="1" fill="#fefdff"/><rect x="12" y="15" width="1" height="1" fill="#fcfbff"/><rect x="13" y="15" width="1" height="1" fill="#939498"/><rect x="1" y="16" width="1" height="1" fill="#9b9ea7"/><rect x="2" y="16" width="1" height="1" fill="#f9fcff"/><rect x="3" y="16" width="1" height="1" fill="#feffff"/><rect x="4" y="16" width="1" height="1" fill="#fefeff"/><rect x="5" y="16" width="1" height="1" fill="#ffffff"/><rect x="6" y="16" width="1" height="1" fill="#fefcff"/><rect x="7" y="16" width="2" height="1" fill="#fffeff"/><rect x="9" y="16" width="1" height="1" fill="#fefcff"/><rect x="10" y="16" width="1" height="1" fill="#ffffff"/><rect x="11" y="16" width="1" height="1" fill="#fefeff"/><rect x="12" y="16" width="1" height="1" fill="#feffff"/><rect x="13" y="16" width="1" height="1" fill="#f9fcff"/><rect x="14" y="16" width="1" height="1" fill="#9b9ea7"/><rect x="1" y="17" width="1" height="1" fill="#a4a8b3"/><rect x="2" y="17" width="1" height="1" fill="#f6f9fe"/><rect x="3" y="17" width="1" height="1" fill="#f7fbfc"/><rect x="4" y="17" width="1" height="1" fill="#ffffff"/><rect x="5" y="17" width="1" height="1" fill="#fffffd"/><rect x="6" y="17" width="1" height="1" fill="#f8f6f7"/><rect x="7" y="17" width="2" height="1" fill="#fffdfe"/><rect x="9" y="17" width="1" height="1" fill="#f8f6f7"/><rect x="10" y="17" width="1" height="1" fill="#fffffd"/><rect x="11" y="17" width="1" height="1" fill="#feffff"/><rect x="12" y="17" width="1" height="1" fill="#f9fafe"/><rect x="13" y="17" width="1" height="1" fill="#f6f9fe"/><rect x="14" y="17" width="1" height="1" fill="#a4a8b3"/><rect x="1" y="18" width="1" height="1" fill="#898d96"/><rect x="2" y="18" width="1" height="1" fill="#fbfeff"/><rect x="3" y="18" width="1" height="1" fill="#fcffff"/><rect x="4" y="18" width="1" height="1" fill="#ffffff"/><rect x="5" y="18" width="1" height="1" fill="#fafafa"/><rect x="6" y="18" width="4" height="1" fill="#ffffff"/><rect x="10" y="18" width="1" height="1" fill="#fafafa"/><rect x="11" y="18" width="2" height="1" fill="#feffff"/><rect x="13" y="18" width="1" height="1" fill="#fbfeff"/><rect x="14" y="18" width="1" height="1" fill="#898d96"/><rect x="1" y="19" width="1" height="1" fill="#999da6"/><rect x="2" y="19" width="2" height="1" fill="#fcffff"/><rect x="4" y="19" width="1" height="1" fill="#fbfcfe"/><rect x="5" y="19" width="1" height="1" fill="#ffffff"/><rect x="6" y="19" width="1" height="1" fill="#f5f5f5"/><rect x="7" y="19" width="2" height="1" fill="#ffffff"/><rect x="9" y="19" width="1" height="1" fill="#f5f5f5"/><rect x="10" y="19" width="1" height="1" fill="#ffffff"/><rect x="11" y="19" width="1" height="1" fill="#fbfcfe"/><rect x="12" y="19" width="2" height="1" fill="#fcffff"/><rect x="14" y="19" width="1" height="1" fill="#999da6"/><rect x="1" y="20" width="1" height="1" fill="#989ba2"/><rect x="2" y="20" width="1" height="1" fill="#fcffff"/><rect x="3" y="20" width="1" height="1" fill="#fbfeff"/><rect x="4" y="20" width="1" height="1" fill="#95969a"/><rect x="5" y="20" width="1" height="1" fill="#fcfdff"/><rect x="6" y="20" width="1" height="1" fill="#fefefe"/><rect x="7" y="20" width="2" height="1" fill="#fffffd"/><rect x="9" y="20" width="1" height="1" fill="#fefefe"/><rect x="10" y="20" width="1" height="1" fill="#fcfdff"/><rect x="11" y="20" width="1" height="1" fill="#95969a"/><rect x="12" y="20" width="1" height="1" fill="#fbfeff"/><rect x="13" y="20" width="1" height="1" fill="#fcffff"/><rect x="14" y="20" width="1" height="1" fill="#989ba2"/><rect x="2" y="21" width="1" height="1" fill="#8f9297"/><rect x="3" y="21" width="1" height="1" fill="#999ca1"/><rect x="4" y="21" width="1" height="1" fill="#feffff"/><rect x="5" y="21" width="1" height="1" fill="#f9fafe"/><rect x="6" y="21" width="1" height="1" fill="#ffffff"/><rect x="7" y="21" width="2" height="1" fill="#fffffd"/><rect x="9" y="21" width="1" height="1" fill="#feffff"/><rect x="10" y="21" width="1" height="1" fill="#f9fafe"/><rect x="11" y="21" width="1" height="1" fill="#feffff"/><rect x="12" y="21" width="1" height="1" fill="#999ca1"/><rect x="13" y="21" width="1" height="1" fill="#8f9297"/><rect x="2" y="22" width="1" height="1" fill="#f9fcff"/><rect x="3" y="22" width="2" height="1" fill="#fcffff"/><rect x="5" y="22" width="1" height="1" fill="#f2f5fa"/><rect x="6" y="22" width="1" height="1" fill="#feffff"/><rect x="7" y="22" width="2" height="1" fill="#fbfdfa"/><rect x="9" y="22" width="1" height="1" fill="#feffff"/><rect x="10" y="22" width="1" height="1" fill="#f4f5fa"/><rect x="11" y="22" width="2" height="1" fill="#fcffff"/><rect x="13" y="22" width="1" height="1" fill="#f9fcff"/><rect x="2" y="23" width="1" height="1" fill="#f8fbff"/><rect x="3" y="23" width="1" height="1" fill="#fcfeff"/><rect x="4" y="23" width="1" height="1" fill="#fafcff"/><rect x="5" y="23" width="1" height="1" fill="#fcffff"/><rect x="6" y="23" width="1" height="1" fill="#fcfdff"/><rect x="7" y="23" width="2" height="1" fill="#fefffd"/><rect x="9" y="23" width="1" height="1" fill="#fcfdff"/><rect x="10" y="23" width="1" height="1" fill="#fcffff"/><rect x="11" y="23" width="1" height="1" fill="#fafcff"/><rect x="12" y="23" width="1" height="1" fill="#fcfeff"/><rect x="13" y="23" width="1" height="1" fill="#f8fbff"/><rect x="2" y="24" width="1" height="1" fill="#fcffff"/><rect x="3" y="24" width="1" height="1" fill="#f9fbff"/><rect x="4" y="24" width="1" height="1" fill="#fcfeff"/><rect x="5" y="24" width="2" height="1" fill="#fcffff"/><rect x="7" y="24" width="2" height="1" fill="#f9fefa"/><rect x="9" y="24" width="2" height="1" fill="#fcffff"/><rect x="11" y="24" width="1" height="1" fill="#fcfeff"/><rect x="12" y="24" width="1" height="1" fill="#f9fbff"/><rect x="13" y="24" width="1" height="1" fill="#fcffff"/><rect x="2" y="25" width="1" height="1" fill="#f8faff"/><rect x="3" y="25" width="2" height="1" fill="#f9faff"/><rect x="5" y="25" width="1" height="1" fill="#fcfeff"/><rect x="6" y="25" width="1" height="1" fill="#8e9295"/><rect x="7" y="25" width="2" height="1" fill="#9a9f9b"/><rect x="9" y="25" width="1" height="1" fill="#8e9295"/><rect x="10" y="25" width="1" height="1" fill="#fcfeff"/><rect x="11" y="25" width="2" height="1" fill="#f9faff"/><rect x="13" y="25" width="1" height="1" fill="#f8faff"/><rect x="3" y="26" width="1" height="1" fill="#414256"/><rect x="4" y="26" width="1" height="1" fill="#4b4d62"/><rect x="5" y="26" width="1" height="1" fill="#383b4a"/><rect x="10" y="26" width="1" height="1" fill="#383b4a"/><rect x="11" y="26" width="1" height="1" fill="#4b4d62"/><rect x="12" y="26" width="1" height="1" fill="#414256"/><rect x="3" y="27" width="1" height="1" fill="#414257"/><rect x="4" y="27" width="1" height="1" fill="#3d3f56"/><rect x="5" y="27" width="1" height="1" fill="#46495a"/><rect x="10" y="27" width="1" height="1" fill="#46495a"/><rect x="11" y="27" width="1" height="1" fill="#3d3f56"/><rect x="12" y="27" width="1" height="1" fill="#414257"/>`,
  };
  // 比對名字開頭（花🌼 → 花，猴🙉 → 猴，etc）
  for(const key of Object.keys(maps)){
    if(s.includes(key)){
      return `<svg width="16" height="28" viewBox="0 0 16 28" style="image-rendering:pixelated;vertical-align:middle;">${maps[key]}</svg>`;
    }
  }
  return `<span style="font-size:.75rem">${s}</span>`;
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
    const parts = String(str).split(':').map(Number);
    if (parts.length >= 2) return (parts[0] * 60) + parts[1];
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
  function segDetails(segs) {
    return segs.map((s, i) => {
      const dep = s.depTime ? String(s.depTime).replace('T',' ').slice(0,16) : '—';
      const arr = s.arrTime ? String(s.arrTime).replace('T',' ').slice(0,16) : '—';
      // 這段之後的轉機等待（用下一段的 waitTime）
      const nextWait = segs[i+1]?.waitTime;
      const waitDiv = nextWait ? `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 4px;color:var(--aurora3);font-size:.63rem;">
          <div style="flex:1;height:1px;background:var(--border)"></div>
          ⏱ 轉機等待 ${nextWait}
          <div style="flex:1;height:1px;background:var(--border)"></div>
        </div>` : '';
      return `
        <div style="background:var(--bg3);border-radius:8px;padding:10px 12px;margin-bottom:4px;">
          <!-- 出發→目的地 + 時間 整合 -->
          <div style="display:flex;align-items:stretch;gap:6px;margin-bottom:6px;">
            <!-- 出發 -->
            <div style="text-align:center;min-width:44px;">
              <div style="font-family:'Cinzel',serif;font-size:1.1rem;color:var(--accent2);font-weight:600;line-height:1">${s.from}</div>
              ${s.fromTerm?`<div style="font-size:.58rem;color:var(--muted)">T${s.fromTerm}</div>`:''}
              <div style="font-family:'Cinzel',serif;font-size:.95rem;color:var(--text);font-weight:600;margin-top:4px;line-height:1">${dep.slice(11)||'—'}</div>
              <div style="font-size:.58rem;color:var(--muted);margin-top:1px">${dep.slice(0,10)}</div>
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
            <div style="text-align:center;min-width:44px;">
              <div style="font-family:'Cinzel',serif;font-size:1.1rem;color:${s.isTransit?'var(--aurora3)':'var(--text)'};font-weight:600;line-height:1">${s.to}</div>
              ${s.toTerm?`<div style="font-size:.58rem;color:var(--muted)">T${s.toTerm}</div>`:''}
              ${s.isTransit?`<div style="font-size:.55rem;color:var(--aurora3);margin-top:2px">轉機</div>`:''}
              <div style="font-family:'Cinzel',serif;font-size:.95rem;color:var(--text);font-weight:600;margin-top:4px;line-height:1">${arr.slice(11)||'—'}</div>
              <div style="font-size:.58rem;color:var(--muted);margin-top:1px">${arr.slice(0,10)}</div>
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
            ${segDetails(goSegs)}`:''}
          <!-- 回程段落 -->
          ${retSegs.length?`
            <div style="font-size:.68rem;color:var(--aurora3);letter-spacing:.08em;margin:12px 0 6px;
                        display:flex;align-items:center;gap:6px;">
              <span>回程</span>
              <span style="font-size:.6rem;color:var(--muted)">${totalFlightTime(retSegs)||''}</span>
            </div>
            ${segDetails(retSegs)}`:''}`;
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
    {label:'🛒 日常', total:0,                 perLabel:'—',                  color:'#4fc3f7', pct:0},
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

// ── 主渲染
function renderAll(){
  const d=window.APP_DATA || window.STATIC;
  const totalAccom    = d.accommodation.reduce((s,a)=>s+(a.twd||0),0);
  const totalActivity = (d.activity||[]).reduce((s,a)=>s+(a.twd||0),0);
  const totalFlight   = d.totalFlightTWD||0;
  const carTotal      = d.car.totalTWD||0;

  // 日常開銷分成共同和個人兩類
  const totalExpenseShared   = (d.expenses||[]).filter(e=>e.isShared).reduce((s,e)=>s+(e.total||0),0);
  const totalExpensePersonal = (d.expenses||[]).filter(e=>!e.isShared).reduce((s,e)=>s+(e.total||0),0);

  // sharedTotal = 所有共同費用（住宿＋租車＋活動＋共同日常）
  const sharedTotal = carTotal + totalAccom + totalActivity + totalExpenseShared;
  const grandTotal  = sharedTotal + totalFlight;

  // ── 負債試算
  // paid：優先用 sheet 寫入_分帳 的「總付出」（含所有代墊）
  // shouldPay：優先用 sheet 的「總負擔」（含自己付自己的正確分攤）
  // 兩者都 fallback 到本地自算（sheet 資料未填時）
  const splitData = d.split || {};
  const MEMBERS = ['花','猴','寧'];

  // 本地自算 paid（只有住宿＋租車，日常開銷 GAS 串接後才完整）
  const paidLocal = {'花':0,'猴':0,'寧':0};
  d.accommodation.forEach(a=>{
    if(!a.payer||!a.twd) return;
    for(const m of MEMBERS){ if(a.payer.includes(m)){ paidLocal[m]+=a.twd; break; } }
  });
  if(d.car.totalTWD && d.car.payer){
    for(const m of MEMBERS){ if(d.car.payer.includes(m)){ paidLocal[m]+=d.car.totalTWD; break; } }
  }

  const paid = {};
  MEMBERS.forEach(m=>{
    paid[m] = splitData[m]?.paid || paidLocal[m] || 0;
  });
  const shouldPay = {};
  MEMBERS.forEach(m=>{
    shouldPay[m] = splitData[m]?.burden || sharedTotal/3;
  });
  const debt = {};
  MEMBERS.forEach(m=>{ debt[m]=Math.round(paid[m]-shouldPay[m]); });

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
  const { perPersonAmt, grandDisplay, whoLabel, flightForDisplay, flightLabel } =
    calcFlightDisplay(sharedTotal, totalFlight, d.flights||[]);
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
  const catRows = buildCatRows(carTotal, flightForDisplay, flightLabel, totalAccom, totalActivity, grandDisplay);

  // ── 分帳明細（從 寫入_分帳 Sheet 讀取，若無則 fallback 自算）
  const maxPaid = Math.max(...MEMBERS.map(m => splitData[m]?.paid || paid[m] || 0), 1);
  const debtRows = MEMBERS.map(m => {
    const paidAmt  = splitData[m]?.paid    ?? paid[m] ?? 0;
    const balance  = splitData[m]?.balance ?? debt[m] ?? 0;
    const barPct   = (paidAmt / maxPaid * 100).toFixed(1);
    const barColor = balance >= 0 ? 'var(--green)' : '#e8c020';
    const debtLabel = balance > 0 ? `→ 要收回 ${fmt(balance)}`
                    : balance < 0 ? `→ 要給出 ${fmt(-balance)}`
                    : `→ 剛好平`;
    const debtColor = balance > 0 ? 'var(--green)' : balance < 0 ? 'var(--red)' : 'var(--muted)';
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
        <span style="font-size:.95rem">📅</span><span>行程</span>
      </button>
      <button id="mainTab-map" onclick="switchMainTab('map',this)"
        style="flex:1;padding:6px 4px 9px;font-size:.72rem;display:flex;flex-direction:row;align-items:center;justify-content:center;gap:5px;
               background:var(--bg3);border:1px solid var(--border);border-bottom:none;
               border-radius:8px 8px 0 0;color:var(--muted);cursor:pointer;font-family:'Lato',sans-serif;position:relative;z-index:1;">
        <span style="font-size:.95rem">📍</span><span>足跡</span>
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
          <button class="tab" onclick="showTab('daily',this)">🛒 日常</button>
          <button class="tab" onclick="showTab('repay',this)">💸 還款</button>
        </div>
        <div id="accommodation" class="section active">
          <div id="accomContent">${renderAccom(d.accommodation)}</div>
        </div>
        <div id="car" class="section"><div id="carContent">${renderTransport(d)}</div></div>
        <div id="activity" class="section"><div class="empty">🚧 施工中，敬請期待</div></div>
        <div id="daily" class="section"><div id="dailyContent">${renderDaily(d.expenses||[])}</div></div>
        <div id="repay" class="section"><div id="repayContent">${renderRepay(d.repayHistory||[])}</div></div>
      </div>

      <!-- 其他分頁（待開發） -->
      <div id="mainSection-info" style="display:none"><div id="infoContent"></div></div>
      <div id="mainSection-map"  style="display:none"><div class="empty">📍 足跡頁面施工中</div></div>
      <div id="mainSection-bag"  style="display:none"><div class="empty">📖 手冊頁面施工中</div></div>
    </div>
  `;

  // ── DOM 建立完後初始化圓餅 canvas 和卷軸選擇器
  requestAnimationFrame(()=>{
    drawDonutCanvas(carPct, flightPct, accomPct, actPct);
    initDonutPicker();
  });
}

function showTab(id,btn){
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  btn.classList.add('active');
}

function switchMainTab(key, btn){
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
  renderAll();
  setSyncState('local','載入本地資料中…');
  await syncFromCloud();

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
  }
}

document.addEventListener('DOMContentLoaded', init);