/**
 * PORKOAPP — Motor inteligente de optimización de imágenes en el cliente
 * - Redimensionamiento proporcional manteniendo relación de aspecto.
 * - Corrección automática de orientación EXIF.
 * - Conversión a WebP con fallback a JPEG.
 * - Compresión adaptativa por ciclos de calidad y escala para asegurar pesos mínimos.
 * - Eliminación total de metadatos EXIF / GPS / device info.
 * - Generación simultánea de Perfil Principal (máx 640px, 50-100KB) y Miniatura (máx 240px, 10-25KB).
 */

export const IMAGE_PROFILES = {
  MAIN: {
    maxDimension: 640,
    targetMinBytes: 50 * 1024,   // 50 KB
    targetMaxBytes: 100 * 1024,  // 100 KB
    absoluteMaxBytes: 120 * 1024, // 120 KB límite deseado
    initialQuality: 0.80,
  },
  THUMB: {
    maxDimension: 240,
    targetMinBytes: 10 * 1024,  // 10 KB
    targetMaxBytes: 25 * 1024,  // 25 KB
    absoluteMaxBytes: 30 * 1024,
    initialQuality: 0.78,
  },
  FEATURED: {
    maxDimension: 900,
    targetMinBytes: 80 * 1024,
    targetMaxBytes: 150 * 1024,
    absoluteMaxBytes: 180 * 1024,
    initialQuality: 0.82,
  },
};

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/x-png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/tiff',
];
const ALLOWED_EXTENSIONS_RE = /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif|tiff?)$/i;
const MAX_ORIGINAL_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB (se redimensiona localmente antes de subir)
const STORAGE_SAFE_MAX_BYTES = 260 * 1024; // Margen seguro bajo el límite de 300 KB en storage.rules

let cachedWebpSupport = null;

