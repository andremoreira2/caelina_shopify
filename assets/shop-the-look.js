(() => {
  const roots = [...document.querySelectorAll("[data-shop-the-look]")];
  if (!roots.length) return;

  const DESKTOP_CARD_FOCUS_RATIO = 0.32;
  const STL_MOBILE_BREAKPOINT = 820;
  const STL_SCROLL_LOCK_TOLERANCE = 6;
  const STL_SCROLL_LOCK_IDLE_MS = 140;
  const STL_SCROLL_LOCK_MAX_MS = 2000;

  const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const isOptionAvailable = (option) => option?.dataset?.available === "true";

  let variantModalInstance = null;
  let variantModalContext = null;

  const ensureVariantModal = () => {
    if (variantModalInstance) return variantModalInstance;

    const modalRoot = document.createElement("div");
    modalRoot.className = "shop-the-look-variant-modal";
    modalRoot.hidden = true;
    modalRoot.innerHTML = `
      <button type="button" class="shop-the-look-variant-modal__backdrop" data-stl-modal-close aria-label="Close"></button>
      <div class="shop-the-look-variant-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="stlVariantModalTitle">
        <button type="button" class="shop-the-look-variant-modal__close" data-stl-modal-close aria-label="Close">×</button>
        <p class="shop-the-look-variant-modal__eyebrow">Choose option</p>
        <h3 id="stlVariantModalTitle" class="shop-the-look-variant-modal__title" data-stl-modal-title></h3>
        <label class="shop-the-look-variant-modal__label" for="stlVariantModalSelect">Option</label>
        <select id="stlVariantModalSelect" class="shop-the-look__select shop-the-look-variant-modal__select" data-stl-modal-select></select>
        <div class="price price--feature shop-the-look__price-line shop-the-look-variant-modal__price-line">
          <span class="price__current shop-the-look__price-value" data-stl-modal-price></span>
          <span class="price__compare shop-the-look__price-compare" data-stl-modal-compare hidden></span>
        </div>
        <button type="button" class="btn btn--atc shop-the-look__add shop-the-look-variant-modal__add" data-stl-modal-add>
          <span class="btn-icon" data-stl-modal-add-icon aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          </span>
          <span class="btn-text" data-stl-modal-add-text>Add to cart</span>
        </button>
      </div>
    `;
    document.body.appendChild(modalRoot);

    const modalTitle = modalRoot.querySelector("[data-stl-modal-title]");
    const modalSelect = modalRoot.querySelector("[data-stl-modal-select]");
    const modalPrice = modalRoot.querySelector("[data-stl-modal-price]");
    const modalCompare = modalRoot.querySelector("[data-stl-modal-compare]");
    const modalAddButton = modalRoot.querySelector("[data-stl-modal-add]");
    const modalAddIcon = modalRoot.querySelector("[data-stl-modal-add-icon]");
    const modalAddText = modalRoot.querySelector("[data-stl-modal-add-text]");
    const closeButtons = [...modalRoot.querySelectorAll("[data-stl-modal-close]")];

    const syncModalVariant = () => {
      if (!variantModalContext) return;
      const selected = modalSelect.selectedOptions ? modalSelect.selectedOptions[0] : null;
      if (!selected) return;

      if (modalPrice && selected.dataset.price) {
        modalPrice.textContent = selected.dataset.price;
      }

      if (modalCompare) {
        const priceAmount = toNumber(selected.dataset.priceAmount);
        const compareAmount = toNumber(selected.dataset.compareAmount);
        if (compareAmount > priceAmount && selected.dataset.compare) {
          modalCompare.textContent = selected.dataset.compare;
          modalCompare.hidden = false;
        } else {
          modalCompare.hidden = true;
        }
      }

      const available = isOptionAvailable(selected);
      modalAddButton.disabled = !available;
      if (modalAddIcon) {
        modalAddIcon.hidden = !available;
      }
      if (modalAddText) {
        modalAddText.textContent = available ? "Add to cart" : "Sold out";
      }
    };

    const closeModal = () => {
      if (modalRoot.hidden) return;
      modalRoot.hidden = true;
      document.body.classList.remove("shop-the-look-modal-open");

      if (variantModalContext?.triggerButton) {
        variantModalContext.triggerButton.focus({ preventScroll: true });
      }
      variantModalContext = null;
    };

    const openModal = (context) => {
      variantModalContext = context;
      modalTitle.textContent = context.productTitle || "Choose option";
      modalSelect.innerHTML = "";

      [...context.sourceSelect.options].forEach((option) => {
        const clone = option.cloneNode(true);
        clone.disabled = option.disabled;
        modalSelect.appendChild(clone);
      });

      if (context.sourceSelect.value) {
        modalSelect.value = context.sourceSelect.value;
      }

      if (!modalSelect.value && modalSelect.options.length) {
        const firstAvailable = [...modalSelect.options].find((option) => !option.disabled);
        modalSelect.value = (firstAvailable || modalSelect.options[0]).value;
      }

      modalRoot.hidden = false;
      document.body.classList.add("shop-the-look-modal-open");
      syncModalVariant();

      window.requestAnimationFrame(() => {
        modalSelect.focus();
      });
    };

    closeButtons.forEach((button) => {
      button.addEventListener("click", closeModal);
    });

    modalSelect.addEventListener("change", syncModalVariant);

    modalAddButton.addEventListener("click", () => {
      if (!variantModalContext) return;

      const selected = modalSelect.selectedOptions ? modalSelect.selectedOptions[0] : null;
      if (!selected || !isOptionAvailable(selected)) return;

      const { form, sourceSelect, variantIdInput } = variantModalContext;
      sourceSelect.value = selected.value;
      sourceSelect.dispatchEvent(new Event("change", { bubbles: true }));
      if (variantIdInput) variantIdInput.value = selected.value;

      closeModal();
      form.dataset.stlBypassModal = "true";
      if (typeof form.requestSubmit === "function") {
        form.requestSubmit();
      } else {
        form.submit();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeModal();
      }
    });

    variantModalInstance = {
      open: openModal,
    };

    return variantModalInstance;
  };

  roots.forEach((root) => {
    const dots = [...root.querySelectorAll("[data-stl-dot]")];
    const cards = [...root.querySelectorAll("[data-stl-card]")];
    const panel = root.querySelector(".shop-the-look__panel");
    const layout = root.querySelector(".shop-the-look__layout");
    const mediaColumn = root.querySelector(".shop-the-look__media-column");
    const mediaStage = root.querySelector(".shop-the-look__media-stage");
    const mediaWrap = root.querySelector(".shop-the-look__media-wrap");
    const inner = root.querySelector(".shop-the-look__inner");
    const scrollBoundsRoot = root.closest("[data-stl-section]") || root;
    if (!dots.length || !cards.length) return;

    let activeIndex = -1;
    let rafPending = false;
    let pendingScrollTarget = null;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobileLayout = window.matchMedia(`(max-width: ${STL_MOBILE_BREAKPOINT}px)`);
    let lastTouchY = 0;
    let hasTouchTracking = false;
    root._mobileViewportWidth = 0;
    root._mobileViewportHeight = 0;

    const resetLockedMobileViewportHeight = () => {
      root._mobileViewportWidth = 0;
      root._mobileViewportHeight = 0;
      root.style.removeProperty("--stl-mobile-viewport-height");
    };

    const syncLockedMobileViewportHeight = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const widthChanged = !Number.isFinite(root._mobileViewportWidth)
        || root._mobileViewportWidth <= 0
        || Math.abs(viewportWidth - root._mobileViewportWidth) > 2;

      if (widthChanged || !Number.isFinite(root._mobileViewportHeight) || root._mobileViewportHeight <= 0) {
        root._mobileViewportHeight = viewportHeight;
      } else {
        // Keep the tallest viewport seen for this width so iOS browser chrome
        // reappearing does not compress the sticky media area mid-scroll.
        root._mobileViewportHeight = Math.max(root._mobileViewportHeight, viewportHeight);
      }

      root._mobileViewportWidth = viewportWidth;
      root.style.setProperty("--stl-mobile-viewport-height", `${root._mobileViewportHeight}px`);

      return root._mobileViewportHeight;
    };

    const galleryCards = cards
      .map((card) => {
        const nav = card.querySelector("[data-stl-gallery-nav]");
        const track = card.querySelector("[data-stl-gallery-track]");
        const slides = [...card.querySelectorAll("[data-stl-gallery-slide]")];
        const prevButton = card.querySelector("[data-stl-gallery-prev]");
        const nextButton = card.querySelector("[data-stl-gallery-next]");

        if (!nav || !track || slides.length < 2 || !prevButton || !nextButton) {
          return null;
        }

        return {
          card,
          nav,
          track,
          slides,
          prevButton,
          nextButton,
          index: 0,
        };
      })
      .filter(Boolean);

    const syncGallery = (gallery) => {
      if (!gallery) return;

      gallery.index = ((gallery.index % gallery.slides.length) + gallery.slides.length) % gallery.slides.length;
      gallery.track.style.setProperty("--stl-gallery-index", gallery.index);

      gallery.slides.forEach((slide, slideIndex) => {
        const isCurrent = slideIndex === gallery.index;
        slide.setAttribute("aria-hidden", isCurrent ? "false" : "true");
      });

      const isActiveCard = toNumber(gallery.card.dataset.index) === activeIndex;
      gallery.nav.setAttribute("aria-hidden", isActiveCard ? "false" : "true");
      gallery.prevButton.tabIndex = isActiveCard ? 0 : -1;
      gallery.nextButton.tabIndex = isActiveCard ? 0 : -1;
    };

    const syncGalleries = () => {
      galleryCards.forEach((gallery) => syncGallery(gallery));
    };

    const getOuterHeight = (element) => {
      if (!element) return 0;

      const styles = window.getComputedStyle(element);
      return element.getBoundingClientRect().height
        + parseFloat(styles.marginTop || "0")
        + parseFloat(styles.marginBottom || "0");
    };

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

      syncGalleries();
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

      const targetY = window.innerHeight * DESKTOP_CARD_FOCUS_RATIO;
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

    const getMaxWindowScroll = () => {
      const scrollingElement = document.scrollingElement || document.documentElement;
      return Math.max(0, scrollingElement.scrollHeight - window.innerHeight);
    };

    const getCurrentScrollPosition = (surface) => {
      if (surface === "panel" && panel) {
        return panel.scrollLeft;
      }

      return window.scrollY;
    };

    const clearPendingScrollTarget = (syncToScroll = false) => {
      pendingScrollTarget = null;

      if (syncToScroll) {
        setActive(getNearestCardIndex());
      }
    };

    const lockActiveDuringScroll = (nextIndex, targetScroll) => {
      if (!targetScroll) {
        clearPendingScrollTarget();
        return;
      }

      const clampedPosition = clamp(
        targetScroll.position,
        0,
        targetScroll.surface === "panel" ? getPanelMaxScroll() : getMaxWindowScroll()
      );
      const currentPosition = getCurrentScrollPosition(targetScroll.surface);

      if (Math.abs(currentPosition - clampedPosition) <= STL_SCROLL_LOCK_TOLERANCE) {
        clearPendingScrollTarget();
        return;
      }

      pendingScrollTarget = {
        index: nextIndex,
        surface: targetScroll.surface,
        position: clampedPosition,
        startedAt: performance.now(),
        lastPosition: currentPosition,
        lastMovedAt: performance.now(),
      };
    };

    const syncPendingScrollTarget = () => {
      if (!pendingScrollTarget) return false;

      const currentPosition = getCurrentScrollPosition(pendingScrollTarget.surface);
      const now = performance.now();

      if (Math.abs(currentPosition - pendingScrollTarget.lastPosition) > 0.5) {
        pendingScrollTarget.lastPosition = currentPosition;
        pendingScrollTarget.lastMovedAt = now;
      }

      if (activeIndex !== pendingScrollTarget.index) {
        setActive(pendingScrollTarget.index);
      }

      const reachedTarget = Math.abs(currentPosition - pendingScrollTarget.position) <= STL_SCROLL_LOCK_TOLERANCE;
      const isIdle = now - pendingScrollTarget.lastMovedAt >= STL_SCROLL_LOCK_IDLE_MS;
      const hasExpired = now - pendingScrollTarget.startedAt >= STL_SCROLL_LOCK_MAX_MS;

      if (!reachedTarget && !isIdle && !hasExpired) {
        return true;
      }

      const shouldSyncToScroll = !reachedTarget;
      clearPendingScrollTarget(shouldSyncToScroll);
      return true;
    };

    const scrollToCard = (nextIndex) => {
      const target = findCardByIndex(nextIndex);
      if (!target) return null;

      if (mobileLayout.matches && panel) {
        if (root.classList.contains("shop-the-look--sticky-enabled")) {
          const rootTop = window.scrollY + root.getBoundingClientRect().top;
          const maxDistance = Number.isFinite(root._mobileScrollDistance) ? root._mobileScrollDistance : 0;
          const firstCardCenter = Number.isFinite(root._mobileFirstCardCenter)
            ? root._mobileFirstCardCenter
            : cards[0].offsetLeft + (cards[0].offsetWidth / 2);
          const targetCenter = target.offsetLeft + (target.offsetWidth / 2);
          const targetProgress = Math.max(0, Math.min(maxDistance, targetCenter - firstCardCenter));
          const targetScrollY = clamp(rootTop + targetProgress, 0, getMaxWindowScroll());

          // If scroll would go down but this card is already the naturally active one, skip
          if (targetScrollY > window.scrollY) {
            const currentOffset = Math.max(0, Math.min(maxDistance, -root.getBoundingClientRect().top));
            const currentCenter = firstCardCenter + currentOffset;
            let nearestIndex = -1;
            let bestDiff = Infinity;
            cards.forEach((card) => {
              const cardCenter = card.offsetLeft + (card.offsetWidth / 2);
              const diff = Math.abs(cardCenter - currentCenter);
              if (diff < bestDiff) {
                bestDiff = diff;
                nearestIndex = toNumber(card.dataset.index);
              }
            });
            if (nearestIndex === nextIndex) return null;
          }

          window.scrollTo({
            top: targetScrollY,
            behavior: prefersReducedMotion ? "auto" : "smooth",
          });
          return {
            surface: "window",
            position: targetScrollY,
          };
        } else {
          // Fallback if sticky disabled (content too small)
          const targetLeft = clamp(
            panel.scrollLeft + target.getBoundingClientRect().left - panel.getBoundingClientRect().left,
            0,
            getPanelMaxScroll()
          );
          panel.scrollTo({
            left: targetLeft,
            behavior: prefersReducedMotion ? "auto" : "smooth",
          });
          return {
            surface: "panel",
            position: targetLeft,
          };
        }
      }

      const cardRect = target.getBoundingClientRect();
      const boundsRect = scrollBoundsRoot.getBoundingClientRect();
      const maxScrollTop = Math.max(0, window.scrollY + boundsRect.bottom - window.innerHeight);

      let targetTop;
      if (cardRect.bottom > window.innerHeight) {
        // Card is below the viewport bottom — scroll just enough to reveal it
        targetTop = clamp(window.scrollY + cardRect.bottom - window.innerHeight, 0, maxScrollTop);
      } else {
        // Card is fully or partially visible — scroll up to focus position
        targetTop = clamp(
          window.scrollY + cardRect.top - (window.innerHeight * DESKTOP_CARD_FOCUS_RATIO),
          0,
          maxScrollTop
        );
        // If the computed target would scroll DOWN and the card is already fully visible, skip
        if (targetTop > window.scrollY && cardRect.top >= 0) {
          return null;
        }
      }

      window.scrollTo({
        top: targetTop,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
      return {
        surface: "window",
        position: targetTop,
      };
    };

    const syncActiveFromScroll = () => {
      const sectionRect = root.getBoundingClientRect();
      if (sectionRect.bottom <= 0 || sectionRect.top >= window.innerHeight) return;

      if (syncPendingScrollTarget()) {
        return;
      }

      // If sticky mode, we calculate generic active index based on transform/scroll
      if (mobileLayout.matches && root.classList.contains("shop-the-look--sticky-enabled")) {
        const maxStickyDistance = Number.isFinite(root._mobileScrollDistance)
          ? root._mobileScrollDistance
          : Infinity;
        // Calculate based on current translate
        // currentOffset = -rect.top basically
        const currentOffset = Math.max(0, Math.min(maxStickyDistance, -sectionRect.top));
        const firstCardCenter = Number.isFinite(root._mobileFirstCardCenter)
          ? root._mobileFirstCardCenter
          : cards[0].offsetLeft + (cards[0].offsetWidth / 2);
        const targetCenter = firstCardCenter + currentOffset;

        let bestIndex = -1;
        let bestDiff = Infinity;

        cards.forEach((card) => {
          const cardCenter = card.offsetLeft + (card.offsetWidth / 2);
          const diff = Math.abs(cardCenter - targetCenter);
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
      let preClickScrollY = null;
      dot.addEventListener("pointerdown", () => {
        preClickScrollY = window.scrollY;
      }, { passive: true });
      const activateFromDot = () => {
        // Capture scroll before any browser focus behaviour (pointerdown fires before focus)
        const savedScrollY = preClickScrollY ?? window.scrollY;
        preClickScrollY = null;

        // Compute BEFORE setActive to avoid layout shift from CSS class changes corrupting
        // getBoundingClientRect values. Also avoids relying on is-active class which is
        // 1 rAF behind actual scroll position.
        let skipDownwardScroll = false;
        if (mobileLayout.matches && panel && root.classList.contains("shop-the-look--sticky-enabled")) {
          const target = findCardByIndex(index);
          if (target) {
            const rootTop = window.scrollY + root.getBoundingClientRect().top;
            const maxDistance = Number.isFinite(root._mobileScrollDistance) ? root._mobileScrollDistance : 0;
            const firstCardCenter = Number.isFinite(root._mobileFirstCardCenter)
              ? root._mobileFirstCardCenter
              : cards[0].offsetLeft + (cards[0].offsetWidth / 2);
            const targetCenter = target.offsetLeft + (target.offsetWidth / 2);
            const targetProgress = Math.max(0, Math.min(maxDistance, targetCenter - firstCardCenter));
            const targetScrollY = clamp(rootTop + targetProgress, 0, getMaxWindowScroll());

            if (targetScrollY >= savedScrollY) {
              // Would scroll down — check if this card is already the nearest active one
              const currentOffset = Math.max(0, Math.min(maxDistance, -root.getBoundingClientRect().top));
              const currentCenter = firstCardCenter + currentOffset;
              let nearestIndex = -1;
              let bestDiff = Infinity;
              cards.forEach((card) => {
                const cardCenter = card.offsetLeft + (card.offsetWidth / 2);
                const diff = Math.abs(cardCenter - currentCenter);
                if (diff < bestDiff) { bestDiff = diff; nearestIndex = toNumber(card.dataset.index); }
              });
              if (nearestIndex === index) skipDownwardScroll = true;
            }
          }
        }

        setActive(index);

        if (skipDownwardScroll) {
          lockActiveDuringScroll(index, null);
          requestAnimationFrame(() => {
            if (window.scrollY !== savedScrollY) window.scroll(window.scrollX, savedScrollY);
          });
          return;
        }

        const scrollTarget = scrollToCard(index);
        lockActiveDuringScroll(index, scrollTarget);
        if (!scrollTarget) {
          // Restore scroll if any unintended movement happened (layout shift, browser focus, etc.)
          requestAnimationFrame(() => {
            if (window.scrollY !== savedScrollY) {
              window.scroll(window.scrollX, savedScrollY);
            }
          });
        }
      };
      dot.addEventListener("click", activateFromDot);
      dot.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activateFromDot();
        }
      });
    });

    galleryCards.forEach((gallery) => {
      const moveGallery = (step) => {
        gallery.index += step;
        syncGallery(gallery);
      };

      gallery.prevButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        moveGallery(-1);
      });

      gallery.nextButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        moveGallery(1);
      });

      syncGallery(gallery);
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
      const form = card.querySelector(".shop-the-look__form");
      if (!form) return;

      const requiresChoice = form.dataset.stlRequiresChoice === "true";
      const select = card.querySelector("[data-stl-variant-select]");
      if (!select) return;

      const variantIdInput = card.querySelector("[data-stl-variant-id]");
      const addButton = card.querySelector("[data-stl-add-button]");
      const addText = card.querySelector("[data-stl-add-text]");
      const priceValue = card.querySelector("[data-stl-price]");
      const compareValue = card.querySelector("[data-stl-compare]");

      const syncVariant = () => {
        const selected = select?.selectedOptions ? select.selectedOptions[0] : null;
        if (selected && variantIdInput) {
          variantIdInput.value = selected.value;
        }

        const selectedAvailable = isOptionAvailable(selected);
        const hasAnyAvailableOption = select
          ? [...select.options].some((option) => isOptionAvailable(option))
          : selectedAvailable;

        if (addButton) {
          addButton.disabled = requiresChoice ? !hasAnyAvailableOption : !selectedAvailable;
        }
        if (addText) {
          addText.textContent = requiresChoice
            ? (hasAnyAvailableOption ? "Choose options" : "Sold out")
            : (selectedAvailable ? "Add to cart" : "Sold out");
        }

        if (selected && priceValue && selected.dataset.price) {
          priceValue.textContent = selected.dataset.price;
        }

        if (selected && compareValue) {
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

      if (select) {
        select.addEventListener("change", syncVariant);
      }
      syncVariant();

      if (requiresChoice && select) {
        form.addEventListener("submit", (event) => {
          if (form.dataset.stlBypassModal === "true") {
            form.dataset.stlBypassModal = "";
            return;
          }

          event.preventDefault();
          event.stopImmediatePropagation();
          event.stopPropagation();
          if (addButton?.disabled) return;

          ensureVariantModal().open({
            form,
            sourceSelect: select,
            variantIdInput,
            triggerButton: addButton,
            productTitle: form.dataset.stlProductTitle || "Choose option",
          });
        }, true);
      }
    });

    /* =========================================
       Mobile Scroll Hijacking (Sticky Behavior)
       ========================================= */
    const removeMobileScrollHandler = () => {
      if (root._mobileScrollHandler) {
        window.removeEventListener("scroll", root._mobileScrollHandler);
        root._mobileScrollHandler = null;
      }
    };

    const initMobileScroll = () => {
      clearPendingScrollTarget();

      if (!mobileLayout.matches) {
        removeMobileScrollHandler();
        root.classList.remove("shop-the-look--sticky-enabled");
        root.style.height = "";
        panel.style.transform = "";
        root.style.removeProperty("--stl-title-center-shift");
        root.style.removeProperty("--stl-mobile-media-max-height");
        resetLockedMobileViewportHeight();
        root._mobileScrollDistance = 0;
        root._mobileFirstCardCenter = 0;
        return;
      }

      removeMobileScrollHandler();
      const viewportHeight = syncLockedMobileViewportHeight();

      // 1. Reset sticky class before measuring
      root.classList.remove("shop-the-look--sticky-enabled");
      root.style.height = "";
      panel.style.transform = "";
      root.style.removeProperty("--stl-title-center-shift");
      root.style.removeProperty("--stl-mobile-media-max-height");
      root._mobileScrollDistance = 0;
      root._mobileFirstCardCenter = 0;

      // Force a layout reflow so the browser recalculates dimensions
      // without the sticky CSS applied
      void panel.offsetWidth;

      // 2. Enable Sticky Mode to measure final layout geometry
      root.classList.add("shop-the-look--sticky-enabled");
      panel.style.transform = "translate3d(0px, 0, 0)";
      void panel.offsetWidth;

      const panelRect = panel.getBoundingClientRect();
      const mediaRect = mediaWrap ? mediaWrap.getBoundingClientRect() : null;
      const innerRect = inner ? inner.getBoundingClientRect() : null;
      const mediaCenter = mediaRect
        ? (mediaRect.left - panelRect.left) + (mediaRect.width / 2)
        : (panelRect.width / 2);

      if (mediaRect && innerRect) {
        const mediaCenterX = mediaRect.left + (mediaRect.width / 2);
        const innerCenterX = innerRect.left + (innerRect.width / 2);
        const titleCenterShift = mediaCenterX - innerCenterX;
        root.style.setProperty("--stl-title-center-shift", `${titleCenterShift}px`);
      } else {
        root.style.setProperty("--stl-title-center-shift", "0px");
      }

      if (inner && panel && mediaColumn && mediaStage && layout) {
        const layoutStyles = window.getComputedStyle(layout);
        const layoutGap = parseFloat(layoutStyles.rowGap || layoutStyles.gap || "0");
        const mediaFixedHeight = [...mediaColumn.children].reduce((total, child) => {
          if (child === mediaStage) return total;
          return total + getOuterHeight(child);
        }, 0);
        const maxMediaHeight = Math.floor(
          inner.getBoundingClientRect().height
          - getOuterHeight(panel)
          - mediaFixedHeight
          - layoutGap
        );

        if (maxMediaHeight > 0) {
          root.style.setProperty("--stl-mobile-media-max-height", `${maxMediaHeight}px`);
        } else {
          root.style.removeProperty("--stl-mobile-media-max-height");
        }
      } else {
        root.style.removeProperty("--stl-mobile-media-max-height");
      }

      const firstCard = cards[0];
      const lastCard = cards[cards.length - 1];
      const firstCardCenter = firstCard.offsetLeft + (firstCard.offsetWidth / 2);
      const lastCardCenter = lastCard.offsetLeft + (lastCard.offsetWidth / 2);
      const startTranslate = mediaCenter - firstCardCenter;
      const endTranslate = mediaCenter - lastCardCenter;
      const scrollableDistance = Math.max(0, startTranslate - endTranslate);

      // If content fits, no need to hijack
      if (scrollableDistance <= 0) {
        root.classList.remove("shop-the-look--sticky-enabled");
        panel.style.transform = "";
        root.style.removeProperty("--stl-title-center-shift");
        root._mobileFirstCardCenter = 0;
        return;
      }

      // Force reset any native scroll that might have happened
      panel.scrollLeft = 0;
      root._mobileScrollDistance = scrollableDistance;
      root._mobileFirstCardCenter = firstCardCenter;

      // 3. Set Section Height
      // height = viewport height (sticky "screen") + scrollable distance
      // As user scrolls through scrollableDistance px vertically,
      // we translate scrollableDistance px horizontally.
      root.style.height = `${viewportHeight + scrollableDistance}px`;

      // 4. Build scroll handler — capture fresh scrollableDistance in closure
      const onGlobalScroll = () => {
        if (!mobileLayout.matches) return;
        const rect = root.getBoundingClientRect();
        const offset = -rect.top;
        const progress = Math.max(0, Math.min(scrollableDistance, offset));
        panel.style.transform = `translate3d(${startTranslate - progress}px, 0, 0)`;
      };

      // Remove any previously registered handler before adding the new one
      // (important on resize: scrollableDistance changes, so we need a fresh closure)
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

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const getGroupParts = (group) => {
    const panels = [...group.querySelectorAll("[data-stl-look-panel]")];
    return {
      panels,
      lookCount: panels.length,
    };
  };

  const getActiveLookPosition = ({ panels, lookCount }, group) => {
    if (!lookCount) return 0;

    const storedPosition = Number(group?.dataset?.stlActivePosition);
    if (Number.isFinite(storedPosition)) {
      return Math.max(0, Math.min(lookCount - 1, storedPosition));
    }

    const visiblePanelIndex = panels.findIndex((panel) => !panel.hidden);
    if (visiblePanelIndex >= 0) return visiblePanelIndex;

    return 0;
  };

  const syncLookGroup = (group, requestedPosition) => {
    const parts = getGroupParts(group);
    if (parts.lookCount < 2) return null;

    const fallbackPosition = getActiveLookPosition(parts, group);
    let activePosition = Number.isFinite(requestedPosition) ? requestedPosition : fallbackPosition;
    activePosition = Math.max(0, Math.min(parts.lookCount - 1, activePosition));

    let activeTrigger = null;

    parts.panels.forEach((panel, index) => {
      const active = index === activePosition;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
      panel.setAttribute("aria-hidden", active ? "false" : "true");

      const panelTriggers = [...panel.querySelectorAll("[data-stl-group-trigger]")];
      panelTriggers.forEach((trigger, triggerIndex) => {
        const triggerActive = active && triggerIndex === activePosition;
        trigger.classList.toggle("is-active", triggerActive);
        trigger.setAttribute("aria-pressed", triggerActive ? "true" : "false");
        trigger.setAttribute("aria-selected", triggerActive ? "true" : "false");
        trigger.tabIndex = triggerActive ? 0 : -1;
        trigger.dataset.lookIndex = `${triggerIndex}`;
        if (triggerActive) {
          activeTrigger = trigger;
        }
      });

      const previousButtons = [...panel.querySelectorAll("[data-stl-group-prev]")];
      const nextButtons = [...panel.querySelectorAll("[data-stl-group-next]")];
      previousButtons.forEach((button) => {
        button.disabled = !active || activePosition <= 0;
      });
      nextButtons.forEach((button) => {
        button.disabled = !active || activePosition >= parts.lookCount - 1;
      });
    });

    group.dataset.stlActivePosition = `${activePosition}`;
    return {
      activePosition,
      activeTrigger,
      lookCount: parts.lookCount,
    };
  };

  const activateLookAtPosition = (group, requestedPosition) => {
    const nextPosition = toNumber(requestedPosition);
    const state = syncLookGroup(group, nextPosition);
    if (!state) return;

    window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
      window.dispatchEvent(new Event("scroll"));
    });

    if (state.activeTrigger) {
      state.activeTrigger.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  };

  const syncAllLookGroups = () => {
    document.querySelectorAll("[data-stl-group]").forEach((group) => {
      syncLookGroup(group);
    });
  };

  syncAllLookGroups();

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-stl-group-trigger]");
    if (trigger) {
      const group = trigger.closest("[data-stl-group]");
      if (!group) return;

      const triggerPosition = Number(trigger.dataset.lookIndex);
      if (!Number.isFinite(triggerPosition)) return;
      activateLookAtPosition(group, triggerPosition);
      return;
    }

    const previousButton = event.target.closest("[data-stl-group-prev]");
    if (previousButton) {
      const group = previousButton.closest("[data-stl-group]");
      if (!group) return;
      const currentPosition = toNumber(group.dataset.stlActivePosition);
      activateLookAtPosition(group, currentPosition - 1);
      return;
    }

    const nextButton = event.target.closest("[data-stl-group-next]");
    if (nextButton) {
      const group = nextButton.closest("[data-stl-group]");
      if (!group) return;
      const currentPosition = toNumber(group.dataset.stlActivePosition);
      activateLookAtPosition(group, currentPosition + 1);
    }
  });

  document.addEventListener("keydown", (event) => {
    const trigger = event.target.closest("[data-stl-group-trigger]");
    if (!trigger) return;

    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;

    const group = trigger.closest("[data-stl-group]");
    if (!group) return;

    const parts = getGroupParts(group);
    const triggerPosition = Number(trigger.dataset.lookIndex);
    if (!Number.isFinite(triggerPosition)) return;

    event.preventDefault();
    const nextPosition = event.key === "ArrowRight"
      ? Math.min(parts.lookCount - 1, triggerPosition + 1)
      : Math.max(0, triggerPosition - 1);

    activateLookAtPosition(group, nextPosition);
    const activePanel = parts.panels[nextPosition] || null;
    const nextTrigger = activePanel?.querySelector(`[data-stl-group-trigger][data-look-index="${nextPosition}"]`);
    nextTrigger?.focus();
  });

  document.addEventListener("shopify:section:load", syncAllLookGroups);
  document.addEventListener("shopify:section:reorder", syncAllLookGroups);

  /* =========================================
     Tooltip position: flip below for dots near the top
     ========================================= */
  const positionTooltips = () => {
    document.querySelectorAll("[data-stl-dot]").forEach((dot) => {
      const topValue = parseFloat(dot.style.top);
      // If the dot is in the top ~25% of the image, flip tooltip below
      if (Number.isFinite(topValue) && topValue < 25) {
        dot.classList.add("shop-the-look__dot--tooltip-below");
      } else {
        dot.classList.remove("shop-the-look__dot--tooltip-below");
      }
    });
  };
  positionTooltips();

  /* =========================================
     Entrance animation (IntersectionObserver)
     ========================================= */
  const revealSections = document.querySelectorAll("[data-stl-section]");
  if (revealSections.length && typeof IntersectionObserver !== "undefined") {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      revealSections.forEach((section) => section.classList.add("is-revealed"));
    } else {
      const revealObserverOptions = {
        // Trigger a bit later so the entrance animation is visible after the
        // section has moved further into the viewport.
        threshold: 0.22,
        rootMargin: "0px 0px -14% 0px",
      };
      const revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-revealed");
              revealObserver.unobserve(entry.target);
            }
          });
        },
        revealObserverOptions
      );
      revealSections.forEach((section) => revealObserver.observe(section));
    }
  }
})();
