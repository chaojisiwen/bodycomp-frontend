// ============================================================
// 百度菜品识别 API（专业食物识别，中国食物准确率高）
// ============================================================

import type { RecognizedFoodItem, RecognizeResult, FistCalibration } from './types'
import { compressImage } from './imageUtils'
import { AI_CONFIG, HUNYUAN_API_URL, ZHIPU_API_URL } from './config'

/**
 * 获取百度 Access Token（有效期 30 天，自动缓存）
 */
let _baiduTokenCache: { token: string; expiresAt: number } | null = null

async function getBaiduAccessToken(): Promise<string> {
  const now = Date.now()
  if (_baiduTokenCache && _baiduTokenCache.expiresAt > now) {
    return _baiduTokenCache.token
  }

  const apiKey = AI_CONFIG.baiduApiKey
  const secretKey = AI_CONFIG.baiduSecretKey
  if (!apiKey || !secretKey) {
    throw new Error('未配置百度 API Key 或 Secret Key')
  }

  // 百度 OAuth token 接口（统一走代理路径，Vite/Vercel 各自转发）
  const tokenUrl = `/api/baidu/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`

  const res = await fetch(tokenUrl, { method: 'POST' })
  if (!res.ok) throw new Error(`百度 Token 获取失败: ${res.status}`)
  const data = await res.json()
  if (!data.access_token) throw new Error('百度 Token 响应异常')

  _baiduTokenCache = {
    token: data.access_token,
    expiresAt: now + (data.expires_in - 60) * 1000,  // 提前 60 秒过期
  }
  return _baiduTokenCache.token
}

/**
 * 百度菜品识别 → 获取菜名列表
 * 返回带置信度排序的菜名数组
 */
async function baiduDishDetect(imageBase64: string): Promise<Array<{ name: string; score: number }>> {
  const token = await getBaiduAccessToken()

  const dishUrl = `/api/baidu/rest/2.0/image-classify/v2/dish?access_token=${token}`

  // 百度 API 要求 urlencoded 格式
  const body = new URLSearchParams()
  body.append('image', imageBase64)
  body.append('top_num', '5')    // 返回前 5 个候选菜名
  body.append('filter_threshold', '0.3')  // 过滤低置信度结果

  const res = await fetch(dishUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) throw new Error(`百度菜品识别请求失败: ${res.status}`)

  const data = await res.json()
  if (data.error_code) throw new Error(`百度菜品识别错误: ${data.error_msg}`)

  const result: Array<{ name: string; score: number }> = (data.result || []).map((item: any) => ({
    name: item.name as string,
    score: Number(item.probability) || 0,
  }))

  console.log('[AI/Baidu] 菜品识别结果:', result)
  return result
}

/**
 * 用 GLM/混元 根据菜名估算营养数据（不需要图片，纯文字更快更便宜）
 */
