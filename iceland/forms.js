// forms.js — 像素風新增消費 & 還錢表單

// ══ 狀態 ══
let _pxPayer     = '';
let _pxSplitMode = 'equal';
let _pxSplitSel  = new Set(['花','猴','寧']);
let _pxCustomAmt = {'花':0,'猴':0,'寧':0};
let _pxRepayFrom = '';
let _pxRepayTo   = '';
const PX_MEMBERS = ['花','猴','寧'];

// 算盤狀態
let _calcExpr    = '';
let _calcTarget  = '';   // 要填入的 input id
let _calcCb      = '';   // 填入後要呼叫的 callback 名稱
let _calcPrev    = '';   // 取消時還原的值

function pxLocalNow() {
  const now = new Date();
  const p = n => String(n).padStart(2,'0');
  return `${now.getFullYear()}-${p(now.getMonth()+1)}-${p(now.getDate())}T${p(now.getHours())}:${p(now.getMinutes())}`;
}

// ══ 背景鎖定 ══
function lockBody()   { document.body.style.overflow = 'hidden'; }
function unlockBody() { document.body.style.overflow = ''; }

// ══ 角色 SVG ══
function pxAvatarSvg(name, size=28) {
  if (typeof avatarSvg === 'function') {
    const scale = size / 28;
    const w = Math.round(16 * scale);
    return avatarSvg(name)
      .replace(/width="16"/, `width="${w}"`)
      .replace(/height="28"/, `height="${size}"`);
  }
  return `<span style="font-size:.8rem">${name}</span>`;
}

// ══ 角色按鈕 HTML（黯淡效果）══
function pxMemberBtnHtml(name, isSelected, onclickFn) {
  const opacity = isSelected ? '1' : '0.3';
  const filter  = isSelected ? 'none' : 'grayscale(70%)';
  const border  = isSelected ? '2px solid #2a4a1a' : '2px solid #888';
  const bg      = isSelected ? '#c8d8a8' : '#d8d8c8';
  const tri     = isSelected ? '▼' : '▼';
  const triColor= isSelected ? '#2a4a1a' : 'transparent';
  return `
    <button class="px-member-btn${isSelected?' sel':''}" onclick="${onclickFn}(this,'${name}')"
      style="opacity:${opacity};filter:${filter};border:${border};background:${bg};
             display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 4px;transition:all .2s;flex:1;">
      <div style="font-size:8px;color:${triColor};line-height:1;margin-bottom:2px;">${tri}</div>
      ${pxAvatarSvg(name, 28)}
      <span style="font-size:7px;color:#2a4a1a;margin-top:2px;font-family:'Silkscreen',monospace">${name}</span>
    </button>`;
}

// ══ 還錢滾動選擇器 ══
function pxRenderScrollPicker(listId, selectedName, onclickFn) {
  const el = document.getElementById(listId);
  if (!el) return;
  el.innerHTML = PX_MEMBERS.map(m => `
    <div class="px-scroll-picker-item${selectedName===m?' sel':''}" onclick="${onclickFn}('${m}')">
      ${pxAvatarSvg(m, 32)}
      <span>${m}</span>
    </div>`).join('');
  // 捲到選中的項目
  const idx = PX_MEMBERS.indexOf(selectedName);
  if (idx >= 0) setTimeout(() => { el.scrollTop = idx * 60; }, 50);
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
  lockBody();
  if (type === 'expense') {
    _pxPayer    = '';
    _pxSplitMode = 'equal';
    _pxSplitSel  = new Set(['花','猴','寧']);
    _pxCustomAmt = {'花':0,'猴':0,'寧':0};
    document.getElementById('pxExpCat').value  = '';
    document.getElementById('pxExpAmt').value  = '';
    document.getElementById('pxExpCur').value  = 'NT';
    document.getElementById('pxExpLoc').value  = '';
    document.getElementById('pxExpNote').value = '';
    document.getElementById('pxExpDate').value = pxLocalNow();
    document.getElementById('pxBtnExpense').disabled = true;
    document.getElementById('pxSplitSummary').textContent = '均分（三人）';
    pxRenderPayerBtns();
    pxRenderSplitBtns();
    document.getElementById('pxModalExpense').classList.add('show');
  } else {
    _pxRepayFrom = ''; _pxRepayTo = '';
    document.getElementById('pxRepayAmt').value  = '';
    document.getElementById('pxRepayNote').value = '';
    document.getElementById('pxRepayDate').value = pxLocalNow();
    document.getElementById('pxBtnRepay').disabled = true;
    pxRenderScrollPicker('pxRepayFromList', '', 'pxScrollSelectFrom');
    pxRenderScrollPicker('pxRepayToList',   '', 'pxScrollSelectTo');
    document.getElementById('pxModalRepay').classList.add('show');
  }
};

window.cancelPxModal = function(id) {
  document.getElementById(id).classList.remove('show');
  unlockBody();
};
window.closePxModalOutside = function(e, id) {
  if (e.target === document.getElementById(id)) window.cancelPxModal(id);
};

