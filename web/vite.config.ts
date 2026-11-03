import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/app/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../backend/public/app',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/lucide-react')) {
            return 'icons';
          }
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    allowedHosts: ['alumnilink.local'],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1',
        changeOrigin: false,
      },
      '/sanctum': {
        target: 'http://127.0.0.1',
        changeOrigin: false,
      },
      '/storage': {
        target: 'http://127.0.0.1',
        changeOrigin: false,
      },
      '/broadcasting': {
        target: 'http://127.0.0.1',
        changeOrigin: false,
      },
    },
  },
}))
