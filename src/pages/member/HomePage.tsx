import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Camera, Play, Target, Calendar, X } from 'lucide-react'
import { useTodayCalories, useTodayProtein, useTodayFat, useTodayCarbs, useMealStore } from '@/stores/mealStore'
import { useTodayCaloriesBurned, useExerciseStore } from '@/stores/exerciseStore'
import { useLatestBodyRecord, useBodyTrend, useBodyStore } from '@/stores/bodyStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { getCoaches } from '@/cloudbase/services/coach'
import { usePlanTarget, useSetPlanTarget } from '@/stores/planStore'
import type { PlanTypeOption } from '@/stores/planStore'
import { PLAN_TYPE_LABELS, DAY_SCHEDULE_LABELS, WEEKDAY_LABELS, WEEKDAY_ZH, NUTRIENT_STYLES } from '@/stores/planStore'
import type { DaySchedule } from '@/stores/planStore'
import { useProfileStore } from '@/stores/profileStore'
import { FullPageLoader, useToast } from '@/components/common'
import { GoalProgressCard } from '@/components/GoalProgressCard'

// 热量目标（从最新体成分数据估算，或使用默认值）
// 保留作为类型参考，实际使用从 store 获取的数据
void {
  startDate: '2026-03-01',
  endDate: '2026-05-30',
  totalDays: 90,
  completedDays: 45,
  progress: 50,
  targetCalories: 1800,
  targetProtein: 120,
  targetFat: 60,
  targetCarb: 150,
}

