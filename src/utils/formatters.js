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
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

export const formatCurrency = (amount) => {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return `S/ ${num.toFixed(2)}`;
};

export const formatTime = (dateInput) => {
  const date = parseToDate(dateInput);
  if (!date) return '--:--';
  return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
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
