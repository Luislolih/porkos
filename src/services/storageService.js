import { ref, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage';
import { storage, app, firebaseConfig } from '../lib/firebase';

/**
 * Control central de Firebase Storage.
 * En el plan Spark (gratuito) se mantiene en false para no activar facturación Blaze ni depender de Storage.
 * Cambiar a true únicamente cuando decidas activar Firebase Storage en Blaze.
 */
export const IS_STORAGE_ENABLED = false;

// Tipos de imagen permitidos
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB

/**
 * Valida que el archivo cumpla con los estándares de seguridad (MIME y tamaño).
 */
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'No se seleccionó ningún archivo.' };
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: 'Formato no compatible. Solo se permiten imágenes JPG, PNG o WebP.' };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'El archivo excede el tamaño máximo permitido (3 MB).' };
  }
  return { valid: true, error: null };
}

/**
 * Comprime una imagen usando Canvas para generar una vista previa ultra liviana en el navegador.
 * Produce un WebP/JPEG de máx 400px (~15KB-25KB).
 */
export function compressImage(file, maxWidth = 400, quality = 0.75) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const elem = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const maxDim = maxWidth;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        elem.width = width;
        elem.height = height;

        const ctx = elem.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        let mimeType = 'image/webp';
        let dataUrl = '';
        try {
          dataUrl = elem.toDataURL('image/webp', quality);
          if (!dataUrl.startsWith('data:image/webp')) {
            mimeType = 'image/jpeg';
            dataUrl = elem.toDataURL('image/jpeg', quality);
          }
        } catch {
          mimeType = 'image/jpeg';
          dataUrl = elem.toDataURL('image/jpeg', quality);
        }

        elem.toBlob(
          (blob) => {
            resolve({
              dataUrl,
              blob: blob || file,
              mimeType,
              width,
              height,
            });
          },
          mimeType,
          quality
        );
      };
      img.onerror = () => {
        resolve({
          dataUrl: event.target.result,
          blob: file,
          mimeType: file.type || 'image/jpeg',
          width: 0,
          height: 0,
        });
      };
    };
    reader.onerror = () => {
      resolve(null);
    };
  });
}

/**
 * Procesa la imagen del producto.
 * - Si IS_STORAGE_ENABLED === false (Plan Spark): no llama a Firebase Storage, genera preview local
 *   y NO persiste Base64 en Firestore.
 * - Si IS_STORAGE_ENABLED === true (Plan Blaze futuro): sube el archivo a Firebase Storage y retorna la URL pública.
 */
export async function uploadProductImage(file, productId = null) {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 1. Comprimir en cliente para optimización visual
  let compressed = null;
  try {
    compressed = await compressImage(file, 400, 0.75);
  } catch (compErr) {
    console.warn('Compresión en canvas no disponible:', compErr);
  }

  const uploadBlob = compressed?.blob || file;
  const mimeType = compressed?.mimeType || file.type || 'image/jpeg';
  const localPreviewUrl = compressed?.dataUrl || null;

  // 2. Si Firebase Storage está desactivado (Plan Spark actual):
  if (!IS_STORAGE_ENABLED) {
    return {
      url: null, // Sin URL en la nube
      localPreviewUrl, // Solo para visualización local en el dispositivo actual
      source: 'local_preview',
      isStorageEnabled: false,
      error: null,
    };
  }

  // 3. Si Firebase Storage está activado (Futuro con plan Blaze):
  try {
    const timestamp = Date.now();
    const ext = mimeType === 'image/webp' ? 'webp' : 'jpg';
    const storagePath = `products/${productId || 'prod'}_${timestamp}.${ext}`;

    const metadata = {
      contentType: mimeType,
      cacheControl: 'public,max-age=31536000',
    };

    const storageRef = ref(storage, storagePath);
    let snapshot;

    try {
      snapshot = await uploadBytes(storageRef, uploadBlob, metadata);
    } catch (primaryErr) {
      if (
        primaryErr.code === 'storage/bucket-not-found' ||
        primaryErr.message?.toLowerCase().includes('bucket')
      ) {
        const altBucket = `${firebaseConfig.projectId}.appspot.com`;
        const altStorage = getStorage(app, `gs://${altBucket}`);
        const altRef = ref(altStorage, storagePath);
        snapshot = await uploadBytes(altRef, uploadBlob, metadata);
      } else {
        throw primaryErr;
      }
    }

    const downloadURL = await getDownloadURL(snapshot.ref);
    return {
      url: downloadURL,
      localPreviewUrl: downloadURL,
      source: 'firebase',
      isStorageEnabled: true,
      error: null,
    };
  } catch (storageErr) {
    console.warn('Error subiendo imagen a Firebase Storage:', storageErr);
    return {
      url: null,
      localPreviewUrl,
      source: 'local_preview',
      isStorageEnabled: false,
      error: storageErr,
    };
  }
}
