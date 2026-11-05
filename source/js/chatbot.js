/* 博客 AI 助手：左上角入口 + 右下角对话面板（/v1/chat/stream SSE） */
(function () {
  'use strict';

  var API = window.BLOG_API_BASE || 'https://starryjourney.duckdns.org:8443';
  var TOKEN_KEY = 'bc_api_token';
  var STORE = 'bc_chat_history';
  var CONV_KEY = 'bc_chat_conv';

  var history = [];
  try {
    history = JSON.parse(localStorage.getItem(STORE) || '[]');
  } catch {
    history = [];
  }
  if (!Array.isArray(history)) history = [];

  var trigger = document.createElement('button');
  trigger.className = 'bc-chat-trigger';
  trigger.type = 'button';
  trigger.setAttribute('aria-label', '打开 AI 助手');
  trigger.innerHTML =
    '<span class="bc-chat-badge">AI</span><span class="bc-chat-label">问问大肥鱼</span>';

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
      body.innerHTML =
        '<div class="bc-chat-welcome">嗨，我是大肥鱼～ 想聊博客、简报，或者随便聊聊都可以呀。</div>';
      return;
    }
    body.innerHTML = history
      .map(function (m) {
        return (
          '<div class="bc-chat-msg ' +
          (m.role === 'user' ? 'me' : 'bot') +
          '">' +
          esc(m.content).replace(/\n/g, '<br>') +
          '</div>'
        );
      })
      .join('');
    body.scrollTop = body.scrollHeight;
  }

  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify(history.slice(-20)));
    } catch {
      /* ignore */
    }
  }

  function open() {
    panel.classList.add('open');
    input.focus();
  }
  function close() {
    panel.classList.remove('open');
  }

  trigger.addEventListener('click', open);
  panel.querySelector('.bc-chat-close').addEventListener('click', close);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    send();
  });

  var token = localStorage.getItem(TOKEN_KEY) || '';
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

  var sending = false;
  function send() {
    var text = input.value.trim();
    if (!text || sending) return;
    sending = true;
    sendBtn.disabled = true;
    history.push({ role: 'user', content: text });
    input.value = '';
    render();

    var botEl = document.createElement('div');
    botEl.className = 'bc-chat-msg bot';
    botEl.textContent = '大肥鱼正在想…';
    body.appendChild(botEl);
    body.scrollTop = body.scrollHeight;

    var ctl = new AbortController();
    var timer = setTimeout(function () {
      ctl.abort();
    }, 60000);
    var reply = '';

    function finish(errorText) {
      clearTimeout(timer);
      sending = false;
      sendBtn.disabled = false;
      if (errorText && !reply) {
        botEl.textContent = errorText;
      } else {
        history.push({ role: 'assistant', content: reply || '呜…好像出错了' });
        save();
        render();
      }
    }

    function handleEvent(name, data) {
      var payload;
      try {
        payload = JSON.parse(data);
      } catch {
        return;
      }
      if (name === 'meta' && payload.conversation_id) {
        localStorage.setItem(CONV_KEY, String(payload.conversation_id));
      } else if (name === 'delta' && payload.text) {
        reply += payload.text;
        botEl.textContent = reply;
        body.scrollTop = body.scrollHeight;
      } else if (name === 'error') {
        finish(payload.message || '大肥鱼暂时离线');
      }
    }

    ensureToken()
      .then(function (t) {
        var conv = localStorage.getItem(CONV_KEY);
        return fetch(API + '/v1/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
          body: JSON.stringify({ message: text, conversation_id: conv ? Number(conv) : null }),
          signal: ctl.signal,
        });
      })
      .then(function (res) {
        if (res.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          token = '';
          throw new Error('登录状态失效，请再点一次发送');
        }
        if (!res.ok)
          return res.json().then(function (b) {
            throw new Error(b.detail || '请求失败');
          });
        if (!res.body) throw new Error('浏览器不支持流式响应');

        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        var buffer = '';

        function pump() {
          return reader.read().then(function (result) {
            if (result.done) return;
            buffer += decoder.decode(result.value, { stream: true });
            var idx;
            while ((idx = buffer.indexOf('\n\n')) >= 0) {
              var raw = buffer.slice(0, idx);
              buffer = buffer.slice(idx + 2);
              var name = 'message';
              var data = '';
              raw.split('\n').forEach(function (line) {
                if (line.indexOf('event:') === 0) name = line.slice(6).trim();
                else if (line.indexOf('data:') === 0) data += line.slice(5).trim();
              });
              handleEvent(name, data);
            }
            return pump();
          });
        }
        return pump().then(function () {
          finish();
        });
      })
      .catch(function (err) {
        finish(err.name === 'AbortError' ? '等太久啦，稍后再试' : err.message || '网络好像不太行');
      });
  }

  render();
})();
