/**
 * 食物识别状态管理
 *
 * 管理 AI 拍照识别结果的全局状态
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface RecognizedFoodItem {
  name: string
  calories: number
  protein: number
  fat: number
  carbs: number
  weight: number
  confidence: number
  cookingMethod?: string
}

/** AI 食物分析报告 */
export interface RecognizeAnalysis {
  mealType: string
  mealCategory: string
  ingredientBreakdown: string[]
  nutritionHighlights: string[]
  cookingMethods: Record<string, string>
  disclaimer: string
}

export interface RecognitionRecord {
  id: string
  timestamp: number
  imageData?: string // base64 图片数据（可选，节省存储）
  foods: RecognizedFoodItem[]
  analysis?: RecognizeAnalysis
  addedToIntake: boolean // 是否已添加到饮食记录
}

interface RecognizeState {
  // 状态
  history: RecognitionRecord[] // 识别历史（最近30条）
  currentResult: RecognizedFoodItem[] | null // 当前识别结果
  currentAnalysis: RecognizeAnalysis | null // 当前分析报告

  // 操作
  setCurrentResult: (foods: RecognizedFoodItem[], imageData?: string, analysis?: RecognizeAnalysis) => void
  addToHistory: (record: RecognitionRecord) => void
  markAsAdded: (id: string) => void
  clearCurrentResult: () => void
  clearHistory: () => void
}

export const useRecognizeStore = create<RecognizeState>()(
  persist(
    (set) => ({
      history: [],
      currentResult: null,
      currentAnalysis: null,

      setCurrentResult: (foods, imageData, analysis) => {
        const record: RecognitionRecord = {
          id: `rec_${Date.now()}`,
          timestamp: Date.now(),
          imageData, // 存储图片（可选）
          foods,
          analysis,
          addedToIntake: false,
        }
        set((state) => ({
          currentResult: foods,
          currentAnalysis: analysis || null,
          history: [record, ...state.history].slice(0, 30), // 保留最近30条
        }))
      },

      addToHistory: (record) => set((state) => ({
        history: [record, ...state.history].slice(0, 30),
      })),

      markAsAdded: (id) => set((state) => ({
        history: state.history.map((r) =>
          r.id === id ? { ...r, addedToIntake: true } : r
        ),
      })),

      clearCurrentResult: () => set({ currentResult: null, currentAnalysis: null }),

      clearHistory: () => set({ history: [], currentResult: null, currentAnalysis: null }),
    }),
    {
      name: 'recognize-store',
      partialize: (state) => ({
        history: state.history.map(r => ({ ...r, imageData: undefined })), // 不存储图片节省空间
      }),
    }
  )
)

// ============================================================
// 辅助 Hooks
// ============================================================

/**
 * 获取今日识别次数
 */
export function useTodayRecognitionCount() {
  const history = useRecognizeStore((state) => state.history)
  const today = new Date().toDateString()
  return history.filter((r) => new Date(r.timestamp).toDateString() === today).length
}

/**
 * 获取最近一次识别结果
 */
export function useLatestRecognition() {
  const history = useRecognizeStore((state) => state.history)
  return history[0] || null
}
