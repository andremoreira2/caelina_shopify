(function initCollectionToolbar() {
  var root = document.querySelector("[data-collection-root]");
  if (!root) return;

  var content = null;
  var toolbar = null;
  var drawer = null;
  var drawerPanel = null;
  var drawerBody = null;
  var sort = null;
  var loadingBar = null;
  var closeButton = null;
  var closeTimer = null;
  var loadingTimer = null;
  var requestController = null;
  var requestToken = 0;
  var lastFocusedElement = null;

  function syncDrawerMount() {
    var nextDrawer = root.querySelector("[data-filter-drawer]");

    if (nextDrawer) {
      if (drawer && drawer !== nextDrawer && document.body.contains(drawer)) {
        drawer.replaceWith(nextDrawer);
      }

      drawer = nextDrawer;
    } else if (!drawer || !document.body.contains(drawer)) {
      drawer = document.querySelector("[data-filter-drawer]");
    }

    if (drawer && drawer.parentNode !== document.body) {
      document.body.appendChild(drawer);
    }
  }

  function cacheElements() {
    content = root.querySelector("[data-collection-content]");
    toolbar = root.querySelector("[data-collection-toolbar]");
    syncDrawerMount();
    drawerPanel = drawer ? drawer.querySelector(".collection-filter-drawer__panel") : null;
    drawerBody = drawer ? drawer.querySelector(".collection-filter-drawer__body") : null;
    sort = root.querySelector("[data-collection-sort]");
    loadingBar = root.querySelector("[data-collection-loading]");
    closeButton = drawer ? drawer.querySelector(".collection-filter-drawer__close") : null;
    syncSortLabel();
  }

  function syncSortLabel() {
    if (!sort) return;

    var label = sort.querySelector("[data-collection-sort-label]");
    var summary = sort.querySelector("summary");
    if (!label || !summary) return;

    var defaultLabel = label.getAttribute("data-default-label") || "Sort by";
    var defaultSortValue = sort.getAttribute("data-default-sort-value") || "";
    var checkedInput = sort.querySelector('input[name="sort_by"]:checked');
    var checkedOption = checkedInput ? checkedInput.closest(".collection-sort__option") : null;
    var checkedLabel = checkedOption ? checkedOption.querySelector(".collection-sort__option-label") : null;
    var checkedValue = checkedInput ? checkedInput.value : "";
    var nextLabel = checkedValue && checkedValue !== defaultSortValue && checkedLabel
      ? checkedLabel.textContent.trim()
      : defaultLabel;

    label.textContent = nextLabel;
    summary.setAttribute("aria-label", "Sort by. Current option: " + nextLabel);
  }

  function normalizeUrl(input) {
    var url = input instanceof URL ? new URL(input.toString()) : new URL(input, window.location.href);
    url.searchParams.delete("filter_drawer");
    return url;
  }

  function isDrawerOpen() {
    return document.body.classList.contains("collection-filters-open");
  }

  function clearCloseTimer() {
    if (!closeTimer) return;
    window.clearTimeout(closeTimer);
    closeTimer = null;
  }

  function clearLoadingTimer() {
    if (!loadingTimer) return;
    window.clearTimeout(loadingTimer);
    loadingTimer = null;
  }

  function closeSort() {
    if (sort) {
      sort.removeAttribute("open");
    }
  }

  function syncLoadingBarPosition() {
    if (!loadingBar || !toolbar) return;

    var rect = toolbar.getBoundingClientRect();
    var top = Math.max(0, Math.round(rect.bottom - 1));
    var left = 0;
    var width = Math.max(0, Math.round(document.documentElement.clientWidth || window.innerWidth || rect.width));
    var clipLeft = 0;

    if (document.body.classList.contains("collection-filters-open") && drawerPanel) {
      var drawerRight = Math.round(drawerPanel.getBoundingClientRect().right || drawerPanel.offsetWidth || 0);
      clipLeft = Math.max(0, Math.min(width, drawerRight));
    }

    loadingBar.style.setProperty("--collection-loading-top", top + "px");
    loadingBar.style.setProperty("--collection-loading-left", left + "px");
    loadingBar.style.setProperty("--collection-loading-width", width + "px");
    loadingBar.style.setProperty("--collection-loading-clip-left", clipLeft + "px");
  }

  function startLoadingBar() {
    if (!loadingBar) return;

    clearLoadingTimer();
    syncLoadingBarPosition();
    loadingBar.classList.remove("is-finishing");
    loadingBar.classList.add("is-visible");

    window.requestAnimationFrame(function () {
      loadingBar.classList.add("is-starting");
    });
  }

  function finishLoadingBar() {
    if (!loadingBar) return;

    clearLoadingTimer();
    syncLoadingBarPosition();
    loadingBar.classList.add("is-visible", "is-starting");

    window.requestAnimationFrame(function () {
      loadingBar.classList.add("is-finishing");
    });

    loadingTimer = window.setTimeout(function () {
      loadingBar.classList.remove("is-visible", "is-starting", "is-finishing");
      loadingTimer = null;
    }, 420);
  }

  function setDrawerExpanded(expanded) {
    var buttons = root.querySelectorAll("[data-filter-open]");
    buttons.forEach(function (button) {
      button.setAttribute("aria-expanded", expanded ? "true" : "false");
    });

    document.body.classList.toggle("collection-filters-open", expanded);
    syncLoadingBarPosition();
  }

  function restoreDrawerState(expanded) {
    if (!drawer) return;

    clearCloseTimer();
    setDrawerExpanded(expanded);

    if (expanded) {
      drawer.hidden = false;
      drawer.classList.add("is-visible");
      return;
    }

    drawer.classList.remove("is-visible");
    drawer.hidden = true;
  }

  function openDrawer(options) {
    if (!drawer) return;

    closeSort();
    clearCloseTimer();

    if (!drawer.hidden && drawer.classList.contains("is-visible")) return;

    lastFocusedElement = document.activeElement;
    drawer.hidden = false;
    setDrawerExpanded(true);

    if (options && options.instant) {
      drawer.classList.add("is-visible");
      return;
    }

    window.requestAnimationFrame(function () {
      drawer.classList.add("is-visible");
      if (closeButton && !(options && options.restoreState)) {
        closeButton.focus();
      }
    });
  }

  function closeDrawer(options) {
    if (!drawer || drawer.hidden) return;

    drawer.classList.remove("is-visible");
    setDrawerExpanded(false);

    if (options && options.instant) {
      drawer.hidden = true;
      return;
    }

    closeTimer = window.setTimeout(function () {
      drawer.hidden = true;
      closeTimer = null;

      if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
        lastFocusedElement.focus();
      }
    }, 300);
  }

  function isPriceInput(input) {
    return input instanceof HTMLInputElement && input.matches("[data-price-input]");
  }

  function isPriceSliderInput(input) {
    return input instanceof HTMLInputElement && input.matches("[data-price-slider-input]");
  }

  function parsePriceNumber(value) {
    var parsedValue = window.parseFloat(value);
    return window.Number.isFinite(parsedValue) ? parsedValue : null;
  }

  function clampPriceValue(value, minBound, maxBound) {
    return Math.max(minBound, Math.min(maxBound, value));
  }

  function formatPriceValue(value) {
    if (!window.Number.isFinite(value)) return "";
    if (Math.abs(value - Math.round(value)) < 0.01) {
      return String(Math.round(value));
    }

    return String(value.toFixed(2)).replace(/\.?0+$/, "");
  }

  function formatPriceFieldValue(value, edgeValue) {
    if (Math.abs(value - edgeValue) < 0.01) return "";
    return formatPriceValue(value);
  }

  function getPriceRangeParts(group) {
    if (!group) return null;

    var slider = group.querySelector("[data-price-slider]");
    var minInput = group.querySelector('[data-price-input="min"]');
    var maxInput = group.querySelector('[data-price-input="max"]');
    var minSlider = group.querySelector('[data-price-slider-input="min"]');
    var maxSlider = group.querySelector('[data-price-slider-input="max"]');

    if (!slider || !minInput || !maxInput || !minSlider || !maxSlider) {
      return null;
    }

    return {
      slider: slider,
      minInput: minInput,
      maxInput: maxInput,
      minSlider: minSlider,
      maxSlider: maxSlider
    };
  }

  function getPriceRangeBounds(parts) {
    var minBound = parsePriceNumber(parts.minSlider.min);
    var limit = parsePriceNumber(parts.maxSlider.max);
    return {
      min: minBound != null ? minBound : 0,
      max: limit != null ? limit : 0
    };
  }

  function normalizePriceRangeValues(minValue, maxValue, bounds, sourceSide) {
    var normalizedMin = clampPriceValue(minValue == null ? bounds.min : minValue, bounds.min, bounds.max);
    var normalizedMax = clampPriceValue(maxValue == null ? bounds.max : maxValue, bounds.min, bounds.max);

    if (normalizedMin > normalizedMax) {
      if (sourceSide === "max") {
        normalizedMin = normalizedMax;
      } else {
        normalizedMax = normalizedMin;
      }
    }

    return {
      min: normalizedMin,
      max: normalizedMax
    };
  }

  function updatePriceSliderVisual(parts, values, bounds) {
    var safeSpan = bounds.max - bounds.min > 0 ? bounds.max - bounds.min : 1;

    parts.minSlider.value = String(values.min);
    parts.maxSlider.value = String(values.max);
    parts.slider.style.setProperty("--price-slider-start", (values.min - bounds.min) / safeSpan * 100 + "%");
    parts.slider.style.setProperty("--price-slider-end", (values.max - bounds.min) / safeSpan * 100 + "%");
  }

  function syncPriceRangeGroup(group, options) {
    var parts = getPriceRangeParts(group);
    if (!parts) return;

    var bounds = getPriceRangeBounds(parts);
    var useSliderValues = options && options.fromSlider;
    var sourceSide = options && options.sourceSide;
    var minValue = useSliderValues ? parsePriceNumber(parts.minSlider.value) : parsePriceNumber(parts.minInput.value);
    var maxValue = useSliderValues ? parsePriceNumber(parts.maxSlider.value) : parsePriceNumber(parts.maxInput.value);
    var normalizedValues = normalizePriceRangeValues(minValue, maxValue, bounds, sourceSide);

    updatePriceSliderVisual(parts, normalizedValues, bounds);

    if (options && options.commitFields) {
      parts.minInput.value = formatPriceFieldValue(normalizedValues.min, bounds.min);
      parts.maxInput.value = formatPriceFieldValue(normalizedValues.max, bounds.max);
    }
  }

  function preservePriceFloor() {
    var storedFloor = parsePriceNumber(root.getAttribute("data-price-floor"));

    Array.prototype.forEach.call(root.querySelectorAll("[data-price-range]"), function (group) {
      var parts = getPriceRangeParts(group);
      if (!parts) return;

      var currentMin = parsePriceNumber(parts.minSlider.min);
      if (currentMin == null) return;

      var floor = storedFloor != null ? Math.min(storedFloor, currentMin) : currentMin;
      root.setAttribute("data-price-floor", String(floor));

      if (floor < currentMin) {
        var s = String(floor);
        parts.minSlider.min = s;
        parts.maxSlider.min = s;
        parts.minInput.min = s;
        parts.maxInput.min = s;
        parts.minInput.placeholder = s;
      }
    });
  }

  function syncPriceRanges(scope, options) {
    var groups;

    if (!scope) {
      groups = root.querySelectorAll("[data-price-range]");
    } else if (scope.matches && scope.matches("[data-price-range]")) {
      groups = [scope];
    } else {
      groups = scope.querySelectorAll("[data-price-range]");
    }

    Array.prototype.forEach.call(groups, function (group) {
      syncPriceRangeGroup(group, options);
    });
  }

  function setFilterGroupSummaryState(group, expanded) {
    var summary = group ? group.querySelector(".collection-filter-group__summary") : null;
    if (!summary) return;
    summary.setAttribute("aria-expanded", expanded ? "true" : "false");
  }

  function resetFilterGroupContentStyles(content) {
    if (!content) return;
    content.style.height = "";
    content.style.opacity = "";
    content.style.overflow = "";
    content.style.transition = "";
    content.style.willChange = "";
  }

  function syncFilterGroupStates(scope) {
    var container = scope && scope.querySelectorAll ? scope : root;
    if (!container) return;

    Array.prototype.forEach.call(
      container.querySelectorAll(".collection-filter-group"),
      function (group) {
        setFilterGroupSummaryState(group, group.hasAttribute("open"));
        resetFilterGroupContentStyles(group.querySelector(".collection-filter-group__content"));
      }
    );
  }

  function normalizeSingleOpenFilterGroups(scope, openIndex) {
    var container = scope && scope.querySelectorAll ? scope : root;
    if (!container) return;

    var groups = container.querySelectorAll(".collection-filter-group");
    var normalizedOpenIndex = typeof openIndex === "number" ? openIndex : -1;

    if (normalizedOpenIndex < 0) {
      normalizedOpenIndex = Array.prototype.findIndex.call(groups, function (group) {
        return group.hasAttribute("open");
      });
    }

    Array.prototype.forEach.call(groups, function (group, index) {
      if (index === normalizedOpenIndex) {
        group.setAttribute("open", "");
        return;
      }

      group.removeAttribute("open");
    });
  }

  function closeSiblingFilterGroups(group) {
    var groupsContainer = group ? group.parentElement : null;
    if (!groupsContainer) return;

    Array.prototype.forEach.call(
      groupsContainer.querySelectorAll(".collection-filter-group"),
      function (siblingGroup) {
        if (siblingGroup === group || !siblingGroup.hasAttribute("open")) return;
        animateFilterGroup(siblingGroup, false);
      }
    );
  }

  function resetActiveFiltersStyles(activeFilters) {
    if (!activeFilters) return;
    activeFilters.style.height = "";
    activeFilters.style.opacity = "";
    activeFilters.style.overflow = "";
    activeFilters.style.marginBottom = "";
    activeFilters.style.transition = "";
    activeFilters.style.willChange = "";
  }

  function animateActiveFilters(activeFilters, expand) {
    if (!activeFilters) {
      return window.Promise.resolve();
    }

    if (activeFilters._cleanupActiveFiltersAnimation) {
      activeFilters._cleanupActiveFiltersAnimation();
    }

    var computedStyles = window.getComputedStyle(activeFilters);
    var targetHeight = expand ? Math.round(activeFilters.scrollHeight) : Math.round(activeFilters.getBoundingClientRect().height);
    var targetMarginBottom = computedStyles.marginBottom || "0px";

    if (!targetHeight) {
      resetActiveFiltersStyles(activeFilters);
      return window.Promise.resolve();
    }

    activeFilters.style.overflow = "hidden";
    activeFilters.style.willChange = "height, opacity, margin-bottom";
    activeFilters.style.height = (expand ? 0 : targetHeight) + "px";
    activeFilters.style.opacity = expand ? "0" : computedStyles.opacity;
    activeFilters.style.marginBottom = expand ? "0px" : targetMarginBottom;

    activeFilters.offsetHeight;

    activeFilters.style.transition = [
      "height 320ms cubic-bezier(0.22, 1, 0.36, 1)",
      "opacity 220ms ease",
      "margin-bottom 320ms cubic-bezier(0.22, 1, 0.36, 1)"
    ].join(", ");
    activeFilters.style.height = expand ? targetHeight + "px" : "0px";
    activeFilters.style.opacity = expand ? "1" : "0";
    activeFilters.style.marginBottom = expand ? targetMarginBottom : "0px";

    return new window.Promise(function (resolve) {
      var finalize = function () {
        if (activeFilters._cleanupActiveFiltersAnimation === finalize) {
          activeFilters._cleanupActiveFiltersAnimation = null;
        }

        activeFilters.removeEventListener("transitionend", onTransitionEnd);
        resetActiveFiltersStyles(activeFilters);
        resolve();
      };

      var onTransitionEnd = function (event) {
        if (event.target !== activeFilters || event.propertyName !== "height") return;
        finalize();
      };

      activeFilters._cleanupActiveFiltersAnimation = finalize;
      activeFilters.addEventListener("transitionend", onTransitionEnd);
    });
  }

  function animateActiveFiltersReveal(activeFilters) {
    return animateActiveFilters(activeFilters, true);
  }

  function animateActiveFiltersHide(activeFilters) {
    return animateActiveFilters(activeFilters, false);
  }

  function animateActiveFiltersResize(activeFilters, startHeight) {
    if (!activeFilters) {
      return window.Promise.resolve();
    }

    if (activeFilters._cleanupActiveFiltersAnimation) {
      activeFilters._cleanupActiveFiltersAnimation();
    }

    var normalizedStartHeight = Math.max(0, Math.round(startHeight || 0));
    var endHeight = Math.round(activeFilters.scrollHeight);

    if (!normalizedStartHeight || !endHeight || normalizedStartHeight === endHeight) {
      resetActiveFiltersStyles(activeFilters);
      return window.Promise.resolve();
    }

    activeFilters.style.overflow = "hidden";
    activeFilters.style.willChange = "height";
    activeFilters.style.height = normalizedStartHeight + "px";

    activeFilters.offsetHeight;

    activeFilters.style.transition = "height 320ms cubic-bezier(0.22, 1, 0.36, 1)";
    activeFilters.style.height = endHeight + "px";

    return new window.Promise(function (resolve) {
      var finalize = function () {
        if (activeFilters._cleanupActiveFiltersAnimation === finalize) {
          activeFilters._cleanupActiveFiltersAnimation = null;
        }

        activeFilters.removeEventListener("transitionend", onTransitionEnd);
        resetActiveFiltersStyles(activeFilters);
        resolve();
      };

      var onTransitionEnd = function (event) {
        if (event.target !== activeFilters || event.propertyName !== "height") return;
        finalize();
      };

      activeFilters._cleanupActiveFiltersAnimation = finalize;
      activeFilters.addEventListener("transitionend", onTransitionEnd);
    });
  }

  function setFilterGroupStaticState(scope, isStatic) {
    var container = scope && scope.querySelectorAll ? scope : root;
    if (!container) return;

    Array.prototype.forEach.call(
      container.querySelectorAll(".collection-filter-group"),
      function (group) {
        group.toggleAttribute("data-filter-group-static", isStatic);
      }
    );
  }

  function animateFilterGroup(group, expand) {
    var content = group ? group.querySelector(".collection-filter-group__content") : null;
    if (!content) return;

    if (content._cleanupFilterAnimation) {
      content._cleanupFilterAnimation();
    }

    var startHeight = Math.round(content.getBoundingClientRect().height);
    var startOpacity = window.getComputedStyle(content).opacity;

    if (expand) {
      group.setAttribute("open", "");
    }

    var endHeight = expand ? content.scrollHeight : 0;
    if (!expand && !startHeight) {
      group.removeAttribute("open");
      setFilterGroupSummaryState(group, false);
      resetFilterGroupContentStyles(content);
      return;
    }

    group.setAttribute("data-filter-group-animating", "");
    setFilterGroupSummaryState(group, expand);

    content.style.overflow = "hidden";
    content.style.willChange = "height, opacity";
    content.style.height = (expand ? 0 : startHeight) + "px";
    content.style.opacity = expand ? "0" : startOpacity;

    content.offsetHeight;

    content.style.transition = "height 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease";
    content.style.height = endHeight + "px";
    content.style.opacity = expand ? "1" : "0";

    var finalize = function (forceExpanded) {
      if (content._cleanupFilterAnimation === finalize) {
        content._cleanupFilterAnimation = null;
      }

      content.removeEventListener("transitionend", onTransitionEnd);
      group.removeAttribute("data-filter-group-animating");

      if (forceExpanded) {
        group.setAttribute("open", "");
      } else {
        group.removeAttribute("open");
      }

      setFilterGroupSummaryState(group, forceExpanded);
      resetFilterGroupContentStyles(content);
    };

    var onTransitionEnd = function (event) {
      if (event.target !== content || event.propertyName !== "height") return;
      finalize(expand);
    };

    content._cleanupFilterAnimation = function () {
      finalize(group.hasAttribute("open"));
    };

    content.addEventListener("transitionend", onTransitionEnd);
  }

  function getPriceInputValue(input, useDraftValue) {
    var value = useDraftValue ? input.value : input.defaultValue;
    return (value || "").trim();
  }

  function isPriceRangeDirty(group) {
    if (!group) return false;

    return Array.prototype.some.call(
      group.querySelectorAll("[data-price-input]"),
      function (input) {
        return getPriceInputValue(input, true) !== getPriceInputValue(input, false);
      }
    );
  }

  function syncPriceApplyState(scope) {
    var groups;

    if (!scope) {
      groups = root.querySelectorAll("[data-price-range]");
    } else if (scope.matches && scope.matches("[data-price-range]")) {
      groups = [scope];
    } else {
      groups = scope.querySelectorAll("[data-price-range]");
    }

    Array.prototype.forEach.call(groups, function (group) {
      var button = group.querySelector("[data-price-apply]");
      if (!button) return;

      var isDirty = isPriceRangeDirty(group);
      button.disabled = !isDirty;
      button.setAttribute("aria-disabled", isDirty ? "false" : "true");
    });
  }

  function buildUrlFromForm(form, options) {
    var action = form.getAttribute("action") || window.location.pathname;
    var url = normalizeUrl(action);

    Array.prototype.forEach.call(form.elements, function (element) {
      if (
        !element.name ||
        element.disabled ||
        !(element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)
      ) {
        return;
      }

      if (element.name === "filter_drawer" || element.type === "submit" || element.type === "button" || element.type === "reset") {
        return;
      }

      if ((element.type === "checkbox" || element.type === "radio") && !element.checked) {
        return;
      }

      var value = element.value;
      if (isPriceInput(element)) {
        value = getPriceInputValue(element, options && options.includeDraftPrice);
      } else if (typeof value === "string") {
        value = value.trim();
      }

      if (value == null || value === "") return;
      url.searchParams.append(element.name, value);
    });

    return url;
  }

  function getOpenFilterGroupState() {
    if (!drawer) return -1;

    return Array.prototype.findIndex.call(
      drawer.querySelectorAll(".collection-filter-group"),
      function (group) {
        return group.hasAttribute("open");
      }
    );
  }

  function restoreOpenFilterGroupState(openIndex) {
    if (!drawer) return;

    setFilterGroupStaticState(drawer, true);
    normalizeSingleOpenFilterGroups(drawer, openIndex);

    syncFilterGroupStates(drawer);

    window.requestAnimationFrame(function () {
      setFilterGroupStaticState(drawer, false);
    });
  }

  async function requestCollection(nextUrl, options) {
    if (!content) return;

    var normalizedUrl = normalizeUrl(nextUrl);
    var nextRequestToken = requestToken + 1;

    requestToken = nextRequestToken;
    if (requestController) {
      requestController.abort();
    }

    requestController = new AbortController();
    root.setAttribute("aria-busy", "true");
    startLoadingBar();

    try {
      var response = await fetch(normalizedUrl.toString(), {
        signal: requestController.signal,
        headers: {
          "X-Requested-With": "XMLHttpRequest"
        }
      });

      if (!response.ok) {
        throw new Error("Collection request failed");
      }

      var html = await response.text();
      if (requestToken !== nextRequestToken) return;

      var doc = new window.DOMParser().parseFromString(html, "text/html");
      var nextRoot = doc.querySelector("[data-collection-root]");
      var nextContent = nextRoot ? nextRoot.querySelector("[data-collection-content]") : null;

      if (!nextContent) {
        throw new Error("Collection markup missing");
      }

      var preserveDrawerState = isDrawerOpen();
      var drawerScrollTop = preserveDrawerState && drawerBody ? drawerBody.scrollTop : 0;
      var openGroupState = preserveDrawerState ? getOpenFilterGroupState() : -1;
      var currentActiveFilters = preserveDrawerState && drawer ? drawer.querySelector(".collection-filter-drawer__active") : null;
      var currentActiveFiltersHeight = currentActiveFilters ? Math.round(currentActiveFilters.getBoundingClientRect().height) : 0;
      var hadActiveFilters = !!currentActiveFilters;
      var nextHasActiveFilters = preserveDrawerState && !!nextContent.querySelector(".collection-filter-drawer__active");

      if (preserveDrawerState && hadActiveFilters && !nextHasActiveFilters && drawer) {
        await animateActiveFiltersHide(drawer.querySelector(".collection-filter-drawer__active"));
        if (requestToken !== nextRequestToken) return;
      }

      content.innerHTML = nextContent.innerHTML;
      cacheElements();
      restoreDrawerState(preserveDrawerState);

      if (preserveDrawerState && drawerBody) {
        drawerBody.scrollTop = drawerScrollTop;
        restoreOpenFilterGroupState(openGroupState);
      } else {
        normalizeSingleOpenFilterGroups(drawer || root);
        syncFilterGroupStates(drawer || root);
      }

      if (preserveDrawerState && !hadActiveFilters && drawer) {
        animateActiveFiltersReveal(drawer.querySelector(".collection-filter-drawer__active"));
      } else if (preserveDrawerState && hadActiveFilters && nextHasActiveFilters && drawer) {
        animateActiveFiltersResize(drawer.querySelector(".collection-filter-drawer__active"), currentActiveFiltersHeight);
      }

      preservePriceFloor();
      syncPriceRanges(drawer || root, {
        commitFields: true
      });
      syncPriceApplyState(drawer || root);

      if (doc.title) {
        document.title = doc.title;
      }

      if (!(options && options.fromPopstate)) {
        window.history.pushState({}, "", normalizedUrl.toString());
      }
    } catch (error) {
      if (error && error.name === "AbortError") {
        return;
      }

      window.location.assign(normalizedUrl.toString());
      return;
    } finally {
      if (requestToken === nextRequestToken) {
        requestController = null;
        root.removeAttribute("aria-busy");
        finishLoadingBar();
      }
    }
  }

  function handleFilterSubmit(form, options) {
    requestCollection(buildUrlFromForm(form, options));
  }

  function handleSortSubmit(form) {
    syncSortLabel();
    closeSort();
    requestCollection(buildUrlFromForm(form));
  }

  root.addEventListener("click", function (event) {
    var openTrigger = event.target.closest("[data-filter-open]");
    if (openTrigger && root.contains(openTrigger)) {
      event.preventDefault();
      openDrawer();
      return;
    }

    var link = event.target.closest("a");
    if (!link || !root.contains(link)) return;

    if (link.closest(".collection-pagination")) {
      event.preventDefault();
      requestCollection(link.href);
      return;
    }
  });

  root.addEventListener("change", function (event) {
    var target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    if (target.closest(".collection-sort__panel") && target.name === "sort_by" && sort) {
      handleSortSubmit(sort.querySelector("form"));
    }
  });

  root.addEventListener("submit", function (event) {
    var form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    if (form.closest(".collection-sort")) {
      event.preventDefault();
      handleSortSubmit(form);
    }
  });

  document.addEventListener("click", function (event) {
    var target = event.target;
    if (!(target instanceof Element) || !drawer) return;

    var closeTrigger = target.closest("[data-filter-close]");
    if (closeTrigger && drawer.contains(closeTrigger)) {
      event.preventDefault();
      closeDrawer();
      return;
    }

    var filterSummary = target.closest(".collection-filter-group__summary");
    if (filterSummary && drawer.contains(filterSummary)) {
      event.preventDefault();

      var filterGroup = filterSummary.closest(".collection-filter-group");
      if (!filterGroup) return;

      var shouldExpand = !filterGroup.hasAttribute("open");
      if (shouldExpand) {
        closeSiblingFilterGroups(filterGroup);
      }

      animateFilterGroup(filterGroup, shouldExpand);
      return;
    }

    var link = target.closest("a");
    if (!link || !drawer.contains(link)) return;

    if (link.matches(".collection-filter-chip, .collection-filter-drawer__reset")) {
      event.preventDefault();
      requestCollection(link.href);
    }
  });

  document.addEventListener("change", function (event) {
    var target = event.target;
    if (!(target instanceof HTMLInputElement) || !drawer || !drawer.contains(target)) return;
    if (!target.closest(".collection-filter-form")) return;

    if (isPriceSliderInput(target)) {
      var sliderGroup = target.closest("[data-price-range]");
      syncPriceRangeGroup(sliderGroup, {
        fromSlider: true,
        sourceSide: target.getAttribute("data-price-slider-input"),
        commitFields: true
      });
      syncPriceApplyState(sliderGroup);
      return;
    }

    if (target.type === "checkbox" || target.type === "radio") {
      handleFilterSubmit(drawer.querySelector("form"), {
        includeDraftPrice: false
      });
      return;
    }

    if (isPriceInput(target)) {
      var priceGroup = target.closest("[data-price-range]");
      syncPriceRangeGroup(priceGroup, {
        sourceSide: target.getAttribute("data-price-input"),
        commitFields: true
      });
      syncPriceApplyState(priceGroup);
    }
  });

  document.addEventListener("input", function (event) {
    var target = event.target;
    if (!drawer || !(target instanceof HTMLInputElement) || !drawer.contains(target)) return;
    if (!target.closest(".collection-filter-form")) return;

    if (isPriceSliderInput(target)) {
      var sliderGroup = target.closest("[data-price-range]");
      syncPriceRangeGroup(sliderGroup, {
        fromSlider: true,
        sourceSide: target.getAttribute("data-price-slider-input"),
        commitFields: true
      });
      syncPriceApplyState(sliderGroup);
      return;
    }

    if (!isPriceInput(target)) return;

    var priceGroup = target.closest("[data-price-range]");
    syncPriceRangeGroup(priceGroup, {
      sourceSide: target.getAttribute("data-price-input")
    });
    syncPriceApplyState(priceGroup);
  });

  document.addEventListener("submit", function (event) {
    var form = event.target;
    if (!(form instanceof HTMLFormElement) || !drawer || !drawer.contains(form)) return;

    if (form.matches(".collection-filter-form")) {
      event.preventDefault();
      syncPriceRanges(form, {
        commitFields: true
      });
      handleFilterSubmit(form, {
        includeDraftPrice: true
      });
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;

    if (isDrawerOpen()) {
      closeDrawer();
      return;
    }

    closeSort();
  });

  document.addEventListener("click", function (event) {
    if (!sort || !sort.hasAttribute("open")) return;
    if (sort.contains(event.target)) return;
    closeSort();
  });

  window.addEventListener("popstate", function () {
    requestCollection(window.location.href, {
      fromPopstate: true
    });
  });

  cacheElements();
  restoreDrawerState(false);
  normalizeSingleOpenFilterGroups(root);
  preservePriceFloor();
  syncPriceRanges(root, {
    commitFields: true
  });
  syncPriceApplyState(root);
  syncFilterGroupStates(root);
  syncLoadingBarPosition();
  window.addEventListener("resize", syncLoadingBarPosition);
  window.addEventListener("scroll", syncLoadingBarPosition, { passive: true });

  var currentUrl = normalizeUrl(window.location.href);
  if (currentUrl.toString() !== window.location.href) {
    window.history.replaceState({}, "", currentUrl.toString());
  }
})();
