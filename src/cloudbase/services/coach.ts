/**
 * 教练服务
 */

import { getApp } from '../index'
import { COLLECTIONS } from '../config'
import type { ICoach, ICoachMember } from '../types'
import { getCurrentUser } from './auth'

// ============================================================
// 教练相关
// ============================================================

/**
 * 获取教练列表
 */
export async function getCoaches(options?: {
  specialty?: string
  verified?: boolean
  limit?: number
}): Promise<ICoach[]> {
  try {
    const db = getApp()?.database()
    if (!db) return []

    let query = db.collection(COLLECTIONS.COACHES)

    if (options?.verified !== undefined) {
      // @ts-expect-error SDK 类型与本地定义不匹配
      query = query.where({ verified: options.verified })
    }

    if (options?.specialty) {
      // @ts-expect-error regexp 方法存在但类型定义不完整
      query = query.where({ specialty: db.command.regexp(new RegExp(options.specialty)) })
    }

    const res = await query
      .orderBy('rating', 'desc')
      .limit(options?.limit || 100)
      .get()

    return res.data as ICoach[]
  } catch (error) {
    console.error('[Coach] 获取教练列表失败:', error)
    return []
  }
}

/**
 * 获取教练详情
 */
export async function getCoach(userId: string): Promise<ICoach | null> {
  try {
    const db = getApp()?.database()
    if (!db) return null

    const res = await db
      .collection(COLLECTIONS.COACHES)
      .where({ user_id: userId })
      .limit(1)
      .get()

    if (res.data && res.data.length > 0) {
      return res.data[0] as ICoach
    }
    return null
  } catch (error) {
    console.error('[Coach] 获取教练详情失败:', error)
    return null
  }
}

/**
 * 申请成为教练
 */
export async function applyAsCoach(data: {
  title: string
  specialty: string
  bio: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getApp()?.database()
    if (!db) return { success: false, error: 'SDK 未初始化' }

    // 创建教练申请（待审核状态）
    await db.collection(COLLECTIONS.COACHES).add({
      ...data,
      rating: 0,
      member_count: 0,
      verified: false, // 待审核
      created_at: new Date(),
    })

    return { success: true }
  } catch (error: unknown) {
    console.error('[Coach] 申请失败:', error)
    return { success: false, error: (error as Error).message || '申请失败' }
  }
}

// ============================================================
// 教练-会员关系
// ============================================================

/**
 * 绑定教练
 */
export async function bindCoach(
  coachId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getApp()?.database()
    if (!db) return { success: false, error: 'SDK 未初始化' }

    // 获取当前用户 ID
    const currentUser = getCurrentUser()
    const memberId = currentUser?.uid || currentUser?._id
    if (!memberId) return { success: false, error: '用户未登录' }

    // 创建绑定关系
    await db.collection(COLLECTIONS.COACH_MEMBERS).add({
      coach_id: coachId,
      member_id: memberId,
      status: 'active',
      start_date: new Date(),
      created_at: new Date(),
    })

    // 更新教练的会员数量
    await db
      .collection(COLLECTIONS.COACHES)
      .where({ _id: coachId })
      .update({
        member_count: db.command.inc(1),
      })

    return { success: true }
  } catch (error: unknown) {
    console.error('[Coach] 绑定教练失败:', error)
    return { success: false, error: (error as Error).message || '绑定失败' }
  }
}

/**
 * 解绑教练
 */
export async function unbindCoach(
  coachId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getApp()?.database()
    if (!db) return { success: false, error: 'SDK 未初始化' }

    // 获取当前用户 ID
    const currentUser = getCurrentUser()
    const memberId = currentUser?.uid || currentUser?._id
    if (!memberId) return { success: false, error: '用户未登录' }

    // 更新关系状态
    await db
      .collection(COLLECTIONS.COACH_MEMBERS)
      .where({
        coach_id: coachId,
        member_id: memberId,
        status: 'active',
      })
      .update({
        status: 'ended',
        end_date: new Date(),
      })

    // 减少教练的会员数量
    await db
      .collection(COLLECTIONS.COACHES)
      .where({ _id: coachId })
      .update({
        member_count: db.command.inc(-1),
      })

    return { success: true }
  } catch (error: unknown) {
    console.error('[Coach] 解绑教练失败:', error)
    return { success: false, error: (error as Error).message || '解绑失败' }
  }
}

