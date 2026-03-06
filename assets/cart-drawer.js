(() => {
  const drawer = document.querySelector("[data-cart-drawer]");
  const content = document.querySelector("[data-cart-drawer-content]");
  const closeButtons = document.querySelectorAll("[data-cart-drawer-close]");
  const toggles = document.querySelectorAll("[data-cart-toggle]");

  const FREE_SHIPPING_THRESHOLD = 10000; // $100.00

  if (!drawer || !content || toggles.length === 0) return;

  const isCartPage = document.body.classList.contains("template-cart");
  const isDrawerOpen = () => drawer.classList.contains("is-open");

  const setDrawerState = (isOpen) => {
    drawer.classList.toggle("is-open", isOpen);
    drawer.setAttribute("aria-hidden", isOpen ? "false" : "true");
    document.body.classList.toggle("cart-drawer-open", isOpen);
    toggles.forEach((toggle) => {
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  };

  const openDrawer = async () => {
    if (!isDrawerOpen()) setDrawerState(true);
    await refreshDrawer();
  };

  const closeDrawer = () => {
    if (!isDrawerOpen()) return;
    setDrawerState(false);
  };

  const toggleDrawer = () => {
    if (isDrawerOpen()) {
      closeDrawer();
      return;
    }
    openDrawer();
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

        const variantId = formData.get("id");
        if (!variantId) {
          showToast("Please choose an option before adding to cart.", "error");
          return;
        }

        const quantityRaw = formData.get("quantity");
        if (quantityRaw !== null) {
          const quantity = Number(quantityRaw);
          if (!Number.isFinite(quantity) || quantity < 1) {
            formData.set("quantity", "1");
          }
        }

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
          if (!res.ok) {
            throw new Error(await getCartErrorMessage(res));
          }
          await openDrawer();
          showToast("Added to cart", "success");
        } catch (err) {
          const message = err instanceof Error && err.message
            ? err.message
            : "Could not add to cart";
          console.warn("Add to cart failed:", err);
          showToast(message, "error");
        } finally {
          if (submitBtn) {
            submitBtn.classList.remove("is-loading");
            submitBtn.disabled = false;
          }
        }
      });
    });
  };

  toggles.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      toggleDrawer();
    });
  });

  closeButtons.forEach((btn) => {
    btn.addEventListener("click", closeDrawer);
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  const getCartErrorMessage = async (response) => {
    const fallback = "Could not add to cart";

    try {
      const data = await response.clone().json();
      if (typeof data?.description === "string" && data.description.trim()) {
        return data.description.trim();
      }
      if (typeof data?.message === "string" && data.message.trim()) {
        return data.message.trim();
      }
      if (typeof data?.errors === "string" && data.errors.trim()) {
        return data.errors.trim();
      }
      if (data?.errors && typeof data.errors === "object") {
        const firstError = Object.values(data.errors).find((value) => {
          if (typeof value === "string") return value.trim();
          if (Array.isArray(value)) return value.length > 0;
          return false;
        });

        if (typeof firstError === "string" && firstError.trim()) {
          return firstError.trim();
        }
        if (Array.isArray(firstError) && firstError.length > 0) {
          return String(firstError[0]);
        }
      }
    } catch (jsonError) {
      // Response isn't JSON; continue to text fallback.
    }

    try {
      const text = (await response.text()).trim();
      if (text) return text;
    } catch (textError) {
      // Ignore and return fallback.
    }

    return fallback;
  };

  const showToast = (message, variant = "success") => {
    let toast = document.querySelector(".cart-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "cart-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }
    toast.classList.remove("cart-toast--error");
    if (variant === "error") toast.classList.add("cart-toast--error");
    const icon = variant === "error" ? "!" : "✓";
    toast.innerHTML = `<span class="cart-toast__icon">${icon}</span><span class="cart-toast__text">${message}</span>`;
    toast.classList.add("is-visible");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 2200);
  };

  setDrawerState(false);
  bindAddToCart();
})();
