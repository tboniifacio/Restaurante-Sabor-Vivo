(function (window, document) {
  'use strict';

  const cart = window.StepZoneCart;
  const catalog = window.StepZoneCatalog;
  const ui = window.StepZoneUI;
  if (!cart || !catalog || !ui) return;

  document.addEventListener('DOMContentLoaded', () => {
    const cartData = cart.getCart();
    if (!cartData.items.length) {
      renderEmptyState();
      return;
    }

    const itemsContainer = document.querySelector('[data-checkout-items]');
    const subtotalEl = document.querySelector('[data-checkout-subtotal]');
    const discountEl = document.querySelector('[data-checkout-discount]');
    const totalEl = document.querySelector('[data-checkout-total]');

    if (!itemsContainer || !subtotalEl || !discountEl || !totalEl) return;

    const totals = cart.getTotals();
    itemsContainer.innerHTML = cartData.items.map(renderItem).join('');
    subtotalEl.textContent = cart.formatCurrency(totals.subtotal);
    discountEl.textContent = cart.formatCurrency(totals.discount);
    totalEl.textContent = cart.formatCurrency(totals.total);

    setupPaymentTabs();
    setupPix(totals.total);
    setupCreditForm();
    setupDebitForm();
  });

  function renderItem(item) {
    const product = catalog.getById(item.id) || item;
    return `
      <article class="checkout-item">
        <div class="checkout-item__media">
          <img src="${item.image || product.image}" alt="${product.name}">
        </div>
        <div class="checkout-item__info">
          <strong>${product.name}</strong>
          <span>${categoryName(product.category)}${item.selectedSize ? ` • Tam. ${item.selectedSize}` : ''}</span>
          <span>${item.qty} × ${cart.formatCurrency(item.price)}</span>
        </div>
        <div class="checkout-item__price">${cart.formatCurrency(item.price * item.qty)}</div>
      </article>
    `;
  }

  function setupPaymentTabs() {
    const tabs = document.querySelectorAll('[data-payment-tab]');
    const panels = document.querySelectorAll('[data-payment-panel]');

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-payment-tab');
        tabs.forEach((btn) => btn.classList.toggle('is-active', btn === tab));
        panels.forEach((panel) => panel.classList.toggle('is-active', panel.getAttribute('data-payment-panel') === target));
      });
    });
  }

  function setupPix(total) {
    const pixCodeField = document.querySelector('[data-pix-code]');
    const pixQr = document.querySelector('[data-pix-qr]');
    const copyBtn = document.querySelector('[data-copy-pix]');
    const payPixBtn = document.querySelector('[data-pay-pix]');
    if (!pixCodeField || !pixQr || !copyBtn || !payPixBtn) return;

    const pixCode = generatePixCode(total);
    pixCodeField.value = pixCode;
    pixQr.innerHTML = '';
    pixQr.appendChild(generateQrPlaceholder(pixCode));

    copyBtn.addEventListener('click', () => {
      copyToClipboard(pixCode)
        .then(() => ui.showToast('Código PIX copiado!', 'success'))
        .catch(() => ui.showToast('Não foi possível copiar o código.', 'error'));
    });

    payPixBtn.addEventListener('click', async () => {
      await simulatePayment(payPixBtn, 'Confirmar pagamento PIX');
    });
  }

  function setupCreditForm() {
    const form = document.querySelector('[data-payment-panel="credit"]');
    if (!form) return;

    const numberInput = form.querySelector('#credit-number');
    const expirationInput = form.querySelector('#credit-expiration');
    const cvvInput = form.querySelector('#credit-cvv');

    numberInput?.addEventListener('input', () => {
      numberInput.value = formatCardNumber(numberInput.value);
      clearError(numberInput);
    });

    expirationInput?.addEventListener('input', () => {
      expirationInput.value = formatExpiration(expirationInput.value);
      clearError(expirationInput);
    });

    cvvInput?.addEventListener('input', () => {
      cvvInput.value = onlyDigits(cvvInput.value).slice(0, 4);
      clearError(cvvInput);
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submitBtn = form.querySelector('[data-pay-credit]');
      if (!validateCreditForm(form)) {
        ui.showToast('Verifique os dados do cartão de crédito.', 'error');
        return;
      }
      await simulatePayment(submitBtn, 'Pagar com crédito');
    });
  }

  function setupDebitForm() {
    const form = document.querySelector('[data-payment-panel="debit"]');
    if (!form) return;

    const numberInput = form.querySelector('#debit-number');
    const expirationInput = form.querySelector('#debit-expiration');
    const cvvInput = form.querySelector('#debit-cvv');

    numberInput?.addEventListener('input', () => {
      numberInput.value = formatCardNumber(numberInput.value);
      clearError(numberInput);
    });

    expirationInput?.addEventListener('input', () => {
      expirationInput.value = formatExpiration(expirationInput.value);
      clearError(expirationInput);
    });

    cvvInput?.addEventListener('input', () => {
      cvvInput.value = onlyDigits(cvvInput.value).slice(0, 3);
      clearError(cvvInput);
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submitBtn = form.querySelector('[data-pay-debit]');
      if (!validateDebitForm(form)) {
        ui.showToast('Verifique os dados do cartão de débito.', 'error');
        return;
      }
      await simulatePayment(submitBtn, 'Pagar com débito');
    });
  }

  async function simulatePayment(button, defaultLabel) {
    if (!button) return;
    const original = button.textContent;
    button.textContent = 'Processando...';
    button.disabled = true;
    await new Promise((resolve) => setTimeout(resolve, 1600));
    button.textContent = original || defaultLabel;
    button.disabled = false;
    completeCheckout();
  }

  function completeCheckout() {
    const container = document.querySelector('.section--checkout .container');
    cart.clear();
    container.innerHTML = `
      <section class="checkout-success">
        <div class="checkout-success__icon">✔</div>
        <h1 class="section__title section__title--left" style="text-align:center;">Pedido confirmado!</h1>
        <p class="section__subtitle" style="text-align:center;">
          Recebemos o pagamento e o seu pedido #${generateOrderNumber()} já está em preparação.
        </p>
        <div class="checkout-success__actions">
          <a class="btn btn--primary" href="index.html">Voltar ao início</a>
          <a class="btn btn--ghost" href="products.html">Continuar explorando</a>
        </div>
      </section>
    `;
  }

  function renderEmptyState() {
    const container = document.querySelector('.section--checkout .container');
    if (!container) return;
    container.innerHTML = `
      <section class="checkout-success">
        <div class="checkout-success__icon">🛒</div>
        <h1 class="section__title section__title--left" style="text-align:center;">Carrinho vazio</h1>
        <p class="section__subtitle" style="text-align:center;">
          Adicione produtos ao carrinho antes de finalizar a compra.
        </p>
        <div class="checkout-success__actions">
          <a class="btn btn--primary" href="products.html">Ver produtos</a>
        </div>
      </section>
    `;
  }

  function validateCreditForm(form) {
    const nameInput = form.querySelector('#credit-name');
    const numberInput = form.querySelector('#credit-number');
    const expirationInput = form.querySelector('#credit-expiration');
    const cvvInput = form.querySelector('#credit-cvv');

    let valid = true;

    if (!nameInput.value.trim()) {
      setError(nameInput, 'Informe o nome impresso no cartão.');
      valid = false;
    } else {
      clearError(nameInput);
    }

    const numberDigits = onlyDigits(numberInput.value);
    if (!numberDigits || numberDigits.length < 13 || !luhnCheck(numberDigits)) {
      setError(numberInput, 'Número de cartão inválido.');
      valid = false;
    } else {
      clearError(numberInput);
    }

    if (!isValidExpiration(expirationInput.value)) {
      setError(expirationInput, 'Validade inválida.');
      valid = false;
    } else {
      clearError(expirationInput);
    }

    const cvvDigits = onlyDigits(cvvInput.value);
    if (cvvDigits.length < 3 || cvvDigits.length > 4) {
      setError(cvvInput, 'CVV inválido.');
      valid = false;
    } else {
      clearError(cvvInput);
    }

    return valid;
  }

  function validateDebitForm(form) {
    const nameInput = form.querySelector('#debit-name');
    const numberInput = form.querySelector('#debit-number');
    const expirationInput = form.querySelector('#debit-expiration');
    const cvvInput = form.querySelector('#debit-cvv');

    let valid = true;

    if (!nameInput.value.trim()) {
      setError(nameInput, 'Informe o nome impresso no cartão.');
      valid = false;
    } else {
      clearError(nameInput);
    }

    const numberDigits = onlyDigits(numberInput.value);
    if (!numberDigits || numberDigits.length < 13 || !luhnCheck(numberDigits)) {
      setError(numberInput, 'Número de cartão inválido.');
      valid = false;
    } else {
      clearError(numberInput);
    }

    if (!isValidExpiration(expirationInput.value)) {
      setError(expirationInput, 'Validade inválida.');
      valid = false;
    } else {
      clearError(expirationInput);
    }

    const cvvDigits = onlyDigits(cvvInput.value);
    if (cvvDigits.length !== 3) {
      setError(cvvInput, 'CVV inválido.');
      valid = false;
    } else {
      clearError(cvvInput);
    }

    return valid;
  }

  function setError(input, message) {
    const field = input.closest('.form-field');
    const feedback = field?.querySelector(`[data-error-for="${input.id}"]`);
    if (field) field.classList.add('is-invalid');
    if (feedback) feedback.textContent = message;
  }

  function clearError(input) {
    const field = input.closest('.form-field');
    const feedback = field?.querySelector(`[data-error-for="${input.id}"]`);
    if (field) field.classList.remove('is-invalid');
    if (feedback) feedback.textContent = '';
  }

  function luhnCheck(number) {
    let sum = 0;
    let shouldDouble = false;
    for (let i = number.length - 1; i >= 0; i--) {
      let digit = parseInt(number.charAt(i), 10);
      if (Number.isNaN(digit)) return false;
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
  }

  function isValidExpiration(value) {
    const cleaned = value.replace(/\s+/g, '');
    if (!/^\d{2}\/\d{2}$/.test(cleaned)) return false;
    const [month, year] = cleaned.split('/').map(Number);
    if (month < 1 || month > 12) return false;

    const current = new Date();
    const currentYear = current.getFullYear() % 100;
    const currentMonth = current.getMonth() + 1;

    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;
    return true;
  }

  function formatCardNumber(value) {
    return onlyDigits(value).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  }

  function formatExpiration(value) {
    const digits = onlyDigits(value).slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  function onlyDigits(value) {
    return (value || '').replace(/\D+/g, '');
  }

  function generatePixCode(total) {
    const amount = (total / 100).toFixed(2);
    const random = Math.random().toString(36).slice(2, 12).toUpperCase();
    return `00020126580014BR.GOV.BCB.PIX0136STEPZONE${random}520400005303986540${amount}5802BR5920STEPZONE STORE6009SaoPaulo62070503***6304ABCD`;
  }

  function generateQrPlaceholder(seed) {
    const size = 220;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);

    const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    background.setAttribute('width', size);
    background.setAttribute('height', size);
    background.setAttribute('fill', '#ffffff');
    svg.appendChild(background);

    let random = 0;
    for (let i = 0; i < seed.length; i++) {
      random = (random * 31 + seed.charCodeAt(i)) % 2147483647;
    }

    const cells = 25;
    const cellSize = size / cells;

    for (let row = 0; row < cells; row++) {
      for (let col = 0; col < cells; col++) {
        random = (random * 16807) % 2147483647;
        if (random % 7 < 3) {
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', col * cellSize);
          rect.setAttribute('y', row * cellSize);
          rect.setAttribute('width', cellSize);
          rect.setAttribute('height', cellSize);
          rect.setAttribute('fill', '#0f172a');
          svg.appendChild(rect);
        }
      }
    }

    return svg;
  }

  function copyToClipboard(text) {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        successful ? resolve() : reject();
      } catch (error) {
        document.body.removeChild(textarea);
        reject(error);
      }
    });
  }

  function generateOrderNumber() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
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
