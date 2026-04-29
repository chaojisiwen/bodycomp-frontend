/**
 * AI 食物识别服务 - 腾讯云混元直连模式
 *
 * 使用腾讯云混元视觉模型（hunyuan-vision）直接识别食物
 * 文档：https://cloud.tencent.com/document/product/1729/111007
 *
 * 配置方法：
 * 1. 修改 .env 文件中的 VITE_AI_MODE=hunyuan
 * 2. 设置 VITE_TENCENT_SECRET_KEY=你的API密钥
 * 3. 在腾讯云控制台获取 API Key：https://console.cloud.tencent.com/hunyuan/start
 */

// ============================================================
// 类型定义
// ============================================================

/** 拳头校准数据 */
export interface FistCalibration {
  /** 校准时间 */
  calibratedAt: number
  /** 拳头体积（ml） */
  volumeMl: number
  /** 宽度（mm） */
  widthMm: number
  /** 深度（mm） */
  depthMm: number
  /** 高度（mm） */
  heightMm: number
  /** 校准置信度 */
  confidence: number
}

export interface RecognizedFoodItem {
  /** 食物名称 */
  name: string
  /** 热量 (kcal) */
  calories: number
  /** 蛋白质 (g) */
  protein: number
  /** 脂肪 (g) */
  fat: number
  /** 碳水化合物 (g) */
  carbs: number
  /** 估算重量 (g) */
  weight: number
  /** 置信度 0-1 */
  confidence: number
  /** 烹饪方式描述（可选） */
  cookingMethod?: string
}

/** AI 食物分析报告 */
export interface RecognizeAnalysis {
  /** 餐食类型名称，如"波奇碗"、"中式正餐" */
  mealType: string
  /** 餐食分类标签，如"减脂餐"、"增肌餐"、"均衡餐" */
  mealCategory: string
  /** 食材拆解描述，每种食物一行说明 */
  ingredientBreakdown: string[]
  /** 营养亮点列表 */
  nutritionHighlights: string[]
  /** 烹饪方式描述 */
  cookingMethods: Record<string, string>
  /** 免责声明 */
  disclaimer: string
}

export interface RecognizeResult {
  /** 识别成功 */
  success: boolean
  /** 识别到的食物列表 */
  foods: RecognizedFoodItem[]
  /** AI 分析报告 */
  analysis?: RecognizeAnalysis
  /** 错误信息 */
  error?: string
  /** 是否为模拟数据 */
  isMock?: boolean
}

export interface AIConfig {
  /** 腾讯云 API Key */
  secretKey?: string
  /** Google Gemini API Key */
  geminiKey?: string
  /** 智谱 GLM API Key */
  zhipuKey?: string
  /** 百度 API Key */
  baiduApiKey?: string
  /** 百度 Secret Key */
  baiduSecretKey?: string
  /** 识别模式：gemini | hunyuan | zhipu | baidu | openclaw | vote | mock */
  mode: 'gemini' | 'hunyuan' | 'zhipu' | 'baidu' | 'openclaw' | 'vote' | 'mock'
  /** OpenClaw API 地址 */
  openclawUrl?: string
}

// ============================================================
// 配置
// ============================================================

const AI_CONFIG: AIConfig = {
  secretKey: import.meta.env.VITE_TENCENT_SECRET_KEY || '',
  geminiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
  zhipuKey: import.meta.env.VITE_ZHIPU_API_KEY || '',
  baiduApiKey: import.meta.env.VITE_BAIDU_API_KEY || '',
  baiduSecretKey: import.meta.env.VITE_BAIDU_SECRET_KEY || '',
  openclawUrl: import.meta.env.VITE_OPENCLAW_API_URL || '',
  mode: (import.meta.env.VITE_AI_MODE as AIConfig['mode']) || 'mock',
}

