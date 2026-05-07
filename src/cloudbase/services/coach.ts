/**
 * 教练服务 — 重写版
 *
 * 职责范围（仅3类）：
 * 1. 教练自身资料 CRUD（coaches 集合）
 * 2. 教练-会员关系管理（coach_members 集合）
 * 3. 教练读会员数据（users + body_records 聚合查询）
 *
 * ⚠️ 原则：不在此处做业务组装，只返回原始数据库记录。
 *    业务组装（目标判断/预警计算/周数计算）在页面层完成。
 */

import { getApp } from '../index'
import { COLLECTIONS } from '../config'
import type { ICoach, ICoachMember, IUser, IBodyRecord } from '../types'
import { getCurrentUser } from './auth'
import { getCurrentUserId } from './utils'

// ============================================================
// 1. 教练自身资料
// ============================================================

/**
 * 获取当前登录教练的完整资料（coaches 集合）
 * 如果教练尚未创建资料，返回 null
 */
export async function getCoachProfile(): Promise<ICoach | null> {
  try {
    const db = getApp()?.database()
    if (!db) return null
    const userId = getCurrentUserId()
    if (!userId) return null

    const res = await db
      .collection(COLLECTIONS.COACHES)
      .where({ user_id: userId })
      .limit(1)
      .get()

    return (res.data?.[0] as ICoach) || null
  } catch (error) {
    console.error('[Coach] getCoachProfile 失败:', error)
    return null
  }
}

/**
 * 更新或创建教练资料
 * 按 user_id 匹配，不存在则创建
 */
export async function updateCoachProfile(data: {
  name?: string
  title?: string
  phone?: string
  specialty?: string
  bio?: string
  avatar?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getApp()?.database()
    if (!db) return { success: false, error: 'SDK 未初始化' }

    const userId = getCurrentUserId()
    if (!userId) return { success: false, error: '用户未登录' }

    const currentUser = getCurrentUser()
    const inviteCode = currentUser?.invite_code

    const existing = await db
      .collection(COLLECTIONS.COACHES)
      .where({ user_id: userId })
      .limit(1)
      .get()

    const docData: Record<string, unknown> = {
      ...data,
      verified: true,
      ...(inviteCode ? { invite_code: inviteCode } : {}),
      updated_at: new Date(),
    }

    if (existing.data && existing.data.length > 0) {
      const docId = existing.data[0]._id
      await db.collection(COLLECTIONS.COACHES).doc(docId).update(docData)
    } else {
      await db.collection(COLLECTIONS.COACHES).add({
        user_id: userId,
        ...data,
        ...(inviteCode ? { invite_code: inviteCode } : {}),
        rating: 0,
        member_count: 0,
        verified: true,
        created_at: new Date(),
        updated_at: new Date(),
      })
    }

    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message || '保存失败' }
  }
}

/**
 * 获取所有已审核教练列表（会员端绑定用）
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
      // @ts-expect-error
      query = query.where({ verified: options.verified })
    }

    if (options?.specialty) {
      // @ts-expect-error
      query = query.where({ specialty: db.command.regexp(new RegExp(options.specialty)) })
    }

    const res = await query
      .orderBy('rating', 'desc')
      .limit(options?.limit || 100)
      .get()

    return res.data as ICoach[]
  } catch (error) {
    console.error('[Coach] getCoaches 失败:', error)
    return []
  }
}

/**
 * 通过 user_id 查找教练
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

    return (res.data?.[0] as ICoach) || null
  } catch (error) {
    console.error('[Coach] getCoach 失败:', error)
    return null
  }
}

// ============================================================
// 2. 教练-会员关系
// ============================================================

/**
 * 会员绑定教练
 * 防重复：已有 active 关系则跳过
 */
export async function bindCoach(
  coachId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getApp()?.database()
    if (!db) return { success: false, error: 'SDK 未初始化' }

    const currentUser = getCurrentUser()
    let memberId = currentUser?.uid || currentUser?._id
    if (!memberId) {
      try {
        const stored = JSON.parse(localStorage.getItem('user') || '{}')
        memberId = stored?.id
      } catch { /* 静默 */ }
    }
    if (!memberId) return { success: false, error: '用户未登录' }

    // 防重复
    const existingRelation = await db
      .collection(COLLECTIONS.COACH_MEMBERS)
      .where({ coach_id: coachId, member_id: memberId, status: 'active' })
      .limit(1)
      .get()

    if (existingRelation.data && existingRelation.data.length > 0) {
      return { success: true }
    }

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
      .update({ member_count: db.command.inc(1) })

    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message || '绑定失败' }
  }
}

/**
 * 会员解绑教练
 */
