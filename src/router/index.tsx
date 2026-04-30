/**
 * 路由入口
 * 使用 HashRouter 以兼容 COS 静态托管（无需服务端 SPA 回退）
 */

import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { MobileLayout } from '@/components/layout/MobileLayout'
import { routes, ROUTES } from './routes'

// 路由守卫
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  // 开发环境跳过登录
  if (import.meta.env.DEV) {
    return <>{children}</>
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }

  return <>{children}</>
}

// 路由组件
export function Router() {
  return (
    <HashRouter>
      <Routes>
        {/* 登录页 - 无底部导航 */}
        <Route
          path={ROUTES.LOGIN}
          element={routes.find(r => r.path === ROUTES.LOGIN)?.element}
        />

        {/* 所有业务页面 - 包含底部导航 */}
        {routes
          .filter(r => r.path !== ROUTES.LOGIN)
          .map(route => (
            <Route
              key={route.path}
              path={route.path}
              element={
                <RequireAuth>
                  <MobileLayout>
                    {route.element}
                  </MobileLayout>
                </RequireAuth>
              }
            />
          ))}

        {/* 默认重定向 */}
        <Route path="/" element={<Navigate to={ROUTES.MEMBER_HOME} replace />} />
        <Route path="*" element={<Navigate to={ROUTES.MEMBER_HOME} replace />} />
      </Routes>
    </HashRouter>
  )
}
