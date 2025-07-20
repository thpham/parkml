import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // React and core dependencies
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // Form handling
          'forms': ['react-hook-form'],
          
          // UI components and styling
          'ui-vendor': ['lucide-react', 'react-hot-toast'],
          
          // Authentication and security
          'auth-vendor': ['@simplewebauthn/browser'],
          
          // Internationalization
          'i18n': ['react-i18next', 'i18next', 'i18next-browser-languagedetector'],
          
          // QR code libraries
          'qr': ['qrcode.react', 'react-qr-code'],
        },
      },
    },
    // Increase chunk size warning limit to 1MB (1000 kB)
    chunkSizeWarningLimit: 1000,
  },
});