async function estimateNutritionByName(
  dishes: Array<{ name: string; score: number }>,
  fistCalibration?: FistCalibration
): Promise<RecognizedFoodItem[]> {
  const dishList = dishes.map(d => `${d.name}（置信度${Math.round(d.score * 100)}%）`).join('、')
  const weightHint = fistCalibration
    ? `用户拳头体积为 ${fistCalibration.volumeMl}ml，请用拳头体积参照估算每种食物的重量。`
    : '请根据中国家庭一人份常见分量估算食物重量。'

  const prompt = `你是一个专业的食物营养分析师。以下是用 AI 识别出的菜品列表（按置信度排序）：
${dishList}

任务：
1. 从上面的菜品中，选出最可能是同一餐里共同出现的食物组合（1-4种）
2. 如果置信度最高的菜名明显是主菜，可以推测还有配菜（如米饭、蔬菜）
3. ${weightHint}
4. 对每种食物给出估算的营养数据

请严格按以下 JSON 格式返回（只返回 JSON，不要其他任何内容）：
{
  "foods": [
    {"name": "食物名称", "weight": 估算重量(g,数字), "calories": 热量(kcal,数字), "protein": 蛋白质(g,数字), "fat": 脂肪(g,数字), "carbs": 碳水(g,数字), "confidence": 置信度(0-1), "cooking_method": "烹饪方式"}
  ],
  "analysis": {
    "meal_type": "餐食类型名称",
    "meal_category": "分类标签（减脂餐/增肌餐/均衡餐/高蛋白餐/高碳水餐）",
    "ingredient_breakdown": ["食材1描述", "食材2描述"],
    "nutrition_highlights": ["营养亮点1", "营养亮点2"],
    "cooking_methods": {},
    "disclaimer": "热量和营养为基于常见食材重量的估算值，实际会受食材分量和烹饪方式影响。"
  }
}

热量必须等于 protein×4 + fat×9 + carbs×4。`

  // 优先用混元，无配置则用智谱
  const apiKey = AI_CONFIG.secretKey
  const zhipuKey = AI_CONFIG.zhipuKey
  let content = ''

  if (apiKey) {
    // 调用混元（纯文字模式，不带图片）
    const payload = {
      model: 'hunyuan-pro',
      messages: [{ role: 'user', content: prompt }],
    }
    const res = await fetch(HUNYUAN_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const data = await res.json()
      content = data.choices?.[0]?.message?.content || ''
    }
  }

  if (!content && zhipuKey) {
    // 调用智谱（纯文字模式）
    const payload = {
      model: 'glm-4-flash',
      messages: [{ role: 'user', content: prompt }],
    }
    const res = await fetch(ZHIPU_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${zhipuKey}` },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const data = await res.json()
      content = data.choices?.[0]?.message?.content || ''
    }
  }

  if (!content) throw new Error('营养估算失败，请重试')

  // 清理 markdown 代码块
  content = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('无法解析营养估算结果')

  const parsed = JSON.parse(jsonMatch[0])
  if (!parsed.foods || !Array.isArray(parsed.foods) || parsed.foods.length === 0) {
    throw new Error('营养估算结果为空')
  }

  return parsed.foods.map((f: any) => ({
    name: f.name || '未知食物',
    protein: Number(f.protein) || 0,
    fat: Number(f.fat) || 0,
    carbs: Number(f.carbs) || 0,
    calories: Math.round((Number(f.protein) || 0) * 4 + (Number(f.fat) || 0) * 9 + (Number(f.carbs) || 0) * 4) || 100,
    weight: Number(f.weight) || 100,
    confidence: Number(f.confidence) || 0.8,
    cookingMethod: f.cooking_method || f.cookingMethod || '',
  }))
}

/**
 * 使用百度菜品识别 API 识别食物
 *
 * 流程：
 * 1. 调用百度菜品识别 → 获取精准中文菜名（专门训练过中国食物）
 * 2. 将菜名传给混元/GLM → 估算营养数据（纯文字调用，更便宜更快）
 *
 * 优势：菜名识别精度高（专业模型），营养估算通过大模型推理（比通用视觉强）
 */
export async function recognizeWithBaidu(
  imageBase64?: string,
  imageUrl?: string,
  fistCalibration?: FistCalibration
): Promise<RecognizeResult> {
  const apiKey = AI_CONFIG.baiduApiKey
  const secretKey = AI_CONFIG.baiduSecretKey
  if (!apiKey || !secretKey) {
    return { success: false, foods: [], error: '未配置百度 API Key 或 Secret Key' }
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

    // 压缩图片（百度要求图片 base64 < 4MB）
    base64 = await compressImage(base64, 3000)

    console.log('[AI/Baidu] Step 1: 调用百度菜品识别...')
    const dishes = await baiduDishDetect(base64)

    if (dishes.length === 0) {
      return { success: false, foods: [], error: '百度未能识别出菜品，请换一张清晰的食物图片' }
    }

    console.log('[AI/Baidu] Step 2: 根据菜名估算营养数据...')
    const foods = await estimateNutritionByName(dishes, fistCalibration)

    console.log('[AI/Baidu] 识别完成:', foods)
    return {
      success: true,
      foods,
      analysis: {
        mealType: dishes[0]?.name || '',
        mealCategory: '均衡餐',
        ingredientBreakdown: dishes.map(d => `${d.name}（置信度 ${Math.round(d.score * 100)}%）`),
        nutritionHighlights: [],
        cookingMethods: {},
        disclaimer: '热量和营养为基于常见食材重量的估算值，实际会受食材分量和烹饪方式影响。',
      },
    }
  } catch (error) {
    console.error('[AI/Baidu] 识别失败:', error)
    return {
      success: false,
      foods: [],
      error: error instanceof Error ? error.message : '百度识别失败，请重试',
    }
  }
}
