/**
 * Helpers universales para clasificación de productos: Comida, Bebidas y Market
 */

export function isProductBeverage(prod) {
  if (!prod) return false;
  if (prod.isJuice || prod.juiceConfig?.enabled) return true;
  if (prod.marketSubtype === 'BEBIDA' || prod.marketSubtype === 'JUGO') return true;
  if (prod.categoryId === 'cat_bebidas' || prod.categoryId === 'cat_bebidas_market') return true;
  if (prod.line === 'BEBIDAS' || prod.line === 'BEBIDAS_MARKET') return true;
  if (prod.temperatureConfig?.enabled) return true;

  const n = (prod.name || '').toLowerCase();
  const drinkKeywords = [
    'jugo', 'bebida', 'gaseosa', 'refresco', 'agua', 'chicha', 'cerveza',
    'cola', 'inka', 'inca', 'sprite', 'fanta', 'pepsi', 'seven', '7up',
    'san mateo', 'cielo', 'vida', 'aquarius', 'powerade', 'sporade', 'gatorade',
    'red bull', 'monster', 'volt', 'pilsen', 'cusqueña', 'cristal', 'corona',
    'heineken', 'stella', 'limonada', 'maracuya', 'maracuyá', 'naranjada',
    'te ', 'té ', 'infusion', 'infusión', 'cafe', 'café', 'smoothie', 'frappe',
    'batido', 'licuado', 'chicha morada', 'latte', 'cappuccino', 'soda'
  ];
  return drinkKeywords.some((kw) => n.includes(kw));
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
