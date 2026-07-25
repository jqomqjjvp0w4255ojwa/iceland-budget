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

      // 這段所有乘客（自己＋同班機的人）
      function segPassengers(flightNo) {
        if (!flightNo || !flights) return [person];
        const others = flights
          .filter(f => f.person !== person && f.segments.some(seg => seg.flightNo === flightNo))
          .map(f => f.person);
        return [person, ...others];
      }

      // 轉機線：下一段同班機的人（含自己）
      function coPassengers(flightNo) {
        if (!flightNo || !flights) return [person];
        const others = flights
          .filter(f => f.person !== person && f.segments.some(seg => seg.flightNo === flightNo))
          .map(f => f.person);
        return [person, ...others];
      }

      const cardPassengers = segPassengers(s.flightNo);
      const companions = coPassengers(s.flightNo);

      const cardCharsSvg = cardPassengers.map(name =>
        typeof avatarSvg === 'function'
          ? avatarSvg(name).replace(/width="16"/, 'width="14"').replace(/height="28"/, 'height="24"')
          : ''
      ).join('');

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
            <span style="font-size:.6rem;color:var(--muted);font-family:sans-serif;">${s.flightNo||''}${s.operatedBy?' · '+s.operatedBy:''}</span>
          </div>
          <!-- 路線 -->
          <div style="padding:14px 14px 8px;display:flex;align-items:center;gap:6px;">
            <!-- 出發 -->
            <div style="text-align:center;width:72px;flex-shrink:0;">
              <div style="font-family:'Silkscreen',monospace;font-size:1.45rem;letter-spacing:.04em;line-height:1;color:#fff;">${s.from}</div>
              ${s.fromTerm?`<div style="font-size:.62rem;color:var(--muted);margin-top:3px;font-family:sans-serif;">${s.fromTerm}</div>`:'<div style="min-height:.8rem;"></div>'}
              <div style="font-family:'Silkscreen',monospace;font-size:.95rem;color:var(--gold);margin-top:7px;">${dep.time}</div>
              <div style="font-size:.6rem;color:var(--muted);margin-top:3px;font-family:sans-serif;">${dep.date}</div>
            </div>
            <!-- 軌道 -->
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:0 4px;">
              <div style="font-size:.6rem;color:var(--muted);font-family:sans-serif;">${s.flightTime||''}</div>
              <div style="width:100%;display:flex;align-items:center;height:16px;">
                <div style="flex:1;height:2px;background:${dashbg};"></div>
                <span style="font-size:.8rem;padding:0 4px;color:${accent};">✈</span>
                <div style="flex:1;height:2px;background:${dashbg};"></div>
              </div>
              ${s.aircraft?`<div style="font-size:.6rem;color:var(--muted);font-family:sans-serif;">${s.aircraft}</div>`:''}
            </div>
            <!-- 目的地 -->
            <div style="width:72px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;">
              <div style="display:flex;flex-direction:row;align-items:center;justify-content:center;gap:2px;">
                <div style="font-family:'Silkscreen',monospace;font-size:1.45rem;letter-spacing:.04em;line-height:1;color:${s.isTransit?'#ffa726':'#fff'};">${s.to}</div>
                ${s.isTransit?`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;"><span style="font-family:'Silkscreen',monospace;font-size:8px;color:#ffa726;line-height:1.4;">轉</span><span style="font-family:'Silkscreen',monospace;font-size:8px;color:#ffa726;line-height:1.4;">機</span></div>`:''}
              </div>
              ${s.toTerm?`<div style="font-size:.62rem;color:var(--muted);margin-top:3px;font-family:sans-serif;text-align:center;">${s.toTerm}</div>`:'<div style="min-height:.8rem;"></div>'}
              <div style="font-family:'Silkscreen',monospace;font-size:.95rem;color:var(--gold);margin-top:7px;">${arr.time}</div>
              <div style="font-size:.6rem;color:var(--muted);margin-top:3px;font-family:sans-serif;">${arr.date}</div>
            </div>
          </div>
          <!-- footer -->
          <div style="display:flex;align-items:center;justify-content:flex-end;
                      padding:5px 12px 9px;border-top:1px solid var(--border);gap:4px;">
            ${s.note?`<span style="font-size:.6rem;color:var(--muted);font-style:italic;margin-right:auto;font-family:sans-serif;">📌 ${s.note}</span>`:''}
            <div style="display:flex;gap:1px;align-items:flex-end;">${cardCharsSvg}</div>
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
            <!-- 航空公司 -->
            <div style="font-size:.95rem;color:var(--text);margin-bottom:8px;">${f.airline}</div>
            <!-- 路線 -->
            <div style="font-size:.72rem;color:var(--accent);margin-bottom:8px;">${f.from} → ${f.to} · ${f.type}</div>
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
      <div id="prepContent">${renderPrep(d.tasks)}</div>
    </div>
    <div id="infoTab-flight" class="section">
      ${renderInfoFlights(d.flights)}
    </div>
    <div id="infoTab-car" class="section">
      ${renderCarDetail(d.car)}
    </div>
    <div id="infoTab-schedule" class="section">
      <div id="scheduleContent">${renderSchedule(d)}</div>
    </div>
    <div id="infoTab-insurance" class="section">
      ${renderInsurance(d.insurance)}
    </div>

  `;
}

// ══════════════════════════════════════════════════════════
//  行前準備清單：勾選＝該成員的像素小人亮起來站上去
// ══════════════════════════════════════════════════════════
const PREP_CATS = [
  { key:'待辦', icon:'📋', label:'出發前待辦' },
  { key:'行李', icon:'🎒', label:'行李打包' },
  { key:'共用', icon:'🤝', label:'共用裝備分工' },
];

// 一個成員的小人：未完成灰階半透明，完成後彩色站好
function prepAvatar(task, member, dim) {
  const done = !!task.done?.[member];
  const disabled = dim && !done;      // 不適用於這個人，不列入進度
  const title = disabled
    ? `${member}：不需要（此項為 ${esc(task.owner)}）`
    : `${member}${done ? '：已準備好' : '：還沒'}`;
  return `<button class="prep-avatar${done ? ' done' : ''}${disabled ? ' dim' : ''}"
    title="${esc(title)}"
    onclick="togglePrep('${esc(task.id)}','${esc(member)}',this);event.stopPropagation();">
    ${avatarSvg(member)}
  </button>`;
}

// 這個項目適不適用於某成員：負責人欄留空＝全員；填了（可逗號分隔多人）＝只有那些人
function taskAppliesTo(task, member) {
  const owner = String(task.owner || '').trim();
  if (!owner) return true;
  return owner.split(/[,，、\s]+/).filter(Boolean).includes(member);
}

function renderPrepItem(task) {
  const members = window.TRIP_MEMBERS || ['猴','花','寧'];
  const isShared = task.category === '共用';
  // 指定了對象時，其他人的小人淡出（仍可點，方便代辦/代帶）
  const avatars = members.map(m => prepAvatar(task, m, !taskAppliesTo(task, m))).join('');
  // 只看「適用的人」有沒有完成
  const need = members.filter(m => taskAppliesTo(task, m));
  const allDone = need.length ? need.every(m => task.done?.[m]) : false;
  const isCritical = (task.priority || 0) >= 5 && !allDone;
  const stars = task.priority > 0
    ? `<span class="prep-stars${isCritical ? ' critical' : ''}" title="重要度 ${task.priority}">${'★'.repeat(Math.min(5, task.priority))}</span>` : '';

  return `<div class="prep-item${allDone ? ' all-done' : ''}${isCritical ? ' critical' : ''}" data-id="${esc(task.id)}">
    <div class="prep-main">
      <div class="prep-name">${esc(task.name)}${stars}</div>
      ${task.note ? `<div class="prep-note">${esc(task.note)}</div>` : ''}
      ${isShared && task.owner ? `<div class="prep-owner">🎒 由 ${esc(task.owner)} 負責帶</div>` : ''}
    </div>
    <div class="prep-avatars">${avatars}</div>
    <button type="button" class="prep-more" title="編輯／刪除" onclick="openEditPrep('${esc(task.id)}');event.stopPropagation();">⋮</button>
  </div>`;
}

// 這筆項目在目前檢視下算不算「已完成」
function prepIsDone(task) {
  const members = window.TRIP_MEMBERS || ['猴','花','寧'];
  if (_prepWho) return !!task.done?.[_prepWho];          // 只看某人時＝那人勾了沒
  const need = members.filter(m => taskAppliesTo(task, m));
  return need.length ? need.every(m => task.done?.[m]) : false;
}

function prepPassFilter(task) {
  if (_prepWho && !taskAppliesTo(task, _prepWho)) return false;  // 不干他的事就不顯示
  if (_prepView === 'todo' && prepIsDone(task)) return false;
  return true;
}

// 未完成優先，其次重要度高的在前
function prepSort(a, b) {
  const da = prepIsDone(a) ? 1 : 0, db = prepIsDone(b) ? 1 : 0;
  if (da !== db) return da - db;
  return (b.priority || 0) - (a.priority || 0);
}

function renderPrepFilters(tasks) {
  const members = window.TRIP_MEMBERS || ['猴','花','寧'];
  const all = tasks || [];
  const saveWho = _prepWho, saveView = _prepView;

  // 計數用目前的人物篩選、但不受完成狀態影響
  _prepView = 'all';
  const scoped = all.filter(prepPassFilter);
  const todoCount = scoped.filter(t => !prepIsDone(t)).length;
  _prepView = saveView;

  return `
    <div class="prep-filters">
      <div class="prep-filter-group">
        <button class="prep-filter${_prepView==='todo'?' on':''}" onclick="setPrepView('todo')">未完成 ${todoCount}</button>
        <button class="prep-filter${_prepView==='all'?' on':''}" onclick="setPrepView('all')">全部 ${scoped.length}</button>
      </div>
      <div class="prep-filter-group">
        <button class="prep-who${!_prepWho?' on':''}" onclick="setPrepWho('')">全員</button>
        ${members.map(m => `
          <button class="prep-who${_prepWho===m?' on':''}" onclick="setPrepWho('${esc(m)}')" title="只看 ${esc(m)} 要準備的">
            <span class="prep-who-avatar">${avatarSvg(m)}</span>
          </button>`).join('')}
      </div>
    </div>`;
}

window.setPrepView = function(v) {
  _prepView = v;
  const el = document.getElementById('prepContent');
  if (el) el.innerHTML = renderPrep(window.APP_DATA?.tasks || []);
};
window.setPrepWho = function(m) {
  _prepWho = m;
  const el = document.getElementById('prepContent');
  if (el) el.innerHTML = renderPrep(window.APP_DATA?.tasks || []);
};

// 每人各自的準備進度（共用裝備只算負責人那份）
function renderPrepProgress(tasks) {
  const members = window.TRIP_MEMBERS || ['猴','花','寧'];
  const perMember = members.map(m => {
    const mine = (tasks || []).filter(t => taskAppliesTo(t, m));
    const done = mine.filter(t => t.done?.[m]).length;
    return { m, done, total: mine.length, pct: mine.length ? Math.round(done / mine.length * 100) : 0 };
  });
  return `<div class="prep-progress" id="prepProgress">
    ${perMember.map(p => `
      <div class="prep-progress-item">
        <div class="prep-progress-avatar${p.pct === 100 ? ' done' : ''}">${avatarSvg(p.m)}</div>
        <div class="prep-progress-label"><span>${esc(p.m)}</span><span>${p.done}/${p.total}</span></div>
        <div class="progress-bar"><div class="progress-fill" style="width:${p.pct}%"></div></div>
      </div>`).join('')}
  </div>`;
}

function renderPrep(tasks) {
  tasks = tasks || [];
  if (!tasks.length) {
    return `<div class="empty">🧳 在「寫入_任務」表填入項目後顯示<br>
      <span style="font-size:.7rem;color:var(--muted)">分類填 待辦／行李／共用</span></div>`;
  }
  const progress = renderPrepProgress(tasks) + renderPrepFilters(tasks)
    + `<div class="prep-criteria">★ 評分基準：<b>當地買不買得到</b>——★5＝買不到也補不了（護照/藥/睡袋），★1–2＝冰島隨處可買</div>`;

  const groups = PREP_CATS.map(cat => {
    const list = tasks.filter(t => (t.category || '待辦') === cat.key)
      .filter(prepPassFilter)
      .sort(prepSort);
    if (!list.length) return '';
    return `
      <div class="prep-group">
        <div class="section-title">${cat.icon} ${cat.label}
          <span style="font-size:.65rem;color:var(--muted);font-weight:400;">（${list.length}）</span>
        </div>
        ${list.map(renderPrepItem).join('')}
      </div>`;
  }).join('');

  // 沒被分類到的（分類欄填了別的字）
  const known = PREP_CATS.map(c => c.key);
  const others = tasks.filter(t => !known.includes(t.category || '待辦'))
    .filter(prepPassFilter).sort(prepSort);
  const otherHtml = others.length ? `
    <div class="prep-group">
      <div class="section-title">📌 其他<span style="font-size:.65rem;color:var(--muted);font-weight:400;">（${others.length}）</span></div>
      ${others.map(renderPrepItem).join('')}
    </div>` : '';

  const addBtn = `
    <div style="text-align:center;margin-top:14px;">
      <button onclick="openAddPrep()" style="
        padding:8px 18px;border:1.5px dashed var(--border);background:transparent;
        color:var(--muted);border-radius:8px;cursor:pointer;font-size:.72rem;
        font-family:'Lato',sans-serif;">＋ 新增準備項目</button>
    </div>`;

  const empty = (!groups.trim() && !otherHtml.trim())
    ? `<div class="empty" style="padding:26px 16px;">${_prepView === 'todo'
        ? (_prepWho ? `🎉 ${esc(_prepWho)} 的項目都準備好了！` : '🎉 全部都準備好了！')
        : '沒有符合的項目'}</div>`
    : '';

  return progress + groups + otherHtml + empty + addBtn;
}

// ── 新增項目：彈窗（同記帳表單風格），直接寫回 sheet
const PREP_CAT_OPTS = [
  { key:'待辦', label:'📋 待辦' },
  { key:'行李', label:'🎒 行李' },
  { key:'共用', label:'🤝 共用' },
];
let _prepCat = '待辦';
let _prepOwner = '';
let _prepPriority = 3;
let _prepEditId = null;   // null＝新增模式，否則是正在編輯的 task.id
let _prepView = 'todo';   // 檢視：all／todo（未完成）
let _prepWho  = '';       // 只看某人（空＝全員）

window.openAddPrep = function() {
  _prepEditId = null;
  _prepCat = '待辦';
  _prepOwner = '';
  _prepPriority = 3;
  document.getElementById('prepName').value = '';
  document.getElementById('prepNote').value = '';
  document.getElementById('pxModalPrepTitle').textContent = '▶ 新增準備項目';
  document.getElementById('pxBtnPrep').textContent = '[ 加入清單 ]';
  document.getElementById('pxBtnPrepDelete').style.display = 'none';
  renderPrepCatBtns();
  renderPrepOwnerBtns();
  renderPrepPriorityBtns();
  pxCheckPrepSubmit();
  document.getElementById('pxModalPrep').classList.add('show');
  window.lockBody?.();
  setTimeout(() => document.getElementById('prepName')?.focus(), 100);
};

window.openEditPrep = function(taskId) {
  const task = (window.APP_DATA?.tasks || []).find(t => t.id === taskId);
  if (!task) return;
  _prepEditId = taskId;
  _prepCat = task.category || '待辦';
  _prepOwner = task.owner || '';
  _prepPriority = task.priority || 3;
  document.getElementById('prepName').value = task.name || '';
  document.getElementById('prepNote').value = task.note || '';
  document.getElementById('pxModalPrepTitle').textContent = '▶ 編輯準備項目';
  document.getElementById('pxBtnPrep').textContent = '[ 儲存修改 ]';
  document.getElementById('pxBtnPrepDelete').style.display = '';
  renderPrepCatBtns();
  renderPrepOwnerBtns();
  renderPrepPriorityBtns();
  pxCheckPrepSubmit();
  document.getElementById('pxModalPrep').classList.add('show');
  window.lockBody?.();
};

function renderPrepCatBtns() {
  const el = document.getElementById('prepCatBtns');
  el.innerHTML = PREP_CAT_OPTS.map(c =>
    `<button type="button" class="px-chip${_prepCat===c.key?' on':''}" onclick="selectPrepCat('${c.key}')">${c.label}</button>`
  ).join('');
  // 對象欄任何分類都能用：共用＝誰負責帶，其他＝誰需要
  const lbl = document.querySelector('#prepOwnerField .px-label');
  if (lbl) lbl.textContent = _prepCat === '共用'
    ? '▸ 誰負責帶（不選＝大家都要帶）'
    : '▸ 誰需要（不選＝全員都要）';
}
window.selectPrepCat = function(key) {
  _prepCat = key;
  renderPrepCatBtns();
  renderPrepOwnerBtns();
};

function renderPrepOwnerBtns() {
  const el = document.getElementById('prepOwnerBtns');
  const members = window.TRIP_MEMBERS || ['猴','花','寧'];
  const sel = String(_prepOwner || '').split(/[,，、\s]+/).filter(Boolean);
  el.innerHTML = members.map(m =>
    `<button type="button" class="px-chip${sel.includes(m)?' on':''}" onclick="selectPrepOwner('${esc(m)}')">${esc(m)}</button>`
  ).join('');
}
// 可複選：點一下加入、再點一次移除；全不選＝全員適用
window.selectPrepOwner = function(m) {
  const sel = String(_prepOwner || '').split(/[,，、\s]+/).filter(Boolean);
  const i = sel.indexOf(m);
  if (i >= 0) sel.splice(i, 1); else sel.push(m);
  _prepOwner = sel.join(',');
  renderPrepOwnerBtns();
};

function renderPrepPriorityBtns() {
  const el = document.getElementById('prepPriorityBtns');
  el.innerHTML = [1,2,3,4,5].map(n =>
    `<button type="button" class="px-chip${_prepPriority===n?' on':''}" onclick="selectPrepPriority(${n})">${'★'.repeat(n)}</button>`
  ).join('');
}
window.selectPrepPriority = function(n) {
  _prepPriority = n;
  renderPrepPriorityBtns();
};

window.pxCheckPrepSubmit = function() {
  const ready = document.getElementById('prepName').value.trim().length > 0;
  document.getElementById('pxBtnPrep').disabled = !ready;
};

window.submitPrepModal = function() {
  const name = document.getElementById('prepName').value.trim();
  if (!name) return;
  const note = document.getElementById('prepNote').value.trim();
  const category = _prepCat, owner = _prepOwner, priority = _prepPriority;
  const gasBase = window.TRIP_CONFIG?.apiBase || '';
  window.APP_DATA = window.APP_DATA || {};
  window.APP_DATA.tasks = window.APP_DATA.tasks || [];
  const el = document.getElementById('prepContent');

  // ── 編輯既有項目 ──
  if (_prepEditId) {
    const task = window.APP_DATA.tasks.find(t => t.id === _prepEditId);
    if (!task) { window.cancelPxModal?.('pxModalPrep'); return; }
    Object.assign(task, { category, name, priority, note, owner });
    if (el) el.innerHTML = renderPrep(window.APP_DATA.tasks);
    window.cancelPxModal?.('pxModalPrep');
    if (gasBase && task._rowIndex) {
      fetch(gasBase, {
        method: 'POST',
        body: JSON.stringify({ action:'editTask', rowIndex:task._rowIndex, category, name, priority, note, owner }),
      }).catch(e => {
        console.warn('修改準備項目失敗', e);
        window.setSyncState?.('local', '⚠ 修改項目同步失敗');
      });
    }
    return;
  }

  // ── 新增項目 ──
  const members = window.TRIP_MEMBERS || ['猴','花','寧'];
  const task = {
    id: 'tmp_' + Date.now(), category, name, priority, note, owner,
    done: Object.fromEntries(members.map(m => [m, false])),
  };
  window.APP_DATA.tasks.push(task);
  if (el) el.innerHTML = renderPrep(window.APP_DATA.tasks);
  window.cancelPxModal?.('pxModalPrep');
  if (!gasBase) return;
  fetch(gasBase, {
    method: 'POST',
    body: JSON.stringify({ action:'addTask', category, name, priority, note, owner }),
  })
    .then(r => r.json())
    .then(res => {
      // 換成 sheet 給的正式 ID 與行號，之後才勾得動
      if (res?.ok && res.msg?.id) {
        task.id = res.msg.id;
        task._rowIndex = res.msg.rowIndex;
        const el2 = document.getElementById('prepContent');
        if (el2) el2.innerHTML = renderPrep(window.APP_DATA.tasks);
      }
    })
    .catch(e => {
      console.warn('新增準備項目失敗', e);
      window.setSyncState?.('local', '⚠ 新增項目同步失敗');
    });
};

window.deletePrepModal = function() {
  if (!_prepEditId) return;
  const tasks = window.APP_DATA?.tasks || [];
  const idx = tasks.findIndex(t => t.id === _prepEditId);
  if (idx < 0) return;
  const task = tasks[idx];
  if (!confirm(`刪除「${task.name}」？`)) return;
  tasks.splice(idx, 1);
  const el = document.getElementById('prepContent');
  if (el) el.innerHTML = renderPrep(tasks);
  window.cancelPxModal?.('pxModalPrep');

  const gasBase = window.TRIP_CONFIG?.apiBase || '';
  if (gasBase && task._rowIndex) {
    fetch(gasBase, {
      method: 'POST',
      body: JSON.stringify({ action:'deleteTask', rowIndex:task._rowIndex }),
    }).catch(e => {
      console.warn('刪除準備項目失敗', e);
      window.setSyncState?.('local', '⚠ 刪除項目同步失敗');
    });
  }
};

// 點小人 → 切換該成員的完成狀態（樂觀更新，背景同步）
window.togglePrep = function(taskId, member, btn) {
  const task = (window.APP_DATA?.tasks || []).find(t => t.id === taskId);
  if (!task) return;
  task.done = task.done || {};
  const next = !task.done[member];
  task.done[member] = next;

  // 立即反應：小人亮起／暗下
  btn.classList.toggle('done', next);
  btn.classList.add('pop');
  setTimeout(() => btn.classList.remove('pop'), 260);

  // 整列狀態（全員完成時整列淡化）
  const members = window.TRIP_MEMBERS || ['猴','花','寧'];
  const row = btn.closest('.prep-item');
  if (row) {
    const isShared = task.category === '共用';
    const allDone = isShared
      ? (task.owner ? !!task.done[task.owner] : members.some(m => task.done[m]))
      : members.every(m => task.done[m]);
    row.classList.toggle('all-done', allDone);
  }

  // 背景同步 GAS（失敗就回捲）
  const gasBase = window.TRIP_CONFIG?.apiBase || '';
  if (gasBase && task._rowIndex) {
    fetch(gasBase, {
      method: 'POST',
      body: JSON.stringify({ action:'toggleTask', rowIndex:task._rowIndex, who:member, done:next }),
    }).catch(e => {
      console.warn('準備狀態同步失敗', e);
      task.done[member] = !next;
      btn.classList.toggle('done', !next);
      window.setSyncState?.('local', '⚠ 準備清單同步失敗');
    });
  }

  // 更新上方進度條
  const bars = document.getElementById('prepProgress');
  if (bars) bars.outerHTML = renderPrepProgress(window.APP_DATA?.tasks || []);
};


// ══════════════════════════════════════════════════════════
//  日程時間軸：日期跳轉 + 分類篩選 + 住宿展開 + 回到今日
// ══════════════════════════════════════════════════════════
const SCH_CATS = [
  { key:'all',  label:'全部' },
  { key:'景點', label:'景點' },
  { key:'住宿', label:'住宿' },
  { key:'活動', label:'活動' },
  { key:'其他', label:'其他' },
];
const SCH_ICONS = { '景點':'📍', '住宿':'🏠', '活動':'🎯', '其他':'🚗' };
let _schFilter = 'all';
let _schActiveKey = null;   // 日期跳轉列目前選中的那天

// 「9/17」→ 當年的 Date（行程都在同一年）
function schDate(dateStr, year) {
  const m = String(dateStr || '').match(/(\d{1,2})\s*[\/月-]\s*(\d{1,2})/);
  if (!m) return null;
  return new Date(year, +m[1] - 1, +m[2]);
}
function schWeekday(d) {
  return d ? ['日','一','二','三','四','五','六'][d.getDay()] : '';
}
function schIsSameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// 把日程 + 住宿合併成節點，依日期分組
function buildScheduleDays(d) {
  const year = new Date(window.TRIP_CONFIG?.dates?.depart || Date.now()).getFullYear();
  // 日期欄留空＝沿用上一列（GAS 已處理，這裡再保險一次，避免節點憑空消失）
  let lastD = null;
  const items = (d.schedule || []).map(x => {
    const parsed = schDate(x.date, year) || lastD;
    if (parsed) lastD = parsed;
    return { ...x, _d: parsed };
  });

  // 住宿表的每一晚 → 自動變成住宿節點（日期欄可能是「9/15 9/16」這種多晚）
  (d.accommodation || []).forEach((a, ai) => {
    String(a.date || '').split(/[\s,、]+/).filter(Boolean).forEach(one => {
      const dd = schDate(one, year);
      if (!dd) return;
      items.push({
        date: one, time: '', category: '住宿',
        title: a.name, note: '', place: a.address || '',
        lat: a.lat, lng: a.lng, order: 9999,   // 住宿排當天最後
        _d: dd, _stayIndex: ai,
      });
    });
  });

  // 航班 → 自動變成航段節點（三人相同航段合併成一筆，不同的標註是誰的）
  const members = window.TRIP_MEMBERS || ['猴','花','寧'];
  const segMap = new Map();
  (d.flights || []).forEach(f => {
    (f.segments || []).forEach(seg => {
      // depTime 格式「2026/9/14 7:00」
      const dm = String(seg.depTime || '').match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
      if (!dm) return;
      const tm = String(seg.depTime || '').match(/(\d{1,2}:\d{2})/);
      const am = String(seg.arrTime || '').match(/(\d{1,2}:\d{2})/);
      const key = `${seg.flightNo || ''}|${seg.depTime}`;
      if (!segMap.has(key)) {
        segMap.set(key, {
          date: `${+dm[2]}/${+dm[3]}`,
          time: tm ? tm[1] : '',
          category: '其他',
          _flight: true,
          title: `${seg.from} → ${seg.to}`,
          place: [seg.flightNo, seg.operatedBy || seg.airline].filter(Boolean).join(' · '),
          note: am ? `抵達 ${am[1]}${seg.flightTime ? `（飛 ${seg.flightTime}）` : ''}` : '',
          lat: 0, lng: 0, order: 0,
          _d: new Date(+dm[1], +dm[2] - 1, +dm[3]),
          _who: new Set(),
        });
      }
      segMap.get(key)._who.add(f.person);
    });
  });
  segMap.forEach(node => {
    // 不是全員同班機才標名字（例如寧的回程不同路線）
    if (node._who.size && node._who.size < members.length) {
      node.title += `（${[...node._who].join('、')}）`;
    }
    items.push(node);
  });

  // 活動表 → 自動變成活動節點（日程表已手動排同一天同名活動的就跳過）
  (d.activity || []).forEach((a, ai) => {
    if (!a.date || !a.name) return;
    const dd = schDate(a.date, year);
    if (!dd) return;
    const dup = items.some(x =>
      x.category === '活動' && x._d && schIsSameDay(x._d, dd) &&
      findSchActivity(x.title, [a]) === 0);
    if (dup) return;
    const tm = String(a.meetTime || '').match(/(\d{1,2}[:：]\d{2})/);
    const meetExtra = String(a.meetTime || '').replace(tm ? tm[1] : '', '').trim();
    items.push({
      date: a.date,
      time: tm ? tm[1] : '',
      category: '活動',
      _actIndex: ai,
      title: a.name,
      place: a.meetLoc || a.location || '',
      note: meetExtra ? `集合 ${a.meetTime}` : '',
      lat: a.lat || 0, lng: a.lng || 0,
      order: 5000 + ai,   // 排在手動節點後、住宿前
      _d: dd,
    });
  });

  // 依日期分組
  const byDate = new Map();
  items.filter(x => x._d).forEach(x => {
    const key = `${x._d.getMonth()+1}/${x._d.getDate()}`;
    if (!byDate.has(key)) byDate.set(key, { key, d: x._d, items: [] });
    byDate.get(key).items.push(x);
  });

  // 日期排序；同一天內：有時間的排前面（依時間），沒時間的照 sheet 順序
  const days = [...byDate.values()].sort((a, b) => a.d - b.d);
  days.forEach(day => {
    day.items.sort((a, b) => {
      const ta = parseSchTime(a.time), tb = parseSchTime(b.time);
      if (ta !== tb) return ta - tb;
      return (a.order || 0) - (b.order || 0);
    });
  });
  return days;
}

// 時間排序用：「09:00」→540、「上午」→ 早、「下午」→ 晚、空白→ 依原順序（回傳 大數 讓它落到後面但仍受 order 影響）
function parseSchTime(t) {
  const s = String(t || '').trim();
  if (!s) return 100000;
  const hm = s.match(/(\d{1,2})\s*[:：]\s*(\d{2})/);
  if (hm) return +hm[1] * 60 + +hm[2];
  if (/上午|早/.test(s)) return 8 * 60;
  if (/中午/.test(s))    return 12 * 60;
  if (/下午/.test(s))    return 14 * 60;
  if (/傍晚|黃昏/.test(s)) return 17 * 60;
  if (/晚/.test(s))      return 19 * 60;
  const h = s.match(/^(\d{1,2})$/);
  if (h) return +h[1] * 60;
  return 100000;
}

function renderSchedule(d) {
  const days = buildScheduleDays(d);
  if (!days.length) {
    return `<div class="empty">📅 在「日程」表填入行程後顯示<br>
      <span style="font-size:.7rem;color:var(--muted)">欄位：日期／時間／分類／標題／說明／地點</span></div>`;
  }
  const today = new Date();

  const jumper = renderSchJumper(days, today);

  const filters = `
    <div class="sch-filters">
      ${SCH_CATS.map(c => `<button class="sch-filter${_schFilter===c.key?' on':''}"
        onclick="setSchFilter('${c.key}')">${c.label}</button>`).join('')}
    </div>`;

  const body = days.map((day, i) => renderSchDay(day, today, d, i + 1)).join('');

  return jumper + filters + `
    <div class="sch-scroll" id="schScroll">${body}</div>
    <button class="sch-back-today" id="schBackToday" onclick="schScrollToToday()" style="display:none;">
      <span id="schBackArrow">↑</span> 回到今日
    </button>`;
}

// 日期跳轉列：只顯示選中的那天 ±2，選中置中放大、往外遞減
// 依畫面寬度決定跳轉列左右各顯示幾天（窄機 ±2，寬螢幕最多 ±5）
function schJumperSpan() {
  const el = document.getElementById('schJumper') || document.getElementById('scheduleContent');
  const w = el?.clientWidth || window.innerWidth || 360;
  // 扣掉兩顆箭頭與間距後，每格約 52px；再換算成左右各幾格
  const slots = Math.floor((w - 70) / 52);
  return Math.max(2, Math.min(5, Math.floor((slots - 1) / 2)));
}

function renderSchJumper(days, today) {
  // 選中預設今天；今天不在行程內就用第一天
  if (!_schActiveKey || !days.some(x => x.key === _schActiveKey)) {
    const t = days.find(x => schIsSameDay(x.d, today));
    _schActiveKey = t ? t.key : days[0].key;
  }
  const idx = days.findIndex(x => x.key === _schActiveKey);
  const span = schJumperSpan();

  const btns = [];
  for (let off = -span; off <= span; off++) {
    const i = idx + off;
    if (i < 0 || i >= days.length) continue;
    const day = days[i];
    const isToday = schIsSameDay(day.d, today);
    btns.push(`<button class="sch-jump-day off${Math.min(2, Math.abs(off))}${off === 0 ? ' active' : ''}${isToday ? ' today' : ''}"
      data-key="${esc(day.key)}" onclick="schJumpTo('${esc(day.key)}')">
      <span class="sch-jump-d">D${i + 1}</span>
      <span class="sch-jump-date">${esc(day.key)}</span>
    </button>`);
  }

  return `
    <div class="sch-jumper" id="schJumper">
      <button class="sch-jump-arrow" onclick="schJumpStep(-1)" ${idx <= 0 ? 'disabled' : ''} title="前一天">‹</button>
      <div class="sch-jump-scroll">${btns.join('')}</div>
      <button class="sch-jump-arrow" onclick="schJumpStep(1)" ${idx >= days.length - 1 ? 'disabled' : ''} title="後一天">›</button>
    </div>`;
}

// 元素相對捲動容器的實際位置（offsetTop 會受 offsetParent 影響，改用幾何計算）
function schRelTop(el, scroller) {
  return scroller.scrollTop + el.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
}

// 只重畫跳轉列（不動時間軸，避免捲動位置跳掉）
function refreshSchJumper() {
  const el = document.getElementById('schJumper');
  if (!el) return;
  const days = buildScheduleDays(window.APP_DATA || window.STATIC);
  if (!days.length) return;
  el.outerHTML = renderSchJumper(days, new Date());
}

function renderSchDay(day, today, d, dayNum) {
  const isToday = schIsSameDay(day.d, today);
  const isPast  = !isToday && day.d < today;
  const shown = day.items.filter(x => _schFilter === 'all' || x.category === _schFilter);
  if (!shown.length) return '';

  return `
    <div class="sch-day${isPast ? ' past' : ''}${isToday ? ' today' : ''}" data-key="${esc(day.key)}">
      <div class="sch-day-head">
        <span class="sch-day-line"></span>
        <div class="sch-day-badge">
          <div class="sch-day-title">
            <span class="sch-day-num">第 ${dayNum} 天</span>
            ${isToday ? '<span class="sch-today-tag">今天</span>' : ''}
          </div>
          <div class="sch-day-sub">${esc(day.key)}（${schWeekday(day.d)}）</div>
        </div>
        <span class="sch-day-line"></span>
      </div>
      <div class="sch-nodes">
        ${shown.map(x => renderSchNode(x, d)).join('')}
      </div>
    </div>`;
}

function renderSchNode(x, d) {
  const isStay = x.category === '住宿';
  const stay = isStay && x._stayIndex != null ? (d.accommodation || [])[x._stayIndex] : null;
  // 活動節點：自動併入的直接帶 index；手動排的用標題比對活動表
  const actIndex = x._actIndex != null ? x._actIndex
    : x.category === '活動' ? findSchActivity(x.title, d.activity) : -1;
  const act = actIndex >= 0 ? d.activity[actIndex] : null;

  // 住宿：沿用帳簿住宿卡的類型判斷（sheet 有填類型就優先用）
  const pt = isStay ? placeTypeIcon(stay?.stayType || x.title || '') : null;
  const icon = x._flight ? '✈️' : isStay ? pt.icon : (SCH_ICONS[x.category] || '•');

  const navBtn = (x.lat && x.lng)
    ? `<button class="sch-nav" title="導航" onclick="window.open('https://maps.google.com/?q=${x.lat},${x.lng}','_blank');event.stopPropagation();">➤ 導航</button>`
    : '';

  // 住宿：一眼標籤列（詳情進彈窗）
  let stayTags = '';
  if (stay) {
    let payTag;
    if (stay.paid && stay.payDate)   payTag = `<span class="tag tag-paid">${esc(stay.payDate)} 付款</span>`;
    else if (stay.paid)              payTag = `<span class="tag tag-paid">已付款</span>`;
    else if (stay.deductDate)        payTag = `<span class="tag tag-unpaid">${esc(stay.deductDate)} 扣款</span>`;
    else                             payTag = `<span class="tag tag-unpaid">未付款</span>`;
    stayTags = `
      <div class="sch-stay-tags">
        <span class="tag tag-person">${esc(pt.label)}</span>
        ${payTag}
        ${stay.payer ? `<span class="sch-payer" title="付款人 ${esc(stay.payer)}">${avatarSvg(stay.payer)}</span>` : ''}
        ${navBtn}
      </div>`;
  }

  const clickable = stay ? `onclick="openSchStay(${x._stayIndex})"`
                  : act  ? `onclick="openSchAct(${actIndex})"` : '';

  return `
    <div class="sch-node cat-${esc(x.category)}${clickable ? ' expandable' : ''}${stay ? (stay.paid ? ' stay-paid' : ' stay-unpaid') : ''}" ${clickable}>
      <div class="sch-node-time">${esc(x.time || '')}</div>
      <div class="sch-node-dot">${icon}</div>
      <div class="sch-node-body">
        <div class="sch-node-title">${esc(x.title)}${clickable ? '<span class="sch-expand">›</span>' : ''}</div>
        ${x.place ? `<div class="sch-node-place">📍 ${esc(x.place)}</div>` : ''}
        ${x.note  ? `<div class="sch-node-note">${esc(x.note)}</div>` : ''}
        ${stayTags}
        ${!stay && navBtn ? `<div class="sch-node-actions">${navBtn}</div>` : ''}
      </div>
    </div>`;
}

// 標題比對活動表（完全相同或互相包含就算同一筆）
function findSchActivity(title, activities) {
  const t = String(title || '').trim();
  if (!t) return -1;
  return (activities || []).findIndex(a => {
    const n = String(a.name || '').trim();
    return n && (n === t || n.includes(t) || t.includes(n));
  });
}

// ── 節點詳情彈窗 ──────────────────────────────
// ── 資訊區塊：標籤在上、內容佔滿寬度（取代左右對照式排版）
function schBlock(icon, label, val, opts) {
  if (!val) return '';
  opts = opts || {};
  const body = opts.chips
    ? `<div class="sch-chips">${splitToChips(val).map(c => `<span class="sch-chip">${esc(c)}</span>`).join('')}</div>`
    : `<div class="sch-block-body">${esc(val)}</div>`;
  return `
    <div class="sch-block${opts.warn ? ' warn' : ''}">
      <div class="sch-block-label">${icon} ${label}</div>
      ${body}
    </div>`;
}

// 逗號/頓號/斜線分隔的清單 → chips（過長的段落不拆，避免切出破碎片段）
function splitToChips(text) {
  const t = String(text || '').trim();
  const parts = t.split(/[、,，/／]+/).map(x => x.trim()).filter(Boolean);
  // 每項都夠短才適合做 chips，否則整段當一塊
  return (parts.length > 1 && parts.every(x => x.length <= 12)) ? parts : [t];
}

// 價格區：每人價當視覺重心，其餘降階
function schPriceBar(o) {
  if (!o.twd) return o.emptyText
    ? `<div class="sch-price"><span class="sch-price-main" style="font-size:.9rem;color:var(--muted);">${esc(o.emptyText)}</span></div>` : '';
  return `
    <div class="sch-price">
      <div class="sch-price-main">${fmtPer(o.twd)}</div>
      <div class="sch-price-sub">
        ${fmt(o.twd)} 合計${o.orig && o.cur !== 'NT' ? ` · ${fmtOrig(o.orig, o.cur)}` : ''}${o.nights ? ` · ${o.nights} 晚` : ''}
        ${o.foreignFee ? `<span class="sch-fee">手續費 NT$${o.foreignFee}</span>` : ''}
      </div>
    </div>`;
}

window.openSchStay = function(i) {
  const stay = (window.APP_DATA?.accommodation || [])[i];
  if (!stay) return;
  const pt = placeTypeIcon(stay.stayType || stay.name || '');
  let payTag;
  if (stay.paid && stay.payDate)   payTag = `<span class="tag tag-paid">${esc(stay.payDate)} 付款</span>`;
  else if (stay.paid)              payTag = `<span class="tag tag-paid">已付款</span>`;
  else if (stay.deductDate)        payTag = `<span class="tag tag-unpaid">${esc(stay.deductDate)} 扣款</span>`;
  else                             payTag = `<span class="tag tag-unpaid">未付款</span>`;

  openSchModal(`
    <div class="sch-modal-head">
      <span class="sch-modal-icon">${pt.icon}</span>
      <div style="flex:1;min-width:0;">
        <div class="sch-modal-title">${esc(stay.name)}</div>
        <div class="sch-modal-sub">${esc(stay.date || '')}${stay.nights ? ` · ${stay.nights} 晚` : ''}</div>
      </div>
    </div>

    ${schPriceBar({ twd: stay.twd, orig: stay.orig, cur: stay.cur, nights: stay.nights,
                    foreignFee: stay.foreignFee, emptyText: '現場付' })}

    <div class="sch-tagrow">
      <span class="tag tag-person">${esc(pt.label)}</span>
      ${payTag}
      <span class="tag ${stay.cancel ? 'tag-cancel' : 'tag-nocancel'}">${stay.cancel ? '可取消' : '不可退'}</span>
      ${stay.payer ? `<span class="sch-payer" title="付款人 ${esc(stay.payer)}">${avatarSvg(stay.payer)}</span>` : ''}
    </div>

    ${schBlock('📍', '地址', stay.address)}
    ${schBlock('🛏', '設備', stay.facilities, { chips: true })}
    ${schBlock('💰', '自費', stay.extraFee)}
    ${schBlock('🎒', '需自備', stay.bring, { chips: true })}
    ${schBlock('🌄', '周邊', stay.nearby)}
    ${schBlock('📌', '備註', stay.note, { warn: isWarnText(stay.note) })}

    ${(stay.lat && stay.lng) ? `
      <button class="sch-modal-nav" onclick="window.open('https://maps.google.com/?q=${stay.lat},${stay.lng}','_blank')">➤ 導航到這裡</button>` : ''}
  `);
};

window.openSchAct = function(i) {
  const a = (window.APP_DATA?.activity || [])[i];
  if (!a) return;
  let payTag = a.paid ? `<span class="tag tag-paid">已付款</span>`
             : a.payDate ? `<span class="tag tag-unpaid">${esc(a.payDate)} 前付款</span>`
             : `<span class="tag tag-unpaid">未付款</span>`;
  const meet = [a.meetTime, a.meetLoc].filter(Boolean).join(' · ');

  openSchModal(`
    <div class="sch-modal-head">
      <span class="sch-modal-icon">🎯</span>
      <div style="flex:1;min-width:0;">
        <div class="sch-modal-title">${a.url ? `<a href="${safeUrl(a.url)}" target="_blank" rel="noopener">${esc(a.name)}</a>` : esc(a.name)}</div>
        <div class="sch-modal-sub">${esc(a.date || '')}${a.duration ? ` · ${esc(a.duration)}` : ''}</div>
      </div>
    </div>

    ${schPriceBar({ twd: a.twd, orig: a.orig, cur: a.cur, foreignFee: a.foreignFee })}

    <div class="sch-tagrow">
      ${payTag}
      <span class="tag ${a.cancel ? 'tag-cancel' : 'tag-nocancel'}">${a.cancel ? '可取消' : '不可退'}</span>
      ${a.difficulty ? `<span class="tag tag-person">難度 ${esc(a.difficulty)}</span>` : ''}
      ${a.payer ? `<span class="sch-payer">${avatarSvg(a.payer)}</span>` : ''}
    </div>

    ${meet ? `<div class="sch-meet"><span class="sch-meet-label">集合</span><span>${esc(meet)}</span></div>` : ''}

    ${schBlock('📝', '內容', a.content)}
    ${schBlock('✅', '提供', a.included, { chips: true })}
    ${schBlock('❌', '不提供', a.excluded, { chips: true })}
    ${schBlock('🎒', '自備', a.bring, { chips: true })}
    ${schBlock('🚩', '回程地', a.returnLoc)}
    ${schBlock('⚠️', '注意', a.note, { warn: true })}

    ${(a.lat && a.lng) ? `
      <button class="sch-modal-nav" onclick="window.open('https://maps.google.com/?q=${a.lat},${a.lng}','_blank')">➤ 導航到集合點</button>` : ''}
  `);
};

// 含這些字樣的備註視為警示，用有色區塊突顯
function isWarnText(t) {
  return /無網路|沒有網路|不提供網路|需自備|只收現金|不收現金|4x4|F 級|F級|碎石|注意|警|限制|不適合|禁止/.test(String(t || ''));
}

function openSchModal(html) {
  const box = document.getElementById('schModalBody');
  if (!box) return;
  box.innerHTML = html;
  document.getElementById('schModal').classList.add('show');
}

window.setSchFilter = function(key) {
  _schFilter = key;
  const el = document.getElementById('scheduleContent');
  if (el) el.innerHTML = renderSchedule(window.APP_DATA || window.STATIC);
  schBindScroll();
};

// 日期跳轉：捲到該天
// 轉向或視窗縮放時，重算能顯示幾天
(function(){
  let t = null;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(() => { if (document.getElementById('schJumper')) refreshSchJumper(); }, 200);
  });
})();

window.schJumpTo = function(key) {
  _schActiveKey = key;
  refreshSchJumper();
  const target = document.querySelector(`.sch-day[data-key="${key}"]`);
  const scroller = document.getElementById('schScroll');
  if (!target || !scroller) return;
  scroller.scrollTo({ top: schRelTop(target, scroller) - 4, behavior: 'smooth' });
};

// ‹ › 前後一天（移動選中的那天）
window.schJumpStep = function(dir) {
  const days = buildScheduleDays(window.APP_DATA || window.STATIC);
  if (!days.length) return;
  const idx = days.findIndex(x => x.key === _schActiveKey);
  const next = Math.max(0, Math.min(days.length - 1, (idx < 0 ? 0 : idx) + dir));
  schJumpTo(days[next].key);
};

window.schScrollToToday = function() {
  const today = document.querySelector('.sch-day.today');
  if (today) schJumpTo(today.dataset.key);
};

// 捲動時決定「回到今日」要不要出現、箭頭朝哪
function schBindScroll() {
  const scroller = document.getElementById('schScroll');
  const btn = document.getElementById('schBackToday');
  const arrow = document.getElementById('schBackArrow');
  if (!scroller || !btn) return;
  const todayEl = scroller.querySelector('.sch-day.today');
  if (!todayEl) { btn.style.display = 'none'; return; }

  function update() {
    // 捲到哪天，跳轉列就跟著選到哪天
    const dayEls = [...scroller.querySelectorAll('.sch-day')];
    const cur = dayEls.filter(el => schRelTop(el, scroller) <= scroller.scrollTop + 40).pop()
             || dayEls[0];
    if (cur && cur.dataset.key !== _schActiveKey) {
      _schActiveKey = cur.dataset.key;
      refreshSchJumper();
    }

    const todayTop = schRelTop(todayEl, scroller);
    const view = scroller.scrollTop;
    const diff = todayTop - view;
    if (Math.abs(diff) < scroller.clientHeight * 0.5) {
      btn.style.display = 'none';   // 今日就在視野內
      return;
    }
    btn.style.display = 'flex';
    // 今日在下方 → 按鈕貼底、箭頭朝下；今日在上方 → 貼頂、箭頭朝上
    const below = diff > 0;
    arrow.textContent = below ? '↓' : '↑';
    btn.classList.toggle('at-bottom', below);
    btn.classList.toggle('at-top', !below);
  }
  scroller.removeEventListener('scroll', scroller._schHandler || (()=>{}));
  scroller._schHandler = update;
  scroller.addEventListener('scroll', update, { passive:true });
  update();
  // 一進來就對準今日
  if (todayEl) scroller.scrollTop = schRelTop(todayEl, scroller) - 4;
}
window.schBindScroll = schBindScroll;

// ══════════════════════════════════════════════════════════
//  保險：依 公司＋方案 分組成卡片，一列＝一個理賠項目
// ══════════════════════════════════════════════════════════
function renderInsurance(items) {
  items = items || [];
  if (!items.length) {
    return `<div class="empty">🛡 在「保險」表填入後顯示<br>
      <span style="font-size:.7rem;color:var(--muted)">欄位：保險公司／方案／理賠項目／理賠金額／理賠方法／備註</span></div>`;
  }
  // 沿用上一列的公司/方案（同一張保單多列時可留空）
  let lastCompany = '', lastPlan = '';
  const filled = items.map(x => {
    if (x.company) lastCompany = x.company; 
    if (x.plan) lastPlan = x.plan;
    return { ...x, company: x.company || lastCompany, plan: x.plan || lastPlan };
  });
  const groups = new Map();
  filled.forEach(x => {
    const key = `${x.company}｜${x.plan}`;
    if (!groups.has(key)) groups.set(key, { company: x.company, plan: x.plan, rows: [] });
    groups.get(key).rows.push(x);
  });

  return [...groups.values()].map(g => `
    <div class="car-card" style="margin-bottom:12px;">
      <div class="car-header">
        <div class="car-title">🛡 ${esc(g.company)}</div>
        ${g.plan ? `<div class="car-model">${esc(g.plan)}</div>` : ''}
      </div>
      <div style="padding:4px 16px 12px;">
        ${g.rows.map(r => `
          <div style="padding:9px 0;border-bottom:1px solid var(--border);">
            <div style="display:flex;align-items:baseline;gap:8px;">
              <span style="flex:1;font-size:.82rem;color:var(--text);">${esc(r.item)}</span>
              ${r.amount ? `<span style="font-family:'Cinzel',serif;font-size:.85rem;color:var(--gold);white-space:nowrap;">${esc(r.amount)}</span>` : ''}
            </div>
            ${r.method ? `<div style="font-size:.68rem;color:var(--muted);margin-top:3px;line-height:1.7;">📋 ${esc(r.method)}</div>` : ''}
            ${r.note ? `<div style="font-size:.66rem;color:var(--muted);margin-top:2px;">📌 ${esc(r.note)}</div>` : ''}
          </div>`).join('')}
      </div>
    </div>`).join('');
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
  if (id === 'schedule') setTimeout(() => window.schBindScroll?.(), 0);
};