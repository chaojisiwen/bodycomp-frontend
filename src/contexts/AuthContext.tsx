// ============================================================
// ⚠️ 登录核心文件 - 修改需谨慎
// 本文件属于系统认证链路的关键环节
// 修改前请确认了解：登录流程、路由守卫、AuthContext 三者关系
// 关键约束：
//   - localStorage key 必须为 'user'（修改需同步更新所有读取点）
//   - User 接口字段变更需同步更新 LoginPage.tsx 的 finishLogin()
//   - isAuthenticated = !!user 是路由守卫的唯一判断依据
//   - logout() 必须清理所有 Zustand persist store 缓存
// ============================================================

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { setCurrentUser } from '@/cloudbase/services/auth'
import { useProfileStore } from '@/stores/profileStore'

interface User {
  id: string
  name: string
  phone: string
  role: 'member' | 'coach'
  avatar?: string
  coachId?: string  // 会员专属：绑定的教练ID
  inviteCode?: string  // 登录时使用的邀请码
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (user: User) => void
  logout: () => void
  switchRole: (role: 'member' | 'coach') => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * 清理所有可能残留的 Zustand persist store
 * 防止 A 用户数据残留到 B 用户
 */
function cleanupPersistedStores() {
  const keys = [
    'profile-store',
    'plan-store',
    'notification-store',
    'meal-store',
    'exercise-store',
    'body-store',
    'recognize-store',
    'assigned-plan-store',
    'warning-store',
    'coach-profile-store',
  ]
  keys.forEach(key => {
    try { localStorage.removeItem(key) } catch { /* 静默 */ }
  })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // 从 localStorage 恢复登录状态
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })

  useEffect(() => {
    // 持久化登录状态
    if (user) {
      localStorage.setItem('user', JSON.stringify(user))
    } else {
      localStorage.removeItem('user')
    }
  }, [user])

  // ── 同步到 auth.ts 模块变量 ──────────────────────────────
  // 关键：bindCoach / updateCoachProfile 等 CloudBase 操作
  // 通过 getCurrentUser() 读取模块变量，必须与 AuthContext 同步
  useEffect(() => {
    if (user) {
      setCurrentUser({
        _id: user.id,
        uid: user.id,
        role: user.role,
        name: user.name,
        phone: user.phone || '',
        ...(user.coachId ? { coach_id: user.coachId } : {}),
        ...(user.inviteCode ? { invite_code: user.inviteCode } : {}),
      })
    } else {
      setCurrentUser(null)
    }
  }, [user])

  const login = (userData: User) => {
    setUser(userData)
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
    // 清理所有 Zustand persist store，防止跨用户数据残留
    cleanupPersistedStores()
    // 重置 profileStore 内存状态
    useProfileStore.getState().reset()
  }

  const switchRole = (role: 'member' | 'coach') => {
    if (user) {
      setUser({ ...user, role })
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
