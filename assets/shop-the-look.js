(() => {
  const roots = [...document.querySelectorAll("[data-shop-the-look]")];
  if (!roots.length) return;

  const CARD_SCROLL_OFFSET = 120;

  const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  roots.forEach((root) => {
    const dots = [...root.querySelectorAll("[data-stl-dot]")];
    const cards = [...root.querySelectorAll("[data-stl-card]")];
    const panel = root.querySelector(".shop-the-look__panel");
    if (!dots.length || !cards.length) return;

    let activeIndex = -1;
    let rafPending = false;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobileLayout = window.matchMedia("(max-width: 900px)");
    let lastTouchY = 0;
    let hasTouchTracking = false;

    const setActive = (nextIndex) => {
      if (activeIndex === nextIndex) return;
      activeIndex = nextIndex;

      dots.forEach((dot) => {
        const active = toNumber(dot.dataset.index) === nextIndex;
        dot.classList.toggle("is-active", active);
        dot.setAttribute("aria-pressed", active ? "true" : "false");
      });

      cards.forEach((card) => {
        const active = toNumber(card.dataset.index) === nextIndex;
        card.classList.toggle("is-active", active);
      });
    };

    const getNearestCardIndex = () => {
      let bestIndex = activeIndex >= 0 ? activeIndex : toNumber(cards[0].dataset.index);
      let bestDistance = Infinity;

      if (mobileLayout.matches && panel) {
        const panelRect = panel.getBoundingClientRect();
        const targetX = panelRect.left + panelRect.width * 0.35;

        cards.forEach((card) => {
          const rect = card.getBoundingClientRect();
          if (rect.right <= panelRect.left || rect.left >= panelRect.right) return;

          const distance = Math.abs(rect.left - targetX);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = toNumber(card.dataset.index);
          }
        });

        return bestIndex;
      }

      const targetY = window.innerHeight * 0.32;
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;

        const distance = Math.abs(rect.top - targetY);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = toNumber(card.dataset.index);
        }
      });

      return bestIndex;
    };

    const findCardByIndex = (nextIndex) =>
      cards.find((card) => toNumber(card.dataset.index) === nextIndex) || null;

    const scrollToCard = (nextIndex) => {
      const target = findCardByIndex(nextIndex);
      if (!target) return;

      if (mobileLayout.matches && panel) {
        if (root.classList.contains("shop-the-look--sticky-enabled")) {
          // Sticky mode: scroll window to the point where this card is visible
          // The mapping is: scrollTop = rootTop + translateX
          // translateX needed: target.offsetLeft
          const rootTop = window.scrollY + root.getBoundingClientRect().top;
          const targetOffset = target.offsetLeft;
          // Center the card if possible? 
          // The logic maps scroll 1:1. 
          // So if we scroll to rootTop + targetOffset, the panel translates by targetOffset.
          // Then target is at left edge of visibility.
          const targetScrollY = rootTop + targetOffset;

          window.scrollTo({
            top: Math.max(0, targetScrollY),
            behavior: prefersReducedMotion ? "auto" : "smooth",
          });
        } else {
          // Fallback if sticky disabled (content too small)
          const targetLeft = panel.scrollLeft + target.getBoundingClientRect().left - panel.getBoundingClientRect().left;
          panel.scrollTo({
            left: Math.max(0, targetLeft),
            behavior: prefersReducedMotion ? "auto" : "smooth",
          });
        }
        return;
      }

      const targetTop = window.scrollY + target.getBoundingClientRect().top - CARD_SCROLL_OFFSET;
      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    };

    const syncActiveFromScroll = () => {
      const sectionRect = root.getBoundingClientRect();
      if (sectionRect.bottom <= 0 || sectionRect.top >= window.innerHeight) return;

      // If sticky mode, we calculate generic active index based on transform/scroll
      if (mobileLayout.matches && root.classList.contains("shop-the-look--sticky-enabled")) {
        // Calculate based on current translate
        // currentOffset = -rect.top basically
        const currentOffset = Math.max(0, -sectionRect.top);

        let bestIndex = -1;
        let bestDiff = Infinity;

        cards.forEach((card) => {
          const diff = Math.abs(card.offsetLeft - currentOffset);
          if (diff < bestDiff) {
            bestDiff = diff;
            bestIndex = toNumber(card.dataset.index);
          }
        });

        if (bestIndex >= 0) setActive(bestIndex);
        return;
      }

      setActive(getNearestCardIndex());
    };

    const getPanelMaxScroll = () => {
      if (!panel) return 0;
      return Math.max(0, panel.scrollWidth - panel.clientWidth);
    };

    const onTouchStart = (event) => {
      if (!mobileLayout.matches || !panel) return;
      if (root.classList.contains("shop-the-look--sticky-enabled")) return;

      if (!event.touches || event.touches.length !== 1) return;
      hasTouchTracking = true;

      const touch = event.touches[0];
      lastTouchY = touch.clientY;
    };

    const onTouchMove = (event) => {
      if (!mobileLayout.matches || !panel) return;
      if (root.classList.contains("shop-the-look--sticky-enabled")) return; // Disable interference

      if (!event.touches || event.touches.length !== 1) return;
      if (!hasTouchTracking) return;

      const sectionRect = root.getBoundingClientRect();
      if (sectionRect.bottom <= 0 || sectionRect.top >= window.innerHeight) return;

      const maxScroll = getPanelMaxScroll();
      if (maxScroll <= 0) return;

      const touch = event.touches[0];
      const deltaY = touch.clientY - lastTouchY;
      if (Math.abs(deltaY) <= 0.1) return;
      const nextLeft = Math.max(0, Math.min(maxScroll, panel.scrollLeft - deltaY));
      panel.scrollLeft = nextLeft;
      lastTouchY = touch.clientY;
    };

    const onTouchEnd = () => {
      hasTouchTracking = false;
    };

    const onWheel = (event) => {
      if (!mobileLayout.matches || !panel) return;
      if (root.classList.contains("shop-the-look--sticky-enabled")) return; // Disable interference

      const maxScroll = getPanelMaxScroll();
      if (maxScroll <= 0) return;

      const sectionRect = root.getBoundingClientRect();
      if (sectionRect.bottom <= 0 || sectionRect.top >= window.innerHeight) return;

      const mostlyVertical = Math.abs(event.deltaY) >= Math.abs(event.deltaX);
      if (!mostlyVertical || Math.abs(event.deltaY) < 0.5) return;

      const nextLeft = Math.max(0, Math.min(maxScroll, panel.scrollLeft + event.deltaY));
      panel.scrollLeft = nextLeft;
    };

    const handleScroll = () => {
      if (rafPending) return;
      rafPending = true;
      window.requestAnimationFrame(() => {
        rafPending = false;
        syncActiveFromScroll();
      });
    };

    dots.forEach((dot) => {
      const index = toNumber(dot.dataset.index);
      const activateFromDot = () => {
        setActive(index);
        scrollToCard(index);
      };
      dot.addEventListener("click", activateFromDot);
      dot.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activateFromDot();
        }
      });
    });

    const initialDot = dots.find((dot) => dot.classList.contains("is-active")) || dots[0];
    setActive(toNumber(initialDot.dataset.index));
    syncActiveFromScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    panel?.addEventListener("scroll", handleScroll, { passive: true });
    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: true });
    root.addEventListener("touchend", onTouchEnd, { passive: true });
    root.addEventListener("touchcancel", onTouchEnd, { passive: true });
    root.addEventListener("wheel", onWheel, { passive: true });

    cards.forEach((card) => {
      const select = card.querySelector("[data-stl-variant-select]");
      if (!select) return;

      const variantIdInput = card.querySelector("[data-stl-variant-id]");
      const addButton = card.querySelector("[data-stl-add-button]");
      const addText = card.querySelector("[data-stl-add-text]");
      const priceValue = card.querySelector("[data-stl-price]");
      const compareValue = card.querySelector("[data-stl-compare]");

      const syncVariant = () => {
        const selected = select.selectedOptions ? select.selectedOptions[0] : null;
        if (!selected) return;

        if (variantIdInput) variantIdInput.value = selected.value;

        const available = selected.dataset.available === "true";
        if (addButton) addButton.disabled = !available;
        if (addText) addText.textContent = available ? "Add to cart" : "Sold out";

        if (priceValue && selected.dataset.price) {
          priceValue.textContent = selected.dataset.price;
        }

        if (compareValue) {
          const priceAmount = toNumber(selected.dataset.priceAmount);
          const compareAmount = toNumber(selected.dataset.compareAmount);
          if (compareAmount > priceAmount && selected.dataset.compare) {
            compareValue.textContent = selected.dataset.compare;
            compareValue.hidden = false;
          } else {
            compareValue.hidden = true;
          }
        }
      };

      select.addEventListener("change", syncVariant);
      syncVariant();
    });

    /* =========================================
       Mobile Scroll Hijacking (Sticky Behavior)
       ========================================= */
    const initMobileScroll = () => {
      if (!mobileLayout.matches) {
        root.classList.remove("shop-the-look--sticky-enabled");
        root.style.height = "";
        panel.style.transform = "";
        return;
      }

      // 1. Reset sticky class before measuring so scrollWidth is accurate
      root.classList.remove("shop-the-look--sticky-enabled");
      root.style.height = "";
      panel.style.transform = "";

      // Force a layout reflow so the browser recalculates dimensions
      // without the sticky CSS applied
      void panel.offsetWidth;

      const scrollWidth = panel.scrollWidth;
      const clientWidth = panel.clientWidth;
      const scrollableDistance = scrollWidth - clientWidth;

      // If content fits, no need to hijack
      if (scrollableDistance <= 0) {
        // Remove stale handler if any
        if (root._mobileScrollHandler) {
          window.removeEventListener("scroll", root._mobileScrollHandler);
          root._mobileScrollHandler = null;
        }
        return;
      }

      // 2. Enable Sticky Mode
      root.classList.add("shop-the-look--sticky-enabled");

      // Force reset any native scroll that might have happened
      panel.scrollLeft = 0;

      // 3. Set Section Height
      // height = viewport height (sticky "screen") + scrollable distance
      // As user scrolls through scrollableDistance px vertically,
      // we translate scrollableDistance px horizontally.
      const viewportHeight = window.innerHeight;
      root.style.height = `${viewportHeight + scrollableDistance}px`;

      // 4. Build scroll handler — capture fresh scrollableDistance in closure
      const onGlobalScroll = () => {
        if (!mobileLayout.matches) return;
        const rect = root.getBoundingClientRect();
        const offset = -rect.top;
        const translateX = Math.max(0, Math.min(scrollableDistance, offset));
        panel.style.transform = `translate3d(-${translateX}px, 0, 0)`;
      };

      // Remove any previously registered handler before adding the new one
      // (important on resize: scrollableDistance changes, so we need a fresh closure)
      if (root._mobileScrollHandler) {
        window.removeEventListener("scroll", root._mobileScrollHandler);
      }
      root._mobileScrollHandler = onGlobalScroll;
      window.addEventListener("scroll", onGlobalScroll, { passive: true });

      // Initial sync
      onGlobalScroll();
    };

    // Re-calc on resize (debounced via rAF)
    window.addEventListener("resize", () => {
      requestAnimationFrame(initMobileScroll);
    });

    // Init: wait for images to load so scrollWidth is accurate.
    // If already complete, run now; otherwise defer to the load event.
    if (document.readyState === "complete") {
      initMobileScroll();
    } else {
      window.addEventListener("load", initMobileScroll, { once: true });
    }
  });
})();
