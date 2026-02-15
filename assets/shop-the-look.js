(() => {
  const roots = [...document.querySelectorAll("[data-shop-the-look]")];
  if (!roots.length) return;

  const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  roots.forEach((root) => {
    const dots = [...root.querySelectorAll("[data-stl-dot]")];
    const cards = [...root.querySelectorAll("[data-stl-card]")];
    if (!dots.length || !cards.length) return;

    const setActive = (nextIndex) => {
      dots.forEach((dot) => {
        const active = toNumber(dot.dataset.index) === nextIndex;
        dot.classList.toggle("is-active", active);
        dot.setAttribute("aria-pressed", active ? "true" : "false");
      });

      cards.forEach((card) => {
        const active = toNumber(card.dataset.index) === nextIndex;
        card.classList.toggle("is-active", active);
        card.hidden = !active;
        card.setAttribute("aria-hidden", active ? "false" : "true");
      });
    };

    dots.forEach((dot) => {
      const activateFromDot = () => setActive(toNumber(dot.dataset.index));
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
