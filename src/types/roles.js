import { MODULES } from './constants';

export const APP_ROLES = {
  ADMIN: {
    id: 'ADMIN',
    name: 'Administrador(a)',
    description: 'Acceso total y configuración del sistema',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    defaultModules: [
      MODULES.SALES,
      MODULES.KITCHEN,
      MODULES.ORDERS,
      'mesas',
      MODULES.CATALOG,
      MODULES.EXPENSES,
      MODULES.DASHBOARD,
      MODULES.SETTINGS,
    ],
  },
  COORDINADOR: {
    id: 'COORDINADOR',
    name: 'Coordinador(a)',
    description: 'Acceso operativo total excepto Ajustes y Configuración',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    defaultModules: [
      MODULES.SALES,
      MODULES.KITCHEN,
      MODULES.ORDERS,
      'mesas',
      MODULES.CATALOG,
      MODULES.EXPENSES,
      MODULES.DASHBOARD,
    ],
  },
  COCINA: {
    id: 'COCINA',
    name: 'Cocina KDS',
    description: 'Acceso exclusivo a la pantalla de cocina y despacho',
    badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    defaultModules: [
      MODULES.KITCHEN,
    ],
  },
  CAJERO: {
    id: 'CAJERO',
    name: 'Caja y Salón',
    description: 'Punto de venta, cobros, mesas y pedidos',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    defaultModules: [
      MODULES.SALES,
      MODULES.ORDERS,
      'mesas',
      MODULES.KITCHEN,
    ],
  },
};

export const ALL_MODULE_DEFINITIONS = [
  { id: MODULES.SALES, label: 'Ventas (POS)' },
  { id: MODULES.KITCHEN, label: 'Cocina (KDS)' },
  { id: MODULES.ORDERS, label: 'Pedidos / Histórico' },
  { id: 'mesas', label: 'Control de Mesas' },
  { id: MODULES.CATALOG, label: 'Productos / Carta' },
  { id: MODULES.EXPENSES, label: 'Gastos y Compras' },
  { id: MODULES.DASHBOARD, label: 'Dashboard / Reportes' },
  { id: MODULES.SETTINGS, label: 'Ajustes y Accesos' },
];

export function getAllowedModulesForRole(roleId, customRolePermissions = null) {
  if (customRolePermissions && customRolePermissions[roleId]) {
    return customRolePermissions[roleId];
  }
  const roleConfig = APP_ROLES[roleId] || APP_ROLES.CAJERO;
  return roleConfig.defaultModules;
}