export async function unbindCoach(
  coachId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getApp()?.database()
    if (!db) return { success: false, error: 'SDK 未初始化' }

    const currentUser = getCurrentUser()
    let memberId = currentUser?.uid || currentUser?._id
    if (!memberId) {
      try {
        const stored = JSON.parse(localStorage.getItem('user') || '{}')
        memberId = stored?.id
      } catch { /* 静默 */ }
    }
    if (!memberId) return { success: false, error: '用户未登录' }

    await db
      .collection(COLLECTIONS.COACH_MEMBERS)
      .where({ coach_id: coachId, member_id: memberId, status: 'active' })
      .update({ status: 'ended', end_date: new Date() })

    await db
      .collection(COLLECTIONS.COACHES)
      .where({ _id: coachId })
      .update({ member_count: db.command.inc(-1) })

    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message || '解绑失败' }
  }
}

/**
 * 获取我的教练（会员端）— 通过 coach_members 关系反查
 */
export async function getMyCoach(): Promise<ICoach | null> {
  try {
    const db = getApp()?.database()
    if (!db) return null

    const currentUser = getCurrentUser()
    let memberId = currentUser?.uid || currentUser?._id
    if (!memberId) {
      try {
        const stored = JSON.parse(localStorage.getItem('user') || '{}')
        memberId = stored?.id
      } catch { /* 静默 */ }
    }
    if (!memberId) return null

    const relation = await db
      .collection(COLLECTIONS.COACH_MEMBERS)
      .where({ member_id: memberId, status: 'active' })
      .limit(1)
      .get()

    if (!relation.data || relation.data.length === 0) return null

    const coachId = relation.data[0].coach_id
    return await getCoach(coachId)
  } catch (error) {
    console.error('[Coach] getMyCoach 失败:', error)
    return null
  }
}

/**
 * 获取教练的活跃会员关系列表
 * 返回 coach_members 原始记录，不含用户信息拼接
 */
export async function getCoachMembers(
  coachId: string
): Promise<ICoachMember[]> {
  try {
    const db = getApp()?.database()
    if (!db) return []

    const res = await db
      .collection(COLLECTIONS.COACH_MEMBERS)
      .where({ coach_id: coachId, status: 'active' })
      .get()

    return res.data as ICoachMember[]
  } catch (error) {
    console.error('[Coach] getCoachMembers 失败:', error)
    return []
  }
}

// ============================================================
// 3. 教练端 — 查询会员数据
// ============================================================

/**
 * 获取会员基础信息 + 最新体成分（教练端概览用）
 * 返回 users 集合 + 最新 body_record 的聚合数据
 */
