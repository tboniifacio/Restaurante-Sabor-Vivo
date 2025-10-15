(function (window, document) {
  'use strict';

  const cart = window.StepZoneCart;
  const catalog = window.StepZoneCatalog;
  if (!cart || !catalog) return;

  document.addEventListener('DOMContentLoaded', () => {
    const listContainer = document.querySelector('[data-cart-items]');
    const emptyState = document.querySelector('[data-cart-empty]');
    const subtotalEl = document.querySelector('[data-summary-subtotal]');
    const discountEl = document.querySelector('[data-summary-discount]');
    const totalEl = document.querySelector('[data-summary-total]');
    const checkoutLink = document.querySelector('[data-checkout-link]');

    if (!listContainer || !subtotalEl || !discountEl || !totalEl) return;

    function render() {
      const currentCart = cart.getCart();
      const totals = cart.getTotals();
      const formatter = cart.formatCurrency;

      if (!currentCart.items.length) {
        listContainer.innerHTML = '';
        emptyState?.classList.remove('is-hidden');
        disableCheckout(true);
      } else {
        emptyState?.classList.add('is-hidden');
        listContainer.innerHTML = currentCart.items.map(renderItem).join('');
        disableCheckout(false);
      }

      subtotalEl.textContent = formatter(totals.subtotal);
      discountEl.textContent = formatter(totals.discount);
      totalEl.textContent = formatter(totals.total);
    }

    function renderItem(item) {
      const product = catalog.getById(item.id) || item;
      const image = item.image || product.image;
      const category = categoryName(item.category || product.category);
      return `
        <article class="cart-item" data-item-id="${item.id}">
          <div class="cart-item__media">
            <img src="${image}" alt="${product.name}">
          </div>
          <div class="cart-item__info">
            <h3 class="cart-item__title">${product.name}</h3>
            <span class="cart-item__meta">${category}${item.selectedSize ? ` • Tam. ${item.selectedSize}` : ''}</span>
            <div class="cart-item__controls">
              <div class="qty-control" role="group" aria-label="Quantidade de ${product.name}">
                <button class="qty-btn" data-qty-action="decrease" type="button" aria-label="Diminuir quantidade">−</button>
                <span class="qty-value">${item.qty}</span>
                <button class="qty-btn" data-qty-action="increase" type="button" aria-label="Aumentar quantidade">+</button>
              </div>
              <button class="cart-item__remove" type="button" data-remove-item>Remover</button>
            </div>
          </div>
          <div class="cart-item__price">
            <span>Unitário</span>
            <strong>${cart.formatCurrency(item.price)}</strong>
            <span>Subtotal ${cart.formatCurrency(item.price * item.qty)}</span>
          </div>
        </article>
      `;
    }

    function disableCheckout(shouldDisable) {
      if (!checkoutLink) return;
      if (shouldDisable) {
        checkoutLink.classList.add('btn--ghost');
        checkoutLink.setAttribute('aria-disabled', 'true');
        checkoutLink.setAttribute('tabindex', '-1');
      } else {
        checkoutLink.classList.remove('btn--ghost');
        checkoutLink.removeAttribute('aria-disabled');
        checkoutLink.removeAttribute('tabindex');
      }
    }

    listContainer.addEventListener('click', (event) => {
      const button = event.target;
      const itemElement = button.closest('.cart-item');
      if (!itemElement) return;
      const productId = itemElement.getAttribute('data-item-id');

      if (button.matches('[data-qty-action]')) {
        const action = button.getAttribute('data-qty-action');
        const current = cart.getCart().items.find((item) => item.id === productId);
        if (!current) return;
        const nextQty = action === 'increase' ? current.qty + 1 : current.qty - 1;
        cart.updateQty(productId, nextQty);
        return;
      }

      if (button.matches('[data-remove-item]')) {
        cart.removeItem(productId);
      }
    });

    document.addEventListener('stepzone:cart-change', render);
    render();
  });

  function categoryName(category) {
    const map = {
      tenis: 'Tênis',
      oculos: 'Óculos',
      relogios: 'Relógios'
    };
    return map[category] || category;
  }
})(window, document);
