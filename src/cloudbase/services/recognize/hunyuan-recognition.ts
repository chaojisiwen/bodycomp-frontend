// ============================================================
// 腾讯云混元视觉 API
// ============================================================

import type { RecognizedFoodItem, RecognizeResult, RecognizeAnalysis, FistCalibration } from './types'
import { buildFoodPrompt } from './prompts'
import { AI_CONFIG, HUNYUAN_MODEL, HUNYUAN_API_URL } from './config'
import { callHunyuanViaCloud, shouldUseCloudProxy } from './cloudfunction-proxy'

/**
 * 使用腾讯云混元多模态 API 识别食物
 */
export async function recognizeWithHunyuan(
  imageBase64?: string,
  imageUrl?: string,
  fistCalibration?: FistCalibration
): Promise<RecognizeResult> {
  const apiKey = AI_CONFIG.secretKey
  if (!apiKey || apiKey === 'your_api_key_here') {
    console.error('[AI] 腾讯云 API Key 未配置！')
    console.error('[AI] 请在 .env 文件中设置 VITE_TENCENT_SECRET_KEY')
    console.error('[AI] 获取地址：https://console.cloud.tencent.com/hunyuan/start')
    return {
      success: false,
      foods: [],
      error: '未配置腾讯云 API Key，无法进行 AI 识别',
    }
  }

  try {
    // 构建图片内容
    let imageUrlData: string
    if (imageBase64) {
      imageUrlData = `data:image/jpeg;base64,${imageBase64}`
    } else if (imageUrl) {
      imageUrlData = imageUrl
    } else {
      throw new Error('没有提供图片')
    }

    // 构建请求体
    const payload = {
      model: HUNYUAN_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: buildFoodPrompt(fistCalibration),
            },
            {
              type: 'image_url',
              image_url: { url: imageUrlData }
            },
          ],
        },
      ],
    }

    console.log('[AI/Hunyuan] 正在调用腾讯云混元视觉 API...')

    // 调用混元 API（COS 环境走云函数代理，本地走 Vite 代理）
    const response = shouldUseCloudProxy()
      ? await callHunyuanViaCloud(payload, apiKey)
      : await fetch(HUNYUAN_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apiKey,
          },
          body: JSON.stringify(payload),
        })

    if (!response.ok) {
      const errText = await response.text()
      console.error('[AI/Hunyuan] API 错误:', response.status, errText)
      throw new Error(`混元 API 请求失败: ${response.status}`)
    }

    const data = await response.json()
    console.log('[AI/Hunyuan] 原始响应:', JSON.stringify(data))

    // 解析响应内容
    const content = data.choices?.[0]?.message?.content || ''

    // 提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[AI/Hunyuan] 无法解析识别结果，原始内容:', content)
      throw new Error('无法解析识别结果')
    }

    const parsed = JSON.parse(jsonMatch[0])

    if (!parsed.foods || !Array.isArray(parsed.foods) || parsed.foods.length === 0) {
      console.error('[AI/Hunyuan] 识别结果为空:', parsed)
      throw new Error('未识别到食物，请重试')
    }

    const foods: RecognizedFoodItem[] = parsed.foods.map((f: Partial<RecognizedFoodItem>) => ({
      name: f.name || '未知食物',
      protein: Number(f.protein) || 0,
      fat: Number(f.fat) || 0,
      carbs: Number(f.carbs) || 0,
      // 前端兜底：热量严格等于 protein×4 + fat×9 + carbs×4
      calories: Math.round((Number(f.protein) || 0) * 4 + (Number(f.fat) || 0) * 9 + (Number(f.carbs) || 0) * 4) || 100,
      weight: Number(f.weight) || 100,
      confidence: Number(f.confidence) || 0.8,
      cookingMethod: f.cookingMethod || '',
    }))

    // 提取分析报告
    const analysis: RecognizeAnalysis | undefined = parsed.analysis ? {
      mealType: parsed.analysis.meal_type || parsed.analysis.mealType || '',
      mealCategory: parsed.analysis.meal_category || parsed.analysis.mealCategory || '',
      ingredientBreakdown: Array.isArray(parsed.analysis.ingredient_breakdown)
        ? parsed.analysis.ingredient_breakdown
        : Array.isArray(parsed.analysis.ingredientBreakdown)
        ? parsed.analysis.ingredientBreakdown
        : [],
      nutritionHighlights: Array.isArray(parsed.analysis.nutrition_highlights)
        ? parsed.analysis.nutrition_highlights
        : Array.isArray(parsed.analysis.nutritionHighlights)
        ? parsed.analysis.nutritionHighlights
        : [],
      cookingMethods: parsed.analysis.cooking_methods || parsed.analysis.cookingMethods || {},
      disclaimer: parsed.analysis.disclaimer || '',
    } : undefined

    if (foods.length === 1) {
      console.warn('[AI/Hunyuan] ⚠️ 仅识别出 1 种食物，可能存在漏识别。原始响应:', content)
    }

    console.log('[AI/Hunyuan] 识别成功:', foods, '分析报告:', analysis)
    return { success: true, foods, analysis }
  } catch (error) {
    console.error('[AI] 混元 API 识别失败:', error)
    return {
      success: false,
      foods: [],
      error: error instanceof Error ? error.message : '识别失败，请重试',
    }
  }
}
