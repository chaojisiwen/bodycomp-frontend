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
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': [
            '@radix-ui/react-avatar',
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-progress',
            '@radix-ui/react-slot',
          ],
          'vendor-icons': ['lucide-react', 'react-icons'],
          'vendor-state': ['zustand'],
          'vendor-cloud': ['@cloudbase/js-sdk'],
          'vendor-heic': ['heic2any', 'libheif-js'],
        },
      },
    },
  },
})
