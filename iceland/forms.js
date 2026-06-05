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
let _calcExpr  = '';
let _calcTarget = '';
let _calcCb    = '';
let _calcPrev  = '';

// 修改模式（刪舊＋新增）
let _editMode     = false;   // 是否為修改模式
let _editRowIndex = null;    // 要刪除的舊資料行號
let _editSheet    = '';      // 'expense' | 'repay'

// ══ GAS API ══
const _GAS_BASE = "https://script.google.com/macros/s/AKfycbzdizbJL4rRrHaeVNWFqp4mZiJ8BXJdE0wO7beJTIjyLgy4Nmzv9vDGmjRNi5TLgWg0/exec";

async function postToGAS(payload) {
  // GAS 串接後取消下面的註解，刪掉 mock return
  console.log('[GAS mock] postToGAS:', payload);
  return { success: true };

  // const res = await fetch(_GAS_BASE, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(payload),
  //   redirect: 'follow',
  // });
  // if (!res.ok) throw new Error('GAS 回應錯誤：' + res.status);
  // return res.json();
}

async function deleteRowFromGAS(sheet, rowIndex) {
  return postToGAS({ action: 'deleteRow', sheet, rowIndex });
}

function pxLocalNow() {
  const now = new Date();
  const p = n => String(n).padStart(2,'0');
  return `${now.getFullYear()}-${p(now.getMonth()+1)}-${p(now.getDate())}T${p(now.getHours())}:${p(now.getMinutes())}`;
}

// ── 背景鎖定
function lockBody()   { document.body.style.overflow = 'hidden'; }
function unlockBody() { document.body.style.overflow = ''; }

// ── 角色 SVG
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

