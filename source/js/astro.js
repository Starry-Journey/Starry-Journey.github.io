/* 星盘页面：调用 /v1/charts，绘制星盘轮与列表 */
(function () {
  'use strict';

  var API = window.BLOG_API_BASE || 'https://starryjourney.duckdns.org:8443';
  var TOKEN_KEY = 'bc_api_token';
  var SIGNS = [
    'Aries',
    'Taurus',
    'Gemini',
    'Cancer',
    'Leo',
    'Virgo',
    'Libra',
    'Scorpio',
    'Sagittarius',
    'Capricorn',
    'Aquarius',
    'Pisces',
  ];
  var SIGN_CN = {
    Aries: '白羊',
    Taurus: '金牛',
    Gemini: '双子',
    Cancer: '巨蟹',
    Leo: '狮子',
    Virgo: '处女',
    Libra: '天秤',
    Scorpio: '天蝎',
    Sagittarius: '射手',
    Capricorn: '摩羯',
    Aquarius: '水瓶',
    Pisces: '双鱼',
  };
  var PLANET_CN = {
    Sun: '太阳',
    Moon: '月亮',
    Mercury: '水星',
    Venus: '金星',
    Mars: '火星',
    Jupiter: '木星',
    Saturn: '土星',
    Uranus: '天王星',
    Neptune: '海王星',
    Pluto: '冥王星',
    TrueNode: '北交点',
  };
  var ASPECT_CN = {
    conjunction: '合相',
    opposition: '对分',
    trine: '三分',
    square: '四分',
    sextile: '六分',
  };

  var form = document.getElementById('astro-form');
  var statusEl = document.getElementById('a-status');
  var resultEl = document.getElementById('astro-result');
  var submitBtn = document.getElementById('a-submit');
  var deleteBtn = document.getElementById('astro-delete');
  var canvas = document.getElementById('astro-wheel');
  var planetsEl = document.getElementById('astro-planets');
  var housesEl = document.getElementById('astro-houses');
  var aspectsEl = document.getElementById('astro-aspects');
  var captionEl = document.getElementById('astro-caption');

  if (!form || !canvas) return;

  var token = localStorage.getItem(TOKEN_KEY) || '';
  var currentId = null;
  var lastChart = null;

  function setStatus(msg) {
    statusEl.textContent = msg || '';
  }

  function ensureToken(force) {
    if (token && !force) return Promise.resolve(token);
    return fetch(API + '/v1/auth/device', { method: 'POST' })
      .then(function (r) {
        if (!r.ok) throw new Error('无法获取令牌');
        return r.json();
      })
      .then(function (data) {
        token = data.token;
        localStorage.setItem(TOKEN_KEY, token);
        return token;
      });
  }

  function api(path, options) {
    options = options || {};
    options.headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    var ctl = new AbortController();
    var timer = setTimeout(function () {
      ctl.abort();
    }, 20000);
    options.signal = ctl.signal;
    return ensureToken()
      .then(function (t) {
        options.headers.Authorization = 'Bearer ' + t;
        return fetch(API + path, options);
      })
      .then(function (res) {
        if (res.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          token = '';
          return ensureToken(true).then(function (t) {
            options.headers.Authorization = 'Bearer ' + t;
            return fetch(API + path, options);
          });
        }
        return res;
      })
      .then(function (res) {
        if (res.status === 204) return null;
        return res.json().then(function (body) {
          if (!res.ok) throw new Error(body.detail || '请求失败');
          return body;
        });
      })
      .finally(function () {
        clearTimeout(timer);
      });
  }

  function absLon(pos) {
    var idx = SIGNS.indexOf(pos.sign);
    if (idx < 0) return 0;
    return idx * 30 + (pos.degree || 0);
  }

  function fmt(pos) {
    return (SIGN_CN[pos.sign] || pos.sign) + ' ' + Number(pos.degree || 0).toFixed(1) + '°';
  }

  function drawWheel(chart) {
    var size = Math.max(280, Math.min((canvas.parentElement.clientWidth || 520) - 32, 560));
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';

    var g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, size, size);

    var cx = size / 2;
    var cy = size / 2;
    var R = size / 2 - 14;
    var r = R * 0.72;
    var inner = R * 0.46;
    var asc = absLon(chart.houses[0] || chart.ascendant);
    var DEG = Math.PI / 180;

    function angle(lon) {
      return Math.PI - (lon - asc) * DEG;
    }
    function pos(lon, rad) {
      return [cx + Math.cos(angle(lon)) * rad, cy + Math.sin(angle(lon)) * rad];
    }

    //  zodiac ring
    g.strokeStyle = 'rgba(143,124,255,0.3)';
    g.lineWidth = 1;
    for (var i = 0; i < 12; i += 1) {
      var start = angle(i * 30);
      var end = angle(i * 30 + 30);
      g.beginPath();
      g.arc(cx, cy, R, Math.min(start, end), Math.max(start, end));
      g.arc(cx, cy, r, Math.max(start, end), Math.min(start, end), true);
      g.closePath();
      g.fillStyle = i % 2 === 0 ? 'rgba(143,124,255,0.08)' : 'rgba(143,124,255,0.02)';
      g.fill();
      g.strokeStyle = 'rgba(143,124,255,0.22)';
      g.stroke();

      var mid = pos(i * 30 + 15, (R + r) / 2);
      g.fillStyle = 'rgba(219,227,255,0.75)';
      g.font = '11px ui-monospace, monospace';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(SIGN_CN[SIGNS[i]], mid[0], mid[1]);
    }

    //  house cusps
    g.strokeStyle = 'rgba(143,124,255,0.4)';
    g.setLineDash([3, 4]);
    (chart.houses || []).forEach(function (h) {
      var a = pos(absLon(h), inner);
      var b = pos(absLon(h), R);
      g.beginPath();
      g.moveTo(a[0], a[1]);
      g.lineTo(b[0], b[1]);
      g.stroke();
    });
    g.setLineDash([]);

    //  planets
    var sorted = (chart.planets || []).slice().sort(function (a, b) {
      return absLon(a) - absLon(b);
    });
    sorted.forEach(function (p, idx) {
      var lon = absLon(p);
      var pt = pos(lon, r * 0.58);
      g.fillStyle = '#ffd479';
      g.beginPath();
      g.arc(pt[0], pt[1], 3.2, 0, Math.PI * 2);
      g.fill();

      var label = pos(lon, r * 0.58 + (idx % 2 === 0 ? 14 : -14));
      g.fillStyle = '#eef2ff';
      g.font = '11px ui-monospace, monospace';
      g.textAlign = 'center';
      g.fillText(PLANET_CN[p.name] || p.name, label[0], label[1]);
    });

    //  center label
    g.fillStyle = 'rgba(143,124,255,0.8)';
    g.font = '12px ui-monospace, monospace';
    g.textAlign = 'center';
    g.fillText('ASC', cx, cy - 8);

    captionEl.textContent =
      '上升 ' +
      fmt(chart.houses[0] || chart.ascendant) +
      ' · 天顶 ' +
      fmt(chart.midheaven || { sign: 'Capricorn', degree: 0 });
  }

  function renderList(el, rows) {
    el.innerHTML = rows
      .map(function (r) {
        return '<li><span>' + r[0] + '</span><span class="dim">' + r[1] + '</span></li>';
      })
      .join('');
  }

  function render(chart) {
    lastChart = chart;
    drawWheel(chart);
    renderList(
      planetsEl,
      (chart.planets || []).map(function (p) {
        return [PLANET_CN[p.name] || p.name, fmt(p) + (p.retrograde ? ' ℞' : '')];
      })
    );
    renderList(
      housesEl,
      (chart.houses || []).map(function (h) {
        return [h.house + ' 宫', fmt(h)];
      })
    );
    renderList(
      aspectsEl,
      (chart.aspects || []).map(function (a) {
        return [
          (PLANET_CN[a.a] || a.a) + ' · ' + (PLANET_CN[a.b] || a.b),
          (ASPECT_CN[a.type] || a.type) + ' ' + a.orb + '°',
        ];
      })
    );
    resultEl.hidden = false;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    submitBtn.disabled = true;
    setStatus('计算中…');

    var body = {
      birth_date: document.getElementById('a-date').value,
      birth_time: document.getElementById('a-time').value,
      timezone: document.getElementById('a-tz').value,
      latitude: Number(document.getElementById('a-lat').value),
      longitude: Number(document.getElementById('a-lon').value),
    };

    api('/v1/charts', { method: 'POST', body: JSON.stringify(body) })
      .then(function (chart) {
        currentId = chart.id;
        render(chart);
        setStatus('');
        resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      })
      .catch(function (err) {
        setStatus(err.message || '生成失败');
      })
      .then(function () {
        submitBtn.disabled = false;
      });
  });

  deleteBtn.addEventListener('click', function () {
    if (!currentId) return;
    if (!window.confirm('确定删除这张星盘？')) return;
    api('/v1/charts/' + currentId, { method: 'DELETE' })
      .then(function () {
        currentId = null;
        resultEl.hidden = true;
        setStatus('已删除');
      })
      .catch(function (err) {
        setStatus(err.message || '删除失败');
      });
  });

  window.addEventListener('resize', function () {
    if (lastChart && !resultEl.hidden) drawWheel(lastChart);
  });
})();
