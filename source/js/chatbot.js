/* 博客 AI 助手：左上角入口 + 右下角对话面板 */
(function () {
  'use strict';

  var API = window.BLOG_CHAT_API || 'https://starryjourney.duckdns.org:8443/bot/api/chat';
  var STORE = 'bc_chat_history';

  var history = [];
  try { history = JSON.parse(localStorage.getItem(STORE) || '[]'); } catch (e) { history = []; }
  if (!Array.isArray(history)) history = [];

  var trigger = document.createElement('button');
  trigger.className = 'bc-chat-trigger';
  trigger.type = 'button';
  trigger.setAttribute('aria-label', '打开 AI 助手');
  trigger.innerHTML = '<span class="bc-chat-badge">AI</span><span class="bc-chat-label">问问大肥鱼</span>';

  var panel = document.createElement('div');
  panel.className = 'bc-chat-panel';
  panel.innerHTML =
    '<div class="bc-chat-head"><span>大肥鱼 · AI 助手</span><button class="bc-chat-close" type="button" aria-label="关闭">×</button></div>' +
    '<div class="bc-chat-body"></div>' +
    '<form class="bc-chat-form"><textarea rows="1" maxlength="500" placeholder="说点什么…（Enter 发送）"></textarea><button type="submit">发送</button></form>';
  document.body.appendChild(panel);

  var body = panel.querySelector('.bc-chat-body');
  var form = panel.querySelector('form');
  var input = panel.querySelector('textarea');
  var sendBtn = panel.querySelector('button[type=submit]');

  // 桌面端挂到侧边栏左上角；找不到就浮动在左下
  var header = document.querySelector('.l_left .header');
  if (header) {
    trigger.classList.add('in-header');
    header.appendChild(trigger);
  } else {
    trigger.classList.add('floating');
    document.body.appendChild(trigger);
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function render() {
    if (!history.length) {
      body.innerHTML = '<div class="bc-chat-welcome">嗨，我是大肥鱼～ 想聊博客、简报，或者随便聊聊都可以呀。</div>';
      return;
    }
    body.innerHTML = history.map(function (m) {
      return '<div class="bc-chat-msg ' + (m.role === 'user' ? 'me' : 'bot') + '">' + esc(m.content).replace(/\n/g, '<br>') + '</div>';
    }).join('');
    body.scrollTop = body.scrollHeight;
  }

  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(history.slice(-20))); } catch (e) {}
  }

  function open() {
    panel.classList.add('open');
    input.focus();
  }
  function close() { panel.classList.remove('open'); }

  trigger.addEventListener('click', open);
  panel.querySelector('.bc-chat-close').addEventListener('click', close);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); send(); });

  var sending = false;
  function send() {
    var text = input.value.trim();
    if (!text || sending) return;
    sending = true;
    sendBtn.disabled = true;
    history.push({ role: 'user', content: text });
    input.value = '';
    render();
    var typing = document.createElement('div');
    typing.className = 'bc-chat-msg bot typing';
    typing.textContent = '大肥鱼正在想…';
    body.appendChild(typing);
    body.scrollTop = body.scrollHeight;

    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, 30000);
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history.slice(-12) }),
      signal: ctl.signal
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        typing.remove();
        history.push({ role: 'assistant', content: data.reply || data.error || '呜…好像出错了' });
        save();
        render();
      })
      .catch(function () {
        typing.remove();
        history.push({ role: 'assistant', content: '呜…网络好像不太行，等下再试试嘛' });
        save();
        render();
      })
      .then(function () { clearTimeout(timer); sending = false; sendBtn.disabled = false; });
  }

  render();
})();
