import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '')
  const proxyTarget = environment.VITE_NETSENSE_API_PROXY_TARGET?.trim()
  return {
    plugins: [react()],
    server: proxyTarget
      ? {
        proxy: {
          '/api': {
            target: proxyTarget,
            changeOrigin: true,
          },
        },
      }
      : undefined,
  }
})
