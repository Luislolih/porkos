import { getNextOrderNumber } from './orderNumber';

export const parseToDate = (dateInput) => {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;
  if (typeof dateInput.toDate === 'function') {
    try {
      const d = dateInput.toDate();
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }
  if (typeof dateInput.seconds === 'number') {
    return new Date(dateInput.seconds * 1000 + (dateInput.nanoseconds ? Math.floor(dateInput.nanoseconds / 1000000) : 0));
  }
  if (typeof dateInput._seconds === 'number') {
    return new Date(dateInput._seconds * 1000 + (dateInput._nanoseconds ? Math.floor(dateInput._nanoseconds / 1000000) : 0));
  }
  if (typeof dateInput === 'number') {
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number);
      return new Date(y, m - 1, d, 12, 0, 0, 0);
    }
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

export const formatCurrency = (amount) => {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return `S/ ${num.toFixed(2)}`;
};

const limaDateTimeFormatter = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'America/Lima',
});

const getLimaDateParts = (dateInput) => {
  const date = parseToDate(dateInput);
  if (!date) return null;
  const parts = {};
  limaDateTimeFormatter.formatToParts(date).forEach((part) => {
    parts[part.type] = part.value;
  });
  if (parts.hour === '24') parts.hour = '00';
  return parts;
};

export const formatDate = (dateInput) => {
  const p = getLimaDateParts(dateInput);
  if (!p) return '--/--/----';
  return `${p.day}/${p.month}/${p.year}`;
};

export const formatShortDate = (dateInput) => {
  const p = getLimaDateParts(dateInput);
  if (!p) return '--/--';
  return `${p.day}/${p.month}`;
};

export const formatDateTime = (dateInput) => {
  const p = getLimaDateParts(dateInput);
  if (!p) return '--/--/---- --:--';
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
};

export const formatShortDateTime = (dateInput) => {
  const p = getLimaDateParts(dateInput);
  if (!p) return '--/-- --:--';
  return `${p.day}/${p.month} ${p.hour}:${p.minute}`;
};

export const formatTime = (dateInput) => {
  const p = getLimaDateParts(dateInput);
  if (!p) return '--:--';
  return `${p.hour}:${p.minute}`;
};

export const formatElapsedTime = (dateInput) => {
  const date = parseToDate(dateInput);
  if (!date) return '0 min';
  const diffMs = Math.max(0, Date.now() - date.getTime());
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins === 0) return 'Ahora';
  if (diffMins < 60) return `${diffMins} min`;
  const hours = Math.floor(diffMins / 60);
  const remainingMins = diffMins % 60;
  return `${hours}h ${remainingMins}m`;
};

export const isOrderDelayed = (dateInput, thresholdMins = 12) => {
  const date = parseToDate(dateInput);
  if (!date) return false;
  return Date.now() - date.getTime() > thresholdMins * 60 * 1000;
};

export const generateOrderNumber = (orders = [], prefix = 'P') => {
  return getNextOrderNumber(orders, prefix);
};
