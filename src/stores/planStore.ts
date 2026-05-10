/**
 * 方案库状态管理
 *
 * 管理教练端的健身方案数据全局状态
 * 采用「API优先，降级本地」策略
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============================================================
// 类型定义
// ============================================================

export type PlanType = 'fat-loss' | 'muscle-gain' | 'maintain' | 'custom'

export interface TrainingItem {
  day: string
  type: string
  detail: string
}

export interface IPlan {
  id: string
  name: string
  type: PlanType
  description: string
  duration: number
  memberCount: number
  calories: string
  protein: string
  updatedAt: string
  targetWeight?: number
  targetFat?: number
  targetWaist?: number
  caloriesMin?: number
  caloriesMax?: number
  fat?: number
  carbs?: number
  training?: TrainingItem[]
  notes?: string
  assignedMember?: { id: string; name: string }
  // 执行进度
  executions?: {
    completedDays: number   // 已完成天数
    totalDays: number      // 总天数
    completionRate: number // 完成率 %
    lastCheckIn?: string   // 最近打卡时间
  }
}

export interface IPlanForm {
  name: string
  type: PlanType
  description: string
  duration: number
  targetWeight: number
  targetFat: number
  targetWaist: number
  caloriesMin: number
  caloriesMax: number
  protein: number
  fat: number
  carbs: number
  training: TrainingItem[]
  notes: string
  assignedMember?: { id: string; name: string }
}

// ============================================================
// 默认训练计划模板
// ============================================================

const DEFAULT_TRAINING: TrainingItem[] = [
  { day: '周一', type: '胸+三头肌', detail: '力量训练 60min' },
  { day: '周二', type: '有氧跑步', detail: '慢跑 40min' },
  { day: '周三', type: '背+二头肌', detail: '力量训练 60min' },
  { day: '周四', type: 'HIIT', detail: '高强度间歇 30min' },
  { day: '周五', type: '腿+肩部', detail: '力量训练 60min' },
  { day: '周六', type: '有氧游泳', detail: '游泳 60min' },
  { day: '周日', type: '休息日', detail: '拉伸/放松' },
]

// ============================================================
// 会员计划目标（用于首页展示和编辑）
// ============================================================

/** 计划类型 */
export type PlanTypeOption = 'fat-loss' | 'muscle-gain' | 'body-shape' | 'performance'

export const PLAN_TYPE_LABELS: Record<PlanTypeOption, string> = {
  'fat-loss': '减脂计划',
  'muscle-gain': '增肌计划',
  'body-shape': '塑形计划',
  'performance': '运动表现提升计划',
}

/** 每日训练安排 */
export interface DaySchedule {
  type: 'strength' | 'cardio' | 'aerobic' | 'other'
  note?: string
}

export const DAY_SCHEDULE_LABELS: Record<DaySchedule['type'], string> = {
  strength: '力量训练',
  cardio: '心肺训练',
  aerobic: '有氧训练',
  other: '其他',
}

/** 每周训练安排 */
export interface WeekSchedule {
  monday?: DaySchedule
  tuesday?: DaySchedule
  wednesday?: DaySchedule
  thursday?: DaySchedule
  friday?: DaySchedule
  saturday?: DaySchedule
  sunday?: DaySchedule
}

export const WEEKDAY_LABELS: (keyof WeekSchedule)[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
]

export const WEEKDAY_ZH: Record<keyof WeekSchedule, string> = {
  monday: '周一', tuesday: '周二', wednesday: '周三',
  thursday: '周四', friday: '周五', saturday: '周六', sunday: '周日',
}

// 色卡样式映射（放在组件外避免 esbuild JSX 解析干扰）
export const NUTRIENT_STYLES: Record<string, { card: string; text: string }> = {
  orange: { card: 'bg-orange-400 bg-opacity-10', text: 'text-orange-400' },
  blue: { card: 'bg-blue-400 bg-opacity-10', text: 'text-blue-400' },
  yellow: { card: 'bg-yellow-400 bg-opacity-10', text: 'text-yellow-400' },
  purple: { card: 'bg-purple-400 bg-opacity-10', text: 'text-purple-400' },
}

export interface PlanTarget {
  startDate: string
  endDate: string
  totalDays: number
  targetCalories: number
  targetProtein: number
  targetFat: number
  targetCarb: number

  // 计划类型（用户手动选择，不再靠数值推断）
  planType: PlanTypeOption

  // 每周训练安排
  weeklySchedule: WeekSchedule

  // 每周训练打卡记录 { monday: 时间戳, ... }
  weeklyCompleted: Record<string, number>

