(() => {
  const selector = "[data-scroll-reveal]";
  const rootClass = "scroll-enter-enabled";
  const preparedClass = "is-scroll-enter-prepared";
  const visibleClass = "is-scroll-enter-visible";
  const ignoredParentSelector = "[data-shop-the-look], [data-stl-section]";
  const observed = new WeakSet();
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let observer = null;

  const parseDelay = (value) => {
    if (!value) return "";

    const trimmed = String(value).trim();
    if (/^\d*\.?\d+(ms|s)$/.test(trimmed)) return trimmed;

    const number = Number(trimmed);
    if (!Number.isFinite(number) || number <= 0) return "";

    return `${number <= 10 ? number * 80 : number}ms`;
  };

  const shouldIgnore = (element) => Boolean(element.closest(ignoredParentSelector));

  const prepare = (element) => {
    const delay = parseDelay(element.dataset.scrollRevealDelay);

    if (delay) {
      element.style.setProperty("--scroll-enter-delay", delay);
    }

    element.classList.add(preparedClass);
  };

  const reveal = (element) => {
    element.classList.add(visibleClass);

    if (observer) {
      observer.unobserve(element);
    }
  };

  const getElements = (root) => {
    const elements = [];

    if (root.matches?.(selector)) {
      elements.push(root);
    }

    root.querySelectorAll?.(selector).forEach((element) => {
      elements.push(element);
    });

    return elements.filter((element) => !shouldIgnore(element));
  };

  const revealAll = () => {
    getElements(document).forEach((element) => {
      prepare(element);
      reveal(element);
    });
  };

  const getObserver = () => {
    if (observer) return observer;

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            reveal(entry.target);
          }
        });
      },
      {
        threshold: 0.14,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    return observer;
  };

  const init = (root = document) => {
    const elements = getElements(root);
    if (!elements.length) return;

    if (prefersReducedMotion.matches || typeof IntersectionObserver === "undefined") {
      revealAll();
      return;
    }

    document.documentElement.classList.add(rootClass);
    const enterObserver = getObserver();

    elements.forEach((element) => {
      if (observed.has(element)) return;

      observed.add(element);
      prepare(element);
      enterObserver.observe(element);
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init(), { once: true });
  } else {
    init();
  }

  document.addEventListener("shopify:section:load", (event) => init(event.target));

  if (typeof prefersReducedMotion.addEventListener === "function") {
    prefersReducedMotion.addEventListener("change", (event) => {
      if (event.matches) {
        revealAll();
      }
    });
  }
})();
