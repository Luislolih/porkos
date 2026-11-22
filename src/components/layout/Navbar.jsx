import { useState } from 'react';
import {
  Flame,
  ShoppingBag,
  ClipboardList,
  LayoutDashboard,
  Wallet,
  Settings,
  Grid2X2,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
} from 'lucide-react';
import { MODULES } from '../../types/constants';
import { useAuth } from '../../context/useAuth';
import ConfirmDialog from '../ui/ConfirmDialog';
import NotificationModal from '../ui/NotificationModal';
import UserMenuModal from '../ui/UserMenuModal';

export default function Navbar({ currentModule, onSelectModule, activeOrdersCount = 0 }) {
  const { user, logout, canAccessModule } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const allNavItems = [
    { id: MODULES.SALES, label: 'Ventas', desc: 'Caja y comandas', icon: ShoppingBag },
    { id: MODULES.KITCHEN, label: 'Cocina', desc: 'KDS y comandas activas', icon: Flame, badge: activeOrdersCount },
    { id: MODULES.TABLES, label: 'Mesas', desc: 'Control de salón', icon: Grid2X2 },
    { id: MODULES.ORDERS, label: 'Historial', desc: 'Seguimiento de pedidos', icon: ClipboardList },
    { id: MODULES.EXPENSES, label: 'Gastos', desc: 'Compras y egresos diarios', icon: Wallet },
    { id: MODULES.DASHBOARD, label: 'Dashboard', desc: 'Métricas y balance operativo', icon: LayoutDashboard },
    { id: MODULES.SETTINGS, label: 'Ajustes', desc: 'Usuarios, tarifas y catálogo', icon: Settings },
  ];

  // Filtrar vistas estrictamente según los permisos del rol del usuario
  const navItems = allNavItems.filter((item) => canAccessModule(item.id));

  const mobileQuickItems = [
    { id: MODULES.SALES, label: 'Ventas', icon: ShoppingBag },
    { id: MODULES.KITCHEN, label: 'Cocina', icon: Flame, badge: activeOrdersCount },
    { id: MODULES.TABLES, label: 'Mesas', icon: Grid2X2 },
    { id: MODULES.ORDERS, label: 'Historial', icon: ClipboardList },
  ].filter((item) => canAccessModule(item.id));

  return (
    <>
      {/* Top Bar for Desktop & Mobile */}
      <header className="sticky top-0 z-30 bg-[#09090B]/95 backdrop-blur-md border-b border-[var(--color-porkos-border)] px-2 sm:px-4 xl:px-6 py-2 w-full">
        <div className="max-w-[1720px] mx-auto flex items-center justify-between gap-2 xl:gap-3 w-full">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 whitespace-nowrap select-none">
            <img
              src="/favicon.png"
              alt="Porkos Isotipo"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain shadow-sm shrink-0"
            />
            <div className="shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base sm:text-lg text-white tracking-wider">
                  PORKO<span className="text-[var(--color-porkos-orange)]">APP</span>
                </span>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase">
                  POS
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Items */}
          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 bg-[#121215] p-1 rounded-2xl border border-[var(--color-porkos-border)] shrink select-none shadow-xs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentModule === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectModule(item.id)}
                  className={`
                    flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-3 py-1.5 rounded-xl text-xs font-bold transition-all relative cursor-pointer whitespace-nowrap shrink-0 active:scale-95 touch-manipulation
                    ${
                      isActive
                        ? 'bg-[var(--color-porkos-orange)] text-zinc-950 font-black shadow-md shadow-orange-500/20'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'stroke-[2.5]' : ''}`} />
                  <span>{item.label}</span>
                  {item.badge > 0 && (
                    <span
                      className={`
                        text-[10px] font-black px-1.5 py-0.2 rounded-full shrink-0
                        ${isActive ? 'bg-zinc-950 text-white' : 'bg-[var(--color-porkos-orange)] text-zinc-950'}
                      `}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Header: User Profile & Mobile Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {user && (
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(true)}
                className="flex items-center gap-1.5 sm:gap-2.5 px-2 sm:pl-2 sm:pr-3 py-1.5 rounded-2xl bg-[#121215] hover:bg-zinc-850 active:bg-zinc-800 border border-[var(--color-porkos-border)] hover:border-zinc-700 transition-all cursor-pointer shadow-xs select-none active:scale-95 touch-manipulation min-h-[42px]"
                title="Mi perfil (Notificaciones y Cerrar sesión)"
                aria-label="Abrir opciones de usuario"
              >
                <div className="shrink-0">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl object-cover border border-zinc-700 shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-orange-500/15 text-[var(--color-porkos-orange)] flex items-center justify-center font-black text-xs sm:text-sm border border-orange-500/30 shrink-0">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>

                <div className="text-left hidden sm:flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-bold text-white block leading-tight truncate max-w-[85px] xl:max-w-[130px]">
                    {user.displayName}
                  </span>
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.2 rounded border uppercase shrink-0 ${
                      user.roleBadgeClass || 'bg-zinc-800 text-zinc-300 border-zinc-700'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>

                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              </button>
            )}

            {/* Hamburger Button for Mobile */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-[#121215] border border-[var(--color-porkos-border)] text-zinc-300 hover:text-white cursor-pointer active:scale-95 transition-all"
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
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <div className="fixed right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-[#121215] border-l border-[var(--color-porkos-border)] p-4 flex flex-col justify-between shadow-2xl z-10 animate-fade-in-smooth overflow-y-auto">
            <div className="space-y-4">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-porkos-border)]">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/favicon.png"
                    alt="Porkos Isotipo"
                    className="w-8 h-8 rounded-xl object-contain shadow-xs"
                  />
                  <div>
                    <h3 className="font-black text-sm text-white leading-tight">
                      PORKO<span className="text-[var(--color-porkos-orange)]">APP</span>
                    </h3>
                    <span className="text-[10px] text-zinc-400">Menú Operativo</span>
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
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsUserMenuOpen(true);
                  }}
                  className="w-full bg-[#0C0C0F] hover:bg-zinc-850 p-3 rounded-2xl border border-[var(--color-porkos-border)] hover:border-orange-500/40 flex items-center justify-between text-left cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName}
                        className="w-9 h-9 rounded-xl object-cover border border-zinc-700 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-orange-500/15 text-[var(--color-porkos-orange)] flex items-center justify-center font-black text-xs border border-orange-500/30 shrink-0">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-white block truncate">
                        {user.displayName}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border uppercase ${user.roleBadgeClass || 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
                          {user.role}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
                </button>
              )}

              {/* Navigation Items in Drawer */}
              <div className="space-y-1">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider px-2 pb-1">
                  Módulos de Gestión
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
                        w-full flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer text-left active:scale-[0.98]
                        ${
                          isActive
                            ? 'bg-[var(--color-porkos-orange)] text-zinc-950 font-black shadow-md'
                            : 'text-zinc-300 hover:text-white hover:bg-zinc-800/60'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                            isActive
                              ? 'bg-zinc-950 text-white border-zinc-950'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold block truncate">{item.label}</span>
                          <span className={`text-[10px] block truncate ${isActive ? 'text-zinc-950/70 font-semibold' : 'text-zinc-500'}`}>
                            {item.desc}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.badge > 0 && (
                          <span
                            className={`
                              text-[10px] font-black px-2 py-0.5 rounded-full
                              ${isActive ? 'bg-zinc-950 text-white' : 'bg-[var(--color-porkos-orange)] text-zinc-950'}
                            `}
                          >
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight className={`w-4 h-4 ${isActive ? 'text-zinc-950 stroke-[3]' : 'text-zinc-600'}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drawer Footer: Logout */}
            <div className="pt-4 border-t border-[var(--color-porkos-border)] mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsLogoutConfirmOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-[#0C0C0F] hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 border border-zinc-800 hover:border-rose-500/40 text-xs font-bold transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#09090B]/95 backdrop-blur-md border-t border-[var(--color-porkos-border)] px-2 py-1.5 flex items-center justify-around shadow-2xl">
        {mobileQuickItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentModule === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectModule(item.id)}
              className={`
                flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all relative cursor-pointer active:scale-95 touch-manipulation
                ${isActive ? 'text-[var(--color-porkos-orange)] font-black' : 'text-zinc-400 hover:text-zinc-200'}
              `}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110 stroke-[2.5]' : ''}`} />
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-[var(--color-porkos-orange)] text-zinc-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-bold">{item.label}</span>
            </button>
          );
        })}

        {/* Botón "Más" para abrir drawer móvil */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-zinc-400 hover:text-zinc-200 cursor-pointer active:scale-95 touch-manipulation"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 tracking-tight font-bold">Más</span>
        </button>
      </nav>

      {/* Dialog de confirmación de cierre de sesión */}
      <ConfirmDialog
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={logout}
        title="¿Cerrar sesión en PORKOAPP?"
        message="Tendrás que ingresar nuevamente con tu cuenta de Google autorizada para acceder al sistema."
        confirmText="Cerrar Sesión"
        cancelText="Permanecer"
        variant="warning"
      />

      {/* Modal de Usuario para Desktop y Mobile */}
      <UserMenuModal
        isOpen={isUserMenuOpen}
        onClose={() => setIsUserMenuOpen(false)}
        user={user}
        canAccessSettings={canAccessModule(MODULES.SETTINGS)}
        onOpenSettings={() => onSelectModule(MODULES.SETTINGS)}
        onOpenNotifications={() => setIsNotifModalOpen(true)}
        onLogoutClick={() => setIsLogoutConfirmOpen(true)}
      />

      {/* Modal Central de Notificaciones y Alertas */}
      <NotificationModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
      />
    </>
  );
}
