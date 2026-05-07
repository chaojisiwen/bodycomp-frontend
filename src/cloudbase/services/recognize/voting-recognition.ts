// ============================================================
// 多模型投票识别
// ============================================================

import type { RecognizedFoodItem, RecognizeResult, FistCalibration } from './types'
import { recognizeWithGemini } from './gemini-recognition'
import { recognizeWithZhipu } from './zhipu-recognition'
import { recognizeWithHunyuan } from './hunyuan-recognition'
import { AI_CONFIG } from './config'

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
export async function recognizeWithVoting(
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
