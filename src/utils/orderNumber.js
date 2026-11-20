/**
 * Genera números de comanda y venta estrictamente correlativos y limpios (P-001, P-002, M-001...)
 * basados en el historial diario, eliminando códigos aleatorios o saltos inesperados.
 */
export function getNextOrderNumber(orders = [], prefix = 'P') {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  // Filtrar órdenes que correspondan a la jornada de hoy
  const todayOrders = (orders || []).filter((o) => {
    if (!o.createdAt) return false;
    const time = o.createdAt?.toDate
      ? o.createdAt.toDate().getTime()
      : o.createdAt?.getTime
      ? o.createdAt.getTime()
      : new Date(o.createdAt).getTime();
    return !isNaN(time) && time >= startOfDay;
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
