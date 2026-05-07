import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import React from 'react'

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(AuthProvider, null, children)
  }
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('未登录时 user 为 null', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('login 应设置 user 并持久化到 localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    const testUser = {
      id: 'test_user_001',
      name: '测试用户',
      phone: '138****8888',
      role: 'member' as const,
    }

    act(() => {
      result.current.login(testUser)
    })

    expect(result.current.user).toEqual(testUser)
    expect(result.current.isAuthenticated).toBe(true)

    // 验证 localStorage 持久化
    const stored = JSON.parse(localStorage.getItem('user') || '{}')
    expect(stored.id).toBe('test_user_001')
  })

  it('logout 应清除 user', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    act(() => {
      result.current.login({
        id: 'test_user_001',
        name: '测试',
        phone: '',
        role: 'member',
      })
    })

    act(() => {
      result.current.logout()
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(localStorage.getItem('user')).toBeNull()
  })

  it('switchRole 应切换角色', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

    act(() => {
      result.current.login({
        id: 'test_user_001',
        name: '测试',
        phone: '',
        role: 'member',
      })
    })

    act(() => {
      result.current.switchRole('coach')
    })

    expect(result.current.user?.role).toBe('coach')
  })

  it('应能从 localStorage 恢复登录状态', () => {
    localStorage.setItem('user', JSON.stringify({
      id: 'stored_user',
      name: '已登录用户',
      phone: '',
      role: 'member',
    }))

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })
    expect(result.current.user?.id).toBe('stored_user')
    expect(result.current.isAuthenticated).toBe(true)
  })
})
