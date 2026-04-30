import { useState, useEffect } from 'react'
import { getApp, COLLECTIONS } from '@/cloudbase/services'
import type { Member } from '@/services/api'

// ────────────────────────────
// Types
// ────────────────────────────

export type WarningLevel = 'danger' | 'warning' | 'info' | 'done'

export interface WarningCard {
  id: string
  memberId: string
  memberName: string
  title: string
  level: WarningLevel
  time: string
}

export interface CheckinPhoto {
  id: string
  memberId: string
  memberName: string
  type: 'meal' | 'exercise'
  imageUrl: string
  recognized: {
    food?: string
    calories?: number
    protein?: number
    carbs?: number
    exercise?: string
    duration?: number
    consumed?: number
    intensity?: string
  }
  time: string
}

// ────────────────────────────
// useTodayTasks — 计算今日待回访/待出计划/未打卡数量
// ────────────────────────────

export function useTodayTasks(members: Member[]) {
  const today = new Date().toISOString().split('T')[0]

  const pendingFollowup = members.filter(m => m.warnings > 0).length
  const pendingPlan = members.filter(m => !m.hasPlan).length
  const pendingUpload = members.filter(m => {
    if (!m.lastRecord) return true
    return m.lastRecord !== today && m.lastRecord !== today.slice(5)
  }).length

  return { pendingFollowup, pendingPlan, pendingUpload }
}

// ────────────────────────────
// useWeekStats — 本周活跃率、日统计
// ────────────────────────────

export function useWeekStats(members: Member[]) {
  const today = new Date()
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekAgoStr = weekAgo.toISOString().split('T')[0].slice(5)

  const activeThisWeek = members.filter(m => {
    if (!m.lastRecord) return false
    return m.lastRecord >= weekAgoStr
  }).length

  const activeRate = members.length > 0 ? Math.round((activeThisWeek / members.length) * 100) : 0

  // 本周每日打卡人数（模拟柱状图数据）
  const dailyStats = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    const dayStr = d.toISOString().split('T')[0].slice(5)
    const count = members.filter(m => {
      if (!m.lastRecord) return false
      return m.lastRecord === dayStr
    }).length
    return {
      day: dayStr,
      count,
      rate: members.length > 0 ? Math.round((count / members.length) * 100) : 0,
    }
  })

  return { activeThisWeek, activeRate, dailyStats }
}

// ────────────────────────────
// useWarnings — 生成预警卡片数据
// ────────────────────────────

export function useWarnings(members: Member[]) {
  const warnings: WarningCard[] = []

  // 严重：warnings > 0 的会员
  members.filter(m => m.warnings > 0).forEach(m => {
    warnings.push({
      id: `w-danger-${m.id}`,
      memberId: m.id,
      memberName: m.name,
      title: `${m.name}有待处理预警`,
      level: 'danger',
      time: '10分钟前',
    })
  })

  // 警告：热量超标（模拟数据）
  members.slice(0, 2).forEach((m, i) => {
    warnings.push({
      id: `w-warning-${m.id}`,
      memberId: m.id,
      memberName: m.name,
      title: `${m.name}今日热量摄入偏高`,
      level: 'warning',
      time: `${30 + i * 15}分钟前`,
    })
  })

  // 关注：长期未更新（模拟）
  members
    .filter(
      m =>
        m.lastRecord &&
        m.lastRecord <
          new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0].slice(5)
    )
    .forEach(m => {
      warnings.push({
        id: `w-info-${m.id}`,
        memberId: m.id,
        memberName: m.name,
        title: `${m.name}已3天未上传体成分`,
        level: 'info',
        time: '2小时前',
      })
    })

  // 已处理样例（最多1条）
  if (warnings.length > 0) {
    const last = warnings[warnings.length - 1]
    warnings[warnings.length - 1] = {
      ...last,
      level: 'done',
      title: `${last.memberName}已补打卡`,
    }
  }

  return warnings.slice(0, 5)
}

