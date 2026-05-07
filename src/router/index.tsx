// ============================================================
// ⚠️ 登录核心文件 - 修改需谨慎
// 本文件属于系统认证链路的关键环节
// 修改前请确认了解：登录流程、路由守卫、AuthContext 三者关系
// 关键约束：
//   - RequireAuth 必须检查 isAuthenticated（禁止添加任何绕过逻辑）
//   - 默认重定向必须指向 ROUTES.LOGIN（未登录）或会员/教练首页（已登录）
//   - 路由路径必须与 router/routes.tsx 中 ROUTES 常量保持一致
// ============================================================

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
