// ============================================================
// ⚠️ 登录核心文件 - 修改需谨慎
// 本文件属于系统认证链路的关键环节
// 修改前请确认了解：登录流程、路由守卫、AuthContext 三者关系
// 关键约束：
//   - ROUTES.LOGIN 是 RequireAuth 拦截后的统一跳转目标
//   - 新增路由需同步更新 ROUTES 常量和 router/index.tsx 的渲染逻辑
//   - 路径变更需同步更新 LoginPage.tsx 中的 navigate() 调用
// ============================================================

/**
 * 路由配置
 */

import { lazy, Suspense } from 'react'
import type { RouteObject } from 'react-router-dom'

// ============================================================
// 路由路径常量
// ============================================================

export const ROUTES = {
  LOGIN: '/login',
  MEMBER_HOME: '/member',
  MEMBER_INTAKE: '/member/intake',
  MEMBER_EXERCISE: '/member/exercise',
  MEMBER_RECOGNIZE: '/member/recognize',
  MEMBER_BODY_DATA: '/member/body-data',
  MEMBER_PROFILE: '/member/profile',
  MEMBER_MESSAGES: '/member/messages',
  MEMBER_PLANS: '/member/plans',
  COACH_HOME: '/coach',
  COACH_MEMBERS: '/coach/members',
  COACH_MEMBER_DETAIL: '/coach/members/:memberId',
  COACH_WARNINGS: '/coach/warnings',
  COACH_PLANS: '/coach/plans',
  COACH_PROFILE: '/coach/profile',
} as const

// ============================================================
// 懒加载页面
// ============================================================

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function withSuspense(Component: React.ComponentType) {
  return (
    <Suspense fallback={<Loading />}>
      <Component />
    </Suspense>
  )
}

const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.default })))

// 会员端
const MemberHomePage = lazy(() => import('@/pages/member/HomePage').then(m => ({ default: m.HomePage })))
const IntakePage = lazy(() => import('@/pages/member/IntakePage').then(m => ({ default: m.IntakePage })))
const ExercisePage = lazy(() => import('@/pages/member/ExercisePage').then(m => ({ default: m.ExercisePage })))
const RecognizePage = lazy(() => import('@/pages/member/RecognizePage').then(m => ({ default: m.RecognizePage })))
const MyBodyDataPage = lazy(() => import('@/pages/member/MyBodyDataPage').then(m => ({ default: m.MyBodyDataPage })))
const MemberProfilePage = lazy(() => import('@/pages/member/MemberProfilePage').then(m => ({ default: m.MemberProfilePage })))
const MyPlansPage = lazy(() => import('@/pages/member/MyPlansPage').then(m => ({ default: m.MyPlansPage })))
const MemberMessagesPage = lazy(() => import('@/pages/member/MemberMessagesPage').then(m => ({ default: m.MemberMessagesPage })))

// 教练端
const CoachHomePage = lazy(() => import('@/pages/coach/HomePage').then(m => ({ default: m.HomePage })))
const CoachMemberListPage = lazy(() => import('@/pages/coach/CoachMemberListPage').then(m => ({ default: m.CoachMemberListPage })))
const CoachMemberDetailPage = lazy(() => import('@/pages/coach/CoachMemberDetailPage').then(m => ({ default: m.CoachMemberDetailPage })))
const WarningCenterPage = lazy(() => import('@/pages/coach/WarningCenterPage').then(m => ({ default: m.WarningCenterPage })))
const PlanLibraryPage = lazy(() => import('@/pages/coach/PlanLibraryPage').then(m => ({ default: m.PlanLibraryPage })))
const CoachProfilePage = lazy(() => import('@/pages/coach/CoachProfilePage').then(m => ({ default: m.CoachProfilePage })))
const NotificationCenterPage = lazy(() => import('@/pages/coach/NotificationCenterPage').then(m => ({ default: m.NotificationCenterPage })))

// ============================================================
// 路由定义
// ============================================================

export const routes: RouteObject[] = [
  { path: ROUTES.LOGIN, element: withSuspense(LoginPage) },

  // 会员端
  { path: '/member', element: withSuspense(MemberHomePage) },
  { path: '/member/intake', element: withSuspense(IntakePage) },
  { path: '/member/exercise', element: withSuspense(ExercisePage) },
  { path: '/member/recognize', element: withSuspense(RecognizePage) },
  { path: '/member/body-data', element: withSuspense(MyBodyDataPage) },
  { path: '/member/profile', element: withSuspense(MemberProfilePage) },
  { path: '/member/plans', element: withSuspense(MyPlansPage) },
  { path: '/member/messages', element: withSuspense(MemberMessagesPage) },

  // 教练端
  { path: '/coach', element: withSuspense(CoachHomePage) },
  { path: '/coach/members', element: withSuspense(CoachMemberListPage) },
  { path: '/coach/members/:memberId', element: withSuspense(CoachMemberDetailPage) },
  { path: '/coach/warnings', element: withSuspense(WarningCenterPage) },
  { path: '/coach/plans', element: withSuspense(PlanLibraryPage) },
  { path: '/coach/profile', element: withSuspense(CoachProfilePage) },
  { path: '/coach/notifications', element: withSuspense(NotificationCenterPage) },
]

// ============================================================
// 辅助函数
// ============================================================

export function isCoachPath(pathname: string): boolean {
  return pathname.startsWith('/coach')
}
