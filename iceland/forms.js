// forms.js — 像素風新增消費 & 還錢表單
// ══ 狀態 ══
let _pxPayer     = '';
let _pxSplitMode = 'equal';
let _pxRepayFrom = '';
let _pxRepayTo   = '';
const PX_MEMBERS = ['花','猴','寧'];

function pxLocalNow() {
  const now = new Date();
  const p = n => String(n).padStart(2,'0');
  return `${now.getFullYear()}-${p(now.getMonth()+1)}-${p(now.getDate())}T${p(now.getHours())}:${p(now.getMinutes())}`;
}

// ══ 新增選單 ══
window.openAddMenu = function() {
  document.getElementById('pxAddMenu').classList.add('show');
};
window.closeAddMenu = function() {
  document.getElementById('pxAddMenu').classList.remove('show');
};
window.closeAddMenuOutside = function(e) {
  if (e.target === document.getElementById('pxAddMenu')) closeAddMenu();
};

// ══ Modal 開關 ══
window.openPxModal = function(type) {
  closeAddMenu();
  if (type === 'expense') {
    _pxPayer = ''; _pxSplitMode = 'equal';
    document.querySelectorAll('#pxPayerBtns .px-member-btn').forEach(b => b.classList.remove('sel'));
    document.querySelectorAll('#pxSplitModeBtns .px-member-btn').forEach((b,i) => b.classList.toggle('sel', i===0));
    document.getElementById('pxExpCat').value  = '';
    document.getElementById('pxExpAmt').value  = '';
    document.getElementById('pxExpCur').value  = 'NT';
    document.getElementById('pxExpLoc').value  = '';
    document.getElementById('pxExpNote').value = '';
    document.getElementById('pxExpDate').value = pxLocalNow();
    PX_MEMBERS.forEach(m => { document.getElementById('pxSplit'+m).value = ''; });
    document.getElementById('pxSplitTotal').textContent = '0';
    document.getElementById('pxSplitDetail').style.display = 'none';
    document.getElementById('pxBtnExpense').disabled = true;
    document.getElementById('pxModalExpense').classList.add('show');
  } else {
    _pxRepayFrom = ''; _pxRepayTo = '';
    document.querySelectorAll('#pxRepayFromBtns .px-member-btn').forEach(b => b.classList.remove('sel'));
    document.querySelectorAll('#pxRepayToBtns  .px-member-btn').forEach(b => b.classList.remove('sel'));
    document.getElementById('pxRepayAmt').value  = '';
    document.getElementById('pxRepayNote').value = '';
    document.getElementById('pxRepayDate').value = pxLocalNow();
    document.getElementById('pxBtnRepay').disabled = true;
    document.getElementById('pxModalRepay').classList.add('show');
  }
};

window.cancelPxModal = function(id) {
  document.getElementById(id).classList.remove('show');
};
window.closePxModalOutside = function(e, id) {
  if (e.target === document.getElementById(id)) window.cancelPxModal(id);
};

// ══ 新增消費邏輯 ══
window.pxSelectPayer = function(btn, name) {
  document.querySelectorAll('#pxPayerBtns .px-member-btn').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');
  _pxPayer = name;
  pxUpdateSplit();
};

window.pxSetSplitMode = function(mode, btn) {
  _pxSplitMode = mode;
  document.querySelectorAll('#pxSplitModeBtns .px-member-btn').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');
  const amt = parseFloat(document.getElementById('pxExpAmt').value) || 0;
  document.getElementById('pxSplitDetail').style.display = amt > 0 ? 'block' : 'none';
  if (mode === 'equal') pxUpdateSplit();
};

window.pxUpdateSplit = function() {
  const amt = parseFloat(document.getElementById('pxExpAmt').value) || 0;
  document.getElementById('pxSplitDetail').style.display = amt > 0 ? 'block' : 'none';
  if (_pxSplitMode === 'equal' && amt > 0) {
    const each = Math.round((amt / 3) * 100) / 100;
    PX_MEMBERS.forEach(m => { document.getElementById('pxSplit'+m).value = each; });
  }
  pxCheckSplit();
};

window.pxCheckSplit = function() {
  const amt   = parseFloat(document.getElementById('pxExpAmt').value) || 0;
  const total = PX_MEMBERS.reduce((s,m) => s + (parseFloat(document.getElementById('pxSplit'+m).value)||0), 0);
  const diff  = Math.abs(total - amt);
  const el    = document.getElementById('pxSplitTotal');
  el.textContent = total.toFixed(2);
  el.className   = diff < 0.02 ? 'px-total-ok' : 'px-total-err';
  const cat  = document.getElementById('pxExpCat').value;
  document.getElementById('pxBtnExpense').disabled = diff >= 0.02 || !cat || !_pxPayer || amt <= 0;
};

window.pxSubmitExpense = async function() {
  const amt  = parseFloat(document.getElementById('pxExpAmt').value) || 0;
  const cat  = document.getElementById('pxExpCat').value;
  const cur  = document.getElementById('pxExpCur').value;
  const date = document.getElementById('pxExpDate').value || pxLocalNow();
  const loc  = document.getElementById('pxExpLoc').value;
  const note = document.getElementById('pxExpNote').value;
  const splits = {};
  PX_MEMBERS.forEach(m => { splits[m] = parseFloat(document.getElementById('pxSplit'+m).value)||0; });

  const payload = {
    action: 'addExpense', category: cat,
    amount: amt, currency: cur, payer: _pxPayer,
    split花: splits['花'], split猴: splits['猴'], split寧: splits['寧'],
    date, location: loc, note,
  };
  console.log('[forms] 新增開銷:', payload);
  // TODO: await postToGAS(payload);

  document.getElementById('pxModalExpense').classList.remove('show');
  alert('[ ✓ 已記錄！]\nGAS 串接後會同步寫入 Sheet。');
};

// ══ 還錢邏輯 ══
window.pxSelectRepayFrom = function(btn, name) {
  document.querySelectorAll('#pxRepayFromBtns .px-member-btn').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');
  _pxRepayFrom = name;
  pxValidateRepay();
};

window.pxSelectRepayTo = function(btn, name) {
  document.querySelectorAll('#pxRepayToBtns .px-member-btn').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');
  _pxRepayTo = name;
  pxValidateRepay();
};

window.pxValidateRepay = function() {
  const amt = parseFloat(document.getElementById('pxRepayAmt').value) || 0;
  document.getElementById('pxBtnRepay').disabled =
    !_pxRepayFrom || !_pxRepayTo || _pxRepayFrom === _pxRepayTo || amt <= 0;
};

window.pxSubmitRepay = async function() {
  const amt  = parseFloat(document.getElementById('pxRepayAmt').value) || 0;
  const date = document.getElementById('pxRepayDate').value || pxLocalNow();
  const note = document.getElementById('pxRepayNote').value;

  const payload = { action:'addRepay', from:_pxRepayFrom, to:_pxRepayTo, amount:amt, date, note };
  console.log('[forms] 還款:', payload);
  // TODO: await postToGAS(payload);

  document.getElementById('pxModalRepay').classList.remove('show');
  alert('[ ✓ 已記錄還款！]\nGAS 串接後會同步寫入 Sheet。');
};

// ══ GAS 送出（預留）══
// async function postToGAS(payload) {
//   const GAS_URL = 'https://script.google.com/macros/s/YOUR_GAS_ID/exec';
//   const res = await fetch(GAS_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
//   return res.json();
// }