  // 体成分目标进度（可选，向后兼容）
  bodyGoalMetric?: BodyGoalMetric
  bodyGoalTarget?: number
  bodyGoalStart?: number   // 设置目标时的起始值
  bodyGoalSetAt?: string   // 设置目标的时间
}

/** 可追踪的体成分指标 */
export type BodyGoalMetric =
  | 'weight'
  | 'body_fat'
  | 'waist'
  | 'muscle_mass'
  | 'visceral_fat'
  | 'fat_free_mass'
  | 'protein_percent'
  | 'subcutaneous_fat'
  | 'water_content'
  | 'bone_mass'

/** 指标显示配置 */
export const BODY_GOAL_CONFIG: Record<BodyGoalMetric, { label: string; unit: string; direction: 'decrease' | 'increase' }> = {
  weight: { label: '体重', unit: 'kg', direction: 'decrease' },
  body_fat: { label: '体脂率', unit: '%', direction: 'decrease' },
  waist: { label: '腰围', unit: 'cm', direction: 'decrease' },
  muscle_mass: { label: '肌肉量', unit: 'kg', direction: 'increase' },
  visceral_fat: { label: '内脏脂肪', unit: '', direction: 'decrease' },
  fat_free_mass: { label: '去脂体重', unit: 'kg', direction: 'increase' },
  protein_percent: { label: '蛋白质', unit: '%', direction: 'increase' },
  subcutaneous_fat: { label: '皮下脂肪', unit: '%', direction: 'decrease' },
  water_content: { label: '水分率', unit: '%', direction: 'increase' },
  bone_mass: { label: '骨量', unit: 'kg', direction: 'increase' },
}

const DEFAULT_PLAN_TARGET: PlanTarget = {
  startDate: '2026-03-01',
  endDate: '2026-05-30',
  totalDays: 90,
  targetCalories: 1800,
  targetProtein: 120,
  targetFat: 60,
  targetCarb: 150,
  planType: 'fat-loss',
  weeklySchedule: {},
  weeklyCompleted: {},
}

// ============================================================
// 计划目标独立 Store（zustand persist，存储键 'plan-target'）
// ============================================================

interface PlanTargetState {
  planTarget: PlanTarget
  setPlanTarget: (target: PlanTarget) => void
}

export const usePlanTargetStore = create<PlanTargetState>()(
  persist(
    (set) => ({
      planTarget: DEFAULT_PLAN_TARGET,
      setPlanTarget: (planTarget) => {
        set({ planTarget })
        // 同步到云端（异步，不阻塞 UI）
        syncPlanTargetToCloud(planTarget).catch(() => {})
      },
    }),
    {
      name: 'plan-target',
    }
  )
)

/**
 * 同步计划目标到云端（coach_members 集合）
 * 每次 setPlanTarget 时自动触发
 */
async function syncPlanTargetToCloud(target: PlanTarget): Promise<void> {
  try {
    const { syncMemberPlanTarget } = await import('@/cloudbase/services/coach')
    await syncMemberPlanTarget(target as unknown as Record<string, unknown>)
  } catch (error) {
    console.warn('[PlanTarget] 云端同步失败:', error)
    // 静默失败，不影响本地使用
  }
}

/**
 * 获取会员个人计划目标
 */
export function usePlanTarget() {
  return usePlanTargetStore((state) => state.planTarget)
}

/**
 * 获取设置计划目标的方法
 */
export function useSetPlanTarget() {
  return usePlanTargetStore((state) => state.setPlanTarget)
}

// ============================================================
// 状态接口（主 Store）
// ============================================================

interface PlanState {
  // 状态
  plans: IPlan[]
  isLoading: boolean
  error: string | null
  lastSyncedAt: number | null

  // 筛选状态
  searchQuery: string
  typeFilter: string

  // 操作
  fetchPlans: () => Promise<void>
  setSearchQuery: (query: string) => void
  setTypeFilter: (type: string) => void
  addPlan: (plan: IPlan) => Promise<void>
  updatePlan: (id: string, data: Partial<IPlan>) => Promise<void>
  deletePlan: (id: string) => Promise<void>
  copyPlan: (id: string) => Promise<void>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearPlans: () => void

  // 辅助：创建新方案表单默认值
  getDefaultForm: () => IPlanForm
}

// ============================================================
// Store
// ============================================================

