/**
 * 通知 Store（会员端接收教练消息）
 * 类型与 cloudbase/services/notifications.ts 的 INotification 对齐
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 回复条目
export interface MemberReply {
  content: string
  createdAt: string
}

// 通知条目
export interface Notification {
  id: string
  _id?: string          // 云端 _id
  type: 'comment' | 'reminder' | 'plan' | 'system' | 'plan_update' | 'member_warning'
  title: string
  content: string
  coachId?: string
  coachName?: string
  // 教练端使用：会员ID和姓名
  memberId?: string
  memberName?: string
  read: boolean
  createdAt: string
  // 会员回复
  replies?: MemberReply[]
  // 会员对评语的 emoji 反应
  reaction?: string
  // 关联记录标签（用于评语场景：早餐/午餐/运动等）
  recordLabel?: string
}

interface NotificationStore {
  notifications: Notification[]
  unreadCount: number

  // 云端同步
  syncFromCloud: (cloudNotifications: Notification[]) => void

  // 添加通知
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void

  // 标记已读
  markAsRead: (id: string) => void

  // 全部已读
  markAllAsRead: () => void

  // 清空通知
  clearAll: () => void

  // 会员回复评语
  addReply: (notificationId: string, content: string) => void

  // 会员对评语 reaction
  addReaction: (notificationId: string, emoji: string) => void
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 0,

      syncFromCloud: (cloudNotifications) => {
        set(state => {
          // 云端数据去重合并（用 _id 为主）
          const existingIds = new Set(state.notifications.map(n => n.id))
          const newOnes = cloudNotifications.filter(n => !existingIds.has(n.id) && !existingIds.has(n._id || ''))
          const merged = [...newOnes.map(n => ({ ...n, id: n._id || n.id, read: n.read ?? false })), ...state.notifications]
          const unread = merged.filter(n => !n.read).length
          return { notifications: merged, unreadCount: unread }
        })
      },

      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: Date.now().toString(),
          read: false,
          createdAt: new Date().toISOString(),
        }
        set(state => ({
          notifications: [newNotification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }))
      },

      markAsRead: (id) => {
        set(state => {
          const notification = state.notifications.find(n => n.id === id)
          if (!notification || notification.read) return state
          return {
            notifications: state.notifications.map(n =>
              n.id === id ? { ...n, read: true } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
          }
        })
      },

      markAllAsRead: () => {
        set(state => ({
          notifications: state.notifications.map(n => ({ ...n, read: true })),
          unreadCount: 0,
        }))
      },

      clearAll: () => {
        set({ notifications: [], unreadCount: 0 })
      },

      addReply: (notificationId, content) => {
        set(state => ({
          notifications: state.notifications.map(n =>
            n.id === notificationId
              ? {
                  ...n,
                  replies: [
                    ...(n.replies || []),
                    { content, createdAt: new Date().toISOString() },
                  ],
                }
              : n
          ),
        }))
      },

      addReaction: (notificationId, emoji) => {
        set(state => ({
          notifications: state.notifications.map(n =>
            n.id === notificationId ? { ...n, reaction: emoji } : n
          ),
        }))
      },
    }),
    {
      name: 'notification-store',
    }
  )
)
