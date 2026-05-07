// ============================================================
// Google Gemini 视觉 API
// ============================================================

import type { RecognizedFoodItem, RecognizeResult, FistCalibration } from './types'
import { AI_CONFIG, GEMINI_API_URL } from './config'

/**
 * 使用 Google Gemini 2.0 Flash 识别食物
 * Gemini 在细粒度视觉区分（三文鱼 vs 鸡胸）上明显强于腾讯云混元
 */
export async function recognizeWithGemini(
  imageBase64?: string,
  imageUrl?: string,
  fistCalibration?: FistCalibration
): Promise<RecognizeResult> {
  const apiKey = AI_CONFIG.geminiKey
  if (!apiKey) {
    console.error('[AI/Gemini] API Key 未配置！')
    return {
      success: false,
      foods: [],
      error: '未配置 Google Gemini API Key',
    }
  }

  try {
    if (!imageBase64 && !imageUrl) {
      throw new Error('没有提供图片')
    }

    const payload = {
      contents: [
        {
          parts: [
            { text: buildGeminiPrompt(fistCalibration) },
            { inline_data: { mime_type: 'image/jpeg', data: imageBase64 || '' } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    }

    // 如果是 imageUrl 模式，转成 base64（Gemini API 要求 inline_data）
    let base64Data = imageBase64 || ''
    if (imageUrl && !imageBase64) {
      console.log('[AI/Gemini] 需要将图片 URL 转为 Base64...')
      let imgBlob: Blob | undefined
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const imgResp = await fetch(imageUrl)
          imgBlob = await imgResp.blob()
          break
        } catch (err) {
          console.warn(`[AI/Gemini] 下载图片第 ${attempt} 次失败:`, err)
          if (attempt < 3) await new Promise(r => setTimeout(r, 1000))
          else throw new Error('图片加载失败，请重试')
        }
      }
      if (imgBlob) {
        const arr = await imgBlob.arrayBuffer()
        base64Data = btoa(String.fromCharCode(...new Uint8Array(arr)))
        payload.contents[0].parts[1] = {
          inline_data: { mime_type: 'image/jpeg', data: base64Data },
        }
      }
    } else if (imageBase64) {
      payload.contents[0].parts[1] = {
        inline_data: { mime_type: 'image/jpeg', data: imageBase64 },
      }
    }

    const apiUrl = `${GEMINI_API_URL}?key=${apiKey}`
    console.log('[AI/Gemini] 正在调用 Google Gemini 2.0 Flash...')

    // 带重试的 fetch（网络抖动时最多重试 3 次）
    let response: Response | undefined
    let lastError = ''
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        break
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err)
        console.warn(`[AI/Gemini] 第 ${attempt} 次请求失败: ${lastError}`)
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 2000 * attempt))
        }
      }
    }

    if (!response || !response.ok) {
      const errText = response ? await response.text() : lastError
      console.error('[AI/Gemini] API 错误:', response?.status, errText)
      throw new Error(`Gemini API 请求失败: ${response?.status || '网络错误'}`)
    }

    const data = await response.json()
    console.log('[AI/Gemini] 原始响应:', JSON.stringify(data))

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[AI/Gemini] 无法解析识别结果，原始内容:', content)
      throw new Error('无法解析识别结果')
    }

    const parsed = JSON.parse(jsonMatch[0])

    if (!parsed.foods || !Array.isArray(parsed.foods) || parsed.foods.length === 0) {
      console.error('[AI/Gemini] 识别结果为空:', parsed)
      throw new Error('未识别到食物，请重试')
    }

    const foods: RecognizedFoodItem[] = parsed.foods.map((f: Partial<RecognizedFoodItem>) => ({
      name: f.name || '未知食物',
      calories: Number(f.calories) || 100,
      protein: Number(f.protein) || 0,
      fat: Number(f.fat) || 0,
      carbs: Number(f.carbs) || 0,
      weight: Number(f.weight) || 100,
      confidence: Number(f.confidence) || 0.8,
    }))

    if (foods.length === 1) {
      console.warn('[AI/Gemini] ⚠️ 仅识别出 1 种食物，可能存在漏识别。原始响应:', content)
    }

    console.log('[AI/Gemini] 识别成功:', foods)
    return { success: true, foods }
  } catch (error) {
    console.error('[AI/Gemini] 识别失败:', error)
    return {
      success: false,
      foods: [],
      error: error instanceof Error ? error.message : '识别失败，请重试',
    }
  }
}

/**
 * 构建 Google Gemini 专用的食物识别 Prompt
 */
function buildGeminiPrompt(fistCalibration?: FistCalibration): string {
  const withCalibration = fistCalibration ? `
【拳头校准数据】
- 拳头体积：${fistCalibration.volumeMl}ml
- 尺寸：${fistCalibration.widthMm}mm × ${fistCalibration.depthMm}mm × ${fistCalibration.heightMm}mm
- 请用拳头作为比例尺估算食物体积

【份量估算方法】
1. 在图中找到拳头作为参照
2. 估算每种食物相对于拳头的体积比例
3. 用拳头体积（${fistCalibration.volumeMl}ml）× 比例 × 密度 = 重量
4. 常见密度：米饭 0.9g/ml，肉类 1.0-1.2g/ml，蛋 1.0g/ml，蔬菜 0.3-0.6g/ml` : ''

  return `你是一个专业的食物营养分析师。请仔细分析这张食物图片，识别图中所有可见的食物。${withCalibration}

【核心要求】
1. **必须识别所有食物**：一盘食物往往有主食+蛋白质+蔬菜，漏掉任何一种都是严重错误
2. **观察颜色和纹理判断种类**：
   - 三文鱼（鲑鱼）：橙红/珊瑚色，有白色脂肪纹路，烤焦后边缘仍可见橙红色
   - 鸡胸肉：淡粉/白色，无脂肪纹，质地均匀，烤焦后内部灰白
   - 金枪鱼：深红色，质地紧实
   - 鳕鱼：白色/淡黄，质地细腻
   - 如不确定，宁可写"烤鱼"也不误写"鸡肉"
3. **观察光泽度判断脂肪**：油亮反光 → 额外加 20-50% 脂肪（不适用于甜品、面包等）
4. **参照餐具大小**：普通餐盘约20-25cm，饭碗约12-15cm
5. **常见重量参考**：米饭一碗150-200g，蔬菜一盘100-200g，肉类一块80-150g

请严格按以下 JSON 格式返回（只返回 JSON，不要其他任何内容）：
{
  "foods": [
    {"name": "食物名称", "weight": 估算重量(g,数字), "calories": 热量(kcal,数字), "protein": 蛋白质(g,数字), "fat": 脂肪(g,数字), "carbs": 碳水(g,数字), "confidence": 置信度(0-1)}
  ]
}

注意：
- weight 是估算的食用重量
- 热量由营养素计算：蛋白质×4 + 脂肪×9 + 碳水×4
- 只返回 JSON，不要任何解释或前缀
- 如不确定种类，宁可写大类（如"烤鱼"）也不乱写
- 强烈要求列出所有识别到的食物，不要只返回1-2种`
}
