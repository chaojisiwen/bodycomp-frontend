/**
 * 腾讯云云开发 SDK 初始化
 *
 * 基于云开发 H5 SDK 2.0+
 * npm: @cloudbase/js-sdk
 *
 * @link https://github.com/TencentCloudBase/cloudbase-js-sdk
 */

import * as cloudbaseModule from '@cloudbase/js-sdk'
import { CLOUDBASE_CONFIG } from './config'

// 获取 Cloudbase 类的 init 方法
type CloudbaseApp = ReturnType<typeof cloudbaseModule.init>
const CloudbaseClass = (cloudbaseModule as unknown as { default: { init: typeof cloudbaseModule.init } }).default || cloudbaseModule

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
    // 使用静态 init 方法初始化
    app = CloudbaseClass.init({
      env: finalConfig.envId,
      timeout: 10000,
    } as Parameters<typeof CloudbaseClass.init>[0])

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
// 导出配置
// ============================================================

export { CLOUDBASE_CONFIG, COLLECTIONS } from './config'
export type { UserRole } from './config'
export * from './types'
