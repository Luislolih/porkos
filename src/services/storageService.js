import { ref, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage';
import { storage, app, firebaseConfig } from '../lib/firebase';

/**
 * Comprime una imagen usando Canvas para optimizar el peso antes de subirla o guardarla.
 * Produce un WebP/JPEG de máx 450px (~15KB-30KB) manteniendo excelente nitidez en pantallas Retina.
 */
export function compressImage(file, maxWidth = 450, quality = 0.75) {
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

        // Mantener proporción ajustando a la dimensión máxima
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

        // 1. Probar WebP primero (formato moderno de compresión superior)
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

        // 2. Generar Blob ligero para Firebase Storage
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
 * Sube una imagen a Firebase Storage con fallback automático ultra-optimizado.
 * Devuelve un objeto con { url, source: 'firebase' | 'local', error }
 */
export async function uploadProductImage(file, productId = null) {
  if (!file) return null;

  // 1. Comprimir en cliente para reducir transferencias de MB a KB
  let compressed = null;
  try {
    compressed = await compressImage(file, 450, 0.75);
  } catch (compErr) {
    console.warn('Compresión en canvas no disponible:', compErr);
  }

  const uploadBlob = compressed?.blob || file;
  const mimeType = compressed?.mimeType || file.type || 'image/jpeg';
  const dataUrlFallback = compressed?.dataUrl || null;

  // 2. Intentar subir a Firebase Storage
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
      // Si el bucket falla por nombre o configuración de dominio (.appspot.com vs .firebasestorage.app)
      if (
        primaryErr.code === 'storage/bucket-not-found' ||
        primaryErr.message?.toLowerCase().includes('bucket')
      ) {
        console.warn('Bucket principal no encontrado. Probando bucket appspot.com alternativo...');
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
      source: 'firebase',
      error: null,
    };
  } catch (storageErr) {
    console.warn(
      `Firebase Storage no disponible (código: ${storageErr.code || 'desconocido'}). ` +
      `Se usará respaldo optimizado local (Data URL WebP/JPEG ~20KB):`,
      storageErr.message
    );

    if (dataUrlFallback) {
      return {
        url: dataUrlFallback,
        source: 'local',
        error: storageErr,
      };
    }

    throw storageErr;
  }
}
