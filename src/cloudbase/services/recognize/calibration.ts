// ============================================================
// 拳头校准 API
// ============================================================

import type { FistCalibration, FistCalibrationResult } from './types'
import { AI_CONFIG, HUNYUAN_MODEL, HUNYUAN_API_URL } from './config'
import { callHunyuanViaCloud, shouldUseCloudProxy } from './cloudfunction-proxy'

/**
 * 校准拳头体积
 * 用户拍摄两张拳头照片（俯瞰 + 侧面），AI 计算体积
 */
export async function calibrateFist(
  topDownBase64: string,
  sideViewBase64: string
): Promise<FistCalibrationResult> {
  console.log('[Fist Calibrate] 开始校准拳头体积')

  const apiKey = AI_CONFIG.secretKey
  if (!apiKey || apiKey === 'your_api_key_here') {
    return { success: false, error: '未配置腾讯云 API Key，无法进行校准' }
  }

  try {
    const payload = {
      model: HUNYUAN_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `你是一个专业的视觉体积估算专家。请分析这两张拳头照片，计算出用户拳头的近似体积。

【输入说明】
- image1：拳头俯瞰图（从上往下看，可以看到宽度和长度）
- image2：拳头侧面图（从侧面看，可以看到厚度/高度）

【任务】
1. 从俯瞰图估算拳头的宽度（左右最宽处）和长度（前后最深处），单位用毫米
2. 从侧面图估算拳头的厚度/高度（上下最高处），单位用毫米
3. 将拳头近似为一个椭球体计算体积：V = (4/3) × π × a × b × c，其中 a=宽度/2, b=长度/2, c=高度/2
4. 也可以用更简单的近似：圆柱体 V = π × r² × h，其中 r=(宽度+长度)/4, h=高度

【输出格式】
请严格按以下 JSON 格式返回，不要其他任何内容：
{
  "volume_ml": 体积(毫升,数字),
  "width_mm": 宽度(毫米,数字),
  "depth_mm": 长度(毫米,数字),
  "height_mm": 高度(毫米,数字),
  "confidence": 置信度(0-1)
}

注意：
- 只返回 JSON，不要任何解释或前缀
- 如果某张照片中拳头不清晰或不可见，跳过该照片，尽量用能看清的那张
- 成人握拳体积一般在 150-350ml 之间，如结果偏离太多请重新估算`,
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${topDownBase64}` }
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${sideViewBase64}` }
            },
          ],
        },
      ],
    }

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
      throw new Error(`校准 API 请求失败: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('无法解析校准结果')
    }

    const parsed = JSON.parse(jsonMatch[0])
    console.log('[Fist Calibrate] 校准结果:', parsed)

    const calibration: FistCalibration = {
      calibratedAt: Date.now(),
      volumeMl: Number(parsed.volume_ml) || 220,
      widthMm: Number(parsed.width_mm) || 80,
      depthMm: Number(parsed.depth_mm) || 55,
      heightMm: Number(parsed.height_mm) || 65,
      confidence: Number(parsed.confidence) || 0.7,
    }

    return { success: true, data: calibration }
  } catch (error) {
    console.error('[Fist Calibrate] 校准失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '校准失败，请重试',
    }
  }
}
