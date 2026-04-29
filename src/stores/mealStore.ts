/**
 * 饮食记录状态管理
 *
 * 管理饮食数据的全局状态
 * 采用「API优先，降级兜底」策略：
 * - fetchMeals：先调API，失败回退 localStorage
 * - addMeal/updateMeal/deleteMeal：先更新本地，后台同步API
 */

import { create } from 'zustand'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { persist } from 'zustand/middleware'
import type { IMeal } from '@/cloudbase/types'
import {
  getMeals,
  createMeal as apiCreateMeal,
  updateMeal as apiUpdateMeal,
  deleteMeal as apiDeleteMeal,
} from '@/cloudbase/services/meals'

interface MealState {
  // 状态
  meals: IMeal[]
  isLoading: boolean
  error: string | null
  lastSyncedAt: number | null  // 上次同步时间戳

  // 操作
  fetchMeals: () => Promise<void>
  addMeal: (meal: IMeal) => Promise<void>
  updateMeal: (id: string, data: Partial<IMeal>) => Promise<void>
  deleteMeal: (id: string) => Promise<void>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearMeals: () => void
}

// 同步单条记录到后端（失败静默，不阻断用户体验）
async function syncAddToApi(meal: IMeal) {
  try {
    const { total_calories, total_protein, total_carbs, total_fat, ...rest } = meal
    await apiCreateMeal({
      ...rest,
      user_id: meal.user_id,
      meal_type: meal.meal_type,
      meal_date: meal.meal_date,
      foods: meal.foods,
      image_url: meal.image_url,
    })
    console.log('[MealStore] 同步新增到后端成功')
  } catch (err) {
    console.warn('[MealStore] 同步新增到后端失败（数据已保存在本地）:', err)
  }
}

async function syncDeleteToApi(id: string) {
  try {
    await apiDeleteMeal(id)
    console.log('[MealStore] 同步删除到后端成功')
  } catch (err) {
    console.warn('[MealStore] 同步删除到后端失败（本地已删除）:', err)
  }
}

export const useMealStore = create<MealState>()(
  persist(
    (set) => ({
      // 初始状态
      meals: [],
      isLoading: false,
      error: null,
      lastSyncedAt: null,

      // 从后端拉取数据（API优先，失败回退localStorage）
      fetchMeals: async () => {
        set({ isLoading: true, error: null })
        try {
          const data = await getMeals({ limit: 100 })
          if (data.length > 0) {
            // API有数据 → 覆盖本地数据（合并逻辑：保留本地独有的记录）
            set((state) => {
              const apiIds = new Set(data.map((m) => m._id))
              const localOnly = state.meals.filter((m) => !m._id || !apiIds.has(m._id))
              const merged = [...localOnly, ...data].sort(
                (a, b) => new Date(b.meal_date).getTime() - new Date(a.meal_date).getTime()
              )
              return { meals: merged, lastSyncedAt: Date.now() }
            })
          } else {
            // API无数据 → 保持本地数据
            set({ isLoading: false, lastSyncedAt: Date.now() })
            return
          }
        } catch (err) {
          console.warn('[MealStore] API拉取失败，保持本地数据:', err)
          set({ error: '拉取失败，使用本地数据' })
        } finally {
          set({ isLoading: false })
        }
      },

      // 添加饮食记录（先本地，后台同步API）
      addMeal: async (meal) => {
        // 生成临时ID（用于本地，去重）
        const tempId = `local_${Date.now()}`
        const localMeal: IMeal = { ...meal, _id: tempId }

        // 立即更新本地（用户无感知）
        set((state) => ({
          meals: [localMeal, ...state.meals],
          lastSyncedAt: Date.now(),
        }))

        // 同步到后端（失败不阻断）
        await syncAddToApi(localMeal)
      },

      // 更新饮食记录（先本地，后台同步API）
      updateMeal: async (id, data) => {
        // 立即更新本地
        set((state) => ({
          meals: state.meals.map((m) =>
            m._id === id ? { ...m, ...data } : m
          ),
        }))

        // 如果是本地临时ID，不同步到后端（后端尚未创建）
        if (id.startsWith('local_')) return
        try {
          await apiUpdateMeal(id, data)
        } catch (err) {
          console.warn('[MealStore] 同步更新失败（本地已更新）:', err)
        }
      },

      // 删除饮食记录（先本地，后台同步API）
      deleteMeal: async (id) => {
        // 立即从本地删除
        set((state) => ({
          meals: state.meals.filter((m) => m._id !== id),
        }))

        // 如果是本地临时ID，不同步到后端
        if (id.startsWith('local_')) return
        await syncDeleteToApi(id)
      },

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearMeals: () => set({ meals: [] }),
    }),
    {
      name: 'meal-store',
      partialize: (state) => ({
        meals: state.meals,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
)

// ============================================================
// 辅助函数
// ============================================================

/**
 * 计算今日摄入总量
 */
export function useTodayCalories() {
  const meals = useMealStore((state) => state.meals)
  const today = new Date().toDateString()

  return meals
    .filter((m) => new Date(m.meal_date).toDateString() === today)
    .reduce((sum, m) => sum + m.total_calories, 0)
}

/**
 * 按餐次分组今日饮食（每个餐次返回数组，支持多次添加同一餐次）
 */
export function useTodayMealsByType() {
  const meals = useMealStore((state) => state.meals)
  const today = new Date().toDateString()

  const todayMeals = meals.filter(
    (m) => new Date(m.meal_date).toDateString() === today
  )

  return {
    breakfast: todayMeals.filter((m) => m.meal_type === 'breakfast'),
    lunch: todayMeals.filter((m) => m.meal_type === 'lunch'),
    dinner: todayMeals.filter((m) => m.meal_type === 'dinner'),
    snack: todayMeals.filter((m) => m.meal_type === 'snack'),
  }
}

/**
 * 获取本周热量趋势
 */
export function useWeekCalories() {
  const meals = useMealStore((state) => state.meals)
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const weekMeals = meals.filter(
    (m) => new Date(m.meal_date) >= weekAgo
  )

  // 按天分组
  const dailyMap = new Map<string, number>()
  for (let i = 0; i < 7; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    dailyMap.set(date.toDateString(), 0)
  }

  weekMeals.forEach((m) => {
    const key = new Date(m.meal_date).toDateString()
    dailyMap.set(key, (dailyMap.get(key) || 0) + m.total_calories)
  })

  return Array.from(dailyMap.entries()).map(([date, calories]) => ({
    date,
    calories,
  }))
}
