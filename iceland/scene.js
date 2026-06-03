// scene.js — 像素天氣場景、時鐘、預算條

(function () {
  const BUDGET = 100000;
  const ITINERARY = [
    { from:'09-15', to:'09-16', name:'Hekla 附近',    lat:63.98, lon:-19.67 },
    { from:'09-17', to:'09-17', name:'Þakgil',         lat:63.47, lon:-18.93 },
    { from:'09-18', to:'09-19', name:'Svínafell',      lat:63.99, lon:-16.87 },
    { from:'09-20', to:'09-20', name:'富瑞麥德',        lat:65.07, lon:-13.98 },
    { from:'09-21', to:'09-21', name:'Húsey 農場',     lat:65.53, lon:-14.57 },
    { from:'09-22', to:'09-22', name:'米湖',            lat:65.60, lon:-17.00 },
    { from:'09-23', to:'09-23', name:'Ósar',            lat:65.72, lon:-20.28 },
    { from:'09-24', to:'09-24', name:'西峽灣小屋',      lat:65.54, lon:-22.10 },
    { from:'09-25', to:'09-25', name:'Miðjanes',        lat:65.45, lon:-22.50 },
    { from:'09-26', to:'09-26', name:'海山景小屋',      lat:64.85, lon:-22.20 },
    { from:'09-27', to:'09-28', name:'雷克雅維克',      lat:64.13, lon:-21.82 },
  ];
  const DEFAULT = { name:'雷克雅維克', lat:64.13, lon:-21.82 };

  function getLoc() {
    const t = new Date();
    const mmdd = String(t.getMonth()+1).padStart(2,'0') + '-' + String(t.getDate()).padStart(2,'0');
    for (const s of ITINERARY) if (mmdd >= s.from && mmdd <= s.to) return s;
    return DEFAULT;
  }

  function decodeW(code, isDay) {
    if (code === 0)  return { label: isDay ? '晴天 ☀️' : '晴夜 🌙', type: isDay ? 'sunny' : 'night' };
    if (code <= 2)   return { label: '多雲 ⛅', type: 'cloudy' };
    if (code === 3)  return { label: '陰天 ☁️', type: 'overcast' };
    if (code <= 49)  return { label: '有霧 🌫️', type: 'fog' };
    if (code <= 55)  return { label: '毛毛雨 🌦️', type: 'drizzle' };
    if (code <= 67)  return { label: '下雨 🌧️', type: 'rain' };
    if (code <= 77)  return { label: '下雪 🌨️', type: 'snow' };
    if (code <= 82)  return { label: '陣雨 🌦️', type: 'rain' };
    if (code <= 86)  return { label: '陣雪 🌨️', type: 'snow' };
    if (code <= 99)  return { label: '雷雨 ⛈️', type: 'thunder' };
    return { label: '未知', type: 'cloudy' };
  }

  function setSky(type) {
    const el = document.getElementById('pxScene');
    if (!el) return;
    const skies = {
      sunny:'#a8dff0', night:'#050d1a', cloudy:'#7a9aaa',
      overcast:'#606878', fog:'#a0b8c0', rain:'#4a5a68',
      drizzle:'#5a6a78', snow:'#8090b8', thunder:'#2a2a40',
    };
    el.style.background = skies[type] || skies.sunny;
  }

  function startParticles(type, windSpeed) {
    const canvas = document.getElementById('pxCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth || 680;
    canvas.height = canvas.offsetHeight || 220;
    let pts = [], aOff = 0, sunP = 0;

    if (type === 'rain' || type === 'drizzle' || type === 'thunder') {
      for (let i = 0; i < 50; i++) pts.push({ x:Math.random()*canvas.width, y:Math.random()*canvas.height, speed:type==='drizzle'?2:4, len:type==='drizzle'?6:12 });
      (function draw() {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.strokeStyle = type==='thunder' ? 'rgba(150,180,220,0.7)' : 'rgba(120,160,200,0.6)';
        ctx.lineWidth = 1;
        pts.forEach(p => { ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x-2,p.y+p.len); ctx.stroke(); p.y+=p.speed; p.x-=1; if(p.y>canvas.height){p.y=0;p.x=Math.random()*canvas.width;} });
        if (type==='thunder' && Math.random()<0.003) { ctx.fillStyle='rgba(255,255,200,0.15)'; ctx.fillRect(0,0,canvas.width,canvas.height); }
        requestAnimationFrame(draw);
      })();
    } else if (type === 'snow') {
      for (let i = 0; i < 40; i++) pts.push({ x:Math.random()*canvas.width, y:Math.random()*canvas.height, size:Math.random()*3+1, speed:0.5+Math.random() });
      (function draw() {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = 'rgba(220,235,255,0.85)';
        pts.forEach(p => { ctx.fillRect(Math.round(p.x),Math.round(p.y),Math.round(p.size),Math.round(p.size)); p.y+=p.speed; p.x+=Math.sin(p.y/20)*0.5; if(p.y>canvas.height){p.y=0;p.x=Math.random()*canvas.width;} });
        requestAnimationFrame(draw);
      })();
    } else if (type === 'night') {
      (function draw() {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        aOff += 0.5;
        [[0,255,180,0.15],[120,80,255,0.12],[0,200,255,0.10]].forEach(([r,g,b,a],i) => {
          ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
          ctx.fillRect(0, 15+i*8+Math.sin((aOff+i*20)/30)*6, canvas.width, 10);
        });
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        [[50,20],[120,35],[200,15],[300,28],[420,18],[520,32],[620,22]].forEach(([x,y]) => ctx.fillRect(x,y,2,2));
        requestAnimationFrame(draw);
      })();
    } else if (type === 'sunny') {
      (function draw() {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        sunP += 0.05;
        ctx.fillStyle = `rgba(255,220,100,${0.06+Math.sin(sunP)*0.02})`;
        ctx.beginPath(); ctx.arc(canvas.width-50,25,35,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(255,220,100,0.85)';
        ctx.fillRect(canvas.width-58,22,14,7);
        requestAnimationFrame(draw);
      })();
    } else if (type === 'fog') {
      const fogBalls = [
        {x:0,y:30,w:220,h:50,spd:0.20,op:0.13},{x:180,y:55,w:280,h:60,spd:0.14,op:0.11},
        {x:420,y:20,w:200,h:45,spd:0.25,op:0.10},{x:80,y:70,w:320,h:55,spd:0.10,op:0.09},
        {x:500,y:45,w:250,h:50,spd:0.18,op:0.12},{x:250,y:80,w:200,h:40,spd:0.22,op:0.08},
      ];
      (function draw() {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        fogBalls.forEach(f => {
          f.x += f.spd;
          if (f.x > canvas.width+f.w) f.x = -f.w;
          const grd = ctx.createLinearGradient(f.x,0,f.x+f.w,0);
          grd.addColorStop(0,`rgba(200,215,225,0)`); grd.addColorStop(0.2,`rgba(200,215,225,${f.op})`);
          grd.addColorStop(0.8,`rgba(200,215,225,${f.op})`); grd.addColorStop(1,`rgba(200,215,225,0)`);
          ctx.fillStyle = grd; ctx.fillRect(f.x,f.y,f.w,f.h);
        });
        requestAnimationFrame(draw);
      })();
    }

    // 雲層
    const cloudCanvas = document.getElementById('pxCloudCanvas');
    if (cloudCanvas) {
      const cctx = cloudCanvas.getContext('2d');
      cloudCanvas.width = canvas.width; cloudCanvas.height = canvas.height;
      if (type !== 'night') {
        const spd = Math.max((windSpeed || 0)*0.18, 0.15);
        const clouds = [
          {x:Math.random()*canvas.width,y:8,w:44,h:10,thick:6},
          {x:Math.random()*canvas.width,y:18,w:58,h:10,thick:6},
          {x:Math.random()*canvas.width,y:12,w:32,h:7,thick:4},
          {x:Math.random()*canvas.width,y:24,w:28,h:7,thick:4},
          {x:Math.random()*canvas.width,y:6,w:22,h:6,thick:4},
        ];
        (function drawClouds() {
          cctx.clearRect(0,0,cloudCanvas.width,cloudCanvas.height);
          clouds.forEach(c => {
            c.x += spd;
            if (c.x > cloudCanvas.width+c.w) c.x = -c.w-10;
            cctx.fillStyle = 'rgba(255,255,255,0.28)';
            cctx.fillRect(Math.round(c.x),c.y,c.w,c.h);
            cctx.fillRect(Math.round(c.x)+4,c.y-c.thick,c.w-8,c.thick+2);
          });
          requestAnimationFrame(drawClouds);
        })();
      } else {
        cctx.clearRect(0,0,cloudCanvas.width,cloudCanvas.height);
      }
    }
  }

  // ══ 預算條更新 ══
  window.updatePixelBudget = function () {
    const d = window.APP_DATA || window.STATIC;
    if (!d || !document.getElementById('pxBar')) return;
    const totalAccom = (d.accommodation || []).reduce((s,a) => s+(a.twd||0), 0);
    const totalAct   = (d.activity || []).reduce((s,a) => s+(a.twd||0), 0);
    const totalDaily = (d.daily || []).reduce((s,a) => s+(a.twd||0), 0);
    const grandTotal = (d.car.totalTWD||0) + totalAccom + totalAct + totalDaily;
    const perPerson  = Math.round(grandTotal / 3);
    const pct        = Math.min(Math.round(perPerson / BUDGET * 100), 100);
    const remain     = BUDGET - perPerson;
    const isOver     = perPerson >= BUDGET;

    const bar = document.getElementById('pxBar');
    bar.style.width = pct + '%';
    bar.className = 'px-bar-fill ' + (pct >= 100 ? 'danger' : pct >= 70 ? 'warn' : 'safe');
    document.getElementById('pxPct').textContent = pct + '%';
    const spentEl = document.getElementById('pxSpent');
    if (spentEl) spentEl.textContent = 'NT$ ' + perPerson.toLocaleString('zh-TW');

    // 角色站位
    const paid2 = { '花':0, '猴':0, '寧':0 };
    (d.accommodation||[]).forEach(a => {
      if (!a.payer || !a.twd) return;
      for (const m of ['花','猴','寧']) { if (a.payer.includes(m)) { paid2[m] += a.twd; break; } }
    });
    if (d.car?.totalTWD && d.car?.payer) {
      for (const m of ['花','猴','寧']) { if (d.car.payer.includes(m)) { paid2[m] += d.car.totalTWD; break; } }
    }
    const membersSorted = [...['花','猴','寧']].sort((a,b) => paid2[b]-paid2[a]);
    const idMap = { '花':'pxHana', '猴':'pxMonkey', '寧':'pxNing' };
    membersSorted.forEach((name, i) => {
      const el = document.getElementById(idMap[name]);
      if (!el) return;
      if (isOver) { el.classList.add('dead'); el.style.left = (25+i*12)+'%'; }
      else { el.classList.remove('dead'); el.style.left = Math.min(pct*0.85+i*5, 86)+'%'; }
    });

    const carEl = document.getElementById('pxCarEl');
    if (carEl) carEl.style.left = (isOver ? 8 : Math.max(Math.min(pct*0.85-15,74),2)) + '%';

    const msg = document.getElementById('pxMsg');
    if (isOver) { msg.className='px-gb-msg danger'; msg.textContent='✖ 超支！全員倒地！（點我查看分帳）'; }
    else if (pct >= 70) { msg.className='px-gb-msg warn'; msg.textContent='！注意！剩 NT$'+remain.toLocaleString()+' 要小心了（點我查看分帳）'; }
    else { msg.className='px-gb-msg safe'; msg.textContent='▶ 安全！還可以花 NT$'+remain.toLocaleString()+'（點我查看分帳）'; }
  };

  // ══ 時鐘 & 倒數 ══
  function updateClocks() {
    const now = new Date();
    const tw  = new Date(now.toLocaleString('en-US', { timeZone:'Asia/Taipei' }));
    const is  = new Date(now.toLocaleString('en-US', { timeZone:'Atlantic/Reykjavik' }));
    const p2  = n => String(n).padStart(2,'0');
    const twEl = document.getElementById('pxTimeTW');
    const isEl = document.getElementById('pxTimeIS');
    if (twEl) twEl.textContent = '🇹🇼 ' + p2(tw.getHours()) + ':' + p2(tw.getMinutes());
    if (isEl) isEl.textContent = '🇮🇸 ' + p2(is.getHours()) + ':' + p2(is.getMinutes());

    const cdEl = document.getElementById('pxCountdown');
    if (!cdEl) return;
    const DEPART      = new Date('2026-09-14T00:00:00+08:00');
    const ARRIVE_IS   = new Date('2026-09-15T00:00:00+00:00');
    const DEPART_NING = new Date('2026-09-28T14:00:00+00:00'); // ← 填入確認班機時間
    const DEPART_ALL  = new Date('2026-09-29T00:00:00+00:00'); // ← 填入確認班機時間
    const ARRIVE_TW   = new Date('2026-09-30T00:00:00+08:00');

    let cdText = '';
    if (now < DEPART) {
      cdText = '倒數 ' + Math.ceil((DEPART-now)/86400000) + ' 天！';
    } else if (now < ARRIVE_IS) {
      cdText = '飛往冰島中！';
    } else if (now >= ARRIVE_TW) {
      cdText = '離開冰島第 ' + (Math.floor((now-ARRIVE_TW)/86400000)+1) + ' 天';
    } else {
      const day = Math.floor((now-ARRIVE_IS)/86400000)+1;
      const isNingDay = now >= new Date(2026,8,28) && now < new Date(2026,8,29);
      const isAllDay  = now >= new Date(2026,8,29) && now < new Date(2026,8,30);
      if (isAllDay)       cdText = '在冰島第 '+day+' 天<br>花猴告別冰島日';
      else if (isNingDay) cdText = '在冰島第 '+day+' 天<br>14:05 憶寧要飛走了';
      else                cdText = '在冰島第 '+day+' 天';
    }
    cdEl.innerHTML = cdText;
  }

  function windColor(speed) {
    if (speed < 8)  return '#7eb3d4';
    if (speed < 14) return '#ffcc00';
    if (speed < 20) return '#ff9e80';
    return '#ff3366';
  }

  let _weatherFetched = false;
  let _weatherCache   = null;

  function applyWeatherToDOM() {
    if (!_weatherCache) return;
    const { loc, w, temp, wind } = _weatherCache;
    const locEl  = document.getElementById('pxLoc');
    const wEl    = document.getElementById('pxWeather');
    const windEl = document.getElementById('pxWind');
    const boxEl  = document.getElementById('pxWeatherWind');
    if (locEl)  locEl.textContent  = '📍 ' + loc.name;
    if (wEl)    wEl.textContent    = w.label + '  ' + temp + '°C';
    if (windEl) {
      windEl.textContent          = '💨 ' + wind + ' m/s';
      windEl.style.color          = windColor(wind);
      windEl.style.borderTopColor = windColor(wind);
    }
    if (boxEl) boxEl.style.borderColor = '#ffcc00';
  }

  async function initWeather() {
    if (_weatherFetched) return;
    _weatherFetched = true;
    const loc  = getLoc();
    const locEl = document.getElementById('pxLoc');
    if (locEl) locEl.textContent = '📍 ' + loc.name;
    try {
      const res  = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,weathercode,is_day,windspeed_10m&timezone=Atlantic%2FReykjavik`);
      const data = await res.json();
      const w    = decodeW(data.current.weathercode, data.current.is_day === 1);
      const temp = Math.round(data.current.temperature_2m);
      const wind = Math.round(data.current.windspeed_10m);
      _weatherCache = { loc, w, temp, wind };
      applyWeatherToDOM();
      setSky(w.type);
      startParticles(w.type, wind);
    } catch (e) {
      const wEl = document.getElementById('pxWeather');
      if (wEl) wEl.textContent = '⚠ 天氣讀取失敗';
      setSky('cloudy');
      startParticles('cloudy', 5);
    }
    updateClocks();
    setInterval(updateClocks, 30000);
  }

  // renderAll 後補上天氣文字（DOM 重建後 id 仍在）
  const _origRenderAll = window.renderAll;
  window.renderAll = function () {
    _origRenderAll?.();
    setTimeout(window.updatePixelBudget, 100);
    applyWeatherToDOM();
  };

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initWeather, 200);
    setTimeout(window.updatePixelBudget, 500);
  });
})();
