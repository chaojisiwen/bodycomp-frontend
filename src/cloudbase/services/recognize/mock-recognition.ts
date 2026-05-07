// ============================================================
// Mock 模式（开发/未配置时使用）
// ============================================================

import type { RecognizeResult, FistCalibration } from './types'

/**
 * 模拟食物识别（用于开发测试）
 */
export async function recognizeWithMock(_imageBase64?: string, _fistCalibration?: FistCalibration): Promise<RecognizeResult> {
  console.warn('[AI] 当前为 Mock 模式，请配置 VITE_TENCENT_SECRET_KEY 启用真正的 AI 识别')

  // 模拟网络延迟
  await new Promise((resolve) => setTimeout(resolve, 1500))

  return {
    success: true,
    foods: [],
    isMock: true,
    error: 'Mock 模式：未配置 API Key',
  }
}
