/**
 * AI 识别服务 - 身体成分识别
 */
import type { BodyCompositionResult, BodyRecognizeResult } from './types'
import { AI_CONFIG, HUNYUAN_API_URL, HUNYUAN_MODEL } from './foodRecognition'
import { callHunyuanViaCloud, shouldUseCloudProxy } from './cloudfunction-proxy'

/**
 * 识别体成分数据图片
 * @param imageBase64 图片 Base64 编码
 * @returns 体成分数据
 */
export async function recognizeBodyComposition(
  imageBase64: string
): Promise<BodyRecognizeResult> {
  console.log(`[Body Recognize] 开始识别体成分数据`)

  const apiKey = AI_CONFIG.secretKey
  if (!apiKey || apiKey === 'your_api_key_here') {
    console.error('[Body Recognize] 腾讯云 API Key 未配置！')
    return {
      success: false,
      error: '未配置腾讯云 API Key，无法进行 AI 识别',
    }
  }

  try {
    const imageUrlData = `data:image/jpeg;base64,${imageBase64}`

    const payload = {
      model: HUNYUAN_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `你是一个专业的体成分数据分析师。请仔细分析这张体成分检测仪/智能秤的屏幕截图图片，准确识别并提取所有显示的数值。

重要规则：
1. **仔细观察图片**：图片通常是体成分检测仪、健身房智能秤、医院体测仪等设备显示的屏幕截图
2. **识别所有数值**：注意观察数字、小数点、单位，特别关注体重、体脂率、BMI、肌肉量等核心指标
3. **提取单位信息**：注意 kg、%、cm 等单位，识别出来的数值要带上正确的单位
4. **不要猜测**：只报告你能从图片中明确看到的数值，不要假设任何未显示的数据
5. **注意数据一致性**：检查各项数据是否合理（如体重=体脂肪+去脂体重）

请严格按以下 JSON 格式返回，只返回 JSON，不要其他任何内容：
{
  "weight": 体重数值(kg,数字),
  "bmi": BMI数值(数字),
  "bodyFat": 体脂率(%,数字),
  "fatMass": 体脂肪重量(kg,数字),
  "muscleMass": 肌肉量(kg,数字),
  "fatFreeMass": 去脂体重(kg,数字),
  "skeletalMuscle": 骨骼肌(kg,数字),
  "waist": 腰围(cm,数字),
  "visceralFat": 内脏脂肪等级(数字),
  "water": 体水分(%,数字),
  "boneMass": 骨量(kg,数字),
  "basalMetabolism": 基础代谢(kcal,数字),
  "protein": 蛋白质(%,数字),
  "subfat": 皮下脂肪(%,数字),
  "bodyAge": 身体年龄(岁,数字)
}

注意：
- 只返回 JSON 对象，如果某项数据在图片中无法识别，该字段可以省略
- 数值必须是数字类型，不要带单位
- 如果图片中没有任何体成分数据，返回空对象 {}
- 只返回 JSON，不要任何解释或前缀`,
            },
            {
              type: 'image_url',
              image_url: { url: imageUrlData }
            },
          ],
        },
      ],
    }

    console.log('[Body Recognize] 正在调用腾讯云混元视觉 API...')

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
      console.error('[Body Recognize] API 错误:', response.status, errText)
      throw new Error(`混元 API 请求失败: ${response.status}`)
    }

    const data = await response.json()
    console.log('[Body Recognize] 原始响应:', JSON.stringify(data))

    // 解析响应内容
    const content = data.choices?.[0]?.message?.content || ''

    // 提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[Body Recognize] 无法解析识别结果，原始内容:', content)
      throw new Error('无法解析识别结果')
    }

    const parsed = JSON.parse(jsonMatch[0])
    console.log('[Body Recognize] 解析结果:', parsed)

    // 检查是否为空对象
    if (Object.keys(parsed).length === 0) {
      return {
        success: false,
        error: '未识别到体成分数据，请确保图片清晰显示检测仪屏幕',
      }
    }

    // 映射结果
    const result: BodyCompositionResult = {}
    if (parsed.weight != null) result.weight = Number(parsed.weight)
    if (parsed.bmi != null) result.bmi = Number(parsed.bmi)
    if (parsed.bodyFat != null) result.bodyFat = Number(parsed.bodyFat)
    if (parsed.fatMass != null) result.fatMass = Number(parsed.fatMass)
    if (parsed.muscleMass != null) result.muscleMass = Number(parsed.muscleMass)
    if (parsed.fatFreeMass != null) result.fatFreeMass = Number(parsed.fatFreeMass)
    if (parsed.skeletalMuscle != null) result.skeletalMuscle = Number(parsed.skeletalMuscle)
    if (parsed.waist != null) result.waist = Number(parsed.waist)
    if (parsed.visceralFat != null) result.visceralFat = Number(parsed.visceralFat)
    if (parsed.water != null) result.water = Number(parsed.water)
    if (parsed.boneMass != null) result.boneMass = Number(parsed.boneMass)
    if (parsed.basalMetabolism != null) result.basalMetabolism = Number(parsed.basalMetabolism)
    if (parsed.protein != null) result.protein = Number(parsed.protein)
    if (parsed.subfat != null) result.subfat = Number(parsed.subfat)
    if (parsed.bodyAge != null) result.bodyAge = Number(parsed.bodyAge)

    console.log('[Body Recognize] 识别成功:', result)
    return { success: true, data: result }
  } catch (error) {
    console.error('[Body Recognize] 识别失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '识别失败，请重试',
    }
  }
}
