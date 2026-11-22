import { useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

/**
 * Banner discreto y accesible que notifica el estado de conexión de PORKOAPP.
 * - Modo Offline: Informa que la app sigue operativa con almacenamiento local (IndexedDB).
 * - Conexión recuperada: Notifica que la sincronización con la nube está en curso.
 */
export default function OfflineBanner() {
  const { isOnline, wasOffline, resetWasOffline } = useNetworkStatus();

  // Auto-ocultar el mensaje de reconexión tras 4 segundos
  useEffect(() => {
    if (isOnline && wasOffline) {
      const timer = setTimeout(() => {
        resetWasOffline();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, resetWasOffline]);

  // Si está online y no venía de estar offline, no mostrar nada
  if (isOnline && !wasOffline) {
    return null;
  }

  return (
    <div className="fixed top-2 sm:top-3 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-lg animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
      {!isOnline ? (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-zinc-950/95 border border-amber-500/50 text-amber-200 shadow-2xl shadow-black/80 backdrop-blur-md">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <WifiOff className="w-4 h-4 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-amber-300 tracking-tight flex items-center gap-1.5">
              <span>MODO OFFLINE ACTIVO</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            </p>
            <p className="text-[11px] text-zinc-300 leading-tight truncate sm:whitespace-normal">
              Sin internet. Puedes seguir registrando ventas y comandas; se guardan en el dispositivo y se sincronizarán al reconectar.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-zinc-950/95 border border-emerald-500/50 text-emerald-200 shadow-2xl shadow-black/80 backdrop-blur-md">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Wifi className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-emerald-300 tracking-tight flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span>CONEXIÓN RESTABLECIDA</span>
            </p>
            <p className="text-[11px] text-zinc-300 leading-tight">
              Sincronizando operaciones con la nube en segundo plano...
            </p>
          </div>
          <button
            type="button"
            onClick={resetWasOffline}
            className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded-lg bg-zinc-850 hover:bg-zinc-800 transition-colors"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}
