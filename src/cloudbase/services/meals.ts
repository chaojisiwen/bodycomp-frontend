/**
 * 饮食记录服务
 */

import { getApp } from '../index'
import { COLLECTIONS } from '../config'
import type { IMeal, IMealInput, IFoodItem } from '../types'
import { getCurrentUserId } from './utils'

// ============================================================
// 辅助函数
// ============================================================

/**
 * 计算食物总营养素
 */
function calculateTotals(foods: IFoodItem[]): {
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
} {
  return foods.reduce(
    (acc, food) => ({
      total_calories: acc.total_calories + food.calories,
      total_protein: acc.total_protein + food.protein,
      total_carbs: acc.total_carbs + food.carbs,
      total_fat: acc.total_fat + food.fat,
    }),
    { total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0 }
  )
}

// ============================================================
// CRUD 操作
// ============================================================

/**
 * 获取饮食记录列表
 */
export async function getMeals(options?: {
  date?: Date
  mealType?: IMeal['meal_type']
  limit?: number
  offset?: number
}): Promise<IMeal[]> {
  try {
    const db = getApp()?.database()
    if (!db) return []

    let query = db.collection(COLLECTIONS.MEALS)

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

      // @ts-expect-error SDK 类型与本地定义不匹配
      query = query.where({
        meal_date: db.command.gte(startOfDay.getTime()).and(db.command.lte(endOfDay.getTime())),
      })
    }

    // 餐次筛选
    if (options?.mealType) {
      // @ts-expect-error SDK 类型与本地定义不匹配
      query = query.where({ meal_type: options.mealType })
    }

    // 排序和分页
    const res = await query
      .orderBy('meal_date', 'desc')
      .limit(options?.limit || 100)
      .skip(options?.offset || 0)
      .get()

    return res.data as IMeal[]
  } catch (error) {
    console.error('[Meals] 获取列表失败:', error)
    return []
  }
}

/**
 * 获取单条饮食记录
 */
export async function getMeal(id: string): Promise<IMeal | null> {
  try {
    const db = getApp()?.database()
    if (!db) return null

    const res = await db.collection(COLLECTIONS.MEALS).doc(id).get()

    if (res.data && res.data.length > 0) {
      return res.data[0] as IMeal
    }
    return null
  } catch (error) {
    console.error('[Meals] 获取详情失败:', error)
    return null
  }
}

/**
 * 创建饮食记录
 */
export async function createMeal(
  data: Omit<IMealInput, 'total_calories' | 'total_protein' | 'total_carbs' | 'total_fat'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const appInstance = getApp()
    
    if (!appInstance) {
      console.warn('[Meals] SDK 未初始化，跳过后端同步（仅本地存储）')
      return { success: false, error: 'SDK 未初始化' }
    }
    
    // 检查登录状态
    const auth = appInstance.auth()
    const loginState = await auth.getLoginState()
    
    if (!loginState) {
      console.warn('[Meals] 用户未登录，跳过后端同步（仅本地存储）')
      return { success: false, error: '用户未登录' }
    }
    
    const db = appInstance.database()

    // 计算营养素总量
    const totals = calculateTotals(data.foods)

    const res = await db.collection(COLLECTIONS.MEALS).add({
      ...data,
      ...totals,
      // 确保 meal_date 是 Date 对象，否则教练端按时间戳查询会匹配不上
      meal_date: data.meal_date ? new Date(data.meal_date) : new Date(),
      created_at: new Date(),
    })

    return { success: true, id: res.id }
  } catch (error: any) {
    console.error('[Meals] 创建失败:', error)
    return { success: false, error: error.message || '创建失败' }
  }
}

/**
 * 更新饮食记录
 */
export async function updateMeal(
  id: string,
  data: Partial<Omit<IMealInput, 'total_calories' | 'total_protein' | 'total_carbs' | 'total_fat'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getApp()?.database()
    if (!db) return { success: false, error: 'SDK 未初始化' }

    // 如果更新了食物，重新计算总量
    let updateData = { ...data }
    if (data.foods) {
      const totals = calculateTotals(data.foods)
      updateData = { ...updateData, ...totals }
    }

    await db.collection(COLLECTIONS.MEALS).doc(id).update({
      ...updateData,
    })

    return { success: true }
  } catch (error: unknown) {
    console.error('[Meals] 更新失败:', error)
    return { success: false, error: (error as Error).message || '更新失败' }
  }
}

/**
 * 删除饮食记录
 */
export async function deleteMeal(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getApp()?.database()
    if (!db) return { success: false, error: 'SDK 未初始化' }

    await db.collection(COLLECTIONS.MEALS).doc(id).remove()
    return { success: true }
  } catch (error: unknown) {
    console.error('[Meals] 删除失败:', error)
    return { success: false, error: (error as Error).message || '删除失败' }
  }
}

// ============================================================
// 统计与分析
// ============================================================

/**
 * 获取某日的饮食统计
 */
export async function getDailyMealSummary(
  date: Date = new Date()
): Promise<{
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  meals: IMeal[]
}> {
  try {
    const meals = await getMeals({ date })

    const totals = meals.reduce(
      (acc, meal) => ({
        total_calories: acc.total_calories + meal.total_calories,
        total_protein: acc.total_protein + meal.total_protein,
        total_carbs: acc.total_carbs + meal.total_carbs,
        total_fat: acc.total_fat + meal.total_fat,
      }),
      { total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0 }
    )

    return { ...totals, meals }
  } catch (error) {
    console.error('[Meals] 获取日统计失败:', error)
    return { total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0, meals: [] }
  }
}

/**
 * 获取某日每餐的统计
 */
export async function getMealBreakdown(
  date: Date = new Date()
): Promise<Record<IMeal['meal_type'], IMeal | null>> {
  try {
    const meals = await getMeals({ date })

    return {
      breakfast: meals.find((m) => m.meal_type === 'breakfast') || null,
      lunch: meals.find((m) => m.meal_type === 'lunch') || null,
      dinner: meals.find((m) => m.meal_type === 'dinner') || null,
      snack: meals.find((m) => m.meal_type === 'snack') || null,
    }
  } catch (error) {
    console.error('[Meals] 获取餐次分解失败:', error)
    return { breakfast: null, lunch: null, dinner: null, snack: null }
  }
}

/**
 * 获取热量趋势（最近 N 天）
 */
export async function getCalorieTrend(
  days: number = 7
): Promise<{ date: Date; calories: number }[]> {
  try {
    const db = getApp()?.database()
    if (!db) return []

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const whereCondition: Record<string, unknown> = {
      meal_date: db.command.gte(startDate.getTime()),
    }
    const uid = getCurrentUserId()
    if (uid) whereCondition.user_id = uid

    const res = await db
      .collection(COLLECTIONS.MEALS)
      .where(whereCondition)
      .field({ meal_date: true, total_calories: true, user_id: true })
      .get()

    // 按日期分组汇总
    const dailyMap = new Map<string, number>()

    for (const meal of res.data as IMeal[]) {
      const dateKey = new Date(meal.meal_date).toISOString().split('T')[0]
      dailyMap.set(
        dateKey,
        (dailyMap.get(dateKey) || 0) + meal.total_calories
      )
    }

    return Array.from(dailyMap.entries())
      .map(([date, calories]) => ({ date: new Date(date), calories }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  } catch (error) {
    console.error('[Meals] 获取热量趋势失败:', error)
    return []
  }
}
