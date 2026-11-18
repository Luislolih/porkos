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
 * Obtiene lista de instancias de Storage a probar en orden
 */
function getStorageCandidates() {
  const projectId = firebaseConfig.projectId || 'porkos-ac37d';
  const bucketNames = [
    `${projectId}.appspot.com`,
    `${projectId}.firebasestorage.app`,
  ];
  if (firebaseConfig.storageBucket && !bucketNames.includes(firebaseConfig.storageBucket)) {
    bucketNames.unshift(firebaseConfig.storageBucket);
  }

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
 * Prueba la conexión con Firebase Storage intentando subir y borrar un blob de prueba
 */
export async function testStorageConnection() {
  const candidates = getStorageCandidates();
  const testBlob = new Blob(['porkos_test'], { type: 'text/plain' });
  // Usar ruta products/ para coincidir tanto con reglas globales como con match /products/...
  const testPath = `products/_test_connection_${Date.now()}.txt`;

  let lastError = null;
  const attempts = [];

  for (const candidate of candidates) {
    try {
      const testRef = ref(candidate.instance, testPath);
      await uploadBytes(testRef, testBlob, { contentType: 'text/plain' });
      await deleteObject(testRef).catch(() => {});

      // Si funcionó, registrar este bucket como el activo permanente
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
      attempts.push({ bucket: candidate.name, code: err.code, message: err.message });
      // Continuar con el siguiente candidato (por si el otro bucket tiene las reglas activas)
      continue;
    }
  }

  let friendlyMessage = 'No se pudo conectar a Firebase Storage.';
  if (lastError?.code === 'storage/unauthorized') {
    friendlyMessage = 'Permiso denegado (storage/unauthorized). En Firebase Console, asegúrate de haber hecho clic en el botón azul "Publicar" (Publish).';
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
 * Sube tanto la versión principal optimizada (640px) como la miniatura (240px)
 */
export async function uploadProductImage(file, productId = null) {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 1. Optimizar en el navegador (WebP + Reducción de dimensiones + EXIF limpio)
  const optimized = await optimizeProductImage(file);
  const timestamp = Date.now();
  const safeId = (productId || 'prod_' + Math.random().toString(36).substring(2, 9)).replace(/[^a-zA-Z0-9_-]/g, '_');

  const mainExt = optimized.main.format;
  const thumbExt = optimized.thumb.format;

  const mainPath = `products/${safeId}/main_${timestamp}.${mainExt}`;
  const thumbPath = `products/${safeId}/thumb_${timestamp}.${thumbExt}`;

  const metadata = {
    contentType: `image/${mainExt}`,
    cacheControl: 'public,max-age=31536000,immutable', // 1 año de caché
  };

  const thumbMetadata = {
    contentType: `image/${thumbExt}`,
    cacheControl: 'public,max-age=31536000,immutable',
  };

  const candidates = getStorageCandidates();
  let lastError = null;

  for (const candidate of candidates) {
    try {
      const mainRef = ref(candidate.instance, mainPath);
      const thumbRef = ref(candidate.instance, thumbPath);

      const [mainSnap, thumbSnap] = await Promise.all([
        uploadBytes(mainRef, optimized.main.blob, metadata),
        uploadBytes(thumbRef, optimized.thumb.blob, thumbMetadata),
      ]);

      const [mainDownloadUrl, thumbDownloadUrl] = await Promise.all([
        getDownloadURL(mainSnap.ref),
        getDownloadURL(thumbSnap.ref),
      ]);

      // Guardar el bucket que funcionó exitosamente
      activeStorageInstance = candidate.instance;
      discoveredBucketName = candidate.name;

      return {
        success: true,
        url: mainDownloadUrl,
        thumbnailUrl: thumbDownloadUrl,
        bucketUsed: candidate.name,
        imageMetadata: {
          sizeBytes: optimized.main.sizeBytes,
          thumbSizeBytes: optimized.thumb.sizeBytes,
          totalSizeBytes: optimized.main.sizeBytes + optimized.thumb.sizeBytes,
          width: optimized.main.width,
          height: optimized.main.height,
          format: mainExt,
          storagePath: mainPath,
          thumbStoragePath: thumbPath,
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
      // Probar el siguiente bucket por si las reglas están en .appspot.com o .firebasestorage.app
      continue;
    }
  }

  console.warn('Firebase Storage no disponible actualmente:', lastError);

  // FALLBACK SEGURO: Retornamos la versión WebP optimizada (~35 KB)
  // para que el producto SIEMPRE se vea en la app y no se pierda la foto
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
    errorCode: lastError?.code || 'unknown',
    errorMessage: lastError?.message || 'Error al conectar con Firebase Storage',
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
