import { getShiftBoundsForDate, isTimestampInShiftRange } from './shiftDateUtils';

/**
 * Genera números de comanda y venta estrictamente correlativos y limpios (P-001, P-002, M-001...)
 * basados en el historial del turno actual (de 4:00 AM a 3:59 AM del día siguiente),
 * eliminando códigos aleatorios o saltos inesperados.
 */
export function getNextOrderNumber(orders = [], prefix = 'P') {
  const shiftBounds = getShiftBoundsForDate(new Date());

  // Filtrar órdenes que correspondan a la jornada del turno actual (4:00 AM a 3:59 AM)
  const todayOrders = (orders || []).filter((o) => {
    if (!o.createdAt) return false;
    return isTimestampInShiftRange(o.createdAt, shiftBounds.start, shiftBounds.end);
  });

  let maxSeq = 0;
  todayOrders.forEach((o) => {
    if (o.orderNumber && typeof o.orderNumber === 'string') {
      const match = o.orderNumber.match(new RegExp(`^(?:${prefix}-?|#?)(\\d+)`, 'i'));
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        // Descartar números aleatorios antiguos (> 500) para no romper la secuencia correlativa normal
        if (!isNaN(num) && num > maxSeq && num < 500) {
          maxSeq = num;
        }
      }
    }
  });

  let nextSeq = maxSeq > 0 ? maxSeq + 1 : todayOrders.length + 1;
  // Garantizar que no colisione con ninguna comanda existente
  while ((orders || []).some((o) => o.orderNumber === `${prefix}-${String(nextSeq).padStart(3, '0')}`)) {
    nextSeq++;
  }
  return `${prefix}-${String(nextSeq).padStart(3, '0')}`;
}
