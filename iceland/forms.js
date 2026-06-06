// forms.js — 像素風新增消費 & 還錢表單

// ══ 狀態 ══
let _pxPayer     = '';
let _pxSplitMode = 'equal';
let _pxSplitSel  = new Set(['花','猴','寧']);
let _pxCustomAmt = {'花':0,'猴':0,'寧':0};
let _twdManualEdited = false; // 使用者手動改過換算台幣
let _isSubmitting = false; // 防止重複送出

// 背景送出 GAS，稍等確保 GAS clearCache 完成再 sync
function bgSync(label) {
  setSyncState?.('syncing', label || '同步中…');
  setTimeout(() => {
    window.__syncIcelandBudgetFromSheets?.().catch(e => {
      setSyncState?.('local', '⚠ 同步失敗，下次開啟會重試');
    });
  }, 1500);
}

// 樂觀更新本地快取：把新資料立刻塞進 APP_DATA 並重繪
function optimisticAdd(type, item) {
  if (!window.APP_DATA) return;
  if (type === 'expense') {
    window.APP_DATA.expenses = [item, ...(window.APP_DATA.expenses||[])];
    _refreshSection('dailyContent', () => renderDaily(window.APP_DATA.expenses||[]));
  } else if (type === 'repay') {
    window.APP_DATA.repayHistory = [...(window.APP_DATA.repayHistory||[]), item];
    _refreshSection('repayContent', () => renderRepay(window.APP_DATA.repayHistory||[], window.APP_DATA.split||{}));
  }
  localStorage.setItem('cached_iceland_budget', JSON.stringify(window.APP_DATA));
}

function optimisticDelete(type, rowIndex) {
  if (!window.APP_DATA) return;
  if (type === 'expense') {
    window.APP_DATA.expenses = (window.APP_DATA.expenses||[]).filter(e => Number(e._rowIndex) !== Number(rowIndex));
    _refreshSection('dailyContent', () => renderDaily(window.APP_DATA.expenses||[]));
  } else if (type === 'repay') {
    window.APP_DATA.repayHistory = (window.APP_DATA.repayHistory||[]).filter(r => Number(r._rowIndex) !== Number(rowIndex));
    _refreshSection('repayContent', () => renderRepay(window.APP_DATA.repayHistory||[], window.APP_DATA.split||{}));
  }
  localStorage.setItem('cached_iceland_budget', JSON.stringify(window.APP_DATA));
}

// 只更新指定區塊，不重建整頁
function _refreshSection(elId, renderFn) {
  const el = document.getElementById(elId);
  if (!el) { window.renderAll?.(); return; }
  el.innerHTML = renderFn();
  // 重新初始化滑動
  if (window.initSwipeCards) window.initSwipeCards(el);
}
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
  const base = window._GAS_BASE;
  if (!base) throw new Error('找不到 GAS URL，請確認 app.js 已載入');
  // GAS doPost 需用 text/plain 避免 CORS preflight 被 redirect 擋住
  const res = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error('GAS 回應錯誤：' + res.status);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || '寫入失敗');
  return data;
}

