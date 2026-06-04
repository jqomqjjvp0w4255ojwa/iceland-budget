// forms.js — 像素風新增消費 & 還錢表單（改版）

// ══ 狀態 ══
let _pxPayer     = '';
let _pxSplitMode = 'equal';   // 'equal' | 'custom'
let _pxSplitSel  = new Set(['花','猴','寧']); // 如何分：預設全選
let _pxCustomAmt = {'花':0,'猴':0,'寧':0};   // 自訂金額暫存
let _pxRepayFrom = '';
let _pxRepayTo   = '';
const PX_MEMBERS = ['花','猴','寧'];

function pxLocalNow() {
  const now = new Date();
  const p = n => String(n).padStart(2,'0');
  return `${now.getFullYear()}-${p(now.getMonth()+1)}-${p(now.getDate())}T${p(now.getHours())}:${p(now.getMinutes())}`;
}

// ══ 角色 SVG（直接從 render.js 的 avatarSvg 取用）══
function pxAvatarSvg(name, size=28) {
  if (typeof avatarSvg === 'function') {
    // render.js 的 avatarSvg 回傳 16x28，scale up
    const scale = size / 28;
    const w = Math.round(16 * scale);
    const inner = avatarSvg(name);
    // 替換 width/height
    return inner.replace(/width="16"/, `width="${w}"`).replace(/height="28"/, `height="${size}"`);
  }
  return `<span style="font-size:.8rem">${name}</span>`;
}

// ══ 角色按鈕 HTML（黯淡/選中效果）══
function pxMemberBtnHtml(name, isSelected, containerId, onclickFn) {
  const opacity = isSelected ? '1' : '0.3';
  const filter  = isSelected ? 'none' : 'grayscale(70%)';
  const border  = isSelected ? '2px solid #2a4a1a' : '2px solid #888';
  const bg      = isSelected ? '#c8d8a8' : '#d8d8c8';
  const triangle = isSelected ? '<div style="font-size:8px;color:#2a4a1a;line-height:1;margin-bottom:2px;">▼</div>' : '<div style="font-size:8px;color:transparent;line-height:1;margin-bottom:2px;">▼</div>';
  return `
    <button class="px-member-btn${isSelected?' sel':''}" onclick="${onclickFn}(this,'${name}')"
      style="opacity:${opacity};filter:${isSelected?'none':'grayscale(70%)'};border:${border};background:${bg};
             display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 4px;transition:all .2s;">
      ${triangle}
      ${pxAvatarSvg(name, 28)}
      <span style="font-size:7px;color:#2a4a1a;margin-top:2px;font-family:'Silkscreen',monospace">${name}</span>
    </button>`;
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
    pxRenderRepayFromBtns();
    pxRenderRepayToBtns();
    document.getElementById('pxModalRepay').classList.add('show');
  }
};

window.cancelPxModal = function(id) {
  document.getElementById(id).classList.remove('show');
};
window.closePxModalOutside = function(e, id) {
  if (e.target === document.getElementById(id)) window.cancelPxModal(id);
};

// ══ 付款人按鈕渲染 ══
function pxRenderPayerBtns() {
  document.getElementById('pxPayerBtns').innerHTML =
    PX_MEMBERS.map(m => pxMemberBtnHtml(m, _pxPayer===m, 'pxPayerBtns', 'pxSelectPayer')).join('');
}

window.pxSelectPayer = function(btn, name) {
  _pxPayer = name;
  pxRenderPayerBtns();
  pxCheckSubmit();
};

// ══ 如何分按鈕渲染 ══
function pxRenderSplitBtns() {
  document.getElementById('pxSplitBtns').innerHTML =
    PX_MEMBERS.map(m => pxMemberBtnHtml(m, _pxSplitSel.has(m), 'pxSplitBtns', 'pxToggleSplit')).join('');
}

window.pxToggleSplit = function(btn, name) {
  // 至少保留一人
  if (_pxSplitSel.has(name) && _pxSplitSel.size <= 1) return;
  if (_pxSplitSel.has(name)) _pxSplitSel.delete(name);
  else _pxSplitSel.add(name);
  _pxSplitMode = 'equal'; // 切回均分
  pxRenderSplitBtns();
  pxUpdateSplitSummary();
  pxCheckSubmit();
};

