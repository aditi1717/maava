import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const server = await createServer({
  root: rootDir,
  configFile: false,
  clearScreen: false,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@food/api': path.resolve(rootDir, './src/services/api'),
      '@food': path.resolve(rootDir, './src/modules/Food'),
      '@delivery': path.resolve(rootDir, './src/modules/DeliveryV2'),
      '@': path.resolve(rootDir, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});

await server.listen();
server.printUrls();

const shutdown = async () => {
  await server.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
