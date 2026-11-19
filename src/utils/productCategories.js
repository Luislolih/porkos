/**
 * Helpers universales para clasificación de productos: Comida, Bebidas, Postres y Market
 */

export function isProductBeverage(prod) {
  if (!prod) return false;

  const line = (prod.line || '').toUpperCase().trim();
  const catId = (prod.categoryId || '').toLowerCase().trim();
  const subType = (prod.marketSubtype || '').toUpperCase().trim();

  // 1. Exclusión estricta: Si es comida, snack o postre marcado, NUNCA es bebida
  if (
    line === 'COMIDA' ||
    line === 'POSTRES' ||
    catId === 'cat_comida' ||
    catId === 'cat_postres' ||
    catId === 'cat_snacks' ||
    subType === 'COMIDA' ||
    subType === 'SNACK' ||
    subType === 'POSTRE'
  ) {
    return false;
  }

  // 2. Flags explícitos de bebida
  if (line === 'BEBIDAS' || line === 'BEBIDAS_MARKET') return true;
  if (catId === 'cat_bebidas' || catId === 'cat_bebidas_market' || catId === 'bebidas') return true;
  if (subType === 'BEBIDA' || subType === 'JUGO') return true;
  if (prod.isJuice || prod.juiceConfig?.enabled) return true;
  if (prod.temperatureConfig?.enabled && prod.type !== 'MARKET' && line !== 'COMIDA') return true;

  // Si ya tiene asignada otra categoría o línea, respetarla
  if (prod.categoryId || prod.line) return false;

  // 3. Chequeo semántico seguro ÚNICAMENTE por nombre (solo para productos sin categoría)
  const n = (prod.name || '').toLowerCase().trim();
  if (!n) return false;

  const drinkPhrases = [
    'jugo', 'bebida', 'gaseosa', 'refresco', 'agua mineral', 'chicha morada', 'cerveza',
    'coca cola', 'inka cola', 'inca kola', 'sprite', 'fanta', 'pepsi', '7up', 'seven up',
    'san mateo', 'cielo', 'vida', 'aquarius', 'powerade', 'sporade', 'gatorade',
    'red bull', 'monster energy', 'volt', 'pilsen', 'cusqueña', 'cristal', 'corona',
    'heineken', 'stella artois', 'limonada', 'maracuyada', 'naranjada',
    'smoothie', 'frappe', 'frappé', 'batido', 'licuado', 'latte', 'cappuccino'
  ];

  if (drinkPhrases.some((phrase) => n.includes(phrase))) {
    return true;
  }

  // Términos como palabras aisladas seguras
  const isolatedTerms = ['chicha', 'cola', 'cafe', 'café', 'té', 'infusion', 'infusión', 'soda', 'beer'];
  const words = n.split(/[\s,.-]+/);
  return isolatedTerms.some((term) => words.includes(term));
}

