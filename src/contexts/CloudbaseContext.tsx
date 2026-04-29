/**
 * 云开发认证 Provider
 *
 * 将云开发 SDK 集成到现有的 AuthContext 中
 * 使用方式：在 AuthProvider 外层包裹
 */

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { initCloudbase } from '../cloudbase'
import {
  loginWithWechat,
  loginWithPhone,
  loginAnonymously,
  logout as cloudbaseLogout,
  setCurrentUser,
} from '../cloudbase/services'
import type { IUser } from '@/cloudbase/types'

interface CloudbaseContextType {
  isInitialized: boolean
  isConnecting: boolean
  error: string | null
  // 便捷方法
  loginWithWechat: (phone?: string, code?: string) => Promise<{ success: boolean; user?: IUser; error?: string; isH5?: boolean }>
  loginWithPhone: (phone: string, code: string) => Promise<{ success: boolean; user?: IUser; error?: string }>
  loginAnonymously: () => Promise<{ success: boolean; user?: IUser; error?: string }>
  logout: () => Promise<void>
}

const CloudbaseContext = createContext<CloudbaseContextType | undefined>(undefined)

export function CloudbaseProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 应用启动时初始化云开发
  useEffect(() => {
    const init = async () => {
      try {
        const success = await initCloudbase()
        setIsInitialized(success)
        if (!success) {
          setError('云开发未配置，请检查 envId')
        }
      } catch (err: any) {
        console.error('[Cloudbase] 初始化失败:', err)
        setError(err.message || '初始化失败')
      }
    }
    init()
  }, [])

  // 微信登录
  const handleLoginWithWechat = useCallback(async () => {
    setIsConnecting(true)
    setError(null)
    try {
      const result = await loginWithWechat()
      if (!result.success) {
        setError(result.error || '微信登录失败')
      }
      return result
    } catch (err: any) {
      const errorMsg = err.message || '微信登录失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setIsConnecting(false)
    }
  }, [])

  // 手机号登录
  const handleLoginWithPhone = useCallback(async (phone: string, code: string) => {
    setIsConnecting(true)
    setError(null)
    try {
      const result = await loginWithPhone(phone, code)
      if (!result.success) {
        setError(result.error || '手机号登录失败')
      }
      return result
    } catch (err: any) {
      const errorMsg = err.message || '手机号登录失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setIsConnecting(false)
    }
  }, [])

  // 匿名登录（开发调试用）
  const handleLoginAnonymously = useCallback(async () => {
    setIsConnecting(true)
    setError(null)
    try {
      const result = await loginAnonymously()
      if (!result.success) {
        setError(result.error || '匿名登录失败')
      }
      return result
    } catch (err: any) {
      const errorMsg = err.message || '匿名登录失败'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setIsConnecting(false)
    }
  }, [])

  // 登出
  const handleLogout = useCallback(async () => {
    try {
      await cloudbaseLogout()
      setCurrentUser(null)
    } catch (err) {
      console.error('[Cloudbase] 登出失败:', err)
    }
  }, [])

  const value: CloudbaseContextType = {
    isInitialized,
    isConnecting,
    error,
    loginWithWechat: handleLoginWithWechat,
    loginWithPhone: handleLoginWithPhone,
    loginAnonymously: handleLoginAnonymously,
    logout: handleLogout,
  }

  return (
    <CloudbaseContext.Provider value={value}>
      {children}
    </CloudbaseContext.Provider>
  )
}

// 未初始化时的安全默认值（开发环境或未配置云开发时使用）
const defaultCloudbase: CloudbaseContextType = {
  isInitialized: false,
  isConnecting: false,
  error: '云开发未配置',
  loginWithWechat: async () => ({ success: false, error: '云开发未配置', isH5: true }),
  loginWithPhone: async () => ({ success: false, error: '云开发未配置' }),
  loginAnonymously: async () => ({ success: false, error: '云开发未配置' }),
  logout: async () => {},
}

export function useCloudbase() {
  const context = useContext(CloudbaseContext)
  // 不再抛出错误，而是返回安全默认值，避免阻断页面渲染
  return context ?? defaultCloudbase
}
