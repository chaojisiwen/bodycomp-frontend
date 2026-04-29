import { useState } from 'react'
import { Bell, Check, Trash2, FileText, AlertTriangle, Info } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useNotificationStore } from '@/stores/notificationStore'

export function NotificationCenterPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotificationStore()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications

  const getIcon = (type: string) => {
    switch (type) {
      case 'plan_update':
        return <FileText className="w-5 h-5 text-emerald-400" />
      case 'member_warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />
      default:
        return <Info className="w-5 h-5 text-blue-400" />
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return '刚刚'
    if (hours < 24) return `${hours}小时前`
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="space-y-4 pb-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Bell className="w-5 h-5 text-emerald-400" />
          通知中心
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-medium">
              {unreadCount}
            </span>
          )}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="px-3 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors flex items-center gap-1"
          >
            <Check className="w-3 h-3" />
            全部已读
          </button>
          <button
            onClick={clearAll}
            disabled={notifications.length === 0}
            className="px-3 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            清空
          </button>
        </div>
      </div>

      {/* 筛选 */}
      <div className="flex gap-2">
        {(['all', 'unread'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              filter === f ? 'bg-emerald-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {f === 'all' ? '全部' : `未读${unreadCount > 0 ? `(${unreadCount})` : ''}`}
          </button>
        ))}
      </div>

      {/* 通知列表 */}
      {filteredNotifications.length === 0 ? (
        <Card className="p-8 text-center">
          <Bell className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400">
            {filter === 'unread' ? '暂无未读通知' : '暂无通知'}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map(notification => (
            <Card
              key={notification.id}
              className={`p-4 hover:bg-white/5 transition-colors cursor-pointer ${
                !notification.read ? 'border-l-2 border-l-emerald-500' : ''
              }`}
              onClick={() => markAsRead(notification.id)}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`font-medium truncate ${!notification.read ? 'text-white' : 'text-gray-300'}`}>
                      {notification.title}
                    </h4>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {formatTime(notification.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{notification.content}</p>
                  {notification.memberName && (
                    <p className="text-xs text-emerald-400 mt-1">
                      会员：{notification.memberName}
                    </p>
                  )}
                </div>
                {!notification.read && (
                  <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 mt-2" />
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
