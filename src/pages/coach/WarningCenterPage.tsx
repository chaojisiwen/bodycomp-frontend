import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Clock, CheckCircle, Bell, Send, Check } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/common/Modal'
import { useAuth } from '@/contexts/AuthContext'
import { useWarningStore, useFilteredWarnings, useWarningStats, type IWarning } from '@/stores/warningStore'

export function WarningCenterPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // 接入 store
  const { filter, levelFilter, setFilter, setLevelFilter, fetchWarnings, sendReminder } = useWarningStore()
  const filteredWarnings = useFilteredWarnings()
  const stats = useWarningStats()

  // 消息弹窗状态
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [messageTarget, setMessageTarget] = useState<IWarning | null>(null)
  const [customMessage, setCustomMessage] = useState('')
  const [messageSent, setMessageSent] = useState(false)

  // 组件挂载时拉取预警数据
  useEffect(() => {
    fetchWarnings(user?.id)
  }, [fetchWarnings, user?.id])

  const handleSendReminder = (warning: IWarning) => {
    setMessageTarget(warning)
    setShowMessageModal(true)
  }

  const handleSendMessage = async () => {
    if (!messageTarget) return
    await sendReminder(messageTarget.id, customMessage, user?.id)
    setMessageSent(true)
    setTimeout(() => {
      setShowMessageModal(false)
      setMessageSent(false)
      setCustomMessage('')
      setMessageTarget(null)
    }, 1500)
  }

  const handleViewDetail = (memberId: string) => {
    navigate(`/coach/members/${memberId}`)
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'danger':
        return <AlertTriangle className="w-5 h-5 text-red-400" />
      case 'warning':
        return <Bell className="w-5 h-5 text-yellow-400" />
      default:
        return <CheckCircle className="w-5 h-5 text-emerald-400" />
    }
  }

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-gray-400">待处理预警</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.danger}</p>
              <p className="text-xs text-gray-400">严重预警</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 筛选 */}
      <div className="flex gap-2">
        <div className="flex gap-1 flex-1 bg-white/5 rounded-xl p-1">
          {(['all', 'pending', 'handled'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-1.5 rounded-lg text-xs transition-colors ${
                filter === f ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {f === 'all' ? '全部' : f === 'pending' ? '待处理' : '已处理'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {(['all', 'danger', 'warning'] as const).map(f => (
            <button
              key={f}
              onClick={() => setLevelFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                levelFilter === f ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {f === 'all' ? '全部级别' : f === 'danger' ? '严重' : '轻微'}
            </button>
          ))}
        </div>
      </div>

      {/* 预警列表 */}
      <div className="space-y-3 pb-6">
        {filteredWarnings.length === 0 ? (
          <Card className="p-8 text-center text-gray-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>暂无预警信息</p>
          </Card>
        ) : (
          filteredWarnings.map(warning => (
            <Card key={warning.id} className={`p-4 ${warning.status === 'handled' ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  {getLevelIcon(warning.level)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{warning.memberName}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        warning.level === 'danger' ? 'bg-red-500/20 text-red-400' :
                        warning.level === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {warning.level === 'danger' ? '严重' : warning.level === 'warning' ? '轻微' : '正常'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {warning.time}
                    </span>
                  </div>
                  <p className="font-medium mb-1">{warning.title}</p>
                  <p className="text-sm text-gray-400">{warning.description}</p>

                  {warning.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <button 
                        onClick={() => handleSendReminder(warning)}
                        className="flex-1 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors"
                      >
                        发送提醒
                      </button>
                      <button 
                        onClick={() => handleViewDetail(warning.memberId)}
                        className="flex-1 py-2 rounded-lg bg-white/5 text-gray-300 text-sm hover:bg-white/10 transition-colors"
                      >
                        查看详情
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* 发送消息弹窗 */}
      <Modal
        open={showMessageModal}
        onOpenChange={setShowMessageModal}
        title={`发消息给 ${messageTarget?.memberName}`}
        description="选择或编辑要发送的消息内容"
      >
        {messageSent ? (
          <div className="flex flex-col items-center py-8">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-lg font-medium text-white">消息已发送</p>
            <p className="text-sm text-slate-400 mt-1">会员将在消息列表中收到通知</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 发送消息 */}
            <div>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="输入自定义消息内容..."
                rows={3}
                className="w-full bg-slate-800/50 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
              />
            </div>

            {/* 发送按钮 */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowMessageModal(false)}
                className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 font-medium hover:bg-slate-600 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!customMessage.trim()}
                className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                发送消息
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
