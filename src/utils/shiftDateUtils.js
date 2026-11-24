import { parseToDate } from './formatters';

export const SHIFT_START_HOUR = 4; // 4:00 AM

/**
 * Obtiene la fecha operativa / de turno para un timestamp o Date dado.
 * Si la hora es antes de las 4:00 AM, pertenece al turno del día anterior.
 * @param {Date|string|number} dateInput
 * @returns {Date} Date con la fecha del turno a las 00:00:00 local
 */
export function getShiftDate(dateInput = new Date()) {
  const d = parseToDate(dateInput) || (dateInput instanceof Date ? dateInput : new Date(dateInput));
  if (!d || isNaN(d.getTime())) return new Date();
  const shifted = new Date(d.getTime() - SHIFT_START_HOUR * 60 * 60 * 1000);
  return new Date(shifted.getFullYear(), shifted.getMonth(), shifted.getDate(), 0, 0, 0, 0);
}

/**
 * Retorna la fecha del turno en formato 'YYYY-MM-DD'.
 * Ejemplo: A la 1:30 AM del 25/11, retorna '2026-11-24'.
 */
export function getShiftDateString(dateInput = new Date()) {
  const shiftDate = getShiftDate(dateInput);
  const y = shiftDate.getFullYear();
  const m = String(shiftDate.getMonth() + 1).padStart(2, '0');
  const d = String(shiftDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Retorna los límites de tiempo de un turno operativo para una fecha 'YYYY-MM-DD' o Date.
 * Inicio: fecha dada a las 04:00:00.000
 * Fin: fecha del día siguiente a las 03:59:59.999
 */
export function getShiftBoundsForDate(dateStrOrDate) {
  let year;
  let month;
  let day;

  if (typeof dateStrOrDate === 'string' && dateStrOrDate.includes('-')) {
    const parts = dateStrOrDate.split('-');
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[2], 10);
  } else {
    const d = getShiftDate(dateStrOrDate);
    year = d.getFullYear();
    month = d.getMonth();
    day = d.getDate();
  }

  const start = new Date(year, month, day, SHIFT_START_HOUR, 0, 0, 0);
  const nextDay = new Date(year, month, day + 1, SHIFT_START_HOUR, 0, 0, 0);
  const end = new Date(nextDay.getTime() - 1);

  return { start, end };
}

/**
 * Retorna los límites de tiempo para un rango de fechas de turno (startDateStr a endDateStr).
 * Inicio: startDate a las 04:00:00.000
 * Fin: día siguiente a endDate a las 03:59:59.999
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
 */
export function formatShiftDisplayDate(dateInput) {
  if (!dateInput) return '';
  if (typeof dateInput === 'string' && dateInput.includes('-')) {
    const parts = dateInput.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  const d = getShiftDate(dateInput);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}
