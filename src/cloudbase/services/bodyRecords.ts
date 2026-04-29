/**
 * 体成分记录服务
 */

import { getApp } from '../index'
import { COLLECTIONS } from '../config'
import type { IBodyRecord, IBodyRecordInput } from '../types'

// ============================================================
// CRUD 操作
// ============================================================

/**
 * 获取体成分记录列表
 */
export async function getBodyRecords(options?: {
  limit?: number
  offset?: number
}): Promise<IBodyRecord[]> {
  try {
    const db = getApp()?.database()
    if (!db) return []

    // 构建查询
    const res = await db.collection(COLLECTIONS.BODY_RECORDS)
      .orderBy('record_date', 'desc')
      .limit(options?.limit || 100)
      .skip(options?.offset || 0)
      .get()

    return res.data as IBodyRecord[]
  } catch (error) {
    console.error('[BodyRecords] 获取列表失败:', error)
    return []
  }
}

/**
 * 获取单条体成分记录
 */
export async function getBodyRecord(id: string): Promise<IBodyRecord | null> {
  try {
    const db = getApp()?.database()
    if (!db) return null

    const res = await db.collection(COLLECTIONS.BODY_RECORDS).doc(id).get()

    if (res.data && res.data.length > 0) {
      return res.data[0] as IBodyRecord
    }
    return null
  } catch (error) {
    console.error('[BodyRecords] 获取详情失败:', error)
    return null
  }
}

/**
 * 创建体成分记录
 */
export async function createBodyRecord(
  data: IBodyRecordInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const db = getApp()?.database()
    if (!db) return { success: false, error: 'SDK 未初始化' }

    const res = await db.collection(COLLECTIONS.BODY_RECORDS).add({
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    })

    return { success: true, id: res.id }
  } catch (error: unknown) {
    console.error('[BodyRecords] 创建失败:', error)
    return { success: false, error: (error as Error).message || '创建失败' }
  }
}

/**
 * 更新体成分记录
 */
export async function updateBodyRecord(
  id: string,
  data: Partial<IBodyRecordInput>
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getApp()?.database()
    if (!db) return { success: false, error: 'SDK 未初始化' }

    await db.collection(COLLECTIONS.BODY_RECORDS).doc(id).update({
      ...data,
      updated_at: new Date(),
    })

    return { success: true }
  } catch (error: unknown) {
    console.error('[BodyRecords] 更新失败:', error)
    return { success: false, error: (error as Error).message || '更新失败' }
  }
}

/**
 * 删除体成分记录
 */
export async function deleteBodyRecord(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getApp()?.database()
    if (!db) return { success: false, error: 'SDK 未初始化' }

    await db.collection(COLLECTIONS.BODY_RECORDS).doc(id).remove()
    return { success: true }
  } catch (error: unknown) {
    console.error('[BodyRecords] 删除失败:', error)
    return { success: false, error: (error as Error).message || '删除失败' }
  }
}

// ============================================================
// 统计与分析
// ============================================================

/**
 * 获取最新的体成分数据
 */
export async function getLatestBodyRecord(): Promise<IBodyRecord | null> {
  try {
    const db = getApp()?.database()
    if (!db) return null

    const res = await db
      .collection(COLLECTIONS.BODY_RECORDS)
      .orderBy('record_date', 'desc')
      .limit(1)
      .get()

    if (res.data && res.data.length > 0) {
      return res.data[0] as IBodyRecord
    }
    return null
  } catch (error) {
    console.error('[BodyRecords] 获取最新记录失败:', error)
    return null
  }
}

/**
 * 获取体成分趋势数据（最近 N 条）
 */
export async function getBodyRecordTrend(
  days: number = 30
): Promise<IBodyRecord[]> {
  try {
    const db = getApp()?.database()
    if (!db) return []

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const res = await db
      .collection(COLLECTIONS.BODY_RECORDS)
      .where({
        record_date: db.command.gte(startDate.getTime()),
      })
      .orderBy('record_date', 'asc')
      .get()

    return res.data as IBodyRecord[]
  } catch (error) {
    console.error('[BodyRecords] 获取趋势数据失败:', error)
    return []
  }
}
