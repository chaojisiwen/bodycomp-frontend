/**
 * 运动记录服务
 */

import { getApp } from '../index'
import { COLLECTIONS } from '../config'
import type { IExercise, IExerciseInput } from '../types'
import { getCurrentUserId } from './utils'

// ============================================================
// CRUD 操作
// ============================================================

/**
 * 获取运动记录列表
 */
export async function getExercises(options?: {
  date?: Date
  limit?: number
  offset?: number
}): Promise<IExercise[]> {
  try {
    const db = getApp()?.database()
    if (!db) return []

    let query: any = db.collection(COLLECTIONS.EXERCISES)

    // 用户过滤（必须，防止返回所有人的数据）
    const uid = getCurrentUserId()
    if (uid) {
      query = query.where({ user_id: uid })
    }

    // 日期筛选
    if (options?.date) {
      const startOfDay = new Date(options.date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(options.date)
      endOfDay.setHours(23, 59, 59, 999)

      query = query.where({
        exercise_date: db.command.gte(startOfDay.getTime()).and(db.command.lte(endOfDay.getTime())),
      })
    }

    // 排序和分页
    const res = await query
      .orderBy('exercise_date', 'desc')
      .limit(options?.limit || 100)
      .skip(options?.offset || 0)
      .get()

    return res.data as IExercise[]
  } catch (error) {
    console.error('[Exercises] 获取列表失败:', error)
    return []
  }
}

/**
 * 获取单条运动记录
 */
export async function getExercise(id: string): Promise<IExercise | null> {
  try {
    const db = getApp()?.database()
    if (!db) return null

    const res = await db.collection(COLLECTIONS.EXERCISES).doc(id).get()

    if (res.data && res.data.length > 0) {
      return res.data[0] as IExercise
    }
    return null
  } catch (error) {
    console.error('[Exercises] 获取详情失败:', error)
    return null
  }
}

/**
 * 创建运动记录
 */
export async function createExercise(
  data: Omit<IExerciseInput, 'total_duration' | 'total_calories'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const db = getApp()?.database()
    if (!db) return { success: false, error: 'SDK 未初始化' }

    // 计算总量
    const total_duration = data.exercises.reduce((acc, ex) => acc + ex.duration, 0)
    const total_calories = data.exercises.reduce((acc, ex) => acc + ex.calories, 0)

    const res = await db.collection(COLLECTIONS.EXERCISES).add({
      ...data,
      total_duration,
      total_calories,
      // 确保 exercise_date 是 Date 对象
      exercise_date: data.exercise_date ? new Date(data.exercise_date) : new Date(),
      created_at: new Date(),
    })

    return { success: true, id: res.id }
  } catch (error: unknown) {
    console.error('[Exercises] 创建失败:', error)
    return { success: false, error: (error as Error).message || '创建失败' }
  }
}

/**
 * 更新运动记录
 */
export async function updateExercise(
  id: string,
  data: Partial<IExercise>
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getApp()?.database()
    if (!db) return { success: false, error: 'SDK 未初始化' }

    // 如果更新了运动项目，重新计算总量
    const updateData: Record<string, unknown> = { ...data }
    if (data.exercises) {
      updateData.total_duration = data.exercises.reduce((acc, ex) => acc + ex.duration, 0)
      updateData.total_calories = data.exercises.reduce((acc, ex) => acc + ex.calories, 0)
    }

    await db.collection(COLLECTIONS.EXERCISES).doc(id).update(updateData)

    return { success: true }
  } catch (error: unknown) {
    console.error('[Exercises] 更新失败:', error)
    return { success: false, error: (error as Error).message || '更新失败' }
  }
}

/**
 * 删除运动记录
 */
export async function deleteExercise(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getApp()?.database()
    if (!db) return { success: false, error: 'SDK 未初始化' }

    await db.collection(COLLECTIONS.EXERCISES).doc(id).remove()
    return { success: true }
  } catch (error: unknown) {
    console.error('[Exercises] 删除失败:', error)
    return { success: false, error: (error as Error).message || '删除失败' }
  }
}

// ============================================================
// 统计与分析
// ============================================================

/**
 * 获取某日的运动统计
 */
export async function getDailyExerciseSummary(
  date: Date = new Date()
): Promise<{
  total_duration: number
  total_calories: number
  exercise_count: number
  exercises: IExercise[]
}> {
  try {
    const exercises = await getExercises({ date })

    const totals = exercises.reduce(
      (acc, ex) => ({
        total_duration: acc.total_duration + ex.total_duration,
        total_calories: acc.total_calories + ex.total_calories,
      }),
      { total_duration: 0, total_calories: 0 }
    )

    return { ...totals, exercise_count: exercises.length, exercises }
  } catch (error) {
    console.error('[Exercises] 获取日统计失败:', error)
    return { total_duration: 0, total_calories: 0, exercise_count: 0, exercises: [] }
  }
}

/**
 * 获取运动趋势（最近 N 周）
 */
export async function getExerciseTrend(
  weeks: number = 4
): Promise<{ week: string; duration: number; calories: number }[]> {
  try {
    const db = getApp()?.database()
    if (!db) return []

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - weeks * 7)

    const whereCondition: Record<string, unknown> = {
      exercise_date: db.command.gte(startDate.getTime()),
    }
    const uid = getCurrentUserId()
    if (uid) whereCondition.user_id = uid

    const res = await db
      .collection(COLLECTIONS.EXERCISES)
      .where(whereCondition)
      .field({ exercise_date: true, total_duration: true, total_calories: true })
      .get()

    // 按周分组
    const weeklyMap = new Map<string, { duration: number; calories: number }>()

    for (const ex of res.data as IExercise[]) {
      const date = new Date(ex.exercise_date)
      const weekStart = getWeekStart(date)
      const weekKey = weekStart.toISOString().split('T')[0]

      const existing = weeklyMap.get(weekKey) || { duration: 0, calories: 0 }
      weeklyMap.set(weekKey, {
        duration: existing.duration + ex.total_duration,
        calories: existing.calories + ex.total_calories,
      })
    }

    return Array.from(weeklyMap.entries())
      .map(([week, data]) => ({ week, ...data }))
      .sort((a, b) => a.week.localeCompare(b.week))
  } catch (error) {
    console.error('[Exercises] 获取趋势失败:', error)
    return []
  }
}

/**
 * 获取一周的哪天运动最多
 */
export async function getBestDayOfWeek(): Promise<{ day: number; duration: number } | null> {
  try {
    const db = getApp()?.database()
    if (!db) return null

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    const whereCondition: Record<string, unknown> = {
      exercise_date: db.command.gte(startDate.getTime()),
    }
    const trendUid = getCurrentUserId()
    if (trendUid) whereCondition.user_id = trendUid

    const res = await db
      .collection(COLLECTIONS.EXERCISES)
      .where(whereCondition)
      .field({ exercise_date: true, total_duration: true })
      .get()

    // 按星期几分组
    const dayMap = new Map<number, number>()

    for (const ex of res.data as IExercise[]) {
      const day = new Date(ex.exercise_date).getDay()
      dayMap.set(day, (dayMap.get(day) || 0) + ex.total_duration)
    }

    let bestDay = 0
    let maxDuration = 0

    dayMap.forEach((duration, day) => {
      if (duration > maxDuration) {
        maxDuration = duration
        bestDay = day
      }
    })

    return maxDuration > 0 ? { day: bestDay, duration: maxDuration } : null
  } catch (error) {
    console.error('[Exercises] 获取最佳运动日失败:', error)
    return null
  }
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 获取某日期所在周的第一天（周一）
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}
