(function (window, document) {
  'use strict';

  const catalog = window.StepZoneCatalog;
  const cart = window.StepZoneCart;
  const ui = window.StepZoneUI;
  if (!catalog || !cart || !ui) return;

  document.addEventListener('DOMContentLoaded', () => {
    const mainImageContainer = document.querySelector('[data-main-image]');
    const thumbsContainer = document.querySelector('[data-thumbnails]');
    const detailsContainer = document.querySelector('[data-product-details]');
    const relatedContainer = document.querySelector('[data-related-products]');

    if (!mainImageContainer || !thumbsContainer || !detailsContainer) return;

    const productId = new URLSearchParams(window.location.search).get('id');
    if (!productId) {
      renderError(detailsContainer, 'Produto não encontrado.');
      return;
    }

    const product = catalog.getById(productId);
    if (!product) {
      renderError(detailsContainer, 'Produto não encontrado ou indisponível.');
      return;
    }

    let selectedSize = product.sizes && product.sizes.length ? product.sizes[0] : null;
    let activeImage = product.gallery?.[0] || product.image;

    renderGallery(mainImageContainer, thumbsContainer, product, activeImage);
    renderDetails(detailsContainer, product, selectedSize);
    renderRelated(relatedContainer, product.id);

    thumbsContainer.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-thumb]');
      if (!button) return;
      const imageUrl = button.getAttribute('data-thumb');
      activeImage = imageUrl;
      renderGallery(mainImageContainer, thumbsContainer, product, activeImage);
    });

    detailsContainer.addEventListener('click', (event) => {
      const sizeButton = event.target.closest('[data-size]');
      if (sizeButton) {
        selectedSize = sizeButton.getAttribute('data-size');
        const buttons = detailsContainer.querySelectorAll('[data-size]');
        buttons.forEach((btn) => btn.classList.toggle('is-active', btn === sizeButton));
        const addBtn = detailsContainer.querySelector('[data-add-to-cart]');
        if (addBtn) addBtn.setAttribute('data-selected-size', selectedSize || '');
      }
    });

    detailsContainer.addEventListener('click', (event) => {
      const addButton = event.target.closest('[data-add-to-cart]');
      if (!addButton) return;

      if (product.sizes && product.sizes.length && !selectedSize) {
        ui.showToast('Selecione um tamanho antes de adicionar ao carrinho.', 'error');
        return;
      }

      cart.addItem({
        id: product.id,
        qty: 1,
        selectedSize,
        image: activeImage || product.image
      });

      ui.showToast(`${product.name} adicionado ao carrinho!`, 'success');
    });
  });

  function renderGallery(mainContainer, thumbsContainer, product, activeImage) {
    const images = product.gallery?.length ? product.gallery : [product.image];
    mainContainer.innerHTML = `<img src="${activeImage}" alt="${product.name}">`;
    thumbsContainer.innerHTML = images
      .map(
        (image) => `
        <button type="button" data-thumb="${image}" class="${image === activeImage ? 'is-active' : ''}">
          <img src="${image}" alt="${product.name}">
        </button>
      `
      )
      .join('');
  }

  function renderDetails(container, product, selectedSize) {
    const price = StepZoneCatalog.formatCurrency(product.price);
    const sizes = Array.isArray(product.sizes) ? product.sizes : [];
    const category = categoryName(product.category);

    container.innerHTML = `
      <span class="product__category">${category}</span>
      <h1 class="product__title">${product.name}</h1>
      <p class="product__description">${product.description}</p>
      <div class="product__price">${price}</div>
      ${
        sizes.length
          ? `
        <div class="product__sizes">
          <span class="product__sizes-label">Tamanhos disponíveis</span>
          <div class="size-selector">
            ${sizes
              .map(
                (size) => `
                <button type="button" data-size="${size}" class="${size === selectedSize ? 'is-active' : ''}">
                  ${size}
                </button>
              `
              )
              .join('')}
          </div>
        </div>`
          : ''
      }
      <div class="product__actions">
        <button class="btn btn--primary" type="button" data-add-to-cart="${product.id}" data-selected-size="${selectedSize || ''}">
          Adicionar ao carrinho
        </button>
        <a class="btn btn--ghost" href="products.html">Voltar aos produtos</a>
      </div>
    `;
  }

  function renderRelated(container, productId) {
    if (!container) return;
    const related = StepZoneCatalog.related(productId, 3);
    container.innerHTML = related.map((item) => StepZoneUI.renderProductCard(item)).join('');
  }

  function renderError(container, message) {
    container.innerHTML = `
      <div class="products__empty">
        <p>${message}</p>
        <a class="btn btn--secondary" href="products.html">Ver todos os produtos</a>
      </div>
    `;
  }

  function categoryName(category) {
    const map = {
      tenis: 'Tênis',
      oculos: 'Óculos',
      relogios: 'Relógios'
    };
    return map[category] || category;
  }
})(window, document);
