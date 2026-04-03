(function initHeaderScrollState() {
  var header = document.querySelector('.site-header');
  if (!header) return;
  var body = document.body;
  var hasHeroHeader = body.classList.contains('template-home') || body.classList.contains('template-index');
  var homeCollectionsSection = hasHeroHeader ? document.querySelector('[data-home-collections]') : null;

  var homeShrinkFallbackStart = 650;
  var homeShrinkRange = 40;
  var shrinkStart = hasHeroHeader ? homeShrinkFallbackStart : 0;
  var shrinkEnd = hasHeroHeader ? homeShrinkFallbackStart + homeShrinkRange : 1;
  var shrinkDistance = Math.max(1, shrinkEnd - shrinkStart);
  var ticking = false;

  if (!hasHeroHeader) {
    header.classList.add('site-header--fixed');
    body.classList.add('has-fixed-header');
  }

  function updateShrinkThresholds() {
    if (!hasHeroHeader) return;
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
    var headerHeight = header.getBoundingClientRect().height;
    body.style.setProperty('--site-header-offset', headerHeight + 'px');
    body.style.setProperty('--site-header-current-offset', headerHeight + 'px');
  }

  function updateCurrentHeaderOffset() {
    var headerHeight = header.getBoundingClientRect().height;
    body.style.setProperty('--site-header-current-offset', headerHeight + 'px');
  }

  function applyHeaderState() {
    var scrollY = window.scrollY || window.pageYOffset || 0;
    var isScrolled = hasHeroHeader ? scrollY > shrinkStart : true;
    var progress = hasHeroHeader ? Math.min(Math.max((scrollY - shrinkStart) / shrinkDistance, 0), 1) : 1;

    header.classList.toggle('is-scrolled', isScrolled);
    header.style.setProperty('--header-shrink-progress', progress.toFixed(3));
    updateCurrentHeaderOffset();
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
