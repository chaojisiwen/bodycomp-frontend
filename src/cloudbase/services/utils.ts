/**
 * 统一用户ID工具函数
 *
 * 替代各处散落的 `JSON.parse(localStorage.getItem('user') || '{}')` 写法。
 * 所有需要获取当前用户 ID 的地方，统一走这个函数。
 */

/**
 * 从 localStorage 读取当前登录用户 ID
 *
 * 兼容非 React 调用场景（Store / 工具函数等）。
 * 在 React 组件中优先使用 AuthContext 的 user.id。
 *
 * @returns 用户 ID 字符串，未登录返回空字符串
 */
export function getCurrentUserId(): string {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return user.id || ''
  } catch {
    return ''
  }
}
