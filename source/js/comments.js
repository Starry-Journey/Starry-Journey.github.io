/* 博客评论区（对接 /v1/comments，设备令牌自动获取） */
(function () {
  'use strict';

  var API = window.BLOG_API_BASE || 'https://starryjourney.duckdns.org:8443';
  var TOKEN_KEY = 'bc_api_token';
  var path = decodeURIComponent(location.pathname);
  if (path === '/') return;
  if (/^\/(archives|categories|tags|search|page\/|news\/?$)/.test(path)) return;
  if (document.querySelector('.blog-comments')) return;

  var host = document.querySelector('.md-text.content');
  if (!host) return;

  // 文章路径 → 稳定房间名
  var hash = 0;
  var key = path.replace(/\/+$/, '');
  for (var i = 0; i < key.length; i++) hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  var room = 'blog-' + (hash >>> 0).toString(16);

  var sec = document.createElement('section');
  sec.className = 'blog-comments';
  sec.innerHTML =
    '<h3>评论 <span class="bc-count">0</span></h3>' +
    '<div class="bc-list"><div class="bc-empty">还没有评论，来聊两句？</div></div>' +
    '<form class="bc-form">' +
    '  <input class="bc-nick" maxlength="40" placeholder="你的昵称" autocomplete="nickname">' +
    '  <textarea class="bc-text" rows="3" maxlength="2000" placeholder="说点什么…（Ctrl+Enter 发送）"></textarea>' +
    '  <div class="bc-actions"><span class="bc-status"></span><button type="submit">发表评论</button></div>' +
    '</form>';
  host.appendChild(sec);

  var listEl = sec.querySelector('.bc-list');
  var countEl = sec.querySelector('.bc-count');
  var form = sec.querySelector('.bc-form');
  var nickEl = sec.querySelector('.bc-nick');
  var textEl = sec.querySelector('.bc-text');
  var statusEl = sec.querySelector('.bc-status');
  var btn = sec.querySelector('button');
  var token = localStorage.getItem(TOKEN_KEY) || '';

  function setStatus(msg) {
    statusEl.textContent = msg || '';
  }

  function ensureToken(force) {
    if (token && !force) return Promise.resolve(token);
    return fetch(API + '/v1/auth/device', { method: 'POST' })
      .then(function (r) {
        if (!r.ok) throw new Error('无法获取评论令牌');
        return r.json();
      })
      .then(function (data) {
        token = data.token;
        localStorage.setItem(TOKEN_KEY, token);
        return token;
      });
  }

  function request(pathname, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    var ctl = new AbortController();
    var timer = setTimeout(function () {
      ctl.abort();
    }, 8000);
    opts.signal = ctl.signal;
    return ensureToken()
      .then(function (t) {
        opts.headers.Authorization = 'Bearer ' + t;
        return fetch(API + pathname, opts);
      })
      .then(function (r) {
        if (r.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          token = '';
          return ensureToken(true).then(function (t) {
            opts.headers.Authorization = 'Bearer ' + t;
            return fetch(API + pathname, opts);
          });
        }
        return r;
      })
      .then(function (r) {
        return r.json().then(function (body) {
          if (!r.ok) throw new Error(body.detail || '请求失败');
          return body;
        });
      })
      .finally(function () {
        clearTimeout(timer);
      });
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtTime(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var p = function (n) {
      return n < 10 ? '0' + n : n;
    };
    return (
      d.getFullYear() +
      '-' +
      p(d.getMonth() + 1) +
      '-' +
      p(d.getDate()) +
      ' ' +
      p(d.getHours()) +
      ':' +
      p(d.getMinutes())
    );
  }

  function render(items) {
    countEl.textContent = items.length;
    if (!items.length) {
      listEl.innerHTML = '<div class="bc-empty">还没有评论，来聊两句？</div>';
      return;
    }
    listEl.innerHTML = items
      .map(function (m) {
        return (
          '<div class="bc-item"><div class="bc-meta"><b>' +
          esc(m.author) +
          '</b><time>' +
          fmtTime(m.created_at) +
          '</time></div><div class="bc-content">' +
          esc(m.content).replace(/\n/g, '<br>') +
          '</div></div>'
        );
      })
      .join('');
  }

  function load() {
    return fetch(API + '/v1/comments?room=' + encodeURIComponent(room) + '&limit=100', {
      signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined,
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        render(
          (data.items || []).slice().sort(function (a, b) {
            return a.id - b.id;
          })
        );
      })
      .catch(function () {
        setStatus('评论加载失败，稍后再试');
      });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var nick = (nickEl.value || '').trim();
    var content = (textEl.value || '').trim();
    if (!nick) {
      setStatus('先填个昵称吧');
      nickEl.focus();
      return;
    }
    if (!content) {
      setStatus('先写点什么吧');
      return;
    }
    btn.disabled = true;
    setStatus('发送中…');
    request('/v1/comments', {
      method: 'POST',
      body: JSON.stringify({ room: room, author: nick, content: content }),
    })
      .then(function () {
        textEl.value = '';
        setStatus('');
        return load();
      })
      .catch(function (err) {
        setStatus(err.message || '发送失败');
      })
      .then(function () {
        btn.disabled = false;
      });
  });

  textEl.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  nickEl.value = localStorage.getItem('bc_nick') || '';
  nickEl.addEventListener('change', function () {
    localStorage.setItem('bc_nick', nickEl.value);
  });

  load();
  setInterval(function () {
    if (document.visibilityState === 'visible') load();
  }, 20000);
})();
