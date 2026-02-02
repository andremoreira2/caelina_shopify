(() => {
  const drawer = document.querySelector("[data-cart-drawer]");
  const content = document.querySelector("[data-cart-drawer-content]");
  const closeButtons = document.querySelectorAll("[data-cart-drawer-close]");
  const toggles = document.querySelectorAll("[data-cart-toggle]");

  const FREE_SHIPPING_THRESHOLD = 10000; // $100.00

  if (!drawer || !content || toggles.length === 0) return;

  const isCartPage = document.body.classList.contains("template-cart");

  const openDrawer = async () => {
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("cart-drawer-open");
    await refreshDrawer();
  };

  const closeDrawer = () => {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("cart-drawer-open");
  };

  const refreshDrawer = async () => {
    try {
      content.innerHTML = '<div class="cart-drawer__loading">Loading…</div>';
      const res = await fetch("/cart?view=drawer", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Failed to load cart");
      const html = await res.text();
      content.innerHTML = html;

      // Update functional elements
      const cartRes = await fetch("/cart.js", { credentials: "same-origin" });
      const cartData = await cartRes.json();

      updateShippingBar(cartData.total_price);
      bindDrawerEvents();
      updateCartCount(cartData.item_count);

    } catch (err) {
      console.warn(err);
      content.innerHTML =
        '<div class="cart-drawer__loading">Could not load cart.</div>';
    }
  };

  const updateShippingBar = (totalPrice) => {
    const bar = document.querySelector("[data-shipping-bar]");
    const text = document.querySelector("[data-shipping-text]");
    const fill = document.querySelector("[data-shipping-fill]");

    if (!bar || !text || !fill) return;

    const remaining = FREE_SHIPPING_THRESHOLD - totalPrice;
    const percentage = Math.min(100, (totalPrice / FREE_SHIPPING_THRESHOLD) * 100);

    fill.style.width = `${percentage}%`;

    if (remaining <= 0) {
      text.textContent = "You've got free shipping!";
      bar.classList.add("is-free");
    } else {
      const remainingMoney = (remaining / 100).toFixed(2);
      text.textContent = `You are $${remainingMoney} away from free shipping.`;
      bar.classList.remove("is-free");
    }
  };

  const updateCartCount = async (countOverride) => {
    try {
      let count = countOverride;
      if (count === undefined) {
        const res = await fetch("/cart.js", { credentials: "same-origin" });
        if (!res.ok) return;
        const data = await res.json();
        count = Number(data.item_count || 0);
      }

      toggles.forEach((el) => {
        let badge = el.querySelector(".site-cart__count");
        if (count > 0) {
          if (!badge) {
            badge = document.createElement("span");
            badge.className = "site-cart__count";
            el.appendChild(badge);
          }
          badge.textContent = count;
        } else if (badge) {
          badge.remove();
        }
      });
    } catch (err) {
      console.warn(err);
    }
  };

  const changeLine = async (key, quantity) => {
    const res = await fetch("/cart/change.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ id: key, quantity }),
    });
    if (!res.ok) throw new Error("Cart change failed");
    await refreshDrawer();
  };

  const bindDrawerEvents = () => {
    // Handle close button inside the drawer content (loaded via AJAX)
    const innerCloseBtn = content.querySelector("[data-cart-drawer-close]");
    if (innerCloseBtn) {
      innerCloseBtn.addEventListener("click", closeDrawer);
    }

    content.querySelectorAll("[data-cart-line]").forEach((line) => {
      const key = line.getAttribute("data-key");
      const qtyInput = line.querySelector("[data-qty-input]");
      const removeBtn = line.querySelector("[data-remove]");

      if (qtyInput) {
        qtyInput.addEventListener("change", () => {
          const nextQty = Math.max(0, Number(qtyInput.value || 0));
          changeLine(key, nextQty);
        });
      }

      if (removeBtn) {
        removeBtn.addEventListener("click", () => changeLine(key, 0));
      }
    });
  };

  const bindAddToCart = () => {
    if (isCartPage) return;
    document.querySelectorAll('form[action*="/cart/add"]').forEach((form) => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const submitBtn = form.querySelector('[type="submit"]');
        const originalText = submitBtn?.textContent;
        if (submitBtn) {
          submitBtn.classList.add("is-loading");
          submitBtn.disabled = true;
        }
        try {
          const res = await fetch("/cart/add.js", {
            method: "POST",
            body: formData,
            credentials: "same-origin",
          });
          if (!res.ok) throw new Error("Add to cart failed");
          await openDrawer();
          showToast("Added to cart");
        } catch (err) {
          console.warn(err);
          showToast("Could not add to cart");
        } finally {
          if (submitBtn) {
            submitBtn.classList.remove("is-loading");
            submitBtn.disabled = false;
            if (originalText) submitBtn.textContent = originalText;
          }
        }
      });
    });
  };

  toggles.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      openDrawer();
    });
  });

  closeButtons.forEach((btn) => {
    btn.addEventListener("click", closeDrawer);
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  const showToast = (message) => {
    let toast = document.querySelector(".cart-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "cart-toast";
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span class="cart-toast__icon">✓</span><span class="cart-toast__text">${message}</span>`;
    toast.classList.add("is-visible");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 2200);
  };

  bindAddToCart();
})();
