import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
// vitest/config rather than vite, so the test section below is type checked.
import { defineConfig } from 'vitest/config';

/**
 * The shared package is consumed from its TypeScript source rather than its
 * build output. Its build targets CommonJS for the NestJS API, and a browser
 * cannot load CommonJS as an ES module: the dev server would serve it verbatim
 * and the app would fail to start. Compiling the source here also means the web
 * app never has to wait for the shared package to be built, and picks up changes
 * to it immediately.
 */
const sharedSource = fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@booking/shared': sharedSource },
  },
  server: {
    port: 5173,
    strictPort: true,
    // Proxying /api keeps the browser on a single origin during development, so
    // session and CSRF cookies behave exactly as they do in production behind
    // Caddy.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: false,
      },
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
