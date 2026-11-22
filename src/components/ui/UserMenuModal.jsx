import {
  User as UserIcon,
  Bell,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import Modal from './Modal';
import { useNotifications } from '../../hooks/useNotifications';

/**
 * Modal de Cuenta y Configuración de Usuario.
 * Accesible al tocar el avatar o perfil en la barra superior tanto en desktop como en mobile.
 */
export default function UserMenuModal({
  isOpen,
  onClose,
  user,
  canAccessSettings = false,
  onOpenSettings,
  onOpenNotifications,
  onLogoutClick,
}) {
  const { isGranted, isDenied } = useNotifications();

  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mi Cuenta"
      subtitle="Opciones de perfil, alertas y sesión"
      maxWidth="max-w-sm"
    >
      <div className="space-y-4">
        {/* Tarjeta de Datos de Usuario */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName}
              className="w-12 h-12 rounded-xl object-cover border border-zinc-700 shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 text-[var(--color-porkos-orange)] flex items-center justify-center font-black text-lg border border-orange-500/40 shrink-0">
              <UserIcon className="w-6 h-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-black text-white truncate">
              {user.displayName || 'Usuario'}
            </h4>
            <p className="text-xs text-zinc-400 truncate font-mono mt-0.5">
              {user.email}
            </p>
            <div className="pt-1.5 flex items-center gap-2">
              <span
                className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase shrink-0 ${
                  user.roleBadgeClass || 'bg-zinc-800 text-zinc-300 border-zinc-700'
                }`}
              >
                Rol: {user.role}
              </span>
            </div>
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="space-y-2">
          {/* 1. Configurar Notificaciones y Alertas */}
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenNotifications) onOpenNotifications();
            }}
            className="w-full p-3 sm:p-3.5 rounded-2xl bg-[#121216] hover:bg-zinc-850 border border-[var(--color-porkos-border)] hover:border-orange-500/40 flex items-center justify-between transition-all cursor-pointer text-left active:scale-98 group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-[var(--color-porkos-orange)] border border-orange-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Bell className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-white group-hover:text-orange-400 transition-colors">
                  Configurar Notificaciones
                </p>
                <p className="text-[11px] text-zinc-400 truncate">
                  Alertas de pedidos y timbre de cocina
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-lg border uppercase ${
                  isGranted
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                    : isDenied
                    ? 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                    : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                }`}
              >
                {isGranted ? 'Activas' : isDenied ? 'Bloqueadas' : 'Activar'}
              </span>
              <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
            </div>
          </button>

          {/* 2. Ajustes del Sistema (si rol tiene acceso) */}
          {canAccessSettings && (
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenSettings) onOpenSettings();
              }}
              className="w-full p-3 sm:p-3.5 rounded-2xl bg-[#121216] hover:bg-zinc-850 border border-[var(--color-porkos-border)] hover:border-zinc-700 flex items-center justify-between transition-all cursor-pointer text-left active:scale-98 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Settings className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-white group-hover:text-zinc-200 transition-colors">
                    Ajustes del Sistema
                  </p>
                  <p className="text-[11px] text-zinc-400 truncate">
                    Mesas, catálogo, tarifas y usuarios
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
            </button>
          )}

          {/* 3. Cerrar Sesión */}
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onLogoutClick) onLogoutClick();
            }}
            className="w-full p-3 sm:p-3.5 rounded-2xl bg-rose-950/25 hover:bg-rose-950/45 border border-rose-500/30 hover:border-rose-500/50 flex items-center justify-between transition-all cursor-pointer text-left active:scale-98 group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <LogOut className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-black text-rose-300 group-hover:text-rose-200 transition-colors">
                  Cerrar Sesión
                </p>
                <p className="text-[11px] text-rose-400/80 truncate">
                  Salir de tu cuenta en este dispositivo
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-rose-500/60 group-hover:text-rose-400" />
          </button>
        </div>
      </div>
    </Modal>
  );
}
