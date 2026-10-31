/* 太阳系 2D 俯视图：Canvas + 开普勒轨道，无外部依赖 */
(function () {
  'use strict';

  var canvas = document.getElementById('solar-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var stage = canvas.parentElement;
  var yearEl = document.getElementById('solar-year');
  var slider = document.getElementById('solar-slider');
  var playBtn = document.getElementById('solar-play');
  var speedSel = document.getElementById('solar-speed');
  var resetBtn = document.getElementById('solar-reset');
  var infoEl = document.getElementById('solar-info');

  var DEG = Math.PI / 180;
  var MIN_YEAR = 1957, MAX_YEAR = 2026;
  var year = MAX_YEAR;
  var playing = false;
  var speed = 0.5;
  var zoom = 1;
  var panX = 0, panY = 0;
  var selected = null;
  var stars = [];

  // a: AU, e: 偏心率, P: 公转周期(年), peri: 近日点经度, L0: J2000 平黄经
  var PLANETS = [
    { id: 'mercury', zh: '水星', en: 'Mercury', a: 0.38710, e: 0.20563, P: 0.2408467, peri: 77.457, L0: 252.251, color: '#b9b1a8', size: 2.6, diameter: '4,879 km', day: '58.6 天', fact: '离太阳最近，表面昼夜温差超过 600℃，几乎没有大气。' },
    { id: 'venus',   zh: '金星', en: 'Venus',   a: 0.72333, e: 0.00677, P: 0.615197,  peri: 131.602, L0: 181.980, color: '#e8c27a', size: 3.6, diameter: '12,104 km', day: '243 天（逆行）', fact: '被浓厚二氧化碳大气包裹，温室效应让表面高达 460℃，比水星还热。' },
    { id: 'earth',   zh: '地球', en: 'Earth',   a: 1.00000, e: 0.01671, P: 1.000017,  peri: 102.947, L0: 100.464, color: '#6fb7ff', size: 3.8, diameter: '12,742 km', day: '23.9 小时', fact: '目前已知唯一存在生命的天体，71% 的表面被液态水覆盖。' },
    { id: 'mars',    zh: '火星', en: 'Mars',    a: 1.52371, e: 0.09339, P: 1.880848,  peri: 336.041, L0: 355.453, color: '#e07b5a', size: 3.0, diameter: '6,779 km', day: '24.6 小时', fact: '拥有太阳系最高的火山奥林匹斯山，高约 22 公里，是珠峰的两倍多。' },
    { id: 'jupiter', zh: '木星', en: 'Jupiter', a: 5.20260, e: 0.04839, P: 11.862,    peri: 14.331,  L0: 34.351,  color: '#d9b48f', size: 7.4, diameter: '139,820 km', day: '9.9 小时', fact: '质量是其余七大行星总和的 2.5 倍，大红斑是一场刮了几百年的风暴。' },
    { id: 'saturn',  zh: '土星', en: 'Saturn',  a: 9.55491, e: 0.05386, P: 29.457,    peri: 92.432,  L0: 50.077,  color: '#e6d3a3', size: 6.4, diameter: '116,460 km', day: '10.7 小时', fact: '壮观的星环主要由冰粒和岩石碎片组成，厚度却往往不到一公里。' },
    { id: 'uranus',  zh: '天王星', en: 'Uranus', a: 19.21845, e: 0.04726, P: 84.011,  peri: 170.964, L0: 314.055, color: '#9fe3e0', size: 5.2, diameter: '50,724 km', day: '17.2 小时', fact: '自转轴几乎“躺”在轨道面上，像一颗滚动的球，四季各持续约 21 年。' },
    { id: 'neptune', zh: '海王星', en: 'Neptune', a: 30.11039, e: 0.00859, P: 164.79, peri: 44.971,  L0: 304.349, color: '#6f8dff', size: 5.0, diameter: '49,244 km', day: '16.1 小时', fact: '风速可达每小时 2,000 公里，是太阳系最狂暴的大气层。' },
    { id: 'pluto',   zh: '冥王星', en: 'Pluto',  a: 39.482,  e: 0.2488,  P: 247.94,   peri: 224.07,  L0: 238.93,  color: '#c9b8a3', size: 2.4, diameter: '2,377 km', day: '6.4 天', fact: '2006 年被重新归类为矮行星；轨道倾角 17°，明显斜出其他行星的平面。' }
  ];

  function norm360(x) { return ((x % 360) + 360) % 360; }
  function compress(rAU) { return Math.pow(rAU, 0.6); }
  var MAX_R = compress(PLUTO_MAX());
  function PLUTO_MAX() { return 39.482 * (1 + 0.2488); }

  function orbitalState(p, tYears) {
    var M = norm360(p.L0 + 360 * tYears / p.P) * DEG;
    var E = M;
    for (var i = 0; i < 6; i++) {
      E = E - (E - p.e * Math.sin(E) - M) / (1 - p.e * Math.cos(E));
    }
    var nu = 2 * Math.atan2(Math.sqrt(1 + p.e) * Math.sin(E / 2), Math.sqrt(1 - p.e) * Math.cos(E / 2));
    var r = p.a * (1 - p.e * Math.cos(E));
    return { r: r, ang: nu + p.peri * DEG };
  }

  function posAtExp(p, tYears, exp) {
    var st = orbitalState(p, tYears);
    var R = Math.pow(st.r, exp);
    return { r: st.r, x: R * Math.cos(st.ang), y: R * Math.sin(st.ang) };
  }

  function positionAt(p, tYears) { return posAtExp(p, tYears, 0.6); }

  function orbitPointsExp(p, exp) {
    var pts = [];
    for (var i = 0; i <= 180; i++) {
      var E = i / 180 * Math.PI * 2;
      var r = p.a * (1 - p.e * Math.cos(E));
      var nu = 2 * Math.atan2(Math.sqrt(1 + p.e) * Math.sin(E / 2), Math.sqrt(1 - p.e) * Math.cos(E / 2));
      var ang = nu + p.peri * DEG;
      var R = Math.pow(r, exp);
      pts.push({ x: R * Math.cos(ang), y: R * Math.sin(ang) });
    }
    return pts;
  }
  PLANETS.forEach(function (p) {
    p.orbit = orbitPointsExp(p, 0.6);
    p.orbitInset = orbitPointsExp(p, 0.55);
  });

  var dpr = 1, W = 0, H = 0, baseScale = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var rect = stage.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    baseScale = Math.min(W, H) * 0.43 / MAX_R;
    stars = [];
    var n = Math.floor(W * H / 12000);
    for (var i = 0; i < n; i++) {
      stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.1 + 0.2, a: Math.random() * 0.5 + 0.2 });
    }
    draw();
  }

  function screen(x, y) {
    return { x: W / 2 + x * baseScale * zoom + panX, y: H / 2 + y * baseScale * zoom + panY };
  }

  function planetScreen(p, tYears) {
    var pos = positionAt(p, tYears);
    return screen(pos.x, pos.y);
  }

  function draw() {
    var tYears = year - 2000;
    ctx.clearRect(0, 0, W, H);

    // 背景星点
    for (var s = 0; s < stars.length; s++) {
      var st = stars[s];
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(220,230,255,' + st.a.toFixed(2) + ')';
      ctx.fill();
    }

    // 轨道
    PLANETS.forEach(function (p) {
      ctx.beginPath();
      for (var i = 0; i < p.orbit.length; i++) {
        var q = screen(p.orbit[i].x, p.orbit[i].y);
        if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
      }
      ctx.closePath();
      ctx.strokeStyle = hexA(p.color, selected === p.id ? 0.55 : 0.18);
      ctx.lineWidth = selected === p.id ? 1.4 : 1;
      ctx.stroke();
    });

    // 太阳
    var sun = screen(0, 0);
    var sunR = 15 * Math.min(1.6, Math.max(0.9, zoom * 0.8));
    var g = ctx.createRadialGradient(sun.x, sun.y, 1, sun.x, sun.y, sunR * 3.2);
    g.addColorStop(0, 'rgba(255,244,190,1)');
    g.addColorStop(0.25, 'rgba(255,196,92,0.95)');
    g.addColorStop(0.55, 'rgba(255,150,50,0.28)');
    g.addColorStop(1, 'rgba(255,150,50,0)');
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, sunR * 3.2, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, sunR, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe9a8';
    ctx.fill();

    // 行星
    var placed = [];
    PLANETS.forEach(function (p) {
      var q = planetScreen(p, tYears);
      var r = Math.max(3.2, p.size * Math.min(2.2, Math.max(0.8, Math.pow(zoom, 0.35))));
      if (p.id === 'saturn') drawRing(q, r, p.color);
      var pg = ctx.createRadialGradient(q.x - r * 0.35, q.y - r * 0.35, r * 0.2, q.x, q.y, r);
      pg.addColorStop(0, lighten(p.color, 0.45));
      pg.addColorStop(1, p.color);
      ctx.beginPath();
      ctx.arc(q.x, q.y, r, 0, Math.PI * 2);
      ctx.fillStyle = pg;
      ctx.fill();
      if (selected === p.id) {
        ctx.beginPath();
        ctx.arc(q.x, q.y, r + 5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(159,192,255,0.9)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // 内圈行星在默认缩放下不画标签（看右下放大镜），放大后再显示
      if (p.a < 2 && zoom < 1.6 && selected !== p.id) return;

      // 标签避让：优先右侧，冲突则换到上方/下方，再不行就省略
      ctx.font = '11px system-ui, "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      var label = p.zh;
      var tw = ctx.measureText(label).width + 6;
      var candidates = [
        { x: q.x, y: q.y + r + 13 },
        { x: q.x, y: q.y - r - 6 },
        { x: q.x + r + tw / 2 + 4, y: q.y + 4 },
        { x: q.x - r - tw / 2 - 4, y: q.y + 4 }
      ];
      for (var c = 0; c < candidates.length; c++) {
        var box = { x: candidates[c].x - tw / 2, y: candidates[c].y - 10, w: tw, h: 13 };
        var clash = placed.some(function (b) {
          return box.x < b.x + b.w && box.x + box.w > b.x && box.y < b.y + b.h && box.y + box.h > b.y;
        });
        if (!clash || selected === p.id) {
          placed.push(box);
          ctx.fillStyle = selected === p.id ? '#cfe0ff' : 'rgba(210,222,255,0.72)';
          ctx.fillText(label, candidates[c].x, candidates[c].y);
          break;
        }
      }
    });

    drawInset(tYears);
  }

  // 内太阳系放大镜
  function drawInset(tYears) {
    var R = Math.min(104, W * 0.2);
    var cx = R + 16, cy = H - R - 16;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(6, 10, 22, 0.88)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(120, 140, 200, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.clip();

    var maxR = Math.pow(1.666, 0.55);
    var scale = (R - 18) / maxR;
    var inner = PLANETS.slice(0, 4);
    inner.forEach(function (p) {
      ctx.beginPath();
      for (var i = 0; i < p.orbitInset.length; i++) {
        var q = p.orbitInset[i];
        var x = cx + q.x * scale, y = cy + q.y * scale;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = hexA(p.color, 0.28);
      ctx.lineWidth = 1;
      ctx.stroke();
    });
    // 太阳
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe9a8';
    ctx.fill();
    var insetLabels = [];
    inner.forEach(function (p) {
      var st = orbitalState(p, tYears);
      var Rr = Math.pow(st.r, 0.55) * scale;
      var x = cx + Rr * Math.cos(st.ang), y = cy + Rr * Math.sin(st.ang);
      var rr = Math.max(2.2, p.size * 0.55);
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      insetLabels.push({ p: p, x: x, y: y, r: rr });
    });
    ctx.restore();

    ctx.font = '9px system-ui, "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    insetLabels.forEach(function (l) {
      ctx.fillStyle = 'rgba(210,222,255,0.85)';
      var ly = l.p.id === 'mars' ? l.y - l.r - 5 : l.y + l.r + 10;
      ctx.fillText(l.p.zh, l.x, ly);
    });
    ctx.font = '10px system-ui, "Microsoft YaHei", sans-serif';
    ctx.fillStyle = 'rgba(150,165,200,0.75)';
    ctx.fillText('内太阳系（放大）', cx, cy - R - 8);
  }

  function drawRing(q, r, color) {
    ctx.save();
    ctx.translate(q.x, q.y);
    ctx.rotate(-0.35);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 2.1, r * 0.7, 0, 0, Math.PI * 2);
    ctx.strokeStyle = hexA(lighten(color, 0.25), 0.75);
    ctx.lineWidth = Math.max(1, r * 0.35);
    ctx.stroke();
    ctx.restore();
  }

  function hexA(hex, a) {
    var c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(function (x) { return x + x; }).join('');
    var n = parseInt(c, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function lighten(hex, k) {
    var c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(function (x) { return x + x; }).join('');
    var n = parseInt(c, 16);
    var r = Math.round(((n >> 16) & 255) + (255 - ((n >> 16) & 255)) * k);
    var g = Math.round(((n >> 8) & 255) + (255 - ((n >> 8) & 255)) * k);
    var b = Math.round((n & 255) + (255 - (n & 255)) * k);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  // ---------- 交互 ----------
  var pointers = {};
  var dragging = false, moved = false, lastX = 0, lastY = 0, pinchDist = 0;

  canvas.addEventListener('pointerdown', function (e) {
    canvas.setPointerCapture(e.pointerId);
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (Object.keys(pointers).length === 1) {
      dragging = true; moved = false; lastX = e.clientX; lastY = e.clientY;
    } else if (Object.keys(pointers).length === 2) {
      var pts = Object.values(pointers);
      pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }
  });

  canvas.addEventListener('pointermove', function (e) {
    if (!pointers[e.pointerId]) return;
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(pointers);
    if (ids.length === 2) {
      var pts = Object.values(pointers);
      var d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchDist > 0) {
        zoom = clamp(zoom * d / pinchDist, 0.6, 10);
        pinchDist = d;
        draw();
      }
      return;
    }
    if (!dragging) return;
    var dx = e.clientX - lastX, dy = e.clientY - lastY;
    if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
    panX += dx; panY += dy;
    lastX = e.clientX; lastY = e.clientY;
    draw();
  });

  function endPointer(e) {
    delete pointers[e.pointerId];
    if (Object.keys(pointers).length === 0) {
      if (dragging && !moved) pick(e.clientX, e.clientY);
      dragging = false;
      pinchDist = 0;
    }
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    var factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    zoomAt(e.clientX, e.clientY, factor);
  }, { passive: false });

  function zoomAt(cx, cy, factor) {
    var rect = canvas.getBoundingClientRect();
    var px = cx - rect.left, py = cy - rect.top;
    var wx = (px - W / 2 - panX) / (baseScale * zoom);
    var wy = (py - H / 2 - panY) / (baseScale * zoom);
    zoom = clamp(zoom * factor, 0.6, 10);
    panX = px - W / 2 - wx * baseScale * zoom;
    panY = py - H / 2 - wy * baseScale * zoom;
    draw();
  }

  function pick(cx, cy) {
    var rect = canvas.getBoundingClientRect();
    var px = cx - rect.left, py = cy - rect.top;
    var tYears = year - 2000;
    var best = null, bestD = 18;
    PLANETS.forEach(function (p) {
      var q = planetScreen(p, tYears);
      var d = Math.hypot(q.x - px, q.y - py);
      if (d < bestD) { bestD = d; best = p; }
    });
    if (best) {
      selected = best.id;
      showInfo(best);
    } else {
      selected = null;
      infoEl.hidden = true;
    }
    draw();
  }

  function showInfo(p) {
    infoEl.hidden = false;
    infoEl.innerHTML =
      '<button class="solar-info-close" type="button" aria-label="关闭">×</button>' +
      '<h3>' + p.zh + ' <small>' + p.en + '</small></h3>' +
      '<dl>' +
      '<dt>直径</dt><dd>' + p.diameter + '</dd>' +
      '<dt>公转周期</dt><dd>' + fmtPeriod(p.P) + '</dd>' +
      '<dt>自转周期</dt><dd>' + p.day + '</dd>' +
      '<dt>轨道半长轴</dt><dd>' + p.a.toFixed(3) + ' AU</dd>' +
      '<dt>偏心率</dt><dd>' + p.e.toFixed(4) + '</dd>' +
      '</dl>' +
      '<p>' + p.fact + '</p>';
    infoEl.querySelector('.solar-info-close').addEventListener('click', function () {
      infoEl.hidden = true;
      selected = null;
      draw();
    });
  }

  function fmtPeriod(y) {
    if (y < 1) return (y * 365.25).toFixed(1) + ' 天';
    return y.toFixed(2) + ' 年';
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // ---------- 控制 ----------
  function setYear(v) {
    year = clamp(v, MIN_YEAR, MAX_YEAR);
    yearEl.textContent = year.toFixed(1);
    slider.value = String(year);
    draw();
  }

  slider.addEventListener('input', function () {
    playing = false;
    playBtn.textContent = '▶ 播放';
    setYear(parseFloat(slider.value));
  });

  playBtn.addEventListener('click', function () {
    playing = !playing;
    playBtn.textContent = playing ? '⏸ 暂停' : '▶ 播放';
    if (playing) {
      if (year >= MAX_YEAR) setYear(MIN_YEAR);
      lastTs = 0;
      requestAnimationFrame(tick);
    }
  });

  speedSel.addEventListener('change', function () { speed = parseFloat(speedSel.value); });

  resetBtn.addEventListener('click', function () {
    zoom = 1; panX = 0; panY = 0;
    selected = null; infoEl.hidden = true;
    draw();
  });

  var lastTs = 0;
  function tick(ts) {
    if (!playing) return;
    if (!lastTs) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    setYear(year + dt * speed);
    if (year >= MAX_YEAR) {
      playing = false;
      playBtn.textContent = '▶ 播放';
      return;
    }
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', resize);
  resize();
  setYear(MAX_YEAR);
})();