/**
 * 获取我的教练
 */
export async function getMyCoach(): Promise<ICoach | null> {
  try {
    const db = getApp()?.database()
    if (!db) return null

    // 获取当前用户 ID
    const currentUser = getCurrentUser()
    const memberId = currentUser?.uid || currentUser?._id
    if (!memberId) return null

    // 查找当前绑定关系
    const relation = await db
      .collection(COLLECTIONS.COACH_MEMBERS)
      .where({
        member_id: memberId,
        status: 'active',
      })
      .limit(1)
      .get()

    if (!relation.data || relation.data.length === 0) {
      return null
    }

    // 获取教练信息
    const coachId = relation.data[0].coach_id
    return await getCoach(coachId)
  } catch (error) {
    console.error('[Coach] 获取我的教练失败:', error)
    return null
  }
}

/**
 * 获取教练的会员列表
 */
export async function getCoachMembers(
  coachId: string
): Promise<ICoachMember[]> {
  try {
    const db = getApp()?.database()
    if (!db) return []

    const res = await db
      .collection(COLLECTIONS.COACH_MEMBERS)
      .where({
        coach_id: coachId,
        status: 'active',
      })
      .get()

    return res.data as ICoachMember[]
  } catch (error) {
    console.error('[Coach] 获取会员列表失败:', error)
    return []
  }
}

// ============================================================
// 计划分配
// ============================================================

import type { IAssignedPlan, TrainingItem } from '../types'

/**
 * 教练给会员分配训练计划
 */
export async function assignPlan(params: {
  plan: {
    id: string
    name: string
    type: string
    description: string
    duration: number
    targetWeight?: number
    targetFat?: number
    targetWaist?: number
    caloriesMin?: number
    caloriesMax?: number
    protein?: number
    fat?: number
    carbs?: number
    training?: TrainingItem[]
    notes?: string
  }
  memberId: string
  coachId: string
  startDate?: Date
}): Promise<{ success: boolean; assignedPlanId?: string; error?: string }> {
  try {
    const db = getApp()?.database()
    if (!db) return { success: false, error: 'SDK 未初始化' }

    const { plan, memberId, coachId, startDate } = params

    const assignedAt = new Date()
    const endDate = startDate
      ? new Date(startDate.getTime() + (plan.duration || 4) * 7 * 24 * 60 * 60 * 1000)
      : undefined

    const doc = {
      plan_id: plan.id,
      member_id: memberId,
      coach_id: coachId,
      plan_name: plan.name,
      plan_type: plan.type,
      plan_description: plan.description,
      duration: plan.duration,
      target_weight: plan.targetWeight,
      target_fat: plan.targetFat,
      target_waist: plan.targetWaist,
      calories_min: plan.caloriesMin,
      calories_max: plan.caloriesMax,
      protein: plan.protein,
      fat: plan.fat,
      carbs: plan.carbs,
      training: plan.training || [],
      notes: plan.notes,
      assigned_at: assignedAt,
      start_date: startDate || assignedAt,
      end_date: endDate,
      status: 'active',
      created_at: assignedAt,
    }

    const res = await db.collection(COLLECTIONS.ASSIGNED_PLANS).add({ data: doc }) as { _id?: string }

    return { success: true, assignedPlanId: res._id }
  } catch (error: unknown) {
    console.error('[Coach] 分配计划失败:', error)
    return { success: false, error: (error as Error).message || '分配失败' }
  }
}

/**
 * 获取会员被分配的计划列表
 */
export async function getMemberAssignedPlans(
  memberId: string
): Promise<IAssignedPlan[]> {
  try {
    const db = getApp()?.database()
    if (!db) return []

    const res = await db
      .collection(COLLECTIONS.ASSIGNED_PLANS)
      .where({ member_id: memberId, status: 'active' })
      .orderBy('assigned_at', 'desc')
      .get()

    return res.data as IAssignedPlan[]
  } catch (error) {
    console.error('[Coach] 获取会员计划失败:', error)
    return []
  }
}

