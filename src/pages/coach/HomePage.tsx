/**
 * 教练端首页
 *
 * 显示：
 * - 日期 + 在线状态
 * - 今日任务（待回访/待出计划/未打卡）→ 点击弹窗 → 跳转会员详情
 * - 本周概览（环形活跃率 + 本周打卡柱状图）
 * - 最新预警（4级预警卡片）→ 点击处理/跳转
 * - 会员最新打卡（照片墙）→ hover/点击展开AI识别信息
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock, X, ChevronRight, Utensils, Dumbbell,
  MessageCircleWarning, FilePlus,
} from 'lucide-react'
import { coachApi, type Member } from '@/services/api'

// 计算今日任务数
function useTodayTasks(members: Member[]) {
  const today = new Date().toISOString().split('T')[0]

  const pendingFollowup = members.filter(m => m.warnings > 0).length
  const pendingPlan = members.filter(m => !m.hasPlan).length
  const pendingUpload = members.filter(m => {
    if (!m.lastRecord) return true
    return m.lastRecord !== today && m.lastRecord !== today.slice(5)
  }).length

  return { pendingFollowup, pendingPlan, pendingUpload }
}

// 本周数据统计
function useWeekStats(members: Member[]) {
  const today = new Date()
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekAgoStr = weekAgo.toISOString().split('T')[0].slice(5)

  const activeThisWeek = members.filter(m => {
    if (!m.lastRecord) return false
    return m.lastRecord >= weekAgoStr
  }).length

  const activeRate = members.length > 0 ? Math.round((activeThisWeek / members.length) * 100) : 0

  // 本周每日打卡人数（模拟柱状图数据）
  const dailyStats = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    const dayStr = d.toISOString().split('T')[0].slice(5)
    const count = members.filter(m => {
      if (!m.lastRecord) return false
      return m.lastRecord === dayStr
    }).length
    return { day: dayStr, count, rate: members.length > 0 ? Math.round((count / members.length) * 100) : 0 }
  })

  return { activeThisWeek, activeRate, dailyStats }
}

// 预警卡片类型
type WarningLevel = 'danger' | 'warning' | 'info' | 'done'
interface WarningCard {
  id: string
  memberId: string
  memberName: string
  title: string
  level: WarningLevel
  time: string
}

// 生成预警数据（基于 members 真实数据）
function useWarnings(members: Member[]) {
  const warnings: WarningCard[] = []

  // 严重：warnings > 0 的会员
  members.filter(m => m.warnings > 0).forEach(m => {
    warnings.push({
      id: `w-danger-${m.id}`,
      memberId: m.id,
      memberName: m.name,
      title: `${m.name}有待处理预警`,
      level: 'danger',
      time: '10分钟前',
    })
  })

  // 警告：热量超标（模拟数据）
  members.slice(0, 2).forEach((m, i) => {
    warnings.push({
      id: `w-warning-${m.id}`,
      memberId: m.id,
      memberName: m.name,
      title: `${m.name}今日热量摄入偏高`,
      level: 'warning',
      time: `${30 + i * 15}分钟前`,
    })
  })

  // 关注：长期未更新（模拟）
  members.filter(m => m.lastRecord && m.lastRecord < new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0].slice(5))
    .forEach(m => {
      warnings.push({
        id: `w-info-${m.id}`,
        memberId: m.id,
        memberName: m.name,
        title: `${m.name}已3天未上传体成分`,
        level: 'info',
        time: '2小时前',
      })
    })

  // 已处理样例（最多1条）
  if (warnings.length > 0) {
    const last = warnings[warnings.length - 1]
    warnings[warnings.length - 1] = { ...last, level: 'done', title: `${last.memberName}已补打卡` }
  }

  return warnings.slice(0, 5)
}

// 打卡照片类型
interface CheckinPhoto {
  id: string
  memberId: string
  memberName: string
  type: 'meal' | 'exercise'
  imageUrl: string
  recognized: {
    food?: string
    calories?: number
    protein?: number
    carbs?: number
    exercise?: string
    duration?: number
    consumed?: number
    intensity?: string
  }
  time: string
}

// 从云数据库获取真实打卡数据
async function fetchRealCheckins(memberIds: string[]): Promise<CheckinPhoto[]> {
  try {
    const { getApp, COLLECTIONS } = await import('@/cloudbase/services')

    const db = getApp()?.database()
    if (!db || memberIds.length === 0) return []

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    const photos: CheckinPhoto[] = []

    // 获取饮食打卡（有图片的）
    const mealsRes = await db
      .collection(COLLECTIONS.MEALS)
      .where({
        user_id: db.command.in(memberIds),
        image_url: db.command.exists(true),
        created_at: db.command.gte(oneDayAgo),
      })
      .orderBy('created_at', 'desc')
      .limit(1)
      .get()

    mealsRes.data?.forEach((m: any) => {
      photos.push({
        id: `meal-${m._id}`,
        memberId: m.user_id,
        memberName: '会员', // 后续从 users 表获取
        type: 'meal',
        imageUrl: m.image_url,
        recognized: {
          food: m.foods?.[0]?.name || '未识别',
          calories: m.total_calories,
          protein: m.total_protein,
          carbs: m.total_carbs,
        },
        time: new Date(m.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      })
    })

    // 获取运动打卡（有图片的）
    const exercisesRes = await db
      .collection(COLLECTIONS.EXERCISES)
      .where({
        user_id: db.command.in(memberIds),
        image_url: db.command.exists(true),
        created_at: db.command.gte(oneDayAgo),
      })
      .orderBy('created_at', 'desc')
      .limit(1)
      .get()

    exercisesRes.data?.forEach((e: any) => {
      photos.push({
        id: `exercise-${e._id}`,
        memberId: e.user_id,
        memberName: '会员',
        type: 'exercise',
        imageUrl: e.image_url,
        recognized: {
          exercise: e.exercises?.[0]?.name || '未识别',
          duration: e.total_duration,
          consumed: e.total_calories,
          intensity: e.exercises?.[0]?.intensity || '中等',
        },
        time: new Date(e.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      })
    })

    return photos.slice(0, 2) // 最多返回2条
  } catch (error) {
    console.error('[HomePage] 获取打卡数据失败:', error)
    return []
  }
}

// 最新打卡数据（优先从云数据库获取，否则用模拟数据）
function useRecentCheckins(members: Member[]) {
  const [photos, setPhotos] = useState<CheckinPhoto[]>([])

  useEffect(() => {
    if (members.length === 0) {
      setPhotos([])
      return
    }

    const memberIds = members.map(m => m.id)
    fetchRealCheckins(memberIds).then(realPhotos => {
      if (realPhotos.length > 0) {
        // 补充会员名称
        const nameMap = new Map(members.map(m => [m.id, m.name]))
        const photosWithNames = realPhotos.map(p => ({
          ...p,
          memberName: nameMap.get(p.memberId) || '会员',
        }))
        setPhotos(photosWithNames)
      } else {
        // 无真实数据时使用默认图片
        setPhotos([
          {
            id: `photo-${members[0].id}-meal`,
            memberId: members[0].id,
            memberName: members[0].name,
            type: 'meal',
            imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop',
            recognized: { food: '暂无打卡数据', calories: 0, protein: 0, carbs: 0 },
            time: '--:--',
          },
          {
            id: `photo-${members[1]?.id || members[0].id}-exercise`,
            memberId: members[1]?.id || members[0].id,
            memberName: members[1]?.name || members[0].name,
            type: 'exercise',
            imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=300&h=300&fit=crop',
            recognized: { exercise: '暂无打卡数据', duration: 0, consumed: 0, intensity: '低' },
            time: '--:--',
          },
        ])
      }
    })
  }, [members])

  return photos
}

// 环形进度 SVG
function RingProgress({ value, size = 80, stroke = 6 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - value / 100)

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#334155" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="#10b981" strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-emerald-400">{value}%</span>
      </div>
    </div>
  )
}

// 任务卡片
function TaskCard({
  label, value, icon: Icon, colorClass, bgClass, onClick,
}: {
  label: string; value: number; icon: React.ElementType; colorClass: string; bgClass: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 hover:bg-slate-800/70 transition-colors text-left active:scale-95"
    >
      <div className={`w-8 h-8 rounded-lg ${bgClass} flex items-center justify-center mb-2`}>
        <Icon className={`w-4 h-4 ${colorClass}`} />
      </div>
      <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
    </button>
  )
}

// 预警卡片
function WarningCard({
  warning, onHandle, onNavigate,
}: {
  warning: WarningCard; onHandle: () => void; onNavigate: () => void
}) {
  const config = {
    danger: {
      bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-500',
      text: 'text-red-300', label: '严重', labelBg: 'bg-red-500/20', labelText: 'text-red-400',
      btnBg: 'bg-red-500/20', btnText: 'text-red-400',
      pulse: true,
    },
    warning: {
      bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-500',
      text: 'text-orange-300', label: '警告', labelBg: 'bg-orange-500/20', labelText: 'text-orange-400',
      btnBg: 'bg-orange-500/20', btnText: 'text-orange-400',
      pulse: false,
    },
    info: {
      bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dot: 'bg-yellow-500',
      text: 'text-yellow-300', label: '关注', labelBg: 'bg-yellow-500/20', labelText: 'text-yellow-400',
      btnBg: 'bg-yellow-500/20', btnText: 'text-yellow-400',
      pulse: false,
    },
    done: {
      bg: 'bg-slate-800/50', border: 'border-slate-700/50', dot: 'bg-slate-500',
      text: 'text-slate-400', label: '已处理', labelBg: 'bg-slate-500/20', labelText: 'text-slate-400',
      btnBg: 'bg-slate-500/20', btnText: 'text-slate-400',
      pulse: false,
    },
  }[warning.level]

  return (
    <div className={`${config.bg} border ${config.border} rounded-xl p-3 flex items-start gap-3`}>
      <div className={`w-2 h-2 rounded-full ${config.dot} mt-1.5 shrink-0 ${config.pulse ? 'animate-pulse' : ''}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium truncate ${config.text}`}>{warning.title}</p>
          <span className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 ${config.labelBg} ${config.labelText}`}>
            {config.label}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{warning.time}</p>
      </div>
      {warning.level !== 'done' ? (
        <button onClick={onHandle} className={`px-3 py-1 text-xs rounded-lg shrink-0 ${config.btnBg} ${config.btnText}`}>
          处理
        </button>
      ) : (
        <button onClick={onNavigate} className={`px-3 py-1 text-xs rounded-lg shrink-0 ${config.btnBg} ${config.btnText}`}>
          详情
        </button>
      )}
    </div>
  )
}

// 弹窗组件
function MemberModal({
  open, title, members, loading, onClose, onMemberClick,
}: {
  open: boolean; title: string; members: Member[]; loading: boolean; onClose: () => void; onMemberClick: (id: string) => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center" onClick={onClose}>
      <div className="w-full max-w-lg bg-[#1a1a2e] rounded-t-3xl p-6 pb-[144px] animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">加载中...</div>
        ) : members.length === 0 ? (
          <div className="text-center py-12 text-gray-400">暂无数据</div>
        ) : (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {members.map(m => (
              <button
                key={m.id}
                onClick={() => onMemberClick(m.id)}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors active:bg-white/5"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {m.name ? m.name.charAt(0) : '?'}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-white">{m.name}</p>
                  <p className="text-xs text-gray-500">
                    {m.hasPlan ? '有计划' : '待出计划'}
                    {m.lastRecord ? ` · 上次 ${m.lastRecord}` : ' · 暂无记录'}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// 格式化日期
function formatDate() {
  const now = new Date()
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${now.getMonth() + 1}月${now.getDate()}日 ${days[now.getDay()]}`
}

export function HomePage() {
  const navigate = useNavigate()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  // 今日任务弹窗
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modalMembers, setModalMembers] = useState<Member[]>([])

  useEffect(() => {
    coachApi.getMyMembers().then(res => {
      if (res.success && res.data) {
        setMembers(res.data)
      }
      setLoading(false)
    })
  }, [])

  const { pendingFollowup, pendingPlan, pendingUpload } = useTodayTasks(members)
  const { activeThisWeek, activeRate, dailyStats } = useWeekStats(members)
  const warnings = useWarnings(members)
  const recentCheckins = useRecentCheckins(members)

  const tasks = [
    {
      label: '待回访',
      value: pendingFollowup,
      icon: MessageCircleWarning,
      colorClass: 'text-red-400',
      bgClass: 'bg-red-500/20',
      members: members.filter(m => m.warnings > 0),
    },
    {
      label: '待出计划',
      value: pendingPlan,
      icon: FilePlus,
      colorClass: 'text-orange-400',
      bgClass: 'bg-orange-500/20',
      members: members.filter(m => !m.hasPlan),
    },
    {
      label: '未打卡',
      value: pendingUpload,
      icon: Clock,
      colorClass: 'text-yellow-400',
      bgClass: 'bg-yellow-500/20',
      members: members.filter(m => {
        const today = new Date().toISOString().split('T')[0]
        if (!m.lastRecord) return true
        return m.lastRecord !== today && m.lastRecord !== today.slice(5)
      }),
    },
  ]

  const openModal = (task: typeof tasks[0]) => {
    setModalTitle(task.label)
    setModalMembers(task.members)
    setModalOpen(true)
  }

  const goToMember = (id: string) => {
    setModalOpen(false)
    navigate(`/coach/members/${id}`)
  }

  const handleWarning = (warning: WarningCard) => {
    // 处理预警：发送提醒 + 跳转
    console.log('[首页] 处理预警:', warning.title)
    navigate(`/coach/members/${warning.memberId}`)
  }

  const handleWarningNavigate = (warning: WarningCard) => {
    navigate(`/coach/members/${warning.memberId}`)
  }

  // 计算柱状图最大高度基准
  const maxCount = Math.max(...dailyStats.map(d => d.count), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold text-white">教练后台</h1>
          <p className="text-slate-400 text-sm mt-0.5">{formatDate()}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400">在线</span>
        </div>
      </div>

      {/* 今日任务 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-slate-300">今日任务</h2>
          <button
            onClick={() => navigate('/coach/warnings')}
            className="text-xs text-slate-500 hover:text-emerald-400 transition-colors"
          >
            全部任务 →
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {tasks.map(task => (
            <TaskCard
              key={task.label}
              label={task.label}
              value={loading ? 0 : task.value}
              icon={task.icon}
              colorClass={task.colorClass}
              bgClass={task.bgClass}
              onClick={() => openModal(task)}
            />
          ))}
        </div>
      </div>

      {/* 本周概览 */}
      <div>
        <h2 className="text-sm font-medium text-slate-300 mb-3">本周概览</h2>
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-800/40 rounded-2xl p-5 border border-slate-700/50">
          <div className="flex items-center gap-4">
            <RingProgress value={activeRate} />
            <div className="flex-1">
              <div className="text-3xl font-bold text-white">
                {loading ? '-' : members.length}
                <span className="text-lg font-normal text-slate-400 ml-1">名会员</span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                本周活跃 {activeThisWeek} 人 · 活跃率 {activeRate}%
              </p>
            </div>
          </div>
          {/* 本周打卡柱状图 */}
          <div className="mt-4 flex items-end gap-1.5 h-10">
            {dailyStats.map((d, i) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-sm transition-all ${i === dailyStats.length - 1 ? 'bg-emerald-500' : 'bg-emerald-500/50'}`}
                  style={{ height: `${Math.max((d.count / maxCount) * 36, 4)}px` }}
                  title={`${d.day} ${d.count}人打卡`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>周一</span><span>周二</span><span>周三</span><span>周四</span><span>周五</span><span>周六</span><span>周日</span>
          </div>
        </div>
      </div>

      {/* 最新预警 */}
      {warnings.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-slate-300">最新预警</h2>
            <button
              onClick={() => navigate('/coach/warnings')}
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              查看全部 →
            </button>
          </div>
          <div className="space-y-2">
            {warnings.map(warning => (
              <WarningCard
                key={warning.id}
                warning={warning}
                onHandle={() => handleWarning(warning)}
                onNavigate={() => handleWarningNavigate(warning)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 会员最新打卡 */}
      {recentCheckins.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-slate-300 mb-3">最新打卡</h2>
          <div className="grid grid-cols-2 gap-3">
            {recentCheckins.map(photo => (
              <div
                key={photo.id}
                className="group cursor-pointer"
                onClick={() => navigate(`/coach/members/${photo.memberId}`)}
              >
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden aspect-square relative">
                  <img
                    src={photo.imageUrl}
                    alt={photo.memberName}
                    className="w-full h-full object-cover"
                  />
                  {/* 悬停展开的信息 */}
                  <div className="absolute inset-0 bg-slate-900/95 p-3 flex flex-col justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="flex items-center gap-2 mb-2">
                      {photo.type === 'meal'
                        ? <Utensils className="w-3 h-3 text-emerald-400" />
                        : <Dumbbell className="w-3 h-3 text-blue-400" />
                      }
                      <span className={`text-xs font-medium ${photo.type === 'meal' ? 'text-emerald-400' : 'text-blue-400'}`}>
                        {photo.type === 'meal' ? '饮食打卡' : '运动打卡'}
                      </span>
                    </div>
                    {photo.type === 'meal' ? (
                      <>
                        <p className="text-sm text-white font-medium">{photo.recognized.food}</p>
                        <p className="text-sm text-slate-300 mt-1">
                          热量：<span className="text-amber-400">{photo.recognized.calories} kcal</span>
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          蛋白质 <span className="text-blue-400">{photo.recognized.protein}g</span> · 碳水 <span className="text-orange-400">{photo.recognized.carbs}g</span>
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-white font-medium">{photo.recognized.exercise}</p>
                        <p className="text-sm text-slate-300 mt-1">
                          时长：<span className="text-blue-400">{photo.recognized.duration} 分钟</span>
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          消耗 <span className="text-emerald-400">{photo.recognized.consumed} kcal</span> · {photo.recognized.intensity}强度
                        </p>
                      </>
                    )}
                    <p className="text-xs text-slate-500 mt-2">{photo.memberName} · {photo.time}</p>
                  </div>
                </div>
                {/* 底部信息 */}
                <div className="mt-2">
                  <p className="text-sm font-medium text-white">{photo.memberName}</p>
                  <p className="text-xs text-slate-500">{photo.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 会员列表弹窗 */}
      <MemberModal
        open={modalOpen}
        title={modalTitle}
        members={modalMembers}
        loading={loading}
        onClose={() => setModalOpen(false)}
        onMemberClick={goToMember}
      />
    </div>
  )
}
