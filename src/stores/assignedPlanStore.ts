/**
 * 会员训练计划 Store
 *
 * 管理教练分配给当前会员的训练计划
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getMemberAssignedPlans } from '@/cloudbase/services/coach'
import type { IAssignedPlan } from '@/cloudbase/types'

interface AssignedPlanState {
  plans: IAssignedPlan[]
  isLoading: boolean
  error: string | null
  lastSyncedAt: number | null

  fetchPlans: (memberId: string) => Promise<void>
  clearPlans: () => void
}

export const useAssignedPlanStore = create<AssignedPlanState>()(
  persist(
    (set) => ({
      plans: [],
      isLoading: false,
      error: null,
      lastSyncedAt: null,

      fetchPlans: async (memberId: string) => {
        set({ isLoading: true, error: null })
        try {
          console.log('[AssignedPlanStore] 开始获取计划, memberId:', memberId)
          const plans = await getMemberAssignedPlans(memberId)
          console.log('[AssignedPlanStore] 获取到的计划数据:', JSON.stringify(plans, null, 2))
          console.log('[AssignedPlanStore] 计划数量:', plans.length)
          set({ plans, isLoading: false, lastSyncedAt: Date.now() })
        } catch (err) {
          console.error('[AssignedPlanStore] 拉取失败:', err)
          set({ error: '拉取计划失败', isLoading: false })
        }
      },

      clearPlans: () => set({ plans: [] }),
    }),
    {
      name: 'assigned-plan-store',
      partialize: (state) => ({
        plans: state.plans,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
)
