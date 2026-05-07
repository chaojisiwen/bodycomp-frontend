/**
 * AI 识别服务 - 运动识别
 */
import type { ExerciseItemResult, ExerciseRecognizeResult } from './types'
import { AI_CONFIG, HUNYUAN_API_URL, HUNYUAN_MODEL } from './foodRecognition'
import { callHunyuanViaCloud, shouldUseCloudProxy } from './cloudfunction-proxy'

/**
 * 识别运动报告截图
 * @param imageBase64 图片 Base64 编码
 * @returns 运动数据列表
 */
export async function recognizeExercise(
  imageBase64: string
): Promise<ExerciseRecognizeResult> {
  console.log(`[Exercise Recognize] 开始识别运动报告`)

  const apiKey = AI_CONFIG.secretKey
  if (!apiKey || apiKey === 'your_api_key_here') {
    console.error('[Exercise Recognize] 腾讯云 API Key 未配置！')
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
              text: `你是一个专业的运动数据分析师。请仔细分析这张运动报告/运动APP/智能手环/智能手表等设备显示的截图，识别并提取所有运动数据。

重要规则：
1. **仔细观察图片**：图片可能是 Apple Watch、华为健康、小米运动、佳明(Garmin)、Polar、Keep、悦跑圈、咕咚等APP或设备的运动报告截图
2. **识别运动项目**：注意运动名称、运动类型、时长、消耗卡路里等字段
3. **提取数值**：注意数字、小数点、单位（如分钟、kcal、公里等）
4. **识别多个运动**：一张图片可能包含多个运动记录，需要全部提取
5. **不要猜测**：只报告你能从图片中明确看到的运动数据，不要假设任何未显示的数据

**热量字段的同义词映射（最重要）**：
- **活动消耗/活动热量/活动能量 = Active Energy = 运动消耗 = 锻炼消耗** → 这是本次运动的实际消耗，填入 calories 和 activeCalories 字段
- **总消耗/总消耗热量/总能量/累计能量/Total Energy** → 包含基础代谢的总消耗，填入 totalCalories 字段

**心率字段的同义词**：
- **平均心率/Avg HR/Avg Heart Rate/平均心率** → 填入 avgHeartRate 字段

**各设备热量显示位置参考**：
- **华为健康APP**：通常显示"活动消耗"和"总消耗"，以及"平均心率"
- **Apple Watch**：通常显示"动态"千卡和"总"千卡
- **小米运动**：通常显示"活动消耗"和"全天消耗"
- **Garmin**：通常显示"Active Calories"和"Total Calories"
- **Keep/悦跑圈/咕咚**：通常显示"消耗热量"或"卡路里"

请严格按以下 JSON 格式返回，只返回 JSON，不要其他任何内容：
{
  "exercises": [
    {"name": "运动名称(中文)", "duration": 时长(分钟,数字), "calories": 消耗卡路里(kcal,数字), "type": "运动类型(可选)", "activeCalories": 动态千卡(数字,可选), "totalCalories": 总千卡(数字,可选), "avgHeartRate": 平均心率(数字,次/分,可选)}
  ]
}

注意：
- 只返回 JSON 数组，如果图片中没有运动数据，返回 {"exercises": []}
- duration 必须是分钟数，不是小时
- calories 必须是 kcal，不是 kJ（如果只有 kJ，需要除以 4.184 转换为 kcal）
- **活动消耗/活动热量 = 本次运动实际消耗** → 优先填入 calories 字段
- **总消耗/总消耗热量/总能量** → 填入 totalCalories 字段
- **平均心率** → 填入 avgHeartRate 字段
- 数值必须是数字类型
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

    console.log('[Exercise Recognize] 正在调用腾讯云混元视觉 API...')

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
      console.error('[Exercise Recognize] API 错误:', response.status, errText)
      throw new Error(`混元 API 请求失败: ${response.status}`)
    }

    const data = await response.json()
    console.log('[Exercise Recognize] 原始响应:', JSON.stringify(data))

    // 解析响应内容
    const content = data.choices?.[0]?.message?.content || ''

    // 提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[Exercise Recognize] 无法解析识别结果，原始内容:', content)
      throw new Error('无法解析识别结果')
    }

    const parsed = JSON.parse(jsonMatch[0])
    console.log('[Exercise Recognize] 解析结果:', parsed)

    // 检查是否为空数组
    if (!parsed.exercises || !Array.isArray(parsed.exercises) || parsed.exercises.length === 0) {
      return {
        success: false,
        error: '未识别到运动数据，请确保图片清晰显示运动报告',
      }
    }

    // 映射结果
    const exercises: ExerciseItemResult[] = parsed.exercises.map((e: any) => ({
      name: e.name || '未知运动',
      duration: Number(e.duration) || 0,
      calories: Number(e.calories) || 0,
      type: e.type,
      activeCalories: e.activeCalories != null ? Number(e.activeCalories) : undefined,
      totalCalories: e.totalCalories != null ? Number(e.totalCalories) : undefined,
      avgHeartRate: e.avgHeartRate != null ? Number(e.avgHeartRate) : undefined,
    }))

    console.log('[Exercise Recognize] 识别成功:', exercises)
    return { success: true, exercises }
  } catch (error) {
    console.error('[Exercise Recognize] 识别失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '识别失败，请重试',
    }
  }
}
