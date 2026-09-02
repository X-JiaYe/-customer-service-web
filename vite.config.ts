import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 前端独立仓库：开发期把后端接口代理到 FastAPI（同源，免 CORS）；
// 生产由 Nginx 做同样的反向代理（/auth /chat /feedback /ws → 后端）。
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:8000',
      '/chat': 'http://localhost:8000',
      '/feedback': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
      '/metrics': 'http://localhost:8000',
      '/ws': { target: 'ws://localhost:8000', ws: true },
    },
  },
})
