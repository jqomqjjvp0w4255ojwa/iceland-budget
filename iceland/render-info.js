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
      <div class="empty">📅 日程 sheet 填入後顯示</div>
    </div>
    <div id="infoTab-insurance" class="section">
      <div class="empty">🛡 保險資訊填入後顯示</div>
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
  const disabled = dim && !done;      // 共用裝備：非負責人不需要勾
  const title = disabled
    ? `${member}（由 ${task.owner} 負責）`
    : `${member}${done ? '：已準備好' : '：還沒'}`;
  return `<button class="prep-avatar${done ? ' done' : ''}${disabled ? ' dim' : ''}"
    title="${esc(title)}"
    onclick="togglePrep('${esc(task.id)}','${esc(member)}',this);event.stopPropagation();">
    ${avatarSvg(member)}
  </button>`;
}

function renderPrepItem(task) {
  const members = window.TRIP_MEMBERS || ['猴','花','寧'];
  const isShared = task.category === '共用';
  // 共用裝備：有指定負責人時，其他人的小人淡出（仍可點，只是視覺提示）
  const avatars = members.map(m => prepAvatar(task, m, isShared && task.owner && task.owner !== m)).join('');
  const doneCount = members.filter(m => task.done?.[m]).length;
  const allDone = isShared
    ? (task.owner ? !!task.done?.[task.owner] : doneCount > 0)
    : doneCount === members.length;
  const stars = task.priority > 0
    ? `<span class="prep-stars" title="重要度 ${task.priority}">${'★'.repeat(Math.min(5, task.priority))}</span>` : '';

  return `<div class="prep-item${allDone ? ' all-done' : ''}" data-id="${esc(task.id)}">
    <div class="prep-main">
      <div class="prep-name">${esc(task.name)}${stars}</div>
      ${task.note ? `<div class="prep-note">${esc(task.note)}</div>` : ''}
      ${isShared && task.owner ? `<div class="prep-owner">🎒 由 ${esc(task.owner)} 負責帶</div>` : ''}
    </div>
    <div class="prep-avatars">${avatars}</div>
    <button type="button" class="prep-more" title="編輯／刪除" onclick="openEditPrep('${esc(task.id)}');event.stopPropagation();">⋮</button>
  </div>`;
}

// 每人各自的準備進度（共用裝備只算負責人那份）
function renderPrepProgress(tasks) {
  const members = window.TRIP_MEMBERS || ['猴','花','寧'];
  const perMember = members.map(m => {
    const mine = (tasks || []).filter(t => t.category !== '共用' || !t.owner || t.owner === m);
    const done = mine.filter(t => t.done?.[m]).length;
    return { m, done, total: mine.length, pct: mine.length ? Math.round(done / mine.length * 100) : 0 };
  });
  return `<div class="prep-progress" id="prepProgress">
    ${perMember.map(p => `
      <div class="prep-progress-item">
        <div class="prep-progress-avatar${p.pct === 100 ? ' done' : ''}">${avatarSvg(p.m)}</div>
        <div style="flex:1;min-width:0;">
          <div class="prep-progress-label"><span>${esc(p.m)}</span><span>${p.done}/${p.total}</span></div>
          <div class="progress-bar"><div class="progress-fill" style="width:${p.pct}%"></div></div>
        </div>
      </div>`).join('')}
  </div>`;
}

function renderPrep(tasks) {
  tasks = tasks || [];
  if (!tasks.length) {
    return `<div class="empty">🧳 在「寫入_任務」表填入項目後顯示<br>
      <span style="font-size:.7rem;color:var(--muted)">分類填 待辦／行李／共用</span></div>`;
  }
  const progress = renderPrepProgress(tasks);

  const groups = PREP_CATS.map(cat => {
    const list = tasks.filter(t => (t.category || '待辦') === cat.key)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
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
  const others = tasks.filter(t => !known.includes(t.category || '待辦'));
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

  return progress + groups + otherHtml + addBtn;
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
  document.getElementById('prepOwnerField').style.display = _prepCat === '共用' ? '' : 'none';
}
window.selectPrepCat = function(key) {
  _prepCat = key;
  if (key !== '共用') _prepOwner = '';
  renderPrepCatBtns();
  renderPrepOwnerBtns();
};

function renderPrepOwnerBtns() {
  const el = document.getElementById('prepOwnerBtns');
  const members = window.TRIP_MEMBERS || ['猴','花','寧'];
  el.innerHTML = members.map(m =>
    `<button type="button" class="px-chip${_prepOwner===m?' on':''}" onclick="selectPrepOwner('${esc(m)}')">${esc(m)}</button>`
  ).join('');
}
window.selectPrepOwner = function(m) {
  _prepOwner = _prepOwner === m ? '' : m;   // 再點一次取消選取
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
};