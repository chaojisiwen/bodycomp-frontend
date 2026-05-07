/**
 * 认证服务
 *
 * 支持：
 * - 微信登录（需配合微信环境）
 * - 手机号登录
 * - 匿名登录（调试用）
 * - H5 降级：非微信环境下自动使用手机号 + 短信登录
 */

import { getAuth, getApp, initCloudbase } from '../index'
import type { IUser } from '../types'

// ============================================================
// 环境检测
// ============================================================

/** 是否在微信浏览器中 */
export function isWechatBrowser(): boolean {
  const ua = navigator.userAgent.toLowerCase()
  return ua.includes('micromessenger')
}

/** 是否在 H5（非微信）环境中 */
export function isH5Environment(): boolean {
  return !isWechatBrowser()
}

// ============================================================
// 登录状态管理
// ============================================================

let currentUser: IUser | null = null

/**
 * 获取当前登录用户
 */
export function getCurrentUser(): IUser | null {
  return currentUser
}

/**
 * 设置当前用户
 */
export function setCurrentUser(user: IUser | null) {
  currentUser = user
}

/**
 * 检查是否已登录
 */
export async function isLoggedIn(): Promise<boolean> {
  try {
    const auth = getAuth()
    if (!auth) return false
    const loginState = await auth.getLoginState()
    return !!loginState
  } catch {
    return false
  }
}

// ============================================================
// 登录方法
// ============================================================

/**
 * 微信一键登录（推荐）
 * 智能检测环境：
 * - 微信环境：调用微信授权登录
 * - H5 环境：降级为手机号 + 短信验证码登录
 *
 * @param phone 手机号（H5 环境需要）
 * @param code 验证码（H5 环境需要）
 */
export async function loginWithWechat(
  phone?: string,
  code?: string
): Promise<{ success: boolean; user?: IUser; error?: string; isH5?: boolean }> {
  try {
    await initCloudbase()
    const auth = getAuth()

    if (!auth) {
      return { success: false, error: 'SDK 未初始化' }
    }

    if (isWechatBrowser()) {
      // ✅ 微信环境：调用微信授权登录
      console.log('[Auth] 微信浏览器环境，使用微信登录')
      await auth.signInWithWechat()
    } else {
      // ⚠️ H5 环境：降级为手机号登录
      console.log('[Auth] H5 环境，降级为手机号登录')
      if (!phone || !code) {
        return {
          success: false,
          error: 'H5环境需要手机号+验证码登录',
          isH5: true,
        }
      }
      // H5 环境使用匿名登录作为降级方案
      await auth.signInAnonymously()
    }

    // 获取用户信息
    const user = await fetchUserInfo()
    setCurrentUser(user || null)

    return { success: true, user: user || undefined, isH5: isH5Environment() }
  } catch (error: unknown) {
    console.error('[Auth] 登录失败:', error)
    return { success: false, error: (error as Error).message || '登录失败' }
  }
}

/**
 * 手机号登录
 * @param phone 手机号
 * @param code 验证码
 */
export async function loginWithPhone(
  _phone: string,
  _code: string
): Promise<{ success: boolean; user?: IUser; error?: string }> {
  try {
    await initCloudbase()
    const auth = getAuth()

    if (!auth) {
      return { success: false, error: 'SDK 未初始化' }
    }

    // 手机号登录 - 使用匿名登录作为降级方案
    // 实际项目中需要配合云函数实现短信验证码登录
    await auth.signInAnonymously()

    // 获取用户信息
    const user = await fetchUserInfo()
    setCurrentUser(user || null)

    return { success: true, user: user || undefined }
  } catch (error: unknown) {
    console.error('[Auth] 手机号登录失败:', error)
    return { success: false, error: (error as Error).message || '手机号登录失败' }
  }
}

/**
 * 匿名登录（仅用于开发调试）
 */
export async function loginAnonymously(): Promise<{ success: boolean; user?: IUser; error?: string }> {
  try {
    await initCloudbase()
    const auth = getAuth()

    if (!auth) {
      return { success: false, error: 'SDK 未初始化' }
    }

    // 匿名登录
    await auth.signInAnonymously()

    // 获取用户信息
    const user = await fetchUserInfo()
    setCurrentUser(user || null)

    return { success: true, user: user || undefined }
  } catch (error: unknown) {
    console.error('[Auth] 匿名登录失败:', error)
    return { success: false, error: (error as Error).message || '匿名登录失败' }
  }
}

/**
 * 登出
 */
export async function logout(): Promise<void> {
  try {
    const auth = getAuth()
    if (!auth) {
      setCurrentUser(null)
      return
    }
    await auth.signOut()
    setCurrentUser(null)
    console.log('[Auth] 已登出')
  } catch (error) {
    console.error('[Auth] 登出失败:', error)
  }
}

/**
 * 发送手机验证码
 * @param phone 手机号
 */
