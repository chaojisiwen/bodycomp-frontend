/**
 * AI 识别服务 - 类型定义
 */

// ============================================================
// 食物识别相关
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
// 拳头校准
// ============================================================

export interface FistCalibrationResult {
  success: boolean
  data?: FistCalibration
  error?: string
  isMock?: boolean
}

// ============================================================
// 身体成分识别
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

// ============================================================
// 运动识别
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

