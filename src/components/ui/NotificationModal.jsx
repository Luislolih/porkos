import { useState } from 'react';
import {
  Bell,
  BellRing,
  BellOff,
  Volume2,
  Send,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { useNotifications } from '../../hooks/useNotifications';
import { testChime, isChimeEnabled, setChimeEnabled } from '../../utils/audioChime';
import { isSecureContextEnvironment } from '../../utils/notifications';

/**
 * Modal centralizado de Notificaciones y Alertas para PORKOAPP.
 * Accesible desde la barra de navegación y la pantalla de Ventas.
 */
export default function NotificationModal({ isOpen, onClose }) {
  const {
    supported,
    isGranted,
    isDenied,
    isDefault,
    loading,
    requestPermission,
    sendTestNotification,
  } = useNotifications();

  const [soundEnabled, setSoundState] = useState(isChimeEnabled);
  const [testStatus, setTestStatus] = useState(null);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundState(next);
    setChimeEnabled(next);
    if (next) {
      testChime();
    }
  };

  const handleSendTest = async () => {
    setTestStatus('Enviando...');
    const ok = await sendTestNotification();
    if (ok) {
      setTestStatus('¡Notificación enviada! Revisa tu pantalla o barra de estado.');
    } else {
      setTestStatus('No se pudo enviar. Verifica los permisos de tu sistema operativo.');
    }
    setTimeout(() => setTestStatus(null), 5000);
  };

  const handleAuthorize = async () => {
    const res = await requestPermission();
    if (res?.status === 'granted') {
      setTestStatus('¡Permisos concedidos exitosamente!');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Centro de Alertas y Notificaciones"
      subtitle="Configura avisos sonoros y notificaciones del sistema para nuevas comandas"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4 text-xs sm:text-sm">
        {/* Tarjeta de Estado del Navegador */}
        <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Estado en este Navegador:
            </span>
            {isGranted ? (
              <span className="flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-xl bg-emerald-950/60 text-emerald-300 border border-emerald-500/40">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>PERMITIDO</span>
              </span>
            ) : isDenied ? (
              <span className="flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-xl bg-rose-950/60 text-rose-300 border border-rose-500/40">
                <BellOff className="w-3.5 h-3.5 text-rose-400" />
                <span>BLOQUEADO</span>
              </span>
            ) : isDefault ? (
              <span className="flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-xl bg-amber-950/60 text-amber-300 border border-amber-500/40">
                <Bell className="w-3.5 h-3.5 text-amber-400" />
                <span>PENDIENTE</span>
              </span>
            ) : (
              <span className="text-xs text-zinc-500">NO DISPONIBLE</span>
            )}
          </div>

          {/* Mensaje según estado */}
          {isGranted && (
            <div className="space-y-3 pt-1">
              <p className="text-xs text-zinc-300 leading-relaxed">
                Este dispositivo tiene autorización para emitir alertas cuando ingresa una comanda, incluso si tienes otra pestaña abierta o la app minimizada.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendTest}
                  className="px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-md shadow-emerald-500/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar Notificación de Prueba</span>
                </button>
                <button
                  type="button"
                  onClick={testChime}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Probar Timbre</span>
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 leading-normal pt-1">
                💡 En escritorio (Mac o Windows), si no salta el banner tras hacer la prueba, comprueba que tu navegador tenga permitido mostrar notificaciones en los Ajustes del Sistema de tu computadora y que no esté activo el modo &quot;No Molestar&quot;.
              </p>
            </div>
          )}

          {isDefault && (
            <div className="space-y-3 pt-1">
              <p className="text-xs text-zinc-300 leading-relaxed">
                Para que PORKOAPP pueda avisarte con sonido y banner al recibir pedidos, debes autorizar los permisos en tu navegador.
              </p>
              <button
                type="button"
                onClick={handleAuthorize}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl text-xs font-black bg-[var(--color-porkos-orange)] hover:bg-orange-400 text-zinc-950 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all shadow-md shadow-orange-500/20"
              >
                <BellRing className="w-4 h-4" />
                <span>{loading ? 'Solicitando al navegador...' : 'Autorizar Notificaciones Ahora'}</span>
              </button>
            </div>
          )}

          {isDenied && (
            <div className="space-y-2.5 pt-1 text-xs">
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Las notificaciones están bloqueadas en tu navegador</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Para habilitarlas manualmente en Google Chrome:
                </p>
                <ol className="list-decimal list-inside text-[11px] text-zinc-300 space-y-1 pl-1">
                  <li>Toca el ícono de ajustes/candado al lado izquierdo de la URL (en la barra de direcciones).</li>
                  <li>Busca <strong>Notificaciones</strong> y cámbialo a <strong>Permitir</strong>.</li>
                  <li>Recarga la página para aplicar los cambios.</li>
                </ol>
              </div>
              <button
                type="button"
                onClick={testChime}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Probar Timbre Sonoro de Cocina</span>
              </button>
            </div>
          )}

          {!supported && (
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 space-y-1.5">
              <p className="font-bold text-amber-300 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Navegador en modo restringido o conexión local HTTP</span>
              </p>
              {!isSecureContextEnvironment() ? (
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Estás conectado mediante una IP local (<code>http://192.168...</code>). Por seguridad, los navegadores en móviles (Android Chrome y Safari) bloquean la API de notificaciones en conexiones HTTP sin cifrar. Para recibir alertas en el móvil utiliza <strong>HTTPS</strong> o agrega la app a tu Pantalla de Inicio. El timbre sonoro y vibración funcionan con la app abierta.
                </p>
              ) : (
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  En iPhone o iPad (iOS), las notificaciones web solo funcionan si agregas la app a la Pantalla de Inicio (Toca Compartir &gt; "Agregar a pantalla de inicio" e inicia desde allí).
                </p>
              )}
            </div>
          )}

          {testStatus && (
            <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 flex items-center gap-2 animate-in fade-in">
              <Info className="w-4 h-4 text-[var(--color-porkos-orange)] shrink-0" />
              <span>{testStatus}</span>
            </div>
          )}
        </div>

        {/* Tarjeta de Timbre de Audio Nativo */}
        <div className="bg-[#121216] border border-zinc-800 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-[var(--color-porkos-orange)] border border-orange-500/30 flex items-center justify-center shrink-0">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white">Timbre Sonoro (Web Audio)</h4>
              <p className="text-[11px] text-zinc-400">
                Campana armónica sutil cuando entra una comanda (100% offline).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleSound}
            className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-[var(--color-porkos-orange)] text-zinc-950 border-orange-400 shadow-md shadow-orange-500/20'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
            }`}
          >
            {soundEnabled ? 'ACTIVO' : 'SILENCIADO'}
          </button>
        </div>

        {/* Botón de Cierre */}
        <div className="pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full text-xs font-bold"
          >
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
