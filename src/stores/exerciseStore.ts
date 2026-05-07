/**
 * 运动记录状态管理
 *
 * 管理运动数据的全局状态
 * 采用「API优先，降级兜底」策略
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { IExercise } from '@/cloudbase/types'
import {
  getExercises,
  createExercise as apiCreateExercise,
  deleteExercise as apiDeleteExercise,
} from '@/cloudbase/services/exercises'
import { getCurrentUserId } from '@/cloudbase/services/utils'

interface ExerciseState {
  // 状态
  exercises: IExercise[]
  isLoading: boolean
  error: string | null
  lastSyncedAt: number | null

  // 操作
  fetchExercises: () => Promise<void>
  addExercise: (exercise: IExercise) => Promise<void>
  updateExercise: (id: string, data: Partial<IExercise>) => void
  deleteExercise: (id: string) => Promise<void>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearExercises: () => void
}

async function syncAddToApi(exercise: IExercise) {
  try {
    // API 只接收必需字段，自动计算 totals
    await apiCreateExercise({
      user_id: exercise.user_id,
      exercise_date: exercise.exercise_date,
      exercises: exercise.exercises,
      notes: exercise.notes,
      image_url: exercise.image_url,
    })
    console.log('[ExerciseStore] 同步新增到后端成功')
  } catch (err) {
    console.warn('[ExerciseStore] 同步新增到后端失败（数据已保存在本地）:', err)
  }
}

async function syncDeleteToApi(id: string) {
  try {
    await apiDeleteExercise(id)
    console.log('[ExerciseStore] 同步删除到后端成功')
  } catch (err) {
    console.warn('[ExerciseStore] 同步删除到后端失败（本地已删除）:', err)
  }
}

export const useExerciseStore = create<ExerciseState>()(
  persist(
    (set) => ({
      // 初始状态
      exercises: [],
      isLoading: false,
      error: null,
      lastSyncedAt: null,

      // 从后端拉取数据
      fetchExercises: async () => {
        set({ isLoading: true, error: null })
        try {
          const data = await getExercises({ limit: 100 })
          if (data.length > 0) {
            set((state) => {
              const apiIds = new Set(data.map((e) => e._id))
              const localOnly = state.exercises.filter((e) => !e._id || !apiIds.has(e._id))
              const merged = [...localOnly, ...data].sort(
                (a, b) => new Date(b.exercise_date).getTime() - new Date(a.exercise_date).getTime()
              )
              return { exercises: merged, lastSyncedAt: Date.now() }
            })
          } else {
            set({ isLoading: false, lastSyncedAt: Date.now() })
            return
          }
        } catch (err) {
          console.warn('[ExerciseStore] API拉取失败，保持本地数据:', err)
          const msg = (err as Error).message || '操作失败'
          set({ error: msg })
          setTimeout(() => set((s) => s.error === msg ? { error: null } : {}), 3000)
        } finally {
          set({ isLoading: false })
        }
      },

      // 添加运动记录（先本地，后台同步API）
      addExercise: async (exercise) => {
        const tempId = `local_${Date.now()}`
        const uid = getCurrentUserId()
        const localExercise: IExercise = { ...exercise, _id: tempId, user_id: exercise.user_id || uid || '' }

        set((state) => ({
          exercises: [localExercise, ...state.exercises],
        }))

        await syncAddToApi(localExercise)
      },

      // 更新运动记录（本地同步更新，不调用API）
      updateExercise: (id, data) => {
        set((state) => ({
          exercises: state.exercises.map((e) =>
            e._id === id ? { ...e, ...data } : e
          ),
        }))
      },

      // 删除运动记录（先本地，后台同步API）
      deleteExercise: async (id) => {
        set((state) => ({
          exercises: state.exercises.filter((e) => e._id !== id),
        }))

        if (id.startsWith('local_')) return
        await syncDeleteToApi(id)
      },

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearExercises: () => set({ exercises: [] }),
    }),
    {
      name: 'exercise-store',
      partialize: (state) => ({
        exercises: state.exercises,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
)

// ============================================================
// 辅助 Hooks
// ============================================================

/**
 * 获取今日运动时长
 */
export function useTodayDuration() {
  const exercises = useExerciseStore((state) => state.exercises)
  const today = new Date().toDateString()

  return Math.round(exercises
    .filter((e) => new Date(e.exercise_date).toDateString() === today)
    .reduce((sum, e) => sum + e.total_duration, 0))
}

/**
 * 获取今日消耗热量
 */
export function useTodayCaloriesBurned() {
  const exercises = useExerciseStore((state) => state.exercises)
  const today = new Date().toDateString()

  return Math.round(exercises
    .filter((e) => new Date(e.exercise_date).toDateString() === today)
    .reduce((sum, e) => sum + e.total_calories, 0))
}

/**
 * 获取本周运动统计
 */
export function useWeekExerciseStats() {
  const exercises = useExerciseStore((state) => state.exercises)
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const weekExercises = exercises.filter(
    (e) => new Date(e.exercise_date) >= weekAgo
  )

  const totalDuration = Math.round(weekExercises.reduce(
    (sum, e) => sum + e.total_duration,
    0
  ))
  const totalCalories = Math.round(weekExercises.reduce(
    (sum, e) => sum + e.total_calories,
    0
  ))

  return {
    days: weekExercises.length,
    totalDuration,
    totalCalories,
  }
}