function supportsWebpEncoding() {
  if (cachedWebpSupport !== null) return cachedWebpSupport;
  try {
    const testCanvas = document.createElement('canvas');
    testCanvas.width = 1;
    testCanvas.height = 1;
    const dataUrl = testCanvas.toDataURL('image/webp');
    cachedWebpSupport = typeof dataUrl === 'string' && dataUrl.startsWith('data:image/webp');
  } catch {
    cachedWebpSupport = false;
  }
  return cachedWebpSupport;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    if (!blob) {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('No se pudo generar la vista previa local de la imagen.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Valida tipo y tamaño original del archivo
 */
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'No se seleccionó ningún archivo.' };
  }
  if (file.size === 0) {
    return { valid: false, error: 'El archivo seleccionado está vacío.' };
  }
  const mime = (file.type || '').toLowerCase().trim();
  const hasImageMime = mime.startsWith('image/') && mime !== 'image/svg+xml';
  const hasAllowedMime = ALLOWED_MIME_TYPES.includes(mime);
  const hasAllowedExt = typeof file.name === 'string' && ALLOWED_EXTENSIONS_RE.test(file.name);

  if (!hasImageMime && !hasAllowedMime && !(mime === '' && hasAllowedExt)) {
    return {
      valid: false,
      error: 'Formato no compatible. Sube una fotografía JPG, PNG, WebP, AVIF o HEIC.',
    };
  }
  if (file.size > MAX_ORIGINAL_SIZE_BYTES) {
    return {
      valid: false,
      error: `La fotografía supera los 25 MB permitidos (${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
    };
  }
  return { valid: true, error: null };
}

/**
 * Formatea bytes a KB o MB legibles
 */
export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Calcula dimensiones manteniendo la proporción original
 */
export function calculateFitDimensions(width, height, maxDim) {
  if (width <= maxDim && height <= maxDim) {
    return { width, height };
  }
  if (width > height) {
    return {
      width: maxDim,
      height: Math.max(1, Math.round((height * maxDim) / width)),
    };
  }
  return {
    width: Math.max(1, Math.round((width * maxDim) / height)),
    height: maxDim,
  };
}

/**
 * Carga una imagen en un elemento HTMLImageElement respetando la orientación EXIF
 */
function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      if ((img.naturalWidth || img.width) <= 0 || (img.naturalHeight || img.height) <= 0) {
        reject(new Error('El archivo no contiene una imagen válida.'));
        return;
      }
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const mime = (file.type || '').toLowerCase();
      const isHeic = mime.includes('heic') || mime.includes('heif') || /\.(heic|heif)$/i.test(file.name || '');
      reject(
        new Error(
          isHeic
            ? 'Este navegador no puede abrir fotos HEIC directamente. Conviértela a PNG/JPG o súbela desde Safari.'
            : 'No se pudo leer el archivo de imagen. Prueba exportándolo como PNG o JPG.'
        )
      );
    };

    img.src = objectUrl;
  });
}

/**
 * Convierte un canvas a Blob con verificación real del MIME resultante (evita fallback silencioso a PNG en Safari)
 */
function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (blob && (!blob.type || blob.type === mimeType)) {
          resolve({ blob, mimeType });
        } else if (mimeType === 'image/webp') {
          // Fallback real a JPEG si el navegador no codifica WebP (p. ej. Safari devuelve image/png)
          canvas.toBlob(
            (fallbackBlob) => {
              resolve({ blob: fallbackBlob, mimeType: fallbackBlob?.type || 'image/jpeg' });
            },
            'image/jpeg',
            quality
          );
        } else {
          resolve({ blob: blob || null, mimeType: blob?.type || mimeType });
        }
      },
      mimeType,
      quality
    );
  });
}

/**
 * Optimiza una imagen para un perfil específico mediante compresión adaptativa
 */
async function compressToProfile(img, profile) {
  const { maxDimension, absoluteMaxBytes, initialQuality } = profile;
  const maxAllowedBytes = Math.min(absoluteMaxBytes, STORAGE_SAFE_MAX_BYTES);
  let { width, height } = calculateFitDimensions(img.naturalWidth || img.width, img.naturalHeight || img.height, maxDimension);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) {
    throw new Error('Canvas 2D context no disponible');
  }

  // Activar suavizado bicúbico de alta calidad
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const targetMimeType = supportsWebpEncoding() ? 'image/webp' : 'image/jpeg';
  let currentQuality = initialQuality;
  let bestBlob = null;
  let bestMimeType = targetMimeType;
  let attempts = 0;
  const MAX_ATTEMPTS = 8;

  // Ciclo adaptativo: si supera el peso máximo, reduce calidad y luego dimensiones proporcionalmente
  while (attempts < MAX_ATTEMPTS) {
    attempts++;
    canvas.width = width;
    canvas.height = height;

    // Limpiar canvas y dibujar imagen (al redibujar en canvas se despojan los metadatos EXIF)
    ctx.clearRect(0, 0, width, height);
    if (targetMimeType === 'image/jpeg') {
      // Para JPEG (sin transparencia), rellenar con fondo oscuro de las tarjetas antes de dibujar
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(img, 0, 0, width, height);

    const result = await canvasToBlob(canvas, targetMimeType, currentQuality);
    if (!result.blob) break;

    bestBlob = result.blob;
    bestMimeType = result.mimeType;

    // Si ya cumple el peso objetivo, terminar
    if (bestBlob.size <= maxAllowedBytes) {
      break;
    }

    // Reducción progresiva adaptativa
    if (currentQuality > 0.62) {
      currentQuality = Math.max(0.58, currentQuality - 0.08);
    } else if (width > 280 || height > 280) {
      // Reducir dimensiones proporcionalmente manteniendo relación de aspecto
      width = Math.max(1, Math.round(width * 0.85));
      height = Math.max(1, Math.round(height * 0.85));
    } else {
      currentQuality = Math.max(0.48, currentQuality - 0.06);
    }
  }

  if (!bestBlob || bestBlob.size === 0) {
    throw new Error('No se pudo generar la versión optimizada de la fotografía.');
  }

  const dataUrl = await blobToDataUrl(bestBlob);
  const finalMimeType = bestBlob.type || bestMimeType;

  return {
    blob: bestBlob,
    dataUrl,
    width,
    height,
    sizeBytes: bestBlob ? bestBlob.size : 0,
    mimeType: finalMimeType,
    format: finalMimeType === 'image/webp' ? 'webp' : 'jpeg',
  };
}

/**
 * Optimiza completamente un archivo de imagen en el cliente generando perfil principal y miniatura
 */
export async function optimizeProductImage(file) {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const img = await loadImageElement(file);

  // Generar perfil principal (máx 640px)
  const main = await compressToProfile(img, IMAGE_PROFILES.MAIN);

  // Generar miniatura (máx 240px)
  const thumb = await compressToProfile(img, IMAGE_PROFILES.THUMB);

  const originalSize = file.size;
  const optimizedSize = main.sizeBytes;
  const reductionPercent = originalSize > 0
    ? Math.max(0, ((originalSize - optimizedSize) / originalSize) * 100).toFixed(1)
    : '0.0';

  return {
    main,
    thumb,
    original: {
      name: file.name,
      sizeBytes: originalSize,
      format: file.type,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
    },
    reductionPercent: Number(reductionPercent),
  };
}