export function isProductDessert(prod, allCategories = []) {
  if (!prod) return false;

  const line = (prod.line || '').toUpperCase().trim();
  const catId = (prod.categoryId || '').toLowerCase().trim();
  const subType = (prod.marketSubtype || '').toUpperCase().trim();

  // 1. Verificación directa por línea oficial o ID de categoría (Postre explícito)
  if (line === 'POSTRES' || line === 'POSTRE') return true;
  if (catId === 'cat_postres' || catId === 'postres') return true;
  if (subType === 'POSTRE' || subType === 'POSTRES') return true;

  // 2. Exclusión estricta: Si el producto está explícitamente configurado como Comida, Bebida o Market
  if (
    line === 'COMIDA' ||
    catId === 'cat_comida' ||
    catId === 'comida' ||
    line === 'BEBIDAS' ||
    catId === 'cat_bebidas' ||
    catId === 'bebidas' ||
    subType === 'BEBIDA' ||
    subType === 'JUGO' ||
    (line === 'MARKET' && catId !== 'cat_postres') ||
    (catId === 'cat_market' && line !== 'POSTRES')
  ) {
    return false;
  }

  // 3. Si el producto tiene una categoría asignada en allCategories
  if (Array.isArray(allCategories) && allCategories.length > 0 && prod.categoryId) {
    const matchingCat = allCategories.find((c) => c.id === prod.categoryId);
    if (matchingCat) {
      const catName = (matchingCat.name || '').toLowerCase();
      const catLine = (matchingCat.line || '').toUpperCase();
      if (catLine === 'POSTRES' || catName.includes('postre')) return true;
      if (catLine === 'COMIDA' || catLine === 'BEBIDAS' || catLine === 'MARKET') return false;
    }
  }

  // 4. Si el producto ya tiene definida su categoría o línea (aunque sea diferente), respetarla
  if (prod.categoryId || prod.line) {
    return false;
  }

  // 5. Chequeo semántico seguro ÚNICAMENTE por nombre del producto para productos sin categoría
  const n = (prod.name || '').toLowerCase().trim();
  if (!n) return false;

  // Frases compuestas exactas de postres peruanos e internacionales
  const dessertPhrases = [
    'arroz con leche', 'arroz zambito', 'crema volteada', 'leche asada',
    'tres leches', '3 leches', 'suspiro a la limeña', 'suspiro limeño',
    'mazamorra morada', 'mazamorra', 'panna cotta', 'panacota'
  ];

  if (dessertPhrases.some((phrase) => n.includes(phrase))) {
    return true;
  }

  // Palabras completas seguras de postre
  const dessertTokens = [
    'postre', 'postres',
    'torta', 'tortas',
    'queque', 'queques', 'keke', 'kekes',
    'chocoteja', 'chocotejas',
    'alfajor', 'alfajores',
    'muffin', 'muffins',
    'cupcake', 'cupcakes',
    'brownie', 'brownies',
    'helado', 'helados',
    'flan', 'flanes',
    'cheesecake', 'cheesecakes',
    'crepe', 'crepes', 'crepas',
    'waffle', 'waffles',
    'pudín', 'pudin', 'pudines',
    'tiramisú', 'tiramisu',
    'mousse',
    'churro', 'churros',
    'dona', 'donas', 'donut', 'donuts',
    'milhojas', 'milhoja',
    'tartaleta', 'tartaletas',
    'pionono', 'piononos',
    'budín', 'budin',
    'gelatina', 'gelatinas',
    'trufa', 'trufas',
    'bombón', 'bombon', 'bombones',
    'profiterol', 'profiteroles',
    'carlota',
    'parfait'
  ];

  const words = n.split(/[\s,./()#+-]+/);
  if (dessertTokens.some((token) => words.includes(token))) {
    return true;
  }

  // Palabras exactas con delimitación de palabra completa
  if (words.includes('pie') || words.includes('pies') || words.includes('pay') || words.includes('pays')) {
    return true;
  }

  if (words.includes('cake') || words.includes('cakes')) {
    return true;
  }

  if (words.includes('pastel') || words.includes('pasteles')) {
    if (!n.includes('papa') && !n.includes('acelga') && !n.includes('choclo')) {
      return true;
    }
  }

  return false;
}

export function isProductMarket(prod, allCategories = []) {
  if (!prod) return false;
  // Si está marcado como comida o postre de restaurante, no es market
  if (prod.categoryId === 'cat_comida' || prod.line === 'COMIDA') return false;
  if (prod.categoryId === 'cat_postres' || prod.line === 'POSTRES') return false;
  if (prod.categoryId === 'cat_bebidas' || prod.line === 'BEBIDAS') {
    if (prod.type !== 'MARKET') return false;
  }

  if (Array.isArray(allCategories) && allCategories.length > 0 && prod.categoryId) {
    const matchingCat = allCategories.find((c) => c.id === prod.categoryId);
    if (matchingCat) {
      const catLine = (matchingCat.line || '').toUpperCase();
      if (catLine === 'MARKET') return true;
      if (catLine === 'COMIDA' || catLine === 'POSTRES') return false;
    }
  }

  return (
    prod.type === 'MARKET' ||
    prod.line === 'MARKET' ||
    prod.line === 'BEBIDAS_MARKET' ||
    prod.categoryId === 'cat_market' ||
    prod.categoryId === 'cat_bebidas_market' ||
    prod.categoryId === 'cat_snacks' ||
    (typeof prod.id === 'string' && prod.id.startsWith('mkt_'))
  );
}

export function isProductFood(prod, allCategories = []) {
  if (!prod) return false;
  // Si está explícitamente configurado como COMIDA
  if (prod.categoryId === 'cat_comida' || prod.line === 'COMIDA') return true;
  // Si es bebida, postre o market, no es comida
  if (isProductBeverage(prod)) return false;
  if (isProductDessert(prod, allCategories)) return false;
  if (isProductMarket(prod, allCategories)) return false;
  return true;
}

export function isProductSnackOrDessert(prod) {
  if (!prod) return false;
  if (isProductBeverage(prod)) return false;
  if (isProductDessert(prod)) return true;
  if (
    prod.marketSubtype === 'COMIDA' ||
    prod.marketSubtype === 'SNACK' ||
    prod.categoryId === 'cat_snacks'
  ) {
    return true;
  }
  const n = (prod.name || '').toLowerCase();
  const words = n.split(/[\s,.-]+/);
  const snackKeywords = ['snack', 'galleta', 'chocolate', 'lays', 'doritos', 'piqueo', 'caramelo', 'gomita'];
  return snackKeywords.some((kw) => words.includes(kw));
}