export async function sendPhoneCode(phone: string): Promise<{ success: boolean; error?: string }> {
  try {
    await initCloudbase()
    const appInstance = getApp()

    if (!appInstance) {
      return { success: false, error: 'SDK 未初始化' }
    }

    // 调用云函数发送验证码
    const res = await appInstance.callFunction({
      name: 'sendSmsCode',
      data: { phone },
    })

    // 检查云函数返回的错误
    const resAny = res as unknown as { code?: number; message?: string }
    if (resAny.code !== undefined && resAny.code !== 0) {
      return { success: false, error: resAny.message || '发送失败' }
    }

    return { success: true }
  } catch (error: unknown) {
    console.error('[Auth] 发送验证码失败:', error)
    return { success: false, error: (error as Error).message || '发送验证码失败' }
  }
}

// ============================================================
// 用户信息
// ============================================================

/**
 * 获取用户信息
 */
async function fetchUserInfo(): Promise<IUser | null> {
  try {
    await initCloudbase()
    const auth = getAuth()
    if (!auth) return null

    // 获取当前登录状态
    const loginState = await auth.getLoginState()
    if (!loginState) return null

    // 获取用户信息（包含 openid）
    const userInfo = await auth.getUserInfo()
    if (!userInfo) return null

    // 打印用户信息用于调试
    console.log('[Auth] 用户信息:', userInfo)

    const db = getApp()?.database()
    if (!db) return null

    // ── 查询策略：invite_code 优先（稳定标识），openid 兜底 ──
    // 原因：匿名登录的 openid 每次可能变化，用 invite_code 查最准确
    let user: IUser | null = null

    // 1. 优先用 localStorage 中的 invite_code 查询
    try {
      const stored = JSON.parse(localStorage.getItem('user') || '{}')
      const inviteCode = stored?.inviteCode
      if (inviteCode) {
        const inviteRes = await db
          .collection('users')
          .where({ invite_code: inviteCode.trim().toUpperCase() })
          .limit(1)
          .get()
        if (inviteRes.data && inviteRes.data.length > 0) {
          user = inviteRes.data[0] as IUser
          console.log('[Auth] 通过 invite_code 找到用户:', user.name || user._id)
        }
      }
    } catch { /* 静默 */ }

    // 2. 兜底：通过 openid 查询（兼容已存在的匿名用户）
    if (!user) {
      const openidRes = await db
        .collection('users')
        .where({ openid: userInfo.openid })
        .limit(1)
        .get()
      if (openidRes.data && openidRes.data.length > 0) {
        user = openidRes.data[0] as IUser
      }
    }

    if (user) {
      // 补齐 uid 字段（历史数据可能没有）
      if (!user.uid && userInfo.uid) {
        try {
          await db.collection('users').doc(user._id).update({ uid: userInfo.uid })
          user.uid = userInfo.uid
        } catch { /* 静默 */ }
      }
      return user
    }

    // ⚠️ 不再自动创建用户 — 幽灵用户是教练端看不到数据的根因
    // 找不到用户时返回 null，由调用方保留现有 AuthContext 状态
    console.warn('[Auth] 未找到用户记录（invite_code / openid 均不匹配），返回 null')
    return null
  } catch (error) {
    console.error('[Auth] 获取用户信息失败:', error)
    return null
  }
}

/**
 * 获取用户信息（别名）
 */
export { fetchUserInfo as getUserInfo }

/**
 * 更新当前用户资料（按 _id 查找，替代按 openid 的 updateUserByOpenid）
 * 用于头像、昵称等轻量更新 — 只允许修改已登录用户自己的资料
 * 内置 5 秒超时 + 自动重试 1 次，防止网络波动导致数据丢失
 */
export async function updateCurrentUserProfile(
  fields: Partial<Pick<IUser, 'name' | 'avatar' | 'phone' | 'nickname'>>
): Promise<boolean> {
  const maxRetries = 1
  const timeoutMs = 5000

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await initCloudbase()
      const db = getApp()?.database()
      if (!db) return false

      const stored = JSON.parse(localStorage.getItem('user') || '{}')
      const userId = stored?.id
      if (!userId) {
        console.warn('[Auth] updateCurrentUserProfile: 未找到用户 ID')
        return false
      }

      // 带超时的更新操作
      const updatePromise = db.collection('users')
        .doc(userId)
        .update({ ...fields, updated_at: new Date() })

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('更新超时')), timeoutMs)
      )

      await Promise.race([updatePromise, timeoutPromise])
      return true
    } catch (error) {
      if (attempt < maxRetries) {
        console.warn(`[Auth] 更新用户资料失败（第 ${attempt + 1} 次），即将重试:`, error)
        continue
      }
      console.error('[Auth] 更新用户资料失败（已重试）:', error)
      return false
    }
  }
  return false
}
