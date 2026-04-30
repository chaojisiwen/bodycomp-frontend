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

// ============================================================
// 初始化函数
// ====================================

/**
 * 初始化云开发 SDK
 * 不会阻塞页面渲染，初始化失败时静默处理
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

  try {
    // 使用默认导入的 init 方法初始化
    app = cloudbase.init({
      env: finalConfig.envId,
      timeout: 10000,
    })

    isInitialized = true
    console.log('[CloudBase] ✅ 初始化成功，环境 ID:', finalConfig.envId)
    return true
  } catch (error) {
    console.error('[CloudBase] ⚠️ 初始化失败:', error)
    return false
  }
}

// ============================================================
// 获取实例
// ============================================================

/**
 * 获取云开发应用实例
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
// 云函数调用辅助函数 - 使用 fetch 直接调用 HTTP 触发器
// ============================================================

/**
 * 调用云函数
 * 使用 fetch 直接调用云函数的 HTTP 触发端点，绕过 SDK 的 callFunction bug
 *
 * @param name 云函数名称
 * @param data 传递给云函数的参数
 * @returns 云函数返回结果
 */
export async function callCloudFunction<T = any>(name: string, data?: Record<string, unknown>): Promise<T> {
  const appInstance = getApp()
  if (!appInstance) {
    throw new Error('CloudBase SDK 未初始化')
  }

  const finalConfig = CLOUDBASE_CONFIG
  const envId = finalConfig.envId

  // 云开发云函数 HTTP 触发 URL 格式
  // 注意：云函数需要开启 HTTP 触发
  const url = `https://${envId}.service.tcloudbase.com/${name}`

  // 准备纯净的 JSON 数据
  const requestData = data ? JSON.parse(JSON.stringify(data)) : {}

  console.log(`[CloudFunction] HTTP 调用: ${name}`, { url, data: requestData })

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[CloudFunction] HTTP 错误 ${response.status}:`, errorText)
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    console.log(`[CloudFunction] HTTP 返回:`, result)

    return result as T
  } catch (error) {
    console.error(`[CloudFunction] HTTP 调用失败，尝试 SDK fallback:`, error)

    // 如果 HTTP 调用失败（可能是云函数没开 HTTP 触发），回退到 SDK
    return callCloudFunctionSDKFallback<T>(name, data)
  }
}

/**
 * SDK callFunction 回退方案
 * 使用最简化的参数格式
 */
async function callCloudFunctionSDKFallback<T = any>(name: string, data?: Record<string, unknown>): Promise<T> {
  const appInstance = getApp()
  if (!appInstance) {
    throw new Error('CloudBase SDK 未初始化')
  }

  // 最简化的参数处理 - 只保留基本类型
  const cleanData: Record<string, unknown> = {}
  if (data && typeof data === 'object') {
    for (const key of Object.keys(data)) {
      const value = data[key]
      const type = typeof value
      if (type === 'string' || type === 'number' || type === 'boolean' || value === null) {
        cleanData[key] = value
      }
    }
  }

  console.log(`[CloudFunction] SDK fallback 调用: ${name}`, cleanData)

  try {
    const result = await appInstance.callFunction({
      name,
      data: cleanData,
    })

    console.log(`[CloudFunction] SDK fallback 返回:`, result)
    return (result as { result: T }).result
  } catch (error) {
    console.error(`[CloudFunction] SDK fallback 调用失败:`, error)
    throw error
  }
}

// ============================================================
// 导出配置
// ============================================================

export { CLOUDBASE_CONFIG, COLLECTIONS } from './config'
export type { UserRole } from './config'
export * from './types'