async function deleteRowFromGAS(sheet, rowIndex) {
  if (sheet === 'expense') return postToGAS({ action: 'deleteExpense', rowIndex });
  if (sheet === 'repay')   return postToGAS({ action: 'deleteRepay',   rowIndex });
  throw new Error('未知的 sheet：' + sheet);
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
    // 台幣換算欄：編輯模式帶入已知 twd，新增模式清空
    const twdEl = document.getElementById('pxExpTwd');
    if (twdEl) twdEl.value = prefill?.twd ? String(prefill.twd) : '';
    _twdManualEdited = !!prefill?.twd; // 編輯模式帶入的值視為手動，不覆蓋
    pxOnCurrencyChange(); // 根據幣別決定顯示/隱藏換算列
    document.getElementById('pxExpLoc').value  = prefill?.location || '';
    // 地點建議：從已有記錄取最近三個不重複地點
    const locSuggests = document.getElementById('pxLocSuggests');
    if (locSuggests) {
      const recentLocs = [...new Set(
        (window.APP_DATA?.expenses || window.STATIC?.expenses || [])
          .slice().reverse()
          .map(e => e.location).filter(Boolean)
      )].slice(0, 3);
      locSuggests.innerHTML = recentLocs.map(loc =>
        `<button type="button" onclick="document.getElementById('pxExpLoc').value='${loc.replace(/'/g,'\'')}';"
          style="background:#c8d8a8;border:1px solid #2a4a1a;color:#1a3a0a;font-family:'Silkscreen',monospace;
                 font-size:10px;padding:2px 8px;border-radius:3px;cursor:pointer;">${loc}</button>`
      ).join('');
    }
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

    // reset tag + brand + qty
    // 標籤：編輯模式帶入已有標籤，新增模式清空
    if (prefill?.tags) window.pxLoadTags?.(prefill.tags);
    else window.pxResetTags?.();
    window.pxResetBrand?.();
    // 數量：編輯模式帶入原數量
    if (prefill?.qty) window.pxLoadQty?.(prefill.qty);
    else window.pxResetQty?.();
    // 清標籤輸入欄
    const tagInput = document.getElementById('pxTagInput');
    if (tagInput) { tagInput.value = ''; }
    const tagPanel = document.getElementById('pxTagPanel');
    if (tagPanel) { tagPanel.style.maxHeight='0'; tagPanel.style.opacity='0'; tagPanel.style.marginTop='0'; }
    const titleEl = document.getElementById('pxExpTitle');
    if (titleEl) titleEl.value = prefill?.title || '';
    document.getElementById('pxModalExpense').classList.add('show');

  } else {
    // 預設第一和第二個成員
    _pxRepayFrom = prefill?.from || PX_MEMBERS[0] || '';
    _pxRepayTo   = prefill?.to   || PX_MEMBERS[1] || '';

    document.getElementById('pxRepayAmt').value  = prefill?.amount || '';
    document.getElementById('pxRepayNote').value = prefill?.note || '';
    document.getElementById('pxRepayDate').value = prefill?.date || pxLocalNow();

    const header = document.querySelector('#pxModalRepay .px-modal-header span');
    if (header) header.textContent = _editMode ? '▶ 修改還款' : '▶ 還錢';
    document.getElementById('pxBtnRepay').textContent = _editMode ? '[ 確認修改 ]' : '[ 確認還款 ]';
    document.getElementById('pxBtnRepay').disabled = !_editMode;

    pxRenderScrollPicker('pxRepayFromList', _pxRepayFrom, 'from');
    pxRenderScrollPicker('pxRepayToList',   _pxRepayTo,   'to');
    pxValidateRepay();
    document.getElementById('pxModalRepay').classList.add('show');
  }
};

// ══ 修改入口（從卡片滑動後呼叫）══
window.openEditExpense = function(rowIndex, data) {
  _editMode     = true;
  _editRowIndex = Number(rowIndex);
  _editSheet    = 'expense';
  window.openPxModal('expense', data);
};

