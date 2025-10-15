(function (window, document) {
  'use strict';

  const STORAGE_KEY = 'stepzone:cart';
  const EVENT_NAME = 'stepzone:cart-change';

  const cartStore = {
    _supportsStorage: true,
    _memoryCart: createEmptyCart(),

    getCart() {
      const cart = this._load();
      return clone(cart);
    },

    getItemCount() {
      const { items } = this._load();
      return items.reduce((total, item) => total + item.qty, 0);
    },

    addItem(payload) {
      const cart = this._load();
      const normalized = normalizeItem(payload);
      if (!normalized) return this.getCart();

      const existing = cart.items.find((item) => item.id === normalized.id);
      if (existing) {
        existing.qty += normalized.qty;
      } else {
        cart.items.push(normalized);
      }

      return this._save(cart);
    },

    updateQty(productId, quantity) {
      const cart = this._load();
      const item = cart.items.find((entry) => entry.id === productId);
      if (!item) return this.getCart();

      const nextQty = Math.max(0, Math.round(Number(quantity) || 0));
      if (nextQty <= 0) {
        cart.items = cart.items.filter((entry) => entry.id !== productId);
      } else {
        item.qty = nextQty;
      }

      return this._save(cart);
    },

    removeItem(productId) {
      const cart = this._load();
      cart.items = cart.items.filter((entry) => entry.id !== productId);
      return this._save(cart);
    },

    clear() {
      this._memoryCart = createEmptyCart();
      this._persist(this._memoryCart);
      dispatchCartChange(this._memoryCart);
      return this.getCart();
    },

    getTotals() {
      const { items } = this._load();
      const subtotal = items.reduce((total, item) => total + item.price * item.qty, 0);
      const discount = 0;
      const total = Math.max(0, subtotal - discount);
      return { subtotal, discount, total };
    },

    formatCurrency(valueInCents) {
      return (valueInCents / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      });
    },

    _load() {
      if (!this._supportsStorage) return this._memoryCart;

      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          this._persist(this._memoryCart);
          return this._memoryCart;
        }

        const parsed = JSON.parse(raw);
        this._memoryCart = normalizeCart(parsed);
        return this._memoryCart;
      } catch (error) {
        console.warn('StepZone: não foi possível ler o carrinho no localStorage, usando memória.', error);
        this._supportsStorage = false;
        return this._memoryCart;
      }
    },

    _save(cart) {
      this._memoryCart = normalizeCart(cart);
      this._memoryCart.updatedAt = Date.now();
      this._persist(this._memoryCart);
      dispatchCartChange(this._memoryCart);
      return this.getCart();
    },

    _persist(cart) {
      if (!this._supportsStorage) return;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
      } catch (error) {
        console.warn('StepZone: erro ao salvar o carrinho, alternando para memória.', error);
        this._supportsStorage = false;
      }
    }
  };

  function createEmptyCart() {
    return {
      items: [],
      updatedAt: Date.now()
    };
  }

  function normalizeItem(data) {
    const catalog = window.StepZoneCatalog;
    const payload = typeof data === 'string' ? catalog?.getById(data) : data;
    if (!payload || !payload.id) return null;

    const product = catalog ? catalog.getById(payload.id) || payload : payload;

    const qty = Math.max(1, Math.round(Number(payload.qty) || 1));
    const price = resolvePrice(payload.price ?? product.price);

    return {
      id: product.id,
      name: product.name,
      category: product.category,
      price,
      qty,
      image: payload.image || product.image,
      sizes: product.sizes || [],
      selectedSize: payload.selectedSize || product.selectedSize || null
    };
  }

  function normalizeCart(raw) {
    if (!raw || typeof raw !== 'object') return createEmptyCart();
    const items = Array.isArray(raw.items) ? raw.items.map(normalizeItem).filter(Boolean) : [];
    return {
      items,
      updatedAt: raw.updatedAt || Date.now()
    };
  }

  function resolvePrice(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      if (value >= 1000) return Math.round(value);
      return Math.round(value * 100);
    }
    if (typeof value === 'string') {
      const numeric = Number(value.replace(/[^\d]+/g, ''));
      if (Number.isFinite(numeric)) return numeric;
    }
    return 0;
  }

  function clone(cart) {
    return {
      ...cart,
      items: cart.items.map((item) => ({ ...item }))
    };
  }

  function dispatchCartChange(cart) {
    const detail = {
      cart: clone(cart),
      totals: cartStore.getTotals()
    };
    document.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
  }

  function initStorageCheck() {
    try {
      const testKey = '__stepzone_check__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      cartStore._supportsStorage = true;
    } catch (error) {
      cartStore._supportsStorage = false;
    }
  }

  function handleStorageEvent(event) {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      const parsed = JSON.parse(event.newValue);
      cartStore._memoryCart = normalizeCart(parsed);
      dispatchCartChange(cartStore._memoryCart);
    } catch (error) {
      console.warn('StepZone: falha ao sincronizar o carrinho entre abas.', error);
    }
  }

  initStorageCheck();
  window.addEventListener('storage', handleStorageEvent);

  window.StepZoneCart = cartStore;
})(window, document);
