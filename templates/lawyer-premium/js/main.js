/* ========================================
   LexPrime - Main JavaScript
   ======================================== */

document.addEventListener('DOMContentLoaded', function() {
  
  // ===== LOADER =====
  const loader = document.getElementById('loader');
  if (loader) {
    const progress = document.getElementById('loaderProgress');
    let width = 0;
    const interval = setInterval(() => {
      width += Math.random() * 30 + 10;
      if (width >= 100) {
        width = 100;
        clearInterval(interval);
        setTimeout(() => {
          loader.style.opacity = '0';
          setTimeout(() => {
            loader.style.display = 'none';
            initAnimations();
          }, 300);
        }, 300);
      }
      progress.style.width = width + '%';
    }, 150);
  } else {
    initAnimations();
  }
  
  // ===== MOBILE MENU =====
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const mobileMenu = document.querySelector('.mobile-menu');
  const mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');
  
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('active');
      mobileMenuOverlay?.classList.toggle('active');
    });
    
    mobileMenuOverlay?.addEventListener('click', () => {
      mobileMenu.classList.remove('active');
      mobileMenuOverlay.classList.remove('active');
    });
    
    // Close menu when clicking on links
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        mobileMenuOverlay?.classList.remove('active');
      });
    });
  }
  
  // ===== NAVBAR SCROLL =====
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }, { passive: true });
  }
  
  // ===== STATS COUNTER =====
  const statNumbers = document.querySelectorAll('.stat-number[data-target]');
  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = parseInt(entry.target.dataset.target);
        animateCounter(entry.target, target);
        countObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  
  statNumbers.forEach(stat => countObserver.observe(stat));
  
  function animateCounter(element, target) {
    let current = 0;
    const increment = target / 50;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        element.textContent = target + (element.dataset.suffix || '');
        clearInterval(timer);
      } else {
        element.textContent = Math.floor(current) + (element.dataset.suffix || '');
      }
    }, 30);
  }
  
  // ===== SCROLL REVEAL =====
  const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  
  revealElements.forEach(el => revealObserver.observe(el));
  
  // ===== SMOOTH SCROLL FOR ANCHORS =====
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        const offset = 80;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
  
  // ===== CONTACT FORM =====
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const btn = this.querySelector('.btn-submit');
      const originalText = btn.textContent;
      
      btn.textContent = 'Se trimite...';
      btn.disabled = true;
      
      setTimeout(() => {
        btn.textContent = 'Trimis cu succes!';
        btn.style.background = '#10b981';
        
        setTimeout(() => {
          btn.textContent = originalText;
          btn.disabled = false;
          btn.style.background = '';
          contactForm.reset();
        }, 2000);
      }, 1500);
    });
  }
  
  // ===== PARALLAX EFFECT =====
  if (!window.matchMedia('(pointer: coarse)').matches) {
    const parallaxElements = document.querySelectorAll('.hero-orb');
    window.addEventListener('mousemove', (e) => {
      const mouseX = e.clientX / window.innerWidth - 0.5;
      const mouseY = e.clientY / window.innerHeight - 0.5;
      
      parallaxElements.forEach((el, index) => {
        const speed = (index + 1) * 20;
        el.style.transform = `translate(${mouseX * speed}px, ${mouseY * speed}px)`;
      });
    }, { passive: true });
  }
  
});

// ===== ANIMATIONS INITIALIZATION =====
function initAnimations() {
  // Elements are already visible by default (CSS), add subtle entrance animations
  const heroElements = document.querySelectorAll('.hero-badge, .hero-title, .hero-desc, .hero-buttons');
  heroElements.forEach((el, index) => {
    // Only animate if not already animated
    if (!el.classList.contains('animated')) {
      el.classList.add('animated');
      el.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
      // Small subtle animation from slightly below
      el.style.transform = 'translateY(10px)';
      setTimeout(() => {
        el.style.transform = 'translateY(0)';
      }, index * 100);
    }
  });
}

// ===== UTILITY FUNCTIONS =====
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
