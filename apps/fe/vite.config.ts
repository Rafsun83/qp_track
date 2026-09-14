import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy API calls to the Nest backend so the browser never has to deal
    // with CORS in dev - `apps/be` doesn't enable it.
    proxy: {
      '/api': 'http://localhost:3001',
      '/auth': 'http://localhost:3001',
      '/webhook': 'http://localhost:3001',
    },
  },
})