window.pxOpenCustomSplit = function() {
  const amt = parseFloat(document.getElementById('pxExpAmt').value) || 0;
  if (amt <= 0) { alert('請先填寫金額'); return; }
  // 預填均分
  const sel = [..._pxSplitSel];
  const each = Math.round((amt / sel.length) * 100) / 100;
  sel.forEach(m => { _pxCustomAmt[m] = _pxCustomAmt[m] || each; });
  // 更新彈窗內容
  const box = document.getElementById('pxCustomSplitBox');
  box.innerHTML = `
    <div class="px-modal-header" style="position:sticky;top:0;">
      <span>▶ 自訂金額</span>
      <button onclick="pxCloseCustomSplit()">✕</button>
    </div>
    <div class="px-form">
      <div style="font-size:7px;color:#2a4a1a;margin-bottom:10px;">合計應為 NT$ ${amt.toLocaleString()}</div>
      ${PX_MEMBERS.map(m => `
        <div class="px-split-row" style="${_pxSplitSel.has(m)?'':'opacity:.35;pointer-events:none'}">
          <span class="px-split-name" style="display:flex;align-items:center;gap:3px;">${pxAvatarSvg(m,20)} ${m}</span>
          <input class="px-split-input" id="pxCA${m}" type="number" inputmode="decimal"
            value="${_pxSplitSel.has(m)?(_pxCustomAmt[m]||each):0}"
            ${_pxSplitSel.has(m)?'':'disabled'}
            oninput="pxUpdateCustomTotal()">
        </div>`).join('')}
      <div class="px-split-total">
        <span>合計</span>
        <span id="pxCustomTotal" class="px-total-ok">0</span>
      </div>
      <div class="px-form-actions" style="margin-top:8px;">
        <button class="px-btn-cancel" onclick="pxCloseCustomSplit()">[ 取消 ]</button>
        <button class="px-btn-submit" id="pxBtnCustomOk" onclick="pxConfirmCustomSplit()">[ 確認 ]</button>
      </div>
    </div>`;
  document.getElementById('pxCustomSplitOverlay').classList.add('show');
  pxUpdateCustomTotal();
};

window.pxUpdateCustomTotal = function() {
  const amt = parseFloat(document.getElementById('pxExpAmt').value) || 0;
  const total = [..._pxSplitSel].reduce((s,m) => {
    return s + (parseFloat(document.getElementById('pxCA'+m)?.value)||0);
  }, 0);
  const diff = Math.abs(total - amt);
  const el = document.getElementById('pxCustomTotal');
  if (el) {
    el.textContent = 'NT$ ' + total.toFixed(2);
    el.className = diff < 0.02 ? 'px-total-ok' : 'px-total-err';
  }
  const btn = document.getElementById('pxBtnCustomOk');
  if (btn) btn.disabled = diff >= 0.02;
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

function pxUpdateSplitSummary() {
  const el = document.getElementById('pxSplitSummary');
  if (!el) return;
  const sel = [..._pxSplitSel];
  if (_pxSplitMode === 'custom') {
    el.textContent = sel.map(m => `${m} NT$${_pxCustomAmt[m]}`).join(' / ');
  } else {
    const amt = parseFloat(document.getElementById('pxExpAmt').value) || 0;
    if (amt > 0 && sel.length > 0) {
      const each = Math.round(amt / sel.length);
      el.textContent = `均分（${sel.join('、')}，各約 NT$${each}）`;
    } else {
      el.textContent = `均分（${sel.join('、')}）`;
    }
  }
}

window.pxUpdateSplit = function() {
  pxUpdateSplitSummary();
  pxCheckSubmit();
};

function pxCheckSubmit() {
  const amt = parseFloat(document.getElementById('pxExpAmt').value) || 0;
  const cat = document.getElementById('pxExpCat').value;
  document.getElementById('pxBtnExpense').disabled = !_pxPayer || amt <= 0 || !cat || _pxSplitSel.size === 0;
}
window.pxCheckSubmit = pxCheckSubmit;

window.pxSubmitExpense = async function() {
  const amt  = parseFloat(document.getElementById('pxExpAmt').value) || 0;
  const cat  = document.getElementById('pxExpCat').value;
  const cur  = document.getElementById('pxExpCur').value;
  const date = document.getElementById('pxExpDate').value || pxLocalNow();
  const loc  = document.getElementById('pxExpLoc').value;
  const note = document.getElementById('pxExpNote').value;

  const sel = [..._pxSplitSel];
  const splits = {'花':0,'猴':0,'寧':0};
  if (_pxSplitMode === 'custom') {
    PX_MEMBERS.forEach(m => { splits[m] = _pxCustomAmt[m] || 0; });
  } else {
    const each = Math.round((amt / sel.length) * 100) / 100;
    sel.forEach(m => { splits[m] = each; });
  }

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
function pxRenderRepayFromBtns() {
  document.getElementById('pxRepayFromBtns').innerHTML =
    PX_MEMBERS.map(m => pxMemberBtnHtml(m, _pxRepayFrom===m, 'pxRepayFromBtns', 'pxSelectRepayFrom')).join('');
}
function pxRenderRepayToBtns() {
  document.getElementById('pxRepayToBtns').innerHTML =
    PX_MEMBERS.map(m => pxMemberBtnHtml(m, _pxRepayTo===m, 'pxRepayToBtns', 'pxSelectRepayTo')).join('');
}

window.pxSelectRepayFrom = function(btn, name) {
  _pxRepayFrom = name;
  pxRenderRepayFromBtns();
  pxValidateRepay();
};
window.pxSelectRepayTo = function(btn, name) {
  _pxRepayTo = name;
  pxRenderRepayToBtns();
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