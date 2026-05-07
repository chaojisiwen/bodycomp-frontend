/**
 * 会员端 - 收到的消息（教练评语/提醒/方案通知收件箱）
 */

import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  MessageCircle,
  Send,
  CheckCheck,
  Bell,
  FileText,
  Sparkles,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { useNotificationStore } from '@/stores/notificationStore'
import { useProfileStore } from '@/stores'
import { useAuth } from '@/contexts/AuthContext'
import { getNotifications, addMemberReply } from '@/cloudbase/services/notifications'

// 快捷回复选项
const QUICK_REPLIES = [
  { emoji: '👍', label: '收到！' },
  { emoji: '💪', label: '加油！' },
  { emoji: '❤️', label: '谢谢教练！' },
  { emoji: '🔥', label: '明白了！' },
]

// 类型 → 图标/颜色
const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  comment: {
    icon: <Sparkles className="w-4 h-4" />,
    color: 'text-amber-400',
    label: '教练评语',
  },
  reminder: {
    icon: <Bell className="w-4 h-4" />,
    color: 'text-rose-400',
    label: '提醒',
  },
  plan: {
    icon: <FileText className="w-4 h-4" />,
    color: 'text-blue-400',
    label: '方案通知',
  },
  system: {
    icon: <Bell className="w-4 h-4" />,
    color: 'text-gray-400',
    label: '系统通知',
  },
  plan_update: {
    icon: <FileText className="w-4 h-4" />,
    color: 'text-blue-400',
    label: '方案更新',
  },
  member_warning: {
    icon: <Bell className="w-4 h-4" />,
    color: 'text-rose-400',
    label: '预警提醒',
  },
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

