import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MessageSquare,
  Target,
  Bell,
  Database,
  HelpCircle,
  LogOut,
  ChevronRight,
  Award,
  FileText,
  Star,
  Settings,
  X,
  Check,
  Phone,
  Camera,
  User,
  AlertTriangle,
  Salad,
  CalendarDays,
  BellRing,
  BellOff,
  Search,
  UserPlus,
  Link2,
  Inbox,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useProfileStore } from '@/stores'
import { useNotificationStore } from '@/stores/notificationStore'
import { usePlanTarget } from '@/stores/planStore'
import { useAuth } from '@/contexts/AuthContext'
import { getCoaches, bindCoach, unbindCoach } from '@/cloudbase/services/coach'
import { updateCurrentUserProfile } from '@/cloudbase/services'

// ─── 通用弹窗容器 ───────────────────────────────────────────────
function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className="relative w-full max-w-lg bg-[#1a1a2e] rounded-t-3xl p-6 pb-36 max-h-[90vh] overflow-y-auto"
        style={{ animation: 'slideUp 0.25s cubic-bezier(0.16,1,0.3,1)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

// ─── 确认弹窗 ────────────────────────────────────────────────────
function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  desc,
  confirmText = '确认',
  danger = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  desc: string
  confirmText?: string
  danger?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-[#1a1a2e] rounded-2xl p-6">
        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${danger ? 'bg-red-500/20' : 'bg-amber-500/20'}`}>
            <AlertTriangle className={`w-7 h-7 ${danger ? 'text-red-400' : 'text-amber-400'}`} />
          </div>
          <h3 className="text-lg font-bold">{title}</h3>
          <p className="text-sm text-gray-400">{desc}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-medium transition-colors">
            取消
          </button>
          <button
            onClick={() => { onConfirm(); onClose() }}
            className={`flex-1 py-3 rounded-xl font-medium transition-colors ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'} text-white`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 菜单行 ──────────────────────────────────────────────────────
interface MenuItemData {
  icon: React.ReactNode
  label: string
  badge?: string | number
  onClick?: () => void
  danger?: boolean
}

function MenuItem({ icon, label, badge, onClick, danger }: MenuItemData) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 hover:bg-white/5 active:bg-white/10 transition-colors"
    >
      <div className={`w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center ${danger ? 'text-red-400' : ''}`}>
        {icon}
      </div>
      <span className={`flex-1 text-left font-medium ${danger ? 'text-red-400' : ''}`}>{label}</span>
      {badge && (
        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
          {badge}
        </span>
      )}
      <ChevronRight className="w-5 h-5 text-gray-500" />
    </button>
  )
}

// ════════════════════════════════════════════════════════════════
//  主页面
// ════════════════════════════════════════════════════════════════
export function MemberProfilePage() {
  const navigate = useNavigate()
  const { user, login } = useAuth()

  // ── profileStore（头像、姓名、会员编号、打卡天数、目标） ──
  const { profile, setProfile, setGoal, fetchProfile, hasCoach, setHasCoach, currentCoach, setCoach } = useProfileStore()
  const { name, memberId, openid, checkInDays, goal, phone: storedPhone, avatar: storedAvatar } = profile
  const { notifications, unreadCount } = useNotificationStore()

  // ── 首次挂载：从 CloudBase 拉取用户信息（同步 openid + 确保 DB 记录存在） ──
  useEffect(() => {
    fetchProfile().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 账户设置编辑状态 ──
  const [editName, setEditName] = useState(name)
  const [editPhone, setEditPhone] = useState(storedPhone || '')
  const [editAvatar, setEditAvatar] = useState(storedAvatar || '')
  const [editingField, setEditingField] = useState<string | null>(null)

  // 同步 profile 变化到编辑状态
  useEffect(() => { setEditName(name) }, [name])
  useEffect(() => { setEditPhone(storedPhone || '') }, [storedPhone])

  // ── 教练列表（从 API 真实获取）─────────────────────────────
  const [availableCoaches, setAvailableCoaches] = useState<{ id: string; name: string; avatar: string; tags: string[]; rating: number; inviteCode: string }[]>([])
  const [coachesLoading, setCoachesLoading] = useState(true)

  useEffect(() => {
    getCoaches({ verified: true }).then((coaches) => {
      if (coaches && coaches.length > 0) {
        setAvailableCoaches(coaches.map(c => ({
          id: c.user_id || c._id || '',
          name: (c as any).name || c.title || '教练',
          avatar: ((c as any).name || c.title || '教').charAt(0),
          tags: Array.isArray((c as any).specialty) ? (c as any).specialty : (c.specialty ? [c.specialty] : []),
          rating: c.rating || 0,
          inviteCode: c.invite_code || '',
        })))
      } else {
        // API 无数据时保持空列表，UI 会显示「暂无可用教练」
        setAvailableCoaches([])
      }
      setCoachesLoading(false)
    }).catch(() => {
      setCoachesLoading(false)
    })
  }, [])

  // ── 教练选择状态（绑定时用） ──
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // 根据搜索词过滤教练列表（支持姓名、标签、邀请码）
  const filteredCoaches = availableCoaches.filter(coach => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.trim().toLowerCase()
    return (
      coach.name.toLowerCase().includes(q) ||
      coach.tags.some(tag => tag.toLowerCase().includes(q)) ||
      coach.inviteCode.toLowerCase().includes(q)
    )
  })

  // ── 教练绑定状态同步（已由 persist middleware 自动处理） ──
  // (noop — profileStore's persist middleware handles persistence)

  // ── 解绑 ──
  const [unbinding, setUnbinding] = useState(false)
  const handleUnbind = async () => {
    if (!selectedCoachId && !currentCoach?.id) return
    setUnbinding(true)
    try {
      const result = await unbindCoach(selectedCoachId || currentCoach?.id || '')
      if (!result.success) {
        console.error('[MemberProfile] 解绑失败:', result.error)
        alert('解绑失败: ' + (result.error || '未知错误'))
        return
      }
    } catch (e) {
      console.error('[MemberProfile] 解绑失败:', e)
      alert('解绑失败，请稍后重试')
      return
    }
    setHasCoach(false)
    setCoach(null)
    setSelectedCoachId(null)
    setUnbinding(false)
  }

  // ── 绑定教练 ──
  const [binding, setBinding] = useState(false)
  const handleBindCoach = async () => {
    const coach = availableCoaches.find(c => c.id === selectedCoachId)
    if (!coach) return
    setBinding(true)
    try {
      // 调用 CloudBase API 写入 coach_members 集合
      const result = await bindCoach(coach.id)
      if (result.success) {
        setCoach(coach)
        setHasCoach(true)
        close()
      } else {
        alert('绑定失败: ' + (result.error || '未知错误'))
      }
    } catch (e) {
      console.error('[MemberProfile] 绑定失败:', e)
      alert('绑定失败，请稍后重试')
    }
    setBinding(false)
  }

  // ── 弹窗状态 ──
  const [modal, setModal] = useState<
    | 'settings'
    | 'coachDetail'
    | 'chat'
    | 'comments'
    | 'goal'
    | 'myPlan'
    | 'notification'
    | 'feedback'
    | 'unbind'
    | 'logout'
    | 'bindCoach'
    | null
  >(null)

  const open = (m: typeof modal) => setModal(m)
  const close = () => setModal(null)

  // ── 通知开关状态（从 store 持久化） ──
  const { notifToggles, setNotifToggle } = useNotificationStore()
  const toggleNotif = (key: string) => {
    setNotifToggle(key, !notifToggles[key])
  }

  // ── 目标编辑状态（从 store 初始化） ──
  const [goalWeight, setGoalWeight] = useState(goal.targetWeight.toString())
  const [goalBodyFat, setGoalBodyFat] = useState(goal.targetBodyFat.toString())
  const [goalDate, setGoalDate] = useState(goal.targetDate)

  // ── 教练评语：基于真实通知数据（type=comment） ──
  const coachComments = notifications
    .filter(n => n.type === 'comment')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const latestComment = coachComments[0]
    ? {
        date: new Date(coachComments[0].createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
        content: coachComments[0].content,
        coach: coachComments[0].coachName || currentCoach?.name || '教练',
      }
    : null

  const allComments = coachComments.map(c => ({
    date: new Date(c.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
    content: c.content,
  }))

  // ── 退出登录 ──
  const handleLogout = () => {
    setHasCoach(false)
    setCoach(null)
    navigate('/login')
  }

  // ── 菜单分组（根据 hasCoach 动态） ──
  const menuGroups: { title: string; items: MenuItemData[] }[] = [
    {
      title: '健康管理',
      items: [
        { icon: <Target className="w-5 h-5 text-emerald-400" />, label: '目标设置', badge: `体重${goal.targetWeight}kg`, onClick: () => open('goal') },
        { icon: <Database className="w-5 h-5 text-blue-400" />, label: '数据更新', badge: `更新于${new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }).replace('-', '/')}`, onClick: () => navigate('/member/body-data') },
        { icon: <FileText className="w-5 h-5 text-purple-400" />, label: '我的方案', badge: '减脂计划', onClick: () => open('myPlan') },
        ...(hasCoach && unreadCount > 0
          ? [{ icon: <Inbox className="w-5 h-5 text-amber-400" />, label: '收到的消息', badge: unreadCount > 9 ? '9+' : unreadCount, onClick: () => navigate('/member/messages') }]
          : hasCoach
          ? [{ icon: <Inbox className="w-5 h-5 text-gray-400" />, label: '收到的消息', onClick: () => navigate('/member/messages') }]
          : []),
        ...(hasCoach
          ? [{ icon: <MessageSquare className="w-5 h-5 text-amber-400" />, label: '教练评语', badge: coachComments.length > 0 ? coachComments.length + '条' : undefined, onClick: () => { open('comments') } }]
          : []),
      ],
    },
    {
      title: '账户设置',
      items: [
        { icon: <Bell className="w-5 h-5 text-rose-400" />, label: '通知设置', onClick: () => open('notification') },
        { icon: <HelpCircle className="w-5 h-5 text-cyan-400" />, label: '帮助与反馈', onClick: () => open('feedback') },
      ],
    },
    {
      title: '',
      items: [
        ...(hasCoach
          ? [{ icon: <X className="w-5 h-5 text-red-400" />, label: '解除绑定', onClick: () => open('unbind'), danger: true }]
          : []),
        { icon: <LogOut className="w-5 h-5 text-gray-400" />, label: '退出登录', onClick: () => open('logout'), danger: false },
      ],
    },
  ]

  return (
    <div className="space-y-4 pb-24">
      {/* ── 个人信息卡片 ── */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-2xl font-bold overflow-hidden">
            {storedAvatar ? (
              <img src={storedAvatar} alt="头像" className="w-full h-full object-cover" />
            ) : (
              name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{name}</h2>
            <p className="text-sm text-gray-400">会员编号：{memberId}</p>
            <div className="flex items-center gap-2 mt-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-sm text-gray-400">坚持打卡 {checkInDays} 天</span>
            </div>
          </div>
          <button onClick={() => open('settings')} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition-all">
            <Settings className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </Card>

      {/* ── 教练信息卡片（有教练时显示） ── */}
      {hasCoach ? (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">我的教练</span>
            <button onClick={() => open('coachDetail')} className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
              查看详情
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-lg font-bold">
              {currentCoach?.avatar}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{currentCoach?.name}</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                  <Award className="w-3 h-3 inline mr-1" />
                  {currentCoach?.rating}
                </span>
              </div>
              <div className="flex gap-2 mt-1">
                {currentCoach?.tags.map(tag => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400">
                    {tag}
                  </span>
                ))}
              </div>
              {currentCoach?.inviteCode && (
                <p className="text-xs text-gray-600 mt-1">ID: {currentCoach.inviteCode}</p>
              )}
            </div>
            <button onClick={() => open('chat')} className="px-4 py-2 rounded-full bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 active:scale-95 transition-all">
              咨询
            </button>
          </div>
        </Card>
      ) : (
        /* ── 无教练时显示绑定入口 ── */
        <Card className="p-6">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
              <UserPlus className="w-8 h-8 text-gray-500" />
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-300">尚未绑定教练</p>
              <p className="text-sm text-gray-500 mt-1">绑定教练可获得专业指导</p>
            </div>
            <button
              onClick={() => { setSelectedCoachId(null); open('bindCoach') }}
              className="px-6 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium active:scale-95 transition-all"
            >
              立即绑定
            </button>
          </div>
        </Card>
      )}

      {/* ── 最新教练评语（有教练且有评语时显示） ── */}
      {hasCoach && latestComment ? (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-400" />
              <span className="font-semibold">教练评语</span>
            </div>
            <span className="text-xs text-gray-500">{latestComment.date}</span>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-gray-300 leading-relaxed">{latestComment.content}</p>
            <p className="text-sm text-gray-500 mt-2">—— {latestComment.coach}</p>
          </div>
          <button onClick={() => navigate('/member/messages')} className="w-full mt-3 py-2 rounded-lg bg-white/5 text-gray-400 text-sm hover:bg-white/10 active:bg-white/20 transition-colors">
            查看所有评语 & 回复
          </button>
        </Card>
      ) : hasCoach ? (
        <Card className="p-4">
          <div className="flex flex-col items-center gap-3 py-3 text-center">
            <MessageSquare className="w-8 h-8 text-gray-600" />
            <p className="text-sm text-gray-500">暂无教练评语</p>
            <p className="text-xs text-gray-600">教练给你的饮食和运动记录写评语后会显示在这里</p>
          </div>
        </Card>
      ) : null}

      {/* ── 菜单分组 ── */}
      {menuGroups.map((group, gi) => (
        <Card key={gi} className="divide-y divide-white/5">
          {group.title && (
            <div className="px-4 py-2 text-xs text-gray-500 uppercase tracking-wider">
              {group.title}
            </div>
          )}
          {group.items.map((item, ii) => (
            <MenuItem key={ii} icon={item.icon} label={item.label} badge={item.badge} onClick={item.onClick} danger={item.danger} />
          ))}
        </Card>
      ))}

      {/* ══════════════════════════════════════════
          弹 窗 区 域
      ══════════════════════════════════════════ */}

      {/* 1. 账户设置 */}
      <BottomSheet open={modal === 'settings'} onClose={close} title="账户设置">
        <div className="space-y-4">
          {/* 头像区域 */}
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="relative">
              <div
                className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-3xl font-bold overflow-hidden"
              >
                {editAvatar === 'loading' ? (
                  <span className="animate-pulse text-sm">转换中…</span>
                ) : editAvatar ? (
                  <img src={editAvatar} alt="头像" className="w-full h-full object-cover" />
                ) : (
                  editName.charAt(0).toUpperCase()
                )}
              </div>
              <button
                onClick={async () => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'image/*'
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0]
                    if (!file) return

                    // 检测 HEIC/HEIF 格式（苹果手机默认拍照格式）
                    const isHeic =
                      file.type === 'image/heic' ||
                      file.type === 'image/heif' ||
                      file.name.toLowerCase().endsWith('.heic') ||
                      file.name.toLowerCase().endsWith('.heif')

                    if (isHeic) {
                      try {
                        setEditAvatar('loading')
                        const { convertHeicToJpeg } = await import('@/utils/heicConvert')
                        const jpegBase64 = await convertHeicToJpeg(file)
                        setEditAvatar(jpegBase64)
                      } catch (err) {
                        console.error('[Avatar] HEIC转换失败:', err)
                        alert('照片格式转换失败，请尝试使用 JPG/PNG 格式的照片')
                        setEditAvatar('')
                      }
                    } else {
                      const reader = new FileReader()
                      reader.onload = () => setEditAvatar(reader.result as string)
                      reader.readAsDataURL(file)
                    }
                  }
                  input.click()
                }}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center hover:bg-emerald-600 transition-colors"
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
            </div>
            <p className="text-xs text-gray-500">点击更换头像</p>
          </div>

          {/* 昵称 */}
          <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400 text-sm w-16">昵称</span>
            {editingField === 'name' ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => setEditingField(null)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                className="flex-1 text-right bg-transparent border-b border-emerald-500 focus:outline-none px-1"
                autoFocus
              />
            ) : (
              <span
                className="flex-1 text-right cursor-pointer"
                onClick={() => setEditingField('name')}
              >
                {editName}
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </div>

          {/* 手机号 */}
          <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl">
            <Phone className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400 text-sm w-16">手机号</span>
            {editingField === 'phone' ? (
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                onBlur={() => setEditingField(null)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                className="flex-1 text-right bg-transparent border-b border-emerald-500 focus:outline-none px-1"
                autoFocus
                placeholder="输入手机号"
              />
            ) : (
              <span
                className="flex-1 text-right cursor-pointer"
                onClick={() => setEditingField('phone')}
              >
                {editPhone || '未设置'}
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </div>

          <button
            onClick={async () => {
              // 1. 保存到本地 store（立即生效 + persist 持久化）
              setProfile({ name: editName, phone: editPhone, avatar: editAvatar })
              // 2. 写入 CloudBase users 集合
              await updateCurrentUserProfile({
                name: editName,
                avatar: editAvatar || undefined,
                phone: editPhone || undefined,
              })
              // 3. 同步到 AuthContext（其他页面共享 user.name）
              if (user) {
                login({ ...user, name: editName })
              }
              setEditingField(null)
              close()
            }}
            className="w-full mt-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors"
          >
            保存修改
          </button>
        </div>
      </BottomSheet>

      {/* 2. 教练详情 */}
      <BottomSheet open={modal === 'coachDetail'} onClose={close} title="教练详情">
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-3xl font-bold">
              {currentCoach?.avatar}
            </div>
            <h4 className="text-xl font-bold">{currentCoach?.name}</h4>
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(i => (
                <Star key={i} className={`w-4 h-4 ${i <= 4 ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}`} />
              ))}
              <span className="text-amber-400 text-sm ml-1">{currentCoach?.rating}</span>
            </div>
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            {currentCoach?.tags.map(tag => (
              <span key={tag} className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm">{tag}</span>
            ))}
            <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm">体能测评师</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: '服务会员', value: (currentCoach as any)?.memberCount ? `${(currentCoach as any).memberCount}人` : '--' },
              { label: '好评率', value: currentCoach?.rating ? `${(currentCoach.rating * 20).toFixed(0)}%` : '--' },
              { label: '评分', value: currentCoach?.rating ? String(currentCoach.rating) : '--' },
            ].map(stat => (
              <div key={stat.label} className="bg-white/5 rounded-xl p-3">
                <p className="text-lg font-bold text-emerald-400">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-sm text-gray-400 leading-relaxed">
              {currentCoach?.tags?.join('、') ? `擅长${currentCoach.tags.join('、')}，为您提供专业指导。` : '专业健身教练，为您提供科学的训练和饮食指导。'}
            </p>
          </div>
          <button onClick={() => { close(); open('chat') }} className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors">
            立即咨询
          </button>
        </div>
      </BottomSheet>

      {/* 3. 咨询教练 */}
      <BottomSheet open={modal === 'chat'} onClose={close} title="咨询教练">
        <div className="space-y-4">
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-sm mb-1">正在咨询</p>
            <p className="font-bold">{currentCoach?.name}</p>
            <p className="text-xs text-emerald-400 mt-1">● 在线</p>
          </div>
          <div className="flex gap-2 pt-2">
            <input
              className="flex-1 bg-white/10 rounded-xl px-4 py-3 text-sm placeholder-gray-500 outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="输入消息..."
            />
            <button
              onClick={() => alert('消息已发送给' + (currentCoach?.name || '教练') + '，请耐心等待回复～')}
              className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
            >
              发送
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* 4. 历史评语 */}
      <BottomSheet open={modal === 'comments'} onClose={close} title="教练评语">
        <div className="space-y-3">
          {allComments.map((c, i) => (
            <div key={i} className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-emerald-400 font-medium">{currentCoach?.name}</span>
                <span className="text-xs text-gray-500">{c.date}</span>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">{c.content}</p>
            </div>
          ))}
        </div>
      </BottomSheet>

      {/* 5. 目标设置 */}
      <BottomSheet open={modal === 'goal'} onClose={close} title="目标设置">
        <div className="space-y-4">
          <div className="space-y-3">
            <label className="text-sm text-gray-400 block">目标体重（kg）</label>
            <div className="flex items-center gap-3 bg-white/5 rounded-xl p-4">
              <Target className="w-5 h-5 text-emerald-400 shrink-0" />
              <input type="number" value={goalWeight} onChange={e => setGoalWeight(e.target.value)} className="flex-1 bg-transparent outline-none text-right text-lg font-bold" />
              <span className="text-gray-500 text-sm">kg</span>
            </div>
            <label className="text-sm text-gray-400 block mt-2">目标体脂率（%）</label>
            <div className="flex items-center gap-3 bg-white/5 rounded-xl p-4">
              <Target className="w-5 h-5 text-blue-400 shrink-0" />
              <input type="number" value={goalBodyFat} onChange={e => setGoalBodyFat(e.target.value)} className="flex-1 bg-transparent outline-none text-right text-lg font-bold" />
              <span className="text-gray-500 text-sm">%</span>
            </div>
            <label className="text-sm text-gray-400 block mt-2">目标达成日期</label>
            <div className="flex items-center gap-3 bg-white/5 rounded-xl p-4">
              <CalendarDays className="w-5 h-5 text-purple-400 shrink-0" />
              <input type="date" value={goalDate} onChange={e => setGoalDate(e.target.value)} className="flex-1 bg-transparent outline-none text-right" style={{ colorScheme: 'dark' }} />
            </div>
          </div>
          <button
            onClick={() => {
              setGoal({
                targetWeight: Number(goalWeight) || goal.targetWeight,
                targetBodyFat: Number(goalBodyFat) || goal.targetBodyFat,
                targetDate: goalDate || goal.targetDate,
              })
              close()
            }}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            保存目标
          </button>
        </div>
      </BottomSheet>

      {/* 6. 我的方案 */}
      <BottomSheet open={modal === 'myPlan'} onClose={close} title="我的方案">
        <div className="space-y-4">
          {(() => {
            const pt = usePlanTarget()
            const targetKcal = pt?.targetCalories || 1800
            const targetPro = pt?.targetProtein || 120
            const targetCarb = pt?.targetCarb || 150
            return (
              <>
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold">
                      {targetKcal <= 1600 ? '减脂' : targetKcal >= 2200 ? '增肌' : '维持'}计划
                    </p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">进行中</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-black/20 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-emerald-400">{goal.targetWeight}kg</p>
                      <p className="text-xs text-gray-500">目标体重</p>
                    </div>
                    <div className="bg-black/20 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-blue-400">{goal.targetBodyFat}%</p>
                      <p className="text-xs text-gray-500">目标体脂</p>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>目标日期：{goal.targetDate}</span>
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Salad className="w-5 h-5 text-emerald-400" />
                    <p className="font-medium">每日饮食目标</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[
                      { label: '热量', value: String(targetKcal), unit: 'kcal' },
                      { label: '蛋白质', value: String(targetPro), unit: 'g' },
                      { label: '碳水', value: String(targetCarb), unit: 'g' },
                    ].map(macro => (
                      <div key={macro.label} className="bg-black/20 rounded-xl p-3">
                        <p className="text-lg font-bold text-emerald-400">{macro.value}</p>
                        <p className="text-xs text-gray-500">{macro.unit} / {macro.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      </BottomSheet>

      {/* 7. 通知设置 */}
      <BottomSheet open={modal === 'notification'} onClose={close} title="通知设置">
        <div className="space-y-3">
          {(Object.entries(notifToggles) as [keyof typeof notifToggles, boolean][]).map(([key, enabled]) => (
            <div key={String(key)} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                {enabled ? <BellRing className="w-5 h-5 text-emerald-400" /> : <BellOff className="w-5 h-5 text-gray-500" />}
              </div>
              <span className="flex-1 font-medium">{String(key)}</span>
              <button
                onClick={() => toggleNotif(key)}
                className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-white/20'}`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          ))}
        </div>
      </BottomSheet>

      {/* 8. 帮助与反馈 */}
      <BottomSheet open={modal === 'feedback'} onClose={close} title="帮助与反馈">
        <div className="space-y-3">
          {[
            { icon: <HelpCircle className="w-5 h-5 text-cyan-400" />, label: '常见问题', onClick: () => alert('Q：如何绑定教练？\nA：在"我的"页面点击"立即绑定"选择教练即可\n\nQ：如何记录饮食？\nA：首页点击"拍照识别"或进入"饮食记录"手动添加') },
            { icon: <MessageSquare className="w-5 h-5 text-emerald-400" />, label: '提交反馈', onClick: () => alert('感谢您的反馈！我们会尽快处理。您也可以直接联系教练反馈问题。') },
            { icon: <Star className="w-5 h-5 text-amber-400" />, label: '给我们评分', onClick: () => alert('如果您觉得 Equilibrio 对您有帮助，请告诉身边的朋友～感谢支持！❤️') },
          ].map(item => (
            <button key={item.label} className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left flex items-center justify-between">
              <div className="flex items-center gap-3">
                {item.icon}
                <span>{item.label}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* 9. 绑定教练 */}
      <BottomSheet open={modal === 'bindCoach'} onClose={close} title="绑定教练">
        <div className="space-y-4">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              className="w-full bg-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-400 outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="搜索教练姓名或邀请码..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* 教练列表 */}
          <div className="space-y-2">
            {coachesLoading && (
              <div className="text-center py-8 text-gray-400 text-sm">加载中...</div>
            )}
            {!coachesLoading && availableCoaches.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">暂无可用教练</div>
            )}
            {!coachesLoading && availableCoaches.length > 0 && filteredCoaches.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                未找到匹配"{searchQuery}"的教练
              </div>
            )}
            {!coachesLoading && filteredCoaches.map(coach => (
              <button
                key={coach.id}
                onClick={() => setSelectedCoachId(coach.id)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl transition-colors ${selectedCoachId === coach.id ? 'bg-emerald-500/20 ring-1 ring-emerald-500' : 'bg-white/5 hover:bg-white/10'}`}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-lg font-bold shrink-0">
                  {coach.avatar}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{coach.name}</p>
                    <span className="text-xs text-amber-400">★ {coach.rating}</span>
                  </div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {coach.tags.map(tag => (
                      <span key={tag} className="text-xs px-1.5 py-0.5 rounded-full bg-white/10 text-gray-400">{tag}</span>
                    ))}
                  </div>
                  {coach.inviteCode && (
                    <p className="text-xs text-gray-600 mt-0.5">ID: {coach.inviteCode}</p>
                  )}
                </div>
                {selectedCoachId === coach.id && <Check className="w-5 h-5 text-emerald-400 shrink-0" />}
              </button>
            ))}
          </div>

          {/* 确认绑定按钮 */}
          <button
            onClick={handleBindCoach}
            disabled={!selectedCoachId || binding}
            className={`w-full py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${selectedCoachId && !binding ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-white/10 text-gray-500 cursor-not-allowed'}`}
          >
            <Link2 className="w-5 h-5" />
            {binding ? '绑定中...' : selectedCoachId ? `确认绑定 ${availableCoaches.find(c => c.id === selectedCoachId)?.name}` : '请选择教练'}
          </button>
        </div>
      </BottomSheet>

      {/* 10. 解除绑定确认 */}
      <ConfirmDialog
        open={modal === 'unbind'}
        onClose={close}
        onConfirm={handleUnbind}
        title="解除教练绑定"
        desc="解绑后将无法继续接收教练指导和方案推送，确定要解除绑定吗？"
        confirmText={unbinding ? '解绑中...' : '确认解绑'}
        danger
      />

      {/* 11. 退出登录确认 */}
      <ConfirmDialog
        open={modal === 'logout'}
        onClose={close}
        onConfirm={handleLogout}
        title="退出登录"
        desc="确定要退出当前账号吗？"
        confirmText="退出"
      />
    </div>
  )
}
