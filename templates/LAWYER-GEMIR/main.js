/* ═══════════════════════════════════════════════════════════════════
   LAWYER-GEMIR — Premium Interactions & Scroll Effects
═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Nav: glassmorphism scroll effect ─────────────────────────── */
  const nav = document.querySelector('.nav');
  function onNavScroll() {
    if (!nav) return;
    nav.classList.toggle('scrolled', window.scrollY > 50);
  }
  window.addEventListener('scroll', onNavScroll, { passive: true });
  onNavScroll();

  /* ── Mobile nav toggle ─────────────────────────────────────────── */
  const burger = document.querySelector('.nav__burger');
  const mobileNav = document.querySelector('.nav__mobile');
  if (burger && mobileNav) {
    burger.addEventListener('click', () => {
      burger.classList.toggle('open');
      mobileNav.classList.toggle('open');
      document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
    });
    mobileNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        burger.classList.remove('open');
        mobileNav.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  /* ── Scroll reveal (Intersection Observer) ─────────────────────── */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  /* ── Stats counter animation ───────────────────────────────────── */
  function animateCounter(el) {
    const target = parseFloat(el.dataset.target || el.innerText.replace(/[^0-9.]/g, ''));
    const suffix = el.dataset.suffix || el.innerText.replace(/[0-9.]/g, '');
    const prefix = el.dataset.prefix || '';
    const duration = 1800;
    const start = performance.now();
    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      const val = target * ease;
      el.textContent = prefix + (Number.isInteger(target) ? Math.round(val) : val.toFixed(1)) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const nums = entry.target.querySelectorAll('.stat-item__num, .hero__stat-num');
        nums.forEach(n => { if (!n.dataset.animated) { n.dataset.animated = '1'; animateCounter(n); } });
        statsObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  document.querySelectorAll('.stats-bar, .hero__stats').forEach(el => statsObserver.observe(el));

  /* ── FAQ accordion ─────────────────────────────────────────────── */
  document.querySelectorAll('.faq-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const answer = item.querySelector('.faq-answer');
      const isOpen = item.classList.contains('open');

      document.querySelectorAll('.faq-item.open').forEach(other => {
        if (other !== item) {
          other.classList.remove('open');
          other.querySelector('.faq-answer').style.height = '0';
        }
      });

      if (isOpen) {
        item.classList.remove('open');
        answer.style.height = '0';
      } else {
        item.classList.add('open');
        answer.style.height = answer.scrollHeight + 'px';
      }
    });
  });

  /* ── Blog filter buttons ───────────────────────────────────────── */
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.blog-filters').querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  /* ── Reading progress bar ──────────────────────────────────────── */
  const progressBar = document.querySelector('.post-progress');
  if (progressBar) {
    function updateProgress() {
      const doc = document.documentElement;
      const scrollTop = doc.scrollTop || document.body.scrollTop;
      const scrollHeight = doc.scrollHeight - doc.clientHeight;
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      progressBar.style.width = progress + '%';
    }
    window.addEventListener('scroll', updateProgress, { passive: true });
  }

  /* ── Smooth scroll for anchors ─────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });

  /* ── Active nav link highlight ─────────────────────────────────── */
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__link').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  /* ── 3D card tilt on hover ─────────────────────────────────────── */
  function addTilt(selector, intensity = 8) {
    document.querySelectorAll(selector).forEach(card => {
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / (rect.width / 2);
        const dy = (e.clientY - cy) / (rect.height / 2);
        card.style.transform = `perspective(600px) rotateY(${dx * intensity}deg) rotateX(${-dy * intensity}deg) translateY(-6px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }
  addTilt('.service-card', 6);
  addTilt('.testimonial-card', 4);
  addTilt('.blog-card', 4);
  addTilt('.stack-card', 5);

  /* ── Parallax on hero blobs ────────────────────────────────────── */
  const blobs = document.querySelectorAll('.hero .blob');
  if (blobs.length) {
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      blobs.forEach((b, i) => {
        b.style.transform = `translateY(${y * (i % 2 === 0 ? 0.15 : -0.10)}px)`;
      });
    }, { passive: true });
  }

  /* ── Card stack scroll pin ─────────────────────────────────────── */
  const stackSection = document.querySelector('.stack-section');
  if (stackSection) {
    const cards = Array.from(stackSection.querySelectorAll('.stack-card'));
    const n = cards.length;
    function updateStack() {
      const rect = stackSection.getBoundingClientRect();
      const scrollable = stackSection.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const progress = Math.max(0, Math.min(1, -rect.top / scrollable));
      const step = 1 / n;
      cards.forEach((card, i) => {
        const segStart = i * step;
        const segP = Math.max(0, Math.min(1, (progress - segStart) / step));
        const peekScale = 1 - (n - 1 - i) * 0.03;
        const peekY = (n - 1 - i) * 10;
        // Merge to front as previous card exits
        const prevSegP = i > 0 ? Math.max(0, Math.min(1, (progress - (i - 1) * step) / step)) : 1;
        const scale = peekScale + (1 - peekScale) * prevSegP;
        const ty = peekY - peekY * prevSegP;
        if (segP < 1) {
          // This card is current or upcoming
          card.style.transform = `scale(${scale}) translateY(${ty}px)`;
          card.style.opacity = '1';
        } else {
          // Card has been passed — fly up and fade
          card.style.transform = `scale(${scale}) translateY(${ty - 60 * (segP)}px)`;
          card.style.opacity = String(Math.max(0, 1 - segP * 1.5));
        }
      });
    }
    window.addEventListener('scroll', updateStack, { passive: true });
    updateStack();
  }

  /* ── Hero mouse parallax on float card ─────────────────────────── */
  const heroSection = document.querySelector('.hero');
  const floatCard = document.querySelector('.hero__float-card');
  if (heroSection && floatCard) {
    heroSection.addEventListener('mousemove', e => {
      const rect = heroSection.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dx = (e.clientX - rect.left - cx) / cx;
      const dy = (e.clientY - rect.top - cy) / cy;
      floatCard.style.transform = `translateY(0px) rotate(${-1 + dx * 2}deg) translateX(${dx * 8}px) translateY(${dy * 6}px)`;
    });
    heroSection.addEventListener('mouseleave', () => {
      floatCard.style.transform = '';
    });
  }

  /* ── Floating particles canvas on hero ─────────────────────────── */
  const heroEl = document.querySelector('.hero');
  if (heroEl) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;opacity:0.55';
    heroEl.style.position = 'relative';
    heroEl.insertBefore(canvas, heroEl.firstChild);
    const ctx = canvas.getContext('2d');
    let W, H, particles;
    function resize() {
      W = canvas.width = heroEl.offsetWidth;
      H = canvas.height = heroEl.offsetHeight;
    }
    function makeParticle() {
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 2.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -(Math.random() * 0.5 + 0.15),
        alpha: Math.random() * 0.5 + 0.1,
        color: Math.random() > 0.6 ? '#f97316' : '#1c1c1e',
      };
    }
    function initParticles() {
      particles = Array.from({ length: 55 }, makeParticle);
    }
    function drawParticles() {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10 || p.x < -10 || p.x > W + 10) {
          Object.assign(p, makeParticle(), { y: H + 5 });
        }
      });
      ctx.globalAlpha = 1;
      requestAnimationFrame(drawParticles);
    }
    resize();
    initParticles();
    drawParticles();
    window.addEventListener('resize', () => { resize(); initParticles(); }, { passive: true });
  }

  /* ── Color band transition on scroll ───────────────────────────── */
  const colorBands = document.querySelectorAll('.color-band');
  if (colorBands.length) {
    const bandObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          el.style.background = el.dataset.bgActive || '';
        }
      });
    }, { threshold: 0.3 });
    colorBands.forEach(b => bandObserver.observe(b));
  }

  /* ── Micro-interaction: button ripple ──────────────────────────── */
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', function (e) {
      const ripple = document.createElement('span');
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      ripple.style.cssText = `
        position:absolute;width:${size}px;height:${size}px;
        border-radius:50%;
        background:rgba(255,255,255,0.25);
        transform:translate(-50%,-50%) scale(0);
        left:${e.clientX - rect.left}px;top:${e.clientY - rect.top}px;
        animation:ripple 0.5s ease-out forwards;
        pointer-events:none;
      `;
      this.style.position = 'relative';
      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  });

  /* ── Add ripple keyframe ───────────────────────────────────────── */
  const style = document.createElement('style');
  style.textContent = '@keyframes ripple{to{transform:translate(-50%,-50%) scale(1);opacity:0;}}';
  document.head.appendChild(style);

  /* ── Holographic cursor trail on holo elements ─────────────────── */
  document.querySelectorAll('.holo-border, .holo').forEach(el => {
    el.addEventListener('mousemove', e => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty('--mx', x + '%');
      el.style.setProperty('--my', y + '%');
    });
  });

  /* ── Scroll-triggered number pop ──────────────────────────────── */
  document.querySelectorAll('[data-count]').forEach(el => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(el);
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    obs.observe(el);
  });

  /* ── Contact form feedback ─────────────────────────────────────── */
  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', e => {
      e.preventDefault();
      const btn = contactForm.querySelector('[type="submit"]');
      const origText = btn.textContent;
      btn.textContent = 'Se trimite...';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = 'Mesaj trimis!';
        btn.classList.add('btn-dark');
        btn.classList.remove('btn-primary');
        contactForm.reset();
        setTimeout(() => {
          btn.textContent = origText;
          btn.disabled = false;
          btn.classList.remove('btn-dark');
          btn.classList.add('btn-primary');
        }, 3000);
      }, 1200);
    });
  }

  /* ── Lazy-load images ──────────────────────────────────────────── */
  document.querySelectorAll('img[loading="lazy"]').forEach(img => {
    if ('loading' in HTMLImageElement.prototype) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.src = entry.target.dataset.src || entry.target.src;
          observer.unobserve(entry.target);
        }
      });
    });
    observer.observe(img);
  });

  /* ── Stagger reveal for grid children ──────────────────────────── */
  document.querySelectorAll('.blog-grid, .news-grid, .services-grid, .team-grid, .values-grid').forEach(grid => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          Array.from(entry.target.children).forEach((child, i) => {
            child.style.transitionDelay = `${i * 80}ms`;
            child.classList.add('reveal', 'in');
          });
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    obs.observe(grid);
  });

  /* ── News section: filter by source (if data-source present) ─── */
  const newsFilterBtns = document.querySelectorAll('.news-filter-btn');
  if (newsFilterBtns.length) {
    newsFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        newsFilterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        document.querySelectorAll('.news-card').forEach(card => {
          card.style.display = filter === 'all' || card.dataset.source === filter ? '' : 'none';
        });
      });
    });
  }

})();

/* ── News Modal (global, called from injected news card HTML) ─── */
window.openNewsModal = function(newsId) {
  const card = document.querySelector('[data-news-id="' + newsId + '"]');
  const modal = document.getElementById('news-modal');
  if (!card || !modal) return;
  const title   = card.getAttribute('data-news-title')   || '';
  const summary = card.getAttribute('data-news-summary') || '';
  const url     = card.getAttribute('data-news-url')     || '#';
  const img     = card.getAttribute('data-news-img')     || '';
  const source  = card.getAttribute('data-news-source')  || '';
  document.getElementById('news-modal-title').textContent   = title;
  document.getElementById('news-modal-summary').textContent = summary;
  document.getElementById('news-modal-link').href           = url;
  var srcEl = document.getElementById('news-modal-source');
  srcEl.textContent   = source;
  srcEl.style.display = source ? '' : 'none';
  var imgEl = document.getElementById('news-modal-img');
  imgEl.src           = img;
  imgEl.style.display = img ? '' : 'none';
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
};

window.closeNewsModal = function() {
  var modal = document.getElementById('news-modal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
};

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') window.closeNewsModal();
});

/* Delegated listener — fires even when inline onclick doesn't */
document.addEventListener('click', function(e) {
  var btn = e.target.closest('.news-card__cta');
  if (!btn) return;
  var card = btn.closest('[data-news-id]');
  if (!card) return;
  var newsId = card.getAttribute('data-news-id');
  if (newsId) window.openNewsModal(newsId);
});
