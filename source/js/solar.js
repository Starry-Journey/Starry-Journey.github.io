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

  var INC = { mercury: 7.0, venus: 3.39, earth: 0, mars: 1.85, jupiter: 1.30, saturn: 2.49, uranus: 0.77, neptune: 1.77, pluto: 17.2 };
  PLANETS.forEach(function (p) { p.inc = INC[p.id] || 0; });

  // 标志性任务/探测器（简化轨迹：深空按平均日心距，行星任务附着在行星旁）
  var MISSIONS = [
    { id: 'sputnik', zh: '斯普特尼克 1 号', en: 'Sputnik 1', year: 1957, color: '#ffd479', kind: 'planet', planet: 'earth', note: '人类第一颗人造卫星，开启太空时代。' },
    { id: 'apollo11', zh: '阿波罗 11 号', en: 'Apollo 11', year: 1969, color: '#ffd479', kind: 'planet', planet: 'earth', note: '首次载人登月，阿姆斯特朗留下“一小步”。' },
    { id: 'voyager1', zh: '旅行者 1 号', en: 'Voyager 1', year: 1977, color: '#ffe08a', kind: 'deep', angle: 255, dist: function (y) { return Math.max(0, (y - 1977) * 3.35); }, note: '飞得最远的人造物体，已进入星际空间。' },
    { id: 'voyager2', zh: '旅行者 2 号', en: 'Voyager 2', year: 1977, color: '#ffe08a', kind: 'deep', angle: 300, dist: function (y) { return Math.max(0, (y - 1977) * 2.75); }, note: '唯一造访过天王星和海王星的探测器。' },
    { id: 'hubble', zh: '哈勃空间望远镜', en: 'Hubble', year: 1990, color: '#9fc0ff', kind: 'planet', planet: 'earth', note: '绕地运行 30 余年，彻底改变了现代天文学。' },
    { id: 'iss', zh: '国际空间站', en: 'ISS', year: 1998, color: '#9fc0ff', kind: 'planet', planet: 'earth', note: '人类在近地轨道上的长期住所。' },
    { id: 'cassini', zh: '卡西尼号', en: 'Cassini', year: 1997, color: '#e6d3a3', kind: 'planet', planet: 'saturn', note: '环绕土星 13 年，最后主动坠入土星大气。' },
    { id: 'juno', zh: '朱诺号', en: 'Juno', year: 2011, color: '#d9b48f', kind: 'planet', planet: 'jupiter', note: '正在揭示木星内部结构与极区风暴。' },
    { id: 'curiosity', zh: '好奇号', en: 'Curiosity', year: 2011, color: '#e07b5a', kind: 'planet', planet: 'mars', note: '在盖尔撞击坑寻找火星曾经宜居的证据。' },
    { id: 'newhorizons', zh: '新视野号', en: 'New Horizons', year: 2006, color: '#c9b8a3', kind: 'deep', angle: 305, dist: function (y) { return Math.max(0, (y - 2006) * 4.1); }, note: '2015 年飞掠冥王星，人类第一次看清它。' },
    { id: 'jwst', zh: '韦布空间望远镜', en: 'JWST', year: 2021, color: '#ffd479', kind: 'l2', note: '停在日地 L2 点，回望宇宙最早的星光。' },
    { id: 'parker', zh: '帕克太阳探测器', en: 'Parker Solar Probe', year: 2018, color: '#ffb066', kind: 'sun', note: '人类造得最快的物体，近日点仅约 0.05 AU。' }
  ];

  var EVENTS = [
    { year: 1957, label: '斯普特尼克' },
    { year: 1969, label: '阿波罗 11' },
    { year: 1977, label: '旅行者' },
    { year: 1990, label: '哈勃' },
    { year: 2015, label: '冥王星飞掠' },
    { year: 2021, label: '韦布' }
  ];

  var showMissions = true;
  var anim = null;

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

    if (showMissions) drawMissions(tYears);
    drawInset(tYears);
  }

  function missionScreen(m, tYears) {
    var yearNow = 2000 + tYears;
    if (m.kind === 'planet') {
      var p = PLANETS.filter(function (x) { return x.id === m.planet; })[0];
      var q = planetScreen(p, tYears);
      return { x: q.x + 10, y: q.y - 9 };
    }
    if (m.kind === 'deep') {
      var d = m.dist(yearNow);
      if (d <= 0) return null;
      var R = Math.pow(d, 0.45);
      return screen(R * Math.cos(m.angle * DEG), R * Math.sin(m.angle * DEG));
    }
    if (m.kind === 'l2') {
      var e = planetScreen(PLANETS[2], tYears);
      var sun = screen(0, 0);
      var dx = e.x - sun.x, dy = e.y - sun.y;
      var len = Math.hypot(dx, dy) || 1;
      return { x: e.x + dx / len * 7, y: e.y + dy / len * 7 };
    }
    if (m.kind === 'sun') {
      var rr = Math.pow(0.32, 0.6);
      var a = (yearNow - 2018) * 55 * DEG;
      return screen(rr * Math.cos(a), rr * Math.sin(a));
    }
    return null;
  }

  function drawMissions(tYears) {
    MISSIONS.forEach(function (m) {
      var q = missionScreen(m, tYears);
      if (!q) return;
      var active = selected === m.id;
      ctx.save();
      ctx.translate(q.x, q.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = active ? '#fff' : m.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 0.6;
      ctx.fillRect(-2.6, -2.6, 5.2, 5.2);
      ctx.strokeRect(-2.6, -2.6, 5.2, 5.2);
      ctx.restore();
      if (m.kind === 'deep' || active) {
        ctx.font = '9px system-ui, "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = active ? '#ffe9a8' : 'rgba(255,215,120,0.75)';
        ctx.fillText(m.zh, q.x + 6, q.y + 3);
      }
      if (active) {
        ctx.beginPath();
        ctx.arc(q.x, q.y, 8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,224,138,0.9)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    });
  }

  function showMission(m, tYears) {
    var yearNow = 2000 + tYears;
    var rows = '<dt>发射</dt><dd>' + m.year + ' 年</dd>';
    if (m.kind === 'deep') {
      rows += '<dt>日心距</dt><dd>' + m.dist(yearNow).toFixed(1) + ' AU</dd>';
    } else if (m.kind === 'l2') {
      rows += '<dt>位置</dt><dd>日地 L2 点（约 1.01 AU）</dd>';
    } else if (m.kind === 'sun') {
      rows += '<dt>轨道</dt><dd>近日点约 0.05 AU</dd>';
    } else {
      var p = PLANETS.filter(function (x) { return x.id === m.planet; })[0];
      rows += '<dt>所在天体</dt><dd>' + p.zh + '</dd>';
    }
    infoEl.hidden = false;
    infoEl.innerHTML =
      '<button class="solar-info-close" type="button" aria-label="关闭">×</button>' +
      '<h3>' + m.zh + ' <small>' + m.en + '</small></h3>' +
      '<dl>' + rows + '</dl>' +
      '<p>' + m.note + '</p>';
    infoEl.querySelector('.solar-info-close').addEventListener('click', function () {
      infoEl.hidden = true;
      selected = null;
      draw();
    });
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

    if (showMissions) {
      var bestM = null, bestMD = 12;
      MISSIONS.forEach(function (m) {
        var q = missionScreen(m, tYears);
        if (!q) return;
        var d = Math.hypot(q.x - px, q.y - py);
        if (d < bestMD) { bestMD = d; bestM = m; }
      });
      if (bestM) {
        selected = bestM.id;
        showMission(bestM, tYears);
        draw();
        return;
      }
    }

    var best = null, bestD = 18;
    PLANETS.forEach(function (p) {
      var q = planetScreen(p, tYears);
      var d = Math.hypot(q.x - px, q.y - py);
      if (d < bestD) { bestD = d; best = p; }
    });
    if (best) {
      selected = best.id;
      showInfo(best);
      zoomToPlanet(best, tYears);
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

  function zoomToPlanet(p, tYears) {
    var pos = positionAt(p, tYears);
    var targetZoom = Math.max(zoom, 4.2);
    var tx = -pos.x * baseScale * targetZoom;
    var ty = -pos.y * baseScale * targetZoom;
    anim = { start: performance.now(), dur: 650, z0: zoom, x0: panX, y0: panY, z1: targetZoom, x1: tx, y1: ty };
    requestAnimationFrame(stepAnim);
  }

  function stepAnim(ts) {
    if (!anim) return;
    var k = clamp((ts - anim.start) / anim.dur, 0, 1);
    var e = 1 - Math.pow(1 - k, 3);
    zoom = anim.z0 + (anim.z1 - anim.z0) * e;
    panX = anim.x0 + (anim.x1 - anim.x0) * e;
    panY = anim.y0 + (anim.y1 - anim.y0) * e;
    draw();
    if (k < 1) requestAnimationFrame(stepAnim); else anim = null;
  }

  function buildEvents() {
    var box = document.getElementById('solar-events');
    if (!box) return;
    EVENTS.forEach(function (ev) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = ev.year + ' ' + ev.label;
      btn.addEventListener('click', function () {
        playing = false;
        playBtn.textContent = '▶ 播放';
        setYear(ev.year);
        Array.prototype.forEach.call(box.children, function (c) { c.classList.remove('active'); });
        btn.classList.add('active');
      });
      box.appendChild(btn);
    });
  }

  var missionsToggle = document.getElementById('solar-missions');
  if (missionsToggle) {
    missionsToggle.addEventListener('change', function () {
      showMissions = missionsToggle.checked;
      draw();
    });
  }

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

  buildEvents();
  window.addEventListener('resize', resize);
  resize();
  setYear(MAX_YEAR);

  // ================= 3D 视角（Three.js 懒加载） =================
  var appEl = document.getElementById('solar-app');
  var canvas3d = document.getElementById('solar-canvas3d');
  var labelsBox = document.getElementById('solar-labels');
  var modeBtn = document.getElementById('solar-mode');
  var mode3d = false;
  var threePromise = null;
  var T3 = null;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var el = document.createElement('script');
      el.src = src;
      el.onload = resolve;
      el.onerror = reject;
      document.head.appendChild(el);
    });
  }

  function loadThree() {
    if (window.THREE && window.THREE.OrbitControls) return Promise.resolve();
    if (threePromise) return threePromise;
    threePromise = loadScript('https://gcore.jsdelivr.net/npm/three@0.128.0/build/three.min.js')
      .then(function () {
        return loadScript('https://gcore.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js');
      });
    return threePromise;
  }

  var RADIUS = { mercury: 0.16, venus: 0.27, earth: 0.29, mars: 0.20, jupiter: 0.78, saturn: 0.64, uranus: 0.44, neptune: 0.43, pluto: 0.15 };

  function pos3D(p, tYears) {
    var st = orbitalState(p, tYears);
    var R = Math.pow(st.r, 0.6);
    var x = R * Math.cos(st.ang);
    var y = R * Math.sin(st.ang);
    var inc = (p.inc || 0) * DEG;
    return new THREE.Vector3(x, y * Math.cos(inc), y * Math.sin(inc));
  }

  function makeTexture(p) {
    var c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    var g = c.getContext('2d');
    g.fillStyle = p.color;
    g.fillRect(0, 0, 512, 256);

    if (p.id === 'earth') {
      g.fillStyle = '#1c5fa8'; g.fillRect(0, 0, 512, 256);
      for (var i = 0; i < 26; i++) {
        g.fillStyle = 'rgba(80,150,90,' + (0.35 + Math.random() * 0.35) + ')';
        g.beginPath();
        g.ellipse(Math.random() * 512, 40 + Math.random() * 176, 10 + Math.random() * 26, 6 + Math.random() * 16, Math.random() * 3, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = 'rgba(240,248,255,0.9)';
      g.fillRect(0, 0, 512, 18);
      g.fillRect(0, 238, 512, 18);
      for (var k = 0; k < 30; k++) {
        g.fillStyle = 'rgba(255,255,255,' + (0.12 + Math.random() * 0.2) + ')';
        g.beginPath();
        g.ellipse(Math.random() * 512, Math.random() * 256, 14 + Math.random() * 30, 4 + Math.random() * 8, 0, 0, Math.PI * 2);
        g.fill();
      }
    } else {
      var bands = ['jupiter', 'saturn', 'uranus', 'neptune'].indexOf(p.id) >= 0;
      if (bands) {
        for (var b = 0; b < 18; b++) {
          var y = Math.random() * 256;
          g.fillStyle = 'rgba(255,255,255,' + (0.03 + Math.random() * 0.07) + ')';
          g.fillRect(0, y, 512, 3 + Math.random() * 10);
          g.fillStyle = 'rgba(0,0,0,' + (0.02 + Math.random() * 0.05) + ')';
          g.fillRect(0, y + 6, 512, 2 + Math.random() * 6);
        }
      }
      for (var j = 0; j < 70; j++) {
        g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
        g.beginPath();
        g.arc(Math.random() * 512, Math.random() * 256, 1 + Math.random() * 7, 0, Math.PI * 2);
        g.fill();
      }
      if (p.id === 'jupiter') {
        g.fillStyle = 'rgba(200,90,60,0.55)';
        g.beginPath();
        g.ellipse(360, 160, 26, 13, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
  }

  function glowTexture() {
    var c = document.createElement('canvas');
    c.width = c.height = 128;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(64, 64, 2, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,240,190,1)');
    grad.addColorStop(0.25, 'rgba(255,190,90,0.55)');
    grad.addColorStop(1, 'rgba(255,150,50,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  function orbit3DPoints(p) {
    var pts = [];
    for (var i = 0; i <= 160; i++) {
      var E = i / 160 * Math.PI * 2;
      var r = p.a * (1 - p.e * Math.cos(E));
      var nu = 2 * Math.atan2(Math.sqrt(1 + p.e) * Math.sin(E / 2), Math.sqrt(1 - p.e) * Math.cos(E / 2));
      var R = Math.pow(r, 0.6);
      var ang = nu + p.peri * DEG;
      var inc = p.inc * DEG;
      pts.push(new THREE.Vector3(R * Math.cos(ang), R * Math.sin(ang) * Math.cos(inc), R * Math.sin(ang) * Math.sin(inc)));
    }
    return pts;
  }

  function mission3DPos(m, tYears) {
    var yearNow = 2000 + tYears;
    if (m.kind === 'planet') {
      var p = PLANETS.filter(function (x) { return x.id === m.planet; })[0];
      var q = pos3D(p, tYears);
      return q.clone().add(new THREE.Vector3(0.12, 0.12, 0.12));
    }
    if (m.kind === 'deep') {
      var d = m.dist(yearNow);
      if (d <= 0) return null;
      var R = Math.pow(d, 0.45);
      return new THREE.Vector3(R * Math.cos(m.angle * DEG), 0, R * Math.sin(m.angle * DEG));
    }
    if (m.kind === 'l2') {
      var e = pos3D(PLANETS[2], tYears);
      return e.multiplyScalar(1.01);
    }
    if (m.kind === 'sun') {
      var rr = Math.pow(0.32, 0.6);
      var a = (yearNow - 2018) * 55 * DEG;
      return new THREE.Vector3(rr * Math.cos(a), 0, rr * Math.sin(a));
    }
    return null;
  }

  function init3D() {
    var renderer = new THREE.WebGLRenderer({ canvas: canvas3d, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 600);
    camera.position.set(0, 6.2, 28);
    var controls = new THREE.OrbitControls(camera, canvas3d);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 3;
    controls.maxDistance = 90;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.18;

    scene.add(new THREE.AmbientLight(0xffffff, 0.32));
    scene.add(new THREE.HemisphereLight(0x9db4ff, 0x101426, 0.38));
    var sunLight = new THREE.PointLight(0xfff2d0, 1.35, 0, 0);
    scene.add(sunLight);

    var starGeo = new THREE.BufferGeometry();
    var arr = [];
    for (var i = 0; i < 1600; i++) {
      var rr = 120 + Math.random() * 120;
      var th = Math.random() * Math.PI * 2;
      var ph = Math.acos(2 * Math.random() - 1);
      arr.push(rr * Math.sin(ph) * Math.cos(th), rr * Math.cos(ph), rr * Math.sin(ph) * Math.sin(th));
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xcfd8ff, size: 0.55, transparent: true, opacity: 0.85 })));

    var sun = new THREE.Mesh(new THREE.SphereGeometry(0.9, 32, 24), new THREE.MeshBasicMaterial({ color: 0xffe08a }));
    scene.add(sun);
    var glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffbb55, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.set(4.6, 4.6, 1);
    scene.add(glow);

    var bodies = {};
    var pickables = [];
    var labels = [];
    var missionMeshes = [];

    PLANETS.forEach(function (p) {
      var mesh = new THREE.Mesh(
        new THREE.SphereGeometry(RADIUS[p.id], 32, 24),
        new THREE.MeshPhongMaterial({
          map: makeTexture(p),
          shininess: 10,
          specular: 0x333333,
          emissive: new THREE.Color(p.color).multiplyScalar(0.07)
        })
      );
      scene.add(mesh);
      mesh.userData = { type: 'planet', id: p.id };
      pickables.push(mesh);

      var line = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(orbit3DPoints(p)),
        new THREE.LineBasicMaterial({ color: new THREE.Color(p.color), transparent: true, opacity: 0.34 })
      );
      scene.add(line);

      if (p.id === 'saturn') {
        var ring = new THREE.Mesh(
          new THREE.RingGeometry(RADIUS[p.id] * 1.35, RADIUS[p.id] * 2.3, 72),
          new THREE.MeshBasicMaterial({ color: 0xe6d3a3, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
        );
        ring.rotation.x = Math.PI / 2;
        mesh.add(ring);
      }

      var label = document.createElement('div');
      label.className = 'solar-label';
      label.textContent = p.zh;
      labelsBox.appendChild(label);
      labels.push({ el: label, obj: mesh, kind: 'planet', id: p.id });

      bodies[p.id] = mesh;
    });

    MISSIONS.forEach(function (m) {
      var mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xffd479 })
      );
      mesh.userData = { type: 'mission', id: m.id };
      scene.add(mesh);
      pickables.push(mesh);
      missionMeshes.push({ mesh: mesh, mission: m });
      if (m.kind === 'deep') {
        var label = document.createElement('div');
        label.className = 'solar-label mission';
        label.textContent = m.zh;
        labelsBox.appendChild(label);
        labels.push({ el: label, obj: mesh, kind: 'mission', id: m.id });
      }
    });

    T3 = { renderer: renderer, scene: scene, camera: camera, controls: controls, bodies: bodies, labels: labels, pickables: pickables, missionMeshes: missionMeshes, running: true };
    resize3D();
    bind3DClick();
    requestAnimationFrame(render3D);
  }

  function resize3D() {
    if (!T3) return;
    var rect = stage.getBoundingClientRect();
    T3.renderer.setSize(rect.width, rect.height, false);
    T3.camera.aspect = rect.width / Math.max(1, rect.height);
    T3.camera.updateProjectionMatrix();
  }

  function render3D() {
    if (!T3) return;
    if (!mode3d) { T3.running = false; return; }
    T3.running = true;
    T3.controls.update();
    var tYears = year - 2000;
    PLANETS.forEach(function (p) {
      T3.bodies[p.id].position.copy(pos3D(p, tYears));
    });
    T3.missionMeshes.forEach(function (mm) {
      var pos = mission3DPos(mm.mission, tYears);
      if (pos) { mm.mesh.position.copy(pos); mm.mesh.visible = true; }
      else { mm.mesh.visible = false; }
    });
    update3DLabels();
    T3.renderer.render(T3.scene, T3.camera);
    requestAnimationFrame(render3D);
  }

  function update3DLabels() {
    var rect = stage.getBoundingClientRect();
    var placed = [];
    T3.labels.forEach(function (l) {
      var v = new THREE.Vector3();
      l.obj.getWorldPosition(v);
      v.project(T3.camera);
      var visible = v.z < 1;
      l.el.style.display = visible ? 'block' : 'none';
      if (!visible) return;
      if (l.kind === 'planet' && ['mercury', 'venus', 'earth', 'mars'].indexOf(l.id) >= 0 && selected !== l.id) {
        var camDist = T3.camera.position.length();
        if (camDist > 20) { l.el.style.display = 'none'; return; }
      }
      var x = (v.x * 0.5 + 0.5) * rect.width;
      var y = (-v.y * 0.5 + 0.5) * rect.height - 12;
      var w = Math.max(28, l.el.textContent.length * 11);
      var offsets = [0, -13, 13, -26];
      for (var i = 0; i < offsets.length; i++) {
        var box = { x: x - w / 2, y: y + offsets[i] - 9, w: w, h: 12 };
        var clash = placed.some(function (b) {
          return box.x < b.x + b.w && box.x + box.w > b.x && box.y < b.y + b.h && box.y + box.h > b.y;
        });
        if (!clash || l.id === selected) { y += offsets[i]; break; }
      }
      placed.push({ x: x - w / 2, y: y - 9, w: w, h: 12 });
      l.el.style.left = x + 'px';
      l.el.style.top = y + 'px';
      l.el.classList.toggle('selected', selected === l.id);
    });
  }

  function bind3DClick() {
    var down = null;
    canvas3d.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY }; });
    canvas3d.addEventListener('pointerup', function (e) {
      if (!down) return;
      var moved = Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) > 6;
      down = null;
      if (moved || !T3) return;
      var rect = canvas3d.getBoundingClientRect();
      var mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      var ray = new THREE.Raycaster();
      ray.setFromCamera(mouse, T3.camera);
      var hits = ray.intersectObjects(T3.pickables, false);
      if (!hits.length) return;
      var obj = hits[0].object;
      var tYears = year - 2000;
      if (obj.userData.type === 'planet') {
        selected = obj.userData.id;
        var p = PLANETS.filter(function (x) { return x.id === selected; })[0];
        showInfo(p);
      } else {
        selected = obj.userData.id;
        var m = MISSIONS.filter(function (x) { return x.id === selected; })[0];
        showMission(m, tYears);
      }
    });
  }

  function enter3D() {
    mode3d = true;
    appEl.classList.add('mode-3d');
    modeBtn.textContent = '2D 视角';
    var badge = document.querySelector('.solar-badge span');
    if (badge) badge.textContent = '年 · 三维视角';
    resize3D();
    if (T3) { T3.running = true; requestAnimationFrame(render3D); }
  }

  function exit3D() {
    mode3d = false;
    appEl.classList.remove('mode-3d');
    modeBtn.textContent = '3D 视角';
    var badge2 = document.querySelector('.solar-badge span');
    if (badge2) badge2.textContent = '年 · 二维俯视';
    draw();
  }

  if (modeBtn) {
    modeBtn.addEventListener('click', function () {
      if (mode3d) { exit3D(); return; }
      modeBtn.disabled = true;
      modeBtn.textContent = '加载 3D…';
      loadThree().then(function () {
        if (!T3) init3D();
        enter3D();
        modeBtn.disabled = false;
      }).catch(function () {
        modeBtn.textContent = '3D 加载失败';
        modeBtn.disabled = false;
      });
    });
  }

  window.addEventListener('resize', function () { if (mode3d) resize3D(); });
})();
