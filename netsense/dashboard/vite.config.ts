import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { loadDevelopmentProxyAuthorization } from './devProxyAuthentication'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '')
  const proxyTarget = environment.VITE_NETSENSE_API_PROXY_TARGET?.trim()
  const proxyAuthorization = proxyTarget
    ? loadDevelopmentProxyAuthorization(
      proxyTarget,
      environment.NETSENSE_DEV_PROXY_TOKEN_FILE,
    )
    : undefined
  return {
    plugins: [react()],
    server: proxyTarget
      ? {
        proxy: {
          '/api': {
            target: proxyTarget,
            changeOrigin: true,
            ...(proxyAuthorization
              ? { headers: { Authorization: proxyAuthorization } }
              : {}),
          },
        },
      }
      : undefined,
  }
})
