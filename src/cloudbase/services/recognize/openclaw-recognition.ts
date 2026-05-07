// ============================================================
// OpenClaw 代理模式（通过自己的服务器调用混元，API Key 不暴露）
// ============================================================

import type { RecognizedFoodItem, RecognizeResult, FistCalibration } from './types'
import { compressImage } from './imageUtils'
import { AI_CONFIG } from './config'

/**
 * 使用 OpenClaw 代理识别食物
 *
 * 流程：前端 → OpenClaw 服务器 → 腾讯云混元视觉 API
 * 优势：API Key 在服务器端，不暴露；服务器端可优化 Prompt 和后处理
 */
export async function recognizeWithOpenClaw(
  imageBase64?: string,
  imageUrl?: string,
  fistCalibration?: FistCalibration
): Promise<RecognizeResult> {
  const apiUrl = AI_CONFIG.openclawUrl
  if (!apiUrl) {
    return { success: false, foods: [], error: '未配置 OpenClaw API 地址（VITE_OPENCLAW_API_URL）' }
  }

  try {
    // 获取图片 base64
    let base64 = imageBase64
    if (!base64 && imageUrl) {
      const res = await fetch(imageUrl)
      const blob = await res.blob()
      const arr = await blob.arrayBuffer()
      base64 = btoa(String.fromCharCode(...new Uint8Array(arr)))
    }
    if (!base64) throw new Error('没有提供图片')

    // 压缩图片
    base64 = await compressImage(base64, 3000)

    const payload = {
      image: `data:image/jpeg;base64,${base64}`,
      ...(fistCalibration ? { fistCalibration } : {}),
    }

    console.log('[AI/OpenClaw] 正在调用 OpenClaw 服务器...', apiUrl)

    const response = await fetch(`${apiUrl}/api/recognize-food`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('[AI/OpenClaw] 请求失败:', response.status, errText)
      throw new Error(`OpenClaw 识别失败: ${response.status}`)
    }

    const data = await response.json()
    console.log('[AI/OpenClaw] 原始响应:', JSON.stringify(data))

    if (!data.success) {
      throw new Error(data.error || 'OpenClaw 识别失败')
    }

    const foods: RecognizedFoodItem[] = (data.foods || []).map((f: any) => ({
      name: f.name || '未知食物',
      protein: Number(f.protein) || 0,
      fat: Number(f.fat) || 0,
      carbs: Number(f.carbs) || 0,
      calories: Math.round((Number(f.protein) || 0) * 4 + (Number(f.fat) || 0) * 9 + (Number(f.carbs) || 0) * 4) || 100,
      weight: Number(f.weight) || 100,
      confidence: Number(f.confidence) || 0.8,
      cookingMethod: f.cookingMethod || f.cooking_method || '',
    }))

    if (foods.length === 0) {
      throw new Error('未识别到食物，请重试')
    }

    console.log('[AI/OpenClaw] 识别成功:', foods)
    return {
      success: true,
      foods,
      analysis: data.analysis,
    }
  } catch (error) {
    console.error('[AI/OpenClaw] 识别失败:', error)
    return {
      success: false,
      foods: [],
      error: error instanceof Error ? error.message : 'OpenClaw 识别失败，请重试',
    }
  }
}
