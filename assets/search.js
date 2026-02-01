
(function () {
    const selectors = {
        triggers: '[href="/search"]', // The existing search icons
        overlay: '[data-search-overlay]',
        close: '[data-search-close]',
        input: '[data-search-input]',
        results: '[data-search-results]'
    };

    const overlay = document.querySelector(selectors.overlay);
    if (!overlay) return;

    const input = overlay.querySelector(selectors.input);
    const results = overlay.querySelector(selectors.results);
    const triggers = document.querySelectorAll(selectors.triggers);
    const closeBtns = overlay.querySelectorAll(selectors.close);

    function openSearch(e) {
        if (e) e.preventDefault();
        overlay.removeAttribute('aria-hidden');
        // slight delay to focus input so transition runs smooth
        setTimeout(() => input.focus(), 100);
        document.body.style.overflow = 'hidden';
    }

    function closeSearch() {
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        input.value = '';
        results.innerHTML = '';
    }

    // Event Listeners
    triggers.forEach(btn => btn.addEventListener('click', openSearch));
    closeBtns.forEach(btn => btn.addEventListener('click', closeSearch));

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !overlay.getAttribute('aria-hidden')) {
            closeSearch();
        }
    });

    // Predictive Search Logic
    let debounceTimer;
    input.addEventListener('input', (e) => {
        const term = e.target.value.trim();
        results.innerHTML = ''; // clear old results immediately or keep? usually clear or show loading

        clearTimeout(debounceTimer);
        if (term.length < 2) return;

        debounceTimer = setTimeout(() => {
            fetch(`/search/suggest.json?q=${encodeURIComponent(term)}&resources[type]=product&resources[limit]=5&section_id=predictive-search`)
                .then(res => res.json())
                .then(data => {
                    // Shopify usually returns sections if requested, or we parse raw JSON if using the suggest.json API directly without sections.
                    // But standard suggest.json returns a specific JSON structure.
                    // Let's use the raw JSON approach for simplicity as we don't have a section file for this custom theme.
                    renderResults(data);
                })
                .catch(err => {
                    console.error('Search failed', err);
                    // Fallback plain API
                    fetchResultsFallback(term);
                });
        }, 300);
    });

    function fetchResultsFallback(term) {
        // standard product json fetch if suggest api fails or behaves appropriately
        // Not implemented for now, relying on suggest.json
    }

    function renderResults(data) {
        // data structure from /search/suggest.json usually:
        // { resources: { results: { products: [ ... ] } } }
        const products = data.resources?.results?.products || [];

        if (products.length === 0) {
            results.innerHTML = `<div style="padding: 20px; opacity: 0.6; text-align: center;">No results found.</div>`;
            return;
        }

        const html = products.map(p => `
      <a href="${p.url}" class="search-result-item">
        ${p.image ? `<img src="${p.image}" class="search-result-image" alt="">` : ''}
        <div class="search-result-info">
          <span class="search-result-title">${p.title}</span>
          <span class="search-result-price">${p.price}</span>
        </div>
      </a>
    `).join('');

        results.innerHTML = html;
    }
})();