// ── 角色按鈕 HTML
function pxMemberBtnHtml(name, isSelected, onclickFn) {
  const op  = isSelected ? '1' : '0.3';
  const fil = isSelected ? 'none' : 'grayscale(70%)';
  const bdr = isSelected ? '2px solid #2a4a1a' : '2px solid #888';
  const bg  = isSelected ? '#c8d8a8' : '#d8d8c8';
  const tri = isSelected ? '#2a4a1a' : 'transparent';
  return `<button class="px-member-btn${isSelected?' sel':''}" onclick="${onclickFn}(this,'${name}')"
    style="opacity:${op};filter:${fil};border:${bdr};background:${bg};
           display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 4px;transition:all .2s;flex:1;">
    <div style="font-size:8px;color:${tri};line-height:1;margin-bottom:2px;">▼</div>
    ${pxAvatarSvg(name,28)}
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
window.openPxModal = function(type, prefill = null) {
  closeAddMenu();
  lockBody();

  if (type === 'expense') {
    _pxPayer     = prefill?.payer || '';
    _pxSplitMode = prefill?.splitMode || 'equal';
    _pxSplitSel  = new Set(prefill?.splitSel || ['花','猴','寧']);
    _pxCustomAmt = prefill?.customAmt || {'花':0,'猴':0,'寧':0};

    // 動態建立類別選單
    const catSel = document.getElementById('pxExpCat');
    const cats = (window.APP_DATA?.expenseCategories?.length ? window.APP_DATA.expenseCategories : null)
              || window.STATIC?.expenseCategories
              || [];
    catSel.innerHTML = '<option value="">-- 選擇類別 --</option>' +
      cats.map(c => `<option value="${c}"${prefill?.category===c?' selected':''}>${c}</option>`).join('');

    document.getElementById('pxExpAmt').value  = prefill?.amount || '';
    document.getElementById('pxExpCur').value  = prefill?.currency || 'NT';
    document.getElementById('pxExpLoc').value  = prefill?.location || '';
    document.getElementById('pxExpNote').value = prefill?.note || '';
    document.getElementById('pxExpDate').value = prefill?.date || pxLocalNow();
    document.getElementById('pxExpShared').checked = prefill?.isShared !== false; // 預設勾選

    // 修改模式標題
    const header = document.querySelector('#pxModalExpense .px-modal-header span');
    if (header) header.textContent = _editMode ? '▶ 修改消費' : '▶ 新增消費';
    document.getElementById('pxBtnExpense').textContent = _editMode ? '[ 確認修改 ]' : '[ 記帳！]';
    document.getElementById('pxBtnExpense').disabled = !_editMode;

    document.getElementById('pxSplitSummary').textContent = '均分（三人）';
    pxRenderPayerBtns();
    pxRenderSplitBtns();
    if (_editMode) pxCheckSubmit();

    // reset tag + brand
    window.pxResetTags?.();
    window.pxResetBrand?.();
    if (prefill?.tags) prefill.tags.forEach(t => window.pxGetSelectedTags && window.pxGetSelectedTags()); // prefill tags handled later
    const tagField = document.getElementById('pxTagField');
    if (tagField) tagField.style.display = prefill?.category ? 'block' : 'none';

    document.getElementById('pxModalExpense').classList.add('show');

  } else {
    _pxRepayFrom = prefill?.from || '';
    _pxRepayTo   = prefill?.to || '';

    document.getElementById('pxRepayAmt').value  = prefill?.amount || '';
    document.getElementById('pxRepayNote').value = prefill?.note || '';
    document.getElementById('pxRepayDate').value = prefill?.date || pxLocalNow();

    const header = document.querySelector('#pxModalRepay .px-modal-header span');
    if (header) header.textContent = _editMode ? '▶ 修改還款' : '▶ 還錢';
    document.getElementById('pxBtnRepay').textContent = _editMode ? '[ 確認修改 ]' : '[ 確認還款 ]';
    document.getElementById('pxBtnRepay').disabled = !_editMode;

    pxRenderScrollPicker('pxRepayFromList', _pxRepayFrom, 'from');
    pxRenderScrollPicker('pxRepayToList',   _pxRepayTo,   'to');
    if (_editMode) pxValidateRepay();
    document.getElementById('pxModalRepay').classList.add('show');
  }
};

// ══ 修改入口（從卡片滑動後呼叫）══
window.openEditExpense = function(rowIndex, data) {
  _editMode     = true;
  _editRowIndex = rowIndex;
  _editSheet    = 'expense';
  window.openPxModal('expense', data);
};

window.openEditRepay = function(rowIndex, data) {
  _editMode     = true;
  _editRowIndex = rowIndex;
  _editSheet    = 'repay';
  window.openPxModal('repay', data);
};

// ══ 刪除入口（從卡片滑動後呼叫）══
window.pxConfirmDelete = function(rowIndex, sheet, label) {
  // 像素風確認框
  const overlay = document.getElementById('pxDeleteOverlay');
  document.getElementById('pxDeleteLabel').textContent = label || '這筆記錄';
  overlay.classList.add('show');
  overlay._rowIndex = rowIndex;
  overlay._sheet    = sheet;
};

window.pxExecuteDelete = async function() {
  const overlay = document.getElementById('pxDeleteOverlay');
  const rowIndex = overlay._rowIndex;
  const sheet    = overlay._sheet;
  overlay.classList.remove('show');
  try {
    await deleteRowFromGAS(sheet, rowIndex);
    alert('[ ✓ 已刪除！]\nGAS 串接後會同步從 Sheet 移除。');
    window.__syncIcelandBudgetFromSheets?.();
  } catch(e) {
    alert('刪除失敗：' + e.message);
  }
};

window.pxCancelDelete = function() {
  document.getElementById('pxDeleteOverlay').classList.remove('show');
};

window.cancelPxModal = function(id) {
  document.getElementById(id).classList.remove('show');
  unlockBody();
  // 重置修改狀態
  _editMode     = false;
  _editRowIndex = null;
  _editSheet    = '';
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
  pxAutoShared();
  pxCheckSubmit();
};

window.pxUpdateSplit = function() {
  pxUpdateSplitSummary();
  pxCheckSubmit();
};

// 分攤人數 → 自動決定共同消費勾選
// 3人 → 勾選，1或2人 → 取消勾選
function pxAutoShared() {
  const el = document.getElementById('pxExpShared');
  if (!el) return;
  el.checked = _pxSplitSel.size === 3;
}

function pxUpdateSplitSummary() {
  const el  = document.getElementById('pxSplitSummary');
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
  const fuelFields = document.getElementById('pxFuelFields');
  if (fuelFields) fuelFields.style.display = cat === '加油' ? 'block' : 'none';
  // tag 欄位顯示/隱藏
  const tagField = document.getElementById('pxTagField');
  if (tagField) tagField.style.display = cat ? 'block' : 'none';
  document.getElementById('pxBtnExpense').disabled =
    !_pxPayer || amt <= 0 || !cat || _pxSplitSel.size === 0;
}
window.pxCheckSubmit = pxCheckSubmit;

// ══ 自訂金額彈窗 ══
window.pxOpenCustomSplit = function() {
  const amt = parseFloat(document.getElementById('pxExpAmt').value) || 0;
  if (amt <= 0) { alert('請先填寫金額'); return; }
  const sel  = [..._pxSplitSel];
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
            value="${_pxSplitSel.has(m)?(_pxCustomAmt[m]||each):0}"
            ${_pxSplitSel.has(m)?'':'disabled'}
            oninput="pxUpdateCustomTotal()">
        </div>`).join('')}
      <div class="px-split-total" style="margin-top:6px;">
        <span>合計</span><span id="pxCustomTotal" class="px-total-ok">0</span>
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
  const amt   = parseFloat(document.getElementById('pxExpAmt').value) || 0;
  const total = [..._pxSplitSel].reduce((s,m) => s+(parseFloat(document.getElementById('pxCA'+m)?.value)||0), 0);
  const diff  = total - amt;
  const el    = document.getElementById('pxCustomTotal');
  const msg   = document.getElementById('pxCustomDiffMsg');
  if (el) { el.textContent = 'NT$ '+total.toFixed(2); el.className = Math.abs(diff)<0.02?'px-total-ok':'px-total-err'; }
  if (msg) {
    if (Math.abs(diff)<0.02)   msg.textContent = '';
    else if (diff>0)            msg.textContent = '▲ 超出 NT$'+diff.toFixed(2);
    else                        msg.textContent = '▼ 還差 NT$'+Math.abs(diff).toFixed(2)+' 未分配';
    msg.style.color = Math.abs(diff)<0.02?'#1a5a1a':'#8a1010';
  }
  const btn = document.getElementById('pxBtnCustomOk');
  if (btn) btn.disabled = Math.abs(diff)>=0.02;
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

