import { ORDER_STATUS, PAYMENT_METHODS, PAYMENT_STATUS } from '../../types/constants';
import { parseToDate } from '../../utils/formatters';

export const MODALITY_SHORT_LABELS = {
  MESA: 'Mesa',
  PARA_LLEVAR: 'Llevar',
  CONSUMO_EXTERNO: 'Ir Comiendo',
  DELIVERY: 'Delivery',
  MARKET: 'Market',
};

export const MODALITY_FULL_LABELS = {
  MESA: 'Mesa',
  PARA_LLEVAR: 'Para Llevar',
  CONSUMO_EXTERNO: 'Ir Comiendo',
  DELIVERY: 'Delivery',
  MARKET: 'Market Directo',
};

/**
 * Retorna un identificador único estable para un pedido, evitando colisiones
 * entre correlativos diarios repetidos (ej. P-001 de distintos días).
 */
export function getOrderKey(order) {
  return order?.id || order?.orderNumber || '';
}

export function getOrderLocationLabel(order, { short = false } = {}) {
  if (order?.tableName) return order.tableName;
  const map = short ? MODALITY_SHORT_LABELS : MODALITY_FULL_LABELS;
  return map[order?.modality] || 'Pedido';
}

export function getOrderCustomerLabel(order, fallback = 'Cliente') {
  const name = order?.customerName || order?.customer?.name;
  return name && String(name).trim() ? String(name).trim() : fallback;
}

export function isOrderEditable(order) {
  if (!order) return false;
  const isTable = order.modality === 'MESA' || Boolean(order.tableId);
  return (
    (order.status !== 'ENTREGADO' && order.status !== 'CANCELADO') ||
    (isTable && order.paymentStatus !== 'PAID' && order.status !== 'CANCELADO')
  );
}

export function getOrderItemsCount(order) {
  return (order?.items || []).reduce((acc, item) => acc + (Number(item?.quantity) || 1), 0);
}

export function getOrderItemsSummary(order) {
  if (!order?.items?.length) return 'Sin productos';
  return order.items.map((it) => `${it.quantity || 1}× ${it.name}`).join(', ');
}

export function formatOrderNote(notes) {
  if (!notes || typeof notes !== 'string') return '';
  const trimmed = notes.trim();
  if (!trimmed) return '';
  if (trimmed.includes('histórico') || trimmed.includes('administrador')) {
    return 'Registro manual';
  }
  return trimmed;
}

export function getOrderPaymentInfo(order) {
  if (!order) {
    return {
      effectiveStatus: 'PENDING',
      statusLabel: PAYMENT_STATUS.PENDING.label,
      statusBadgeClass: PAYMENT_STATUS.PENDING.badgeClass,
      methods: [],
      methodSummary: '',
    };
  }

  if (order.status === 'CANCELADO') {
    return {
      effectiveStatus: 'CANCELLED',
      statusLabel: 'Anulado',
      statusBadgeClass: 'text-rose-400 bg-rose-500/10',
      methods: [],
      methodSummary: '',
    };
  }

  const isTable = order.modality === 'MESA' || Boolean(order.tableId);
  const effectiveStatus = isTable
    ? (order.paymentStatus || 'PENDING')
    : (order.paymentStatus || 'PAID');
  const payConf = PAYMENT_STATUS[effectiveStatus] || PAYMENT_STATUS.PENDING;

  const rawPayments = [];
  if (Array.isArray(order.payments) && order.payments.length > 0) {
    order.payments.forEach((p) => {
      if (p?.method) {
        const key = String(p.method).trim().toUpperCase();
        rawPayments.push({
          method: key,
          label: PAYMENT_METHODS[key]?.label || p.method,
          amount: Number(p.amount ?? order.total) || 0,
        });
      }
    });
  } else if (order.payment?.method) {
    const key = String(order.payment.method).trim().toUpperCase();
    rawPayments.push({
      method: key,
      label: PAYMENT_METHODS[key]?.label || order.payment.method,
      amount: Number(order.payment.amount ?? order.total) || 0,
    });
  } else if (order.paymentMethod && effectiveStatus === 'PAID') {
    const key = String(order.paymentMethod).trim().toUpperCase();
    rawPayments.push({
      method: key,
      label: PAYMENT_METHODS[key]?.label || order.paymentMethod,
      amount: Number(order.total) || 0,
    });
  }

  const uniqueLabels = [...new Set(rawPayments.map((p) => p.label))];

  return {
    effectiveStatus,
    statusLabel: payConf.label || effectiveStatus,
    statusBadgeClass: payConf.badgeClass || 'text-zinc-400 bg-zinc-800',
    methods: rawPayments,
    methodSummary: uniqueLabels.join(' + '),
  };
}

export function getOrderTimestampMs(order) {
  const parsed = parseToDate(order?.createdAt);
  return parsed ? parsed.getTime() : 0;
}

export function getStatusIconContainerClass(status) {
  if (status === 'ENTREGADO') {
    return 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400';
  }
  if (status === 'LISTO') {
    return 'bg-amber-950/40 border-amber-500/30 text-amber-400';
  }
  if (status === 'CANCELADO') {
    return 'bg-rose-950/40 border-rose-500/30 text-rose-400';
  }
  return 'bg-orange-950/40 border-orange-500/30 text-[var(--color-porkos-orange)]';
}

export function getStepStatusIndex(status) {
  switch (status) {
    case 'PENDIENTE':
      return 0;
    case 'PREPARANDO':
      return 1;
    case 'LISTO':
      return 2;
    case 'ENTREGADO':
      return 3;
    default:
      return 0;
  }
}

export function getOrderStatusLabel(status) {
  return ORDER_STATUS[status]?.label || status || 'Pendiente';
}
