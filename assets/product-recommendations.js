(() => {
  const section = document.querySelector("[data-product-recommendations]");
  if (!section) return;

  const productId = section.dataset.productId;
  const grid = section.querySelector("[data-recommendations-grid]");
  if (!productId || !grid) return;

  const LIMIT = 8;
  const url = `/recommendations/products.json?product_id=${productId}&limit=${LIMIT}&intent=related`;

  const formatMoney = (cents) => {
    const amount = (cents / 100).toFixed(2);
    return `$${amount}`;
  };

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

  const buildCard = (product) => {
    const variant = product.variants?.[0];
    const available = product.available;
    const imageCount = product.images?.length || 0;
    const featuredImage = product.featured_image;
    const price = product.price;
    const compareAtPrice = product.compare_at_price;

    let badgeHTML = "";
    if (!available) {
      badgeHTML = `<span class="collection-card__badge">Sold out</span>`;
    }

    let imageHTML = "";
    if (featuredImage) {
      imageHTML = `<img
        src="${featuredImage}&width=600"
        alt="${esc(product.title)}"
        loading="lazy"
        data-collection-card-image
      >`;
    }

    let galleryHTML = "";
    if (imageCount > 1) {
      const imagesJSON = JSON.stringify(
        product.images.map((img) => ({
          src: `${img}&width=600`,
          alt: product.title,
          width: 600,
          height: 800,
        }))
      ).replace(/</g, "\\u003C");

      galleryHTML = `
        <div class="collection-card__nav" data-collection-card-nav aria-hidden="true">
          <button type="button" class="collection-card__nav-button collection-card__nav-button--prev" data-collection-card-prev aria-label="Show previous image for ${esc(product.title)}">
            <svg class="collection-card__nav-icon" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
              <path d="M8.91003 19.9201L15.43 13.4001C16.2 12.6301 16.2 11.3701 15.43 10.6001L8.91003 4.08008" class="collection-card__nav-arrow"></path>
            </svg>
          </button>
          <button type="button" class="collection-card__nav-button collection-card__nav-button--next" data-collection-card-next aria-label="Show next image for ${esc(product.title)}">
            <svg class="collection-card__nav-icon" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
              <path d="M8.91003 19.9201L15.43 13.4001C16.2 12.6301 16.2 11.3701 15.43 10.6001L8.91003 4.08008" class="collection-card__nav-arrow"></path>
            </svg>
          </button>
        </div>
        <div class="collection-card__gallery-progress" data-collection-card-progress aria-hidden="true" style="--collection-card-gallery-count: ${imageCount};">
          <span class="collection-card__gallery-progress-thumb"></span>
        </div>
        <script type="application/json" data-collection-card-images>${imagesJSON}<\/script>
      `;
    }

    let actionsHTML = "";
    if (!available) {
      actionsHTML = `
        <button type="button" class="btn btn--atc collection-card__quick-add" disabled>
          <span class="btn-text">Sold out</span>
        </button>`;
    } else if (product.variants?.length === 1 && variant) {
      actionsHTML = `
        <form method="post" action="/cart/add" class="collection-card__quick-add-form">
          <input type="hidden" name="id" value="${variant.id}">
          <input type="hidden" name="quantity" value="1">
          <button type="submit" class="btn btn--atc collection-card__quick-add" aria-label="Add ${esc(product.title)} to cart">
            <span class="btn-icon" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            </span>
            <span class="btn-text">Add to cart</span>
          </button>
        </form>`;
    } else {
      actionsHTML = `
        <a class="btn btn--atc collection-card__quick-add collection-card__quick-add--link" href="${esc(product.url)}" aria-label="Choose options for ${esc(product.title)}">
          <span class="btn-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          </span>
          <span class="btn-text">Choose options</span>
        </a>`;
    }

    let priceHTML = `<span class="price__current">${formatMoney(price)}</span>`;
    if (compareAtPrice && compareAtPrice > price) {
      priceHTML += `<span class="price__compare">${formatMoney(compareAtPrice)}</span>`;
    }

    return `
      <article class="collection-card">
        <div class="collection-card__media">
          ${badgeHTML}
          <a class="collection-card__image-link" href="${esc(product.url)}" aria-label="${esc(product.title)}">
            <div class="collection-card__image-wrapper">
              ${imageHTML}
            </div>
          </a>
          ${galleryHTML}
          <div class="collection-card__actions">
            ${actionsHTML}
          </div>
        </div>
        <a class="collection-card__info" href="${esc(product.url)}">
          <span class="collection-card__title">${esc(product.title)}</span>
          <span class="collection-card__price price--card price">
            ${priceHTML}
          </span>
        </a>
      </article>
    `;
  };

  const initGalleries = () => {
    const CARD_SELECTOR = ".collection-card";
    const MOBILE_MEDIA_QUERY = "(max-width: 900px)";

    const initCard = (card) => {
      if (card.dataset.collectionCardGalleryReady === "true") return;

      const image = card.querySelector("[data-collection-card-image]");
      const dataNode = card.querySelector("[data-collection-card-images]");
      const prevButton = card.querySelector("[data-collection-card-prev]");
      const nextButton = card.querySelector("[data-collection-card-next]");
      const media = card.querySelector(".collection-card__media");
      const imageLink = card.querySelector(".collection-card__image-link");
      const progress = card.querySelector("[data-collection-card-progress]");

      if (!image || !dataNode || !prevButton || !nextButton || !media) return;

      let images = [];
      try {
        images = JSON.parse(dataNode.textContent || "[]");
      } catch (e) {
        return;
      }
      if (!Array.isArray(images) || images.length < 2) return;

      let currentIndex = 0;
      let touchStartX = 0;
      let touchStartY = 0;
      let suppressNextClick = false;
      const mobileMedia = window.matchMedia(MOBILE_MEDIA_QUERY);

      const syncProgress = () => {
        if (!(progress instanceof HTMLElement)) return;
        const val = images.length > 1 ? currentIndex / (images.length - 1) : 0;
        progress.style.setProperty("--collection-card-gallery-progress", val.toFixed(4));
      };

      const syncImage = () => {
        const img = images[currentIndex];
        if (!img) return;
        image.src = img.src;
        image.alt = img.alt || "";
        syncProgress();
      };

      const syncButtons = () => {
        prevButton.disabled = currentIndex <= 0;
        nextButton.disabled = currentIndex >= images.length - 1;
      };

      const setIndex = (idx) => {
        const clamped = Math.max(0, Math.min(images.length - 1, idx));
        if (clamped === currentIndex) return;
        currentIndex = clamped;
        syncImage();
        syncButtons();
      };

      const resetImage = () => setIndex(0);

      prevButton.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIndex(currentIndex - 1);
      });

      nextButton.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIndex(currentIndex + 1);
      });

      media.addEventListener("touchstart", (e) => {
        if (!mobileMedia.matches || e.touches.length !== 1) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }, { passive: true });

      media.addEventListener("touchend", (e) => {
        if (!mobileMedia.matches || e.changedTouches.length !== 1) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) < 32 || Math.abs(dx) <= Math.abs(dy)) return;
        suppressNextClick = true;
        setIndex(currentIndex + (dx < 0 ? 1 : -1));
        setTimeout(() => { suppressNextClick = false; }, 260);
      }, { passive: true });

      imageLink?.addEventListener("click", (e) => {
        if (!suppressNextClick) return;
        e.preventDefault();
        e.stopPropagation();
        suppressNextClick = false;
      });

      media.addEventListener("mouseleave", resetImage);
      media.addEventListener("focusout", (e) => {
        if (e.relatedTarget instanceof Node && media.contains(e.relatedTarget)) return;
        resetImage();
      });

      card.dataset.collectionCardGalleryReady = "true";
      syncImage();
      syncButtons();
    };

    grid.querySelectorAll(CARD_SELECTOR).forEach(initCard);
  };

  const initControls = () => {
    const progressBar = section.querySelector("[data-recommendations-progress]");
    const thumb = section.querySelector("[data-recommendations-progress-thumb]");
    if (!progressBar || !thumb) return;

    let isDragging = false;
    let thumbWidth = 0;
    let maxOffset = 0;

    const sync = () => {
      const maxScroll = grid.scrollWidth - grid.clientWidth;
      if (maxScroll <= 1) {
        progressBar.hidden = true;
        return;
      }

      progressBar.hidden = false;

      const ratio = grid.clientWidth / grid.scrollWidth;
      const progress = grid.scrollLeft / maxScroll;
      const trackWidth = progressBar.clientWidth;
      thumbWidth = Math.max(30, trackWidth * ratio);
      maxOffset = trackWidth - thumbWidth;

      thumb.style.setProperty("--rec-progress-thumb", `${thumbWidth}px`);
      thumb.style.setProperty("--rec-progress-offset", `${(progress * maxOffset).toFixed(1)}px`);
    };

    let raf = 0;
    const queueSync = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        sync();
      });
    };

    // Drag anywhere on the progress bar
    const onDragStart = (startX, jumpFirst) => {
      isDragging = true;
      progressBar.classList.add("is-dragging");
      grid.classList.add("is-dragging");
      const maxScroll = grid.scrollWidth - grid.clientWidth;
      const trackWidth = progressBar.clientWidth;

      // If clicking on the track (not the thumb), jump to that position first
      if (jumpFirst) {
        const rect = progressBar.getBoundingClientRect();
        const clickRatio = (startX - rect.left) / rect.width;
        grid.scrollLeft = clickRatio * maxScroll;
        sync();
      }

      const startScroll = grid.scrollLeft;

      const onDragMove = (moveX) => {
        const dx = moveX - startX;
        const scrollRatio = dx / (trackWidth - thumbWidth || 1);
        const newScroll = startScroll + scrollRatio * maxScroll;
        grid.scrollLeft = Math.max(0, Math.min(maxScroll, newScroll));
      };

      const onDragEnd = () => {
        isDragging = false;
        progressBar.classList.remove("is-dragging");
        grid.classList.remove("is-dragging");
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onDragEnd);
        document.removeEventListener("touchmove", onTouchMove);
        document.removeEventListener("touchend", onDragEnd);
        sync();
      };

      const onMouseMove = (e) => {
        e.preventDefault();
        onDragMove(e.clientX);
      };
      const onTouchMove = (e) => {
        onDragMove(e.touches[0].clientX);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onDragEnd);
      document.addEventListener("touchmove", onTouchMove, { passive: true });
      document.addEventListener("touchend", onDragEnd);
    };

    // Mousedown on thumb — drag from current position
    thumb.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onDragStart(e.clientX, false);
    });

    // Mousedown on track — jump then drag
    progressBar.addEventListener("mousedown", (e) => {
      e.preventDefault();
      onDragStart(e.clientX, true);
    });

    // Touch support
    progressBar.addEventListener("touchstart", (e) => {
      const onThumb = thumb.contains(e.target) || e.target === thumb;
      onDragStart(e.touches[0].clientX, !onThumb);
    }, { passive: true });

    // Drag-to-scroll on the grid itself
    let gridDragging = false;
    let gridStartX = 0;
    let gridScrollStart = 0;
    let gridMoved = false;

    grid.addEventListener("mousedown", (e) => {
      // Ignore buttons and form elements, but allow links and images
      if (e.target.closest("button, form, input")) return;
      e.preventDefault();
      gridDragging = true;
      gridMoved = false;
      gridStartX = e.clientX;
      gridScrollStart = grid.scrollLeft;
      grid.classList.add("is-dragging");
    });

    document.addEventListener("mousemove", (e) => {
      if (!gridDragging) return;
      e.preventDefault();
      const dx = e.clientX - gridStartX;
      if (Math.abs(dx) > 3) gridMoved = true;
      grid.scrollLeft = gridScrollStart - dx;
    });

    document.addEventListener("mouseup", () => {
      if (!gridDragging) return;
      gridDragging = false;
      grid.classList.remove("is-dragging");
      grid.style.cursor = "";
    });

    // Prevent native drag on links/images
    grid.addEventListener("dragstart", (e) => {
      e.preventDefault();
    });

    // Prevent clicks on links after dragging
    grid.addEventListener("click", (e) => {
      if (gridMoved) {
        e.preventDefault();
        e.stopPropagation();
        gridMoved = false;
      }
    }, true);

    grid.addEventListener("scroll", queueSync, { passive: true });
    window.addEventListener("resize", queueSync);
    sync();
  };

  fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(res.status);
      return res.json();
    })
    .then((data) => {
      const products = data.products;
      if (!products || products.length === 0) return;

      grid.innerHTML = products.map(buildCard).join("");
      section.hidden = false;
      initGalleries();
      initControls();
    })
    .catch(() => {
      // Silently fail — section stays hidden
    });
})();
