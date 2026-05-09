/**
 * 会员个人信息状态管理
 *
 * 使用 persist 持久化本地，避免页面切换时数据丢失。
 * 登出时由 AuthContext 清理 localStorage，防止跨用户残留。
 * 登录后 fetchProfile() 从云端拉取最新数据覆盖本地。
 * 注意：name 字段采用「用户编辑优先」策略——用户在本地修改过名字后，
 * 云端 fetch 不会覆盖本地已编辑的名字。
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getUserInfo } from '@/cloudbase/services'

interface UserGoal {
  targetWeight: number
  targetBodyFat: number
  targetDate: string
}

interface UserProfile {
  name: string
  phone: string
  avatar: string
  memberId: string
  checkInDays: number
  goal: UserGoal
}

const DEFAULT_PROFILE: UserProfile = {
  name: '用户',
  phone: '',
  avatar: '',
  memberId: '',
  checkInDays: 0,
  goal: {
    targetWeight: 70,
    targetBodyFat: 18,
    targetDate: '',
  },
}

interface CoachInfo {
  id: string
  name: string
  tags: string[]
  rating: number
  inviteCode?: string
}

interface ProfileState {
  profile: UserProfile
  currentCoach: CoachInfo | null
  hasCoach: boolean
  isLoading: boolean
  error: string | null
  /** 用户是否在本地编辑过 name（防止 fetchProfile 时被云端覆盖） */
  nameEdited: boolean

  fetchProfile: () => Promise<void>
  setProfile: (partial: Partial<UserProfile>) => void
  setGoal: (goal: Partial<UserGoal>) => void
  setCoach: (coach: CoachInfo | null) => void
  setHasCoach: (has: boolean) => void
  incrementCheckInDays: () => void
  reset: () => void
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: { ...DEFAULT_PROFILE },
      currentCoach: null,
      hasCoach: false,
      isLoading: false,
      error: null,
      nameEdited: false,

      fetchProfile: async () => {
        set({ isLoading: true })
        try {
          const user = await getUserInfo()
          if (user) {
            set((state) => ({
              profile: {
                ...state.profile,
                // name: 用户编辑过则保留本地（nameEdited=true），否则用云端值
                name: state.nameEdited
                  ? state.profile.name || DEFAULT_PROFILE.name
                  : (user.nickname || user.name || state.profile.name),
                phone: user.phone || state.profile.phone,
                avatar: user.avatar || state.profile.avatar,
                memberId: user._id || state.profile.memberId,
                goal: {
                  ...state.profile.goal,
                  targetWeight: user.target_weight || state.profile.goal.targetWeight,
                },
              },
              isLoading: false,
            }))

            // 异步拉取教练绑定状态
            try {
              const { getMyCoach } = await import('@/cloudbase/services/coach')
              const coach = await getMyCoach()
              if (coach) {
                const coachInfo: CoachInfo = {
                  id: coach._id || coach.user_id || '',
                  name: coach.name || coach.title || '教练',
                  tags: Array.isArray(coach.specialty)
                    ? coach.specialty
                    : coach.specialty
                    ? [coach.specialty]
                    : [],
                  rating: coach.rating || 0,
                  inviteCode: coach.invite_code || undefined,
                }
                set({ currentCoach: coachInfo, hasCoach: true })
              } else {
                const s = useProfileStore.getState()
                if (!s.hasCoach) {
                  set({ currentCoach: null, hasCoach: false })
                }
              }
            } catch {
              // 静默
            }
          } else {
            set({ isLoading: false })
          }
        } catch {
          set({ isLoading: false, error: '获取用户信息失败' })
        }
      },

      setProfile: (partial) =>
        set((state) => ({
          profile: { ...state.profile, ...partial },
          // 如果更新了 name，标记 nameEdited
          nameEdited: partial.name !== undefined ? true : state.nameEdited,
        })),

      setGoal: (goal) =>
        set((state) => ({
          profile: { ...state.profile, goal: { ...state.profile.goal, ...goal } },
        })),

      setCoach: (coach) => set({ currentCoach: coach }),

      setHasCoach: (has) => set({ hasCoach: has }),

      incrementCheckInDays: () =>
        set((state) => ({
          profile: { ...state.profile, checkInDays: state.profile.checkInDays + 1 },
        })),

      reset: () =>
        set({
          profile: { ...DEFAULT_PROFILE },
          currentCoach: null,
          hasCoach: false,
          isLoading: false,
          error: null,
          nameEdited: false,
        }),
    }),
    {
      name: 'profile-store',
      partialize: (state) => ({
        profile: state.profile,
        currentCoach: state.currentCoach,
        hasCoach: state.hasCoach,
        nameEdited: state.nameEdited,
      }),
    }
  )
)
