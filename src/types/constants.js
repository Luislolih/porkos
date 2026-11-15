export const MODULES = {
  SALES: 'ventas',
  KITCHEN: 'cocina',
  ORDERS: 'pedidos',
  CATALOG: 'productos',
  EXPENSES: 'gastos',
  DASHBOARD: 'dashboard',
  SETTINGS: 'configuracion',
};

export const ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  CAJERO: 'CAJERO',
  COCINA: 'COCINA',
};

export const SALES_MODES = {
  RESTAURANT: 'RESTAURANTE',
  MARKET: 'MARKET',
};

export const ORDER_MODALITIES = {
  MESA: {
    id: 'MESA',
    label: 'Mesa',
    icon: 'Utensils',
    requiresTable: true,
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  PARA_LLEVAR: {
    id: 'PARA_LLEVAR',
    label: 'Para Llevar',
    icon: 'ShoppingBag',
    suggestPackaging: true,
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  CONSUMO_EXTERNO: {
    id: 'CONSUMO_EXTERNO',
    label: 'Consumo Fuera',
    icon: 'Package',
    suggestPackaging: true,
    badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  DELIVERY: {
    id: 'DELIVERY',
    label: 'Delivery',
    icon: 'Bike',
    requiresCustomerInfo: true,
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  MARKET: {
    id: 'MARKET',
    label: 'Market Directo',
    icon: 'Store',
    isDirect: true,
    badgeColor: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
  },
};

export const ORDER_STATUS = {
  PENDIENTE: {
    id: 'PENDIENTE',
    label: 'Pendiente',
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  },
  PREPARANDO: {
    id: 'PREPARANDO',
    label: 'Preparando',
    badgeClass: 'bg-porkos-orange/20 text-porkos-orange border-porkos-orange/40',
  },
  LISTO: {
    id: 'LISTO',
    label: 'Listo',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  },
  ENTREGADO: {
    id: 'ENTREGADO',
    label: 'Entregado',
    badgeClass: 'bg-zinc-700/30 text-zinc-400 border-zinc-600/40',
  },
  CANCELADO: {
    id: 'CANCELADO',
    label: 'Cancelado',
    badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
  },
};

export const PAYMENT_METHODS = {
  EFECTIVO: { id: 'EFECTIVO', label: 'Efectivo', color: 'emerald' },
  YAPE: { id: 'YAPE', label: 'Yape', color: 'purple' },
  PLIN: { id: 'PLIN', label: 'Plin', color: 'cyan' },
  TRANSFERENCIA: { id: 'TRANSFERENCIA', label: 'Transferencia', color: 'blue' },
  TARJETA: { id: 'TARJETA', label: 'Tarjeta', color: 'amber' },
};

export const PAYMENT_STATUS = {
  PENDING: { id: 'PENDING', label: 'Por Cobrar', badgeClass: 'text-amber-400 bg-amber-500/10' },
  PARTIAL: { id: 'PARTIAL', label: 'Pago Parcial', badgeClass: 'text-blue-400 bg-blue-500/10' },
  PAID: { id: 'PAID', label: 'Cobrado', badgeClass: 'text-emerald-400 bg-emerald-500/10' },
};
