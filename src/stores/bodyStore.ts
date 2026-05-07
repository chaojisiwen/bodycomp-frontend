/**
 * 体成分状态管理
 *
 * 管理体成分数据的全局状态
 * 采用「API优先，降级兜底」策略
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { IBodyRecord } from '@/cloudbase/types'
import {
  getBodyRecords,
  createBodyRecord as apiCreateBodyRecord,
  updateBodyRecord as apiUpdateBodyRecord,
  deleteBodyRecord as apiDeleteBodyRecord,
} from '@/cloudbase/services/bodyRecords'
import { getCurrentUserId } from '@/cloudbase/services/utils'

interface BodyState {
  // 状态
  records: IBodyRecord[]
  isLoading: boolean
  error: string | null
  lastSyncedAt: number | null

  // 操作
  fetchRecords: () => Promise<void>
  addRecord: (record: Partial<IBodyRecord>) => Promise<void>
  updateRecord: (id: string, data: Partial<IBodyRecord>) => Promise<void>
  deleteRecord: (id: string) => Promise<void>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearRecords: () => void
}

// 同步新增到后端（失败静默）
async function syncAddToApi(record: Partial<IBodyRecord>) {
  try {
    const { _id, ...rest } = record
    await apiCreateBodyRecord(rest)
    console.log('[BodyStore] 同步新增到后端成功')
  } catch (err) {
    console.warn('[BodyStore] 同步新增到后端失败（数据已保存在本地）:', err)
  }
}

async function syncDeleteToApi(id: string) {
  try {
    await apiDeleteBodyRecord(id)
    console.log('[BodyStore] 同步删除到后端成功')
  } catch (err) {
    console.warn('[BodyStore] 同步删除到后端失败（本地已删除）:', err)
  }
}

export const useBodyStore = create<BodyState>()(
  persist(
    (set) => ({
      // 初始状态
      records: [],
      isLoading: false,
      error: null,
      lastSyncedAt: null,

      // 从后端拉取数据（API优先，失败回退localStorage）
      fetchRecords: async () => {
        set({ isLoading: true, error: null })
        try {
          const data = await getBodyRecords({ limit: 100 })
          if (data.length > 0) {
            set((state) => {
              const apiIds = new Set(data.map((r) => r._id))
              const localOnly = state.records.filter((r) => !r._id || !apiIds.has(r._id))
              const merged = [...localOnly, ...data].sort(
                (a, b) => new Date(b.record_date!).getTime() - new Date(a.record_date!).getTime()
              )
              return { records: merged, lastSyncedAt: Date.now() }
            })
          } else {
            set({ isLoading: false, lastSyncedAt: Date.now() })
            return
          }
        } catch (err) {
          console.warn('[BodyStore] API拉取失败，保持本地数据:', err)
          const msg = (err as Error).message || '操作失败'
          set({ error: msg })
          setTimeout(() => set((s) => s.error === msg ? { error: null } : {}), 3000)
        } finally {
          set({ isLoading: false })
        }
      },

      // 添加体成分记录（先本地，后台同步API）
      addRecord: async (record: Partial<IBodyRecord>) => {
        const tempId = `local_${Date.now()}`
        const uid = getCurrentUserId()
        const localRecord: IBodyRecord = { ...record, _id: tempId, record_date: record.record_date ?? new Date(), user_id: record.user_id || uid || '' }

        set((state) => ({
          records: [localRecord, ...state.records].sort(
            (a, b) => new Date(b.record_date!).getTime() - new Date(a.record_date!).getTime()
          ),
        }))

        await syncAddToApi(localRecord)
      },

      // 更新体成分记录（先本地，后台同步API）
      updateRecord: async (id, data) => {
        set((state) => ({
          records: state.records.map((r) =>
            r._id === id ? { ...r, ...data } : r
          ),
        }))

        if (id.startsWith('local_')) return
        try {
          await apiUpdateBodyRecord(id, data)
        } catch (err) {
          console.warn('[BodyStore] 同步更新失败（本地已更新）:', err)
        }
      },

      // 删除体成分记录（先本地，后台同步API）
      deleteRecord: async (id) => {
        set((state) => ({
          records: state.records.filter((r) => r._id !== id),
        }))

        if (id.startsWith('local_')) return
        await syncDeleteToApi(id)
      },

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearRecords: () => set({ records: [] }),
    }),
    {
      name: 'body-store',
      partialize: (state) => ({
        records: state.records,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
)

// ============================================================
// 辅助 Hooks
// ============================================================

/**
 * 获取最新的体成分记录
 */
export function useLatestBodyRecord() {
  const records = useBodyStore((state) => state.records)
  return records.length > 0 ? records[0] : null
}

/**
 * 获取体成分趋势数据
 */
export function useBodyTrend(days: number = 30) {
  const records = useBodyStore((state) => state.records)
  const now = Date.now()
  const cutoff = now - days * 24 * 60 * 60 * 1000

  return records
    .filter((r) => new Date(r.record_date!).getTime() > cutoff)
    .sort((a, b) =>
      new Date(a.record_date!).getTime() - new Date(b.record_date!).getTime()
    )
}
