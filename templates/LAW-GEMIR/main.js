/* ═══════════════════════════════════════════════════════════
   LAW-GEMIR — main.js
   Shared interactive JS for all pages
═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Navbar scroll effect ── */
  const navbar = document.getElementById('navbar');
  if (navbar) {
    const handleScroll = () => {
      if (window.scrollY > 60) {
        navbar.classList.remove('dark-mode');
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
        navbar.classList.add('dark-mode');
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  }

  /* ── Mobile nav toggle ── */
  const mobileToggle = document.getElementById('mobileToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', () => {
      const open = mobileMenu.style.display === 'flex';
      mobileMenu.style.display = open ? 'none' : 'flex';
      mobileToggle.setAttribute('aria-expanded', String(!open));
    });
  }

  /* ── Animate on scroll (IntersectionObserver) ── */
  const animEls = document.querySelectorAll('.animate-fade-up, .animate-scale-in, .animate-fade-in');
  if (animEls.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.animationPlayState = 'running';
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.10, rootMargin: '0px 0px -40px 0px' });
    animEls.forEach(el => {
      el.style.animationPlayState = 'paused';
      observer.observe(el);
    });
  }

  /* ── Staggered children animation ── */
  document.querySelectorAll('[data-stagger]').forEach(parent => {
    const children = parent.children;
    Array.from(children).forEach((child, i) => {
      child.style.animationDelay = `${i * 80}ms`;
      child.classList.add('animate-fade-up');
      child.style.animationPlayState = 'paused';
    });
    const obs2 = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          Array.from(parent.children).forEach(c => {
            c.style.animationPlayState = 'running';
          });
          obs2.unobserve(e.target);
        }
      });
    }, { threshold: 0.08 });
    obs2.observe(parent);
  });

  /* ── Smooth scroll for anchor links ── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const navH = navbar ? navbar.offsetHeight : 0;
        const top = target.getBoundingClientRect().top + window.scrollY - navH - 16;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  /* ── 3D Tilt on premium cards ── */
  document.querySelectorAll('.card-holo, .card-3d').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(700px) rotateY(${x * 9}deg) rotateX(${-y * 9}deg) translateY(-5px)`;
      card.style.transition = 'transform 0.05s linear';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.transition = 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)';
    });
  });

  /* ── Holographic shimmer on hover ── */
  document.querySelectorAll('.card-clay').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      card.style.setProperty('--mouse-x', `${x}%`);
      card.style.setProperty('--mouse-y', `${y}%`);
    });
  });

  /* ── Contact form feedback ── */
  document.getElementById('contactForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    const successEl = document.getElementById('formSuccess');
    if (btn) {
      btn.disabled = true;
      btn.style.opacity = '0.6';
    }
    setTimeout(() => {
      if (successEl) {
        form.style.display = 'none';
        successEl.style.display = 'block';
      } else if (btn) {
        btn.innerHTML = '✓ Mesaj trimis cu succes!';
        btn.style.background = 'linear-gradient(135deg,#059669,#10b981)';
        btn.style.color = '#fff';
        setTimeout(() => {
          btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Trimite Mesajul';
          btn.style.background = '';
          btn.style.color = '';
          btn.disabled = false;
          btn.style.opacity = '';
          form.reset();
        }, 4000);
      }
    }, 700);
  });

  /* ── FAQ accordion ── */
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  /* ── News tab filter ── */
  document.querySelectorAll('[data-news-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      const filter = tab.dataset.newsTab;
      document.querySelectorAll('[data-news-tab]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('[data-news-cat]').forEach(item => {
        item.style.display = (filter === 'all' || item.dataset.newsCat === filter) ? '' : 'none';
      });
    });
  });

  /* ── Breaking news ticker pause on hover ── */
  const ticker = document.querySelector('.ticker__track');
  if (ticker) {
    ticker.addEventListener('mouseenter', () => ticker.style.animationPlayState = 'paused');
    ticker.addEventListener('mouseleave', () => ticker.style.animationPlayState = 'running');
  }

  /* ── Reading progress bar ── */
  const progressBar = document.getElementById('readingProgress');
  if (progressBar) {
    window.addEventListener('scroll', () => {
      const doc = document.documentElement;
      const scrollTop = doc.scrollTop || document.body.scrollTop;
      const scrollHeight = doc.scrollHeight - doc.clientHeight;
      progressBar.style.width = scrollHeight > 0 ? `${(scrollTop / scrollHeight) * 100}%` : '0%';
    }, { passive: true });
  }

  /* ── Active nav link highlight based on scroll position ── */
  const sections = document.querySelectorAll('section[id], header[id]');
  const navLinks = document.querySelectorAll('.nav__link[href^="#"]');
  if (sections.length && navLinks.length) {
    const activateLink = () => {
      let current = '';
      sections.forEach(sec => {
        const top = sec.getBoundingClientRect().top;
        if (top <= 120) current = sec.id;
      });
      navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
      });
    };
    window.addEventListener('scroll', activateLink, { passive: true });
  }

  /* ── Stats counter animation ── */
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    const countObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const target = parseFloat(el.dataset.count);
        const suffix = el.dataset.countSuffix || '';
        const duration = 1600;
        const start = performance.now();
        const animate = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const val = target * eased;
          el.textContent = (Number.isInteger(target) ? Math.round(val) : val.toFixed(1)) + suffix;
          if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
        countObs.unobserve(el);
      });
    }, { threshold: 0.5 });
    counters.forEach(el => countObs.observe(el));
  }

  /* ── Service sticky nav active state ── */
  const serviceNavItems = document.querySelectorAll('.service-nav__item');
  const serviceSections = document.querySelectorAll('.service-section[id]');
  if (serviceNavItems.length && serviceSections.length) {
    window.addEventListener('scroll', () => {
      let current = '';
      serviceSections.forEach(sec => {
        if (sec.getBoundingClientRect().top <= 140) current = sec.id;
      });
      serviceNavItems.forEach(item => {
        const onclick = item.getAttribute('onclick') || '';
        const id = onclick.match(/scrollTo\('([^']+)'\)/)?.[1];
        item.classList.toggle('active', id === current);
      });
    }, { passive: true });
  }

  /* ── Image lazy-load with fade ── */
  document.querySelectorAll('img[loading="lazy"]').forEach(img => {
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.4s ease';
    img.addEventListener('load', () => { img.style.opacity = '1'; });
    if (img.complete) img.style.opacity = '1';
  });

  /* ── Scroll-reveal for stat tiles ── */
  document.querySelectorAll('.hero__stats-card, .stat-tile').forEach((el, i) => {
    el.style.animationDelay = `${i * 100}ms`;
    el.classList.add('animate-scale-in');
    el.style.animationPlayState = 'paused';
  });

})();
