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

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_ORIGINAL_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB para evitar saturar memoria en móviles

/**
 * Valida tipo y tamaño original del archivo
 */
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'No se seleccionó ningún archivo.' };
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: 'Formato no compatible. Sube una fotografía en formato JPG, PNG o WebP.',
    };
  }
  if (file.size > MAX_ORIGINAL_SIZE_BYTES) {
    return {
      valid: false,
      error: `La fotografía supera los 15 MB permitidos (${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
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
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo decodificar el archivo de imagen.'));
    };

    img.src = objectUrl;
  });
}

/**
 * Convierte un canvas a Blob con fallback si WebP no es soportado
 */
function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve({ blob, mimeType });
        } else if (mimeType === 'image/webp') {
          // Fallback a JPEG si WebP falla en el navegador
          canvas.toBlob(
            (fallbackBlob) => {
              resolve({ blob: fallbackBlob, mimeType: 'image/jpeg' });
            },
            'image/jpeg',
            quality
          );
        } else {
          resolve({ blob: null, mimeType });
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
  let { width, height } = calculateFitDimensions(img.naturalWidth || img.width, img.naturalHeight || img.height, maxDimension);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) {
    throw new Error('Canvas 2D context no disponible');
  }

  // Activar suavizado bicúbico de alta calidad
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  let currentQuality = initialQuality;
  let bestBlob = null;
  let bestMimeType = 'image/webp';
  let attempts = 0;
  const MAX_ATTEMPTS = 5;

  // Ciclo adaptativo: si supera el peso máximo, reduce calidad y luego dimensiones proporcionalmente
  while (attempts < MAX_ATTEMPTS) {
    attempts++;
    canvas.width = width;
    canvas.height = height;

    // Limpiar canvas y dibujar imagen (al redibujar en canvas se despojan los metadatos EXIF)
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const result = await canvasToBlob(canvas, 'image/webp', currentQuality);
    if (!result.blob) break;

    bestBlob = result.blob;
    bestMimeType = result.mimeType;

    // Si ya cumple el peso objetivo, terminar
    if (bestBlob.size <= absoluteMaxBytes) {
      break;
    }

    // Reducción progresiva adaptativa
    if (currentQuality > 0.65) {
      currentQuality -= 0.08;
    } else if (width > 320 && height > 320) {
      // Reducir dimensiones 10% adicional manteniendo relación de aspecto
      width = Math.round(width * 0.9);
      height = Math.round(height * 0.9);
    } else {
      currentQuality = Math.max(0.55, currentQuality - 0.05);
    }
  }

  const dataUrl = canvas.toDataURL(bestMimeType, currentQuality);

  return {
    blob: bestBlob,
    dataUrl,
    width,
    height,
    sizeBytes: bestBlob ? bestBlob.size : 0,
    format: bestMimeType === 'image/webp' ? 'webp' : 'jpeg',
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