export const usePlanStore = create<PlanState>()(
  persist(
    (set, get) => ({
      // 初始状态
      plans: [],
      isLoading: false,
      error: null,
      lastSyncedAt: null,
      searchQuery: '',
      typeFilter: 'all',

      // 从后端拉取方案列表（TODO: 接入真实 API）
      fetchPlans: async () => {
        set({ isLoading: true, error: null })
        try {
          // TODO: 调用真实 API
          // const data = await getPlans()
          // set({ plans: data, lastSyncedAt: Date.now() })

          console.log('[PlanStore] API 暂未接入，使用本地数据')
          set({ isLoading: false, lastSyncedAt: Date.now() })
        } catch (err) {
          console.warn('[PlanStore] API 拉取失败:', err)
          set({ error: '拉取方案失败', isLoading: false })
        }
      },

      // 设置搜索关键词
      setSearchQuery: (searchQuery) => set({ searchQuery }),

      // 设置类型筛选
      setTypeFilter: (typeFilter) => set({ typeFilter }),

      // 添加新方案
      addPlan: async (plan) => {
        const newPlan = {
          ...plan,
          id: plan.id || Date.now().toString(),
          updatedAt: new Date().toISOString().split('T')[0],
        }

        // 立即更新本地
        set((state) => ({
          plans: [newPlan, ...state.plans],
        }))

        // TODO: 同步到后端
        // try {
        //   await createPlan(newPlan)
        // } catch (err) {
        //   console.warn('[PlanStore] 添加方案失败:', err)
        // }
      },

      // 更新方案
      updatePlan: async (id, data) => {
        // 立即更新本地
        set((state) => ({
          plans: state.plans.map((p) =>
            p.id === id
              ? { ...p, ...data, updatedAt: new Date().toISOString().split('T')[0] }
              : p
          ),
        }))

        // TODO: 同步到后端
        // try {
        //   await updatePlan(id, data)
        // } catch (err) {
        //   console.warn('[PlanStore] 更新方案失败:', err)
        // }
      },

      // 删除方案
      deletePlan: async (id) => {
        // 立即从本地删除
        set((state) => ({
          plans: state.plans.filter((p) => p.id !== id),
        }))

        // TODO: 同步到后端
        // try {
        //   await deletePlan(id)
        // } catch (err) {
        //   console.warn('[PlanStore] 删除方案失败:', err)
        // }
      },

      // 复制方案
      copyPlan: async (id) => {
        const plan = get().plans.find((p) => p.id === id)
        if (!plan) return

        const copy: IPlan = {
          ...plan,
          id: Date.now().toString(),
          name: `${plan.name}（副本）`,
          memberCount: 0,
          updatedAt: new Date().toISOString().split('T')[0],
          assignedMember: undefined,
        }

        // 立即更新本地
        set((state) => ({
          plans: [copy, ...state.plans],
        }))

        // TODO: 同步到后端
        // try {
        //   await createPlan(copy)
        // } catch (err) {
        //   console.warn('[PlanStore] 复制方案失败:', err)
        // }
      },

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearPlans: () => set({ plans: [] }),

      // 获取默认表单数据
      getDefaultForm: () => ({
        name: '',
        type: 'fat-loss' as PlanType,
        description: '',
        duration: 4,
        targetWeight: 65,
        targetFat: 18,
        targetWaist: 80,
        caloriesMin: 1600,
        caloriesMax: 1800,
        protein: 120,
        fat: 50,
        carbs: 150,
        training: [...DEFAULT_TRAINING],
        notes: '',
        assignedMember: undefined,
      }),
    }),
    {
      name: 'plan-store',
      partialize: (state) => ({
        plans: state.plans,
        lastSyncedAt: state.lastSyncedAt,
        searchQuery: state.searchQuery,
        typeFilter: state.typeFilter,
      }),
    }
  )
)

// ============================================================
// 辅助函数
// ============================================================

/**
 * 获取筛选后的方案列表
 */
export function useFilteredPlans() {
  const plans = usePlanStore((state) => state.plans)
  const searchQuery = usePlanStore((state) => state.searchQuery)
  const typeFilter = usePlanStore((state) => state.typeFilter)

  return plans.filter((plan) => {
    if (searchQuery && !plan.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (typeFilter !== 'all' && plan.type !== typeFilter) {
      return false
    }
    return true
  })
}

/**
 * 按类型统计方案数量
 */
export function usePlanCountByType() {
  const plans = usePlanStore((state) => state.plans)

  return {
    all: plans.length,
    'fat-loss': plans.filter((p) => p.type === 'fat-loss').length,
    'muscle-gain': plans.filter((p) => p.type === 'muscle-gain').length,
    maintain: plans.filter((p) => p.type === 'maintain').length,
    custom: plans.filter((p) => p.type === 'custom').length,
  }
}
