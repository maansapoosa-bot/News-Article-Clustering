import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND_URL = process.env.VITE_API_URL || 'http://127.0.0.1:5050'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})