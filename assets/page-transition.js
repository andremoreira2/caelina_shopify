(() => {
  const body = document.body;
  const overlay = document.querySelector("[data-page-transition]");

  if (!body || !overlay) return;

  const ENTERED_CLASS = "page-transition-entered";
  const FADING_OUT_CLASS = "page-transition-fading-out";
  const EXITING_CLASS = "page-transition-exiting";
  const EXIT_DURATION_MS = 360;
  const FADE_OUT_DURATION_MS = 520;
  const ENTRY_MIN_MS = 220;
  const ENTRY_MAX_WAIT_MS = 2200;
  const HOME_PATHS = new Set(["/", "/pages/home"]);
  let isExiting = false;
  let fadeOutToken = 0;
  let fadeOutTimer = 0;

  const wait = (ms) => new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

  const withTimeout = (promise, timeoutMs) => Promise.race([
    promise,
    wait(timeoutMs),
  ]);

  const decodeImage = (image) => {
    if (!(image instanceof HTMLImageElement)) {
      return Promise.resolve();
    }

    if (image.complete && image.naturalWidth > 0) {
      if (typeof image.decode === "function") {
        return image.decode().catch(() => {});
      }

      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const cleanup = () => {
        image.removeEventListener("load", handleLoad);
        image.removeEventListener("error", handleDone);
      };

      const handleDone = () => {
        cleanup();
        resolve();
      };

      const handleLoad = () => {
        cleanup();

        if (typeof image.decode === "function") {
          image.decode().catch(() => {}).finally(resolve);
          return;
        }

        resolve();
      };

      image.addEventListener("load", handleLoad, { once: true });
      image.addEventListener("error", handleDone, { once: true });
    });
  };

  const isVisibleCandidate = (image) => {
    const rect = image.getBoundingClientRect();

    if (rect.width < 32 || rect.height < 32) return false;
    if (rect.bottom <= 0 || rect.right <= 0) return false;
    if (rect.top >= window.innerHeight * 1.35) return false;

    return true;
  };

  const normalizePath = (pathname) => {
    if (!pathname) return "/";
    const normalized = pathname.replace(/\/+$/, "");
    return normalized || "/";
  };

  const isHomeExperience = () => (
    body.classList.contains("template-home") || body.classList.contains("template-index")
  );

  const isHomeDestination = (pathname) => HOME_PATHS.has(normalizePath(pathname));

  const getCriticalImages = () => {
    let images = [];

    if (body.classList.contains("template-product")) {
      images = Array.from(document.querySelectorAll("[data-product-gallery] img")).slice(0, 2);
      return images;
    }

    if (body.classList.contains("template-collection")) {
      const switcherImages = Array.from(document.querySelectorAll(".collection-switcher__image"));
      if (switcherImages.length) {
        return switcherImages.filter(isVisibleCandidate).slice(0, 4);
      }
    }

    const eagerImages = Array.from(document.querySelectorAll("img[loading=\"eager\"]"));
    const visibleEagerImages = eagerImages.filter(isVisibleCandidate).slice(0, 4);

    if (visibleEagerImages.length) {
      return visibleEagerImages;
    }

    return Array.from(document.images).filter(isVisibleCandidate).slice(0, 2);
  };

  const waitForCriticalAssets = () => {
    const images = getCriticalImages();

    if (!images.length) {
      return wait(120);
    }

    return withTimeout(
      Promise.all(images.map((image) => decodeImage(image))),
      ENTRY_MAX_WAIT_MS
    );
  };

  const clearFadeOutTimer = () => {
    if (!fadeOutTimer) return;
    window.clearTimeout(fadeOutTimer);
    fadeOutTimer = 0;
  };

  const finishFadeOut = (token) => {
    if (token !== fadeOutToken || isExiting) return;

    clearFadeOutTimer();
    body.classList.remove(FADING_OUT_CLASS);
    body.classList.add(ENTERED_CLASS);
  };

  const beginFadeOut = () => {
    fadeOutToken += 1;
    const token = fadeOutToken;

    clearFadeOutTimer();
    body.classList.remove(EXITING_CLASS, ENTERED_CLASS, FADING_OUT_CLASS);

    const handleTransitionEnd = (event) => {
      if (event.target !== overlay || event.propertyName !== "opacity") return;
      overlay.removeEventListener("transitionend", handleTransitionEnd);
      finishFadeOut(token);
    };

    overlay.addEventListener("transitionend", handleTransitionEnd);

    fadeOutTimer = window.setTimeout(() => {
      overlay.removeEventListener("transitionend", handleTransitionEnd);
      finishFadeOut(token);
    }, FADE_OUT_DURATION_MS);

    window.requestAnimationFrame(() => {
      if (token !== fadeOutToken || isExiting) return;
      body.classList.add(FADING_OUT_CLASS);
    });
  };

  const enterPage = async (options = {}) => {
    isExiting = false;
    body.classList.remove(EXITING_CLASS);

    if (!(options && options.skipAssetWait)) {
      await Promise.all([
        wait(ENTRY_MIN_MS),
        waitForCriticalAssets(),
      ]);
    }

    beginFadeOut();
  };

  const shouldHandleLink = (link, event) => {
    if (!(link instanceof HTMLAnchorElement)) return false;
    if (event.defaultPrevented || isExiting) return false;
    if (isHomeExperience()) return false;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    if (link.target && link.target !== "_self") return false;
    if (link.hasAttribute("download")) return false;
    if (link.matches("[data-cart-toggle], [href=\"/search\"]")) return false;
    if (link.closest("[data-page-transition=\"off\"]")) return false;

    const href = link.getAttribute("href");
    if (!href) return false;

    const trimmedHref = href.trim();
    if (!trimmedHref || trimmedHref.startsWith("#")) return false;
    if (trimmedHref.startsWith("mailto:") || trimmedHref.startsWith("tel:") || trimmedHref.startsWith("javascript:")) {
      return false;
    }

    let url = null;

    try {
      url = new URL(link.href, window.location.href);
    } catch (error) {
      return false;
    }

    if (url.origin !== window.location.origin) return false;
    if (isHomeDestination(url.pathname)) return false;
    if (url.pathname === window.location.pathname && url.search === window.location.search) return false;

    return true;
  };

  const startExit = (href) => {
    isExiting = true;
    fadeOutToken += 1;
    clearFadeOutTimer();
    body.classList.remove(ENTERED_CLASS, FADING_OUT_CLASS);
    body.classList.add(EXITING_CLASS);

    window.setTimeout(() => {
      window.location.assign(href);
    }, EXIT_DURATION_MS);

    window.setTimeout(() => {
      if (document.visibilityState !== "hidden") {
        enterPage({ skipAssetWait: true });
      }
    }, EXIT_DURATION_MS + 1200);
  };

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const link = target.closest("a[href]");
    if (!shouldHandleLink(link, event)) return;

    event.preventDefault();
    startExit(link.href);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enterPage, { once: true });
  } else {
    enterPage();
  }

  window.addEventListener("pageshow", () => {
    enterPage({ skipAssetWait: true });
  });
})();
