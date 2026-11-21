import { ref, uploadBytes, getDownloadURL, deleteObject, getStorage } from 'firebase/storage';
import { storage, app, firebaseConfig } from '../lib/firebase';
import { optimizeProductImage, validateImageFile, formatBytes } from '../utils/imageOptimizer';

/**
 * PORKOAPP — Servicio Inteligente de Firebase Storage
 * - Carga únicamente versiones optimizadas (WebP 640px y Miniatura 240px).
 * - La imagen original NUNCA se sube a Firebase Storage.
 * - Evita archivos huérfanos eliminando versiones anteriores al editar o eliminar productos.
 * - Soporte multi-bucket automático (resuelve entre .firebasestorage.app y .appspot.com).
 * - Fallback inteligente: si la nube no está configurada aún, mantiene la imagen optimizada
 *   en Base64 WebP (~35 KB) para que NUNCA desaparezca de la app.
 */

export { formatBytes, validateImageFile };

// Cachear en memoria el bucket que funciona para no repetir fallbacks
let activeStorageInstance = null;
let discoveredBucketName = null;

/**
 * Función auxiliar para evitar cuelgues infinitos de red con Firebase Storage
 */
function withTimeout(promise, timeoutMs = 8000, errorMsg = 'Tiempo de espera agotado al conectar con Storage') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const timer = setTimeout(() => {
        clearTimeout(timer);
        reject(new Error(errorMsg));
      }, timeoutMs);
    }),
  ]);
}

/**
 * Obtiene lista de instancias de Storage a probar en orden
 * Prioriza el bucket configurado explícitamente (.firebasestorage.app)
 */
function getStorageCandidates() {
  const projectId = firebaseConfig.projectId || 'porkos-ac37d';
  const bucketNames = [];

  // 1º Prioridad: Bucket configurado en firebase.js
  if (firebaseConfig.storageBucket) {
    bucketNames.push(firebaseConfig.storageBucket);
  }

  // 2º Prioridad: Formatos estándar de Firebase
  const standardFb = `${projectId}.firebasestorage.app`;
  const legacyAppspot = `${projectId}.appspot.com`;
  if (!bucketNames.includes(standardFb)) bucketNames.push(standardFb);
  if (!bucketNames.includes(legacyAppspot)) bucketNames.push(legacyAppspot);

  // Si ya descubrimos cuál funciona, ponerlo al inicio
  if (discoveredBucketName && bucketNames.includes(discoveredBucketName)) {
    bucketNames.sort((a, b) => (a === discoveredBucketName ? -1 : b === discoveredBucketName ? 1 : 0));
  }

  return bucketNames.map((name) => ({
    name,
    instance: getStorage(app, `gs://${name}`),
  }));
}

/**
 * Prueba la conexión con Firebase Storage intentando subir y borrar un blob de prueba (PNG válido según storage.rules)
 */
export async function testStorageConnection() {
  const candidates = getStorageCandidates();
  // 1x1 transparent PNG para satisfacer regla de tipo MIME image/(webp|jpeg|png) en Storage
  const png1x1 = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
  ]);
  const testBlob = new Blob([png1x1], { type: 'image/png' });
  const testPath = `products/_test_connection_${Date.now()}.png`;

  let lastError = null;
  const attempts = [];

  for (const candidate of candidates) {
    try {
      const testRef = ref(candidate.instance, testPath);
      await withTimeout(
        uploadBytes(testRef, testBlob, { contentType: 'image/png' }),
        6000,
        `Timeout en bucket ${candidate.name}`
      );
      await deleteObject(testRef).catch(() => {});

      activeStorageInstance = candidate.instance;
      discoveredBucketName = candidate.name;

      return {
        success: true,
        bucket: candidate.name,
        message: `¡Conexión exitosa con el bucket "${candidate.name}"!`,
        error: null,
      };
    } catch (err) {
      lastError = err;
      attempts.push({ bucket: candidate.name, code: err.code || 'TIMEOUT', message: err.message });
      continue;
    }
  }

  let friendlyMessage = 'No se pudo conectar a Firebase Storage.';
  if (lastError?.code === 'storage/unauthorized') {
    friendlyMessage = 'Permiso denegado (storage/unauthorized). En Firebase Console, haz clic en el botón azul "Publicar" (Publish).';
  } else if (lastError?.code === 'storage/bucket-not-found') {
    friendlyMessage = 'El bucket no existe. Haz clic en "Comenzar" (Get Started) en la pestaña Storage de Firebase Console.';
  } else if (lastError?.message?.toLowerCase().includes('cors') || lastError?.name === 'TypeError') {
    friendlyMessage = 'El navegador bloqueó la conexión por políticas de CORS en Google Cloud Storage.';
  }

  return {
    success: false,
    bucket: discoveredBucketName || candidates[0]?.name,
    message: friendlyMessage,
    error: lastError,
    errorCode: lastError?.code || 'unknown',
    attempts,
  };
}

/**
 * Sube una ÚNICA versión optimizada en formato WebP por producto (máx 640px, ~40-60 KB)
 * Previene cuelgues infinitos y evita la creación de archivos innecesarios.
 */
