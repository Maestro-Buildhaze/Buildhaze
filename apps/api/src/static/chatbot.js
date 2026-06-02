(function () {
  'use strict';

  var script = document.currentScript || document.querySelector('[data-chatbot-widget]');
  if (!script) return;
  var API_BASE = script.getAttribute('data-api') || 'https://buildhaze.onrender.com';
  var CLIENT_SLUG = script.getAttribute('data-slug') || '';
  var CONFIG;
  try {
    var b64 = script.getAttribute('data-config-b64');
    if (b64) {
      CONFIG = JSON.parse(atob(b64));
    } else {
      CONFIG = JSON.parse(script.getAttribute('data-config') || '{}');
    }
  } catch(e) { CONFIG = {}; }

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

  var isLeft = position === 'bottom-left';
  var posStyle = isLeft ? 'left:24px;right:auto;' : 'right:24px;left:auto;';

  // Derive a slightly darker shade for gradient
  function hexToRgb(hex) {
    var r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return r+','+g+','+b;
  }
  var rgb = hexToRgb(primaryColor.length === 7 ? primaryColor : '#059669');

  // Initials from botName
  var initials = botName.split(' ').map(function(w){return w[0]||'';}).slice(0,2).join('').toUpperCase() || 'AI';

  var css = `
    #bh-chat-btn{position:fixed;bottom:24px;${posStyle}z-index:99999;width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg,${primaryColor},rgba(${rgb},.75));border:none;cursor:pointer;box-shadow:0 4px 24px rgba(${rgb},.45),0 1px 3px rgba(0,0,0,.15);display:flex;align-items:center;justify-content:center;transition:transform .2s,box-shadow .2s;outline:none;}
    #bh-chat-btn:hover{transform:scale(1.1);box-shadow:0 6px 32px rgba(${rgb},.55),0 2px 8px rgba(0,0,0,.2);}
    #bh-chat-btn svg{width:26px;height:26px;fill:#fff;transition:transform .3s;}
    #bh-chat-btn.open svg{transform:rotate(90deg);}
    #bh-unread{position:absolute;top:-3px;right:-3px;width:18px;height:18px;background:#ef4444;border-radius:50%;border:2px solid #fff;font-size:10px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center;display:none;}

    #bh-chat-win{position:fixed;bottom:94px;${posStyle}z-index:99998;width:380px;height:540px;background:#fff;border-radius:20px;box-shadow:0 24px 64px rgba(0,0,0,.18),0 4px 16px rgba(0,0,0,.08);display:flex;flex-direction:column;overflow:hidden;transform:translateY(12px) scale(.96);opacity:0;pointer-events:none;transition:transform .28s cubic-bezier(.34,1.56,.64,1),opacity .22s ease;transform-origin:${isLeft?'bottom left':'bottom right'};}
    #bh-chat-win.open{transform:none;opacity:1;pointer-events:all;}

    #bh-chat-header{background:linear-gradient(135deg,${primaryColor} 0%,rgba(${rgb},.82) 100%);padding:14px 16px 12px;display:flex;align-items:center;gap:12px;flex-shrink:0;position:relative;}
    #bh-chat-header::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;background:rgba(255,255,255,.15);}
    .bh-av{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.22);border:2px solid rgba(255,255,255,.4);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff;letter-spacing:-.5px;flex-shrink:0;}
    .bh-info{flex:1;min-width:0;}
    .bh-name{color:#fff;font-weight:700;font-size:.92rem;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .bh-status{display:flex;align-items:center;gap:5px;margin-top:1px;}
    .bh-dot{width:7px;height:7px;border-radius:50%;background:#4ade80;box-shadow:0 0 0 2px rgba(74,222,128,.3);flex-shrink:0;}
    .bh-status-txt{color:rgba(255,255,255,.8);font-size:.72rem;font-weight:500;}
    #bh-chat-close{background:rgba(255,255,255,.15);border:none;color:#fff;cursor:pointer;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:background .15s;flex-shrink:0;}
    #bh-chat-close:hover{background:rgba(255,255,255,.28);}
    #bh-chat-close svg{width:14px;height:14px;stroke:#fff;stroke-width:2.5;fill:none;}

    #bh-chat-msgs{flex:1;overflow-y:auto;padding:16px 14px;display:flex;flex-direction:column;gap:8px;scroll-behavior:smooth;background:#f8f9fb;}
    #bh-chat-msgs::-webkit-scrollbar{width:4px;}
    #bh-chat-msgs::-webkit-scrollbar-track{background:transparent;}
    #bh-chat-msgs::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:4px;}

    .bh-msg-wrap{display:flex;gap:7px;max-width:88%;}
    .bh-msg-wrap.user{align-self:flex-end;flex-direction:row-reverse;}
    .bh-msg-wrap.bot{align-self:flex-start;}
    .bh-msg-av{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,${primaryColor},rgba(${rgb},.7));display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;flex-shrink:0;margin-top:2px;}
    .bh-msg{padding:10px 14px;border-radius:16px;font-size:.855rem;line-height:1.55;word-break:break-word;max-width:100%;}
    .bh-msg-wrap.user .bh-msg{background:linear-gradient(135deg,${primaryColor},rgba(${rgb},.85));color:#fff;border-bottom-right-radius:5px;box-shadow:0 2px 8px rgba(${rgb},.3);}
    .bh-msg-wrap.bot .bh-msg{background:#fff;color:#1f2937;border-bottom-left-radius:5px;box-shadow:0 1px 4px rgba(0,0,0,.08);border:1px solid #f0f0f2;}

    .bh-typing-wrap{display:flex;gap:7px;align-self:flex-start;}
    .bh-typing{background:#fff;border:1px solid #f0f0f2;box-shadow:0 1px 4px rgba(0,0,0,.08);border-radius:16px;border-bottom-left-radius:5px;padding:12px 16px;display:flex;gap:5px;align-items:center;}
    .bh-typing span{width:7px;height:7px;border-radius:50%;background:#c4c4c8;animation:bh-bounce .9s infinite;}
    .bh-typing span:nth-child(2){animation-delay:.18s;}
    .bh-typing span:nth-child(3){animation-delay:.36s;}
    @keyframes bh-bounce{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-5px);}}

    #bh-chat-form{padding:10px 12px;border-top:1px solid #eaecf0;display:flex;gap:8px;align-items:flex-end;flex-shrink:0;background:#fff;}
    #bh-chat-input{flex:1;border:1.5px solid #e5e7eb;border-radius:12px;padding:9px 13px;font-size:.855rem;resize:none;outline:none;transition:border-color .15s,box-shadow .15s;font-family:inherit;max-height:80px;line-height:1.45;color:#1f2937;background:#fafafa;}
    #bh-chat-input:focus{border-color:${primaryColor};box-shadow:0 0 0 3px rgba(${rgb},.12);background:#fff;}
    #bh-chat-input::placeholder{color:#a8adb8;}
    #bh-chat-send{background:linear-gradient(135deg,${primaryColor},rgba(${rgb},.8));border:none;border-radius:12px;width:40px;height:40px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform .15s,box-shadow .15s;box-shadow:0 2px 8px rgba(${rgb},.35);}
    #bh-chat-send:hover{transform:scale(1.06);box-shadow:0 4px 12px rgba(${rgb},.45);}
    #bh-chat-send:disabled{opacity:.45;cursor:default;transform:none;}
    #bh-chat-send svg{width:17px;height:17px;fill:#fff;}

    #bh-booking-banner{background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:1px solid #a7f3d0;border-radius:12px;padding:10px 14px;font-size:.8rem;color:#065f46;margin:0 14px 8px;display:none;}
    #bh-booking-banner a{color:${primaryColor};font-weight:700;text-decoration:none;}

    @media(max-width:480px){#bh-chat-win{width:calc(100vw - 20px);${isLeft?'left:10px;right:10px;':'left:10px;right:10px;'}bottom:82px;height:480px;border-radius:16px;}}
  `;

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var btn = document.createElement('button');
  btn.id = 'bh-chat-btn';
  btn.setAttribute('aria-label', 'Deschide chat');
  btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg><div id="bh-unread">1</div>`;

  var win = document.createElement('div');
  win.id = 'bh-chat-win';
  win.setAttribute('role', 'dialog');
  win.setAttribute('aria-label', 'Chat ' + botName);
  win.innerHTML = `
    <div id="bh-chat-header">
      <div class="bh-av">${escHtml(initials)}</div>
      <div class="bh-info">
        <div class="bh-name">${escHtml(botName)}</div>
        <div class="bh-status"><div class="bh-dot"></div><span class="bh-status-txt">Online · răspunde instant</span></div>
      </div>
      <button id="bh-chat-close" aria-label="Închide">
        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
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
      btn.classList.add('open');
      var unread = document.getElementById('bh-unread');
      if (unread) unread.style.display = 'none';
      setTimeout(function () { inputEl.focus(); }, 250);
    } else {
      win.classList.remove('open');
      btn.classList.remove('open');
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
    var wrap = document.createElement('div');
    wrap.className = 'bh-msg-wrap ' + role;
    if (role === 'bot') {
      var av = document.createElement('div');
      av.className = 'bh-msg-av';
      av.textContent = initials;
      wrap.appendChild(av);
    }
    var bubble = document.createElement('div');
    bubble.className = 'bh-msg';
    bubble.textContent = text;
    wrap.appendChild(bubble);
    msgsEl.appendChild(wrap);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return wrap;
  }

  var typingEl = null;
  function showTyping() {
    typingEl = document.createElement('div');
    typingEl.className = 'bh-typing-wrap';
    var av = document.createElement('div');
    av.className = 'bh-msg-av';
    av.textContent = initials;
    var dots = document.createElement('div');
    dots.className = 'bh-typing';
    dots.innerHTML = '<span></span><span></span><span></span>';
    typingEl.appendChild(av);
    typingEl.appendChild(dots);
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
