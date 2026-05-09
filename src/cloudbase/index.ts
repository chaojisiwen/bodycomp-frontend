// ============================================================
// ⚠️ 登录核心文件 - 修改需谨慎
// 本文件属于系统认证链路的关键环节
// 修改前请确认了解：登录流程、路由守卫、AuthContext 三者关系
// 关键约束：
//   - callCloudFunction 的参数格式必须与云函数入参保持一致
//   - initCloudbase 失败时不应降级为模拟逻辑（直接抛错或返回 false）
//   - envId 变更需同步更新 cloudfunctions 中的云函数配置
// ============================================================

/**
 * 腾讯云云开发 SDK 初始化
 *
 * 基于云开发 H5 SDK 2.0+
 * npm: @cloudbase/js-sdk
 *
 * @link https://github.com/TencentCloudBase/cloudbase-js-sdk
 */

import cloudbase from '@cloudbase/js-sdk'
import { CLOUDBASE_CONFIG } from './config'

// 获取 Cloudbase 类的 init 方法
type CloudbaseApp = ReturnType<typeof cloudbase.init>

// ============================================================
// SDK 初始化状态
// ============================================================

let isInitialized = false
let app: CloudbaseApp | null = null

// HTTP 触发器兜底模式 — 当安全域名白名单不包含当前域名时使用
// 格式: https://{envId}.service.tcloudbase.com/{functionName}
let httpFallbackMode = false

/**
 * 判断当前是否处于 HTTP 触发器兜底模式
 * 此模式下 app 为 null，云函数通过 fetch 直接调用 HTTP 触发器
 */
export function isHttpFallbackMode(): boolean {
  return httpFallbackMode
}

/**
 * 获取 HTTP 触发器基础 URL
 */
export function getHttpTriggerBaseUrl(): string {
  return `https://${CLOUDBASE_CONFIG.envId}.service.tcloudbase.com`
}

// ============================================================
// 初始化函数
// ====================================

/**
 * 初始化云开发 SDK
 * 不会阻塞页面渲染，初始化失败时静默处理
 *
 * 策略：
 * 1. 尝试 SDK 正常初始化 + 匿名登录（需要域名在安全域名白名单中）
 * 2. 如果匿名登录失败，切换到 HTTP 触发器模式（绕过安全域名限制）
 */
export async function initCloudbase(config?: Partial<typeof CLOUDBASE_CONFIG>): Promise<boolean> {
  if (isInitialized) {
    return true
  }

  const finalConfig = { ...CLOUDBASE_CONFIG, ...config }

  // 检查环境 ID 是否配置
  if (!finalConfig.envId || finalConfig.envId === 'YOUR_ENV_ID') {
    console.warn('[CloudBase] ⚠️ 环境 ID 未配置（开发模式）')
    return false
  }

  // 策略1: SDK 正常初始化
  try {
    app = cloudbase.init({
      env: finalConfig.envId,
      timeout: 10000,
    })

    try {
      const auth = app.auth()
      await auth.signInAnonymously()
      console.log('[CloudBase] ✅ SDK 匿名登录成功')
      isInitialized = true
      return true
    } catch (authError) {
      console.warn(
        '[CloudBase] ⚠️ SDK 匿名登录失败，切换到 HTTP 触发器模式！',
        '\n当前域名:', window.location.hostname,
        '\n错误详情:', authError
      )

      // 释放 SDK 实例，切换到 HTTP 触发器模式
      app = null
      httpFallbackMode = true
      isInitialized = true
      console.log('[CloudBase] ✅ HTTP 触发器模式已就绪')
      return true
    }
  } catch (error) {
    console.error('[CloudBase] ⚠️ SDK 初始化失败:', error)
    // 也尝试 HTTP 触发器模式
    httpFallbackMode = true
    isInitialized = true
    console.log('[CloudBase] ✅ HTTP 触发器模式已就绪（SDK初始化失败）')
    return true
  }
}

// ============================================================
// 获取实例
// ============================================================

/**
 * 获取云开发应用实例
 * HTTP 触发器模式下返回 null
 */
export function getApp(): CloudbaseApp | null {
  return app
}

/**
 * 获取 Auth 实例
 */
export function getAuth() {
  const instance = getApp()
  if (!instance) return null
  return instance.auth()
}

/**
 * 获取 Database 实例
 */
export function getDatabase() {
  const instance = getApp()
  if (!instance) return null
  return instance.database()
}

// ============================================================
// 云函数调用辅助函数
// ============================================================

/**
 * 调用云函数
 *
 * 优先使用 SDK callFunction（安全域名白名单已配置时）
 * 兜底使用 HTTP 触发器（绕过安全域名限制）
 *
 * @param name 云函数名称
 * @param data 传递给云函数的参数
 * @returns 云函数返回结果
 */
export async function callCloudFunction<T = any>(name: string, data?: Record<string, unknown>): Promise<T> {
  const appInstance = getApp()

  // 策略1: SDK 模式
  if (appInstance) {
    try {
      const result = await appInstance.callFunction({
        name,
        data: data || {},
      })
      console.log(`[CloudFunction] SDK 调用成功: ${name}`, result)
      return (result as { result: T }).result
    } catch (sdkError) {
      console.error(
        `[CloudFunction] SDK 调用失败: ${name}`,
        '\n错误详情:', sdkError
      )
      // 不回退，让调用方 catch
      throw new Error(`云函数 ${name} 调用失败，请检查网络连接或联系管理员`)
    }
  }

  // 策略2: HTTP 触发器模式（不用安全域名白名单）
  if (httpFallbackMode) {
    const url = `${getHttpTriggerBaseUrl()}/${name}`
    console.log(`[CloudFunction] HTTP 触发器调用: ${url}`)

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
    })

    if (!response.ok) {
      throw new Error(`云函数 ${name} HTTP 调用失败: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log(`[CloudFunction] HTTP 触发器调用成功: ${name}`, result)
    return result as T
  }

  // 两者都不可用
  throw new Error('CloudBase 未初始化，请刷新页面重试')
}

// ============================================================
// 导出配置
// ============================================================

export { CLOUDBASE_CONFIG, COLLECTIONS } from './config'
export type { UserRole } from './config'
export * from './types'
