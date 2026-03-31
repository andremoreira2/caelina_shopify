(() => {
  const drawer = document.querySelector("[data-cart-drawer]");
  const content = document.querySelector("[data-cart-drawer-content]");
  const closeButtons = document.querySelectorAll("[data-cart-drawer-close]");
  const toggles = document.querySelectorAll("[data-cart-toggle]");

  const FREE_SHIPPING_THRESHOLD = 10000; // $100.00
  const DRAWER_UPSELL_LIMIT = 3;
  const DRAWER_UPSELL_FETCH_LIMIT = 6;
  const LOCALE_ROOT = window.Shopify?.routes?.root || "/";

  if (!drawer || !content || toggles.length === 0) return;

  const isCartPage = document.body.classList.contains("template-cart");
  const isDrawerOpen = () => drawer.classList.contains("is-open");
  let upsellRequestId = 0;
  let preferredUpsellSourceProductId = null;

  const esc = (value) => String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]
  );

  const appendImageWidth = (src, width) => {
    if (!src) return "";
    const separator = src.includes("?") ? "&" : "?";
    return `${src}${separator}width=${width}`;
  };

  const formatMoney = (cents) => {
    const amount = Number(cents || 0) / 100;
    const currency = window.Shopify?.currency?.active || "USD";

    try {
      return new Intl.NumberFormat(document.documentElement.lang || undefined, {
        style: "currency",
        currency,
      }).format(amount);
    } catch (error) {
      return `$${amount.toFixed(2)}`;
    }
  };

  const buildUpsellCard = (product) => {
    const productTitle = esc(product.title);
    const productUrl = esc(product.url);
    const imageSrc = appendImageWidth(product.featured_image || product.images?.[0] || "", 180);
    const availableVariant = Array.isArray(product.variants)
      ? product.variants.find((variant) => variant?.available) || product.variants[0]
      : null;

    let actionHtml = "";
    if (product.available && availableVariant && product.variants?.length === 1) {
      actionHtml = `
        <form method="post" action="/cart/add" class="drawer-cart__upsell-form">
          <input type="hidden" name="id" value="${availableVariant.id}">
          <input type="hidden" name="quantity" value="1">
          <button type="submit" class="drawer-cart__upsell-button" aria-label="Add ${productTitle} to cart">
            Add
          </button>
        </form>
      `;
    } else if (product.available) {
      actionHtml = `
        <a class="drawer-cart__upsell-button drawer-cart__upsell-button--link" href="${productUrl}" aria-label="Choose options for ${productTitle}">
          Options
        </a>
      `;
    } else {
      actionHtml = `
        <span class="drawer-cart__upsell-button drawer-cart__upsell-button--disabled" aria-hidden="true">
          Sold out
        </span>
      `;
    }

    let priceHtml = `<span class="price__current">${formatMoney(product.price)}</span>`;
    if (product.compare_at_price && product.compare_at_price > product.price) {
      priceHtml += `<span class="price__compare">${formatMoney(product.compare_at_price)}</span>`;
    }

    return `
      <article class="drawer-cart__upsell-card">
        <a class="drawer-cart__upsell-image-link" href="${productUrl}" aria-label="${productTitle}">
          ${
            imageSrc
              ? `<img class="drawer-cart__upsell-image" src="${esc(imageSrc)}" alt="${productTitle}" loading="lazy">`
              : `<span class="drawer-cart__upsell-image drawer-cart__upsell-image--placeholder" aria-hidden="true"></span>`
          }
        </a>
        <div class="drawer-cart__upsell-meta">
          <a class="drawer-cart__upsell-name" href="${productUrl}">${productTitle}</a>
          <p class="drawer-cart__upsell-price price price--compact">${priceHtml}</p>
        </div>
        <div class="drawer-cart__upsell-action">
          ${actionHtml}
        </div>
      </article>
    `;
  };

  const renderUpsell = async (cartData) => {
    const upsellContainer = content.querySelector("[data-upsell-container]");
    const upsellItem = content.querySelector("[data-upsell-item]");
    const upsellTitle = content.querySelector("[data-upsell-title]");

    if (!upsellContainer || !upsellItem) return;

    const hideUpsell = () => {
      upsellContainer.style.display = "none";
      upsellItem.innerHTML = "";
      if (upsellTitle) upsellTitle.textContent = "Pair it with";
    };

    if (!cartData || !Array.isArray(cartData.items) || cartData.items.length === 0) {
      preferredUpsellSourceProductId = null;
      hideUpsell();
      return;
    }

    const reverseCartProductIds = [];
    const seenProductIds = new Set();
    for (let index = cartData.items.length - 1; index >= 0; index -= 1) {
      const productId = Number(cartData.items[index]?.product_id);
      if (!Number.isFinite(productId) || productId <= 0 || seenProductIds.has(productId)) continue;
      seenProductIds.add(productId);
      reverseCartProductIds.push(productId);
    }

    if (reverseCartProductIds.length === 0) {
      preferredUpsellSourceProductId = null;
      hideUpsell();
      return;
    }

    const cartProductIds = new Set(
      cartData.items
        .map((item) => Number(item.product_id))
        .filter((productId) => Number.isFinite(productId) && productId > 0)
    );
    const preferredProductId = Number(preferredUpsellSourceProductId);
    const lastAddedProductId = Number.isFinite(preferredProductId) && cartProductIds.has(preferredProductId)
      ? preferredProductId
      : reverseCartProductIds[0];

    if (!Number.isFinite(lastAddedProductId) || lastAddedProductId <= 0) {
      preferredUpsellSourceProductId = null;
      hideUpsell();
      return;
    }

    preferredUpsellSourceProductId = lastAddedProductId;
    const complementarySourceIds = [
      lastAddedProductId,
      ...reverseCartProductIds.filter((productId) => productId !== lastAddedProductId),
    ];
    const relatedSourceIds = complementarySourceIds;

    const requestId = ++upsellRequestId;
    const recommendationCache = new Map();
    const getProductsForIntent = async (productId, intent) => {
      const cacheKey = `${productId}:${intent}`;
      if (recommendationCache.has(cacheKey)) {
        return recommendationCache.get(cacheKey);
      }

      const params = new URLSearchParams({
        product_id: String(productId),
        limit: String(DRAWER_UPSELL_FETCH_LIMIT),
        intent,
      });

      const res = await fetch(`${LOCALE_ROOT}recommendations/products.json?${params.toString()}`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`${intent} recommendations failed`);
      const data = await res.json();

      const products = Array.isArray(data?.products)
        ? data.products.filter((product) => {
          const productId = Number(product?.id);
          return Number.isFinite(productId) && !cartProductIds.has(productId);
        }).slice(0, DRAWER_UPSELL_FETCH_LIMIT)
        : [];

      recommendationCache.set(cacheKey, products);
      return products;
    };

    try {
      const complementaryIntent = { key: "complementary", title: "Pair it with" };
      const relatedIntent = { key: "related", title: "You may also like" };
      const selectedProducts = [];
      const selectedProductIds = new Set();
      let usedRelatedProducts = false;

      const appendProducts = (products) => {
        for (const product of products) {
          const productId = Number(product?.id);
          if (!Number.isFinite(productId) || selectedProductIds.has(productId)) continue;

          selectedProducts.push(product);
          selectedProductIds.add(productId);

          if (selectedProducts.length >= DRAWER_UPSELL_LIMIT) {
            return true;
          }
        }

        return selectedProducts.length >= DRAWER_UPSELL_LIMIT;
      };

      for (const sourceProductId of complementarySourceIds) {
        const products = await getProductsForIntent(sourceProductId, complementaryIntent.key);
        if (requestId !== upsellRequestId || !upsellContainer.isConnected) return;
        if (appendProducts(products)) {
          break;
        }
      }

      if (selectedProducts.length < DRAWER_UPSELL_LIMIT) {
        for (const sourceProductId of relatedSourceIds) {
          const products = await getProductsForIntent(sourceProductId, relatedIntent.key);
          if (requestId !== upsellRequestId || !upsellContainer.isConnected) return;

          const selectedCountBefore = selectedProducts.length;
          if (appendProducts(products)) {
            usedRelatedProducts = selectedProducts.length > selectedCountBefore || usedRelatedProducts;
            break;
          }

          if (selectedProducts.length > selectedCountBefore) {
            usedRelatedProducts = true;
          }
        }
      }

      if (selectedProducts.length === 0) {
        hideUpsell();
        return;
      }

      if (upsellTitle) {
        upsellTitle.textContent = usedRelatedProducts ? relatedIntent.title : complementaryIntent.title;
      }
      upsellItem.innerHTML = selectedProducts.map(buildUpsellCard).join("");
      upsellContainer.style.display = "";
    } catch (error) {
      if (requestId !== upsellRequestId) return;
      hideUpsell();
    }
  };

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
      await renderUpsell(cartData);

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

  const handleAddToCartSubmit = async (form) => {
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
      } else if (quantity > 99) {
        formData.set("quantity", "99");
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

      try {
        const addedItem = await res.clone().json();
        const addedProductId = Number(addedItem?.product_id);
        if (Number.isFinite(addedProductId) && addedProductId > 0) {
          preferredUpsellSourceProductId = addedProductId;
        }
      } catch (parseError) {
        preferredUpsellSourceProductId = null;
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
  };

  const bindAddToCart = () => {
    if (isCartPage) return;

    document.addEventListener("submit", async (e) => {
      const form = e.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (!form.matches('form[action*="/cart/add"]')) return;

      e.preventDefault();
      await handleAddToCartSubmit(form);
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
