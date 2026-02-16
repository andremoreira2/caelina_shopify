(function initHeaderScrollState() {
  var header = document.querySelector('.site-header');
  if (!header) return;
  var body = document.body;
  var isHomeTemplate = body.classList.contains('template-home') || body.classList.contains('template-index');
  var homeCollectionsSection = isHomeTemplate ? document.querySelector('[data-home-collections]') : null;

  var homeShrinkFallbackStart = 650;
  var homeShrinkRange = 40;
  var shrinkStart = isHomeTemplate ? homeShrinkFallbackStart : 150;
  var shrinkEnd = isHomeTemplate ? homeShrinkFallbackStart + homeShrinkRange : 190;
  var shrinkDistance = Math.max(1, shrinkEnd - shrinkStart);
  var ticking = false;

  if (!isHomeTemplate) {
    header.classList.add('site-header--fixed');
    body.classList.add('has-fixed-header');
  }

  function updateShrinkThresholds() {
    if (!isHomeTemplate) return;
    if (!homeCollectionsSection) {
      shrinkStart = homeShrinkFallbackStart;
      shrinkEnd = homeShrinkFallbackStart + homeShrinkRange;
      shrinkDistance = Math.max(1, shrinkEnd - shrinkStart);
      return;
    }

    var scrollY = window.scrollY || window.pageYOffset || 0;
    var sectionTop = homeCollectionsSection.getBoundingClientRect().top + scrollY;
    var headerHeight = Math.ceil(header.getBoundingClientRect().height);
    var calculatedStart = Math.max(0, Math.round(sectionTop - headerHeight));
    shrinkStart = calculatedStart;
    shrinkEnd = calculatedStart + homeShrinkRange;
    shrinkDistance = Math.max(1, shrinkEnd - shrinkStart);
  }

  function updateHeaderOffset() {
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
    updateShrinkThresholds();
    applyHeaderState();
    updateHeaderOffset();
  }

  updateShrinkThresholds();
  applyHeaderState();
  updateHeaderOffset();
  window.addEventListener('load', function () {
    updateShrinkThresholds();
    applyHeaderState();
    updateHeaderOffset();
  });
  window.addEventListener('scroll', updateHeaderState, { passive: true });
  window.addEventListener('resize', handleResize);
})();
