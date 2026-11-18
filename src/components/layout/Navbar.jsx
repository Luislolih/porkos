import { useState } from 'react';
import {
  Flame,
  ShoppingBag,
  ClipboardList,
  UtensilsCrossed,
  LayoutDashboard,
  Wallet,
  Settings,
  Grid2X2,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { MODULES } from '../../types/constants';
import { useAuth } from '../../context/useAuth';

export default function Navbar({ currentModule, onSelectModule, activeOrdersCount = 0 }) {
  const { user, logout, canAccessModule } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const allNavItems = [
    { id: MODULES.SALES, label: 'Ventas', desc: 'Caja y comandas', icon: ShoppingBag },
    { id: 'mesas', label: 'Mesas', desc: 'Control de salón', icon: Grid2X2 },
    { id: MODULES.KITCHEN, label: 'Cocina', desc: 'Comandas en preparación', icon: Flame, badge: activeOrdersCount },
    { id: MODULES.ORDERS, label: 'Pedidos', desc: 'Seguimiento de órdenes', icon: ClipboardList },
    { id: MODULES.CATALOG, label: 'Productos', desc: 'Catálogo de carta y market', icon: UtensilsCrossed },
    { id: MODULES.EXPENSES, label: 'Gastos', desc: 'Compras y egresos diarios', icon: Wallet },
    { id: MODULES.DASHBOARD, label: 'Dashboard', desc: 'Finanzas, rentabilidad y métricas', icon: LayoutDashboard },
    { id: MODULES.SETTINGS, label: 'Configuración', desc: 'Usuarios, roles y sistema', icon: Settings },
  ];

  // Filtrar vistas estrictamente según los permisos del rol del usuario
  const navItems = allNavItems.filter((item) => canAccessModule(item.id));

  const mobileQuickItems = [
    { id: MODULES.SALES, label: 'Ventas', icon: ShoppingBag },
    { id: 'mesas', label: 'Mesas', icon: Grid2X2 },
    { id: MODULES.KITCHEN, label: 'Cocina', icon: Flame, badge: activeOrdersCount },
    { id: MODULES.ORDERS, label: 'Pedidos', icon: ClipboardList },
  ].filter((item) => canAccessModule(item.id));

  return (
    <>
      {/* Top Bar for Desktop & Mobile */}
      <header className="sticky top-0 z-30 bg-[var(--color-porkos-bg)]/95 backdrop-blur-md border-b border-[var(--color-porkos-border)] px-3 sm:px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--color-porkos-orange)] flex items-center justify-center font-black text-black text-lg sm:text-xl tracking-tighter shadow-lg shadow-orange-500/20">
              P
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-extrabold text-lg sm:text-xl text-white tracking-wider">
                  PORKO<span className="text-[var(--color-porkos-orange)]">APP</span>
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 uppercase">
                  POS
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Items */}
          <nav className="hidden lg:flex items-center gap-1 bg-[var(--color-porkos-surface)] p-1 rounded-2xl border border-[var(--color-porkos-border)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentModule === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectModule(item.id)}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all relative cursor-pointer
                    ${
                      isActive
                        ? 'bg-[var(--color-porkos-orange)] text-black shadow-md'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge > 0 && (
                    <span
                      className={`
                        text-[10px] font-black px-1.5 py-0.2 rounded-full
                        ${isActive ? 'bg-black text-white' : 'bg-[var(--color-porkos-orange)] text-black'}
                      `}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Header: User Profile & Mobile Hamburger Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user && (
              <div className="flex items-center gap-2 bg-zinc-900/80 pl-2 pr-2 sm:pr-3 py-1 rounded-2xl border border-zinc-800">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className="w-7 h-7 rounded-xl object-cover border border-zinc-700"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-xl bg-orange-500/20 text-[var(--color-porkos-orange)] flex items-center justify-center font-black text-xs border border-orange-500/40">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className="text-left hidden sm:block">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white block leading-tight truncate max-w-[120px]">
                      {user.displayName}
                    </span>
                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border uppercase ${user.roleBadgeClass || 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
                      {user.role}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Online
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm('¿Cerrar sesión en PORKOAPP?')) {
                      logout();
                    }
                  }}
                  className="hidden sm:block p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors ml-1 cursor-pointer"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Hamburger Button for Mobile */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer active:scale-95 transition-all"
              aria-label="Abrir menú de navegación"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation (Menu Hamburguesa) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Sheet */}
          <div className="fixed right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-[#121212] border-l border-zinc-800 p-4 flex flex-col justify-between shadow-2xl z-10 animate-drawer-enter overflow-y-auto">
            <div className="space-y-4">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[var(--color-porkos-orange)] flex items-center justify-center font-black text-black text-base shadow-sm">
                    P
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white leading-tight">
                      PORKO<span className="text-[var(--color-porkos-orange)]">APP</span>
                    </h3>
                    <span className="text-[10px] text-zinc-400">Menú Principal</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                  aria-label="Cerrar menú"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Info inside Drawer */}
              {user && (
                <div className="bg-zinc-900/90 p-3 rounded-xl border border-zinc-800 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-[var(--color-porkos-orange)] flex items-center justify-center font-black text-xs border border-orange-500/40 shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-white block truncate">
                      {user.displayName}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border uppercase ${user.roleBadgeClass || 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
                        {user.role}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-medium">Online</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Items in Drawer */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-2 pb-1">
                  Módulos de la App
                </p>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentModule === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectModule(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`
                        w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer text-left
                        ${
                          isActive
                            ? 'bg-[var(--color-porkos-orange)] text-black font-extrabold shadow-sm'
                            : 'text-zinc-300 hover:text-white hover:bg-zinc-800/60'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                            isActive
                              ? 'bg-black text-white border-black'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold block truncate">{item.label}</span>
                          <span className={`text-[10px] block truncate ${isActive ? 'text-black/70' : 'text-zinc-500'}`}>
                            {item.desc}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.badge > 0 && (
                          <span
                            className={`
                              text-[10px] font-black px-2 py-0.5 rounded-full
                              ${isActive ? 'bg-black text-white' : 'bg-[var(--color-porkos-orange)] text-black'}
                            `}
                          >
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight className={`w-4 h-4 ${isActive ? 'text-black' : 'text-zinc-600'}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drawer Footer: Logout */}
            <div className="pt-4 border-t border-zinc-800 mt-4">
              <button
                type="button"
                onClick={() => {
                  if (confirm('¿Cerrar sesión en PORKOAPP?')) {
                    logout();
                    setIsMobileMenuOpen(false);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 border border-zinc-800 hover:border-rose-500/40 text-xs font-bold transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (Quick Access + Menú) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-porkos-surface)] border-t border-[var(--color-porkos-border)] px-2 py-1.5 flex items-center justify-around shadow-2xl">
        {mobileQuickItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentModule === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectModule(item.id)}
              className={`
                flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all relative cursor-pointer
                ${isActive ? 'text-[var(--color-porkos-orange)] font-bold' : 'text-zinc-400 hover:text-zinc-200'}
              `}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''}`} />
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-[var(--color-porkos-orange)] text-black text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}

        {/* 5th Button: Menú Completo */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className={`
            flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all relative cursor-pointer
            ${isMobileMenuOpen ? 'text-[var(--color-porkos-orange)] font-bold' : 'text-zinc-400 hover:text-zinc-200'}
          `}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 tracking-tight">Menú</span>
        </button>
      </nav>
    </>
  );
}