// ══ 送出記帳（新增 or 修改） ══
window.pxSubmitExpense = async function() {
  const amt  = parseFloat(document.getElementById('pxExpAmt').value) || 0;
  const cat  = document.getElementById('pxExpCat').value;
  const cur  = document.getElementById('pxExpCur').value;
  const date = document.getElementById('pxExpDate').value || pxLocalNow();
  const loc  = document.getElementById('pxExpLoc').value;
  const note = document.getElementById('pxExpNote').value;
  const isShared = document.getElementById('pxExpShared').checked;
  const sel  = [..._pxSplitSel];
  const splits = {'花':0,'猴':0,'寧':0};
  if (_pxSplitMode === 'custom') {
    PX_MEMBERS.forEach(m => { splits[m] = _pxCustomAmt[m]||0; });
  } else {
    const each = Math.round((amt/sel.length)*100)/100;
    sel.forEach(m => { splits[m] = each; });
  }
  const fuelMileage = cat === '加油' ? (parseFloat(document.getElementById('pxFuelMileage')?.value)||0) : 0;
  const fuelLiters  = cat === '加油' ? (parseFloat(document.getElementById('pxFuelLiters')?.value)||0)  : 0;
  const fuelBrand   = cat === '加油' ? (window.pxGetSelectedBrand?.() || document.getElementById('pxFuelBrand')?.value||'') : '';
  const tags        = cat === '雜支' ? (window.pxGetSelectedTags?.() || []).join(',') : '';

  try {
    // 修改模式：先刪舊的
    if (_editMode && _editRowIndex) {
      await deleteRowFromGAS(_editSheet, _editRowIndex);
    }
    // 新增
    await postToGAS({
      action: 'addExpense', category: cat, amount: amt, currency: cur, payer: _pxPayer,
      split花: splits['花'], split猴: splits['猴'], split寧: splits['寧'],
      date, location: loc, note, isShared,
      fuelMileage, fuelLiters, fuelBrand, tags,
    });
    window.cancelPxModal('pxModalExpense');
    alert(_editMode ? '[ ✓ 已修改！]' : '[ ✓ 已記錄！]');
    window.__syncIcelandBudgetFromSheets?.();
  } catch(e) {
    alert('送出失敗：' + e.message);
  }
};

// ══ 還錢：卷軸選擇（同圓餅圖邏輯）══
const PICKER_ITEM_H = 88;

