import { useState } from 'react';
import { Bell, BellRing, BellOff, X, Smartphone } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationModal from './NotificationModal';

/**
 * Banner superior interactivo estilo PWA para solicitar o solucionar permisos de notificación.
 */
export default function NotificationPermissionBanner() {
  const { supported, isDefault, isDenied, loading, requestPermission } = useNotifications();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('porkos_notif_banner_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('porkos_notif_banner_dismissed', 'true');
    } catch (e) {
      console.warn(e);
    }
  };

  // Si ya están concedidas o el usuario descartó el banner en esta sesión, no estorbar
  if (dismissed) {
    return (
      <NotificationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    );
  }

  // 1. Caso: Permisos Pendientes (default)
  if (supported && isDefault) {
    return (
      <>
        <aside aria-label="Permiso de notificaciones" className="bg-gradient-to-r from-[#241204] via-[#16161A] to-[#0D0D10] border-b-2 border-orange-500/70 px-3 sm:px-4 py-2.5 sm:py-3 text-white shadow-2xl relative z-40 transition-all">
          <div className="max-w-[1720px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-[var(--color-porkos-orange)] border border-orange-500/50 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-black text-white tracking-tight">
                    ¿Activar Notificaciones de Comandas?
                  </span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[var(--color-porkos-orange)] text-zinc-950 uppercase shrink-0">
                    Al estilo PWA
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-zinc-300 leading-tight">
                  Recibe avisos con sonido y en pantalla cada vez que entre un nuevo pedido a cocina o caja.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={requestPermission}
                disabled={loading}
                className="flex-1 sm:flex-none px-4 py-2 min-h-[40px] rounded-xl text-xs font-black bg-[var(--color-porkos-orange)] hover:bg-orange-400 active:scale-95 text-zinc-950 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-orange-500/30"
              >
                <BellRing className="w-3.5 h-3.5 fill-current shrink-0" />
                <span>{loading ? 'Solicitando...' : 'Autorizar Notificaciones'}</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="p-2 min-h-[40px] min-w-[40px] rounded-xl text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors flex items-center justify-center cursor-pointer"
                title="Ahora no"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        <NotificationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </>
    );
  }

  // 2. Caso: Permisos Bloqueados por el usuario o navegador (denied)
  if (supported && isDenied) {
    return (
      <>
        <aside aria-label="Notificaciones bloqueadas" className="bg-rose-950/80 border-b border-rose-500/50 px-3 sm:px-4 py-2 text-white shadow-lg relative z-40 transition-all">
          <div className="max-w-[1720px] mx-auto flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <BellOff className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="text-rose-200">
                <strong>Notificaciones bloqueadas en el navegador.</strong> Para recibir avisos de comandas, haz clic en el ícono de ajustes al lado de la URL y activa "Permitir".
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold border border-rose-500/40 text-[11px] cursor-pointer"
              >
                Ver Instrucciones
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>

        <NotificationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </>
    );
  }

  // 3. Caso: No soportado en este contexto (ej. Safari sin agregar a Home Screen)
  if (!supported) {
    return (
      <>
        <aside aria-label="Instalar app para notificaciones" className="bg-zinc-900 border-b border-zinc-800 px-3 py-2 text-white shadow-md relative z-40">
          <div className="max-w-[1720px] mx-auto flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-zinc-300">
                Para activar notificaciones en este dispositivo móvil, agrégala a tu <strong>Pantalla de Inicio</strong> (PWA).
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white text-[11px] shrink-0 font-bold border border-zinc-700"
            >
              Cómo Instalar
            </button>
          </div>
        </aside>

        <NotificationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </>
    );
  }

  return (
    <NotificationModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
    />
  );
}
