// Memoria de sesión de imágenes decodificadas para evitar parpadeos y retrasos
export const LOADED_IMAGE_SET = new Set();

/**
 * Pre-carga y decodifica una imagen en segundo plano para que al renderizarse esté disponible al instante (0ms).
 */
export function preloadImage(url) {
  if (!url || typeof url !== 'string' || LOADED_IMAGE_SET.has(url)) return;
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    LOADED_IMAGE_SET.add(url);
  };
  img.src = url;
}
