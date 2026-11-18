/**
 * Helpers universales para clasificación de productos: Comida, Bebidas y Market
 */

export function isProductBeverage(prod) {
  if (!prod) return false;

  // 1. Exclusión estricta: Si es un snack, postre o comida marcada, NUNCA es bebida
  if (
    prod.marketSubtype === 'COMIDA' ||
    prod.marketSubtype === 'SNACK' ||
    prod.marketSubtype === 'POSTRE' ||
    prod.categoryId === 'cat_postres' ||
    prod.categoryId === 'cat_snacks' ||
    prod.categoryId === 'cat_comida'
  ) {
    return false;
  }

  // 2. Flags explícitos de bebida
  if (prod.isJuice || prod.juiceConfig?.enabled) return true;
  if (prod.marketSubtype === 'BEBIDA' || prod.marketSubtype === 'JUGO') return true;
  if (prod.categoryId === 'cat_bebidas' || prod.categoryId === 'cat_bebidas_market') return true;
  if (prod.line === 'BEBIDAS' || prod.line === 'BEBIDAS_MARKET') return true;
  if (prod.temperatureConfig?.enabled && prod.marketSubtype !== 'COMIDA') return true;

  // 3. Chequeo semántico seguro por nombre (evita falsos positivos como 'chocolate' con 'te')
  const n = (prod.name || '').toLowerCase().trim();
  const drinkPhrases = [
    'jugo', 'bebida', 'gaseosa', 'refresco', 'agua', 'chicha morada', 'chicha', 'cerveza',
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
  const isolatedTerms = ['cola', 'cafe', 'café', 'té', 'infusion', 'infusión', 'soda', 'beer'];
  const words = n.split(/[\s,.-]+/);
  return isolatedTerms.some((term) => words.includes(term));
}

export function isProductMarket(prod) {
  if (!prod) return false;
  return (
    prod.type === 'MARKET' ||
    prod.line === 'MARKET' ||
    prod.line === 'BEBIDAS_MARKET' ||
    prod.categoryId === 'cat_market' ||
    prod.categoryId === 'cat_bebidas_market' ||
    prod.categoryId === 'cat_postres' ||
    prod.categoryId === 'cat_snacks' ||
    (typeof prod.id === 'string' && prod.id.startsWith('mkt_'))
  );
}

export function isProductFood(prod) {
  if (!prod) return false;
  // Si es bebida, no es comida
  if (isProductBeverage(prod)) return false;
  return true;
}

export function isProductSnackOrDessert(prod) {
  if (!prod) return false;
  if (isProductBeverage(prod)) return false;
  if (
    prod.marketSubtype === 'COMIDA' ||
    prod.marketSubtype === 'SNACK' ||
    prod.marketSubtype === 'POSTRE' ||
    prod.categoryId === 'cat_postres' ||
    prod.categoryId === 'cat_snacks'
  ) {
    return true;
  }
  const n = (prod.name || '').toLowerCase();
  const snackKeywords = ['snack', 'galleta', 'chocolate', 'lays', 'doritos', 'piqueo', 'postre', 'torta', 'pie', 'queque', 'chocoteja', 'caramelo', 'gomita', 'alfajor', 'muffin', 'brownie', 'helado'];
  return snackKeywords.some((kw) => n.includes(kw));
}
