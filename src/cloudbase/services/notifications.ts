/**
 * 通知服务
 * 教练向会员发送提醒通知
 */

import { getApp, COLLECTIONS } from '../index'

// ============================================================
// 类型定义
// ============================================================

export interface INotification {
  _id?: string
  user_id: string          // 接收通知的会员ID
  coach_id: string         // 发送通知的教练ID
  type: 'reminder' | 'comment' | 'plan' | 'system'
  title: string
  content: string
  related_warning_id?: string  // 关联的预警ID
  is_read: boolean
  created_at: Date
}

// ============================================================
// CRUD 操作
// ============================================================

/**
 * 发送通知给会员
 */
export async function sendNotification(params: {
  userId: string       // 会员ID
  coachId: string      // 教练ID
  title: string
  content: string
  type?: INotification['type']
  relatedWarningId?: string
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const db = getApp()?.database()
    if (!db) return { success: false, error: 'SDK 未初始化' }

    const res = await db.collection(COLLECTIONS.NOTIFICATIONS).add({
      data: {
        user_id: params.userId,
        coach_id: params.coachId,
        type: params.type || 'reminder',
        title: params.title,
        content: params.content,
        related_warning_id: params.relatedWarningId,
        is_read: false,
        created_at: new Date(),
      },
    }) as { id?: string }

    console.log('[Notification] 通知已发送:', res.id)
    return { success: true, id: res.id }
  } catch (error: unknown) {
    console.error('[Notification] 发送失败:', error)
    return { success: false, error: (error as Error).message || '发送失败' }
  }
}

/**
 * 获取会员的通知列表
 */
export async function getNotifications(
  userId: string,
  options?: { limit?: number; unreadOnly?: boolean }
): Promise<INotification[]> {
  try {
    const db = getApp()?.database()
    if (!db) return []

    const query = db.collection(COLLECTIONS.NOTIFICATIONS)
      .where({ user_id: userId, ...(options?.unreadOnly ? { is_read: false } : {}) })
      .orderBy('created_at', 'desc')
      .limit(options?.limit || 50)

    const res = await query.get()

    return res.data as INotification[]
  } catch (error) {
    console.error('[Notification] 获取列表失败:', error)
    return []
  }
}

/**
 * 标记通知为已读
 */
export async function markAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getApp()?.database()
    if (!db) return { success: false, error: 'SDK 未初始化' }

    await db.collection(COLLECTIONS.NOTIFICATIONS).doc(notificationId).update({
      is_read: true,
    })

    return { success: true }
  } catch (error: unknown) {
    console.error('[Notification] 标记已读失败:', error)
    return { success: false, error: (error as Error).message || '操作失败' }
  }
}

/**
 * 标记全部通知为已读
 */
export async function markAllAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getApp()?.database()
    if (!db) return { success: false, error: 'SDK 未初始化' }

    await db.collection(COLLECTIONS.NOTIFICATIONS)
      .where({ user_id: userId, is_read: false })
      .update({
        is_read: true,
      })

    return { success: true }
  } catch (error: unknown) {
    console.error('[Notification] 全部标记已读失败:', error)
    return { success: false, error: (error as Error).message || '操作失败' }
  }
}

/**
 * 删除通知
 */
export async function deleteNotification(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getApp()?.database()
    if (!db) return { success: false, error: 'SDK 未初始化' }

    await db.collection(COLLECTIONS.NOTIFICATIONS).doc(notificationId).remove()
    return { success: true }
  } catch (error: unknown) {
    console.error('[Notification] 删除失败:', error)
    return { success: false, error: (error as Error).message || '删除失败' }
  }
}

/**
 * 获取未读通知数量
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const db = getApp()?.database()
    if (!db) return 0

    const res = await db.collection(COLLECTIONS.NOTIFICATIONS)
      .where({ user_id: userId, is_read: false })
      .count()

    return res.total || 0
  } catch (error) {
    console.error('[Notification] 获取未读数失败:', error)
    return 0
  }
}

/**
 * 会员回复教练的通知（添加到已有通知的 replies 字段）
 */
export async function addMemberReply(
  notificationId: string,
  _memberId: string,  // eslint-disable-line @typescript-eslint/no-unused-vars
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getApp()?.database()
    if (!db) return { success: false, error: 'SDK 未初始化' }

    // 获取当前通知的 replies 数组
    const notif = await db.collection(COLLECTIONS.NOTIFICATIONS)
      .doc(notificationId)
      .get()

    if (!notif.data || notif.data.length === 0) {
      return { success: false, error: '通知不存在' }
    }

    const currentReplies = notif.data[0].replies || []
    const newReply = {
      content,
      createdAt: new Date().toISOString(),
    }

    // 更新 replies 数组
    await db.collection(COLLECTIONS.NOTIFICATIONS)
      .doc(notificationId)
      .update({
        replies: [...currentReplies, newReply],
      })

    console.log('[Notification] 会员回复已发送:', notificationId)
    return { success: true }
  } catch (error: unknown) {
    console.error('[Notification] 发送会员回复失败:', error)
    return { success: false, error: (error as Error).message || '发送失败' }
  }
}

// ============================================================
// 预警相关
// ============================================================

export interface IWarningRecord {
  _id?: string
  user_id: string
  coach_id: string
  type: 'weight' | 'calorie' | 'update' | 'fat' | 'meal' | 'exercise'
  level: 'danger' | 'warning' | 'info'
  title: string
  description: string
  status: 'pending' | 'handled'
  handled_at?: Date
  handled_by?: string
  created_at: Date
}

/**
 * 创建预警记录
 */
export async function createWarning(data: {
  userId: string
  coachId: string
  type: IWarningRecord['type']
  level: IWarningRecord['level']
  title: string
  description: string
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const db = getApp()?.database()
    if (!db) return { success: false, error: 'SDK 未初始化' }

    const res = await db.collection(COLLECTIONS.WARNINGS).add({
      data: {
        user_id: data.userId,
        coach_id: data.coachId,
        type: data.type,
        level: data.level,
        title: data.title,
        description: data.description,
        status: 'pending',
        created_at: new Date(),
      },
    }) as { id?: string }

    return { success: true, id: res.id }
  } catch (error: unknown) {
    console.error('[Warning] 创建预警失败:', error)
    return { success: false, error: (error as Error).message || '创建失败' }
  }
}

/**
 * 获取预警列表（教练端）
 */
export async function getCoachWarnings(
  coachId: string,
  options?: { status?: IWarningRecord['status']; limit?: number }
): Promise<IWarningRecord[]> {
  try {
    const db = getApp()?.database()
    if (!db) return []

    const query = db.collection(COLLECTIONS.WARNINGS)
      .where({ coach_id: coachId, ...(options?.status ? { status: options.status } : {}) })
      .orderBy('created_at', 'desc')
      .limit(options?.limit || 100)

    const res = await query.get()

    return res.data as IWarningRecord[]
  } catch (error) {
    console.error('[Warning] 获取列表失败:', error)
    return []
  }
}

/**
 * 标记预警为已处理
 */
export async function handleWarning(
  warningId: string,
  coachId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getApp()?.database()
    if (!db) return { success: false, error: 'SDK 未初始化' }

    await db.collection(COLLECTIONS.WARNINGS).doc(warningId).update({
      status: 'handled',
      handled_at: new Date(),
      handled_by: coachId,
    })

    return { success: true }
  } catch (error: unknown) {
    console.error('[Warning] 标记已处理失败:', error)
    return { success: false, error: (error as Error).message || '操作失败' }
  }
}