window.openEditRepay = function(rowIndex, data) {
  _editMode     = true;
  _editRowIndex = Number(rowIndex);
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

window.pxExecuteDelete = function() {
  const overlay = document.getElementById('pxDeleteOverlay');
  const rowIndex = overlay._rowIndex;
  const sheet    = overlay._sheet;
  overlay.classList.remove('show');

  // 立刻樂觀更新畫面
  const type = sheet === 'expense' ? 'expense' : 'repay';
  optimisticDelete(type, rowIndex);

  // 背景送 GAS
  deleteRowFromGAS(sheet, rowIndex)
    .then(() => bgSync('刪除同步中…'))
    .catch(() => setSyncState?.('local', '⚠ 刪除失敗，請重新同步'));
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
  pxAutoFillTwd(); // 金額確認後自動帶入換算台幣（空白時才填）
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
  // 品項欄：加油/停車不顯示
  const titleField = document.getElementById('pxTitleField');
  if (titleField) titleField.style.display = (cat === '加油' || cat === '停車費') ? 'none' : 'block';
  // 數量欄：加油/停車不顯示
  const hideQty = cat === '加油' || cat === '停車費';
  const qtyField = document.getElementById('pxQtyField');
  if (qtyField) qtyField.style.display = hideQty ? 'none' : 'block';
  const qtyRow = document.getElementById('pxQtyRow');
  if (qtyRow) {
    const qtyDiv = qtyRow.querySelector('div');
    if (qtyDiv) qtyDiv.style.display = hideQty ? 'none' : 'flex';
  }

  const disabled = !_pxPayer || amt <= 0 || !cat || _pxSplitSel.size === 0;
  document.getElementById('pxBtnExpense').disabled = disabled;
  const btnNext = document.getElementById('pxBtnExpenseNext');
  if (btnNext) btnNext.disabled = disabled || _editMode; // 下一筆不支援修改模式
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

// ══ 幣別切換：顯示/隱藏換算列，並自動帶入估算值 ══
window.pxOnCurrencyChange = function() {
  const cur    = document.getElementById('pxExpCur')?.value || 'NT';
  const twdRow = document.getElementById('pxTwdRow');
  if (!twdRow) return;
  if (cur === 'NT') {
    twdRow.style.display = 'none';
    const twdEl = document.getElementById('pxExpTwd');
    if (twdEl) twdEl.value = '';
    const hintEl = document.getElementById('pxTwdRateHint');
    if (hintEl) hintEl.textContent = '';
  } else {
    twdRow.style.display = 'flex';
    pxAutoFillTwd();
  }
  pxUpdateSplit();
};

// 根據目前金額+幣別自動填入估算台幣（每次都覆蓋，讓使用者看到參考值再決定要不要改）
window.pxAutoFillTwd = function() {
  const twdEl = document.getElementById('pxExpTwd');
  if (!twdEl) return;
  const amt = parseFloat(document.getElementById('pxExpAmt')?.value) || 0;
  const cur = document.getElementById('pxExpCur')?.value || 'NT';
  if (cur === 'NT' || amt <= 0) return;
  const exISK = window.APP_DATA?.exchangeISK || window.STATIC?.exchangeISK || 0;
  const exEUR = window.APP_DATA?.exchangeEUR || window.STATIC?.exchangeEUR || 0;
  const est = cur === 'ISK' ? Math.round(amt * exISK)
            : cur === 'EUR' ? Math.round(amt * exEUR)
            : 0;
  // 使用者手動改過就不覆蓋
  if (est > 0 && !_twdManualEdited) twdEl.value = String(est);
  // 匯率提示
  const hintEl = document.getElementById('pxTwdRateHint');
  if (hintEl) {
    const rate = cur === 'ISK' ? exISK : cur === 'EUR' ? exEUR : 0;
    hintEl.textContent = rate > 0
      ? `參考匯率：1 ${cur} = ${rate} NT$${_twdManualEdited ? '（已手動修改）' : ''}`
      : '';
  }
  // 不呼叫 pxUpdateSplit，避免與 pxUpdateSplit→pxAutoFillTwd 無限遞迴
  pxUpdateSplitSummary();
  pxCheckSubmit();
};

window.pxOnTwdManualEdit = function() {
  _twdManualEdited = true;
  const hintEl = document.getElementById('pxTwdRateHint');
  if (hintEl && hintEl.textContent) {
    const cur = document.getElementById('pxExpCur')?.value || '';
    const exISK = window.APP_DATA?.exchangeISK || window.STATIC?.exchangeISK || 0;
    const exEUR = window.APP_DATA?.exchangeEUR || window.STATIC?.exchangeEUR || 0;
    const rate = cur === 'ISK' ? exISK : cur === 'EUR' ? exEUR : 0;
    if (rate > 0) hintEl.textContent = `參考匯率：1 ${cur} = ${rate} NT$（已手動修改）`;
  }
  pxUpdateSplit();
};

window.pxClearTwd = function() {
  const twdEl = document.getElementById('pxExpTwd');
  _twdManualEdited = false; // 清除後允許重新自動換算
  if (twdEl) twdEl.value = '';
  pxAutoFillTwd(); // 立即重新帶入匯率估算值
};

// ══ 送出記帳（新增 or 修改） ══
window.pxSubmitExpense = async function(nextMode = false) {
  const amt  = parseFloat(document.getElementById('pxExpAmt').value) || 0;
  const cat  = document.getElementById('pxExpCat').value;
  const cur  = document.getElementById('pxExpCur').value;
  const date = document.getElementById('pxExpDate').value || pxLocalNow();
  const loc  = document.getElementById('pxExpLoc').value;
  const note = document.getElementById('pxExpNote').value;
  const isShared = document.getElementById('pxExpShared').checked;
  const sel  = [..._pxSplitSel];
  const splits = {'花':0,'猴':0,'寧':0};
  // 分攤基準：外幣用台幣換算值（手動填的優先），NT 直接用 amt
  const _splitCur = document.getElementById('pxExpCur')?.value || 'NT';
  const _twdForSplit = _splitCur === 'NT' ? amt
    : (parseFloat(document.getElementById('pxExpTwd')?.value) || 0) || amt;
  if (_pxSplitMode === 'custom') {
    PX_MEMBERS.forEach(m => { splits[m] = _pxCustomAmt[m]||0; });
  } else {
    const each = Math.round((_twdForSplit/sel.length)*100)/100;
    sel.forEach(m => { splits[m] = each; });
  }
  const fuelMileage = cat === '加油' ? (parseFloat(document.getElementById('pxFuelMileage')?.value)||0) : 0;
  const fuelLiters  = cat === '加油' ? (parseFloat(document.getElementById('pxFuelLiters')?.value)||0)  : 0;
  const fuelBrand   = cat === '加油' ? (window.pxGetSelectedBrand?.() || document.getElementById('pxFuelBrand')?.value||'') : '';
  const tags        = (window.pxGetSelectedTags?.() || []).join(',');

  if (_isSubmitting) return;
  _isSubmitting = true;

  // 換算台幣：優先用使用者手動填的值，否則用即時匯率估算
  const exISK = window.APP_DATA?.exchangeISK || window.STATIC?.exchangeISK || 0;
  const exEUR = window.APP_DATA?.exchangeEUR || window.STATIC?.exchangeEUR || 0;
  const twdManual = parseFloat(document.getElementById('pxExpTwd')?.value);
  const twd = cur === 'NT' ? amt
            : (Number.isFinite(twdManual) && twdManual > 0) ? twdManual
            : cur === 'ISK' ? Math.round(amt * exISK)
            : cur === 'EUR' ? Math.round(amt * exEUR)
            : amt;
  const total = twd;
  const title = (document.getElementById('pxExpTitle')?.value||'').trim();
  const qty   = parseInt(document.getElementById('pxExpQty')?.value||'1')||1;

  const payload = {
    action: _editMode ? 'editExpense' : 'addExpense',
    rowIndex: _editMode ? _editRowIndex : undefined,
    title, qty, category: cat, amount: amt, currency: cur,
    twd, foreignFee: 0, total,
    payer: _pxPayer,
    splitMode: [..._pxSplitSel].join(','),
    'split花': splits['花'], 'split猴': splits['猴'], 'split寧': splits['寧'],
    date, location: loc, note, isShared,
    fuelMileage, fuelLiters, fuelBrand, tags,
  };

  // nextMode：留窗清空；否則關窗
  if (nextMode) {
    // 按鈕短暫顯示成功
    const btnNext = document.getElementById('pxBtnExpenseNext');
    if (btnNext) {
      const orig = btnNext.textContent;
      btnNext.textContent = '✓ 已記錄！';
      btnNext.disabled = true;
      setTimeout(() => {
        btnNext.textContent = orig;
        pxCheckSubmit();
      }, 1200);
    }
    // 清空金額/品項/備註/標籤，保留類別/付款人/分攤/地點
    document.getElementById('pxExpAmt').value  = '';
    document.getElementById('pxExpTwd').value  = '';
    _twdManualEdited = false;
    pxOnCurrencyChange();
    const titleEl = document.getElementById('pxExpTitle');
    if (titleEl) titleEl.value = '';
    document.getElementById('pxExpNote').value = '';
    window.pxResetTags?.();
    window.pxResetQty?.();
    pxCheckSubmit();
  } else {
    window.cancelPxModal('pxModalExpense');
  }
  if (_editMode) {
    optimisticDelete('expense', _editRowIndex);
  }
  optimisticAdd('expense', {
    _rowIndex: _editMode ? _editRowIndex : -1, // 編輯模式用原行號，避免 bgSync 後重複
    category: cat, amount: amt, currency: cur, twd, total,
    payer: _pxPayer, date, location: loc, note, isShared, title, qty,
    splitMode: [..._pxSplitSel].join(','),
    burden: { '花': splits['花'], '猴': splits['猴'], '寧': splits['寧'] },
    tags,
  });

  // 背景送 GAS，不等待
  _isSubmitting = false;
  postToGAS(payload)
    .then(() => bgSync('記帳同步中…'))
    .catch(() => setSyncState?.('local', '⚠ 記帳失敗，請重新同步'));
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

  const idx = PX_MEMBERS.indexOf(selectedName);
  // 用 setTimeout 確保 modal 已顯示再設 scrollTop
  setTimeout(() => { el.scrollTop = (idx + 1) * PICKER_ITEM_H; }, 30);

  // 移除舊事件
  if (el._pickerClick)  el.removeEventListener('click',  el._pickerClick);
  if (el._pickerScroll) el.removeEventListener('scroll', el._pickerScroll);

  el._pickerClick = e => {
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
  };

  let _t;
  el._pickerScroll = () => {
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
  };

  el.addEventListener('click',  el._pickerClick);
  el.addEventListener('scroll', el._pickerScroll, { passive: true });
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
  if (_isSubmitting) return;
  _isSubmitting = true;

  const payload = {
    action: _editMode ? 'editRepay' : 'addRepay',
    rowIndex: _editMode ? _editRowIndex : undefined,
    from: _pxRepayFrom, to: _pxRepayTo, amount: amt, date, note,
  };

  // 立刻關窗、樂觀更新
  window.cancelPxModal('pxModalRepay');
  if (_editMode) {
    optimisticDelete('repay', _editRowIndex);
  }
  optimisticAdd('repay', {
    _rowIndex: _editMode ? _editRowIndex : -1,
    from: _pxRepayFrom, to: _pxRepayTo, amount: amt, date, note,
  });

  _isSubmitting = false;
  postToGAS(payload)
    .then(() => bgSync('還款同步中…'))
    .catch(() => setSyncState?.('local', '⚠ 還款記錄失敗，請重新同步'));
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
    if (!isFinite(result)) { alert('請輸入有效金額'); return; }
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