(function () {
  'use strict';

  var script = document.currentScript || document.querySelector('[data-chatbot-widget]');
  if (!script) return;
  var API_BASE = script.getAttribute('data-api') || 'https://api.buildhaze.com';
  var CLIENT_SLUG = script.getAttribute('data-slug') || '';
  var CONFIG;
  try { CONFIG = JSON.parse(script.getAttribute('data-config') || '{}'); } catch(e) { CONFIG = {}; }

  if (!CONFIG || !CONFIG.enabled || !CLIENT_SLUG) return;

  var SESSION_KEY = 'chatbot_session_' + CLIENT_SLUG;
  var sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).slice(2) + Date.now();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  var history = [];
  var isOpen = false;
  var isTyping = false;

  var primaryColor = CONFIG.primaryColor || '#059669';
  var position = CONFIG.position || 'bottom-right';
  var botName = CONFIG.botName || 'Assistant';
  var welcomeMsg = CONFIG.welcomeMessage || 'Bună ziua! Cu ce vă pot ajuta?';

  var posStyle = position === 'bottom-left'
    ? 'left:24px;right:auto;'
    : 'right:24px;left:auto;';

  var css = `
    #bh-chat-btn{position:fixed;bottom:24px;${posStyle}z-index:99999;width:56px;height:56px;border-radius:50%;background:${primaryColor};border:none;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;transition:transform .2s;outline:none;}
    #bh-chat-btn:hover{transform:scale(1.08);}
    #bh-chat-btn svg{width:28px;height:28px;fill:#fff;}
    #bh-chat-win{position:fixed;bottom:90px;${posStyle}z-index:99998;width:360px;max-height:520px;background:#fff;border-radius:16px;box-shadow:0 16px 56px rgba(0,0,0,.22);display:flex;flex-direction:column;overflow:hidden;transform:scale(.9) translateY(16px);opacity:0;pointer-events:none;transition:transform .25s ease,opacity .25s ease;}
    #bh-chat-win.open{transform:none;opacity:1;pointer-events:all;}
    #bh-chat-header{background:${primaryColor};padding:16px 18px;display:flex;align-items:center;gap:10px;flex-shrink:0;}
    #bh-chat-header .bh-avatar{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;font-size:18px;}
    #bh-chat-header .bh-info{flex:1;}
    #bh-chat-header .bh-name{color:#fff;font-weight:700;font-size:.9rem;}
    #bh-chat-header .bh-status{color:rgba(255,255,255,.75);font-size:.75rem;}
    #bh-chat-close{background:none;border:none;color:#fff;cursor:pointer;padding:4px;opacity:.8;font-size:1.2rem;line-height:1;}
    #bh-chat-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth;}
    .bh-msg{max-width:82%;padding:10px 14px;border-radius:14px;font-size:.875rem;line-height:1.5;word-break:break-word;}
    .bh-msg.user{align-self:flex-end;background:${primaryColor};color:#fff;border-bottom-right-radius:4px;}
    .bh-msg.bot{align-self:flex-start;background:#f3f4f6;color:#1f2937;border-bottom-left-radius:4px;}
    .bh-typing{display:flex;gap:4px;align-items:center;padding:10px 14px;}
    .bh-typing span{width:7px;height:7px;border-radius:50%;background:#9ca3af;animation:bh-bounce .9s infinite;}
    .bh-typing span:nth-child(2){animation-delay:.15s;}
    .bh-typing span:nth-child(3){animation-delay:.3s;}
    @keyframes bh-bounce{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-6px);}}
    #bh-chat-form{padding:12px;border-top:1px solid #e5e7eb;display:flex;gap:8px;flex-shrink:0;}
    #bh-chat-input{flex:1;border:1px solid #d1d5db;border-radius:10px;padding:8px 12px;font-size:.875rem;resize:none;outline:none;transition:border-color .15s;font-family:inherit;}
    #bh-chat-input:focus{border-color:${primaryColor};}
    #bh-chat-send{background:${primaryColor};border:none;border-radius:10px;width:38px;height:38px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
    #bh-chat-send svg{width:18px;height:18px;fill:#fff;}
    #bh-booking-banner{background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:10px 14px;font-size:.8rem;color:#065f46;margin-top:4px;display:none;}
    #bh-booking-banner a{color:${primaryColor};font-weight:700;text-decoration:none;}
    @media(max-width:420px){#bh-chat-win{width:calc(100vw - 32px);bottom:80px;}}
  `;

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var btn = document.createElement('button');
  btn.id = 'bh-chat-btn';
  btn.setAttribute('aria-label', 'Deschide chat');
  btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>`;

  var win = document.createElement('div');
  win.id = 'bh-chat-win';
  win.setAttribute('role', 'dialog');
  win.setAttribute('aria-label', 'Chat ' + botName);
  win.innerHTML = `
    <div id="bh-chat-header">
      <div class="bh-avatar">🤖</div>
      <div class="bh-info">
        <div class="bh-name">${escHtml(botName)}</div>
        <div class="bh-status">Online</div>
      </div>
      <button id="bh-chat-close" aria-label="Închide">✕</button>
    </div>
    <div id="bh-chat-msgs" role="log" aria-live="polite"></div>
    <div id="bh-chat-form">
      <textarea id="bh-chat-input" placeholder="Scrieți un mesaj..." rows="1" aria-label="Mesaj"></textarea>
      <button id="bh-chat-send" aria-label="Trimite">
        <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      </button>
    </div>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(win);

  var msgsEl = document.getElementById('bh-chat-msgs');
  var inputEl = document.getElementById('bh-chat-input');
  var sendBtn = document.getElementById('bh-chat-send');

  appendMsg('bot', welcomeMsg);

  btn.addEventListener('click', toggleChat);
  document.getElementById('bh-chat-close').addEventListener('click', function () { toggleChat(false); });
  sendBtn.addEventListener('click', sendMsg);
  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  });
  inputEl.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 80) + 'px';
  });

  function toggleChat(force) {
    isOpen = (force !== undefined && force !== null) ? !!force : !isOpen;
    if (isOpen) {
      win.classList.add('open');
      btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;
      setTimeout(function () { inputEl.focus(); }, 200);
    } else {
      win.classList.remove('open');
      btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>`;
    }
  }

  function sendMsg() {
    var text = inputEl.value.trim();
    if (!text || isTyping) return;
    inputEl.value = '';
    inputEl.style.height = 'auto';
    appendMsg('user', text);
    history.push({ role: 'user', content: text });
    showTyping();
    isTyping = true;

    fetch(API_BASE + '/api/chat/' + CLIENT_SLUG, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, sessionId: sessionId, history: history.slice(-6) }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        hideTyping();
        isTyping = false;
        if (data.reply) {
          appendMsg('bot', data.reply);
          history.push({ role: 'assistant', content: data.reply });
        }
        if (data.bookingAction && data.bookingAction.type === 'show_booking') {
          showBookingBanner(data.bookingAction.message);
        }
      })
      .catch(function () {
        hideTyping();
        isTyping = false;
        appendMsg('bot', 'Conexiunea a eșuat. Vă rugăm încercați din nou.');
      });
  }

  function appendMsg(role, text) {
    var div = document.createElement('div');
    div.className = 'bh-msg ' + role;
    div.textContent = text;
    msgsEl.appendChild(div);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return div;
  }

  var typingEl = null;
  function showTyping() {
    typingEl = document.createElement('div');
    typingEl.className = 'bh-msg bot bh-typing';
    typingEl.innerHTML = '<span></span><span></span><span></span>';
    msgsEl.appendChild(typingEl);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }
  function hideTyping() {
    if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
    typingEl = null;
  }

  function showBookingBanner(msg) {
    var existing = document.getElementById('bh-booking-banner');
    if (existing) existing.remove();
    var banner = document.createElement('div');
    banner.id = 'bh-booking-banner';
    banner.style.display = 'block';
    banner.innerHTML = msg + ' <a href="/booking.html" target="_blank">Programează-te &rarr;</a>';
    msgsEl.appendChild(banner);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
})();
