// ============================================================
// 智谱 GLM-4V 视觉 API
// ============================================================

import type { RecognizedFoodItem, RecognizeResult, RecognizeAnalysis, FistCalibration } from './types'
import { buildFoodPrompt } from './prompts'
import { compressImage } from './imageUtils'
import { AI_CONFIG, ZHIPU_MODEL, ZHIPU_API_URL } from './config'

export async function recognizeWithZhipu(
  imageBase64?: string,
  imageUrl?: string,
  fistCalibration?: FistCalibration
): Promise<RecognizeResult> {
  const apiKey = AI_CONFIG.zhipuKey
  if (!apiKey) {
    return { success: false, foods: [], error: '未配置智谱 API Key' }
  }

  try {
    let imageData = imageBase64
    if (imageUrl && !imageBase64) {
      const imgResp = await fetch(imageUrl)
      const blob = await imgResp.blob()
      const arr = await blob.arrayBuffer()
      imageData = btoa(String.fromCharCode(...new Uint8Array(arr)))
    }

    if (!imageData) throw new Error('没有提供图片')

    // 压缩图片（智谱 API 对大图片返回 500）
    imageData = await compressImage(imageData, 2000)

    const payload = {
      model: ZHIPU_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: buildFoodPrompt(fistCalibration) },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageData}` } },
          ],
        },
      ],
    }

    console.log('[AI/Zhipu] 正在调用智谱 GLM-4V...')
    const response = await fetch(ZHIPU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('[AI/Zhipu] API 错误:', response.status, errText)
      throw new Error(`智谱 API 请求失败: ${response.status}`)
    }

    const data = await response.json()
    let content = data.choices?.[0]?.message?.content || ''
    
    // 清理 markdown 代码块标记
    content = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
    
    // 提取 JSON（处理 markdown 或纯文本格式）
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[AI/Zhipu] 无法从响应中提取 JSON:', content.substring(0, 200))
      throw new Error('无法解析识别结果，响应格式异常')
    }

    let parsed: { foods?: any[]; analysis?: any }
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch (e) {
      console.error('[AI/Zhipu] JSON 解析失败:', jsonMatch[0].substring(0, 200))
      throw new Error('JSON 解析失败，请重试')
    }
    
    if (!parsed.foods || !Array.isArray(parsed.foods) || parsed.foods.length === 0) {
      throw new Error('未识别到食物，请重试')
    }

    const foods: RecognizedFoodItem[] = parsed.foods.map((f: Partial<RecognizedFoodItem>) => {
      // 前端兜底：热量严格等于 protein×4 + fat×9 + carbs×4
      const calcCalories = Math.round((Number(f.protein) || 0) * 4 + (Number(f.fat) || 0) * 9 + (Number(f.carbs) || 0) * 4) || 100
      return {
        name: f.name || '未知食物',
        calories: calcCalories,
        protein: Number(f.protein) || 0,
        fat: Number(f.fat) || 0,
        carbs: Number(f.carbs) || 0,
        weight: Number(f.weight) || 100,
        confidence: Number(f.confidence) || 0.8,
        cookingMethod: f.cookingMethod || '',
      }
    })

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

    console.log('[AI/Zhipu] 识别成功:', foods, '分析报告:', analysis)
    return { success: true, foods, analysis }
  } catch (error) {
    console.error('[AI/Zhipu] 识别失败:', error)
    return { success: false, foods: [], error: error instanceof Error ? error.message : '识别失败' }
  }
}
