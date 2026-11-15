import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

// Comprimir imagen usando Canvas para optimizar peso en base de datos y Storage
export function compressImage(file, maxWidth = 800, quality = 0.8) {
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

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        elem.width = width;
        elem.height = height;

        const ctx = elem.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Retornar Data URL comprimido
        const dataUrl = elem.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => {
        resolve(event.target.result);
      };
    };
    reader.onerror = () => {
      resolve(null);
    };
  });
}

// Subir imagen a Firebase Storage con fallback a Base64
export async function uploadProductImage(file, productId = null) {
  if (!file) return null;

  try {
    // 1. Intentar subir directamente a Firebase Storage
    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const storagePath = `products/${productId || 'prod'}_${timestamp}_${cleanFileName}`;
    const storageRef = ref(storage, storagePath);

    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (storageErr) {
    console.warn(
      'No se pudo subir a Firebase Storage (se usará Data URL comprimido optimizado):',
      storageErr.message
    );
    // 2. Fallback automático: comprimir imagen en Base64 para que nunca se pierda
    const compressedDataUrl = await compressImage(file, 600, 0.75);
    return compressedDataUrl;
  }
}
