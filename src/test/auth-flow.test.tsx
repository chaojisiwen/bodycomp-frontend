import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom'
import React from 'react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ROUTES } from '@/router/routes'

// ============================================================
// 登录链路回归测试
// 这些测试保护登录核心链路，任何破坏登录流程的修改都会导致测试失败
// 修改前请确保全部测试通过
// ============================================================

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(AuthProvider, null, children)
  }
}

// 简化的 RequireAuth（复制自 router/index.tsx 的核心逻辑）
function TestRequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }
  return <>{children}</>
}

describe('🛡️ 登录链路回归测试', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // ── 测试 1: 未登录时 isAuthenticated 为 false ──
  it('未登录时，isAuthenticated 必须为 false', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  // ── 测试 2: login() 后 isAuthenticated 为 true ──
  it('调用 login() 后，isAuthenticated 必须为 true', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    act(() => {
      result.current.login({
        id: 'test_001',
        name: '测试用户',
        phone: '',
        role: 'member',
        coachId: '',
      })
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.id).toBe('test_001')
  })

  // ── 测试 3: logout() 后 isAuthenticated 为 false ──
  it('调用 logout() 后，isAuthenticated 必须为 false', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    act(() => {
      result.current.login({
        id: 'test_001',
        name: '测试用户',
        phone: '',
        role: 'member',
        coachId: '',
      })
    })

    act(() => {
      result.current.logout()
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  // ── 测试 4: 登录态持久化到 localStorage ──
  it('login() 必须将用户数据持久化到 localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    act(() => {
      result.current.login({
        id: 'persisted_user',
        name: '持久化用户',
        phone: '',
        role: 'coach',
        coachId: '',
      })
    })

    const stored = JSON.parse(localStorage.getItem('user') || '{}')
    expect(stored.id).toBe('persisted_user')
    expect(stored.role).toBe('coach')
  })

  // ── 测试 5: 刷新后从 localStorage 恢复登录态 ──
  it('从 localStorage 恢复后，isAuthenticated 必须为 true', () => {
    localStorage.setItem('user', JSON.stringify({
      id: 'restored_user',
      name: '恢复用户',
      phone: '',
      role: 'member',
      coachId: '',
    }))

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.id).toBe('restored_user')
  })

  // ── 测试 6: 路由守卫拦截未登录用户 ──
  it('未登录时访问受保护路由，必须被拦截到登录页', () => {
    render(
      <MemoryRouter initialEntries={['/member']}>
        <AuthProvider>
          <Routes>
            <Route path={ROUTES.LOGIN} element={<div data-testid="login-page">登录页</div>} />
            <Route
              path="/member"
              element={
                <TestRequireAuth>
                  <div data-testid="member-home">会员首页</div>
                </TestRequireAuth>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    )

    // 应该显示登录页，而不是会员首页
    expect(screen.queryByTestId('member-home')).not.toBeInTheDocument()
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  // ── 测试 7: 已登录用户可访问受保护路由 ──
  it('已登录时访问受保护路由，必须正常显示', () => {
    // 预置登录态
    localStorage.setItem('user', JSON.stringify({
      id: 'logged_in_user',
      name: '已登录用户',
      phone: '',
      role: 'member',
      coachId: '',
    }))

    render(
      <MemoryRouter initialEntries={['/member']}>
        <AuthProvider>
          <Routes>
            <Route path={ROUTES.LOGIN} element={<div data-testid="login-page">登录页</div>} />
            <Route
              path="/member"
              element={
                <TestRequireAuth>
                  <div data-testid="member-home">会员首页</div>
                </TestRequireAuth>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    )

    // 应该显示会员首页，而不是被拦截
    expect(screen.getByTestId('member-home')).toBeInTheDocument()
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
  })

  // ── 测试 8: localStorage key 必须为 'user' ──
  it('localStorage 必须使用 key = "user"', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    act(() => {
      result.current.login({
        id: 'key_test',
        name: '测试',
        phone: '',
        role: 'member',
        coachId: '',
      })
    })

    // 确认 key 是 'user' 而不是其他
    expect(localStorage.getItem('user')).toBeTruthy()
    expect(localStorage.getItem('auth_user')).toBeNull()
  })
})