export async function uploadProductImage(file, productId = null) {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 1. Optimizar en el navegador (WebP + Reducción de dimensiones + EXIF limpio)
  const optimized = await optimizeProductImage(file);
  const safeId = (productId || 'prod_' + Math.random().toString(36).substring(2, 9)).replace(/[^a-zA-Z0-9_-]/g, '_');

  // Guardar únicamente una sola fotografía persistente por producto
  const mainPath = `products/${safeId}.webp`;

  const metadata = {
    contentType: 'image/webp',
    cacheControl: 'public,max-age=31536000,immutable', // 1 año de caché
  };

  const candidates = getStorageCandidates();
  let lastError = null;

  for (const candidate of candidates) {
    try {
      const mainRef = ref(candidate.instance, mainPath);

      // Con timeout de 8 segundos para evitar estados infinitos de carga
      const mainSnap = await withTimeout(
        uploadBytes(mainRef, optimized.main.blob, metadata),
        8000,
        `Tiempo de espera agotado al subir a ${candidate.name}`
      );

      const mainDownloadUrl = await withTimeout(
        getDownloadURL(mainSnap.ref),
        5000,
        `Tiempo de espera agotado al obtener URL en ${candidate.name}`
      );

      activeStorageInstance = candidate.instance;
      discoveredBucketName = candidate.name;

      return {
        success: true,
        url: mainDownloadUrl,
        thumbnailUrl: mainDownloadUrl,
        bucketUsed: candidate.name,
        imageMetadata: {
          sizeBytes: optimized.main.sizeBytes,
          width: optimized.main.width,
          height: optimized.main.height,
          format: 'webp',
          storagePath: mainPath,
          uploadedAt: new Date().toISOString(),
        },
        originalSize: optimized.original.sizeBytes,
        optimizedSize: optimized.main.sizeBytes,
        reductionPercent: optimized.reductionPercent,
        localPreviewUrl: optimized.main.dataUrl,
        error: null,
      };
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  console.warn('Firebase Storage no respondió a tiempo. Activando respaldo optimizado:', lastError?.message);

  // FALLBACK INSTANTÁNEO: Retornamos la versión WebP optimizada (~35 KB)
  // para que el producto NUNCA se quede cargando y SIEMPRE se vea en la app
  return {
    success: false,
    url: null,
    thumbnailUrl: null,
    imageMetadata: null,
    originalSize: optimized.original.sizeBytes,
    optimizedSize: optimized.main.sizeBytes,
    reductionPercent: optimized.reductionPercent,
    localPreviewUrl: optimized.main.dataUrl,
    error: lastError,
    errorCode: lastError?.code || 'TIMEOUT_OR_NETWORK',
    errorMessage: lastError?.message || 'Conexión lenta con Storage. Se guardará la versión optimizada en la app.',
  };
}

/**
 * Elimina una imagen y su miniatura de Firebase Storage para evitar archivos huérfanos
 */
export async function deleteProductImageFromStorage(imageMetadataOrPath) {
  if (!imageMetadataOrPath) return;

  const pathsToDelete = [];

  if (typeof imageMetadataOrPath === 'string') {
    if (imageMetadataOrPath.includes('firebasestorage.googleapis.com')) {
      try {
        const matches = imageMetadataOrPath.match(/\/o\/([^?]+)/);
        if (matches && matches[1]) {
          pathsToDelete.push(decodeURIComponent(matches[1]));
        }
      } catch {
        // ignore
      }
    } else if (imageMetadataOrPath.startsWith('products/')) {
      pathsToDelete.push(imageMetadataOrPath);
    }
  } else if (typeof imageMetadataOrPath === 'object') {
    if (imageMetadataOrPath.storagePath) {
      pathsToDelete.push(imageMetadataOrPath.storagePath);
    }
    if (imageMetadataOrPath.thumbStoragePath) {
      pathsToDelete.push(imageMetadataOrPath.thumbStoragePath);
    }
  }

  const currentStorage = activeStorageInstance || storage;

  for (const path of pathsToDelete) {
    try {
      const fileRef = ref(currentStorage, path);
      await deleteObject(fileRef);
    } catch (err) {
      if (err.code !== 'storage/object-not-found') {
        console.warn(`No se pudo eliminar archivo huérfano en Storage (${path}):`, err);
      }
    }
  }
}

/**
 * Calcula estadísticas de almacenamiento del catálogo para el panel de administración
 */
export function calculateCatalogStorageStats(products = []) {
  let totalBytes = 0;
  let countWithImages = 0;

  for (const p of products) {
    if (p.image || p.thumbnailUrl) {
      countWithImages++;
      if (p.imageMetadata?.totalSizeBytes) {
        totalBytes += p.imageMetadata.totalSizeBytes;
      } else if (p.imageMetadata?.sizeBytes) {
        totalBytes += p.imageMetadata.sizeBytes + (p.imageMetadata.thumbSizeBytes || 18 * 1024);
      } else if (typeof p.image === 'string' && p.image.startsWith('data:image')) {
        totalBytes += Math.round(p.image.length * 0.75); // Tamaño aproximado de base64 en bytes
      } else {
        totalBytes += 80 * 1024;
      }
    }
  }

  const averageBytes = countWithImages > 0 ? Math.round(totalBytes / countWithImages) : 0;

  return {
    countWithImages,
    totalProducts: products.length,
    totalBytes,
    totalFormatted: formatBytes(totalBytes),
    averageFormatted: formatBytes(averageBytes),
    capacityPercent: ((totalBytes / (5 * 1024 * 1024 * 1024)) * 100).toFixed(2),
  };
}
