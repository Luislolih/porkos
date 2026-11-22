
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function pwaVersionPlugin() {
  return {
    name: 'pwa-version-plugin',
    closeBundle() {
      try {
        const distDir = path.resolve(__dirname, 'dist');
        const swPath = path.join(distDir, 'sw.js');
        const now = new Date();
        const buildTime = now.getTime();
        const buildId = `v${buildTime}`;

        // 1. Inyectar versión única en dist/sw.js para que el navegador móvil detecte la actualización de inmediato
        if (fs.existsSync(swPath)) {
          let swContent = fs.readFileSync(swPath, 'utf-8');
          swContent = swContent.replace(/__BUILD_ID__/g, buildId);
          swContent = swContent.replace(/porkoapp-cache-v\d+/g, `porkoapp-cache-${buildId}`);
          fs.writeFileSync(swPath, swContent, 'utf-8');
        }

        // 2. Generar dist/version.json para verificación activa desde la app
        fs.writeFileSync(
          path.join(distDir, 'version.json'),
          JSON.stringify({ version: buildId, timestamp: buildTime, date: now.toISOString() }, null, 2),
          'utf-8'
        );
      } catch (err) {
        console.warn('Advertencia en pwaVersionPlugin:', err);
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    pwaVersionPlugin(),
  ],
  server: {
    host: true, // Permite acceder desde celulares/tablets en la misma red local (WiFi)
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase')) {
            return 'vendor-firebase';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
        },
      },
    },
  },
})
