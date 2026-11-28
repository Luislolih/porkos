/**
 * Helpers universales para clasificación de productos: Comida, Bebidas, Postres, Snacks y Market
 */

export function isProductBeverage(prod) {
  if (!prod) return false;

  const line = (prod.line || '').toUpperCase().trim();
  const catId = (prod.categoryId || '').toLowerCase().trim();
  const subType = (prod.marketSubtype || '').toUpperCase().trim();

  // Exclusiones: Si es comida de restaurante, snack confirmado o postre exclusivo
  if (
    line === 'COMIDA' ||
    catId === 'cat_comida' ||
    catId === 'cat_snacks' ||
    subType === 'COMIDA' ||
    subType === 'SNACK' ||
    (line === 'POSTRES' && subType !== 'BEBIDA') ||
    (catId === 'cat_postres' && subType !== 'BEBIDA') ||
    subType === 'POSTRE'
  ) {
    return false;
  }

  // 1. Flags explícitos de bebida (aplica tanto a Restaurante como a Market)
  if (subType === 'BEBIDA' || subType === 'JUGO') return true;
  if (line === 'BEBIDAS' || line === 'BEBIDAS_MARKET') return true;
  if (catId === 'cat_bebidas' || catId === 'cat_bebidas_market' || catId === 'bebidas') return true;
  if (prod.isJuice || prod.juiceConfig?.enabled) return true;
  if (prod.temperatureConfig?.enabled && subType !== 'COMIDA' && subType !== 'SNACK' && line !== 'COMIDA') return true;

  // Si ya tiene asignada otra categoría o línea, respetarla
  if (prod.categoryId && prod.categoryId !== 'cat_market' && prod.categoryId !== 'cat_bebidas_market') return false;
  if (prod.line && prod.line !== 'MARKET' && prod.line !== 'BEBIDAS_MARKET') return false;

  // 2. Chequeo semántico seguro por nombre (para items sin categoría o items de market sin subtipo)
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

  const isolatedTerms = ['chicha', 'cola', 'cafe', 'café', 'té', 'infusion', 'infusión', 'soda', 'beer'];
  const words = n.split(/[\s,.-]+/);
  return isolatedTerms.some((term) => words.includes(term));
}

