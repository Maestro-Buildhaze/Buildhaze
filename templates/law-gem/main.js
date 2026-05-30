// LAW GEM - Main JavaScript

// Custom Cursor
const cursor = document.querySelector('.cursor');
const links = document.querySelectorAll('a, button, .btn, input, textarea, select');

if (cursor && window.matchMedia('(pointer: fine)').matches) {
  document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
  });
  
  links.forEach(link => {
    link.addEventListener('mouseenter', () => cursor.classList.add('hover'));
    link.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
  });
}

// Navbar Scroll Effect
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
}

// Reveal Animation on Scroll
const revealElements = document.querySelectorAll('.reveal');
const revealOnScroll = () => {
  revealElements.forEach(el => {
    const windowHeight = window.innerHeight;
    const elementTop = el.getBoundingClientRect().top;
    const elementVisible = 150;
    
    if (elementTop < windowHeight - elementVisible) {
      el.classList.add('active');
    }
  });
};

window.addEventListener('scroll', revealOnScroll);
window.addEventListener('load', revealOnScroll);

// Smooth Scroll for Anchor Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Contact Form Handler
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const formData = new FormData(contactForm);
    const data = Object.fromEntries(formData);
    
    // Simulate form submission
    const btn = contactForm.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Se trimite...';
    btn.disabled = true;
    
    setTimeout(() => {
      alert('Mulțumim! Cererea ta a fost trimisă. Te contactăm în maximum 24 de ore.');
      contactForm.reset();
      btn.textContent = originalText;
      btn.disabled = false;
    }, 1500);
  });
}

// Mobile Menu Toggle (if needed)
const mobileToggle = document.getElementById('mobileToggle');
if (mobileToggle) {
  mobileToggle.addEventListener('click', () => {
    const navLinks = document.querySelector('.nav-links');
    navLinks.classList.toggle('mobile-open');
  });
}

// Add parallax effect to hero images
const heroImage = document.querySelector('.hero-image img');
if (heroImage) {
  window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    heroImage.style.transform = `translateY(${scrolled * 0.1}px)`;
  });
}

console.log('LAW GEM - Template loaded successfully');
