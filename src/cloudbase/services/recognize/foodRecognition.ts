// ============================================================
// 核心识别函数 - 路由分发器
// ============================================================

import type { FistCalibration, RecognizeResult } from './types'
import { AI_CONFIG, HUNYUAN_API_URL, HUNYUAN_MODEL } from './config'
export { AI_CONFIG, HUNYUAN_API_URL, HUNYUAN_MODEL }
import { recognizeWithHunyuan } from './hunyuan-recognition'
import { recognizeWithZhipu } from './zhipu-recognition'
import { recognizeWithGemini } from './gemini-recognition'
import { recognizeWithMock } from './mock-recognition'
import { recognizeWithBaidu } from './baidu-recognition'
import { recognizeWithVoting } from './voting-recognition'
import { recognizeWithOpenClaw } from './openclaw-recognition'

/**
 * 识别食物图片
 * @param imageBase64 图片 Base64 编码（不含 data:image/... 前缀）
 * @param imageUrl 可选，图片 URL
 * @param fistCalibration 可选，拳头校准数据（会作为参照物提升份量估算精度）
 * @returns 识别结果
 */
export async function recognizeFood(
  imageBase64?: string,
  imageUrl?: string,
  fistCalibration?: FistCalibration
): Promise<RecognizeResult> {
  console.log(`[AI Recognize] 模式: ${AI_CONFIG.mode}, 来源: ${imageUrl ? 'URL' : 'Base64'}, 拳头校准: ${fistCalibration ? `${fistCalibration.volumeMl}ml` : '无'}`)

  // OpenClaw 代理模式（通过自己的服务器调用混元，API Key 不暴露）
  if (AI_CONFIG.mode === 'openclaw') {
    return recognizeWithOpenClaw(imageBase64, imageUrl, fistCalibration)
  }
  // 多模型投票模式
  if (AI_CONFIG.mode === 'vote') {
    return recognizeWithVoting(imageBase64, imageUrl, fistCalibration)
  }
  if (AI_CONFIG.mode === 'gemini') {
    return recognizeWithGemini(imageBase64, imageUrl, fistCalibration)
  }
  if (AI_CONFIG.mode === 'hunyuan') {
    return recognizeWithHunyuan(imageBase64, imageUrl, fistCalibration)
  }
  if (AI_CONFIG.mode === 'zhipu') {
    return recognizeWithZhipu(imageBase64, imageUrl, fistCalibration)
  }
  if (AI_CONFIG.mode === 'baidu') {
    return recognizeWithBaidu(imageBase64, imageUrl, fistCalibration)
  }
  return recognizeWithMock(imageBase64)
}
