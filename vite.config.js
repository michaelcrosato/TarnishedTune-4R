/** Static, subpath-safe build; no service, account or CDN is needed at runtime. */
import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  build: { target: 'esnext', chunkSizeWarningLimit: 2400 },
  server: { port: 43187, strictPort: true },
});
