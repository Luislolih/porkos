import { useState } from 'react';
import {
  Bell,
  BellRing,
  BellOff,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Volume2,
  Send,
  Info,
} from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { testChime, isChimeEnabled, setChimeEnabled } from '../../utils/audioChime';
import Button from '../../components/ui/Button';

export default function NotificationsSettingsTab() {
  const {
    supported,
    isGranted,
    isDenied,
    isDefault,
    loading,
    message,
    requestPermission,
    sendTestNotification,
    clearMessage,
  } = useNotifications();

  const [soundEnabled, setSoundState] = useState(isChimeEnabled);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundState(next);
    setChimeEnabled(next);
    if (next) {
      testChime();
    }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Mensaje de feedback si existe */}
      {message && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-900 border border-zinc-700 text-sm text-zinc-200">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[var(--color-porkos-orange)] shrink-0" />
            <span>{message}</span>
          </div>
          <button
            type="button"
            onClick={clearMessage}
            className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-800"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Tarjeta 1: Estado de Permisos de Notificación */}
      <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl p-4 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl border ${
              isGranted
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : isDenied
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            }`}>
              {isGranted ? (
                <BellRing className="w-6 h-6" />
              ) : isDenied ? (
                <BellOff className="w-6 h-6" />
              ) : (
                <Bell className="w-6 h-6" />
              )}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Notificaciones PWA en Dispositivo</span>
                {isGranted && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                    Activas
                  </span>
                )}
                {isDenied && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
                    Bloqueadas
                  </span>
                )}
                {isDefault && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                    Pendientes
                  </span>
                )}
              </h3>
              <p className="text-xs text-zinc-400">
                Recibe alertas sonoras y visuales en la barra de estado y pantalla de bloqueo al ingresar nuevas comandas.
              </p>
            </div>
          </div>
        </div>

        {/* Estado y Acciones de Permisos */}
        <div className="space-y-3 pt-1">
          {!supported ? (
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Este navegador o dispositivo no soporta la API de notificaciones web.</span>
            </div>
          ) : isGranted ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>¡Permisos concedidos!</strong> Este dispositivo mostrará alertas visuales cada vez que cocina reciba una orden.
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  icon={Send}
                  onClick={sendTestNotification}
                  disabled={loading}
                  className="text-xs font-bold"
                >
                  Enviar Notificación de Prueba
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  icon={Volume2}
                  onClick={testChime}
                  className="text-xs font-bold"
                >
                  Probar Timbre de Audio
                </Button>
              </div>
            </div>
          ) : isDenied ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs text-rose-300 space-y-1">
                <div className="font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Notificaciones bloqueadas en este navegador</span>
                </div>
                <p className="text-[11px] text-zinc-300">
                  Para activarlas, toca el ícono del candado o configuración en la barra de direcciones de tu navegador y cambia el permiso de Notificaciones a <strong>Permitir</strong>.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                icon={Volume2}
                onClick={testChime}
                className="text-xs font-bold"
              >
                Probar Timbre de Cocina (Web Audio)
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200">
                <p className="font-bold mb-1">Permiso aún no solicitado</p>
                <p className="text-[11px] text-zinc-300">
                  Haz clic en el botón inferior para autorizar a PORKOAPP a enviarte alertas en la pantalla de inicio y bloqueo.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                icon={BellRing}
                onClick={requestPermission}
                disabled={loading}
                className="text-xs font-black shadow-md shadow-orange-500/20"
              >
                Activar Notificaciones PWA
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tarjeta 2: Configuración de Timbre Sonoro */}
      <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl p-4 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-orange-500/20 text-[var(--color-porkos-orange)] border border-orange-500/30">
              <Volume2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">
                Timbre Sonoro de Cocina (Web Audio)
              </h3>
              <p className="text-xs text-zinc-400">
                Campana sutil nativa que se reproduce en Cocina cuando entra una orden nueva (funciona 100% offline).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleSound}
            className={`px-3.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-[var(--color-porkos-orange)] text-zinc-950 border-orange-400 shadow-md shadow-orange-500/20'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
            }`}
          >
            {soundEnabled ? 'ACTIVADO' : 'SILENCIADO'}
          </button>
        </div>
      </div>

      {/* Tarjeta 3: Guía de Instalación PWA según Dispositivo */}
      <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl p-4 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-zinc-800 pb-3">
          <Smartphone className="w-4 h-4 text-[var(--color-porkos-orange)]" />
          <span>Cómo instalar PORKOAPP como App Nativa</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* iOS */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
            <h4 className="text-xs font-black text-zinc-200 flex items-center gap-1.5">
              <span>🍏 iPhone / iPad (Safari)</span>
            </h4>
            <ol className="text-[11px] text-zinc-400 space-y-1 list-decimal list-inside leading-relaxed">
              <li>Abre la app en <strong>Safari</strong> (requiere iOS 16.4+).</li>
              <li>Toca el botón <strong>Compartir</strong> (icono de cuadrado con flecha).</li>
              <li>Selecciona <strong>"Agregar a pantalla de inicio"</strong>.</li>
              <li>Abre PORKOAPP desde el ícono en tu pantalla para habilitar notificaciones completas.</li>
            </ol>
          </div>

          {/* Android */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
            <h4 className="text-xs font-black text-zinc-200 flex items-center gap-1.5">
              <span>🤖 Android (Chrome)</span>
            </h4>
            <ol className="text-[11px] text-zinc-400 space-y-1 list-decimal list-inside leading-relaxed">
              <li>Abre la app en <strong>Google Chrome</strong>.</li>
              <li>Toca el menú de tres puntos <strong>(⋮)</strong> en la esquina superior.</li>
              <li>Selecciona <strong>"Instalar aplicación"</strong> o "Agregar a la pantalla principal".</li>
              <li>Al abrirla por primera vez, toca <strong>"Permitir notificaciones"</strong>.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
