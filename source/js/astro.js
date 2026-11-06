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
  var ASPECT_COLOR = {
    opposition: 'rgba(122,162,255,0.55)',
    trine: 'rgba(110,231,168,0.55)',
    square: 'rgba(255,138,138,0.55)',
    sextile: 'rgba(192,132,252,0.5)',
    conjunction: 'rgba(255,212,121,0.4)',
  };
  var CITIES = [
    { n: '北京', lat: 39.9042, lon: 116.4074, tz: 'Asia/Shanghai' },
    { n: '上海', lat: 31.2304, lon: 121.4737, tz: 'Asia/Shanghai' },
    { n: '广州', lat: 23.1291, lon: 113.2644, tz: 'Asia/Shanghai' },
    { n: '深圳', lat: 22.5431, lon: 114.0579, tz: 'Asia/Shanghai' },
    { n: '成都', lat: 30.5728, lon: 104.0668, tz: 'Asia/Shanghai' },
    { n: '杭州', lat: 30.2741, lon: 120.1551, tz: 'Asia/Shanghai' },
    { n: '南京', lat: 32.0603, lon: 118.7969, tz: 'Asia/Shanghai' },
    { n: '武汉', lat: 30.5928, lon: 114.3055, tz: 'Asia/Shanghai' },
    { n: '西安', lat: 34.3416, lon: 108.9398, tz: 'Asia/Shanghai' },
    { n: '重庆', lat: 29.563, lon: 106.5516, tz: 'Asia/Shanghai' },
    { n: '天津', lat: 39.3434, lon: 117.3616, tz: 'Asia/Shanghai' },
    { n: '苏州', lat: 31.2989, lon: 120.5853, tz: 'Asia/Shanghai' },
    { n: '长沙', lat: 28.2282, lon: 112.9388, tz: 'Asia/Shanghai' },
    { n: '青岛', lat: 36.0671, lon: 120.3826, tz: 'Asia/Shanghai' },
    { n: '厦门', lat: 24.4798, lon: 118.0894, tz: 'Asia/Shanghai' },
    { n: '香港', lat: 22.3193, lon: 114.1694, tz: 'Asia/Hong_Kong' },
    { n: '台北', lat: 25.033, lon: 121.5654, tz: 'Asia/Shanghai' },
    { n: '东京', lat: 35.6762, lon: 139.6503, tz: 'Asia/Tokyo' },
    { n: '首尔', lat: 37.5665, lon: 126.978, tz: 'Asia/Seoul' },
    { n: '新加坡', lat: 1.3521, lon: 103.8198, tz: 'Asia/Singapore' },
    { n: '曼谷', lat: 13.7563, lon: 100.5018, tz: 'Asia/Bangkok' },
    { n: '悉尼', lat: -33.8688, lon: 151.2093, tz: 'Australia/Sydney' },
    { n: '墨尔本', lat: -37.8136, lon: 144.9631, tz: 'Australia/Melbourne' },
    { n: '伦敦', lat: 51.5074, lon: -0.1278, tz: 'Europe/London' },
    { n: '巴黎', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris' },
    { n: '柏林', lat: 52.52, lon: 13.405, tz: 'Europe/Berlin' },
    { n: '罗马', lat: 41.9028, lon: 12.4964, tz: 'Europe/Rome' },
    { n: '马德里', lat: 40.4168, lon: -3.7038, tz: 'Europe/Madrid' },
    { n: '莫斯科', lat: 55.7558, lon: 37.6173, tz: 'Europe/Moscow' },
    { n: '纽约', lat: 40.7128, lon: -74.006, tz: 'America/New_York' },
    { n: '洛杉矶', lat: 34.0522, lon: -118.2437, tz: 'America/Los_Angeles' },
    { n: '旧金山', lat: 37.7749, lon: -122.4194, tz: 'America/Los_Angeles' },
    { n: '西雅图', lat: 47.6062, lon: -122.3321, tz: 'America/Los_Angeles' },
    { n: '芝加哥', lat: 41.8781, lon: -87.6298, tz: 'America/Chicago' },
    { n: '多伦多', lat: 43.6532, lon: -79.3832, tz: 'America/Toronto' },
    { n: '温哥华', lat: 49.2827, lon: -123.1207, tz: 'America/Vancouver' },
    { n: '墨西哥城', lat: 19.4326, lon: -99.1332, tz: 'America/Mexico_City' },
    { n: '圣保罗', lat: -23.5505, lon: -46.6333, tz: 'America/Sao_Paulo' },
    { n: '开罗', lat: 30.0444, lon: 31.2357, tz: 'Africa/Cairo' },
    { n: '迪拜', lat: 25.2048, lon: 55.2708, tz: 'Asia/Dubai' },
    { n: '孟买', lat: 19.076, lon: 72.8777, tz: 'Asia/Kolkata' },
    { n: '奥克兰', lat: -36.8485, lon: 174.7633, tz: 'Pacific/Auckland' },
    { n: '檀香山', lat: 21.3069, lon: -157.8583, tz: 'Pacific/Honolulu' },
  ];

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
  var cityInput = document.getElementById('a-city');
  var cityList = document.getElementById('astro-cities');
  var savedList = document.getElementById('astro-saved-list');

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

    //  aspect lines
    var lonByName = {};
    (chart.planets || []).forEach(function (p) {
      lonByName[p.name] = absLon(p);
    });
    (chart.aspects || []).forEach(function (a) {
      if (a.type === 'conjunction') return;
      var l1 = lonByName[a.a];
      var l2 = lonByName[a.b];
      if (l1 == null || l2 == null) return;
      var p1 = pos(l1, r * 0.5);
      var p2 = pos(l2, r * 0.5);
      g.strokeStyle = ASPECT_COLOR[a.type] || 'rgba(143,124,255,0.35)';
      g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(p1[0], p1[1]);
      g.lineTo(p2[0], p2[1]);
      g.stroke();
    });

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

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function loadSaved() {
    if (!savedList) return;
    api('/v1/charts')
      .then(function (rows) {
        if (!rows.length) {
          savedList.innerHTML = '<div class="astro-saved-empty">还没有保存的星盘</div>';
          return;
        }
        savedList.innerHTML = rows
          .map(function (r) {
            return (
              '<div class="astro-saved-item" data-id="' +
              r.id +
              '"><button class="load" type="button">' +
              esc(r.label) +
              '</button><span class="date">' +
              fmtDate(r.created_at) +
              '</span><button class="del" type="button" title="删除">×</button></div>'
            );
          })
          .join('');
      })
      .catch(function () {
        savedList.innerHTML = '<div class="astro-saved-empty">列表加载失败</div>';
      });
  }

  if (savedList) {
    savedList.addEventListener('click', function (e) {
      var item = e.target.closest('.astro-saved-item');
      if (!item) return;
      var id = item.getAttribute('data-id');
      if (e.target.classList.contains('del')) {
        if (!window.confirm('删除这张星盘？')) return;
        api('/v1/charts/' + id, { method: 'DELETE' }).then(loadSaved);
        return;
      }
      api('/v1/charts/' + id).then(function (chart) {
        currentId = chart.id;
        render(chart);
        resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  if (cityList) {
    cityList.innerHTML = CITIES.map(function (c) {
      return '<option value="' + c.n + '">';
    }).join('');
  }

  if (cityInput) {
    cityInput.addEventListener('input', function () {
      var city = CITIES.filter(function (c) {
        return c.n === cityInput.value;
      })[0];
      if (!city) return;
      document.getElementById('a-lat').value = city.lat;
      document.getElementById('a-lon').value = city.lon;
      var tz = document.getElementById('a-tz');
      var opt = Array.prototype.filter.call(tz.options, function (o) {
        return o.value === city.tz;
      })[0];
      if (opt) tz.value = city.tz;
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    submitBtn.disabled = true;
    setStatus('计算中…');

    var body = {
      label: (cityInput && cityInput.value.trim()) || '未命名星盘',
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
        loadSaved();
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

  loadSaved();

  window.addEventListener('resize', function () {
    if (lastChart && !resultEl.hidden) drawWheel(lastChart);
  });
})();
