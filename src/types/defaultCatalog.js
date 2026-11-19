export const PRODUCT_LINES = {
  ALL: { id: 'ALL', label: 'TODO' },
  COMIDA: { id: 'COMIDA', label: 'COMIDA' },
  BEBIDAS: { id: 'BEBIDAS', label: 'BEBIDAS' },
  POSTRES: { id: 'POSTRES', label: 'POSTRES' },
  MARKET: { id: 'MARKET', label: 'MARKET' },
};

// Categorías oficiales de la carta: COMIDA, BEBIDAS, POSTRES y MARKET
export const SUBCATEGORIES = [];

export const DEFAULT_CATEGORIES = [
  { id: 'cat_comida', name: 'Comida', line: 'COMIDA', type: 'RESTAURANTE', icon: 'Utensils', order: 1, active: true },
  { id: 'cat_bebidas', name: 'Bebidas', line: 'BEBIDAS', type: 'RESTAURANTE', icon: 'CupSoda', order: 2, active: true },
  { id: 'cat_postres', name: 'Postres', line: 'POSTRES', type: 'RESTAURANTE', icon: 'Cake', order: 3, active: true },
  { id: 'cat_market', name: 'Market', line: 'MARKET', type: 'MARKET', icon: 'Store', order: 4, active: true },
];

// Catálogos vacíos por defecto: todo se gestiona directamente en Cloud Firestore
export const DEFAULT_CREAMS = [];
export const DEFAULT_EXTRAS = [];
export const DEFAULT_PACKAGINGS = [];
export const DEFAULT_PRODUCTS = [];

// 3 MESAS CONFIGURADAS
export const DEFAULT_TABLES = [
  { id: 'mesa_01', number: 1, label: 'Mesa 1', capacity: 4, status: 'AVAILABLE', active: true },
  { id: 'mesa_02', number: 2, label: 'Mesa 2', capacity: 2, status: 'AVAILABLE', active: true },
  { id: 'mesa_03', number: 3, label: 'Mesa 3', capacity: 4, status: 'AVAILABLE', active: true },
];
