(() => {
  const CARD_SELECTOR = ".collection-card";
  const MOBILE_MEDIA_QUERY = "(max-width: 900px)";

  const initCard = (card) => {
    if (!(card instanceof HTMLElement)) return;
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
    } catch (error) {
      images = [];
    }

    if (!Array.isArray(images) || images.length < 2) return;

    let currentIndex = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    let suppressNextClick = false;
    const mobileMedia = window.matchMedia(MOBILE_MEDIA_QUERY);

    const syncProgress = () => {
      if (!(progress instanceof HTMLElement)) return;
      const progressValue = images.length > 1 ? currentIndex / (images.length - 1) : 0;
      progress.style.setProperty("--collection-card-gallery-progress", progressValue.toFixed(4));
    };

    const syncButtons = () => {
      prevButton.disabled = currentIndex <= 0;
      nextButton.disabled = currentIndex >= images.length - 1;
    };

    const syncImage = () => {
      const nextImage = images[currentIndex];
      if (!nextImage || !nextImage.src) return;

      image.src = nextImage.src;
      image.alt = nextImage.alt || image.alt || "";

      if (nextImage.width) {
        image.width = nextImage.width;
      }

      if (nextImage.height) {
        image.height = nextImage.height;
      }

      syncButtons();
      syncProgress();
    };

    const setIndex = (nextIndex) => {
      const clampedIndex = Math.max(0, Math.min(images.length - 1, nextIndex));
      if (clampedIndex === currentIndex) return;
      currentIndex = clampedIndex;
      syncImage();
    };

    const resetImage = () => {
      if (currentIndex === 0) return;
      currentIndex = 0;
      syncImage();
    };

    prevButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setIndex(currentIndex - 1);
    });

    nextButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setIndex(currentIndex + 1);
    });

    media.addEventListener(
      "touchstart",
      (event) => {
        if (!mobileMedia.matches || event.touches.length !== 1) return;
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
      },
      { passive: true }
    );

    media.addEventListener(
      "touchend",
      (event) => {
        if (!mobileMedia.matches || event.changedTouches.length !== 1) return;

        const deltaX = event.changedTouches[0].clientX - touchStartX;
        const deltaY = event.changedTouches[0].clientY - touchStartY;

        if (Math.abs(deltaX) < 32 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

        suppressNextClick = true;
        setIndex(currentIndex + (deltaX < 0 ? 1 : -1));
        window.setTimeout(() => {
          suppressNextClick = false;
        }, 260);
      },
      { passive: true }
    );

    imageLink?.addEventListener("click", (event) => {
      if (!suppressNextClick) return;
      event.preventDefault();
      event.stopPropagation();
      suppressNextClick = false;
    });

    media.addEventListener("mouseleave", resetImage);
    media.addEventListener("focusout", (event) => {
      if (event.relatedTarget instanceof Node && media.contains(event.relatedTarget)) return;
      resetImage();
    });

    card.dataset.collectionCardGalleryReady = "true";
    syncImage();
  };

  const initAll = (root = document) => {
    root.querySelectorAll(CARD_SELECTOR).forEach(initCard);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initAll(), { once: true });
  } else {
    initAll();
  }

  const content = document.querySelector("[data-collection-content]");
  if (!content || !("MutationObserver" in window)) return;

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches(CARD_SELECTOR)) {
          initCard(node);
          return;
        }

        initAll(node);
      });
    });
  });

  observer.observe(content, { childList: true, subtree: true });
})();
