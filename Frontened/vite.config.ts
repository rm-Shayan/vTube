import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // For your API:
      // http://localhost:5173/vTube → https://vtube-production.up.railway.app
      '/vTube': {
        target: 'https://vtube-production.up.railway.app',
        changeOrigin: true, // changes host header to target URL
        rewrite: (path) => path.replace(/^\/vTube/, ''), // optional: removes /vTube prefix
      },
    },
  },
})