// 腾讯云混元 API 地址（开发环境用代理，生产环境直接调用）
const HUNYUAN_API_URL = import.meta.env.DEV
  ? '/api/hunyuan/v1/chat/completions'  // 开发环境走 Vite 代理
  : 'https://api.hunyuan.cloud.tencent.com/v1/chat/completions'  // 生产环境直接调用
const HUNYUAN_MODEL = 'hunyuan-vision'

// Google Gemini API 地址
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

// 智谱 GLM-4V API 地址
const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const ZHIPU_MODEL = 'glm-4v'

// ============================================================
// 工具函数
// ============================================================

/**
 * 压缩图片 Base64，确保不超过指定大小（默认 2MB）
 * 智谱 API 对大图片会返回 500 错误
 */
async function compressImage(base64: string, maxSizeKB: number = 2048): Promise<string> {
  const sizeKB = base64.length * 3 / 4 / 1024
  if (sizeKB <= maxSizeKB) {
    return base64
  }

  console.log(`[compressImage] 图片 ${Math.round(sizeKB)}KB > ${maxSizeKB}KB，需要压缩...`)

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      // 计算压缩后的尺寸（等比缩放）
      const maxDim = 1200  // 最大边 1200px
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round(height * maxDim / width)
          width = maxDim
        } else {
          width = Math.round(width * maxDim / height)
          height = maxDim
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      // 逐步降低质量直到满足大小要求
      let quality = 0.8
      let compressed = canvas.toDataURL('image/jpeg', quality)
      while (compressed.length * 3 / 4 / 1024 > maxSizeKB && quality > 0.3) {
        quality -= 0.1
        compressed = canvas.toDataURL('image/jpeg', quality)
      }

      // 移除 data:image/jpeg;base64, 前缀
      const result = compressed.replace(/^data:image\/\w+;base64,/, '')
      console.log(`[compressImage] 压缩完成: ${Math.round(result.length * 3 / 4 / 1024)}KB`)
      resolve(result)
    }
    img.src = `data:image/jpeg;base64,${base64}`
  })
}

// ============================================================
// 核心识别函数
// ============================================================

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

// ============================================================
// 拳头校准 API
// ============================================================

