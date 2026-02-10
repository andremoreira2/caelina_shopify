(function initHeaderScrollState() {
  var header = document.querySelector('.site-header');
  if (!header) return;
  var body = document.body;
  var isHomeTemplate = body.classList.contains('template-home') || body.classList.contains('template-index');

  var shrinkStart = isHomeTemplate ? 650 : 150;
  var shrinkEnd = isHomeTemplate ? 690 : 190;
  var shrinkDistance = Math.max(1, shrinkEnd - shrinkStart);
  var ticking = false;

  if (!isHomeTemplate) {
    header.classList.add('site-header--fixed');
    body.classList.add('has-fixed-header');
  }

  function updateHeaderOffset() {
    if (isHomeTemplate) return;
    var headerHeight = Math.ceil(header.getBoundingClientRect().height);
    body.style.setProperty('--site-header-offset', headerHeight + 'px');
  }

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

  function handleResize() {
    applyHeaderState();
    updateHeaderOffset();
  }

  applyHeaderState();
  updateHeaderOffset();
  window.addEventListener('load', updateHeaderOffset);
  window.addEventListener('scroll', updateHeaderState, { passive: true });
  window.addEventListener('resize', handleResize);
})();
