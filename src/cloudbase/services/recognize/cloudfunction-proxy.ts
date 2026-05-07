// ============================================================
// CloudBase 云函数 AI 代理
// 通过 CloudBase 云函数转发 AI 请求，解决 COS 上代理路径 404 的问题
// ============================================================

import { callCloudFunction } from '@/cloudbase'

/**
 * 通过 CloudBase 云函数调用腾讯混元 API
 * 替代直接 fetch('/api/hunyuan/...') 的方式
 */
export async function callHunyuanViaCloud(
  payload: Record<string, unknown>,
  apiKey: string
): Promise<Response> {
  const result = await callCloudFunction('aiProxy', {
    action: 'hunyuan',
    data: {
      payload,
      apiKey,
    },
  })

  if (!result || !result.success) {
    throw new Error(result?.error || 'AI 代理调用失败')
  }

  // 模拟 Response 对象，与原有 fetch API 兼容
  const responseData = result.data
  const body = JSON.stringify(responseData)

  return {
    ok: true,
    status: 200,
    json: async () => responseData,
    text: async () => body,
    headers: new Headers({ 'Content-Type': 'application/json' }),
  } as Response
}

/**
 * 判断是否需要使用云函数代理
 * COS/Vercel 等无代理环境需要，本地开发可以直接走 Vite proxy
 */
export function shouldUseCloudProxy(): boolean {
  const hostname = window.location.hostname
  // 本地开发有 Vite proxy，直接走 /api/hunyuan/...
  return hostname !== 'localhost' && hostname !== '127.0.0.1'
}
