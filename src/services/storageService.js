import { ref, uploadBytes, getDownloadURL, deleteObject, getStorage } from 'firebase/storage';
import { storage, app, firebaseConfig } from '../lib/firebase';
import { optimizeProductImage, validateImageFile, formatBytes } from '../utils/imageOptimizer';

/**
 * PORKOAPP — Servicio Inteligente de Firebase Storage
 * - Carga únicamente versiones optimizadas (WebP 640px y Miniatura 240px).
 * - La imagen original NUNCA se sube a Firebase Storage.
 * - Evita archivos huérfanos eliminando versiones anteriores al editar o eliminar productos.
 * - Agrega headers de caché persistente (Cache-Control: 1 año).
 */

export { formatBytes, validateImageFile };

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
    cacheControl: 'public,max-age=31536000,immutable', // 1 año de caché para cero descargas redundantes
  };

  const thumbMetadata = {
    contentType: `image/${thumbExt}`,
    cacheControl: 'public,max-age=31536000,immutable',
  };

  try {
    const mainRef = ref(storage, mainPath);
    const thumbRef = ref(storage, thumbPath);

    let mainSnapshot;
    let thumbSnapshot;

    try {
      [mainSnapshot, thumbSnapshot] = await Promise.all([
        uploadBytes(mainRef, optimized.main.blob, metadata),
        uploadBytes(thumbRef, optimized.thumb.blob, thumbMetadata),
      ]);
    } catch (primaryErr) {
      // Fallback a bucket alternativo si el primario no resuelve por DNS
      if (
        primaryErr.code === 'storage/bucket-not-found' ||
        primaryErr.message?.toLowerCase().includes('bucket')
      ) {
        const altBucket = `${firebaseConfig.projectId}.appspot.com`;
        const altStorage = getStorage(app, `gs://${altBucket}`);
        const altMainRef = ref(altStorage, mainPath);
        const altThumbRef = ref(altStorage, thumbPath);

        [mainSnapshot, thumbSnapshot] = await Promise.all([
          uploadBytes(altMainRef, optimized.main.blob, metadata),
          uploadBytes(altThumbRef, optimized.thumb.blob, thumbMetadata),
        ]);
      } else {
        throw primaryErr;
      }
    }

    const [mainDownloadUrl, thumbDownloadUrl] = await Promise.all([
      getDownloadURL(mainSnapshot.ref),
      getDownloadURL(thumbSnapshot.ref),
    ]);

    return {
      success: true,
      url: mainDownloadUrl,
      thumbnailUrl: thumbDownloadUrl,
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
    };
  } catch (storageErr) {
    console.warn('Advertencia subiendo imagen a Firebase Storage:', storageErr);
    // Si falla la nube (por ejemplo, sin conexión o sin reglas de Storage configuradas),
    // retornamos el preview local para no trabar al operador
    return {
      success: false,
      url: null,
      thumbnailUrl: null,
      imageMetadata: null,
      originalSize: optimized.original.sizeBytes,
      optimizedSize: optimized.main.sizeBytes,
      reductionPercent: optimized.reductionPercent,
      localPreviewUrl: optimized.main.dataUrl,
      error: storageErr.message || 'No se pudo subir a la nube. Se usará la vista previa local.',
    };
  }
}

/**
 * Elimina una imagen y su miniatura de Firebase Storage para evitar archivos huérfanos
 */
export async function deleteProductImageFromStorage(imageMetadataOrPath) {
  if (!imageMetadataOrPath) return;

  const pathsToDelete = [];

  if (typeof imageMetadataOrPath === 'string') {
    // Si es una URL o ruta directa de Firebase Storage
    if (imageMetadataOrPath.includes('firebasestorage.googleapis.com')) {
      try {
        // Extraer ruta relativa de la URL codificada
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

  for (const path of pathsToDelete) {
    try {
      const fileRef = ref(storage, path);
      await deleteObject(fileRef);
    } catch (err) {
      // Si el archivo ya no existe, no es un error fatal
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
      } else {
        // Estimación promedio de 80 KB para imágenes antiguas sin metadata
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
    // 500 fotos estimadas a ~90 KB promedio = ~45 MB (dentro del límite de 5000 MB de Firebase Spark)
    capacityPercent: ((totalBytes / (5 * 1024 * 1024 * 1024)) * 100).toFixed(2),
  };
}