// ────────────────────────────
// fetchRealCheckins — 从云数据库获取真实打卡数据
// ────────────────────────────

export async function fetchRealCheckins(memberIds: string[]): Promise<CheckinPhoto[]> {
  try {
    const db = getApp()?.database()
    if (!db || memberIds.length === 0) return []

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    const photos: CheckinPhoto[] = []

    // 获取饮食打卡（有图片的）
    const mealsRes = await db
      .collection(COLLECTIONS.MEALS)
      .where({
        user_id: db.command.in(memberIds),
        image_url: db.command.exists(true),
        created_at: db.command.gte(oneDayAgo),
      })
      .orderBy('created_at', 'desc')
      .limit(1)
      .get()

    mealsRes.data?.forEach((m: any) => {
      photos.push({
        id: `meal-${m._id}`,
        memberId: m.user_id,
        memberName: '会员', // 后续从 users 表获取
        type: 'meal',
        imageUrl: m.image_url,
        recognized: {
          food: m.foods?.[0]?.name || '未识别',
          calories: m.total_calories,
          protein: m.total_protein,
          carbs: m.total_carbs,
        },
        time: new Date(m.created_at).toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      })
    })

    // 获取运动打卡（有图片的）
    const exercisesRes = await db
      .collection(COLLECTIONS.EXERCISES)
      .where({
        user_id: db.command.in(memberIds),
        image_url: db.command.exists(true),
        created_at: db.command.gte(oneDayAgo),
      })
      .orderBy('created_at', 'desc')
      .limit(1)
      .get()

    exercisesRes.data?.forEach((e: any) => {
      photos.push({
        id: `exercise-${e._id}`,
        memberId: e.user_id,
        memberName: '会员',
        type: 'exercise',
        imageUrl: e.image_url,
        recognized: {
          exercise: e.exercises?.[0]?.name || '未识别',
          duration: e.total_duration,
          consumed: e.total_calories,
          intensity: e.exercises?.[0]?.intensity || '中等',
        },
        time: new Date(e.created_at).toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      })
    })

    return photos.slice(0, 2) // 最多返回2条
  } catch (error) {
    console.error('[HomePage] 获取打卡数据失败:', error)
    return []
  }
}

// ────────────────────────────
// useRecentCheckins — 最新打卡数据
// ────────────────────────────

export function useRecentCheckins(members: Member[]) {
  const [photos, setPhotos] = useState<CheckinPhoto[]>([])

  useEffect(() => {
    if (members.length === 0) {
      setPhotos([])
      return
    }

    const memberIds = members.map(m => m.id)
    fetchRealCheckins(memberIds).then(realPhotos => {
      if (realPhotos.length > 0) {
        // 补充会员名称
        const nameMap = new Map(members.map(m => [m.id, m.name]))
        const photosWithNames = realPhotos.map(p => ({
          ...p,
          memberName: nameMap.get(p.memberId) || '会员',
        }))
        setPhotos(photosWithNames)
      } else {
        // 无真实数据时使用默认图片
        setPhotos([
          {
            id: `photo-${members[0].id}-meal`,
            memberId: members[0].id,
            memberName: members[0].name,
            type: 'meal',
            imageUrl:
              'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop',
            recognized: { food: '暂无打卡数据', calories: 0, protein: 0, carbs: 0 },
            time: '--:--',
          },
          {
            id: `photo-${members[1]?.id || members[0].id}-exercise`,
            memberId: members[1]?.id || members[0].id,
            memberName: members[1]?.name || members[0].name,
            type: 'exercise',
            imageUrl:
              'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=300&h=300&fit=crop',
            recognized: { exercise: '暂无打卡数据', duration: 0, consumed: 0, intensity: '低' },
            time: '--:--',
          },
        ])
      }
    })
  }, [members])

  return photos
}
