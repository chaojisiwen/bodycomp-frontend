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

    // 关键修复：先做匿名登录，否则 callFunction 会报 scope null 错误
    // 注意：如果部署域名不在腾讯云「安全域名」白名单中，匿名登录会失败
    try {
      const auth = app.auth()
      await auth.signInAnonymously()
      console.log('[CloudBase] ✅ 匿名登录成功')
    } catch (authError) {
      console.warn(
        '[CloudBase] ⚠️ 匿名登录失败！',
        '\n当前域名:',
        window.location.hostname,
        '\n可能原因：当前域名未加入腾讯云安全域名白名单。',
        '\n请在腾讯云云开发控制台 → 安全配置 → 安全域名中添加:',
        window.location.hostname,
        '\n错误详情:',
        authError
      )

      // 非 DEV 环境：匿名登录失败意味着后续所有 CloudBase 操作均不可用
      // 必须阻断初始化，让调用方明确知道失败原因
      if (!import.meta.env.DEV) {
        console.warn('[CloudBase] ⚠️ 生产环境匿名登录失败，降级到 Mock 模式')
        isInitialized = true // 标记已尝试，避免重复
        return false
      }
      // DEV 环境：继续执行（允许本地调试时跳过匿名登录）
      console.warn('[CloudBase] DEV 环境，跳过匿名登录继续初始化')
    }

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
 * 通过 SDK callFunction 调用云函数
 *
 * 注意：需要 initCloudbase 先完成（含匿名登录），否则会因 scope 问题失败。
 * 如果部署域名不在腾讯云安全域名白名单中，匿名登录会失败，导致 callFunction 也不可用。
 *
 * @param name 云函数名称
 * @param data 传递给云函数的参数
 * @returns 云函数返回结果（已解包 result 字段）
 */
export async function callCloudFunction<T = any>(name: string, data?: Record<string, unknown>): Promise<T> {
  const appInstance = getApp()
  if (!appInstance) {
    throw new Error('CloudBase SDK 未初始化，请检查环境配置或刷新页面重试')
  }

  try {
    const result = await appInstance.callFunction({
      name,
      data: data || {},
    })
    console.log(`[CloudFunction] 调用成功: ${name}`, result)
    return (result as { result: T }).result
  } catch (sdkError) {
    console.error(
      `[CloudFunction] 调用失败: ${name}`,
      '\n可能原因：',
      '\n1. 当前域名未加入腾讯云安全域名白名单',
      '\n2. 云函数未部署或已删除',
      '\n3. 网络连接异常',
      '\n错误详情:',
      sdkError
    )
    throw new Error(`云函数 ${name} 调用失败，请检查网络连接或联系管理员`)
  }
}

// ============================================================
// 导出配置
// ============================================================

export { CLOUDBASE_CONFIG, COLLECTIONS } from './config'
export type { UserRole } from './config'
export * from './types'
