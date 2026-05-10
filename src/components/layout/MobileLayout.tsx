/**
 * 移动端布局组件
 *
 * 包含：
 * - 顶部导航栏
 * - 底部 Tab 导航
 * - URL 同步（react-router-dom）
 */

import { Home, UtensilsCrossed, Flame, BarChart3, Users, AlertTriangle, ClipboardList, UserCircle } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useNotificationStore } from '@/stores/notificationStore'
import type { LucideIcon } from 'lucide-react'

// 根据路径判断角色
function getRoleFromPath(pathname: string): 'member' | 'coach' {
  return pathname.startsWith('/coach') ? 'coach' : 'member'
}

// Tab 类型定义
interface TabItem {
  id: string
  label: string
  icon: LucideIcon
  path: string
  badge?: number
}

// 会员端 Tab 配置
const memberTabs: TabItem[] = [
  { id: 'home', label: '首页', icon: Home, path: '/member' },
  { id: 'intake', label: '摄入', icon: UtensilsCrossed, path: '/member/intake' },
  { id: 'exercise', label: '消耗', icon: Flame, path: '/member/exercise' },
  { id: 'bodyData', label: '数据', icon: BarChart3, path: '/member/body-data' },
]

// 教练端 Tab 配置（badge 动态设置）
const coachTabConfigs: Omit<TabItem, 'badge'>[] = [
  { id: 'home', label: '首页', icon: Home, path: '/coach' },
  { id: 'members', label: '会员', icon: Users, path: '/coach/members' },
  { id: 'plans', label: '方案库', icon: ClipboardList, path: '/coach/plans' },
  { id: 'warnings', label: '预警', icon: AlertTriangle, path: '/coach/warnings' },
]

// 根据路径获取当前 Tab
function getCurrentTab(pathname: string, tabs: TabItem[]): string {
  // 精确匹配
  const exactMatch = tabs.find(tab => tab.path === pathname)
  if (exactMatch) return exactMatch.id

  // 前缀匹配（用于子页面）
  const prefixMatch = tabs.find(tab => pathname.startsWith(tab.path) && tab.path !== '/member' && tab.path !== '/coach')
  if (prefixMatch) return prefixMatch.id

  return 'home'
}

export function MobileLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { switchRole } = useAuth()
  const { unreadCount } = useNotificationStore()

  // 优先使用 URL 路径判断角色（更可靠）
  const role = getRoleFromPath(location.pathname)

  // 动态构建 tabs
  // 会员端：消息 Tab 显示未读消息数 badge
  // 教练端：预警 Tab 显示未读消息数 badge
  const baseTabs = role === 'member' ? memberTabs : coachTabConfigs.map(t => ({ ...t }))
  const tabs: TabItem[] = baseTabs.map(tab => {
    if (role === 'member' && tab.id === 'messages') {
      return { ...tab, badge: unreadCount }
    }
    if (role === 'coach' && tab.id === 'warnings') {
      return { ...tab, badge: unreadCount }
    }
    return tab
  })

  const currentTab = getCurrentTab(location.pathname, tabs)

  const handleTabChange = (tab: typeof memberTabs[0]) => {
    navigate(tab.path)
  }

  const handleProfileClick = () => {
    navigate(role === 'coach' ? '/coach/profile' : '/member/profile')
  }

  const handleSwitchRole = () => {
    const newRole = role === 'member' ? 'coach' : 'member'
    // 同时更新 user.role 和导航
    switchRole(newRole)
    navigate(newRole === 'coach' ? '/coach' : '/member')
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">Equilibrio</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Profile Icon */}
            <button
              onClick={handleProfileClick}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-emerald-400 transition-colors"
              title="个人设置"
            >
              <UserCircle className="w-6 h-6" />
            </button>
            {/* [TEST ONLY] Role Toggle */}
            {import.meta.env.DEV && (
              <button
                onClick={handleSwitchRole}
                className="px-2 py-1 text-xs bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 rounded"
              >
                切换
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-4">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-lg border-t border-white/10">
        <div className="flex justify-around items-center h-16">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = currentTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab)}
                className={`flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors relative ${
                  isActive ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span className={`text-[10px] ${isActive ? 'font-medium' : ''}`}>
                  {tab.label}
                </span>
                {isActive ? (
                  <div className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-400" />
                ) : tab.badge ? (
                  <div className="absolute top-1 right-2 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </div>
                ) : null}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
