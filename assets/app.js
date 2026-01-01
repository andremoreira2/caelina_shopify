// ===== Helpers =====
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const wrap = (v, size) => ((v % size) + size) % size; // [0, size)
    const wrapAround = (v, size, pad = 0) => wrap(v + pad, size) - pad; // [-pad, size-pad)

    // Pretty gradient generator for tiles
    function gradientFor(i) {
      const a = (i * 47) % 360;
      const b = (a + 65) % 360;
      return `linear-gradient(135deg,
        hsl(${a} 90% 55% / 0.95),
        hsl(${b} 90% 55% / 0.95)
      )`;
    }

    // ===== Infinite canvas demo =====
    const viewport = document.getElementById("viewport");
    const layer = document.getElementById("layer");
    const brandLogo = document.getElementById("brandLogo");
    const introScreen = document.getElementById("introScreen");

    // Tile sizes (you can tweak these)
    let tileW = 360;
    let tileH = 260;
    let gap = 26;

    // Grid (computed from viewport size)
    let cols = 0, rows = 0, totalW = 0, totalH = 0;
    let tiles = []; // { el, baseX, baseY, label }
    let products = [];

    // Pan state
    let offsetX = 0, offsetY = 0;
    let velX = 0, velY = 0;

    // Drag tracking
    let dragging = false;
    let lastX = 0, lastY = 0;
    let lastT = 0;
    let pointerX = 0, pointerY = 0;
    let hovering = false;
    let hoverActive = false;
    let introActive = true;
    let menuHovering = false;
    let lastRender = 0;
    let autoPanX = 0, autoPanY = 0;

    // Inertia tuning
    const friction = 0.92;     // lower = stops faster
    const minVel = 0.02;       // below this, snap to 0
    const deadZone = 10;       // px radius around center with no auto-pan
    const edgeMaxSpeed = 12;   // px/frame near edges
    const wheelSpeed = 0.08;   // trackpad/wheel impulse scale
    const wheelMax = 30;       // cap wheel impulse to avoid spikes
    const panEase = 0.04;       // smoothing factor for auto-pan changes
    const introSpeed = 2;    // px/frame for the startup diagonal pan
    const introDuration = 99999; // ms for the startup hint animation
    let introStart = 0;
    const productsUrl = "/products.json?limit=250";

    async function loadProducts() {
      try {
        const res = await fetch(productsUrl, { cache: "no-store" });
        if (!res.ok) throw new Error(`Products request failed: ${res.status}`);
        const data = await res.json();
        products = Array.isArray(data.products) ? data.products : [];
      } catch (err) {
        console.warn("Product load failed, using demo tiles.", err);
        products = [];
      }
    }

    function computeGrid() {
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Enough tiles to cover screen + extra for smooth wrap
      cols = Math.ceil(w / (tileW + gap)) + 2;
      rows = Math.ceil(h / (tileH + gap)) + 2;

      totalW = cols * (tileW + gap);
      totalH = rows * (tileH + gap);

      // Center initial view on middle of grid
      offsetX = (w / 2) - (totalW / 2);
      offsetY = (h / 2) - (totalH / 2);

    }

    function buildTiles() {
      layer.innerHTML = "";
      tiles = [];

      // CSS vars for tile sizing
      document.documentElement.style.setProperty("--tw", tileW + "px");
      document.documentElement.style.setProperty("--th", tileH + "px");

      const labels = [
        "Modern", "Classic", "Dynamic", "Future", "Studio", "Work", "Environ",
        "Sport", "Vaca", "Vintage", "Art", "Motion"
      ];

      let idx = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const el = document.createElement(products.length ? "a" : "div");
          el.className = "tile";

          if (products.length) {
            const product = products[idx % products.length];
            const image = product.images && product.images[0] ? product.images[0].src : "";
            const price = product.variants && product.variants[0] ? product.variants[0].price : "";

            if (image) {
              const media = document.createElement("div");
              media.className = "tile-media";
              media.style.backgroundImage = `url("${image}")`;
              el.appendChild(media);
            } else {
              el.style.background = gradientFor(idx);
            }

            const info = document.createElement("div");
            info.className = "tile-info";

            const title = document.createElement("div");
            title.className = "tile-title";
            title.textContent = product.title || "Product";
            info.appendChild(title);

            if (price) {
              const priceEl = document.createElement("div");
              priceEl.className = "tile-price";
              priceEl.textContent = `$${price}`;
              info.appendChild(priceEl);
            }

            el.appendChild(info);
            if (el.tagName === "A") {
              el.href = `https://branvas.com/products/${product.handle}`;
              el.target = "_blank";
              el.rel = "noopener";
            }
          } else {
            // Use gradient backgrounds for the demo
            el.style.background = gradientFor(idx);

            const label = document.createElement("div");
            label.className = "label";
            label.textContent = labels[idx % labels.length];
            el.appendChild(label);
          }

          layer.appendChild(el);

          tiles.push({
            el,
            baseX: c * (tileW + gap),
            baseY: r * (tileH + gap),
            label: products.length ? (products[idx % products.length].title || "Product") : labels[idx % labels.length]
          });

          idx++;
        }
      }
    }

    function render() {
      // Intro auto-pan to hint interaction, then stop until hover
      if (introActive) {
        if (!introStart) introStart = performance.now();
        const t = performance.now() - introStart;
        const easeOut = Math.max(0, 1 - t / introDuration);
        offsetX += - introSpeed * easeOut;
        offsetY += - introSpeed * easeOut;
        if (t >= introDuration) {
          introActive = false;
          velX = 1;
          velY = 0;
        }
      }

      const now = performance.now();
      const dt = lastRender ? now - lastRender : 16.67;
      lastRender = now;

      let targetPanX = 0;
      let targetPanY = 0;

      // Auto-pan based on distance from center (dead zone in the middle)
      if (!introActive && hoverActive && hovering && !menuHovering) {
        const w = window.innerWidth;
        const h = window.innerHeight;

        const cx = w / 2;
        const cy = h / 2;
        const dx = pointerX - cx;
        const dy = pointerY - cy;

        const maxX = (w / 2) - deadZone;
        const maxY = (h / 2) - deadZone;

        // Normalize to [-1, 1] outside the dead zone
        const nx = maxX > 0 ? clamp(dx / maxX, -1, 1) : 0;
        const ny = maxY > 0 ? clamp(dy / maxY, -1, 1) : 0;

        // Ease so it starts gentle and ramps up toward edges
        const ease = (t) => t * t;
        const sx = -Math.sign(nx) * ease(Math.abs(nx));
        const sy = -Math.sign(ny) * ease(Math.abs(ny));
        targetPanX = sx * edgeMaxSpeed;
        targetPanY = sy * edgeMaxSpeed;
      }

      const ease = 1 - Math.pow(1 - panEase, dt / 16.67);
      autoPanX += (targetPanX - autoPanX) * ease;
      autoPanY += (targetPanY - autoPanY) * ease;

      offsetX += autoPanX;
      offsetY += autoPanY;

      // Apply inertia when not dragging
      if (!dragging) {
        offsetX += velX;
        offsetY += velY;

        velX *= friction;
        velY *= friction;

        if (Math.abs(velX) < minVel) velX = 0;
        if (Math.abs(velY) < minVel) velY = 0;
      }

      // Wrap each tile into the visible repeating space
      // We wrap around totalW/totalH so tiles reappear on the opposite side.
      const padX = tileW + gap;
      const padY = tileH + gap;

      for (const t of tiles) {
        const x = t.baseX + offsetX;
        const y = t.baseY + offsetY;

        const wx = wrapAround(x, totalW, padX);
        const wy = wrapAround(y, totalH, padY);

        t.el.style.transform = `translate3d(${wx}px, ${wy}px, 0)`;
      }

      requestAnimationFrame(render);
    }

    // ===== Input =====
    function onDown(e) {
      dragging = true;
      viewport.classList.add("dragging");
      velX = 0; velY = 0;

      const p = getPoint(e);
      lastX = pointerX = p.x;
      lastY = pointerY = p.y;
      lastT = performance.now();
    }

    function onMove(e) {
      const p = getPoint(e);
      pointerX = p.x;
      pointerY = p.y;
      hoverActive = true;
      if (!dragging) return;

      const now = performance.now();
      const dt = Math.max(1, now - lastT);

      const dx = p.x - lastX;
      const dy = p.y - lastY;

      offsetX += dx;
      offsetY += dy;

      // Velocity for inertia (pixels per frame-ish)
      velX = dx / (dt / 16.67);
      velY = dy / (dt / 16.67);

      lastX = p.x;
      lastY = p.y;
      lastT = now;
    }

    function onUp() {
      dragging = false;
      viewport.classList.remove("dragging");
    }

    function getPoint(e) {
      if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      return { x: e.clientX, y: e.clientY };
    }

    // Wheel panning (nice for trackpads)
    function onWheel(e) {
      // Prevent page scroll
      e.preventDefault();
      if (menuHovering) return;
      offsetX -= e.deltaX;
      offsetY -= e.deltaY;

      // A little inertial feel from wheel, too
      velX = clamp(-e.deltaX * wheelSpeed, -wheelMax, wheelMax);
      velY = clamp(-e.deltaY * wheelSpeed, -wheelMax, wheelMax);
    }

    // Reshuffle colors (study helper)
    function reshuffle() {
      tiles.forEach((t, i) => (t.el.style.background = gradientFor(i + Math.floor(Math.random() * 999))));
    }

    // ===== Init / Resize =====
    function init() {
      computeGrid();
      buildTiles();
      requestAnimationFrame(render);
    }

    window.addEventListener("resize", () => {
      // Rebuild grid on resize so it always covers the screen
      init();
    });

    // Pointer + touch
    viewport.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    viewport.addEventListener("pointerenter", (e) => {
      hovering = true;
      hoverActive = true;
      introActive = false;
      velX = 0;
      velY = 0;
      const p = getPoint(e);
      pointerX = p.x;
      pointerY = p.y;
    });
    viewport.addEventListener("pointerleave", () => { hovering = false; });

    const dock = document.querySelector(".dock");
    if (dock) {
      dock.addEventListener("pointerenter", () => { menuHovering = true; });
      dock.addEventListener("pointerleave", () => { menuHovering = false; });
    }

    viewport.addEventListener("wheel", onWheel, { passive: false });

    window.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "r") reshuffle();
    });

    (async function boot() {
      await loadProducts();
      init();
      setTimeout(() => {
        if (brandLogo) brandLogo.classList.add("to-top");
        if (introScreen) introScreen.classList.add("fade-out");
      }, 600);
    })();

    /*
      HOW TO USE REAL IMAGES (optional):
      1) Put images in the same folder, e.g. /img/1.jpg, /img/2.jpg ...
      2) Replace tile background with:
         el.style.backgroundImage = `url("img/${(idx % N) + 1}.jpg")`;
         el.style.backgroundSize = "cover";
         el.style.backgroundPosition = "center";
    */
