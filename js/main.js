/* ============================================================
   ONE CARBON — Main JS
   ============================================================ */

// ── Sticky nav shadow on scroll ──
(function () {
  const nav = document.querySelector('.site-nav');
  if (!nav) return;

  function updateNav() {
    if (window.scrollY > 10) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();
})();


// ── Mark current page link as active ──
(function () {
  const links = document.querySelectorAll('.nav-links a');
  const current = window.location.pathname.split('/').pop() || 'index.html';

  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href === current || (current === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
})();
