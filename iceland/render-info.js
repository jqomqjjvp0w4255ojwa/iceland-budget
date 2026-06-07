// render-info.js — 行程資訊：航班、租車詳情

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
    const s = String(str).trim();
    // 格式 A：3h45 / 3h45m / 3h / 45m
    const hm = s.match(/^(\d+)h(\d*)/);
    if (hm) return parseInt(hm[1]) * 60 + (parseInt(hm[2]) || 0);
    const mOnly = s.match(/^(\d+)m$/);
    if (mOnly) return parseInt(mOnly[1]);
    // 格式 B：HH:MM / H:MM
    const parts = s.split(':').map(Number);
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1]))
      return parts[0] * 60 + parts[1];
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

  function segDetails(segs, direction, person) {
    const isGo   = direction === '去程';
    const accent  = isGo ? '#4fc3f7' : '#4caf6e';
    const cardbor = isGo ? 'rgba(79,195,247,.6)' : 'rgba(76,175,110,.6)';
    const hdrbg   = isGo ? 'rgba(79,195,247,.07)' : 'rgba(76,175,110,.07)';
    const hdrline = isGo ? 'rgba(79,195,247,.12)' : 'rgba(76,175,110,.12)';
    const hdrcol  = isGo ? 'rgba(79,195,247,.7)'  : 'rgba(76,175,110,.7)';
    const dashbg  = isGo
      ? 'repeating-linear-gradient(90deg,#4fc3f7 0,#4fc3f7 5px,transparent 5px,transparent 9px)'
      : 'repeating-linear-gradient(90deg,#4caf6e 0,#4caf6e 5px,transparent 5px,transparent 9px)';
    const layline = isGo ? 'rgba(255,167,38,.22)' : 'rgba(76,175,110,.2)';
    const laycol  = isGo ? '#ffa726' : '#4caf6e';

    function charSvg(name) {
      if (typeof avatarSvg === 'function') {
        return avatarSvg(name)
          .replace(/width="16"/, 'width="14"')
          .replace(/height="28"/, 'height="24"');
      }
      return '';
    }

    const parseTime = t => {
      if (!t) return {date:'—', time:'—'};
      const str = String(t).replace('T',' ');
      const parts = str.slice(0,16).split(' ');
      return { date: parts[0]||'—', time: parts[1]||str.slice(0,5)||'—' };
    };

    return segs.map((s, i) => {
      const dep = parseTime(s.depTime);
      const arr = parseTime(s.arrTime);
      const segLabel = segs.length > 1 ? `第 ${i+1} 段` : direction;

      // 找同班機的其他乘客（下一段航班號相同）
      function coPassengers(flightNo) {
        if (!flightNo || !flights) return [];
        return flights
          .filter(f => f.person !== person && f.segments.some(seg => seg.flightNo === flightNo))
          .map(f => f.person);
      }
      const companions = coPassengers(s.flightNo);
      const companionSvg = companions.map(name =>
        typeof avatarSvg === 'function'
          ? avatarSvg(name).replace(/width="16"/, 'width="14"').replace(/height="28"/, 'height="24"')
          : ''
      ).join('');

      const layoverBar = (i > 0 && s.waitTime) ? `
        <div style="display:flex;align-items:center;gap:8px;padding:13px 0;font-family:'Silkscreen',monospace;">
          <div style="flex:1;height:1px;background:${layline};"></div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
            <div style="width:5px;height:5px;background:${laycol};border-radius:1px;flex-shrink:0;"></div>
            <span style="font-size:.52rem;color:${laycol};white-space:nowrap;">${s.from} · ${s.waitTime}</span>
            ${companionSvg ? `<div style="display:flex;gap:1px;align-items:flex-end;margin-left:2px;">${companionSvg}</div>` : ''}
          </div>
          <div style="flex:1;height:1px;background:${layline};"></div>
        </div>` : '';

      return `
        ${layoverBar}
        <div style="background:var(--bg2);border:1.5px solid ${cardbor};border-radius:10px;overflow:hidden;margin-bottom:0;">
          <!-- 標題列 -->
          <div style="padding:5px 12px;display:flex;align-items:center;justify-content:space-between;
                      background:${hdrbg};border-bottom:1px solid ${hdrline};">
            <span style="font-family:'Silkscreen',monospace;font-size:.52rem;color:${hdrcol};">${segLabel}</span>
            <span style="font-family:'Silkscreen',monospace;font-size:.48rem;color:var(--muted);">${s.flightNo||''}${s.operatedBy?' · '+s.operatedBy:''}</span>
          </div>
          <!-- 路線 -->
          <div style="padding:14px 14px 8px;display:flex;align-items:center;gap:6px;">
            <!-- 出發 -->
            <div style="text-align:center;width:72px;flex-shrink:0;">
              <div style="font-family:'Silkscreen',monospace;font-size:1.45rem;letter-spacing:.04em;line-height:1;color:#fff;">${s.from}</div>
              ${s.fromTerm?`<div style="font-family:'Silkscreen',monospace;font-size:.5rem;color:var(--muted);margin-top:3px;">${s.fromTerm}</div>`:'<div style="min-height:.65rem;"></div>'}
              <div style="font-family:'Silkscreen',monospace;font-size:.95rem;color:var(--gold);margin-top:7px;">${dep.time}</div>
              <div style="font-family:'Silkscreen',monospace;font-size:.5rem;color:var(--muted);margin-top:3px;">${dep.date}</div>
            </div>
            <!-- 軌道 -->
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:0 4px;">
              <div style="font-family:'Silkscreen',monospace;font-size:.52rem;color:var(--muted);">${s.flightTime||''}</div>
              <div style="width:100%;display:flex;align-items:center;height:16px;">
                <div style="flex:1;height:2px;background:${dashbg};"></div>
                <span style="font-size:.8rem;padding:0 4px;color:${accent};">✈</span>
                <div style="flex:1;height:2px;background:${dashbg};"></div>
              </div>
              ${s.aircraft?`<div style="font-family:'Silkscreen',monospace;font-size:.48rem;color:var(--muted);">${s.aircraft}</div>`:''}
            </div>
            <!-- 目的地 -->
            <div style="text-align:center;width:72px;flex-shrink:0;">
              <div style="display:flex;align-items:center;justify-content:center;gap:2px;">
                <div style="font-family:'Silkscreen',monospace;font-size:1.45rem;letter-spacing:.04em;line-height:1;color:${s.isTransit?'#ffa726':'#fff'};">${s.to}</div>
                ${s.isTransit?`<div style="font-family:'Silkscreen',monospace;font-size:.38rem;color:#ffa726;line-height:1.2;writing-mode:vertical-rl;letter-spacing:.05em;margin-top:2px;">轉機</div>`:''}
              </div>
              ${s.toTerm?`<div style="font-family:'Silkscreen',monospace;font-size:.5rem;color:var(--muted);margin-top:3px;">${s.toTerm}</div>`:'<div style="min-height:.65rem;"></div>'}
              <div style="font-family:'Silkscreen',monospace;font-size:.95rem;color:var(--gold);margin-top:7px;">${arr.time}</div>
              <div style="font-family:'Silkscreen',monospace;font-size:.5rem;color:var(--muted);margin-top:3px;">${arr.date}</div>
            </div>
          </div>
          <!-- footer -->
          <div style="display:flex;align-items:center;justify-content:flex-end;
                      padding:5px 12px 9px;border-top:1px solid var(--border);gap:4px;">
            ${s.note?`<span style="font-family:'Silkscreen',monospace;font-size:.48rem;color:var(--muted);font-style:italic;margin-right:auto;">📌 ${s.note}</span>`:''}
            ${charSvg(person)}
          </div>
        </div>`;
    }).join('');
  }

  // ── 每人航班內容

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
          <!-- 機票摘要（新版）-->
          <div style="padding:0 2px;margin-bottom:24px;font-family:'Silkscreen',monospace;">
            <!-- tag + 線 + RAV4 -->
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px;">
              ${goTransfers>0?`<span class="tag tag-cancel" style="font-family:'Silkscreen',monospace;font-size:.5rem;padding:2px 8px;border-radius:4px;">去轉${goTransfers}次</span>`:'<span class="tag tag-paid" style="font-family:\'Silkscreen\',monospace;font-size:.5rem;padding:2px 8px;border-radius:4px;">去程直飛</span>'}
              ${retSegs.length?(retTransfers>0?`<span class="tag tag-cancel" style="font-family:'Silkscreen',monospace;font-size:.5rem;padding:2px 8px;border-radius:4px;">回轉${retTransfers}次</span>`:'<span class="tag tag-paid" style="font-family:\'Silkscreen\',monospace;font-size:.5rem;padding:2px 8px;border-radius:4px;">回程直飛</span>'):''}
              ${f.luggage?`<span class="tag tag-fee" style="font-family:'Silkscreen',monospace;font-size:.5rem;padding:2px 8px;border-radius:4px;">🧳 ${f.luggage}</span>`:''}
              <div style="flex:1;height:1px;background:rgba(79,195,247,.3);"></div>
              <svg width="64" height="40" viewBox="0 0 32 20" style="image-rendering:pixelated;flex-shrink:0;"><rect x="5" y="5" width="1" height="1" fill="#413b3d"/><rect x="6" y="5" width="14" height="1" fill="#fefdf9"/><rect x="20" y="5" width="1" height="1" fill="#413b3d"/><rect x="4" y="6" width="2" height="1" fill="#413b3d"/><rect x="6" y="6" width="1" height="1" fill="#837d76"/><rect x="7" y="6" width="2" height="1" fill="#728494"/><rect x="9" y="6" width="1" height="1" fill="#413b3d"/><rect x="10" y="6" width="5" height="1" fill="#728494"/><rect x="15" y="6" width="1" height="1" fill="#413b3d"/><rect x="16" y="6" width="2" height="1" fill="#728494"/><rect x="18" y="6" width="2" height="1" fill="#738595"/><rect x="20" y="6" width="3" height="1" fill="#413b3d"/><rect x="3" y="7" width="2" height="1" fill="#413b3d"/><rect x="5" y="7" width="1" height="1" fill="#fdfcf6"/><rect x="6" y="7" width="1" height="1" fill="#837d76"/><rect x="7" y="7" width="2" height="1" fill="#728596"/><rect x="9" y="7" width="1" height="1" fill="#413b3d"/><rect x="10" y="7" width="1" height="1" fill="#847e77"/><rect x="11" y="7" width="1" height="1" fill="#718596"/><rect x="12" y="7" width="1" height="1" fill="#728697"/><rect x="13" y="7" width="1" height="1" fill="#718696"/><rect x="14" y="7" width="1" height="1" fill="#728798"/><rect x="15" y="7" width="1" height="1" fill="#413b3d"/><rect x="16" y="7" width="1" height="1" fill="#847e77"/><rect x="17" y="7" width="1" height="1" fill="#718494"/><rect x="18" y="7" width="1" height="1" fill="#708395"/><rect x="19" y="7" width="2" height="1" fill="#718393"/><rect x="21" y="7" width="2" height="1" fill="#413b3d"/><rect x="3" y="8" width="1" height="1" fill="#413b3d"/><rect x="4" y="8" width="1" height="1" fill="#fefdf9"/><rect x="5" y="8" width="1" height="1" fill="#fefef7"/><rect x="6" y="8" width="1" height="1" fill="#837d76"/><rect x="7" y="8" width="1" height="1" fill="#728496"/><rect x="8" y="8" width="1" height="1" fill="#718393"/><rect x="9" y="8" width="1" height="1" fill="#413b3d"/><rect x="10" y="8" width="1" height="1" fill="#847e77"/><rect x="11" y="8" width="1" height="1" fill="#728494"/><rect x="12" y="8" width="1" height="1" fill="#738696"/><rect x="13" y="8" width="1" height="1" fill="#718295"/><rect x="14" y="8" width="1" height="1" fill="#708293"/><rect x="15" y="8" width="1" height="1" fill="#413b3d"/><rect x="16" y="8" width="1" height="1" fill="#847e77"/><rect x="17" y="8" width="2" height="1" fill="#728495"/><rect x="19" y="8" width="1" height="1" fill="#708495"/><rect x="20" y="8" width="1" height="1" fill="#413b3d"/><rect x="21" y="8" width="1" height="1" fill="#718393"/><rect x="22" y="8" width="1" height="1" fill="#3e3f41"/><rect x="23" y="8" width="2" height="1" fill="#413b3d"/><rect x="1" y="9" width="3" height="1" fill="#413b3d"/><rect x="4" y="9" width="2" height="1" fill="#fefdf9"/><rect x="6" y="9" width="17" height="1" fill="#404b5c"/><rect x="23" y="9" width="1" height="1" fill="#ece7e4"/><rect x="24" y="9" width="4" height="1" fill="#413b3d"/><rect x="1" y="10" width="2" height="1" fill="#020101"/><rect x="3" y="10" width="1" height="1" fill="#fefdf9"/><rect x="4" y="10" width="1" height="1" fill="#d73e48"/><rect x="5" y="10" width="2" height="1" fill="#fefdf9"/><rect x="7" y="10" width="1" height="1" fill="#fffcfa"/><rect x="8" y="10" width="1" height="1" fill="#847e77"/><rect x="9" y="10" width="1" height="1" fill="#fffdf9"/><rect x="10" y="10" width="1" height="1" fill="#fefdfa"/><rect x="11" y="10" width="1" height="1" fill="#fffdfa"/><rect x="12" y="10" width="1" height="1" fill="#fffffa"/><rect x="13" y="10" width="1" height="1" fill="#fdfef9"/><rect x="14" y="10" width="1" height="1" fill="#fdfefa"/><rect x="15" y="10" width="1" height="1" fill="#847e77"/><rect x="16" y="10" width="1" height="1" fill="#fffffb"/><rect x="17" y="10" width="1" height="1" fill="#fffefb"/><rect x="18" y="10" width="1" height="1" fill="#fefdf8"/><rect x="19" y="10" width="2" height="1" fill="#fcfbf7"/><rect x="21" y="10" width="3" height="1" fill="#847e77"/><rect x="24" y="10" width="1" height="1" fill="#fefdf9"/><rect x="25" y="10" width="1" height="1" fill="#fdfdf8"/><rect x="26" y="10" width="1" height="1" fill="#fdfbf5"/><rect x="27" y="10" width="4" height="1" fill="#413b3d"/><rect x="1" y="11" width="2" height="1" fill="#020101"/><rect x="3" y="11" width="1" height="1" fill="#fefdf9"/><rect x="4" y="11" width="1" height="1" fill="#6e1019"/><rect x="5" y="11" width="2" height="1" fill="#fefdf9"/><rect x="7" y="11" width="1" height="1" fill="#fefefa"/><rect x="8" y="11" width="1" height="1" fill="#847e77"/><rect x="9" y="11" width="1" height="1" fill="#837d76"/><rect x="10" y="11" width="1" height="1" fill="#847e77"/><rect x="11" y="11" width="1" height="1" fill="#fffefb"/><rect x="12" y="11" width="1" height="1" fill="#fffef8"/><rect x="13" y="11" width="1" height="1" fill="#fffff9"/><rect x="14" y="11" width="1" height="1" fill="#fefefa"/><rect x="15" y="11" width="2" height="1" fill="#847e77"/><rect x="17" y="11" width="1" height="1" fill="#fffffc"/><rect x="18" y="11" width="1" height="1" fill="#fffdfa"/><rect x="19" y="11" width="1" height="1" fill="#fffef9"/><rect x="20" y="11" width="2" height="1" fill="#fefdf9"/><rect x="22" y="11" width="1" height="1" fill="#fffdf7"/><rect x="23" y="11" width="1" height="1" fill="#847e77"/><rect x="24" y="11" width="1" height="1" fill="#fffdf8"/><rect x="25" y="11" width="1" height="1" fill="#fbfcf8"/><rect x="26" y="11" width="1" height="1" fill="#fffdfb"/><rect x="27" y="11" width="1" height="1" fill="#fcf9f5"/><rect x="28" y="11" width="1" height="1" fill="#fdfbf4"/><rect x="29" y="11" width="1" height="1" fill="#f9fdf3"/><rect x="30" y="11" width="1" height="1" fill="#fcfefb"/><rect x="31" y="11" width="1" height="1" fill="#413b3d"/><rect x="1" y="12" width="2" height="1" fill="#020101"/><rect x="3" y="12" width="1" height="1" fill="#fefdf9"/><rect x="4" y="12" width="1" height="1" fill="#70131c"/><rect x="5" y="12" width="1" height="1" fill="#fefdf9"/><rect x="6" y="12" width="1" height="1" fill="#fdfcf8"/><rect x="7" y="12" width="2" height="1" fill="#fcfbf7"/><rect x="9" y="12" width="1" height="1" fill="#847e77"/><rect x="10" y="12" width="1" height="1" fill="#fefdfa"/><rect x="11" y="12" width="4" height="1" fill="#fefdf9"/><rect x="15" y="12" width="1" height="1" fill="#847e77"/><rect x="16" y="12" width="7" height="1" fill="#fefdf9"/><rect x="23" y="12" width="1" height="1" fill="#847e77"/><rect x="24" y="12" width="1" height="1" fill="#fbf8f2"/><rect x="25" y="12" width="1" height="1" fill="#faf7f1"/><rect x="26" y="12" width="3" height="1" fill="#fefdf9"/><rect x="29" y="12" width="1" height="1" fill="#e38a1f"/><rect x="30" y="12" width="1" height="1" fill="#da6000"/><rect x="31" y="12" width="1" height="1" fill="#9d9896"/><rect x="1" y="13" width="2" height="1" fill="#020101"/><rect x="3" y="13" width="1" height="1" fill="#fefdf9"/><rect x="4" y="13" width="1" height="1" fill="#fdfdf8"/><rect x="5" y="13" width="1" height="1" fill="#fefdf9"/><rect x="6" y="13" width="1" height="1" fill="#fcfbf7"/><rect x="7" y="13" width="1" height="1" fill="#0b090a"/><rect x="8" y="13" width="1" height="1" fill="#0a0a0b"/><rect x="9" y="13" width="1" height="1" fill="#0d0d11"/><rect x="10" y="13" width="1" height="1" fill="#847e77"/><rect x="11" y="13" width="1" height="1" fill="#fdfbf5"/><rect x="12" y="13" width="3" height="1" fill="#fefdf9"/><rect x="15" y="13" width="1" height="1" fill="#847e77"/><rect x="16" y="13" width="7" height="1" fill="#fefdf9"/><rect x="23" y="13" width="1" height="1" fill="#847e77"/><rect x="24" y="13" width="1" height="1" fill="#eeeae3"/><rect x="25" y="13" width="1" height="1" fill="#0d0c0c"/><rect x="26" y="13" width="1" height="1" fill="#090b0b"/><rect x="27" y="13" width="1" height="1" fill="#09070b"/><rect x="28" y="13" width="1" height="1" fill="#fefdfa"/><rect x="29" y="13" width="1" height="1" fill="#fefdf9"/><rect x="30" y="13" width="1" height="1" fill="#fefdf6"/><rect x="31" y="13" width="1" height="1" fill="#fffdfa"/><rect x="2" y="14" width="1" height="1" fill="#413b3d"/><rect x="3" y="14" width="2" height="1" fill="#fefdf9"/><rect x="5" y="14" width="1" height="1" fill="#fcfbf7"/><rect x="6" y="14" width="1" height="1" fill="#11100f"/><rect x="7" y="14" width="1" height="1" fill="#060405"/><rect x="8" y="14" width="1" height="1" fill="#070506"/><rect x="9" y="14" width="1" height="1" fill="#060405"/><rect x="10" y="14" width="1" height="1" fill="#08070b"/><rect x="11" y="14" width="5" height="1" fill="#847e77"/><rect x="16" y="14" width="1" height="1" fill="#fefdfa"/><rect x="17" y="14" width="7" height="1" fill="#847e77"/><rect x="24" y="14" width="1" height="1" fill="#080807"/><rect x="25" y="14" width="4" height="1" fill="#0a0a0b"/><rect x="29" y="14" width="1" height="1" fill="#fefdfa"/><rect x="30" y="14" width="1" height="1" fill="#fefdf9"/><rect x="31" y="14" width="1" height="1" fill="#dfd9d1"/><rect x="2" y="15" width="1" height="1" fill="#413b3d"/><rect x="3" y="15" width="1" height="1" fill="#5f8a86"/><rect x="4" y="15" width="1" height="1" fill="#413b3d"/><rect x="5" y="15" width="1" height="1" fill="#fefdf9"/><rect x="6" y="15" width="1" height="1" fill="#060405"/><rect x="7" y="15" width="1" height="1" fill="#050304"/><rect x="8" y="15" width="1" height="1" fill="#3f3b3c"/><rect x="9" y="15" width="1" height="1" fill="#070609"/><rect x="10" y="15" width="1" height="1" fill="#060405"/><rect x="11" y="15" width="2" height="1" fill="#fcfbf7"/><rect x="13" y="15" width="3" height="1" fill="#fefdf9"/><rect x="16" y="15" width="1" height="1" fill="#fefdfa"/><rect x="17" y="15" width="7" height="1" fill="#fefdf9"/><rect x="24" y="15" width="2" height="1" fill="#0a0a0b"/><rect x="26" y="15" width="1" height="1" fill="#3f3b3c"/><rect x="27" y="15" width="2" height="1" fill="#0a0a0b"/><rect x="29" y="15" width="2" height="1" fill="#fefdfa"/><rect x="31" y="15" width="1" height="1" fill="#fefdf9"/><rect x="4" y="16" width="2" height="1" fill="#413b3d"/><rect x="6" y="16" width="1" height="1" fill="#0a0a0b"/><rect x="7" y="16" width="1" height="1" fill="#040405"/><rect x="8" y="16" width="1" height="1" fill="#0a0a0b"/><rect x="9" y="16" width="1" height="1" fill="#050406"/><rect x="10" y="16" width="1" height="1" fill="#060405"/><rect x="11" y="16" width="13" height="1" fill="#413b3d"/><rect x="24" y="16" width="5" height="1" fill="#0a0a0b"/><rect x="29" y="16" width="3" height="1" fill="#413b3d"/><rect x="7" y="17" width="3" height="1" fill="#060405"/><rect x="25" y="17" width="3" height="1" fill="#0a0a0b"/></svg>
            </div>
            <!-- 航空公司 + 價格 -->
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
              <span style="font-size:.95rem;color:var(--text);">${f.airline}</span>
              <span style="font-size:1.15rem;color:var(--gold);">${f.totalTWD?fmt(f.totalTWD):'—'}</span>
            </div>
            <!-- 路線 + 各付各的 -->
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
              <span style="font-size:.72rem;color:var(--accent);">${f.from} → ${f.to} · ${f.type}</span>
              <span style="font-size:.58rem;color:var(--muted);">各付各的</span>
            </div>
            <!-- 執飛 -->
            ${operators?`<div style="font-size:.55rem;color:var(--muted);line-height:1.6;">執飛：${operators}</div>`:''}
          </div>
          <!-- 去程段落 -->
          ${goSegs.length?`
            <div style="font-family:'Silkscreen',monospace;font-size:.65rem;color:var(--accent);
                        letter-spacing:.06em;margin:0 0 14px;
                        display:flex;align-items:center;gap:8px;">
              ✈️ 去程
              <span style="font-size:.55rem;color:var(--muted);font-weight:400">${totalFlightTime(goSegs)||''}</span>
              <div style="flex:1;height:1px;background:linear-gradient(90deg,rgba(79,195,247,.4),transparent)"></div>
            </div>
            ${segDetails(goSegs,'去程',f.person)}`:''}
          <!-- 回程段落 -->
          ${retSegs.length?`
            <div style="font-family:'Silkscreen',monospace;font-size:.65rem;color:var(--green);
                        letter-spacing:.06em;margin:20px 0 14px;
                        display:flex;align-items:center;gap:8px;">
              ✈️ 回程
              <span style="font-size:.55rem;color:var(--muted);font-weight:400">${totalFlightTime(retSegs)||''}</span>
              <div style="flex:1;height:1px;background:linear-gradient(90deg,rgba(76,175,110,.4),transparent)"></div>
            </div>
            ${segDetails(retSegs,'回程',f.person)}`:''}`;
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
      <button class="tab active" onclick="showInfoTab('prep',this)">📋 行前</button>
      <button class="tab" onclick="showInfoTab('flight',this)">✈️ 航班</button>
      <button class="tab" onclick="showInfoTab('car',this)">🚗 取車</button>
      <button class="tab" onclick="showInfoTab('schedule',this)">📅 日程</button>
      <button class="tab" onclick="showInfoTab('insurance',this)">🛡 保險</button>
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
    <div id="infoTab-insurance" class="section">
      <div class="empty">🛡 保險資訊填入後顯示</div>
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