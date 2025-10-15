(function (window) {
  'use strict';

  const PRODUCTS = [
    {
      id: 'tenis-neon-pulse',
      name: 'Tênis Neon Pulse',
      category: 'tenis',
      price: 69990,
      description: 'Tecnologia de amortecimento responsivo e cabedal respirável com acabamento neon.',
      image: '/img/prod-tenis.svg',
      gallery: ['/img/prod-tenis.svg', '/img/hero-tenis.svg', '/img/prod-tenis.svg'],
      sizes: ['37', '38', '39', '40', '41', '42', '43'],
      highlight: true
    },
    {
      id: 'tenis-sprint-air',
      name: 'Tênis Sprint Air',
      category: 'tenis',
      price: 54990,
      description: 'Leveza extrema com entressola em espuma reativa e suporte anatômico.',
      image: '/img/prod-tenis.svg',
      gallery: ['/img/prod-tenis.svg', '/img/hero-tenis.svg'],
      sizes: ['36', '37', '38', '39', '40', '41'],
      highlight: true
    },
    {
      id: 'tenis-urban-vibe',
      name: 'Tênis Urban Vibe',
      category: 'tenis',
      price: 48990,
      description: 'Design urbano com solado em borracha vulcanizada e palmilha memory foam.',
      image: '/img/prod-tenis.svg',
      gallery: ['/img/prod-tenis.svg'],
      sizes: ['38', '39', '40', '41', '42', '43', '44']
    },
    {
      id: 'oculos-sunrise',
      name: 'Óculos Sunrise UV400',
      category: 'oculos',
      price: 39990,
      description: 'Lentes com proteção total UV e armação leve em policarbonato com acabamento rosé.',
      image: '/img/prod-oculos.svg',
      gallery: ['/img/prod-oculos.svg'],
      sizes: ['Único'],
      highlight: true
    },
    {
      id: 'oculos-futurewave',
      name: 'Óculos FutureWave',
      category: 'oculos',
      price: 45990,
      description: 'Estilo futurista com lentes espelhadas e proteção anti-reflexo premium.',
      image: '/img/prod-oculos.svg',
      gallery: ['/img/prod-oculos.svg'],
      sizes: ['Único']
    },
    {
      id: 'oculos-urban-clear',
      name: 'Óculos Urban Clear',
      category: 'oculos',
      price: 34990,
      description: 'Design transparente, leve e versátil para compor qualquer look.',
      image: '/img/prod-oculos.svg',
      gallery: ['/img/prod-oculos.svg'],
      sizes: ['Único']
    },
    {
      id: 'relogio-pulse-smart',
      name: 'Relógio Pulse Smart',
      category: 'relogios',
      price: 62990,
      description: 'Tela AMOLED, monitoramento 24h, NFC e bateria para até 10 dias.',
      image: '/img/prod-relogio.svg',
      gallery: ['/img/prod-relogio.svg'],
      sizes: ['40mm', '44mm'],
      highlight: true
    },
    {
      id: 'relogio-chroma-steel',
      name: 'Relógio Chroma Steel',
      category: 'relogios',
      price: 57990,
      description: 'Pulseira em aço inox, resistência à água 5ATM e cronógrafo preciso.',
      image: '/img/prod-relogio.svg',
      gallery: ['/img/prod-relogio.svg'],
      sizes: ['42mm']
    },
    {
      id: 'relogio-astro-lite',
      name: 'Relógio Astro Lite',
      category: 'relogios',
      price: 48990,
      description: 'Caixa slim em alumínio anodizado, GPS integrado e 60 modos esportivos.',
      image: '/img/prod-relogio.svg',
      gallery: ['/img/prod-relogio.svg'],
      sizes: ['41mm', '45mm']
    }
  ];

  function formatCurrency(valueInCents) {
    return (valueInCents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  const catalog = {
    all() {
      return PRODUCTS.slice();
    },
    getById(id) {
      return PRODUCTS.find((product) => product.id === id) || null;
    },
    getByCategory(category) {
      return PRODUCTS.filter((product) => product.category === category);
    },
    search(query) {
      const text = query.trim().toLowerCase();
      if (!text) return PRODUCTS.slice();
      return PRODUCTS.filter((product) => {
        return (
          product.name.toLowerCase().includes(text) ||
          product.description.toLowerCase().includes(text) ||
          product.category.toLowerCase().includes(text)
        );
      });
    },
    featured(limit = 6) {
      const highlights = PRODUCTS.filter((product) => product.highlight);
      if (highlights.length >= limit) return highlights.slice(0, limit);
      const remaining = PRODUCTS.filter((product) => !product.highlight);
      return highlights.concat(remaining.slice(0, Math.max(0, limit - highlights.length)));
    },
    related(productId, limit = 3) {
      const current = this.getById(productId);
      if (!current) return this.featured(limit);
      const sameCategory = PRODUCTS.filter(
        (product) => product.category === current.category && product.id !== current.id
      );
      if (sameCategory.length >= limit) return sameCategory.slice(0, limit);
      const extras = PRODUCTS.filter((product) => product.id !== current.id && !sameCategory.includes(product));
      return sameCategory.concat(extras.slice(0, Math.max(0, limit - sameCategory.length)));
    },
    formatCurrency
  };

  window.StepZoneCatalog = catalog;
})(window);
