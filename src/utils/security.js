/**
 * Utilidades de sanitización y blindaje de seguridad
 * Protege contra inyecciones XSS, payloads maliciosos y alteraciones numéricas
 */

/**
 * Sanitiza cadenas de texto para inputs (nombres, clientes, mesas, notas)
 * Remueve scripts, etiquetas HTML no autorizadas y carácteres nulos
 */
export function sanitizeText(val, maxLength = 250) {
  if (typeof val !== 'string') return '';
  return val
    .replace(/\0/g, '') // Eliminar null bytes
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Eliminar script tags
    .replace(/[<>]/g, '') // Eliminar delimitadores HTML
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitiza notas de comanda permitiendo puntuación y caracteres en español
 */
export function sanitizeNotes(val, maxLength = 400) {
  if (typeof val !== 'string') return '';
  return val
    .replace(/\0/g, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Garantiza valores numéricos válidos, finitos y positivos (previene NaN o manipulación)
 */
export function sanitizeNumber(val, fallback = 0, min = 0, max = 999999) {
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num) || !isFinite(num)) return fallback;
  const clamped = Math.min(max, Math.max(min, num));
  return Math.round(clamped * 100) / 100;
}

/**
 * Garantiza enteros positivos válidos (para cantidades de platos o extras)
 */
export function sanitizeInteger(val, fallback = 1, min = 1, max = 999) {
  const num = typeof val === 'number' ? val : parseInt(val, 10);
  if (isNaN(num) || !isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(num)));
}