export async function getMemberProfile(memberId: string): Promise<{
  id: string
  name: string
  avatar: string
  phone: string
  joinDate: string
  goal: string
  week: number
  currentWeight: number
  currentFat: number
  targetWeight: number
} | null> {
  try {
    const db = getApp()?.database()
    if (!db) return null

    // 1. 查用户信息
    const userRes = await db
      .collection(COLLECTIONS.USERS)
      .where({ _id: memberId })
      .limit(1)
      .get()

    const user = userRes.data?.[0] as IUser | undefined
    if (!user) return null

    // 2. 查最新体成分
    const bodyRes = await db
      .collection(COLLECTIONS.BODY_RECORDS)
      .where({ user_id: memberId })
      .orderBy('record_date', 'desc')
      .limit(1)
      .get()

    const body = bodyRes.data?.[0] as IBodyRecord | undefined

    // 3. 查绑定关系获取入会日期
    const relRes = await db
      .collection(COLLECTIONS.COACH_MEMBERS)
      .where({ member_id: memberId, status: 'active' })
      .limit(1)
      .get()

    const relation = relRes.data?.[0] as ICoachMember | undefined
    const joinDate = relation?.start_date
      ? new Date(relation.start_date).toISOString().split('T')[0]
      : ''

    // 4. 计算周数
    const weeks = joinDate
      ? Math.floor((Date.now() - new Date(joinDate).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
      : 1

    // 5. 判断目标
    const targetWeight = user.target_weight || 0
    const currentWeight = body?.weight || 0
    let goal = '维持'
    if (targetWeight && currentWeight) {
      if (targetWeight < currentWeight) goal = '减脂'
      else if (targetWeight > currentWeight) goal = '增肌'
    }

    return {
      id: memberId,
      name: user.name || user.nickname || '用户',
      avatar: user.avatar || '',
      phone: user.phone || '',
      joinDate,
      goal,
      week: weeks,
      currentWeight,
      currentFat: body?.body_fat || 0,
      targetWeight,
    }
  } catch (error) {
    console.error('[Coach] getMemberProfile 失败:', error)
    return null
  }
}

/**
 * 获取教练所有会员的概览列表（会员列表页用）
 * 一次查询聚合：coach_members → users → body_records → assigned_plans
 */
export async function getCoachMemberList(coachId: string): Promise<{
  id: string
  name: string
  avatar: string
  goal: string
  week: number
  weight: number
  bodyFat: number
  lastRecord: string
  hasPlan: boolean
  joinDate: string
  warnings: number
}[]> {
  try {
    const db = getApp()?.database()
    if (!db) return []

    // 1. 获取所有活跃关系
    const relations = await db
      .collection(COLLECTIONS.COACH_MEMBERS)
      .where({ coach_id: coachId, status: 'active' })
      .get()

    if (!relations.data || relations.data.length === 0) return []

    const uniqueMemberIds = [...new Set(relations.data.map((r: any) => r.member_id))] as string[]

    // 2. 批量获取用户信息
    const userRes = await db
      .collection(COLLECTIONS.USERS)
      .where({ _id: db.command.in(uniqueMemberIds) })
      .get()

    const userMap = new Map<string, IUser>()
    userRes.data?.forEach((u: IUser) => {
      if (u._id) userMap.set(u._id, u)
    })

    // 3. 批量获取最新体成分（最近30天）
    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
    const bodyRes = await db
      .collection(COLLECTIONS.BODY_RECORDS)
      .where({
        user_id: db.command.in(uniqueMemberIds),
        record_date: db.command.gte(thirtyDaysAgo),
      })
      .orderBy('record_date', 'desc')
      .get()

    const latestBodyMap = new Map<string, IBodyRecord>()
    bodyRes.data?.forEach((r: IBodyRecord) => {
      if (r.user_id && !latestBodyMap.has(r.user_id)) {
        latestBodyMap.set(r.user_id, r)
      }
    })

    // 4. 检查哪些会员有活跃计划
    const plansRes = await db
      .collection(COLLECTIONS.ASSIGNED_PLANS)
      .where({ member_id: db.command.in(uniqueMemberIds), status: 'active' })
      .get()

    const membersWithPlans = new Set<string>()
    plansRes.data?.forEach((p: any) => membersWithPlans.add(p.member_id))

    // 5. 组装数据
    const seenIds = new Set<string>()
    const members = relations.data
      .filter((r: any) => {
        if (seenIds.has(r.member_id)) return false
        seenIds.add(r.member_id)
        return true
      })
      .map((relation: any) => {
        const userId = relation.member_id
        const user = userMap.get(userId)
        const body = latestBodyMap.get(userId)
        const joinDate = relation.start_date
          ? new Date(relation.start_date).toISOString().split('T')[0]
          : ''

        const weeks = joinDate
          ? Math.floor((Date.now() - new Date(joinDate).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
          : 1

        const targetWeight = user?.target_weight || 0
        const currentWeight = body?.weight || 0
        let goal = '维持'
        if (targetWeight && currentWeight) {
          if (targetWeight < currentWeight) goal = '减脂'
          else if (targetWeight > currentWeight) goal = '增肌'
        }

        let warnings = 0
        if (body) {
          if (body.body_fat && body.body_fat > 25) warnings++
          if (body.weight && targetWeight && body.weight > targetWeight + 5) warnings++
        }

        const lastRecordDate = body?.record_date
          ? new Date(body.record_date).toISOString().split('T')[0].slice(5)
          : ''

        return {
          id: userId,
          name: user?.name || user?.nickname || '未知用户',
          avatar: user?.avatar || '',
          goal,
          week: weeks,
          weight: currentWeight,
          bodyFat: body?.body_fat || 0,
          lastRecord: lastRecordDate,
          hasPlan: membersWithPlans.has(userId),
          joinDate,
          warnings,
        }
      })

    return members
  } catch (error) {
    console.error('[Coach] getCoachMemberList 失败:', error)
    return []
  }
}

// ============================================================
// 计划分配 — 保留已有功能
// ============================================================

import type { IAssignedPlan, TrainingItem } from '../types'

/**
 * 教练给会员分配训练计划
 */
export async function assignPlan(params: {
  plan: {
    id: string; name: string; type: string; description: string; duration: number
    targetWeight?: number; targetFat?: number; targetWaist?: number
    caloriesMin?: number; caloriesMax?: number
    protein?: number; fat?: number; carbs?: number
    training?: TrainingItem[]; notes?: string
  }
  memberId: string; coachId: string; startDate?: Date
}): Promise<{ success: boolean; assignedPlanId?: string; error?: string }> {
  const { getApp, COLLECTIONS: C } = await import('../index')
  try {
    const db = getApp()?.database()
    if (!db) return { success: false, error: 'SDK 未初始化' }
    const { plan, memberId, coachId, startDate } = params
    const assignedAt = new Date()
    const endDate = startDate
      ? new Date(startDate.getTime() + (plan.duration || 4) * 7 * 24 * 60 * 60 * 1000)
      : undefined

    const res = await db.collection(C.ASSIGNED_PLANS).add({
      plan_id: plan.id, member_id: memberId, coach_id: coachId,
      plan_name: plan.name, plan_type: plan.type, plan_description: plan.description,
      duration: plan.duration,
      target_weight: plan.targetWeight, target_fat: plan.targetFat, target_waist: plan.targetWaist,
      calories_min: plan.caloriesMin, calories_max: plan.caloriesMax,
      protein: plan.protein, fat: plan.fat, carbs: plan.carbs,
      training: plan.training || [], notes: plan.notes,
      assigned_at: assignedAt, start_date: startDate || assignedAt, end_date: endDate,
      status: 'active', created_at: assignedAt,
    })

    return { success: true, assignedPlanId: (res as any)._id }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message || '分配失败' }
  }
}

/**
 * 获取会员被分配的计划列表
 */
export async function getMemberAssignedPlans(memberId: string): Promise<IAssignedPlan[]> {
  const { getApp, COLLECTIONS: C } = await import('../index')
  try {
    const db = getApp()?.database()
    if (!db) return []
    const res = await db
      .collection(C.ASSIGNED_PLANS)
      .where({ member_id: memberId, status: 'active' })
      .orderBy('assigned_at', 'desc')
      .get()
    return res.data as IAssignedPlan[]
  } catch { return [] }
}

/**
 * 保存/更新会员的训练方案备注
 */
export async function saveMemberPlanNotes(
  memberId: string, coachId: string, notes: string
): Promise<{ success: boolean; error?: string }> {
  const { getApp, COLLECTIONS: C } = await import('../index')
  try {
    const db = getApp()?.database()
    if (!db) return { success: false, error: 'SDK 未初始化' }
    const existing = await db
      .collection(C.ASSIGNED_PLANS)
      .where({ member_id: memberId, coach_id: coachId, status: 'active' })
      .limit(1).get()
    if (existing.data && existing.data.length > 0) {
      await db.collection(C.ASSIGNED_PLANS).doc(existing.data[0]._id).update({ notes, updated_at: new Date() })
    } else {
      await db.collection(C.ASSIGNED_PLANS).add({ member_id: memberId, coach_id: coachId, plan_name: '教练备注', notes, status: 'active', created_at: new Date() })
    }
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message || '保存失败' }
  }
}

// ============================================================
// 教练端 — 获取会员数据（饮食/运动/体成分）
// ============================================================

export async function getMemberMeals(memberId: string, date?: Date): Promise<any[]> {
  const { getApp, COLLECTIONS: C } = await import('../index')
  try {
    const db = getApp()?.database()
    if (!db) return []
    let query = db.collection(C.MEALS).where({ user_id: memberId })
    if (date) {
      const start = new Date(date); start.setHours(0, 0, 0, 0)
      const end = new Date(date); end.setHours(23, 59, 59, 999)
      // @ts-expect-error
      query = query.where({ meal_date: db.command.gte(start.getTime()).and(db.command.lte(end.getTime())) })
    }
    const res = await query.orderBy('meal_date', 'asc').limit(50).get()
    return res.data as any[]
  } catch { return [] }
}

export async function getMemberExercises(memberId: string, days: number = 7): Promise<any[]> {
  const { getApp, COLLECTIONS: C } = await import('../index')
  try {
    const db = getApp()?.database()
    if (!db) return []
    const startDate = new Date(); startDate.setDate(startDate.getDate() - days); startDate.setHours(0, 0, 0, 0)
    const res = await db
      .collection(C.EXERCISES)
      .where({ user_id: memberId, exercise_date: db.command.gte(startDate.getTime()) })
      .orderBy('exercise_date', 'desc')
      .limit(days)
      .get()
    return res.data as any[]
  } catch { return [] }
}

export async function getMemberBodyRecords(memberId: string, limit: number = 10): Promise<any[]> {
  const { getApp, COLLECTIONS: C } = await import('../index')
  try {
    const db = getApp()?.database()
    if (!db) return []
    const res = await db
      .collection(C.BODY_RECORDS)
      .where({ user_id: memberId })
      .orderBy('record_date', 'desc')
      .limit(limit)
      .get()
    return res.data as any[]
  } catch { return [] }
}
