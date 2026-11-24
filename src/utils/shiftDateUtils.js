import { parseToDate } from './formatters';

export const SHIFT_START_HOUR = 4; // 4:00 AM

/**
 * Retorna la fecha del turno operativo en formato 'YYYY-MM-DD' (hora de Perú).
 * Para cualquier timestamp entre 00:00:00 y 03:59:59, pertenece al turno del día anterior.
 * Es estrictamente idempotente: si recibe una cadena 'YYYY-MM-DD', la retorna tal cual.
 * @param {Date|string|number} [dateInput=new Date()]
 * @returns {string} Fecha del turno en 'YYYY-MM-DD'
 */
export function getShiftDateString(dateInput = new Date()) {
  if (!dateInput) dateInput = new Date();

  // Si ya es una cadena 'YYYY-MM-DD', es la fecha del turno operativo directamente
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }

  const d = parseToDate(dateInput) || (dateInput instanceof Date ? dateInput : new Date(dateInput));
  if (!d || isNaN(d.getTime())) {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  }

  // Si el objeto Date fue creado como fecha de calendario pura (00:00:00.000 local),
  // no se debe restar 4h porque no es un timestamp de evento en vivo, sino una fecha ya asignada.
  if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // Timestamp real: restar 4 horas para alinear con la jornada operativa
  const shifted = new Date(d.getTime() - SHIFT_START_HOUR * 60 * 60 * 1000);
  return shifted.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
}

/**
 * Obtiene un objeto Date seguro (a las 12:00:00 local para evitar desbordes UTC/medianoche)
 * que representa la fecha operativa del turno para un timestamp o fecha dada.
 * @param {Date|string|number} [dateInput=new Date()]
 * @returns {Date} Date del turno a las 12:00:00 local
 */
export function getShiftDate(dateInput = new Date()) {
  const shiftStr = getShiftDateString(dateInput);
  const [year, month, day] = shiftStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

/**
 * Retorna la fecha del turno operativo anterior en formato 'YYYY-MM-DD'.
 * @param {Date|string|number} [shiftDateInput=new Date()]
 * @returns {string} Fecha del turno anterior en 'YYYY-MM-DD'
 */
export function getPreviousShiftDateString(shiftDateInput = new Date()) {
  const currentShiftStr = getShiftDateString(shiftDateInput);
  const [year, month, day] = currentShiftStr.split('-').map(Number);
  const prevDate = new Date(year, month - 1, day - 1, 12, 0, 0, 0);
  return getShiftDateString(prevDate);
}

/**
 * Retorna los límites de tiempo de un turno operativo para una fecha 'YYYY-MM-DD' o Date.
 * Inicio: fecha dada a las 04:00:00.000 local
 * Fin: fecha del día siguiente a las 03:59:59.999 local
 * @param {Date|string|number} [dateStrOrDate=new Date()]
 * @returns {{ start: Date, end: Date, shiftDateStr: string }}
 */
export function getShiftBoundsForDate(dateStrOrDate = new Date()) {
  const shiftDateStr = getShiftDateString(dateStrOrDate);
  const [year, month, day] = shiftDateStr.split('-').map(Number);

  const start = new Date(year, month - 1, day, SHIFT_START_HOUR, 0, 0, 0);
  const nextDay = new Date(year, month - 1, day + 1, SHIFT_START_HOUR, 0, 0, 0);
  const end = new Date(nextDay.getTime() - 1);

  return { start, end, shiftDateStr };
}

/**
 * Retorna los límites de tiempo para un rango de fechas de turno (startDateStr a endDateStr).
 * Inicio: startDate a las 04:00:00.000 local
 * Fin: día siguiente a endDate a las 03:59:59.999 local
 */
export function getShiftBoundsForRange(startDateStr, endDateStr) {
  const { start } = getShiftBoundsForDate(startDateStr);
  const { end } = getShiftBoundsForDate(endDateStr);
  return { start, end };
}

/**
 * Verifica si un timestamp/Date o registro cae dentro del rango de turno [start, end].
 */
export function isTimestampInShiftRange(timestamp, start, end) {
  const d = parseToDate(timestamp);
  if (!d) return false;
  const t = d.getTime();
  if (start && t < start.getTime()) return false;
  if (end && t > end.getTime()) return false;
  return true;
}

/**
 * Formatea una fecha o cadena 'YYYY-MM-DD' en formato legible 'DD/MM/YYYY'.
 * Idempotente y seguro con la zona horaria.
 */
export function formatShiftDisplayDate(dateInput = new Date()) {
  const dateStr = getShiftDateString(dateInput);
  if (!dateStr || !dateStr.includes('-')) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}
