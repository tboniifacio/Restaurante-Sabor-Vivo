(function (window, document) {
  'use strict';

  const STORAGE_KEY = 'saborvivo:cart';
  const SERVICE_FEE_CENTS = 0;
  const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80';
  const COUPONS = {
    SABOR10: 10,
    SABORVIP: 15
  };

  let supportsStorage = true;
  try {
    const testKey = '__sv-check__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
  } catch (error) {
    supportsStorage = false;
  }

  let memoryCart = getDefaultCart();

  function getDefaultCart() {
    return {
      items: [],
      coupon: null,
      fee: SERVICE_FEE_CENTS,
      updatedAt: Date.now()
    };
  }

  function cloneCart(cart) {
    return {
      ...cart,
      items: cart.items.map((item) => ({ ...item }))
    };
  }

  function normalizeItem(raw) {
    if (!raw || !raw.id) {
      return null;
    }

    const id = String(raw.id);
    const name = raw.name ? String(raw.name) : 'Item';
    const type = raw.type === 'drink' ? 'drink' : 'food';
    const price = normalizePrice(raw.price);
    if (price < 0) {
      return null;
    }

    const qty = Math.max(1, Math.round(Number(raw.qty) || 1));
    const image = raw.image || PLACEHOLDER_IMAGE;

    return { id, name, price, qty, image, type };
  }

  function normalizePrice(value) {
    if (typeof value === 'string' && value.includes(',')) {
      const cents = Number(value.replace(/\D/g, ''));
      return Number.isFinite(cents) ? cents : 0;
    }

    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) {
      return 0;
    }

    if (numberValue > 0 && numberValue < 10) {
      // Assume value was provided in BRL (e.g. 49.9) and convert to cents
      return Math.round(numberValue * 100);
    }

    return Math.round(numberValue);
  }

  function normalizeCoupon(coupon) {
    if (!coupon || typeof coupon.code !== 'string') {
      return null;
    }

    const code = coupon.code.toUpperCase();
    const percent = Math.round(Number(coupon.percent));

    if (!percent || percent <= 0) {
      return null;
    }

    return {
      code,
      percent: Math.min(90, percent)
    };
  }

  function normalizeCart(rawCart) {
    const safeCart = rawCart && typeof rawCart === 'object' ? rawCart : {};

    const items = Array.isArray(safeCart.items)
      ? safeCart.items
          .map(normalizeItem)
          .filter(Boolean)
      : [];

    const fee = normalizePrice(
      typeof safeCart.fee === 'number' || typeof safeCart.fee === 'string'
        ? safeCart.fee
        : SERVICE_FEE_CENTS
    );

    const coupon = normalizeCoupon(safeCart.coupon);

    return {
      items,
      coupon,
      fee,
      updatedAt: safeCart.updatedAt || Date.now()
    };
  }

  function loadCart() {
    if (!supportsStorage) {
      return cloneCart(memoryCart);
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        memoryCart = getDefaultCart();
        return cloneCart(memoryCart);
      }

      const parsed = JSON.parse(raw);
      memoryCart = normalizeCart(parsed);
      return cloneCart(memoryCart);
    } catch (error) {
      console.warn('Falha ao carregar o carrinho, usando dados em memÃ³ria.', error);
      memoryCart = normalizeCart(memoryCart);
      return cloneCart(memoryCart);
    }
  }

  function persistCart(cart) {
    memoryCart = normalizeCart(cart);
    memoryCart.updatedAt = Date.now();

    if (supportsStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCart));
      } catch (error) {
        console.warn('Falha ao salvar o carrinho no localStorage.', error);
      }
    }

    notifyChange();
    return cloneCart(memoryCart);
  }

  function notifyChange() {
    const detail = {
      cart: cloneCart(memoryCart),
      totals: computeTotals(memoryCart)
    };
    window.dispatchEvent(new CustomEvent('saborvivo:cartchange', { detail }));
  }

  function computeTotals(cart) {
    const subtotal = cart.items.reduce((total, item) => {
      return total + item.price * item.qty;
    }, 0);

    const fee = typeof cart.fee === 'number' ? cart.fee : SERVICE_FEE_CENTS;
    const discount = cart.coupon
      ? Math.min(subtotal, Math.round((subtotal * cart.coupon.percent) / 100))
      : 0;

    const total = Math.max(0, subtotal + fee - discount);

    return { subtotal, fee, discount, total };
  }

  function addItem(item) {
    const cart = loadCart();
    const normalizedItem = normalizeItem(item);

    if (!normalizedItem) {
      return cloneCart(cart);
    }

    const existing = cart.items.find(({ id }) => id === normalizedItem.id);
    if (existing) {
      existing.qty += normalizedItem.qty;
    } else {
      cart.items.push(normalizedItem);
    }

    return persistCart(cart);
  }

  function removeItem(itemId) {
    const cart = loadCart();
    cart.items = cart.items.filter(({ id }) => id !== itemId);
    return persistCart(cart);
  }

  function updateQty(itemId, qty) {
    const cart = loadCart();
    const quantity = Math.round(Number(qty));
    const item = cart.items.find(({ id }) => id === itemId);

    if (!item) {
      return cloneCart(cart);
    }

    if (!quantity || quantity <= 0) {
      cart.items = cart.items.filter(({ id }) => id !== itemId);
    } else {
      item.qty = quantity;
    }

    return persistCart(cart);
  }

  function clearCart() {
    return persistCart(getDefaultCart());
  }

  function setFee(valueInCents) {
    const cart = loadCart();
    cart.fee = Math.max(0, normalizePrice(valueInCents));
    return persistCart(cart);
  }

  function applyCoupon(code) {
    if (!code) {
      return false;
    }

    const normalizedCode = code.toUpperCase();
    const percent = COUPONS[normalizedCode];

    if (!percent) {
      return false;
    }

    const cart = loadCart();
    cart.coupon = { code: normalizedCode, percent };
    persistCart(cart);
    return true;
  }

  function removeCoupon() {
    const cart = loadCart();
    cart.coupon = null;
    persistCart(cart);
  }

  function getCart() {
    return loadCart();
  }

  function getTotals() {
    return computeTotals(loadCart());
  }

  function getItemCount() {
    const cart = loadCart();
    return cart.items.reduce((total, item) => total + item.qty, 0);
  }

  function formatCurrency(valueInCents) {
    return (valueInCents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  if (supportsStorage) {
    window.addEventListener('storage', (event) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      try {
        const nextCart = event.newValue ? JSON.parse(event.newValue) : getDefaultCart();
        memoryCart = normalizeCart(nextCart);
        notifyChange();
      } catch (error) {
        console.warn('Falha ao sincronizar o carrinho entre abas.', error);
      }
    });
  }

  const api = Object.freeze({
    addItem,
    removeItem,
    updateQty,
    clearCart,
    setFee,
    applyCoupon,
    removeCoupon,
    getCart,
    getTotals,
    getItemCount,
    formatCurrency
  });

  window.SaborVivoCart = api;
})(window, document);