// ══ 付款人 ══
function pxRenderPayerBtns() {
  document.getElementById('pxPayerBtns').innerHTML =
    PX_MEMBERS.map(m => pxMemberBtnHtml(m, _pxPayer===m, 'pxSelectPayer')).join('');
}
window.pxSelectPayer = function(btn, name) {
  _pxPayer = name;
  pxRenderPayerBtns();
  pxCheckSubmit();
};

// ══ 如何分攤 ══
function pxRenderSplitBtns() {
  document.getElementById('pxSplitBtns').innerHTML =
    PX_MEMBERS.map(m => pxMemberBtnHtml(m, _pxSplitSel.has(m), 'pxToggleSplit')).join('');
}
window.pxToggleSplit = function(btn, name) {
  if (_pxSplitSel.has(name) && _pxSplitSel.size <= 1) return;
  if (_pxSplitSel.has(name)) _pxSplitSel.delete(name);
  else _pxSplitSel.add(name);
  _pxSplitMode = 'equal';
  pxRenderSplitBtns();
  pxUpdateSplitSummary();
  pxCheckSubmit();
};

window.pxUpdateSplit = function() {
  pxUpdateSplitSummary();
  pxCheckSubmit();
};

function pxUpdateSplitSummary() {
  const el = document.getElementById('pxSplitSummary');
  if (!el) return;
  const sel = [..._pxSplitSel];
  const amt = parseFloat(document.getElementById('pxExpAmt').value) || 0;
  if (_pxSplitMode === 'custom') {
    el.textContent = sel.map(m => `${m} NT$${_pxCustomAmt[m]}`).join(' / ');
  } else if (amt > 0) {
    const each = Math.round(amt / sel.length);
    el.textContent = `均分（${sel.join('、')}，各約 NT$${each}）`;
  } else {
    el.textContent = `均分（${sel.join('、')}）`;
  }
}

function pxCheckSubmit() {
  const amt = parseFloat(document.getElementById('pxExpAmt').value) || 0;
  const cat = document.getElementById('pxExpCat').value;
  document.getElementById('pxBtnExpense').disabled = !_pxPayer || amt <= 0 || !cat || _pxSplitSel.size === 0;
}
window.pxCheckSubmit = pxCheckSubmit;

// ══ 自訂金額彈窗 ══
window.pxOpenCustomSplit = function() {
  const amt = parseFloat(document.getElementById('pxExpAmt').value) || 0;
  if (amt <= 0) { alert('請先填寫金額'); return; }
  const sel = [..._pxSplitSel];
  const each = Math.round((amt / sel.length) * 100) / 100;
  sel.forEach(m => { if (!_pxCustomAmt[m]) _pxCustomAmt[m] = each; });

  const box = document.getElementById('pxCustomSplitBox');
  box.innerHTML = `
    <div class="px-modal-header" style="position:sticky;top:0;">
      <span>▶ 自訂金額</span>
      <button onclick="pxCloseCustomSplit()" style="background:none;border:1px solid #c8d8a8;color:#c8d8a8;font-family:'Silkscreen',monospace;font-size:8px;padding:2px 8px;cursor:pointer;">取消</button>
    </div>
    <div class="px-form">
      <div style="font-size:7px;color:#2a4a1a;margin-bottom:8px;">合計應為 NT$ ${amt.toLocaleString()}</div>
      ${PX_MEMBERS.map(m => `
        <div class="px-split-row" style="${_pxSplitSel.has(m)?'':'opacity:.35;pointer-events:none'}">
          <span class="px-split-name" style="display:flex;align-items:center;gap:3px;">${pxAvatarSvg(m,20)} ${m}</span>
          <input class="px-split-input" id="pxCA${m}" type="number" inputmode="decimal"
            value="${_pxSplitSel.has(m) ? (_pxCustomAmt[m]||each) : 0}"
            ${_pxSplitSel.has(m)?'':'disabled'}
            oninput="pxUpdateCustomTotal()">
        </div>`).join('')}
      <div class="px-split-total" style="margin-top:6px;">
        <span>合計</span>
        <span id="pxCustomTotal" class="px-total-ok">0</span>
      </div>
      <div id="pxCustomDiffMsg" style="font-size:7px;text-align:right;margin-top:3px;min-height:12px;"></div>
      <div class="px-form-actions" style="margin-top:8px;margin-bottom:8px;">
        <button class="px-btn-submit" id="pxBtnCustomOk" onclick="pxConfirmCustomSplit()" style="flex:1;">[ 確認 ]</button>
      </div>
    </div>`;
  document.getElementById('pxCustomSplitOverlay').classList.add('show');
  pxUpdateCustomTotal();
};

window.pxUpdateCustomTotal = function() {
  const amt = parseFloat(document.getElementById('pxExpAmt').value) || 0;
  const total = [..._pxSplitSel].reduce((s,m) => s+(parseFloat(document.getElementById('pxCA'+m)?.value)||0), 0);
  const diff = total - amt;
  const el = document.getElementById('pxCustomTotal');
  const msg = document.getElementById('pxCustomDiffMsg');
  if (el) {
    el.textContent = 'NT$ ' + total.toFixed(2);
    el.className = Math.abs(diff) < 0.02 ? 'px-total-ok' : 'px-total-err';
  }
  if (msg) {
    if (Math.abs(diff) < 0.02) msg.textContent = '';
    else if (diff > 0) msg.textContent = `▲ 超出 NT$${diff.toFixed(2)}`;
    else msg.textContent = `▼ 還差 NT$${Math.abs(diff).toFixed(2)} 未分配`;
    msg.style.color = Math.abs(diff) < 0.02 ? '#1a5a1a' : '#8a1010';
  }
  const btn = document.getElementById('pxBtnCustomOk');
  if (btn) btn.disabled = Math.abs(diff) >= 0.02;
};

