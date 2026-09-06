import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Electron loads the packaged renderer through file://. Relative asset URLs
  // keep JS and CSS inside app.asar instead of resolving them at C:\assets.
  base: './',
  plugins: [react()],
  test: {
    // XML parsing is browser behavior; jsdom provides DOMParser in automated tests.
    environment: 'jsdom'
  }
});
