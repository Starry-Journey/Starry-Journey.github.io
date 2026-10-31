/* 博客评论区（基于自建聊天室 API，每篇文章一个房间） */
(function () {
  'use strict';

  var API = window.BLOG_COMMENTS_API || 'https://starryjourney.duckdns.org:8443';
  var path = decodeURIComponent(location.pathname);
  if (path === '/') return;
  if (/^\/(archives|categories|tags|search|page\/|news\/?$)/.test(path)) return;
  if (document.querySelector('.blog-comments')) return;

  var host = document.querySelector('.md-text.content');
  if (!host) return;

  // 服务端不解 URL 编码，房间名用无特殊字符的哈希
  var hash = 0;
  var key = path.replace(/\/+$/, '');
  for (var i = 0; i < key.length; i++) { hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0; }
  var room = 'blog-' + (hash >>> 0).toString(16);
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var fmtTime = function (t) {
    var d = new Date((Number(t) || 0) * 1000);
    if (isNaN(d.getTime()) || d.getFullYear() < 2000) return '';
    var p = function (n) { return n < 10 ? '0' + n : n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  };

  var sec = document.createElement('section');
  sec.className = 'blog-comments';
  sec.innerHTML =
    '<h3>评论 <span class="bc-count">0</span></h3>' +
    '<div class="bc-list"><div class="bc-empty">还没有评论，来聊两句？</div></div>' +
    '<form class="bc-form">' +
    '  <input class="bc-nick" maxlength="24" placeholder="你的昵称（首次评论自动注册）" autocomplete="nickname">' +
    '  <textarea class="bc-text" rows="3" maxlength="1000" placeholder="说点什么…（Ctrl+Enter 发送）"></textarea>' +
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
  var token = localStorage.getItem('bc_token') || '';
  var name = localStorage.getItem('bc_name') || '';
  if (name) nickEl.value = name;

  function setStatus(msg) { statusEl.textContent = msg || ''; }
  function request(url, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    if (token) opts.headers['X-Token'] = token;
    return fetch(API + url, opts).then(function (r) { return r.json(); });
  }
  function render(msgs) {
    countEl.textContent = msgs.length;
    if (!msgs.length) { listEl.innerHTML = '<div class="bc-empty">还没有评论，来聊两句？</div>'; return; }
    listEl.innerHTML = msgs.map(function (m) {
      return '<div class="bc-item"><div class="bc-meta"><b>' + esc(m.sender) + '</b><time>' + fmtTime(m.time) + '</time></div><div class="bc-content">' + esc(m.content).replace(/\n/g, '<br>') + '</div></div>';
    }).join('');
  }
  function load() {
    return request('/api/history?room=' + encodeURIComponent(room) + '&limit=100')
      .then(function (r) { if (r && r.messages) render(r.messages); })
      .catch(function () { setStatus('评论加载失败，稍后再试'); });
  }
  function register() {
    var base = (nickEl.value || '').trim().replace(/[^\w\u4e00-\u9fa5-]/g, '');
    if (base.length < 2) base = '访客' + Math.floor(Math.random() * 9000 + 1000);
    var pass = 'p' + Math.random().toString(36).slice(2, 12);
    var uname = base;
    return request('/api/auth', { method: 'POST', headers: { 'X-Action': 'register' }, body: JSON.stringify({ username: uname, password: pass }) })
      .then(function (r) {
        if (!r.ok) {
          uname = base + Math.floor(Math.random() * 900 + 100);
          return request('/api/auth', { method: 'POST', headers: { 'X-Action': 'register' }, body: JSON.stringify({ username: uname, password: pass }) })
            .then(function (r2) {
              if (!r2.ok) throw new Error(r2.error || '注册失败');
              token = r2.token; name = uname;
            });
        }
        token = r.token; name = uname;
      })
      .then(function () {
        localStorage.setItem('bc_token', token);
        localStorage.setItem('bc_name', name);
        nickEl.value = name;
      });
  }
  function post() {
    var content = textEl.value.trim();
    if (!content) { setStatus('先写点什么吧'); return; }
    if (!token) { register().then(function () { post(); }).catch(function (e) { setStatus(e.message || '注册失败'); }); return; }
    btn.disabled = true; setStatus('发送中…');
    request('/api/cmd', { method: 'POST', body: JSON.stringify({ cmd: 'join', room: room }) })
      .then(function () { return request('/api/cmd', { method: 'POST', body: JSON.stringify({ cmd: 'msg', room: room, content: content }) }); })
      .then(function (r) {
        if (!r.ok) {
          if (/token|Invalid/.test(r.error || '')) {
            token = ''; localStorage.removeItem('bc_token');
            throw new Error('登录已失效，请再点一次发送');
          }
          throw new Error(r.error || '发送失败');
        }
        textEl.value = ''; setStatus('');
        return load();
      })
      .catch(function (e) { setStatus(e.message || '发送失败'); })
      .then(function () { btn.disabled = false; });
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); post(); });
  textEl.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); post(); }
  });

  load();
  setInterval(function () { if (document.visibilityState === 'visible') load(); }, 15000);
})();
