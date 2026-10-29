import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Development only: lets the browser reach API Setu without CORS errors
      '/apisetu': {
        target: 'https://sandbox.api-setu.in',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/apisetu/, ''),
      },
    },
  },
})