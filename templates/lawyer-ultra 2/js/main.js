// Main JavaScript for Lawyer Ultra Template

// Loader
document.addEventListener('DOMContentLoaded', () => {
    const loader = document.getElementById('loader');
    
    setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
        }, 500);
    }, 2000);
});

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Mobile menu
document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
});

// GSAP Animations
gsap.registerPlugin(ScrollTrigger);

// Hero animations (only on homepage)
if (document.querySelector('.hero')) {
    gsap.from('.hero-badge', {
        opacity: 0,
        y: 30,
        duration: 1,
        delay: 2.2,
        ease: 'power3.out'
    });

    gsap.from('.hero-title', {
        opacity: 0,
        y: 50,
        duration: 1.2,
        delay: 2.4,
        ease: 'power3.out'
    });

    gsap.from('.hero-description', {
        opacity: 0,
        y: 30,
        duration: 1,
        delay: 2.6,
        ease: 'power3.out'
    });

    gsap.from('.hero-buttons', {
        opacity: 0,
        y: 30,
        duration: 1,
        delay: 2.8,
        ease: 'power3.out'
    });

    gsap.from('.hero-image', {
        opacity: 0,
        x: 100,
        duration: 1.5,
        delay: 2,
        ease: 'power3.out'
    });

    gsap.from('.stat-item', {
        opacity: 0,
        y: 30,
        duration: 0.8,
        delay: 3,
        stagger: 0.15,
        ease: 'power3.out'
    });

    gsap.from('.gold-line', {
        scaleX: 0,
        transformOrigin: 'left center',
        duration: 1,
        delay: 2.5,
        ease: 'power3.out'
    });
}

// Services section animations
if (document.querySelector('.services')) {
    gsap.from('.services .section-header', {
        scrollTrigger: {
            trigger: '.services',
            start: 'top 80%',
        },
        opacity: 0,
        y: 50,
        duration: 1,
        ease: 'power3.out'
    });

    gsap.from('.service-card', {
        scrollTrigger: {
            trigger: '.services-grid',
            start: 'top 80%',
        },
        opacity: 0,
        y: 50,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out'
    });
}

// About section animations
if (document.querySelector('.about')) {
    gsap.from('.about-image', {
        scrollTrigger: {
            trigger: '.about',
            start: 'top 70%',
        },
        opacity: 0,
        x: -50,
        duration: 1.2,
        ease: 'power3.out'
    });

    gsap.from('.about-content', {
        scrollTrigger: {
            trigger: '.about',
            start: 'top 70%',
        },
        opacity: 0,
        x: 50,
        duration: 1.2,
        ease: 'power3.out'
    });
}

// Testimonials animations
if (document.querySelector('.testimonials')) {
    gsap.from('.testimonials .section-header', {
        scrollTrigger: {
            trigger: '.testimonials',
            start: 'top 80%',
        },
        opacity: 0,
        y: 50,
        duration: 1,
        ease: 'power3.out'
    });

    gsap.from('.testimonial-card', {
        scrollTrigger: {
            trigger: '.testimonials-grid',
            start: 'top 80%',
        },
        opacity: 0,
        y: 50,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power3.out'
    });
}

// CTA animation
if (document.querySelector('.cta-section')) {
    gsap.from('.cta-content', {
        scrollTrigger: {
            trigger: '.cta-section',
            start: 'top 80%',
        },
        opacity: 0,
        y: 50,
        duration: 1,
        ease: 'power3.out'
    });
}

// Service detail cards animation
if (document.querySelector('.service-detail-card')) {
    gsap.from('.service-detail-card', {
        scrollTrigger: {
            trigger: '.services-detailed',
            start: 'top 80%',
        },
        opacity: 0,
        y: 50,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power3.out'
    });
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
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

// Active navigation link
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a').forEach(link => {
    if (link.getAttribute('href').includes(currentPage)) {
        link.classList.add('active');
    }
});
