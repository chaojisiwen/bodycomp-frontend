/**
 * 会员个人信息状态管理
 *
 * 管理头像、昵称、目标、打卡天数等个人数据
 * 采用「API优先，降级兜底」策略
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getUserInfo } from '@/cloudbase/services'

interface CoachInfo {
  id: string
  name: string
  avatar: string
  tags: string[]
  rating: number
}

interface UserGoal {
  targetWeight: number
  targetBodyFat: number
  targetDate: string
}

interface UserProfile {
  name: string
  avatar?: string
  memberId: string
  checkInDays: number
  goal: UserGoal
  /** 拳头校准数据 */
  fistCalibration?: {
    calibratedAt: number
    volumeMl: number
    widthMm: number
    depthMm: number
    heightMm: number
    confidence: number
  }
}

interface ProfileState {
  // 状态
  profile: UserProfile
  currentCoach: CoachInfo | null
  hasCoach: boolean
  isLoading: boolean
  lastSyncedAt: number | null

  // 操作
  fetchProfile: () => Promise<void>
  setProfile: (profile: Partial<UserProfile>) => void
  setGoal: (goal: Partial<UserGoal>) => void
  setCoach: (coach: CoachInfo | null) => void
  setHasCoach: (has: boolean) => void
  incrementCheckInDays: () => void
  setFistCalibration: (calibration: UserProfile['fistCalibration']) => void
}

const DEFAULT_PROFILE: UserProfile = {
  name: '王先生',
  avatar: undefined,
  memberId: 'MB202604001',
  checkInDays: 1,
  goal: {
    targetWeight: 70,
    targetBodyFat: 18,
    targetDate: '2026-07-01',
  },
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: DEFAULT_PROFILE,
      currentCoach: null,
      hasCoach: false,
      isLoading: false,
      lastSyncedAt: null,

      // 从 CloudBase 拉取用户信息（API优先，失败回退localStorage）
      fetchProfile: async () => {
        set({ isLoading: true })
        try {
          const user = await getUserInfo()
          if (user) {
            set((state) => ({
              profile: {
                ...state.profile,
                name: user.nickname || user.phone || state.profile.name,
                avatar: user.avatar,
                memberId: user._id || state.profile.memberId,
              },
              lastSyncedAt: Date.now(),
              isLoading: false,
            }))
          } else {
            set({ isLoading: false })
          }
        } catch {
          // API 失败，静默回退 localStorage
          set({ isLoading: false })
        }
      },

      setProfile: (partial) =>
        set((state) => ({
          profile: { ...state.profile, ...partial },
        })),

      setGoal: (goal) =>
        set((state) => ({
          profile: { ...state.profile, goal: { ...state.profile.goal, ...goal } },
        })),

      setCoach: (coach) => set({ currentCoach: coach }),

      setHasCoach: (has) => set({ hasCoach: has }),

      incrementCheckInDays: () =>
        set((state) => ({
          profile: {
            ...state.profile,
            checkInDays: state.profile.checkInDays + 1,
          },
        })),

      setFistCalibration: (calibration) =>
        set((state) => ({
          profile: { ...state.profile, fistCalibration: calibration },
        })),
    }),
    {
      name: 'profile-store',
      partialize: (state) => ({
        profile: state.profile,
        currentCoach: state.currentCoach,
        hasCoach: state.hasCoach,
      }),
    }
  )
)

// ============================================================
// 辅助 Hooks
// ============================================================

/**
 * 获取用户显示名（用于头像文字）
 */
export function useDisplayName() {
  const profile = useProfileStore((state) => state.profile)
  return profile.name
}

/**
 * 获取用户头像文字
 */
export function useAvatarText() {
  const profile = useProfileStore((state) => state.profile)
  return profile.name.charAt(0).toUpperCase()
}
