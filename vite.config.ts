import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,  // 允许局域网访问
    proxy: {
      // 代理腾讯云混元 API 请求，解决跨域问题
      '/api/hunyuan': {
        target: 'https://api.hunyuan.cloud.tencent.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/hunyuan/, ''),
      },
      // 代理百度 AI API 请求，解决跨域问题
      '/api/baidu': {
        target: 'https://aip.baidubce.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/baidu/, ''),
      },
    },
  },
  optimizeDeps: {
    include: ['@cloudbase/js-sdk'],
    entries: ['index.html'],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React 核心库必须全部进同一个 chunk，防止 Hook 调度器重复
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
            return 'vendor-react'
          }
          // UI 组件库
          if (id.includes('@radix-ui')) {
            return 'vendor-ui'
          }
          // 图标库（依赖 React，跟随 vendor-react 避免重复）
          if (id.includes('lucide-react') || id.includes('react-icons')) {
            return 'vendor-react'
          }
          // 状态管理
          if (id.includes('zustand')) {
            return 'vendor-state'
          }
          // 云服务
          if (id.includes('@cloudbase')) {
            return 'vendor-cloud'
          }
          // HEIC 图片处理
          if (id.includes('heic2any') || id.includes('libheif-js')) {
            return 'vendor-heic'
          }
        },
      },
    },
  },
})
