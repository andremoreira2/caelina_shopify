(() => {
  const CARD_SELECTOR = ".collection-card";

  const initCard = (card) => {
    if (!(card instanceof HTMLElement)) return;
    if (card.dataset.collectionCardGalleryReady === "true") return;

    const image = card.querySelector("[data-collection-card-image]");
    const dataNode = card.querySelector("[data-collection-card-images]");
    const prevButton = card.querySelector("[data-collection-card-prev]");
    const nextButton = card.querySelector("[data-collection-card-next]");
    const media = card.querySelector(".collection-card__media");

    if (!image || !dataNode || !prevButton || !nextButton || !media) return;

    let images = [];
    try {
      images = JSON.parse(dataNode.textContent || "[]");
    } catch (error) {
      images = [];
    }

    if (!Array.isArray(images) || images.length < 2) return;

    let currentIndex = 0;

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
    };

    const setIndex = (nextIndex) => {
      const wrappedIndex = ((nextIndex % images.length) + images.length) % images.length;
      if (wrappedIndex === currentIndex) return;
      currentIndex = wrappedIndex;
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
