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
function renderCar(car){
  return `
    <div class="car-card">
      <div class="car-header">
        <div class="car-title">${car.company}</div>
        <div class="car-model">${car.model}</div>
      </div>
      <div class="car-grid">
        <div class="car-item">
          <div class="car-item-label">確認碼</div>
          <div class="car-item-value" style="color:var(--gold);font-family:'Cinzel',serif;letter-spacing:.1em">${car.code}</div>
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
    <div class="car-card"><ul class="insurance-list">${car.insurance.map(i=>`<li>${i}</li>`).join('')}</ul></div>
    <div class="section-title">駕駛資訊</div>
    <div class="car-card">
      <div class="card-body" style="padding:13px 16px">
        <span class="tag tag-person" style="display:inline-flex;align-items:center;gap:3px;padding:2px 6px;">主要駕駛 ${avatarSvg(car.driver1)}</span>
        <span class="tag tag-person" style="display:inline-flex;align-items:center;gap:3px;padding:2px 6px;">副駕駛 ${avatarSvg(car.driver2)}</span>
        <span class="tag tag-paid" style="display:inline-flex;align-items:center;gap:3px;padding:2px 6px;">付款 ${avatarSvg(car.payer)}</span>
      </div>
    </div>
  `;
}

// ── 主渲染
function renderAll(){
  const d=window.APP_DATA || window.STATIC;
  const totalAccom=d.accommodation.reduce((s,a)=>s+(a.twd||0),0);
  const totalActivity=(d.activity||[]).reduce((s,a)=>s+(a.twd||0),0);
  const grandTotal=(d.car.totalTWD||0)+totalAccom+totalActivity;

  // ── 負債試算（誰付了多少 vs 應付）
  const MEMBERS = ['花','猴','寧'];
  const paid = {'花':0,'猴':0,'寧':0};
  // 住宿付款
  d.accommodation.forEach(a=>{
    if(!a.payer||!a.twd) return;
    for(const m of MEMBERS){ if(a.payer.includes(m)){ paid[m]+=a.twd; break; } }
  });
  // 租車付款
  if(d.car.totalTWD && d.car.payer){
    for(const m of MEMBERS){ if(d.car.payer.includes(m)){ paid[m]+=d.car.totalTWD; break; } }
  }
  const shouldPay = grandTotal/3;
  const debt = {};
  MEMBERS.forEach(m=>{ debt[m]=Math.round(paid[m]-shouldPay); });

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

  // ── 圓餅圖資料
  const carTotal = d.car.totalTWD || 0;
  const pieTotal = carTotal + totalAccom + totalActivity;
  const carPct   = pieTotal ? carTotal/pieTotal : 0;
  const accomPct = pieTotal ? totalAccom/pieTotal : 0;
  const actPct   = pieTotal ? totalActivity/pieTotal : 0;
  // SVG 圓餅（cx=cy=50 r=40，用 stroke-dasharray 疊加）
  const C = 2*Math.PI*40; // 251.33
  function pieSlice(offset,pct,color){
    if(pct<=0) return '';
    return `<circle cx="50" cy="50" r="40" fill="none" stroke="${color}" stroke-width="20"
      stroke-dasharray="${(pct*C).toFixed(2)} ${C.toFixed(2)}"
      stroke-dashoffset="${(-offset*C).toFixed(2)}"
      transform="rotate(-90 50 50)" style="image-rendering:pixelated"/>`;
  }
  const donutSvg=`<svg width="110" height="110" viewBox="0 0 100 100" style="display:block">
    <circle cx="50" cy="50" r="40" fill="none" stroke="#1e3a5f" stroke-width="20"/>
    ${pieSlice(0,         carPct,  '#f0c040')}
    ${pieSlice(carPct,    accomPct,'#7c4dff')}
    ${pieSlice(carPct+accomPct, actPct, '#4caf6e')}
    <circle cx="50" cy="50" r="28" fill="#0d1f35"/>
  </svg>`;

  // ── 各類別進度條（相對於 grandTotal）
  const cats = [
    {label:'🚗 交通', total:carTotal,      color:'#f0c040', pct: grandTotal?carTotal/grandTotal:0},
    {label:'🏕 住宿', total:totalAccom,    color:'#7c4dff', pct: grandTotal?totalAccom/grandTotal:0},
    {label:'🎯 活動', total:totalActivity, color:'#4caf6e', pct: grandTotal?totalActivity/grandTotal:0},
    {label:'🛒 日常', total:0,             color:'#4fc3f7', pct: 0},
  ];
  const catRows = cats.map(c=>`
    <div style="margin-bottom:9px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px">
        <span style="font-size:.72rem;color:var(--text)">${c.label}</span>
        <span style="font-family:'Cinzel',serif;font-size:.8rem;color:var(--gold)">${c.total?fmt(c.total/3):'—'}<span style="font-size:.6em;color:var(--muted)">/人</span></span>
      </div>
      <div style="height:5px;background:var(--bg3);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${(c.pct*100).toFixed(1)}%;background:${c.color};border-radius:3px;transition:width .6s"></div>
      </div>
      <div style="font-size:.63rem;color:var(--muted);margin-top:2px">合計 ${c.total?fmt(c.total):'—'}</div>
    </div>`).join('');

  // ── 分帳明細列（帶頭像 + 進度條）
  const maxPaid = Math.max(...MEMBERS.map(m=>paid[m]), 1);
  const debtRows = MEMBERS.map(m=>{
    const paidAmt = paid[m];
    const d_val   = debt[m]; // 正=要收回，負=要給出
    const barPct  = (paidAmt/maxPaid*100).toFixed(1);
    const barColor= d_val >= 0 ? 'var(--green)' : '#e8c020';
    let debtLabel = '';
    if(d_val > 0)       debtLabel = `→ 要收回 ${fmt(d_val)}`;
    else if(d_val < 0)  debtLabel = `→ 要給出 ${fmt(-d_val)}`;
    else                debtLabel = `→ 剛好平`;
    const debtColor = d_val > 0 ? 'var(--green)' : d_val < 0 ? 'var(--red)' : 'var(--muted)';
    return `
    <div style="margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
        ${avatarSvg(m)}
        <div style="flex:1;min-width:0">
          <div style="height:8px;background:var(--bg3);border-radius:2px;overflow:hidden">
            <div style="height:100%;width:${barPct}%;background:${barColor};border-radius:2px;transition:width .6s"></div>
          </div>
        </div>
        <span style="font-family:'Cinzel',serif;font-size:.78rem;color:var(--gold);white-space:nowrap">${paidAmt?fmt(paidAmt):'—'}</span>
      </div>
      <div style="font-size:.65rem;padding-left:22px;color:${debtColor}">${debtLabel}</div>
    </div>`;
  }).join('');

  document.getElementById('mainContent').innerHTML=`
    <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:14px;">
      <div style="font-size:.7rem;color:var(--muted);letter-spacing:.15em;text-transform:uppercase;margin-bottom:12px">總覽</div>

      <!-- 圓餅 + 累計花費：置中 -->
      <div style="display:flex;flex-direction:column;align-items:center;margin-bottom:16px">
        ${donutSvg}
        <div style="margin-top:8px;text-align:center">
          <div style="font-size:.63rem;color:var(--muted);letter-spacing:.1em;text-transform:uppercase;margin-bottom:2px">✈️ 累計花費</div>
          <div style="font-family:'Cinzel',serif;font-size:1.7rem;color:var(--gold);font-weight:600;line-height:1.1">NT$ ${Math.round(grandTotal/3).toLocaleString('zh-TW')}<span style="font-size:.5em;color:var(--muted)">/人</span></div>
          <div style="font-size:.7rem;color:var(--muted);margin-top:2px">合計 ${fmt(grandTotal)}</div>
          <div style="display:flex;gap:10px;justify-content:center;margin-top:8px">
            <span style="font-size:.63rem;display:flex;align-items:center;gap:3px"><span style="width:8px;height:8px;background:#f0c040;display:inline-block;border-radius:1px"></span>交通 ${carPct>0?(carPct*100).toFixed(0)+'%':'—'}</span>
            <span style="font-size:.63rem;display:flex;align-items:center;gap:3px"><span style="width:8px;height:8px;background:#7c4dff;display:inline-block;border-radius:1px"></span>住宿 ${accomPct>0?(accomPct*100).toFixed(0)+'%':'—'}</span>
            <span style="font-size:.63rem;display:flex;align-items:center;gap:3px"><span style="width:8px;height:8px;background:#4caf6e;display:inline-block;border-radius:1px"></span>活動 ${actPct>0?(actPct*100).toFixed(0)+'%':'—'}</span>
          </div>
        </div>
      </div>

      <!-- 小計 | 分帳：左右並排 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border-top:1px solid var(--border);padding-top:12px">
        <div style="padding-right:12px;border-right:1px solid var(--border)">
          <div style="font-size:.63rem;color:var(--muted);letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px">小計</div>
          ${catRows}
        </div>
        <div style="padding-left:12px">
          <div style="font-size:.63rem;color:var(--muted);letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px">分帳明細</div>
          ${debtRows}
        </div>
      </div>
    </div>
    <div class="rate-bar">
      <span>💱 <strong>ISK</strong> = ${d.exchangeISK.toFixed(4)} NT$</span>
      <span>💱 <strong>EUR</strong> = ${d.exchangeEUR.toFixed(2)} NT$</span>
    </div>
    <div class="tabs">
      <button class="tab active" onclick="showTab('accommodation',this)">🏕 住宿</button>
      <button class="tab" onclick="showTab('car',this)">🚗 交通</button>
      <button class="tab" onclick="showTab('activity',this)">🎯 活動</button>
      <button class="tab" onclick="showTab('daily',this)">🛒 日常</button>
      <button class="tab" onclick="openAddMenu()" style="font-family:'Silkscreen',monospace;font-size:.9rem;padding:7px 14px;">＋</button>
    </div>
    <div id="accommodation" class="section active">
      <div id="accomContent">${renderAccom(d.accommodation)}</div>
    </div>
    <div id="car" class="section">${renderCar(d.car)}</div>
    <div id="activity" class="section"><div class="empty">🚧 施工中，敬請期待</div></div>
    <div id="daily" class="section"><div id="dailyContent" class="empty">🛒 旅途中新增的日常開銷會顯示在這裡</div></div>
  `;
}

function showTab(id,btn){
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  btn.classList.add('active');
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