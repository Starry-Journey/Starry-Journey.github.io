/* 星空主题：默认深色 + 星野画布（含偶发流星） */
(function () {
  'use strict';

  // 首次访问默认深色；用户手动切换后尊重其选择（Stellar 存于 Stellar.theme）
  try {
    if (!localStorage.getItem('Stellar.theme')) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch (e) {}

  if (document.getElementById('starfield-root')) return;

  var root = document.createElement('div');
  root.id = 'starfield-root';
  var canvas = document.createElement('canvas');
  canvas.id = 'starfield';
  root.appendChild(canvas);
  document.body.appendChild(root);

  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var stars = [];
  var meteors = [];
  var w = 0, h = 0;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var lastMeteor = 0;

  function resize() {
    w = root.clientWidth;
    h = root.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = [];
    var count = Math.max(60, Math.floor((w * h) / 8000));
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.25 + 0.25,
        p: Math.random() * Math.PI * 2,
        s: 0.5 + Math.random() * 1.2,
        hue: Math.random() < 0.18 ? 210 : (Math.random() < 0.5 ? 45 : 0) // 少量蓝/暖色星
      });
    }
    if (reduce) drawStatic();
  }

  function starColor(st, a) {
    if (st.hue === 210) return 'rgba(170, 200, 255, ' + a + ')';
    if (st.hue === 45) return 'rgba(255, 235, 190, ' + a + ')';
    return 'rgba(235, 240, 255, ' + a + ')';
  }

  function drawStatic() {
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fillStyle = starColor(st, 0.75);
      ctx.fill();
    }
  }

  function frame(t) {
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      var a = 0.30 + 0.60 * Math.abs(Math.sin(t * 0.0006 * st.s + st.p));
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fillStyle = starColor(st, a.toFixed(3));
      ctx.fill();
    }

    // 流星：平均 6~14 秒一颗
    if (!lastMeteor) lastMeteor = t;
    if (t - lastMeteor > 6000 + Math.random() * 8000) {
      lastMeteor = t;
      meteors.push({
        x: Math.random() * w * 0.8 + w * 0.1,
        y: Math.random() * h * 0.35,
        vx: 4.5 + Math.random() * 2.5,
        vy: 1.8 + Math.random() * 1.2,
        life: 1
      });
    }
    for (var m = meteors.length - 1; m >= 0; m--) {
      var mo = meteors[m];
      mo.x += mo.vx;
      mo.y += mo.vy;
      mo.life -= 0.012;
      if (mo.life <= 0) { meteors.splice(m, 1); continue; }
      var grad = ctx.createLinearGradient(mo.x, mo.y, mo.x - mo.vx * 12, mo.y - mo.vy * 12);
      grad.addColorStop(0, 'rgba(255,255,255,' + (mo.life * 0.9).toFixed(3) + ')');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(mo.x, mo.y);
      ctx.lineTo(mo.x - mo.vx * 12, mo.y - mo.vy * 12);
      ctx.stroke();
    }
    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });
  if (!reduce) requestAnimationFrame(frame);
})();