/**
 * 获取教练已分配的计划记录
 */
export async function getCoachAssignedPlans(
  coachId: string
): Promise<IAssignedPlan[]> {
  try {
    const db = getApp()?.database()
    if (!db) return []

    const res = await db
      .collection(COLLECTIONS.ASSIGNED_PLANS)
      .where({ coach_id: coachId })
      .orderBy('assigned_at', 'desc')
      .get()

    return res.data as IAssignedPlan[]
  } catch (error) {
    console.error('[Coach] 获取已分配计划失败:', error)
    return []
  }
}

// ============================================================
// 教练端 - 获取会员数据
// ============================================================

import type { IMeal, IExercise, IBodyRecord } from '../types'

/**
 * 获取会员的饮食记录（指定日期）
 */
export async function getMemberMeals(
  memberId: string,
  date?: Date
): Promise<IMeal[]> {
  try {
    const db = getApp()?.database()
    if (!db) return []

    let query = db.collection(COLLECTIONS.MEALS).where({ user_id: memberId })

    // 日期筛选
    if (date) {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      // @ts-expect-error SDK 类型与本地定义不匹配
      query = query.where({
        meal_date: db.command.gte(startOfDay.getTime()).and(db.command.lte(endOfDay.getTime())),
      })
    }

    const res = await query
      .orderBy('meal_date', 'asc')
      .limit(50)
      .get()

    return res.data as IMeal[]
  } catch (error) {
    console.error('[Coach] 获取会员饮食记录失败:', error)
    return []
  }
}

/**
 * 获取会员的运动记录（最近N天）
 */
export async function getMemberExercises(
  memberId: string,
  days: number = 7
): Promise<IExercise[]> {
  try {
    const db = getApp()?.database()
    if (!db) return []

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    const res = await db
      .collection(COLLECTIONS.EXERCISES)
      .where({
        user_id: memberId,
        exercise_date: db.command.gte(startDate.getTime()),
      })
      .orderBy('exercise_date', 'desc')
      .limit(days)
      .get()

    return res.data as IExercise[]
  } catch (error) {
    console.error('[Coach] 获取会员运动记录失败:', error)
    return []
  }
}

/**
 * 获取会员的体成分记录（最近N条）
 */
export async function getMemberBodyRecords(
  memberId: string,
  limit: number = 10
): Promise<IBodyRecord[]> {
  try {
    const db = getApp()?.database()
    if (!db) return []

    const res = await db
      .collection(COLLECTIONS.BODY_RECORDS)
      .where({ user_id: memberId })
      .orderBy('record_date', 'desc')
      .limit(limit)
      .get()

    return res.data as IBodyRecord[]
  } catch (error) {
    console.error('[Coach] 获取会员体成分记录失败:', error)
    return []
  }
}

/**
 * 保存/更新会员的训练方案备注
 */
export async function saveMemberPlanNotes(
  memberId: string,
  coachId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getApp()?.database()
    if (!db) return { success: false, error: 'SDK 未初始化' }

    // 查找该会员的活跃方案
    const existingPlan = await db
      .collection(COLLECTIONS.ASSIGNED_PLANS)
      .where({
        member_id: memberId,
        coach_id: coachId,
        status: 'active',
      })
      .limit(1)
      .get()

    if (existingPlan.data && existingPlan.data.length > 0) {
      // 更新现有方案
      const planId = existingPlan.data[0]._id
      await db
        .collection(COLLECTIONS.ASSIGNED_PLANS)
        .doc(planId)
        .update({
          notes,
          updated_at: new Date(),
        })
    } else {
      // 创建新方案（仅有备注）
      await db.collection(COLLECTIONS.ASSIGNED_PLANS).add({
        member_id: memberId,
        coach_id: coachId,
        plan_name: '教练备注',
        notes,
        status: 'active',
        created_at: new Date(),
      })
    }

    return { success: true }
  } catch (error: unknown) {
    console.error('[Coach] 保存会员方案备注失败:', error)
    return { success: false, error: (error as Error).message || '保存失败' }
  }
}
