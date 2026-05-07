import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  Award,
  Star,
  MessageSquare,
  ExternalLink,
  Edit,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { BottomModal } from '@/components/common/BottomModal'
import { CoachMenuItem } from '@/components/coach/CoachMenuItem'
import { CoachEditProfileModal } from '@/components/coach/CoachEditProfileModal'
import { useAuth } from '@/contexts/AuthContext'
import { useNotificationStore } from '@/stores/notificationStore'
import { useCoachProfileStore } from '@/stores/coachProfileStore'

export function CoachProfilePage({ onSwitchToMember }: { onSwitchToMember?: () => void }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { unreadCount } = useNotificationStore()
  const { profile, isLoading, fetchProfile } = useCoachProfileStore()

  useEffect(() => {
    fetchProfile(user?.id)
  }, [fetchProfile])

  // 弹窗
  const [showEditModal, setShowEditModal] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showSuggestionModal, setShowSuggestionModal] = useState(false)
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const [suggestion, setSuggestion] = useState('')

  // 通知偏好
  const [notifSettings, setNotifSettings] = useState({
    memberWarning: true,
    dailyReport: true,
    planUpdate: false,
    systemNotice: true,
  })

  // Toast
  const [toast, setToast] = useState<string | null>(null)
  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSubmitSuggestion = () => {
    if (!suggestion.trim()) return
    setShowSuggestionModal(false)
    setShowFeedbackModal(false)
    setSuggestion('')
    showToast('感谢您的反馈！')
  }

  const menuGroups = [
    {
      title: '账户设置',
      items: [
        {
          icon: <Bell className="w-5 h-5 text-rose-400" />,
          label: '通知中心',
          badge: unreadCount > 0 ? unreadCount : undefined,
          onClick: () => navigate('/coach/notifications')
        },
        {
          icon: <Bell className="w-5 h-5 text-cyan-400" />,
          label: '通知设置',
          onClick: () => setShowNotificationModal(true)
        },
        {
          icon: <HelpCircle className="w-5 h-5 text-gray-400" />,
          label: '帮助与反馈',
          description: '提交产品改进建议',
          onClick: () => setShowFeedbackModal(true)
        },
      ]
    },
    {
      title: '',
      items: [
        {
          icon: <RefreshCw className="w-5 h-5 text-purple-400" />,
          label: '切换为用户',
          description: '以用户身份查看应用',
          onClick: onSwitchToMember
        },
        {
          icon: <LogOut className="w-5 h-5 text-gray-400" />,
          label: '退出登录',
          onClick: handleLogout
        },
      ]
    }
  ]

  return (
    <div className="space-y-4 pb-24">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}

      {/* 个人信息卡片 */}
      <Card className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        ) : profile ? (
          <>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-3xl font-bold overflow-hidden">
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  profile.name.charAt(0)
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{profile.name}</h2>
                  {profile.verified && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">
                      <Award className="w-3 h-3 inline mr-1" />
                      认证教练
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 mt-1">教练编号：{profile.id.slice(0, 12)}</p>
                <div className="flex items-center gap-4 mt-2">
                  {profile.rating > 0 && (
                    <>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span className="text-sm font-medium">{profile.rating.toFixed(1)}</span>
                      </div>
                      <span className="text-sm text-gray-500">|</span>
                    </>
                  )}
                  <span className="text-sm text-gray-400">{profile.memberCount} 名会员</span>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(true)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Edit className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {profile.certifications && profile.certifications.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {profile.certifications.map(cert => (
                  <span
                    key={cert}
                    className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm"
                  >
                    <Award className="w-3 h-3 inline mr-1" />
                    {cert}
                  </span>
                ))}
              </div>
            )}

            {profile.specialty && (
              <p className="text-sm text-gray-400 mt-3">{profile.specialty}</p>
            )}
          </>
        ) : (
          <div className="text-center py-4 text-gray-500">暂无教练信息</div>
        )}
      </Card>

      {/* 菜单分组 */}
      {menuGroups.map((group, groupIndex) => (
        <Card key={groupIndex} className="divide-y divide-white/5">
          {group.title && (
            <div className="px-4 py-2 text-xs text-gray-500 uppercase tracking-wider">{group.title}</div>
          )}
          {group.items.map((item, itemIndex) => (
            <CoachMenuItem key={itemIndex} {...item} />
          ))}
        </Card>
      ))}

      <div className="text-center py-4">
        <p className="text-xs text-gray-600">Equilibrio Corporeo v1.0.0</p>
      </div>

      {/* 编辑资料弹窗 — 独立组件，内含 CloudBase 保存逻辑 */}
      <CoachEditProfileModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        coachName={profile?.name || '教练'}
        coachPhone={profile?.phone || ''}
        coachBio={profile?.bio || ''}
        coachId={profile?.id || ''}
      />

      {/* 帮助与反馈弹窗 */}
      <BottomModal open={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} title="帮助与反馈">
        <div className="space-y-3">
          <button
            onClick={() => showToast('常见问题功能开发中')}
            className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-cyan-400" />
              <span>常见问题</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
          <button
            onClick={() => { setShowFeedbackModal(false); setShowSuggestionModal(true) }}
            className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              <div>
                <span>提交改进建议</span>
                <p className="text-xs text-gray-500 mt-0.5">帮助我们做得更好</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
          <button
            onClick={() => showToast('评分功能开发中')}
            className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-amber-400" />
              <span>给我们评分</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
          <button
            onClick={() => showToast('更新日志功能开发中')}
            className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <ExternalLink className="w-5 h-5 text-blue-400" />
              <span>查看更新日志</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </BottomModal>

      {/* 提交改进建议弹窗 */}
      <BottomModal open={showSuggestionModal} onClose={() => setShowSuggestionModal(false)} title="提交改进建议">
        <div className="space-y-4">
          <textarea
            value={suggestion}
            onChange={e => setSuggestion(e.target.value)}
            placeholder="请描述您的建议或遇到的问题..."
            rows={5}
            className="w-full bg-slate-900 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
          />
          <button
            onClick={handleSubmitSuggestion}
            disabled={!suggestion.trim()}
            className="w-full py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            提交建议
          </button>
        </div>
      </BottomModal>

      {/* 通知设置弹窗 */}
      <BottomModal open={showNotificationModal} onClose={() => setShowNotificationModal(false)} title="通知设置">
        <div className="space-y-1">
          {[
            { key: 'memberWarning', label: '会员预警通知', desc: '会员数据异常时提醒' },
            { key: 'dailyReport', label: '每日报告', desc: '推送会员日报摘要' },
            { key: 'planUpdate', label: '方案更新', desc: '方案变更通知' },
            { key: 'systemNotice', label: '系统公告', desc: '重要系统通知' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-4 border-b border-white/5 last:border-0">
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
              <button
                onClick={() => setNotifSettings(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                className={`w-12 h-7 rounded-full transition-colors relative ${
                  notifSettings[item.key as keyof typeof notifSettings] ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  notifSettings[item.key as keyof typeof notifSettings] ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          ))}
        </div>
      </BottomModal>
    </div>
  )
}