export interface FistCalibrationResult {
  success: boolean
  data?: FistCalibration
  error?: string
  isMock?: boolean
}

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

    const response = await fetch(HUNYUAN_API_URL, {
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

// ============================================================
// 腾讯云混元视觉 API（主要模式）
// ============================================================

/**
 * 构建食物识别 Prompt（根据是否有拳头校准数据决定策略）
 */
function buildFoodPrompt(fistCalibration?: FistCalibration): string {
  // 有拳头校准时的增强 Prompt
  if (fistCalibration) {
    return `你是一个专业的食物营养分析师。用户的拳头体积已经过校准，校准数据如下：
- 拳头体积：${fistCalibration.volumeMl}ml
- 宽度：${fistCalibration.widthMm}mm
- 深度：${fistCalibration.depthMm}mm
- 高度：${fistCalibration.heightMm}mm
（置信度：${Math.round(fistCalibration.confidence * 100)}%）

请仔细分析这张食物图片，识别图中**所有**可见的食物。

【重要：必须识别所有食物】
- 一张餐盘/饭碗里往往有多种食物（主食+蛋白质+蔬菜），必须逐一列出
- 漏掉任何一种食物都是严重错误
- 如果有米饭/面食、肉类/蛋类、蔬菜、酱料/调味品，都要分别列出
- 食物可以是生的也可以是熟的

【核心估算策略：拳头参照法】
1. 先在图中找到拳头（作为比例尺参照物）
2. 估算每种食物相对于拳头的体积比例（如 0.3 个拳头、1.5 个拳头）
3. 用拳头的实际体积（${fistCalibration.volumeMl}ml）乘以比例，得出食物体积
4. 结合食物类型查密度（见下表）换算重量：重量(g) = 体积(ml) × 密度(g/ml)

【常见食物密度参考】
- 米饭/面条：0.9-1.0 g/ml
- 肉类（鸡胸/牛肉/猪肉）：1.0-1.2 g/ml
- 鱼类/虾：0.95-1.1 g/ml
- 蛋：1.0-1.1 g/ml
- 蔬菜（绿叶菜/西兰花）：0.3-0.6 g/ml
- 根茎类（土豆/红薯）：0.7-0.9 g/ml
- 水果（苹果/香蕉）：0.7-0.85 g/ml
- 豆腐：0.8-0.9 g/ml
- 坚果：0.5-0.7 g/ml
- 油脂/酱料：0.9-1.1 g/ml

【识别规则】
- 仔细观察食物颜色、形状、摆放方式、餐具、背景判断食物类型
- 不要猜测，只报告能明确识别的食物
- 使用具体名称（如"鸡胸肉"而不是"肉"）

请严格按以下 JSON 格式返回（只返回 JSON，不要其他任何内容）：
{
  "foods": [
    {"name": "食物名称", "weight": 估算重量(g,数字), "calories": 热量(kcal,数字), "protein": 蛋白质(g,数字), "fat": 脂肪(g,数字), "carbs": 碳水(g,数字), "confidence": 置信度(0-1), "cooking_method": "烹饪方式（煎/烤/蒸/煮/生食等）"}
  ],
  "analysis": {
    "meal_type": "餐食类型名称（如：波奇碗、中式正餐、沙拉碗、轻食套餐等）",
    "meal_category": "分类标签（减脂餐/增肌餐/均衡餐/高蛋白餐/高碳水餐）",
    "ingredient_breakdown": ["食材1的详细描述（种类+烹饪方式+外观+重量估算依据）", "食材2...", "..."],
    "nutrition_highlights": ["营养亮点1（如：蛋白质充足，近50g优质蛋白）", "营养亮点2（如：优质脂肪为主，来自牛油果和三文鱼）", "..."],
    "cooking_methods": {"食物名": "烹饪方式描述", "..."},
    "disclaimer": "热量和营养为基于常见食材重量的估算值，实际会受食材分量和烹饪方式影响。"
  }
}

【热量一致性要求（必须遵守）】
每种食物的 calories 必须等于 protein×4 + fat×9 + carbs×4，计算后四舍五入取整数。
若三者之和与 calories 不一致，必须修正 calories 使其一致。

【脂肪估算特别规则】
1. **观察光泽度**：仔细观察食物表面的光泽程度
   - 光泽度高（油亮、反光明显）→ 脂肪含量偏高（通常是烹饪加油造成的），在正常估算基础上额外加 20-50% 的脂肪
   - 光泽度低（干涩、无油光）→ 脂肪含量偏低，保持正常估算
   - **不适用**：甜品、面包、饼干、蛋糕、派、酥皮类、巧克力、冰淇淋、糖果等本身就高脂肪/高糖的食物，这些食物的光泽度不能用于判断脂肪含量
2. **油脂来源判断**：
   - 炒菜、煎炸食物表面油亮 → 额外考虑烹饪用油
   - 水煮、清蒸食物 → 脂肪取食材本身含量
3. **典型高油光泽食物**：红烧肉、糖醋排骨、油炸食品、炒青菜（泛油光）、煎蛋等
`  } else {
    // 无校准数据时的增强 Prompt
    return `你是一个专业的食物营养分析师。请仔细分析这张食物图片，准确识别图中**所有**可见的食物。

【重要：必须识别所有食物】
- 一张餐盘/饭碗里往往有多种食物（主食+蛋白质+蔬菜），必须逐一列出
- 漏掉任何一种食物都是严重错误
- 常见组合举例：
  * 中式正餐：米饭 + 肉类 + 蔬菜（可能是3-4种食物）
  * 西式简餐：主菜 + 配菜 + 酱料
  * 沙拉：多种蔬菜 + 蛋白质 + 酱汁
  * 任何情况下都不要只返回一个食物
- 食物可以是生的也可以是熟的

【识别规则】
1. **仔细观察图片**：看食物的颜色、形状、摆放方式、餐具、背景等细节
2. **识别食物类型**：根据观察到的特征判断食物种类（如米饭、肉类、蔬菜、水果、饮品等）
3. **不要猜测常见食物**：只报告你从图片中能明确识别出的食物
4. **使用具体名称**：使用具体的食物名称（如"煎鸡胸肉"而不是"肉"）
5. **【重要】区分相似蛋白质食物**：
   - **三文鱼（鲑鱼）**：肉色呈橙红/珊瑚色，有白色脂肪纹路，质地较软，表面可能有焦化纹
   - **鸡胸肉**：肉色呈淡粉色或白色，纹理均匀，无脂肪纹路，质地较实
   - **金枪鱼**：肉色呈深红/暗红色，质地紧实，无脂肪纹
   - **鳕鱼**：肉色呈白色/淡黄色，质地细腻，无明显油脂光泽
   - 如不确定是哪种鱼肉，宁可写"烤鱼"也不要误写成"鸡肉"

【份量估算方法】
- 参照餐具大小：普通餐盘直径约20-25cm，饭碗约12-15cm
- 参照常见物体大小：鸡蛋约50-60g，拳头约200-300ml
- 米饭一碗约150-200g，蔬菜一盘约100-200g，肉类一块约80-150g

对于每种食物，请根据图片中食物的实际大小和分量，估算其食用重量（单位：克），并根据重量计算营养成分。

请严格按以下 JSON 格式返回（只返回 JSON，不要其他任何内容）：
{
  "foods": [
    {"name": "食物名称", "weight": 估算重量(g,数字), "calories": 热量(kcal,数字), "protein": 蛋白质(g,数字), "fat": 脂肪(g,数字), "carbs": 碳水(g,数字), "confidence": 置信度(0-1), "cooking_method": "烹饪方式（煎/烤/蒸/煮/生食等）"}
  ],
  "analysis": {
    "meal_type": "餐食类型名称（如：波奇碗、中式正餐、沙拉碗、轻食套餐等）",
    "meal_category": "分类标签（减脂餐/增肌餐/均衡餐/高蛋白餐/高碳水餐）",
    "ingredient_breakdown": ["食材1的详细描述（种类+烹饪方式+外观+重量估算依据）", "食材2...", "..."],
    "nutrition_highlights": ["营养亮点1（如：蛋白质充足，近50g优质蛋白）", "营养亮点2（如：优质脂肪为主，来自牛油果和三文鱼）", "..."],
    "cooking_methods": {"食物名": "烹饪方式描述", "..."},
    "disclaimer": "热量和营养为基于常见食材重量的估算值，实际会受食材分量和烹饪方式影响。"
  }
}

【热量一致性要求（必须遵守）】
每种食物的 calories 必须等于 protein×4 + fat×9 + carbs×4，计算后四舍五入取整数。
若三者之和与 calories 不一致，必须修正 calories 使其一致。

【脂肪估算特别规则】
1. **观察光泽度**：仔细观察食物表面的光泽程度
   - 光泽度高（油亮、反光明显）→ 脂肪含量偏高（通常是烹饪加油造成的），在正常估算基础上额外加 20-50% 的脂肪
   - 光泽度低（干涩、无油光）→ 脂肪含量偏低，保持正常估算
   - **不适用**：甜品、面包、饼干、蛋糕、派、酥皮类、巧克力、冰淇淋、糖果等本身就高脂肪/高糖的食物
2. **油脂来源判断**：
   - 炒菜、煎炸食物表面油亮 → 额外考虑烹饪用油
   - 水煮、清蒸食物 → 脂肪取食材本身含量
3. **典型高油光泽食物**：红烧肉、糖醋排骨、油炸食品、炒青菜（泛油光）、煎蛋等

注意：
- cooking_method 描述食物的烹饪方式，如"煎"、"烤"、"蒸"、"水煮"、"生食"等
- ingredient_breakdown 中每条描述要具体，包含食物种类、烹饪方式、外观特征和重量估算依据
- 营养数据基于估算重量计算
- 只返回 JSON 数组，不要任何解释或前缀
- 如果图片中没有明显的食物，返回空的 foods 数组
- **强烈要求：即使不确定，也要尽量多列出你能识别的所有食物，不要只返回1-2种**`
  }
}

/**
 * 使用腾讯云混元多模态 API 识别食物
 */
async function recognizeWithHunyuan(
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

    // 调用混元 API
    const response = await fetch(HUNYUAN_API_URL, {
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

// ============================================================
// 智谱 GLM-4V 视觉 API
// ============================================================

async function recognizeWithZhipu(
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

// ============================================================
// Google Gemini 视觉 API
// ============================================================

/**
 * 使用 Google Gemini 2.0 Flash 识别食物
 * Gemini 在细粒度视觉区分（三文鱼 vs 鸡胸）上明显强于腾讯云混元
 */
async function recognizeWithGemini(
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

// ============================================================
// Mock 模式（开发/未配置时使用）
// ============================================================

/**
 * 模拟食物识别（用于开发测试）
 */
async function recognizeWithMock(_imageBase64?: string, _fistCalibration?: FistCalibration): Promise<RecognizeResult> {
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

// ============================================================
// 辅助函数
// ============================================================

/**
 * 计算食物总热量
 */
export function calculateTotalCalories(foods: RecognizedFoodItem[]): number {
  return Math.round(foods.reduce((sum, f) => sum + f.calories, 0))
}

/**
 * 计算食物总营养成分
 * 热量由营养素计算得出：蛋白质×4 + 脂肪×9 + 碳水×4
 */
export function calculateTotalNutrition(foods: RecognizedFoodItem[]) {
  const totalProtein = Math.round(foods.reduce((sum, f) => sum + f.protein, 0) * 10) / 10
  const totalFat = Math.round(foods.reduce((sum, f) => sum + f.fat, 0) * 10) / 10
  const totalCarbs = Math.round(foods.reduce((sum, f) => sum + f.carbs, 0) * 10) / 10
  // 热量由营养素精确计算：蛋白质×4 + 脂肪×9 + 碳水×4
  const calories = Math.round(totalProtein * 4 + totalFat * 9 + totalCarbs * 4)
  return {
    calories,
    protein: totalProtein,
    fat: totalFat,
    carbs: totalCarbs,
  }
}

// ============================================================
// 身体成分识别 API
// ============================================================

export interface BodyCompositionResult {
  /** 体重 kg */
  weight?: number
  /** BMI */
  bmi?: number
  /** 体脂率 % */
  bodyFat?: number
  /** 体脂肪 kg */
  fatMass?: number
  /** 肌肉量 kg */
  muscleMass?: number
  /** 去脂体重 kg */
  fatFreeMass?: number
  /** 骨骼肌 kg */
  skeletalMuscle?: number
  /** 腰围 cm */
  waist?: number
  /** 内脏脂肪 */
  visceralFat?: number
  /** 体水分 % */
  water?: number
  /** 骨量 kg */
  boneMass?: number
  /** 基础代谢 kcal */
  basalMetabolism?: number
  /** 蛋白质 % */
  protein?: number
  /** 皮下脂肪 % */
  subfat?: number
  /** 身体年龄 */
  bodyAge?: number
}

export interface BodyRecognizeResult {
  success: boolean
  data?: BodyCompositionResult
  error?: string
  isMock?: boolean
}

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

    const response = await fetch(HUNYUAN_API_URL, {
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

// ============================================================
// 运动报告识别 API
// ============================================================

export interface ExerciseItemResult {
  /** 运动名称 */
  name: string
  /** 运动时长（分钟） */
  duration: number
  /** 消耗卡路里（kcal）- 对应 Apple Watch 的"动态"千卡 */
  calories: number
  /** 运动类型 */
  type?: string
  /** 动态千卡（Active Energy）- Apple Watch 显示的活跃消耗 */
  activeCalories?: number
  /** 总千卡（Total Energy）- 包含基础代谢的总消耗 */
  totalCalories?: number
  /** 平均心率（次/分）- 运动期间的平均心率 */
  avgHeartRate?: number
}

export interface ExerciseRecognizeResult {
  success: boolean
  exercises?: ExerciseItemResult[]
  error?: string
  isMock?: boolean
}

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

    const response = await fetch(HUNYUAN_API_URL, {
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

// ============================================================
// 百度菜品识别 API（专业食物识别，中国食物准确率高）
// ============================================================

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

  // 百度 OAuth token 接口（需要走代理，生产环境需后端中转）
  const tokenUrl = import.meta.env.DEV
    ? `/api/baidu/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`
    : `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`

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

  const dishUrl = import.meta.env.DEV
    ? `/api/baidu/rest/2.0/image-classify/v2/dish?access_token=${token}`
    : `https://aip.baidubce.com/rest/2.0/image-classify/v2/dish?access_token=${token}`

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
async function recognizeWithBaidu(
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

// ============================================================
// 多模型投票识别
// ============================================================

interface VoteCandidate {
  name: string
  calories: number
  protein: number
  fat: number
  carbs: number
  weight: number
  confidence: number
  votes: string[]  // 哪些模型投票给了这个食物
  source: string   // 来源模型
}

interface RawResult {
  model: string
  foods: RecognizedFoodItem[]
  success: boolean
}

/**
 * 多模型投票识别食物
 * 同时调用多个 AI 模型，比较结果，取最合理的食物
 */
async function recognizeWithVoting(
  imageBase64?: string,
  imageUrl?: string,
  fistCalibration?: FistCalibration
): Promise<RecognizeResult> {
  console.log('[AI/Vote] 开始多模型投票识别...')

  // 收集所有可用的模型调用
  const promises: Promise<RawResult>[] = []

  if (AI_CONFIG.geminiKey) {
    promises.push(
      recognizeWithGemini(imageBase64, imageUrl, fistCalibration)
        .then(result => ({ model: 'gemini', foods: result.foods, success: result.success }))
        .catch(() => ({ model: 'gemini', foods: [], success: false }))
    )
  }

  if (AI_CONFIG.zhipuKey) {
    promises.push(
      recognizeWithZhipu(imageBase64, imageUrl, fistCalibration)
        .then(result => ({ model: 'zhipu', foods: result.foods, success: result.success }))
        .catch(() => ({ model: 'zhipu', foods: [], success: false }))
    )
  }

  if (AI_CONFIG.secretKey) {
    promises.push(
      recognizeWithHunyuan(imageBase64, imageUrl, fistCalibration)
        .then(result => ({ model: 'hunyuan', foods: result.foods, success: result.success }))
        .catch(() => ({ model: 'hunyuan', foods: [], success: false }))
    )
  }

  if (promises.length === 0) {
    return { success: false, foods: [], error: '没有可用的 AI 模型，请配置 API Key' }
  }

  // 并发调用所有模型（最多等待 30 秒）
  const results = await Promise.allSettled(promises)
  const rawResults: RawResult[] = results
    .filter(r => r.status === 'fulfilled')
    .map(r => (r as PromiseFulfilledResult<RawResult>).value)

  console.log(`[AI/Vote] 收到 ${rawResults.length} 个模型结果:`, rawResults.map(r => `${r.model}: ${r.foods.length}个食物`))

  if (rawResults.length === 0) {
    return { success: false, foods: [], error: '所有模型调用均失败' }
  }

  if (rawResults.length === 1) {
    // 只有一个模型，返回其结果
    return { success: true, foods: rawResults[0].foods }
  }

  // ========== 投票逻辑 ==========
  const candidates: VoteCandidate[] = []

  // 将每个模型的结果加入候选
  for (const raw of rawResults) {
    if (!raw.success || raw.foods.length === 0) continue

    for (const food of raw.foods) {
      // 检查是否有相似的候选食物（名称相似度 > 0.6）
      const existing = candidates.find(c =>
        calculateSimilarity(c.name, food.name) > 0.6 ||
        calculateSimilarity(c.name, food.name) > 0.5 && c.weight === food.weight
      )

      if (existing) {
        // 合并：更新数值（取平均），增加投票
        existing.calories = Math.round((existing.calories + food.calories) / 2)
        existing.protein = Math.round((existing.protein + food.protein) / 2 * 10) / 10
        existing.fat = Math.round((existing.fat + food.fat) / 2 * 10) / 10
        existing.carbs = Math.round((existing.carbs + food.carbs) / 2 * 10) / 10
        existing.weight = Math.round((existing.weight + food.weight) / 2)
        existing.votes.push(raw.model)
        // 保留更高的置信度
        existing.confidence = Math.max(existing.confidence, food.confidence)
      } else {
        // 新候选
        candidates.push({
          name: food.name,
          calories: food.calories,
          protein: food.protein,
          fat: food.fat,
          carbs: food.carbs,
          weight: food.weight,
          confidence: food.confidence,
          votes: [raw.model],
          source: raw.model,
        })
      }
    }
  }

  // ========== 筛选最终结果 ==========
  // 按投票数降序排序
  candidates.sort((a, b) => b.votes.length - a.votes.length)

  // 过滤掉低投票食物（只有 1 票且有多个模型时，可能是误识别）
  const minVotes = rawResults.length > 2 ? 2 : 1
  const finalFoods = candidates
    .filter(c => c.votes.length >= minVotes)
    .map(c => ({
      name: c.name,
      calories: c.calories,
      protein: c.protein,
      fat: c.fat,
      carbs: c.carbs,
      weight: c.weight,
      confidence: Math.min(c.confidence * (c.votes.length / rawResults.length) + 0.1, 1),
    }))

  // 如果最终结果为空（所有食物都被过滤），使用投票最多的 1-2 个
  if (finalFoods.length === 0 && candidates.length > 0) {
    const top = candidates.slice(0, Math.min(2, candidates.length))
    finalFoods.push(...top.map(c => ({
      name: c.name,
      calories: c.calories,
      protein: c.protein,
      fat: c.fat,
      carbs: c.carbs,
      weight: c.weight,
      confidence: c.confidence * 0.8, // 降低置信度因为没有共识
    })))
  }

  console.log('[AI/Vote] 投票结果:', finalFoods.map(f => `${f.name}(置信度:${(f.confidence * 100).toFixed(0)}%)`))

  return {
    success: true,
    foods: finalFoods,
  }
}

/**
 * 计算两个中文食物名称的相似度（基于字符重叠）
 */
function calculateSimilarity(a: string, b: string): number {
  if (!a || !b) return 0
  // 清理名称
  const cleanA = a.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '').toLowerCase()
  const cleanB = b.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '').toLowerCase()

  if (cleanA === cleanB) return 1

  // 包含检查
  if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return 0.8

  // 字符集交集
  const setA = new Set(cleanA.split(''))
  const setB = new Set(cleanB.split(''))
  const intersection = [...setA].filter(c => setB.has(c)).length
  const union = new Set([...cleanA, ...cleanB]).size

  return union > 0 ? intersection / union : 0
}

// ============================================================
// OpenClaw 代理模式（通过自己的服务器调用混元，API Key 不暴露）
// ============================================================

/**
 * 使用 OpenClaw 代理识别食物
 *
 * 流程：前端 → OpenClaw 服务器 → 腾讯云混元视觉 API
 * 优势：API Key 在服务器端，不暴露；服务器端可优化 Prompt 和后处理
 */
async function recognizeWithOpenClaw(
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
