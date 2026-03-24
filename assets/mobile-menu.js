(() => {
  const menu = document.querySelector("[data-mobile-menu]");
  const panel = menu ? menu.querySelector(".mobile-menu__panel") : null;
  const toggles = document.querySelectorAll("[data-mobile-menu-toggle]");
  const closeTargets = menu ? menu.querySelectorAll("[data-mobile-menu-close]") : [];
  const mobileMedia = window.matchMedia("(max-width: 980px)");
  const focusableSelector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled]):not([type='hidden'])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
  ].join(", ");

  if (!menu || !panel || toggles.length === 0) return;

  let lastFocusedElement = null;

  const isOpen = () => menu.classList.contains("is-open");

  const getFocusableElements = () => (
    Array.from(panel.querySelectorAll(focusableSelector)).filter((element) => (
      element instanceof HTMLElement
      && !element.hasAttribute("disabled")
      && !element.getAttribute("aria-hidden")
      && (element.offsetWidth > 0 || element.offsetHeight > 0 || element.getClientRects().length > 0)
    ))
  );

  const setMenuState = (expanded) => {
    menu.classList.toggle("is-open", expanded);
    menu.setAttribute("aria-hidden", expanded ? "false" : "true");
    document.body.classList.toggle("mobile-menu-open", expanded);
    toggles.forEach((toggle) => {
      toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    });
  };

  const openMenu = () => {
    if (isOpen() || !mobileMedia.matches) return;
    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.scrollTop = 0;
    setMenuState(true);
    window.requestAnimationFrame(() => {
      const focusableElements = getFocusableElements();
      const focusTarget = focusableElements[0] || panel;
      focusTarget.focus();
    });
  };

  const closeMenu = ({ restoreFocus = true } = {}) => {
    if (!isOpen()) return;
    setMenuState(false);

    if (
      restoreFocus
      && lastFocusedElement
      && document.documentElement.contains(lastFocusedElement)
    ) {
      lastFocusedElement.focus();
    }
  };

  const handleToggleClick = (event) => {
    event.preventDefault();

    if (isOpen()) {
      closeMenu();
      return;
    }

    openMenu();
  };

  const handleKeydown = (event) => {
    if (!isOpen()) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key !== "Tab") return;

    const focusableElements = getFocusableElements();

    if (focusableElements.length === 0) {
      event.preventDefault();
      panel.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  const handleViewportChange = (event) => {
    if (event.matches || !isOpen()) return;
    closeMenu({ restoreFocus: false });
  };

  toggles.forEach((toggle) => {
    toggle.addEventListener("click", handleToggleClick);
  });

  closeTargets.forEach((element) => {
    element.addEventListener("click", () => {
      const restoreFocus = !(element instanceof HTMLAnchorElement);
      closeMenu({ restoreFocus });
    });
  });

  document.addEventListener("keydown", handleKeydown);

  if (typeof mobileMedia.addEventListener === "function") {
    mobileMedia.addEventListener("change", handleViewportChange);
  } else if (typeof mobileMedia.addListener === "function") {
    mobileMedia.addListener(handleViewportChange);
  }
})();
