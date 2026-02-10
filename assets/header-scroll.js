(function initHeaderScrollState() {
  var header = document.querySelector('.site-header');
  if (!header) return;

  var body = document.body;
  var startsTransparent = body.classList.contains('template-home') || body.classList.contains('template-index');
  if (!startsTransparent) return;

  var shrinkStart = 650;
  var shrinkEnd = 690;
  var shrinkDistance = Math.max(1, shrinkEnd - shrinkStart);
  var ticking = false;

  function applyHeaderState() {
    var scrollY = window.scrollY || window.pageYOffset || 0;
    var isScrolled = scrollY > shrinkStart;
    var progress = Math.min(Math.max((scrollY - shrinkStart) / shrinkDistance, 0), 1);

    header.classList.toggle('is-scrolled', isScrolled);
    header.style.setProperty('--header-shrink-progress', progress.toFixed(3));
    ticking = false;
  }

  function updateHeaderState() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(applyHeaderState);
  }

  applyHeaderState();
  window.addEventListener('scroll', updateHeaderState, { passive: true });
  window.addEventListener('resize', applyHeaderState);
})();
