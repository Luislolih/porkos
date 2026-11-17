export const PRODUCT_LINES = {
  ALL: { id: 'ALL', label: 'TODAS' },
  CLASICO: { id: 'CLASICO', label: 'CLÁSICO' },
  ARTESANAL: { id: 'ARTESANAL', label: 'ARTESANAL' },
  MARKET: { id: 'MARKET', label: 'MARKET' },
};

// Sin subcategorías complejas: el sistema ahora usa únicamente TODAS, CLÁSICO, ARTESANAL y MARKET
export const SUBCATEGORIES = [];

export const DEFAULT_CATEGORIES = [
  { id: 'cat_clasico', name: 'Clásico', line: 'CLASICO', type: 'RESTAURANTE', icon: 'Beef', order: 1, active: true },
  { id: 'cat_artesanal', name: 'Artesanal', line: 'ARTESANAL', type: 'RESTAURANTE', icon: 'Flame', order: 2, active: true },
  { id: 'cat_market', name: 'Market (Bebidas, Postres, Snacks)', line: 'MARKET', type: 'MARKET', icon: 'CupSoda', order: 3, active: true },
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