export function MemberMessagesPage() {
  const navigate = useNavigate()
  const { notifications, unreadCount, markAsRead, markAllAsRead, addReply, addReaction } = useNotificationStore()
  const { profile } = useProfileStore()
  const [activeNotif, setActiveNotif] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null)

  const { user } = useAuth()
  // 用 CloudBase 真实 UID 查询（不再用硬编码 demo_member）
  const memberId = user?.id || profile.memberId || ''

  // 启动时从云端拉取最新通知
  useEffect(() => {
    getNotifications(memberId).then(cloudNotifs => {
      if (cloudNotifs.length > 0) {
        const mapped: typeof notifications = cloudNotifs.map(n => ({
          _id: n._id,
          id: n._id || Date.now().toString(),
          type: n.type as any,
          title: n.title,
          content: n.content,
          coachId: n.coach_id,
          read: n.is_read,
          createdAt: n.created_at instanceof Date ? n.created_at.toISOString() : String(n.created_at),
        }))
        // 合并：云端数据在前，本地新增在后
        const localIds = new Set(notifications.map(n => n.id))
        const fresh = mapped.filter(n => !localIds.has(n.id))
        const merged = [...fresh, ...notifications]
        // 写入 store（通过 syncFromCloud）
        useNotificationStore.getState().syncFromCloud(merged)
      }
    }).catch(console.error)
  }, [])

  const handleOpen = (id: string, isRead: boolean) => {
    if (!isRead) {
      markAsRead(id)
      // 同步云端已读
      const n = notifications.find(x => x.id === id)
      if (n?._id) markAsRead(n._id)
    }
    setActiveNotif(id)
    setReplyText('')
    const n = notifications.find(x => x.id === id)
    setSelectedReaction(n?.reaction || null)
  }

  const handleClose = () => {
    setActiveNotif(null)
    setReplyText('')
  }

  const handleSendReply = async () => {
    if (!replyText.trim() || !activeNotif) return
    setSendingReply(true)
    const activeNotifData = notifications.find(n => n.id === activeNotif)
    // 同时写入本地 store 和云端
    addReply(activeNotif, replyText.trim())
    if (activeNotifData?._id) {
      await addMemberReply(activeNotifData._id, memberId, replyText.trim())
    }
    setReplyText('')
    setTimeout(() => setSendingReply(false), 500)
  }

  const handleQuickReply = async (emoji: string) => {
    if (!activeNotif) return
    const activeNotifData = notifications.find(n => n.id === activeNotif)
    // 同时写入本地 store 和云端
    addReply(activeNotif, emoji)
    if (activeNotifData?._id) {
      await addMemberReply(activeNotifData._id, memberId, emoji)
    }
  }

  const handleReaction = (emoji: string) => {
    if (!activeNotif) return
    addReaction(activeNotif, emoji)
    setSelectedReaction(emoji)
    // TODO: 后续可接入云端同步 reaction
  }

  const activeNotifData = notifications.find(n => n.id === activeNotif)

  if (activeNotif && activeNotifData) {
    // ── 详情视图 ──
    const cfg = TYPE_CONFIG[activeNotifData.type] || TYPE_CONFIG.system
    return (
      <div className="min-h-screen bg-[#0f0f1a] text-white pb-8">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0f0f1a]/90 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center gap-3">
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className={cfg.color}>{cfg.icon}</span>
            <span className="font-semibold text-sm">{cfg.label}</span>
          </div>
        </div>

        <div className="px-4 pt-4 space-y-4">
          {/* 消息卡片 */}
          <div className="space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{formatDate(activeNotifData.createdAt)}</p>
            <Card className="p-4 bg-white/5 border border-white/10">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-sm font-bold shrink-0">
                  {activeNotifData.coachName?.charAt(0) || '教'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{activeNotifData.coachName || '教练'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(activeNotifData.createdAt)}</p>
                </div>
                <span className={`shrink-0 ${cfg.color}`}>{cfg.icon}</span>
              </div>
              {activeNotifData.recordLabel && (
                <span className="inline-block mb-2 px-2 py-0.5 rounded-full bg-white/10 text-xs text-gray-400">
                  关于：{activeNotifData.recordLabel}
                </span>
              )}
              <p className="text-sm text-gray-200 leading-relaxed">{activeNotifData.content}</p>
            </Card>
          </div>

          {/* 评语类型：显示 reaction */}
          {activeNotifData.type === 'comment' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">回应教练：</span>
              <div className="flex gap-2">
                {['👍', '💪', '❤️', '🔥', '🌟'].map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all ${
                      selectedReaction === emoji
                        ? 'bg-amber-500/20 ring-1 ring-amber-500 scale-110'
                        : 'bg-white/5 hover:bg-white/10 active:scale-95'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 已有回复 */}
          {activeNotifData.replies && activeNotifData.replies.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">我的回复</p>
              {activeNotifData.replies.map((r, i) => (
                <div key={i} className="flex items-start gap-2 ml-6">
                  <div className="bg-emerald-500/15 rounded-xl rounded-tl-sm px-3 py-2 max-w-[75%]">
                    <p className="text-sm text-emerald-200 leading-relaxed">{r.content}</p>
                  </div>
                  <span className="text-[10px] text-gray-600 mt-auto shrink-0">{formatDate(r.createdAt)}</span>
                </div>
              ))}
            </div>
          )}

          {/* 回复输入 */}
          {activeNotifData.type === 'comment' && (
            <div className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                {QUICK_REPLIES.map(qr => (
                  <button
                    key={qr.emoji}
                    onClick={() => handleQuickReply(qr.emoji)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-sm text-gray-300 active:scale-95 transition-all"
                  >
                    <span>{qr.emoji}</span>
                    <span className="text-xs">{qr.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendReply()}
                  placeholder="写点回复..."
                  className="flex-1 bg-white/10 rounded-xl px-4 py-3 text-sm placeholder-gray-500 outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                />
                <button
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || sendingReply}
                  className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-white/10 disabled:text-gray-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── 列表视图 ──
  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0f0f1a]/90 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-lg">收到的消息</h1>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs hover:bg-emerald-500/25 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            全部已读
          </button>
        )}
      </div>

      {/* 未读数提示 */}
      {unreadCount > 0 && (
        <div className="mx-4 mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <Bell className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-300">你有 {unreadCount} 条未读消息</p>
        </div>
      )}

      {/* 空状态 */}
      {notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
            <MessageCircle className="w-8 h-8 text-gray-600" />
          </div>
          <div className="text-center">
            <p className="font-medium text-gray-400">暂无消息</p>
            <p className="text-sm text-gray-600 mt-1">教练的评语和提醒会显示在这里</p>
          </div>
        </div>
      )}

      {/* 通知列表（按日期分组） */}
      <div className="px-4 mt-3 space-y-3">
        {['今天', '昨天', ''].map((groupLabel, gi) => {
          const items = groupLabel === '今天'
            ? notifications.filter(n => {
                const d = new Date(n.createdAt)
                const now = new Date()
                return d.toDateString() === now.toDateString()
              })
            : groupLabel === '昨天'
            ? notifications.filter(n => {
                const d = new Date(n.createdAt)
                const now = new Date()
                const yesterday = new Date(now)
                yesterday.setDate(now.getDate() - 1)
                return d.toDateString() === yesterday.toDateString()
              })
            : notifications.filter(n => {
                const d = new Date(n.createdAt)
                const now = new Date()
                const yesterday = new Date(now)
                yesterday.setDate(now.getDate() - 1)
                return d.toDateString() !== now.toDateString() && d.toDateString() !== yesterday.toDateString()
              })

          if (items.length === 0) return null

          return (
            <div key={gi}>
              {groupLabel && (
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 ml-1">{groupLabel}</p>
              )}
              <Card className="divide-y divide-white/5 overflow-hidden">
                {items.map(notif => {
                  const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system
                  return (
                    <button
                      key={notif.id}
                      onClick={() => handleOpen(notif.id, notif.read)}
                      className={`w-full text-left p-4 hover:bg-white/5 active:bg-white/10 transition-colors ${!notif.read ? 'bg-white/[0.03]' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        {/* 头像 */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${!notif.read ? 'bg-gradient-to-br from-emerald-500 to-teal-400' : 'bg-white/10'}`}>
                          {notif.coachName?.charAt(0) || '教'}
                        </div>

                        {/* 内容 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-semibold text-sm">{notif.coachName || '教练'}</span>
                            <span className={`text-xs ${cfg.color}`}>{cfg.icon}</span>
                            {!notif.read && (
                              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                            )}
                          </div>
                          <p className={`text-sm truncate ${!notif.read ? 'text-white' : 'text-gray-400'}`}>{notif.content}</p>
                          {notif.recordLabel && (
                            <span className="text-xs text-gray-600 mt-0.5 inline-block">{notif.recordLabel}</span>
                          )}
                          <p className="text-xs text-gray-600 mt-1">{formatDate(notif.createdAt)}</p>
                        </div>

                        {/* reaction 预览 */}
                        {notif.reaction && (
                          <span className="text-lg shrink-0">{notif.reaction}</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}