export function isProductDessert(prod, allCategories = []) {
  if (!prod) return false;

  const line = (prod.line || '').toUpperCase().trim();
  const catId = (prod.categoryId || '').toLowerCase().trim();
  const subType = (prod.marketSubtype || '').toUpperCase().trim();

  // 1. Postre explícito (aplica tanto a Restaurante como a Market)
  if (subType === 'POSTRE' || subType === 'POSTRES') return true;
  if (line === 'POSTRES' || line === 'POSTRE') return true;
  if (catId === 'cat_postres' || catId === 'postres') return true;

  // 2. Exclusiones: Si está marcado como Comida, Bebida o Snack (sin ser postre)
  if (
    line === 'COMIDA' ||
    catId === 'cat_comida' ||
    catId === 'comida' ||
    subType === 'COMIDA' ||
    line === 'BEBIDAS' ||
    catId === 'cat_bebidas' ||
    catId === 'bebidas' ||
    subType === 'BEBIDA' ||
    subType === 'JUGO' ||
    subType === 'SNACK' ||
    catId === 'cat_snacks'
  ) {
    return false;
  }

  // 3. Verificación por categorías de Firestore si se proporcionan
  if (Array.isArray(allCategories) && allCategories.length > 0 && prod.categoryId) {
    const matchingCat = allCategories.find((c) => c.id === prod.categoryId);
    if (matchingCat) {
      const catName = (matchingCat.name || '').toLowerCase();
      const catLine = (matchingCat.line || '').toUpperCase();
      if (catLine === 'POSTRES' || catName.includes('postre')) return true;
      if (catLine === 'COMIDA' || catLine === 'BEBIDAS') return false;
    }
  }

  // 4. Si el producto ya tiene definida su categoría o línea en restaurante, respetarla
  if ((prod.categoryId && prod.categoryId !== 'cat_market') || (prod.line && prod.line !== 'MARKET')) {
    return false;
  }

  // 5. Chequeo semántico seguro por nombre (para items sin categoría o items de market sin subtipo)
  const n = (prod.name || '').toLowerCase().trim();
  if (!n) return false;

  const dessertPhrases = [
    'arroz con leche', 'arroz zambito', 'crema volteada', 'leche asada',
    'tres leches', '3 leches', 'suspiro a la limeña', 'suspiro limeño',
    'mazamorra morada', 'mazamorra', 'panna cotta', 'panacota'
  ];

  if (dessertPhrases.some((phrase) => n.includes(phrase))) {
    return true;
  }

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

  // Palabras con delimitación exacta
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

  // Si explícitamente es de tipo RESTAURANTE y no tiene ningún flag de market
  if (
    prod.type === 'RESTAURANTE' &&
    prod.line !== 'MARKET' &&
    prod.categoryId !== 'cat_market' &&
    prod.categoryId !== 'cat_snacks'
  ) {
    return false;
  }

  if (Array.isArray(allCategories) && allCategories.length > 0 && prod.categoryId) {
    const matchingCat = allCategories.find((c) => c.id === prod.categoryId);
    if (matchingCat) {
      const catLine = (matchingCat.line || '').toUpperCase();
      if (catLine === 'MARKET') return true;
      if (catLine === 'COMIDA') return false;
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

export function isProductSnack(prod) {
  if (!prod) return false;

  const subType = (prod.marketSubtype || '').toUpperCase().trim();
  const catId = (prod.categoryId || '').toLowerCase().trim();

  // Si explícitamente es snack
  if (subType === 'SNACK' || subType === 'SNACKS' || catId === 'cat_snacks') return true;

  // Si es bebida o postre, NO es snack
  if (isProductBeverage(prod)) return false;
  if (isProductDessert(prod)) return false;

  // Si es de Market y no es bebida ni postre, por descarte es snack
  if (isProductMarket(prod)) return true;

  const n = (prod.name || '').toLowerCase();
  const words = n.split(/[\s,.-]+/);
  const snackKeywords = ['snack', 'galleta', 'chocolate', 'lays', 'doritos', 'piqueo', 'caramelo', 'gomita', 'mani', 'maní', 'chifle', 'chifles'];
  return snackKeywords.some((kw) => words.includes(kw));
}

export function isProductFood(prod, allCategories = []) {
  if (!prod) return false;
  // Si está explícitamente configurado como COMIDA de restaurante
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
  return isProductDessert(prod) || isProductSnack(prod);
}

/**
 * Determina si un producto admite cremas según su categoría y configuración de carta.
 * Retorna FALSE si:
 * - Es bebida, postre o producto de market
 * - creamsConfig está deshabilitado (enabled: false)
 * - creamsConfig.availableCreamIds está vacío (0 cremas seleccionadas en configuración del producto)
 */
export function doesProductSupportCreams(prod, allCategories = []) {
  if (!prod) return false;
  if (isProductBeverage(prod)) return false;
  if (isProductDessert(prod, allCategories)) return false;
  if (isProductMarket(prod, allCategories)) return false;

  // Si tiene creamsConfig explícito (creado o editado en configuración del producto)
  if (prod.creamsConfig && typeof prod.creamsConfig === 'object') {
    if (prod.creamsConfig.enabled === false) return false;
    if (Array.isArray(prod.creamsConfig.availableCreamIds)) {
      return prod.creamsConfig.availableCreamIds.length > 0;
    }
    return Boolean(prod.creamsConfig.enabled);
  }

  // Si tiene availableCreamIds heredado
  if (Array.isArray(prod.availableCreamIds)) {
    return prod.availableCreamIds.length > 0;
  }

  // Si es un producto de restaurante (comida) sin configuración específica de cremas
  return Boolean(isProductFood(prod, allCategories));
}

/**
 * Resuelve el empaque/táper predeterminado EXCLUSIVAMENTE si el producto tiene
 * empaques asociados en su configuración (`availablePackagingIds` o `applicableProductIds`).
 * Nunca asigna un empaque aleatorio del catálogo si el producto no tiene ninguno configurado.
 */
export function resolveConfiguredPackaging(product, catalogPackagings = [], itemAvailablePackagingIds = []) {
  if (!product || !Array.isArray(catalogPackagings) || catalogPackagings.length === 0) {
    return null;
  }

  if (
    isProductMarket(product) ||
    (typeof product.id === 'string' && product.id.startsWith('mkt_'))
  ) {
    return null;
  }

  const configuredIds = new Set([
    ...(Array.isArray(product.availablePackagingIds) ? product.availablePackagingIds : []),
    ...(Array.isArray(itemAvailablePackagingIds) ? itemAvailablePackagingIds : []),
  ]);

  const associatedPackagings = catalogPackagings.filter(
    (pkg) =>
      pkg &&
      pkg.active &&
      pkg.id !== 'pkg_ninguno' &&
      (configuredIds.has(pkg.id) ||
        (Array.isArray(pkg.applicableProductIds) && pkg.applicableProductIds.includes(product.id)))
  );

  if (associatedPackagings.length === 0) {
    return null;
  }

  if (product.defaultPackagingId) {
    const preferred = associatedPackagings.find((pkg) => pkg.id === product.defaultPackagingId);
    if (preferred) return preferred;
  }

  return associatedPackagings[0];
}

