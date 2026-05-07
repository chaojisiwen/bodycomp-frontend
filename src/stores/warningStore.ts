/**
 * 预警中心状态管理
 *
 * 管理教练端的预警数据全局状态
 * 采用「云数据库优先」策略
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  sendNotification,
  getCoachWarnings,
  handleWarning as cloudHandleWarning,
  type IWarningRecord,
} from '@/cloudbase/services/notifications'
import { getCurrentUserId } from '@/cloudbase/services/utils'

// ============================================================
// 类型定义
// ============================================================

export type WarningType = 'weight' | 'calorie' | 'update' | 'fat' | 'meal' | 'exercise'
export type WarningLevel = 'danger' | 'warning' | 'info'
export type WarningStatus = 'pending' | 'handled'

export interface IWarning {
  id: string
  memberId: string
  memberName: string
  memberAvatar: string
  type: WarningType
  title: string
  description: string
  time: string
  level: WarningLevel
  status: WarningStatus
}

// ============================================================
// 状态接口
// ============================================================

interface WarningState {
  // 状态
  warnings: IWarning[]
  isLoading: boolean
  error: string | null
  lastSyncedAt: number | null

  // 筛选状态
  filter: 'all' | 'pending' | 'handled'
  levelFilter: 'all' | 'danger' | 'warning'

  // 操作
  fetchWarnings: (coachId?: string) => Promise<void>
  setFilter: (filter: WarningState['filter']) => void
  setLevelFilter: (filter: WarningState['levelFilter']) => void
  markAsHandled: (id: string, coachId?: string) => Promise<void>
  sendReminder: (id: string, message: string, coachId?: string) => Promise<void>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearWarnings: () => void
}

// 将云端预警记录转换为前端格式
function transformWarning(record: IWarningRecord): IWarning {
  const memberName = record.user_id.slice(0, 6) + '...' // 简化显示
  const timeAgo = record.created_at
    ? new Date(record.created_at).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
    : '--'

  return {
    id: record._id || '',
    memberId: record.user_id,
    memberName,
    memberAvatar: '',
    type: record.type,
    title: record.title,
    description: record.description,
    time: timeAgo,
    level: record.level,
    status: record.status,
  }
}

// ============================================================
// Store
// ============================================================

export const useWarningStore = create<WarningState>()(
  persist(
    (set, get) => ({
      // 初始状态
      warnings: [],
      isLoading: false,
      error: null,
      lastSyncedAt: null,
      filter: 'all',
      levelFilter: 'all',

      // 从云数据库拉取预警数据
      fetchWarnings: async (coachId) => {
        const id = coachId || getCurrentUserId()
        set({ isLoading: true, error: null })
        try {
          const cloudWarnings = await getCoachWarnings(id)

          if (cloudWarnings.length > 0) {
            const warnings = cloudWarnings.map(transformWarning)
            set({ warnings, lastSyncedAt: Date.now() })
          } else {
            // 云端暂无数据时返回空
            set({ warnings: [], lastSyncedAt: Date.now() })
          }
        } catch (err) {
          console.warn('[WarningStore] 拉取失败，使用本地数据:', err)
          // 失败时保留本地数据
          set({ isLoading: false, error: '拉取失败' })
        }
      },

      // 设置状态筛选
      setFilter: (filter) => set({ filter }),

      // 设置级别筛选
      setLevelFilter: (levelFilter) => set({ levelFilter }),

      // 标记预警为已处理（云端同步）
      markAsHandled: async (id, coachId) => {
        const cid = coachId || getCurrentUserId()
        // 立即更新本地
        set((state) => ({
          warnings: state.warnings.map((w) =>
            w.id === id ? { ...w, status: 'handled' as WarningStatus } : w
          ),
        }))

        // 同步到云端
        try {
          await cloudHandleWarning(id, cid)
          console.log('[WarningStore] 预警已标记处理')
        } catch (err) {
          console.warn('[WarningStore] 标记已处理失败:', err)
        }
      },

      // 发送提醒消息（云端发送）
      sendReminder: async (id, message, coachId) => {
        const cid = coachId || getCurrentUserId()
        const warning = get().warnings.find((w) => w.id === id)
        if (!warning) return

        try {
          const result = await sendNotification({
            userId: warning.memberId,
            coachId: cid,
            title: '教练提醒',
            content: message,
            type: 'reminder',
            relatedWarningId: id,
          })

          if (result.success) {
            console.log('[WarningStore] 提醒发送成功，通知ID:', result.id)
          } else {
            console.warn('[WarningStore] 提醒发送失败:', result.error)
          }
        } catch (err) {
          console.warn('[WarningStore] 发送提醒异常:', err)
        }
      },

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearWarnings: () => set({ warnings: [] }),
    }),
    {
      name: 'warning-store',
      partialize: (state) => ({
        warnings: state.warnings,
        lastSyncedAt: state.lastSyncedAt,
        filter: state.filter,
        levelFilter: state.levelFilter,
      }),
    }
  )
)

// ============================================================
// 辅助函数
// ============================================================

/**
 * 获取筛选后的预警列表
 */
export function useFilteredWarnings() {
  const warnings = useWarningStore((state) => state.warnings)
  const filter = useWarningStore((state) => state.filter)
  const levelFilter = useWarningStore((state) => state.levelFilter)

  return warnings.filter((w) => {
    if (filter !== 'all' && w.status !== filter) return false
    if (levelFilter !== 'all' && w.level !== levelFilter) return false
    return true
  })
}

/**
 * 获取预警统计
 */
export function useWarningStats() {
  const warnings = useWarningStore((state) => state.warnings)

  return {
    total: warnings.length,
    pending: warnings.filter((w) => w.status === 'pending').length,
    danger: warnings.filter((w) => w.level === 'danger').length,
    handled: warnings.filter((w) => w.status === 'handled').length,
  }
}
