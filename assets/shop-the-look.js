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
    if (!dots.length || !cards.length) return;

    let activeIndex = -1;
    let rafPending = false;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
      const targetY = window.innerHeight * 0.32;
      let bestIndex = activeIndex >= 0 ? activeIndex : toNumber(cards[0].dataset.index);
      let bestDistance = Infinity;

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

      const targetTop = window.scrollY + target.getBoundingClientRect().top - CARD_SCROLL_OFFSET;
      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    };

    const syncActiveFromScroll = () => {
      const sectionRect = root.getBoundingClientRect();
      if (sectionRect.bottom <= 0 || sectionRect.top >= window.innerHeight) return;

      setActive(getNearestCardIndex());
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
  });
})();
