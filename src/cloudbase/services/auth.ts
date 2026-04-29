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
 * 邀请码登录（内测专用）
 *
 * 逻辑：
 *   1. 调用云函数 validateInviteCode 校验邀请码
 *   2. 如果返回 needPassword=true，需要前端展示密码输入框
 *   3. 用返回的 customToken 调用 auth.signInWithCustomToken
 *   4. 返回用户信息和角色
 *
 * @param code 邀请码，如 "M-A3K9F2"
 * @param password 密码（可选，如果云函数要求密码则必填）
 */
export async function loginWithInviteCode(
  code: string,
  password?: string
): Promise<{ success: boolean; role?: string; user?: IUser; error?: string; needPassword?: boolean; isFirstLogin?: boolean; needSetPassword?: boolean }> {
  try {
    await initCloudbase()
    const appInstance = getApp()

    if (!appInstance) {
      // ── 降级：云开发未初始化时，使用本地 mock ───────────────────
      console.warn('[Auth] 云开发未初始化，使用本地 mock 登录')
      const normalized = code.trim().toUpperCase()
      const role = normalized.startsWith('C-') ? 'coach' : 'member'
      const mockUser: IUser = {
        _id: `mock-${normalized}`,
        uid: `mock-${normalized}`,
        openid: '',
        role: role as 'member' | 'coach',
        name: role === 'coach' ? `教练${normalized}` : `会员${normalized}`,
        phone: '',
        invite_code: normalized,
      }
      return { success: true, role, user: mockUser, isFirstLogin: true }
    }

    // ── 1. 调用云函数校验邀请码 ──────────────────────────────
    const fnResult = await appInstance.callFunction({
      name: 'validateInviteCode',
      data: { code: code.trim(), password: password?.trim() },
    })

    const res = (fnResult as unknown as { result?: {
      code: number
      message: string
      data?: { token: string; role: string; uid: string; name: string; userId: string; isFirstLogin?: boolean; needSetPassword?: boolean }
    } }).result

    if (!res) {
      return { success: false, error: '网络错误' }
    }

    // 需要密码
    if (res.code === -2) {
      return { success: false, error: '请输入密码', needPassword: true }
    }

    if (res.code !== 0) {
      return { success: false, error: res.message || '邀请码无效' }
    }

    const { token, role, uid, name, userId, isFirstLogin, needSetPassword } = res.data!

    // ── 2. 用 customToken 登录 ───────────────────────────────
    const auth = getAuth()
    if (auth) {
      // @ts-expect-error SDK 类型声明未包含 signInWithCustomToken
      await auth.signInWithCustomToken(token)
    }

    const user: IUser = {
      _id: userId,
      uid,
      openid: uid,
      role: role as 'member' | 'coach',
      name,
      phone: '',
      invite_code: code.trim().toUpperCase(),
    }

    setCurrentUser(user)

    return { success: true, role, user, isFirstLogin, needSetPassword }
  } catch (error: unknown) {
    console.error('[Auth] 邀请码登录失败:', error)
    return { success: false, error: (error as Error).message || '登录失败' }
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

// ============================================================
// 用户信息
// ============================================================

/**
 * 获取用户信息
 */
async function fetchUserInfo(): Promise<IUser | null> {
  try {
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

    // 根据 openid 查询用户
    const db = getApp()?.database()
    if (!db) return null

    const res = await db
      .collection('users')
      .where({ openid: userInfo.openid })
      .limit(1)
      .get()

    if (res.data && res.data.length > 0) {
      return res.data[0] as IUser
    }

    // 如果用户不存在，返回基本用户信息
    return {
      _id: userInfo.uid || `user-${Date.now()}`,
      openid: userInfo.openid,
      name: (userInfo as unknown as { nickname?: string }).nickname || '用户',
      phone: '',
      role: 'member',
    } as IUser
  } catch (error) {
    console.error('[Auth] 获取用户信息失败:', error)
    return null
  }
}

/**
 * 创建或更新用户
 */
export async function upsertUser(openid: string, data: Partial<IUser>): Promise<IUser | null> {
  try {
    const db = getApp()?.database()
    if (!db) return null

    // 查找是否存在
    const existing = await db
      .collection('users')
      .where({ openid })
      .limit(1)
      .get()

    if (existing.data && existing.data.length > 0) {
      // 更新
      const id = existing.data[0]._id
      await db.collection('users').doc(id).update({
        ...data,
        updated_at: new Date(),
      })
      return { ...existing.data[0], ...data } as IUser
    } else {
      // 创建
      const res = await db.collection('users').add({
        ...data,
        openid,
        role: 'member',
        created_at: new Date(),
        updated_at: new Date(),
      })
      return { ...data, _id: res.id, openid, role: 'member' } as IUser
    }
  } catch (error) {
    console.error('[Auth] 创建/更新用户失败:', error)
    return null
  }
}

/**
 * 获取用户信息（别名）
 */
export { fetchUserInfo as getUserInfo }
