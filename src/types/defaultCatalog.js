export const PRODUCT_LINES = {
  ALL: { id: 'ALL', label: 'TODOS (Más Vendidos)' },
  CLASICO: { id: 'CLASICO', label: 'CLÁSICO' },
  ARTESANAL: { id: 'ARTESANAL', label: 'ARTESANAL' },
  BEBIDAS_MARKET: { id: 'BEBIDAS_MARKET', label: 'BEBIDAS & MARKET' },
};

export const SUBCATEGORIES = [
  { id: 'all', label: 'Todas las subcategorías' },
  { id: 'hamburguesas', label: 'Hamburguesas' },
  { id: 'choripanes', label: 'Choriporkos' },
  { id: 'salchipapas', label: 'Salchiporkos' },
  { id: 'bebidas', label: 'Bebidas' },
  { id: 'market', label: 'Snacks & Postres' },
];

export const DEFAULT_CATEGORIES = [
  { id: 'cat_burgers', name: 'Hamburguesas', type: 'RESTAURANTE', icon: 'Beef', order: 1, active: true },
  { id: 'cat_choripanes', name: 'Choriporkos', type: 'RESTAURANTE', icon: 'Flame', order: 2, active: true },
  { id: 'cat_salchipapas', name: 'Salchiporkos', type: 'RESTAURANTE', icon: 'UtensilsCrossed', order: 3, active: true },
  { id: 'cat_bebidas_rest', name: 'Bebidas Preparadas', type: 'RESTAURANTE', icon: 'GlassWater', order: 4, active: true },
  { id: 'cat_bebidas_market', name: 'Bebidas & Gaseosas', type: 'MARKET', icon: 'CupSoda', order: 1, active: true },
  { id: 'cat_postres', name: 'Postres & Dulces', type: 'MARKET', icon: 'Cake', order: 2, active: true },
  { id: 'cat_snacks', name: 'Snacks & Varios', type: 'MARKET', icon: 'Cookie', order: 3, active: true },
];

// Catálogos vacíos por defecto: todo se gestiona directamente en Cloud Firestore
export const DEFAULT_CREAMS = [];
export const DEFAULT_EXTRAS = [];
export const DEFAULT_PACKAGINGS = [];
export const DEFAULT_PRODUCTS = [];

// ÚNICAMENTE 3 MESAS CONFIGURADAS (SIN BARRAS)
export const DEFAULT_TABLES = [
  { id: 'mesa_01', number: 1, label: 'Mesa 1', capacity: 4, status: 'AVAILABLE', active: true },
  { id: 'mesa_02', number: 2, label: 'Mesa 2', capacity: 2, status: 'AVAILABLE', active: true },
  { id: 'mesa_03', number: 3, label: 'Mesa 3', capacity: 4, status: 'AVAILABLE', active: true },
];
