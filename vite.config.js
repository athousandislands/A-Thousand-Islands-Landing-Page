import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'website-source',
  plugins: [{
    name: 'absolute-share-image',
    transformIndexHtml(html) {
      const origin = process.env.SITE_ORIGIN ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
      if (!origin) return html;
      const image = new URL('/link-preview-cover.png', origin).href;
      return html.replaceAll('content="/link-preview-cover.png"', `content="${image}"`);
    },
  }],
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
    outDir: '../build-preview',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        home: fileURLToPath(new URL('./website-source/index.html', import.meta.url)),
        approach: fileURLToPath(new URL('./website-source/approach/index.html', import.meta.url)),
        portfolio: fileURLToPath(new URL('./website-source/creative-portfolio/index.html', import.meta.url)),
        echo: fileURLToPath(new URL('./website-source/echo/index.html', import.meta.url)),
        pulse: fileURLToPath(new URL('./website-source/pulse/index.html', import.meta.url)),
      },
    },
  },
});
