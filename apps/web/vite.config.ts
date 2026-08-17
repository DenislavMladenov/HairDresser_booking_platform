import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
// vitest/config rather than vite, so the test section below is type checked.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
