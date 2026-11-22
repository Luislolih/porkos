/**
 * Generador de sonido nativo mediante Web Audio API para PORKOAPP.
 *
 * Ventajas:
 * 1. Funciona 100% Offline (cero dependencias de archivos de audio externos o red).
 * 2. Cero latencia de descarga o problemas de decodificación.
 * 3. Timbre suave, armónico y profesional (diseñado para ambiente de restaurante sin sobresaltos).
 */

let sharedAudioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioCtx) {
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    if (AudioCtxClass) {
      sharedAudioCtx = new AudioCtxClass();
    }
  }
  return sharedAudioCtx;
}

/**
 * Desbloquea el contexto de audio tras la primera interacción del usuario
 * (Requisito estándar de seguridad en Safari iOS y Chrome Android).
 */
export async function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (e) {
      console.warn('No se pudo reanudar AudioContext:', e);
    }
  }
}

/**
 * Verifica si el timbre de cocina está activado en las preferencias locales.
 */
export function isChimeEnabled() {
  try {
    const val = localStorage.getItem('porkos_chime_enabled');
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

/**
 * Guarda la preferencia de timbre de cocina.
 */
export function setChimeEnabled(enabled) {
  try {
    localStorage.setItem('porkos_chime_enabled', enabled ? 'true' : 'false');
  } catch (e) {
    console.warn('Error guardando preferencia de timbre:', e);
  }
}

/**
 * Reproduce un acorde sutil de campana / timbre tipo app (2 notas armónicas suaves: Mi5 -> Si5).
 * Diseñado con envolvente exponencial suave para evitar chasquidos o ruidos invasivos.
 */
export function playOrderChime() {
  if (!isChimeEnabled()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;

  // Nota 1: 659.25 Hz (E5) - Campana de inicio suave
  playTone(ctx, 659.25, now, 0.45, 0.18);

  // Nota 2: 987.77 Hz (B5) - Nota armónica ascendente (+140ms)
  playTone(ctx, 987.77, now + 0.14, 0.55, 0.15);
}

/**
 * Reproduce un tono individual con oscilador senoidal limpio y envolvente ADSR.
 */
function playTone(ctx, freq, startTime, duration, maxVolume = 0.2) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    // Envolvente suave: Ataque rápido (8ms) para dar claridad, decaimiento exponencial natural
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(maxVolume, startTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  } catch (e) {
    console.warn('Error reproduciendo tono de timbre:', e);
  }
}

/**
 * Prueba inmediata del timbre y activación del audio en el navegador.
 */
export function testChime() {
  unlockAudio();
  playOrderChime();
}
