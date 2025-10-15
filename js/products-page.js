(function (window, document) {
  'use strict';

  const catalog = window.StepZoneCatalog;
  const ui = window.StepZoneUI;
  if (!catalog || !ui) return;

  document.addEventListener('DOMContentLoaded', () => {
    const grid = document.querySelector('[data-products-grid]');
    const categoryFilter = document.querySelector('[data-filter-category]');
    const searchInput = document.querySelector('[data-filter-search]');
    const emptyState = document.querySelector('[data-empty-state]');

    if (!grid || !categoryFilter || !searchInput) return;

    const initialCategory = new URLSearchParams(window.location.search).get('categoria');
    if (initialCategory) {
      categoryFilter.value = ['tenis', 'oculos', 'relogios'].includes(initialCategory) ? initialCategory : 'all';
    }

    let products = catalog.all();
    render(products, grid, emptyState);

    categoryFilter.addEventListener('change', () => {
      products = filterProducts();
      render(products, grid, emptyState);
    });

    searchInput.addEventListener('input', () => {
      products = filterProducts();
      render(products, grid, emptyState);
    });

    function filterProducts() {
      const selectedCategory = categoryFilter.value;
      const searchTerm = searchInput.value.trim();

      let filtered = catalog.all();
      if (selectedCategory !== 'all') {
        filtered = filtered.filter((product) => product.category === selectedCategory);
      }
      if (searchTerm) {
        filtered = filtered.filter((product) => {
          const text = `${product.name} ${product.description} ${product.category}`.toLowerCase();
          return text.includes(searchTerm.toLowerCase());
        });
      }
      return filtered;
    }
  });

  function render(products, container, emptyState) {
    if (!products.length) {
      container.innerHTML = '';
      emptyState?.classList.remove('is-hidden');
      return;
    }

    container.innerHTML = products.map((product) => window.StepZoneUI.renderProductCard(product)).join('');
    emptyState?.classList.add('is-hidden');
  }
})(window, document);
