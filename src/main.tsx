import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('[App] main.tsx 开始执行')

// PWA Service Worker 注册
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => console.log('[SW] 注册成功:', registration.scope),
      (error) => console.log('[SW] 注册失败:', error)
    )
  })
}

console.log('[App] 准备渲染 App 组件')
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
console.log('[App] App 组件已渲染')
