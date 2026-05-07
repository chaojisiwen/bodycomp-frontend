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

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock, MessageCircleWarning, FilePlus,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  useTodayTasks, useWeekStats, useWarnings, useRecentCheckins,
  type WarningCard as WarningCardType,
} from '@/hooks/useCoachDashboard'
import {
  RingProgress, TaskCard, WarningCardCmp, MemberModal,
} from '@/components/coach'
import { useCoachProfileStore } from '@/stores/coachProfileStore'
import { FullPageLoader, useToast } from '@/components/common'

// 格式化日期
function formatDate() {
  const now = new Date()
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${now.getMonth() + 1}月${now.getDate()}日 ${days[now.getDay()]}`
}

export function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pageLoading, setPageLoading] = useState(true)

  // ── Toast 监听 store error ──
  const toast = useToast()
  const coachProfileError = useCoachProfileStore((s) => s.error)

  useEffect(() => {
    if (coachProfileError) toast.error(coachProfileError)
  }, [coachProfileError, toast])

  // ── 模拟页面初始化加载 ──
  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  // 今日任务弹窗
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modalMembers, setModalMembers] = useState<any[]>([])

  useEffect(() => {
    if (!user?.id) return
    import('@/cloudbase/services/coach').then(({ getCoachMemberList }) => {
      return getCoachMemberList(user.id!)
    }).then(list => {
      if (list) setMembers(list)
      setLoading(false)
    }).catch((err) => {
      console.warn('[CoachHome] 获取会员列表失败:', err)
      setLoading(false)
    })
  }, [user?.id])

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

  const openModal = useCallback((task: typeof tasks[0]) => {
    setModalTitle(task.label)
    setModalMembers(task.members)
    setModalOpen(true)
  }, [])

  const goToMember = useCallback((id: string) => {
    setModalOpen(false)
    navigate(`/coach/members/${id}`)
  }, [navigate])

  const handleWarning = useCallback((warning: WarningCardType) => {
    console.log('[首页] 处理预警:', warning.title)
    navigate(`/coach/members/${warning.memberId}`)
  }, [navigate])

  const handleWarningNavigate = useCallback((warning: WarningCardType) => {
    navigate(`/coach/members/${warning.memberId}`)
  }, [navigate])

  // 计算柱状图最大高度基准
  const maxCount = Math.max(...dailyStats.map(d => d.count), 1)

  return (
    <>
      {pageLoading ? (
        <div className="space-y-6">
          <FullPageLoader />
        </div>
      ) : (
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
              <WarningCardCmp
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
                        ? <span className="text-emerald-400">🍽️</span>
                        : <span className="text-blue-400">🏋️</span>
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
      )}
    </>
  )
}
