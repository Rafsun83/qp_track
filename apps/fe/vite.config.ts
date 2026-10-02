import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Overridden in docker-compose.yml, where the backend is reachable as `be`.
const apiTarget = process.env.VITE_PROXY_TARGET ?? 'http://localhost:3001'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy API calls to the Nest backend so the browser never has to deal
    // with CORS in dev - `apps/be` doesn't enable it.
    proxy: {
      '/api': apiTarget,
      '/auth': apiTarget,
      '/webhook': apiTarget,
      // Socket.IO (realtime notifications) - `ws: true` proxies the
      // WebSocket upgrade, not just the HTTP long-polling fallback.
      '/socket.io': { target: apiTarget, ws: true },
    },
  },
})
