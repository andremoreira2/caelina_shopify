(() => {
  const revealBreakpoint = 981;
  const revealClass = "site-footer-reveal-enabled";

  const init = () => {
    const page = document.querySelector("[data-site-page]");
    const footer = document.querySelector("[data-site-footer]");

    if (!page || !footer) {
      return;
    }

    let frameId = 0;

    const sync = () => {
      frameId = 0;

      const footerHeight = Math.ceil(footer.getBoundingClientRect().height);
      const canReveal =
        window.innerWidth >= revealBreakpoint &&
        footerHeight > 0 &&
        footerHeight <= window.innerHeight - 40;

      document.documentElement.style.setProperty("--site-footer-height", canReveal ? `${footerHeight}px` : "0px");
      document.body.classList.toggle(revealClass, canReveal);
    };

    const queueSync = () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(sync);
    };

    queueSync();
    window.addEventListener("resize", queueSync, { passive: true });
    window.addEventListener("load", queueSync, { once: true });

    if ("ResizeObserver" in window) {
      const resizeObserver = new ResizeObserver(queueSync);
      resizeObserver.observe(footer);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
    return;
  }

  init();
})();
