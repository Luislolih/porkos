/**
 * Genera números de comanda y venta correlativos y limpios (ej. P-001, P-002, M-001...)
 * basados en el historial de órdenes del día, evitando códigos aleatorios y facilitando
 * la lectura en salón, cocina y caja.
 */
export function getNextOrderNumber(orders = [], prefix = 'P') {
  const today = new Date().toDateString();

  // Filtrar órdenes que se hayan creado en la jornada de hoy
  const todayOrders = (orders || []).filter((o) => {
    if (!o.createdAt) return false;
    const d = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
    return d.toDateString() === today;
  });

  let maxSeq = 0;
  todayOrders.forEach((o) => {
    if (o.orderNumber && typeof o.orderNumber === 'string') {
      const match = o.orderNumber.match(new RegExp(`^${prefix}-(\\d+)`, 'i'));
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  });

  const nextSeq = Math.max(maxSeq + 1, todayOrders.length + 1);
  return `${prefix}-${String(nextSeq).padStart(3, '0')}`;
}
