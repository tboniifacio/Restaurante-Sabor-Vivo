(function (window, document) {
  'use strict';

  const catalog = window.StepZoneCatalog;
  const cart = window.StepZoneCart;
  if (!catalog || !cart) {
    console.error('StepZone: dependências de catálogo ou carrinho não encontradas.');
    return;
  }

  const UI = {
    init() {
      this.updateYear();
      this.setupNavToggle();
      this.updateCartBadge();
      this.setupEvents();
      this.handleCtaForm();
    },

    updateYear() {
      const yearEl = document.getElementById('year');
      if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
      }
    },

    setupNavToggle() {
      const toggle = document.querySelector('[data-nav-toggle]');
      const nav = document.querySelector('[data-nav]');
      if (!toggle || !nav) return;

      toggle.addEventListener('click', () => {
        const isOpen = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(isOpen));
      });

      nav.addEventListener('click', (event) => {
        if (event.target.tagName === 'A') {
          nav.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    },

    updateCartBadge() {
      const badge = document.querySelector('[data-cart-badge]');
      const cartLink = document.querySelector('[data-cart-link]');
      if (!badge || !cartLink) return;

      const count = cart.getItemCount();
      if (count > 0) {
        badge.textContent = String(count);
        badge.classList.remove('is-hidden');
        cartLink.setAttribute('aria-label', `Abrir carrinho (${count} itens)`);
      } else {
        badge.classList.add('is-hidden');
        cartLink.setAttribute('aria-label', 'Abrir carrinho');
      }
    },

    setupEvents() {
      document.addEventListener('click', (event) => {
        const addButton = event.target.closest('[data-add-to-cart]');
        if (addButton) {
          event.preventDefault();
          const productId = addButton.getAttribute('data-add-to-cart');
          const selectedSize = addButton.getAttribute('data-selected-size') || null;

          const product = catalog.getById(productId);
          if (!product) {
            this.showToast('Produto indisponível.', 'error');
            return;
          }

          cart.addItem({
            id: product.id,
            qty: 1,
            selectedSize,
            image: product.image
          });

          this.showToast(`${product.name} adicionado ao carrinho!`, 'success');
        }
      });

      document.addEventListener('stepzone:cart-change', () => {
        this.updateCartBadge();
      });
    },

    handleCtaForm() {
      const form = document.getElementById('cta-form');
      if (!form) return;
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const emailInput = form.querySelector('input[type="email"]');
        if (!emailInput || !emailInput.value.trim()) {
          this.showToast('Informe um e-mail válido.', 'error');
          return;
        }
        emailInput.value = '';
        this.showToast('Inscrição realizada com sucesso! ✨', 'success');
      });
    },

    showToast(message, type = 'info') {
      let toast = document.querySelector('.toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        toast.setAttribute('role', 'status');
        document.body.appendChild(toast);
      }

      toast.textContent = message;
      toast.className = `toast toast--${type}`;
      void toast.offsetWidth;
      toast.classList.add('is-visible');

      clearTimeout(this.toastTimeout);
      this.toastTimeout = setTimeout(() => {
        toast.classList.remove('is-visible');
      }, 3000);
    },

    renderProductCard(product) {
      const price = catalog.formatCurrency(product.price);
      const categoryLabel = categoryName(product.category);
      const image = product.image || '/img/placeholder.png';
      const type = product.category === 'relogios' ? 'relogio' : product.category;
      return `
        <article
          class="product-card"
          data-item-id="${product.id}"
          data-item-name="${product.name}"
          data-item-price="${product.price}"
          data-item-image="${image}"
          data-item-type="${type}"
        >
          <div class="product-card__image">
            <img src="${image}" alt="${product.name}" loading="lazy">
          </div>
          <div class="product-card__info">
            <span class="product-card__category">${categoryLabel}</span>
            <h3 class="product-card__title">${product.name}</h3>
          </div>
          <div class="product-card__footer">
            <span class="product-card__price">${price}</span>
            <div class="product-card__actions">
              <a class="btn btn--ghost btn--sm" href="product.html?id=${product.id}">Ver detalhes</a>
              <button class="icon-btn" type="button" aria-label="Adicionar ${product.name} ao carrinho" data-add-to-cart="${product.id}">
                +
              </button>
            </div>
          </div>
        </article>
      `;
    }
  };

  function categoryName(category) {
    const map = {
      tenis: 'Tênis',
      oculos: 'Óculos',
      relogios: 'Relógios'
    };
    return map[category] || category;
  }

  document.addEventListener('DOMContentLoaded', () => UI.init());

  window.StepZoneUI = UI;
})(window, document);
