import { getNextOrderNumber } from './orderNumber';

export const formatCurrency = (amount) => {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return `S/ ${num.toFixed(2)}`;
};

export const formatTime = (dateInput) => {
  if (!dateInput) return '--:--';
  const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
  if (isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
};

export const formatElapsedTime = (dateInput) => {
  if (!dateInput) return '0m';
  const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
  if (isNaN(date.getTime())) return '0m';
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMins < 60) return `${diffMins} min`;
  const hours = Math.floor(diffMins / 60);
  const remainingMins = diffMins % 60;
  return `${hours}h ${remainingMins}m`;
};

export const isOrderDelayed = (dateInput, thresholdMins = 10) => {
  if (!dateInput) return false;
  const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
  if (isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() > thresholdMins * 60 * 1000;
};

export const generateOrderNumber = (orders = [], prefix = 'P') => {
  return getNextOrderNumber(orders, prefix);
};