function pxRenderScrollPicker(listId, selectedName, side) {
  const el = document.getElementById(listId);
  if (!el) return;

  const pad = `<div style="height:${PICKER_ITEM_H}px;flex-shrink:0;"></div>`;
  el.innerHTML = pad + PX_MEMBERS.map(m =>
    `<div class="px-repay-picker-item${m===selectedName?' sel':''}" data-key="${m}">
      ${pxAvatarSvg(m, 44)}
      <span>${m}</span>
    </div>`
  ).join('') + pad;

  // 捲到選中位置
  const idx = PX_MEMBERS.indexOf(selectedName);
  el.scrollTop = (idx + 1) * PICKER_ITEM_H;

  // 點擊：換下一個（同圓餅圖）
  el.addEventListener('click', e => {
    const item = e.target.closest('.px-repay-picker-item');
    if (!item) return;
    const cur     = side === 'from' ? _pxRepayFrom : _pxRepayTo;
    const curIdx  = PX_MEMBERS.indexOf(cur);
    const nextIdx = (curIdx + 1) % PX_MEMBERS.length;
    const nextKey = PX_MEMBERS[nextIdx];
    if (side === 'from') _pxRepayFrom = nextKey; else _pxRepayTo = nextKey;
    el.scrollTo({ top: (nextIdx + 1) * PICKER_ITEM_H, behavior: 'smooth' });
    el.querySelectorAll('.px-repay-picker-item').forEach(i => i.classList.toggle('sel', i.dataset.key === nextKey));
    pxValidateRepay();
  });

  // 滾動結束後更新（同圓餅圖）
  let _t;
  el.addEventListener('scroll', () => {
    clearTimeout(_t);
    _t = setTimeout(() => {
      const i       = Math.round(el.scrollTop / PICKER_ITEM_H) - 1;
      const clamped = Math.max(0, Math.min(i, PX_MEMBERS.length - 1));
      const newKey  = PX_MEMBERS[clamped];
      const cur     = side === 'from' ? _pxRepayFrom : _pxRepayTo;
      if (newKey !== cur) {
        if (side === 'from') _pxRepayFrom = newKey; else _pxRepayTo = newKey;
        el.querySelectorAll('.px-repay-picker-item').forEach(i => i.classList.toggle('sel', i.dataset.key === newKey));
        pxValidateRepay();
      }
    }, 80);
  }, { passive: true });
}

window.pxScrollSelectFrom = function(name) { _pxRepayFrom = name; pxValidateRepay(); };
window.pxScrollSelectTo   = function(name) { _pxRepayTo   = name; pxValidateRepay(); };
window.pxValidateRepay = function() {
  const amt = parseFloat(document.getElementById('pxRepayAmt').value) || 0;
  document.getElementById('pxBtnRepay').disabled =
    !_pxRepayFrom || !_pxRepayTo || _pxRepayFrom === _pxRepayTo || amt <= 0;
};

// ══ 送出還款（新增 or 修改）══
window.pxSubmitRepay = async function() {
  const amt  = parseFloat(document.getElementById('pxRepayAmt').value) || 0;
  const date = document.getElementById('pxRepayDate').value || pxLocalNow();
  const note = document.getElementById('pxRepayNote').value;
  try {
    if (_editMode && _editRowIndex) {
      await deleteRowFromGAS(_editSheet, _editRowIndex);
    }
    await postToGAS({ action: 'addRepay', from: _pxRepayFrom, to: _pxRepayTo, amount: amt, date, note });
    window.cancelPxModal('pxModalRepay');
    alert(_editMode ? '[ ✓ 已修改還款！]' : '[ ✓ 已記錄還款！]');
    window.__syncIcelandBudgetFromSheets?.();
  } catch(e) {
    alert('送出失敗：' + e.message);
  }
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
  if (key === 'C') { _calcExpr = ''; disp.textContent = '0'; expr.textContent = ''; return; }
  _calcExpr += key;
  expr.textContent = _calcExpr;
  try {
    const safe   = _calcExpr.replace(/[^0-9+\-*/.()]/g,'');
    const result = Function('"use strict"; return (' + safe + ')')();
    if (isFinite(result)) disp.textContent = Math.round(result*100)/100;
  } catch(e) { disp.textContent = _calcExpr; }
};

window.pxCalcConfirm = function() {
  try {
    const safe   = _calcExpr.replace(/[^0-9+\-*/.()]/g,'');
    const result = safe ? Function('"use strict"; return (' + safe + ')')() : parseFloat(_calcPrev)||0;
    if (!isFinite(result) || result < 0) { alert('請輸入有效金額'); return; }
    const val = Math.round(result*100)/100;
    const el  = document.getElementById(_calcTarget);
    if (el) el.value = val;
    document.getElementById('pxCalcOverlay').classList.remove('show');
    if (_calcCb && window[_calcCb]) window[_calcCb]();
  } catch(e) { alert('計算錯誤，請重新輸入'); }
};

window.pxCancelCalc = function() {
  const el = document.getElementById(_calcTarget);
  if (el) el.value = _calcPrev;
  document.getElementById('pxCalcOverlay').classList.remove('show');
};
