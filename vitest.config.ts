import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
    css: true,
    exclude: [
      'node_modules/**',
      'node_modules_broken/**',
      '_node_modules_broken_backup/**',
      'dist/**',
    ],
    deps: {
      optimizer: {
        web: {
          include: ['html-encoding-sniffer', 'whatwg-encoding'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
