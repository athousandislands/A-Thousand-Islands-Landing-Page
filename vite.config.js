import { defineConfig } from 'vite';

export default defineConfig({
  root: 'site',
  publicDir: false,
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4174,
    strictPort: true,
  },
  build: {
    outDir: '../dist-redesign',
    emptyOutDir: true,
  },
});
