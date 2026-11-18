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
} from 'lucide-react';
import { MODULES } from '../../types/constants';
import { useAuth } from '../../context/useAuth';

export default function Navbar({ currentModule, onSelectModule, activeOrdersCount = 0 }) {
  const { user, logout, canAccessModule } = useAuth();

  const allNavItems = [
    { id: MODULES.SALES, label: 'Ventas', icon: ShoppingBag },
    { id: MODULES.KITCHEN, label: 'Cocina KDS', icon: Flame, badge: activeOrdersCount },
    { id: MODULES.ORDERS, label: 'Pedidos', icon: ClipboardList },
    { id: 'mesas', label: 'Mesas', icon: Grid2X2 },
    { id: MODULES.CATALOG, label: 'Productos', icon: UtensilsCrossed },
    { id: MODULES.EXPENSES, label: 'Gastos', icon: Wallet },
    { id: MODULES.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: MODULES.SETTINGS, label: 'Configuración', icon: Settings },
  ];

  const allMobileNavItems = [
    { id: MODULES.SALES, label: 'Ventas', icon: ShoppingBag },
    { id: MODULES.KITCHEN, label: 'Cocina', icon: Flame, badge: activeOrdersCount },
    { id: MODULES.ORDERS, label: 'Pedidos', icon: ClipboardList },
    { id: 'mesas', label: 'Mesas', icon: Grid2X2 },
    { id: MODULES.SETTINGS, label: 'Ajustes', icon: Settings },
  ];

  // Filtrar vistas estrictamente según los permisos del rol del usuario
  const navItems = allNavItems.filter((item) => canAccessModule(item.id));
  const mobileNavItems = allMobileNavItems.filter((item) => canAccessModule(item.id));

  return (
    <>
      {/* Top Bar for Desktop & Tablet */}
      <header className="sticky top-0 z-30 bg-[var(--color-porkos-bg)]/95 backdrop-blur-md border-b border-[var(--color-porkos-border)] px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-porkos-orange)] flex items-center justify-center font-black text-black text-xl tracking-tighter shadow-lg shadow-orange-500/20">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl text-white tracking-wider">
                  PORKO<span className="text-[var(--color-porkos-orange)]">APP</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 uppercase">
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

          {/* User Profile & Logout */}
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2.5 bg-zinc-900/80 pl-2 pr-3 py-1 rounded-2xl border border-zinc-800">
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
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
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
                  className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors ml-1 cursor-pointer"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-porkos-surface)] border-t border-[var(--color-porkos-border)] px-2 py-1.5 flex items-center justify-around shadow-2xl">
        {mobileNavItems.map((item) => {
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
      </nav>
    </>
  );
}