window.pxConfirmCustomSplit = function() {
  PX_MEMBERS.forEach(m => {
    const el = document.getElementById('pxCA'+m);
    _pxCustomAmt[m] = el ? (parseFloat(el.value)||0) : 0;
  });
  _pxSplitMode = 'custom';
  document.getElementById('pxCustomSplitOverlay').classList.remove('show');
  pxUpdateSplitSummary();
  pxCheckSubmit();
};
window.pxCloseCustomSplit = function() {
  document.getElementById('pxCustomSplitOverlay').classList.remove('show');
};

// ══ 送出記帳 ══
window.pxSubmitExpense = async function() {
  const amt  = parseFloat(document.getElementById('pxExpAmt').value) || 0;
  const cat  = document.getElementById('pxExpCat').value;
  const cur  = document.getElementById('pxExpCur').value;
  const date = document.getElementById('pxExpDate').value || pxLocalNow();
  const loc  = document.getElementById('pxExpLoc').value;
  const note = document.getElementById('pxExpNote').value;
  const sel  = [..._pxSplitSel];
  const splits = {'花':0,'猴':0,'寧':0};
  if (_pxSplitMode === 'custom') {
    PX_MEMBERS.forEach(m => { splits[m] = _pxCustomAmt[m]||0; });
  } else {
    const each = Math.round((amt / sel.length) * 100) / 100;
    sel.forEach(m => { splits[m] = each; });
  }
  const payload = { action:'addExpense', category:cat, amount:amt, currency:cur, payer:_pxPayer,
    split花:splits['花'], split猴:splits['猴'], split寧:splits['寧'], date, location:loc, note };
  console.log('[forms] 新增開銷:', payload);
  // TODO: await postToGAS(payload);
  window.cancelPxModal('pxModalExpense');
  alert('[ ✓ 已記錄！]\nGAS 串接後會同步寫入 Sheet。');
};

// ══ 還錢：滾動選擇 ══
window.pxScrollSelectFrom = function(name) {
  _pxRepayFrom = name;
  pxRenderScrollPicker('pxRepayFromList', name, 'pxScrollSelectFrom');
  pxValidateRepay();
};
window.pxScrollSelectTo = function(name) {
  _pxRepayTo = name;
  pxRenderScrollPicker('pxRepayToList', name, 'pxScrollSelectTo');
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
  window.cancelPxModal('pxModalRepay');
  alert('[ ✓ 已記錄還款！]\nGAS 串接後會同步寫入 Sheet。');
};

// ══ 像素算盤 ══
window.pxOpenCalc = function(targetId, cbName) {
  _calcTarget = targetId;
  _calcCb     = cbName;
  _calcExpr   = '';
  _calcPrev   = document.getElementById(targetId)?.value || '';
  document.getElementById('pxCalcDisplay').textContent = _calcPrev || '0';
  document.getElementById('pxCalcExpr').textContent    = '';
  document.getElementById('pxCalcOverlay').classList.add('show');
};

window.pxCalcInput = function(key) {
  const disp = document.getElementById('pxCalcDisplay');
  const expr = document.getElementById('pxCalcExpr');
  if (key === 'C') {
    _calcExpr = '';
    disp.textContent = '0';
    expr.textContent = '';
    return;
  }
  _calcExpr += key;
  expr.textContent = _calcExpr;
  // 即時預覽（安全計算）
  try {
    const safe = _calcExpr.replace(/[^0-9+\-*/.()]/g,'');
    const result = Function('"use strict"; return (' + safe + ')')();
    if (isFinite(result)) disp.textContent = Math.round(result * 100) / 100;
  } catch(e) {
    disp.textContent = _calcExpr;
  }
};

window.pxCalcConfirm = function() {
  try {
    const safe = _calcExpr.replace(/[^0-9+\-*/.()]/g,'');
    const result = safe ? Function('"use strict"; return (' + safe + ')')() : parseFloat(_calcPrev)||0;
    if (!isFinite(result) || result < 0) { alert('請輸入有效金額'); return; }
    const val = Math.round(result * 100) / 100;
    const el = document.getElementById(_calcTarget);
    if (el) { el.value = val; }
    document.getElementById('pxCalcOverlay').classList.remove('show');
    if (_calcCb && window[_calcCb]) window[_calcCb]();
  } catch(e) {
    alert('計算錯誤，請重新輸入');
  }
};

window.pxCancelCalc = function() {
  const el = document.getElementById(_calcTarget);
  if (el) el.value = _calcPrev;
  document.getElementById('pxCalcOverlay').classList.remove('show');
};