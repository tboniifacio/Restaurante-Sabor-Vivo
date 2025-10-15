(function (window, document) {
  'use strict';

  const catalog = window.StepZoneCatalog;
  const ui = window.StepZoneUI;
  if (!catalog || !ui) return;

  document.addEventListener('DOMContentLoaded', () => {
    const carousel = document.querySelector('[data-carousel]');
    if (!carousel) return;

    const products = catalog.featured(9);
    carousel.innerHTML = products.map((product) => ui.renderProductCard(product)).join('');

    const prevBtn = document.querySelector('[data-carousel-prev]');
    const nextBtn = document.querySelector('[data-carousel-next]');

    const scrollAmount = () => carousel.clientWidth * 0.8;

    prevBtn?.addEventListener('click', () => {
      carousel.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
    });

    nextBtn?.addEventListener('click', () => {
      carousel.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
    });

    const featuredGrid = document.querySelector('[data-featured-grid]');
    if (featuredGrid) {
      const featuredProducts = catalog.featured(6);
      featuredGrid.innerHTML = featuredProducts.map((product) => ui.renderProductCard(product)).join('');
    }
  });
})(window, document);
