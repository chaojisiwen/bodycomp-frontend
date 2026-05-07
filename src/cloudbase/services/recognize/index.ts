/**
 * AI 识别服务 - 统一导出
 *
 * 模块结构：
 * - types.ts         类型定义
 * - imageUtils.ts    图片工具函数
 * - config.ts        AI 配置常量
 * - prompts.ts       食物识别 Prompt 构建
 * - foodRecognition.ts  食物识别核心路由
 * - hunyuan-recognition.ts  混元视觉识别
 * - zhipu-recognition.ts   智谱 GLM-4V 识别
 * - gemini-recognition.ts   Google Gemini 识别
 * - baidu-recognition.ts    百度菜品识别
 * - voting-recognition.ts   多模型投票识别
 * - openclaw-recognition.ts OpenClaw 代理识别
 * - mock-recognition.ts     Mock 测试模式
 * - calibration.ts   拳头校准
 * - nutrition.ts     营养计算
 * - bodyRecognition.ts  身体成分识别
 * - exerciseRecognition.ts 运动识别
 */

// 类型
export type {
  FistCalibration,
  RecognizedFoodItem,
  RecognizeAnalysis,
  RecognizeResult,
  AIConfig,
  FistCalibrationResult,
  BodyCompositionResult,
  BodyRecognizeResult,
  ExerciseItemResult,
  ExerciseRecognizeResult,
} from './types'

// 工具
export { compressImage } from './imageUtils'

// 配置
export { AI_CONFIG, HUNYUAN_API_URL, HUNYUAN_MODEL, GEMINI_API_URL, ZHIPU_API_URL, ZHIPU_MODEL } from './config'

// 食物识别 - 核心路由
export { recognizeFood } from './foodRecognition'

// 食物识别 - 各模型实现
export { recognizeWithHunyuan } from './hunyuan-recognition'
export { recognizeWithZhipu } from './zhipu-recognition'
export { recognizeWithGemini } from './gemini-recognition'
export { recognizeWithBaidu } from './baidu-recognition'
export { recognizeWithVoting } from './voting-recognition'
export { recognizeWithOpenClaw } from './openclaw-recognition'
export { recognizeWithMock } from './mock-recognition'

// 辅助功能
export { calibrateFist } from './calibration'
export { buildFoodPrompt } from './prompts'
export { calculateTotalCalories, calculateTotalNutrition } from './nutrition'

// 身体成分识别
export { recognizeBodyComposition } from './bodyRecognition'

// 运动识别
export { recognizeExercise } from './exerciseRecognition'
