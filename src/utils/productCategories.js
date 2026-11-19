/**
 * Helpers universales para clasificación de productos: Comida, Bebidas, Postres y Market
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
    prod.categoryId === 'cat_comida' ||
    prod.line === 'POSTRES'
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

export function isProductDessert(prod, allCategories = []) {
  if (!prod) return false;

  // 1. Verificación directa por línea oficial o ID de categoría
  const line = (prod.line || '').toUpperCase().trim();
  const catId = (prod.categoryId || '').toLowerCase().trim();
  const subType = (prod.marketSubtype || '').toUpperCase().trim();

  if (line === 'POSTRES' || line === 'POSTRE' || line.includes('POSTRE')) return true;
  if (catId === 'cat_postres' || catId === 'postres' || catId.includes('postre')) return true;
  if (subType === 'POSTRE' || subType === 'POSTRES') return true;

  // 2. Si el producto tiene una categoría asignada que contenga la palabra 'postre'
  if (Array.isArray(allCategories) && allCategories.length > 0 && prod.categoryId) {
    const matchingCat = allCategories.find((c) => c.id === prod.categoryId);
    if (matchingCat) {
      const catName = (matchingCat.name || '').toLowerCase();
      if (catName.includes('postre')) return true;
    }
  }

  // 3. Chequeo semántico seguro por nombre y descripción del producto
  const n = (prod.name || '').toLowerCase().trim();
  const desc = (prod.description || '').toLowerCase().trim();
  const text = `${n} ${desc}`;

  const dessertKeywords = [
    'postre', 'postres',
    'torta', 'tortas',
    'pie', 'pies', 'pay', 'pays',
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
    'tres leches', '3 leches',
    'crema volteada',
    'suspiro', 'suspiro limeño', 'suspiro a la limeña',
    'mazamorra', 'mazamorra morada',
    'arroz con leche',
    'arroz zambito',
    'tiramisú', 'tiramisu',
    'mousse',
    'panna cotta', 'panacota',
    'churro', 'churros',
    'dona', 'donas', 'donut', 'donuts',
    'milhojas', 'milhoja',
    'tartaleta', 'tartaletas',
    'pionono', 'piononos',
    'leche asada',
    'budín', 'budin',
    'gelatina', 'gelatinas',
    'galleta', 'galletas',
    'cookie', 'cookies',
    'trufa', 'trufas',
    'bombón', 'bombon', 'bombones',
    'pastel', 'pasteles',
    'cake', 'cakes',
    'dulce', 'dulces',
    'profiterol', 'profiteroles',
    'carlota',
    'parfait'
  ];

  return dessertKeywords.some((kw) => text.includes(kw));
}

export function isProductMarket(prod, allCategories = []) {
  if (!prod) return false;
  // Si es un postre registrado para Restaurante, no clasificarlo como market
  if (isProductDessert(prod, allCategories) && prod.type !== 'MARKET' && prod.line === 'POSTRES') return false;

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
  // Si es bebida o postre, no es comida
  if (isProductBeverage(prod)) return false;
  if (isProductDessert(prod, allCategories)) return false;
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
  const snackKeywords = ['snack', 'galleta', 'chocolate', 'lays', 'doritos', 'piqueo', 'caramelo', 'gomita'];
  return snackKeywords.some((kw) => n.includes(kw));
}
