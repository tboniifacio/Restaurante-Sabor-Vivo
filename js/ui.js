(function (window, document) {
  'use strict';

  const cartStore = window.SaborVivoCart;
  if (!cartStore) {
    console.error('MÃ³dulo de carrinho nÃ£o encontrado.');
    return;
  }

  const TYPE_LABELS = {
    food: 'Prato principal',
    drink: 'Bebida'
  };

  const SELECTORS = {
    badge: '[data-cart-badge]',
    cartLink: '[data-cart-link]',
    cartItems: '[data-cart-items]',
    emptyCart: '[data-empty-cart]',
    summarySubtotal: '[data-summary-subtotal]',
    summaryFee: '[data-summary-fee]',
    summaryDiscount: '[data-summary-discount]',
    summaryTotal: '[data-summary-total]',
    checkoutLink: '[data-checkout-link]',
    couponContainer: '[data-coupon-applied]',
    couponLabel: '[data-coupon-label]',
    couponInput: '[data-coupon-input]'
  };

  let toastTimeoutId = null;

  document.addEventListener('DOMContentLoaded', () => {
    updateYear();
    setupNavToggle();
    setupAddToCart();
    setupCartEvents();
    updateBadge(cartStore.getItemCount());
    syncCartLink(cartStore.getItemCount());

    const currentCart = cartStore.getCart();
    const totals = cartStore.getTotals();
    const page = getPage();

    if (page === 'cart') {
      renderCartItems(currentCart);
      renderCartSummary(totals, currentCart);
    }

    window.addEventListener('saborvivo:cartchange', handleCartChange);
  });

  function getPage() {
    return (document.body && document.body.dataset && document.body.dataset.page) || 'home';
  }

  function handleCartChange(event) {
    const { cart, totals } = event.detail || {};
    const nextCart = cart || cartStore.getCart();
    const nextTotals = totals || cartStore.getTotals();
    const itemCount = nextCart.items ? nextCart.items.reduce((acc, item) => acc + item.qty, 0) : cartStore.getItemCount();

    updateBadge(itemCount);
    syncCartLink(itemCount);

    if (getPage() === 'cart') {
      renderCartItems(nextCart);
      renderCartSummary(nextTotals, nextCart);
    }
  }

  function updateYear() {
    const target = document.getElementById('year');
    if (target) {
      target.textContent = new Date().getFullYear();
    }
  }

  function setupNavToggle() {
    const toggle = document.querySelector('[data-nav-toggle]');
    const nav = document.querySelector('[data-nav]');
    if (!toggle || !nav) {
      return;
    }

    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      nav.classList.toggle('is-open');
    });

    nav.addEventListener('click', (event) => {
      if (event.target.matches('a')) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function setupAddToCart() {
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-add-to-cart]');
      if (!trigger) {
        return;
      }

      event.preventDefault();
      const source = trigger.closest('[data-item-id]');
      if (!source) {
        return;
      }

      const { itemId, itemName, itemPrice, itemImage, itemType } = source.dataset;
      if (!itemId || !itemPrice) {
        return;
      }

      cartStore.addItem({
        id: itemId,
        name: itemName || 'Item do cardÃ¡pio',
        price: Number(itemPrice),
        image: itemImage,
        type: itemType
      });

      showToast(`${itemName || 'Item'} adicionado ao carrinho.`, 'success');
    });
  }

  function setupCartEvents() {
    if (getPage() !== 'cart') {
      return;
    }

    document.addEventListener('click', (event) => {
      const qtyButton = event.target.closest('[data-qty-action]');
      if (qtyButton) {
        event.preventDefault();
        const action = qtyButton.dataset.qtyAction;
        const itemElement = qtyButton.closest('[data-item-id]');
        if (!itemElement) return;

        const itemId = itemElement.dataset.itemId;
        const cart = cartStore.getCart();
        const currentItem = cart.items.find((item) => item.id === itemId);
        if (!currentItem) return;

        const nextQty = action === 'increase' ? currentItem.qty + 1 : currentItem.qty - 1;
        cartStore.updateQty(itemId, nextQty);
        return;
      }

      const removeButton = event.target.closest('[data-remove-item]');
      if (removeButton) {
        event.preventDefault();
        const itemElement = removeButton.closest('[data-item-id]');
        if (!itemElement) return;
        cartStore.removeItem(itemElement.dataset.itemId);
        showToast('Item removido do carrinho.', 'info');
        return;
      }

      const removeCoupon = event.target.closest('[data-remove-coupon]');
      if (removeCoupon) {
        event.preventDefault();
        cartStore.removeCoupon();
        showToast('Cupom removido.', 'info');
      }
    });

    const applyButton = document.querySelector('[data-apply-coupon]');
    if (applyButton) {
      applyButton.addEventListener('click', handleApplyCoupon);
    }

    const couponInput = document.querySelector(SELECTORS.couponInput);
    if (couponInput) {
      couponInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          handleApplyCoupon();
        }
      });
    }
  }

  function handleApplyCoupon() {
    const input = document.querySelector(SELECTORS.couponInput);
    if (!input) return;

    const code = input.value.trim().toUpperCase();
    if (!code) {
      showToast('Digite um cÃ³digo de cupom.', 'error');
      return;
    }

    const applied = cartStore.applyCoupon(code);
    if (applied) {
      input.value = '';
      showToast('Cupom aplicado com sucesso.', 'success');
    } else {
      showToast('Cupom invÃ¡lido.', 'error');
    }
  }

  function renderCartItems(cart) {
    const container = document.querySelector(SELECTORS.cartItems);
    const emptyState = document.querySelector(SELECTORS.emptyCart);
    if (!container) {
      return;
    }

    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      container.innerHTML = '';
      if (emptyState) {
        emptyState.classList.add('is-visible');
      }
      return;
    }

    const markup = cart.items.map(createCartItemMarkup).join('');
    container.innerHTML = markup;

    if (emptyState) {
      emptyState.classList.remove('is-visible');
    }
  }

  function createCartItemMarkup(item) {
    const name = escapeHtml(item.name);
    const unit = cartStore.formatCurrency(item.price);
    const subtotal = cartStore.formatCurrency(item.price * item.qty);
    const typeLabel = escapeHtml(TYPE_LABELS[item.type] || 'Item');

    return `
      <article class="cart-item" data-item-id="${escapeHtml(item.id)}" data-qty="${item.qty}">
        <div class="cart-item__media">
          <img src="${escapeAttribute(item.image)}" alt="${name}" loading="lazy" />
        </div>
        <div class="cart-item__details">
          <h3 class="cart-item__title">${name}</h3>
          <span class="cart-item__meta">${typeLabel}</span>
          <button type="button" class="cart-item__remove" data-remove-item aria-label="Remover ${name} do carrinho">
            Remover
          </button>
        </div>
        <div class="cart-item__actions">
          <div class="qty-control" role="group" aria-label="Quantidade de ${name}">
            <button type="button" class="qty-btn" data-qty-action="decrease" aria-label="Diminuir quantidade de ${name}">−</button>
            <span class="qty-value">${item.qty}</span>
            <button type="button" class="qty-btn" data-qty-action="increase" aria-label="Aumentar quantidade de ${name}">+</button>
          </div>
          <div class="cart-item__price">
            <span class="cart-item__unit">${unit} un</span>
            <span class="cart-item__subtotal">${subtotal}</span>
          </div>
        </div>
      </article>
    `;
  }

  function renderCartSummary(totals, cart) {
    if (!totals) {
      return;
    }

    const subtotalEl = document.querySelector(SELECTORS.summarySubtotal);
    const feeEl = document.querySelector(SELECTORS.summaryFee);
    const discountEl = document.querySelector(SELECTORS.summaryDiscount);
    const totalEl = document.querySelector(SELECTORS.summaryTotal);

    if (subtotalEl) subtotalEl.textContent = cartStore.formatCurrency(totals.subtotal);
    if (feeEl) feeEl.textContent = cartStore.formatCurrency(totals.fee);
    if (discountEl) discountEl.textContent = cartStore.formatCurrency(totals.discount);
    if (totalEl) totalEl.textContent = cartStore.formatCurrency(totals.total);

    renderCouponState(cart);
    updateCheckoutLink(totals.total);
  }

  function renderCouponState(cart) {
    const couponBox = document.querySelector(SELECTORS.couponContainer);
    const couponLabel = document.querySelector(SELECTORS.couponLabel);

    if (!couponBox) {
      return;
    }

    if (cart && cart.coupon) {
      couponBox.classList.remove('is-hidden');
      if (couponLabel) {
        couponLabel.textContent = `Cupom ${cart.coupon.code} (${cart.coupon.percent}% OFF)`;
      }
    } else {
      couponBox.classList.add('is-hidden');
    }
  }

  function updateCheckoutLink(total) {
    const checkoutLink = document.querySelector(SELECTORS.checkoutLink);
    if (!checkoutLink) return;

    if (total > 0) {
      checkoutLink.removeAttribute('aria-disabled');
      checkoutLink.removeAttribute('tabindex');
      checkoutLink.classList.remove('btn--ghost');
    } else {
      checkoutLink.setAttribute('aria-disabled', 'true');
      checkoutLink.setAttribute('tabindex', '-1');
      checkoutLink.classList.add('btn--ghost');
    }
  }

  function updateBadge(count) {
    const badge = document.querySelector(SELECTORS.badge);
    if (!badge) {
      return;
    }

    if (count > 0) {
      badge.textContent = String(count);
      badge.classList.remove('is-hidden');
    } else {
      badge.textContent = '0';
      badge.classList.add('is-hidden');
    }
  }

  function syncCartLink(count) {
    const link = document.querySelector(SELECTORS.cartLink);
    if (!link) return;
    const label = count > 0 ? `Abrir carrinho (${count} itens)` : 'Abrir carrinho';
    link.setAttribute('aria-label', label);
  }

  function showToast(message, type = 'info') {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }

    toast.className = `toast toast--${type}`;
    toast.textContent = message;

    // Force reflow to restart animation
    void toast.offsetWidth;
    toast.classList.add('is-visible');

    if (toastTimeoutId) {
      window.clearTimeout(toastTimeoutId);
    }

    toastTimeoutId = window.setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 3200);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value || '');
  }
})(window, document);
