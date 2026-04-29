(() => {
  const sectionHeadingPattern = /^(overview|contact information|section\s+\d+\s*[-–—:].*)$/i;

  const normalizeText = (value) => value.replace(/\s+/g, " ").trim();

  const initPolicySections = () => {
    const body = document.querySelector(".shopify-policy__body .rte, .policy-page__body");

    if (!body) {
      return;
    }

    const title = document.querySelector(".shopify-policy__title h1, .policy-page__title");
    const titleText = title ? normalizeText(title.textContent).toLowerCase() : "";

    Array.from(body.children).forEach((element) => {
      if (!(element instanceof HTMLElement) || element.tagName !== "P") {
        return;
      }

      const text = normalizeText(element.textContent);

      if (!text) {
        return;
      }

      if (titleText && text.toLowerCase() === titleText) {
        element.classList.add("policy-body-title");
        return;
      }

      if (sectionHeadingPattern.test(text)) {
        element.classList.add("policy-section-heading");
      }
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPolicySections, { once: true });
    return;
  }

  initPolicySections();
})();
