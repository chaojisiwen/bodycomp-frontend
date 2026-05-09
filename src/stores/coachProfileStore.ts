/**
 * 教练个人信息状态管理
 *
 * 管理教练头像、昵称、资质、评分、会员数等数据
 * 采用「用户编辑优先」策略——用户在本地修改过名字后，
 * fetchProfile 不会用云端数据覆盖已编辑的名字。
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getCoach } from '@/cloudbase/services/coach'
import { getCoachMembers } from '@/cloudbase/services/coach'
import type { ICoach } from '@/cloudbase/types'
import { getCurrentUserId } from '@/cloudbase/services/utils'

// ============================================================
// 类型定义
// ============================================================

export interface CoachProfile {
  id: string
  name: string
  avatar?: string
  phone?: string
  title?: string        // 职称
  specialty?: string   // 专长
  bio?: string          // 简介
  rating: number        // 评分
  memberCount: number   // 会员数
  certifications: string[]  // 资质证书
  years: number         // 从业年限
  verified: boolean     // 是否认证
}

interface CoachProfileState {
  // 状态
  profile: CoachProfile | null
  isLoading: boolean
  error: string | null
  lastSyncedAt: number | null
  /** 用户是否在本地编辑过 name（防止 fetchProfile 时被云端覆盖） */
  nameEdited: boolean

  // 操作
  fetchProfile: (userId?: string) => Promise<void>
  updateProfile: (data: Partial<CoachProfile>) => void
}

// ============================================================
// 默认值
// ============================================================

const DEFAULT_PROFILE: CoachProfile = {
  id: '',
  name: '教练',
  avatar: undefined,
  phone: '',
  title: '',
  specialty: '',
  bio: '',
  rating: 0,
  memberCount: 0,
  certifications: [],
  years: 0,
  verified: false,
}

// ============================================================
// Store
// ============================================================

export const useCoachProfileStore = create<CoachProfileState>()(
  persist(
    (set) => ({
      profile: null,
      isLoading: false,
      error: null,
      lastSyncedAt: null,
      nameEdited: false,

      // 从云数据库拉取教练信息
      fetchProfile: async (userId?: string) => {
        set({ isLoading: true, error: null })

        try {
          // 如果没有传入 userId，尝试从 localStorage 获取
          const coachId = userId || localStorage.getItem('coach_id') || getCurrentUserId()

          // 并行获取教练信息和会员列表
          const [coachData, membersData] = await Promise.all([
            getCoach(coachId),
            getCoachMembers(coachId),
          ])

          if (coachData) {
            // 获取当前 state（persist 可能已恢复本地数据）
            const currentState = useCoachProfileStore.getState()

            const profile: CoachProfile = {
              id: coachId,
              // name: 用户编辑过则保留本地（nameEdited=true），否则用云端值
              name: currentState.nameEdited
                ? currentState.profile?.name || DEFAULT_PROFILE.name
                : ((coachData as ICoach & { name?: string }).name || coachData.title || DEFAULT_PROFILE.name),
              avatar: (coachData as ICoach).avatar,
              phone: '', // 敏感信息不存储
              title: coachData.title,
              specialty: Array.isArray(coachData.specialty) ? coachData.specialty.join(', ') : coachData.specialty || '',
              bio: coachData.bio,
              rating: coachData.rating || 0,
              memberCount: membersData.length || coachData.member_count || 0,
              certifications: (coachData as ICoach).certifications || [],
              years: 0, // 从业年限暂不显示
              verified: coachData.verified || false,
            }

            set({
              profile,
              lastSyncedAt: Date.now(),
              isLoading: false,
            })

            // 保存 coach_id 供下次使用
            localStorage.setItem('coach_id', coachId)
          } else {
            // 云端没有数据，返回默认
            set({
              profile: { ...DEFAULT_PROFILE, id: coachId },
              lastSyncedAt: Date.now(),
              isLoading: false,
            })
          }
        } catch (err) {
          console.warn('[CoachProfile] 拉取失败:', err)
          const msg = (err as Error).message || '获取教练信息失败'
          set({
            error: msg,
            isLoading: false,
          })
          setTimeout(() => set((s) => s.error === msg ? { error: null } : {}), 3000)
        }
      },

      // 更新本地资料（不涉及云端）
      updateProfile: (data) => {
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...data } : { ...DEFAULT_PROFILE, ...data },
          // 如果更新了 name，标记 nameEdited
          nameEdited: data.name !== undefined ? true : state.nameEdited,
        }))
      },
    }),
    {
      name: 'coach-profile-store',
      partialize: (state) => ({
        profile: state.profile,
        lastSyncedAt: state.lastSyncedAt,
        nameEdited: state.nameEdited,
      }),
    }
  )
)
