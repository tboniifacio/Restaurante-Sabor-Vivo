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
    items: '[data-checkout-items]',
    subtotal: '[data-checkout-subtotal]',
    fee: '[data-checkout-fee]',
    discount: '[data-checkout-discount]',
    total: '[data-checkout-total]',
    pixForm: '[data-payment-form="pix"]',
    creditForm: '[data-payment-form="credit"]',
    debitForm: '[data-payment-form="debit"]',
    pixCode: '[data-pix-code]',
    pixQr: '[data-pix-qr]',
    copyPix: '[data-copy-pix]',
    payPix: '[data-pay-pix]',
    payCredit: '[data-pay-credit]',
    payDebit: '[data-pay-debit]'
  };

  let currentPixCode = '';
  let toastTimeoutId = null;
  let successShown = false;

  document.addEventListener('DOMContentLoaded', () => {
    if (getPage() !== 'checkout') {
      return;
    }

    const cart = cartStore.getCart();
    if (!cart.items.length) {
      renderEmptyCheckout();
      return;
    }

    renderSummary(cart, cartStore.getTotals());
    setupPaymentMethodToggle();
    setupPixSection();
    setupCreditForm();
    setupDebitForm();
    attachPixActions();
    attachPaymentHandlers();

    window.addEventListener('saborvivo:cartchange', ({ detail }) => {
      if (successShown) return;
      const nextCart = detail?.cart || cartStore.getCart();
      if (!nextCart.items.length) {
        renderEmptyCheckout();
        return;
      }
      renderSummary(nextCart, detail?.totals || cartStore.getTotals());
      regeneratePixCode();
    });
  });

  function getPage() {
    return (document.body && document.body.dataset && document.body.dataset.page) || 'home';
  }

  function renderEmptyCheckout() {
    const main = document.querySelector('.checkout-section .container');
    if (!main) return;
    main.innerHTML = `
      <div class="checkout-success">
        <div class="checkout-success__icon">🛒</div>
        <div>
          <h1 class="section__title section__title--left" style="text-align:center;">Carrinho vazio</h1>
          <p class="section__subtitle" style="text-align:center;">Selecione itens do cardÃ¡pio para finalizar sua experiÃªncia.</p>
        </div>
        <div class="checkout-success__actions">
          <a class="btn" href="index.html#menu">Explorar cardÃ¡pio</a>
        </div>
      </div>
    `;
  }

  function renderSummary(cart, totals) {
    const itemsContainer = document.querySelector(SELECTORS.items);
    if (itemsContainer) {
      const markup = cart.items.map(createOrderItemMarkup).join('');
      itemsContainer.innerHTML = markup || '<p>Nenhum item encontrado.</p>';
    }

    const subtotalEl = document.querySelector(SELECTORS.subtotal);
    const feeEl = document.querySelector(SELECTORS.fee);
    const discountEl = document.querySelector(SELECTORS.discount);
    const totalEl = document.querySelector(SELECTORS.total);

    if (subtotalEl) subtotalEl.textContent = cartStore.formatCurrency(totals.subtotal);
    if (feeEl) feeEl.textContent = cartStore.formatCurrency(totals.fee);
    if (discountEl) discountEl.textContent = cartStore.formatCurrency(totals.discount);
    if (totalEl) totalEl.textContent = cartStore.formatCurrency(totals.total);
  }

  function createOrderItemMarkup(item) {
    const name = escapeHtml(item.name);
    const typeLabel = escapeHtml(TYPE_LABELS[item.type] || 'Item');
    const unit = cartStore.formatCurrency(item.price);
    const subtotal = cartStore.formatCurrency(item.price * item.qty);
    return `
      <div class="order-item">
        <div class="order-item__info">
          <img src="${escapeAttribute(item.image)}" alt="${name}" loading="lazy" />
          <div class="order-item__text">
            <span class="order-item__title">${name}</span>
            <span class="order-item__meta">${typeLabel}</span>
            <span class="order-item__qty">${item.qty}x ${unit}</span>
          </div>
        </div>
        <div class="order-item__price">${subtotal}</div>
      </div>
    `;
  }

  function setupPaymentMethodToggle() {
    const radios = document.querySelectorAll('input[name="payment-method"]');
    if (!radios.length) return;

    radios.forEach((radio) => {
      radio.addEventListener('change', () => togglePaymentForm(radio.value));
    });

    togglePaymentForm('pix');
  }

  function togglePaymentForm(method) {
    const forms = document.querySelectorAll('.payment-form');
    forms.forEach((form) => {
      if (form.dataset.paymentForm === method) {
        form.classList.add('is-active');
      } else {
        form.classList.remove('is-active');
      }
    });
  }

  function setupPixSection() {
    currentPixCode = generatePixCode();
    renderPixCode(currentPixCode);

    const pixField = document.querySelector(SELECTORS.pixCode);
    if (pixField) {
      pixField.value = currentPixCode;
    }
  }

  function regeneratePixCode() {
    currentPixCode = generatePixCode();
    const pixField = document.querySelector(SELECTORS.pixCode);
    if (pixField) {
      pixField.value = currentPixCode;
    }
    renderPixCode(currentPixCode);
  }

  function attachPixActions() {
    const copyButton = document.querySelector(SELECTORS.copyPix);
    if (copyButton) {
      copyButton.addEventListener('click', () => {
        if (!currentPixCode) return;
        copyToClipboard(currentPixCode)
          .then(() => showToast('CÃ³digo PIX copiado!', 'success'))
          .catch(() => showToast('NÃ£o foi possÃ­vel copiar o cÃ³digo.', 'error'));
      });
    }
  }

  function attachPaymentHandlers() {
    const pixButton = document.querySelector(SELECTORS.payPix);
    if (pixButton) {
      pixButton.addEventListener('click', () => processPayment('pix', pixButton));
    }

    const creditForm = document.querySelector(SELECTORS.creditForm);
    if (creditForm) {
      creditForm.addEventListener('submit', (event) => {
        event.preventDefault();
        handleCreditPayment(event.currentTarget);
      });
    }

    const debitForm = document.querySelector(SELECTORS.debitForm);
    if (debitForm) {
      debitForm.addEventListener('submit', (event) => {
        event.preventDefault();
        handleDebitPayment(event.currentTarget);
      });
    }
  }

  function setupCreditForm() {
    const numberInput = document.querySelector('[data-credit-number]');
    const expirationInput = document.querySelector('[data-credit-expiration]');
    const cvvInput = document.querySelector('[data-credit-cvv]');

    if (numberInput) {
      numberInput.addEventListener('input', () => {
        numberInput.value = formatCardNumber(numberInput.value);
        clearFieldError(numberInput);
      });
    }

    if (expirationInput) {
      expirationInput.addEventListener('input', () => {
        expirationInput.value = formatExpiration(expirationInput.value);
        clearFieldError(expirationInput);
      });
    }

    if (cvvInput) {
      cvvInput.addEventListener('input', () => {
        cvvInput.value = onlyDigits(cvvInput.value).slice(0, 4);
        clearFieldError(cvvInput);
      });
    }
  }

  function setupDebitForm() {
    const numberInput = document.querySelector('[data-debit-number]');
    const expirationInput = document.querySelector('[data-debit-expiration]');
    const cvvInput = document.querySelector('[data-debit-cvv]');

    if (numberInput) {
      numberInput.addEventListener('input', () => {
        numberInput.value = formatCardNumber(numberInput.value);
        clearFieldError(numberInput);
      });
    }

    if (expirationInput) {
      expirationInput.addEventListener('input', () => {
        expirationInput.value = formatExpiration(expirationInput.value);
        clearFieldError(expirationInput);
      });
    }

    if (cvvInput) {
      cvvInput.addEventListener('input', () => {
        cvvInput.value = onlyDigits(cvvInput.value).slice(0, 3);
        clearFieldError(cvvInput);
      });
    }
  }

  function handleCreditPayment(form) {
    const payload = validateCreditForm(form);
    if (!payload.valid) {
      showToast('Verifique os dados do cartÃ£o de crÃ©dito.', 'error');
      return;
    }

    processPayment('credit', form.querySelector(SELECTORS.payCredit), payload.data);
  }

  function handleDebitPayment(form) {
    const payload = validateDebitForm(form);
    if (!payload.valid) {
      showToast('Verifique os dados do cartÃ£o de dÃ©bito.', 'error');
      return;
    }

    processPayment('debit', form.querySelector(SELECTORS.payDebit), payload.data);
  }

  async function processPayment(method, button, data = {}) {
    if (!button) return;

    const cart = cartStore.getCart();
    if (!cart.items.length) {
      showToast('Seu carrinho estÃ¡ vazio.', 'error');
      renderEmptyCheckout();
      return;
    }

    toggleButtonLoading(button, true);

    try {
      await wait(1600);
      showToast('Pagamento aprovado!', 'success');
      cartStore.clearCart();
      renderSuccess(method, data);
    } catch (error) {
      console.error(error);
      showToast('Falha ao processar o pagamento.', 'error');
    } finally {
      toggleButtonLoading(button, false);
    }
  }

  function renderSuccess(method, data) {
    const container = document.querySelector('.checkout-section .container');
    if (!container) return;

    const orderNumber = generateOrderNumber();
    const methodLabel = methodLabelFor(method, data);
    successShown = true;

    container.innerHTML = `
      <div class="checkout-success">
        <div class="checkout-success__icon">✔</div>
        <div>
          <h1 class="section__title section__title--left" style="text-align:center;">Pedido confirmado!</h1>
          <p class="section__subtitle" style="text-align:center;">Pagamento via ${methodLabel} concluÃ­do com sucesso.</p>
        </div>
        <p class="order-number">NÃºmero do pedido: <strong>#${orderNumber}</strong></p>
        <div class="checkout-success__actions">
          <a class="btn" href="index.html">Voltar ao inÃ­cio</a>
          <a class="btn btn--ghost" href="index.html#menu">Explorar cardÃ¡pio</a>
        </div>
      </div>
    `;
  }

  function methodLabelFor(method, data) {
    switch (method) {
      case 'pix':
        return 'PIX';
      case 'credit':
        return data.installments && data.installments > 1
          ? `cartÃ£o de crÃ©dito (${data.installments}x)`
          : 'cartÃ£o de crÃ©dito';
      case 'debit':
        return 'cartÃ£o de dÃ©bito';
      default:
        return 'pagamento';
    }
  }

  function validateCreditForm(form) {
    const nameInput = form.querySelector('[data-credit-name]');
    const numberInput = form.querySelector('[data-credit-number]');
    const expirationInput = form.querySelector('[data-credit-expiration]');
    const cvvInput = form.querySelector('[data-credit-cvv]');
    const installmentsSelect = form.querySelector('[data-credit-installments]');

    let valid = true;

    if (nameInput && !nameInput.value.trim()) {
      setFieldError(nameInput, 'Informe o nome como estÃ¡ no cartÃ£o.');
      valid = false;
    } else {
      clearFieldError(nameInput);
    }

    const cardNumber = numberInput ? onlyDigits(numberInput.value) : '';
    if (!cardNumber || cardNumber.length < 13 || !isValidLuhn(cardNumber)) {
      setFieldError(numberInput, 'Informe um nÃºmero de cartÃ£o vÃ¡lido.');
      valid = false;
    } else {
      clearFieldError(numberInput);
    }

    const expiration = expirationInput ? expirationInput.value : '';
    if (!isValidExpiration(expiration)) {
      setFieldError(expirationInput, 'Validade invÃ¡lida.');
      valid = false;
    } else {
      clearFieldError(expirationInput);
    }

    const cvv = cvvInput ? onlyDigits(cvvInput.value) : '';
    if (cvv.length < 3 || cvv.length > 4) {
      setFieldError(cvvInput, 'CVV invÃ¡lido.');
      valid = false;
    } else {
      clearFieldError(cvvInput);
    }

    return {
      valid,
      data: {
        name: nameInput?.value.trim(),
        number: cardNumber,
        expiration,
        cvv,
        installments: Number(installmentsSelect?.value || 1)
      }
    };
  }

  function validateDebitForm(form) {
    const nameInput = form.querySelector('[data-debit-name]');
    const numberInput = form.querySelector('[data-debit-number]');
    const expirationInput = form.querySelector('[data-debit-expiration]');
    const cvvInput = form.querySelector('[data-debit-cvv]');

    let valid = true;

    if (nameInput && !nameInput.value.trim()) {
      setFieldError(nameInput, 'Informe o nome como estÃ¡ no cartÃ£o.');
      valid = false;
    } else {
      clearFieldError(nameInput);
    }

    const cardNumber = numberInput ? onlyDigits(numberInput.value) : '';
    if (!cardNumber || cardNumber.length < 13 || !isValidLuhn(cardNumber)) {
      setFieldError(numberInput, 'Informe um nÃºmero de cartÃ£o vÃ¡lido.');
      valid = false;
    } else {
      clearFieldError(numberInput);
    }

    const expiration = expirationInput ? expirationInput.value : '';
    if (!isValidExpiration(expiration)) {
      setFieldError(expirationInput, 'Validade invÃ¡lida.');
      valid = false;
    } else {
      clearFieldError(expirationInput);
    }

    const cvv = cvvInput ? onlyDigits(cvvInput.value) : '';
    if (cvv.length !== 3) {
      setFieldError(cvvInput, 'CVV invÃ¡lido.');
      valid = false;
    } else {
      clearFieldError(cvvInput);
    }

    return {
      valid,
      data: {
        name: nameInput?.value.trim(),
        number: cardNumber,
        expiration,
        cvv
      }
    };
  }

  function toggleButtonLoading(button, isLoading) {
    if (!button) return;
    if (isLoading) {
      button.dataset.originalText = button.textContent;
      button.textContent = 'Processando...';
      button.disabled = true;
    } else {
      button.textContent = button.dataset.originalText || 'Pagar';
      button.disabled = false;
    }
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function generatePixCode() {
    const totals = cartStore.getTotals();
    const total = (totals.total / 100).toFixed(2);
    const randomId = Math.random().toString(36).slice(2, 12).toUpperCase();
    return `00020126580014BR.GOV.BCB.PIX0136SABORVIVO${randomId}520400005303986540${total}5802BR5905SABOR6009SAOPAULO62070503***6304`;
  }

  function renderPixCode(code) {
    const container = document.querySelector(SELECTORS.pixQr);
    if (!container) return;

    container.innerHTML = '';
    const size = 200;
    const cells = 23;
    const cellSize = size / cells;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);

    const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    background.setAttribute('width', size);
    background.setAttribute('height', size);
    background.setAttribute('fill', '#ffffff');
    svg.appendChild(background);

    let seed = 0;
    for (let i = 0; i < code.length; i += 1) {
      seed = (seed + code.charCodeAt(i) * (i + 1)) % 2147483647;
    }

    for (let row = 0; row < cells; row += 1) {
      for (let col = 0; col < cells; col += 1) {
        if (isFinderPattern(row, col, cells, 5)) {
          drawFinder(svg, row, col, cellSize);
          continue;
        }

        seed = (seed * 16807) % 2147483647;
        if ((seed % 7) < 3) {
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', col * cellSize);
          rect.setAttribute('y', row * cellSize);
          rect.setAttribute('width', cellSize);
          rect.setAttribute('height', cellSize);
          rect.setAttribute('fill', '#0f152b');
          svg.appendChild(rect);
        }
      }
    }

    container.appendChild(svg);
  }

  function isFinderPattern(row, col, cells, size) {
    const areas = [
      { row: 0, col: 0 },
      { row: 0, col: cells - size },
      { row: cells - size, col: 0 }
    ];

    return areas.some(area => row >= area.row && row < area.row + size && col >= area.col && col < area.col + size);
  }

  function drawFinder(svg, row, col, cellSize) {
    const startX = col * cellSize;
    const startY = row * cellSize;
    const size = cellSize * 5;

    const outer = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    outer.setAttribute('x', startX);
    outer.setAttribute('y', startY);
    outer.setAttribute('width', size);
    outer.setAttribute('height', size);
    outer.setAttribute('fill', '#0f152b');
    svg.appendChild(outer);

    const inner = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    inner.setAttribute('x', startX + cellSize);
    inner.setAttribute('y', startY + cellSize);
    inner.setAttribute('width', size - cellSize * 2);
    inner.setAttribute('height', size - cellSize * 2);
    inner.setAttribute('fill', '#ffffff');
    svg.appendChild(inner);

    const center = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    center.setAttribute('x', startX + cellSize * 2);
    center.setAttribute('y', startY + cellSize * 2);
    center.setAttribute('width', cellSize);
    center.setAttribute('height', cellSize);
    center.setAttribute('fill', '#0f152b');
    svg.appendChild(center);
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
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
        document.execCommand('copy');
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        document.body.removeChild(textarea);
      }
    });
  }

  function generateOrderNumber() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
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
    void toast.offsetWidth;
    toast.classList.add('is-visible');

    if (toastTimeoutId) {
      window.clearTimeout(toastTimeoutId);
    }

    toastTimeoutId = window.setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 3200);
  }

  function setFieldError(input, message) {
    if (!input) return;
    input.classList.add('is-invalid');
    const feedback = document.querySelector(`[data-error-for="${input.id}"]`);
    if (feedback) {
      feedback.textContent = message || '';
    }
  }

  function clearFieldError(input) {
    if (!input) return;
    input.classList.remove('is-invalid');
    const feedback = document.querySelector(`[data-error-for="${input.id}"]`);
    if (feedback) {
      feedback.textContent = '';
    }
  }

  function isValidExpiration(value) {
    const cleaned = value.replace(/\s+/g, '');
    if (!/^\d{2}\/\d{2}$/.test(cleaned)) {
      return false;
    }
    const [month, year] = cleaned.split('/').map(Number);
    if (month < 1 || month > 12) {
      return false;
    }
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;

    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;
    return true;
  }

  function isValidLuhn(number) {
    let sum = 0;
    let shouldDouble = false;

    for (let i = number.length - 1; i >= 0; i -= 1) {
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

  function formatCardNumber(value) {
    return onlyDigits(value)
      .slice(0, 19)
      .replace(/(\d{4})(?=\d)/g, '$1 ')
      .trim();
  }

  function formatExpiration(value) {
    const digits = onlyDigits(value).slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  function onlyDigits(value) {
    return (value || '').replace(/\D/g, '');
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