export function HomePage() {
  const navigate = useNavigate()
  const [showWarning, setShowWarning] = useState(true)
  const [showPlanDetail, setShowPlanDetail] = useState(false)
  const [editingGoal, setEditingGoal] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  // ── Toast 监听 store error ──
  const toast = useToast()
  const bodyError = useBodyStore((s) => s.error)
  const mealError = useMealStore((s) => s.error)
  const exerciseError = useExerciseStore((s) => s.error)
  const profileError = useProfileStore((s) => s.error)

  useEffect(() => {
    const err = bodyError || mealError || exerciseError || profileError
    if (err) toast.error(err)
  }, [bodyError, mealError, exerciseError, profileError, toast])

  // ── 模拟页面初始化加载 ──
  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  // ── 可编辑的目标（从 Zustand planStore 读写）──
  const planTarget = usePlanTarget()
  const setPlanTarget = useSetPlanTarget()

  // ── Store 数据 ──
  const todayCalories = useTodayCalories()
  const todayBurned = useTodayCaloriesBurned()
  const latestBody = useLatestBodyRecord()
  const bodyTrend = useBodyTrend()
  const currentDate = new Date()
  const startDate = new Date(planTarget.startDate)
  const completedDays = Math.max(0, Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
  const totalDays = planTarget.totalDays
  const daysLeft = Math.max(0, totalDays - completedDays)
  const progress = totalDays > 0 ? Math.min(100, Math.round((completedDays / totalDays) * 100)) : 0

  // 缺口 = 消耗 - 摄入（正值表示有热量缺口，利于减脂）
  const calorieGap = todayBurned - todayCalories

  // 营养素计算（真实摄入）
  const todayProtein = useTodayProtein()
  const todayFat = useTodayFat()
  const todayCarbs = useTodayCarbs()

  const proteinTarget = planTarget.targetProtein ?? (latestBody?.muscle_mass ? Math.round(latestBody.muscle_mass * 1.8) : 120)
  const proteinPercent = proteinTarget > 0 ? Math.min(100, Math.round(todayProtein / proteinTarget * 100)) : 0
  const fatTarget = planTarget.targetFat ?? 60
  const fatPercent = fatTarget > 0 ? Math.min(100, Math.round(todayFat / fatTarget * 100)) : 0
  const carbsTarget = planTarget.targetCarb ?? 150
  const carbsPercent = carbsTarget > 0 ? Math.min(100, Math.round(todayCarbs / carbsTarget * 100)) : 0

  // 预警：热量摄入偏低时提示
  const showCalorieWarning = todayCalories > 0 && todayCalories < 1200

  // ── 教练列表（从 API 获取，降级为空） ──
  const [availableCoaches, setAvailableCoaches] = useState<{ id: string; name: string; avatar: string; tags: string[]; rating: number }[]>([])
  useEffect(() => {
    getCoaches({ verified: true }).then((coaches) => {
      if (coaches && coaches.length > 0) {
        setAvailableCoaches(coaches.map(c => ({
          id: c._id || c.user_id || '',
          name: (c as any).name || c.title || '教练',
          avatar: ((c as any).name || c.title || '教').charAt(0),
          tags: Array.isArray((c as any).specialty) ? (c as any).specialty : (c.specialty ? [c.specialty] : []),
          rating: c.rating || 0,
        })))
      }
    }).catch(() => {})
  }, [])

  // ── 教练绑定状态（从 profileStore 读取） ──
  const hasCoach = useProfileStore((s) => s.hasCoach)
  const coachId = useProfileStore((s) => s.currentCoach?.id ?? '')
  const currentCoach = availableCoaches.find(c => c.id === coachId) || availableCoaches[0]

  // ── 教练评语（从通知 store 获取真实数据） ──
  const { notifications } = useNotificationStore()
  const latestCoachComment = notifications
    .filter(n => n.type === 'comment')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]

  const getCalorieColor = useCallback((diff: number) => {
    if (diff < -200) return 'text-red-400'
    if (diff > 200) return 'text-yellow-400'
    return 'text-emerald-400'
  }, [])

  // ── 训练安排编辑状态 ──
  const [editingDay, setEditingDay] = useState<keyof typeof WEEKDAY_ZH | null>(null)
  const [editDayType, setEditDayType] = useState<DaySchedule['type']>('strength')
  const [editDayNote, setEditDayNote] = useState('')

  return (
    <>
      {pageLoading ? (
        <div className="space-y-4 py-4">
          {/* Loading skeleton */}
          <FullPageLoader />
        </div>
      ) : (
      <div className="space-y-4 py-4">
      {/* Target Banner */}
      <Card
        className="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border-emerald-500/30 cursor-pointer hover:border-emerald-500/50 transition-colors"
        onClick={() => setShowPlanDetail(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-emerald-400">当前目标</p>
                <p className="text-lg font-bold">
                  {PLAN_TYPE_LABELS[planTarget.planType]}
                  · 剩余{daysLeft > 0 ? daysLeft : 0}天
                </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-emerald-400">{progress}%</p>
              <p className="text-xs text-gray-400">完成进度</p>
            </div>
          </div>
          <Progress value={progress} className="h-2" indicatorClassName="bg-gradient-to-r from-emerald-400 to-cyan-400" />
          <p className="text-xs text-gray-500 mt-2">点击查看详情 →</p>
        </CardContent>
      </Card>

      {/* 体成分目标进度 */}
      <GoalProgressCard />

      {/* Calorie Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-orange-500/10 border-orange-500/20">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-orange-400 mb-1">摄入</p>
            <p className="text-xl font-bold text-orange-400">{todayCalories}</p>
            <p className="text-xs text-gray-500">kcal</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-blue-400 mb-1">消耗</p>
            <p className="text-xl font-bold text-blue-400">{todayBurned}</p>
            <p className="text-xs text-gray-500">kcal</p>
          </CardContent>
        </Card>
        <Card className={calorieGap >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}>
          <CardContent className="p-3 text-center">
            <p className={'text-xs mb-1 ' + (calorieGap >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {calorieGap >= 0 ? '亏损' : '盈余'}
            </p>
            <p className={'text-xl font-bold ' + getCalorieColor(calorieGap)}>
              {calorieGap >= 0 ? '+' : ''}{Math.abs(calorieGap)}
            </p>
            <p className="text-xs text-gray-500">kcal</p>
          </CardContent>
        </Card>
      </div>

      {/* Nutrition Progress - 简洁进度条 */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium mb-3">营养素</h3>
          
          {/* 蛋白质 */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-blue-400">蛋白质</span>
              <span className="text-gray-400">{todayProtein}/{proteinTarget}g</span>
            </div>
            <Progress value={Math.min(proteinPercent, 100)} className="h-2" indicatorClassName="bg-blue-500" />
          </div>
          
          {/* 脂肪 */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-yellow-400">脂肪</span>
              <span className="text-gray-400">{todayFat}/{fatTarget}g</span>
            </div>
            <Progress value={Math.min(fatPercent, 100)} className="h-2" indicatorClassName="bg-yellow-500" />
          </div>
          
          {/* 碳水 */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: '#a78bfa' }}>碳水</span>
              <span className="text-gray-400">{todayCarbs}/{carbsTarget}g</span>
            </div>
            <Progress value={Math.min(carbsPercent, 100)} className="h-2" indicatorClassName="bg-purple-400" />
          </div>
        </CardContent>
      </Card>

      {/* Warning Banner */}
      {showWarning && showCalorieWarning && (
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div className="flex-1">
                <p className="text-yellow-400 font-medium">预警提示</p>
                <p className="text-sm text-gray-400 mt-1">今日热量摄入偏低，建议补充蛋白质</p>
              </div>
              <button
                onClick={() => setShowWarning(false)}
                className="text-gray-500 hover:text-gray-300"
              >
                ×
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coach Message — 解绑教练后不显示，有评语显示真实评语 */}
      {hasCoach && latestCoachComment && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-lg">
                👨‍🏫
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{currentCoach?.name || '教练'}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                    评语
                  </span>
                </div>
                <p className="text-sm text-gray-300 mt-1">
                  {latestCoachComment.content}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {(() => {
                    const diff = Date.now() - new Date(latestCoachComment.createdAt).getTime()
                    const mins = Math.floor(diff / 60000)
                    if (mins < 60) return `${mins}分钟前`
                    const hours = Math.floor(mins / 60)
                    if (hours < 24) return `${hours}小时前`
                    return `${Math.floor(hours / 24)}天前`
                  })()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/member/recognize')}
          className="glass rounded-2xl p-5 text-left card-hover btn-press group"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Camera className="w-7 h-7 text-white" />
          </div>
          <p className="font-semibold">拍照识别食物</p>
          <p className="text-sm text-gray-400">AI智能分析</p>
        </button>
        <button
          onClick={() => navigate('/member/exercise?addModal=true')}
          className="glass rounded-2xl p-5 text-left card-hover btn-press group"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Play className="w-7 h-7 text-white" />
          </div>
          <p className="font-semibold">记录运动</p>
          <p className="text-sm text-gray-400">追踪每日消耗</p>
        </button>
      </div>

      {/* 目标详情弹窗 */}
      {showPlanDetail && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end">
          <div className="w-full bg-gray-900 rounded-t-3xl p-6 pb-[144px] max-h-[90vh] overflow-y-auto">
            <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-6" />
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-400" />
                {editingGoal ? '修改计划' : PLAN_TYPE_LABELS[planTarget.planType]}详情
              </h3>
              <button
                onClick={() => setShowPlanDetail(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 计划基本信息 */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                  <Calendar className="w-4 h-4" />
                  开始日期
                </div>
                {editingGoal ? (
                  <input
                    type="date"
                    value={planTarget.startDate}
                    onChange={(e) => setPlanTarget({ ...planTarget, startDate: e.target.value })}
                    className="w-full bg-white/10 rounded-lg px-2 py-1 text-sm border border-white/20 focus:border-emerald-400 focus:outline-none"
                  />
                ) : (
                  <p className="font-semibold">{planTarget.startDate}</p>
                )}
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                  <Calendar className="w-4 h-4" />
                  结束日期
                </div>
                {editingGoal ? (
                  <input
                    type="date"
                    value={planTarget.endDate}
                    onChange={(e) => setPlanTarget({ ...planTarget, endDate: e.target.value })}
                    className="w-full bg-white/10 rounded-lg px-2 py-1 text-sm border border-white/20 focus:border-emerald-400 focus:outline-none"
                  />
                ) : (
                  <p className="font-semibold">{planTarget.endDate}</p>
                )}
              </div>
            </div>

            {/* 总体进度 */}
            <div className="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-emerald-400">总体进度</span>
                <span className="text-2xl font-bold text-emerald-400">{progress}%</span>
              </div>
              <Progress value={progress} className="h-3" indicatorClassName="bg-gradient-to-r from-emerald-400 to-cyan-400" />
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>已进行 {completedDays} 天</span>
                <span>剩余 {daysLeft} 天</span>
              </div>
            </div>

            {/* 每日目标 */}
            <h4 className="text-sm font-medium text-gray-400 mb-3">每日营养目标</h4>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div key="cal" className="bg-orange-400 bg-opacity-10 rounded-xl p-4 text-center">
                <p className="text-xs text-orange-400 mb-1">热量</p>
                {editingGoal ? (
                  <input type="number" value={planTarget.targetCalories} onChange={(e) => setPlanTarget({ ...planTarget, targetCalories: Number(e.target.value) })} className="w-20 text-center bg-white/10 rounded-lg px-2 py-1 text-xl font-bold border border-white/20 focus:border-emerald-400 focus:outline-none" />
                ) : (<p className="text-xl font-bold text-orange-400">{planTarget.targetCalories}</p>)}
                <p className="text-xs text-gray-500">kcal</p>
              </div>
              <div key="pro" className="bg-blue-400 bg-opacity-10 rounded-xl p-4 text-center">
                <p className="text-xs text-blue-400 mb-1">蛋白质</p>
                {editingGoal ? (
                  <input type="number" value={planTarget.targetProtein} onChange={(e) => setPlanTarget({ ...planTarget, targetProtein: Number(e.target.value) })} className="w-20 text-center bg-white/10 rounded-lg px-2 py-1 text-xl font-bold border border-white/20 focus:border-emerald-400 focus:outline-none" />
                ) : (<p className="text-xl font-bold text-blue-400">{planTarget.targetProtein}</p>)}
                <p className="text-xs text-gray-500">g</p>
              </div>
              <div key="fat" className="bg-yellow-400 bg-opacity-10 rounded-xl p-4 text-center">
                <p className="text-xs text-yellow-400 mb-1">脂肪</p>
                {editingGoal ? (
                  <input type="number" value={planTarget.targetFat} onChange={(e) => setPlanTarget({ ...planTarget, targetFat: Number(e.target.value) })} className="w-20 text-center bg-white/10 rounded-lg px-2 py-1 text-xl font-bold border border-white/20 focus:border-emerald-400 focus:outline-none" />
                ) : (<p className="text-xl font-bold text-yellow-400">{planTarget.targetFat}</p>)}
                <p className="text-xs text-gray-500">g</p>
              </div>
              <div key="carb" className="bg-purple-400 bg-opacity-10 rounded-xl p-4 text-center">
                <p className="text-xs text-purple-400 mb-1">碳水</p>
                {editingGoal ? (
                  <input type="number" value={planTarget.targetCarb} onChange={(e) => setPlanTarget({ ...planTarget, targetCarb: Number(e.target.value) })} className="w-20 text-center bg-white/10 rounded-lg px-2 py-1 text-xl font-bold border border-white/20 focus:border-emerald-400 focus:outline-none" />
                ) : (<p className="text-xl font-bold text-purple-400">{planTarget.targetCarb}</p>)}
                <p className="text-xs text-gray-500">g</p>
              </div>
            </div>

            {/* 计划类型选择（仅编辑模式） */}
            {editingGoal && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-400 mb-3">选择计划类型</h4>
                <div className="space-y-2">
                  {[
                    { key: 'fat-loss' as PlanTypeOption, label: '减脂计划', desc: '控制热量缺口，降低体脂率' },
                    { key: 'muscle-gain' as PlanTypeOption, label: '增肌计划', desc: '热量盈余，增加肌肉量' },
                    { key: 'body-shape' as PlanTypeOption, label: '塑形计划', desc: '均衡发展，优化体态线条' },
                    { key: 'performance' as PlanTypeOption, label: '运动表现提升计划', desc: '提升力量、耐力、爆发力' },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setPlanTarget({ ...planTarget, planType: opt.key })}
                      className={'w-full text-left p-3 rounded-xl border transition-colors ' + (planTarget.planType === opt.key ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/10 hover:bg-white/10')}
                    >
                      <p className="font-medium">{opt.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 每周训练安排 */}
            <h4 className="text-sm font-medium text-gray-400 mb-3">每周训练安排</h4>
            <div className="space-y-2 mb-6">
              {WEEKDAY_LABELS.map((dayKey) => {
                const schedule = planTarget.weeklySchedule[dayKey]
                // 非编辑模式：只展示已安排的
                if (!editingGoal && !schedule) return null
                return (
                  <div key={dayKey} className="flex items-center gap-2">
                    <span className="w-10 text-sm text-gray-400">{WEEKDAY_ZH[dayKey]}</span>
                    {editingGoal ? (
                      <button
                        onClick={() => {
                          if (editingDay === dayKey) { setEditingDay(null) }
                          else {
                            setEditDayType(schedule?.type || 'strength')
                            setEditDayNote(schedule?.note || '')
                            setEditingDay(dayKey)
                          }
                        }}
                        className={'flex-1 p-2.5 rounded-xl text-sm text-left border transition-colors ' + (schedule ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10')}
                      >
                        {schedule ? DAY_SCHEDULE_LABELS[schedule.type] + (schedule.note ? '（' + schedule.note + '）' : '') : '点击设置'}
                      </button>
                    ) : (
                      <div className={'flex-1 p-2.5 rounded-xl text-sm text-left border ' + (schedule ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-gray-500')}>
                        {schedule ? DAY_SCHEDULE_LABELS[schedule.type] + (schedule.note ? '（' + schedule.note + '）' : '') : '未安排'}
                      </div>
                    )}
                    {editingGoal && schedule && (
                      <button
                        onClick={() => {
                          const newSchedule = { ...planTarget.weeklySchedule }
                          delete newSchedule[dayKey]
                          setPlanTarget({ ...planTarget, weeklySchedule: newSchedule })
                        }}
                        className="p-2 text-gray-500 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {/* 非编辑模式：打卡复选框 */}
                    {!editingGoal && schedule && (
                      <button
                        onClick={() => {
                          const completed = planTarget.weeklyCompleted || {}
                          const newCompleted = { ...completed }
                          if (newCompleted[dayKey]) {
                            delete newCompleted[dayKey]
                          } else {
                            newCompleted[dayKey] = Date.now()
                          }
                          setPlanTarget({ ...planTarget, weeklyCompleted: newCompleted })
                        }}
                        className={'w-7 h-7 rounded-md border flex items-center justify-center transition-colors ' + ((planTarget.weeklyCompleted || {})[dayKey] ? 'bg-emerald-500 border-emerald-500' : 'border-gray-500 hover:border-emerald-400')}
                      >
                        {(planTarget.weeklyCompleted || {})[dayKey] ? (
                          <span className="text-white text-sm font-bold">✓</span>
                        ) : null}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 训练安排编辑弹窗 */}
            {editingDay && (
              <div className="bg-white/5 rounded-xl p-4 mb-6">
                <p className="text-sm font-medium mb-3 text-gray-300">设置{WEEKDAY_ZH[editingDay]}训练</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { key: 'strength' as DaySchedule['type'], label: '力量训练' },
                    { key: 'cardio' as DaySchedule['type'], label: '心肺训练' },
                    { key: 'aerobic' as DaySchedule['type'], label: '有氧训练' },
                    { key: 'other' as DaySchedule['type'], label: '其他' },
                  ].map(t => (
                    <button
                      key={t.key}
                      onClick={() => setEditDayType(t.key)}
                      className={'p-2 rounded-lg text-sm border transition-colors ' + (editDayType === t.key ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10')}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="mb-3">
                  <input
                    type="text"
                    value={editDayNote}
                    onChange={(e) => setEditDayNote(e.target.value)}
                    placeholder="备注（可选）"
                    className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm border border-white/20 focus:border-emerald-400 focus:outline-none text-gray-200 placeholder-gray-500"
                  />
                </div>
                <button
                  onClick={() => {
                    const newSchedule = { ...planTarget.weeklySchedule }
                    newSchedule[editingDay] = { type: editDayType, note: editDayNote || undefined }
                    setPlanTarget({ ...planTarget, weeklySchedule: newSchedule })
                    setEditingDay(null)
                  }}
                  className="w-full py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
                >
                  确认
                </button>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="mt-6 space-y-3">
              {editingGoal ? (
                <button
                  onClick={() => {
                    setEditingGoal(false)
                  }}
                  className="w-full py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
                >
                  保存修改
                </button>
              ) : (
                <button
                  onClick={() => setEditingGoal(true)}
                  className="w-full py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
                >
                  修改计划目标
                </button>
              )}
              {editingGoal && (
                <button
                  onClick={() => setEditingGoal(false)}
                  className="w-full py-3 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20 transition-colors"
                >
                  取消修改
                </button>
              )}
              {!editingGoal && (
                <button
                  onClick={() => setShowPlanDetail(false)}
                  className="w-full py-3 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20 transition-colors"
                >
                  关闭
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
      )}
    </>
  )
}
