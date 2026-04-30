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
import { useProfileStore } from '@/stores/profileStore'
import { FullPageLoader, useToast } from '@/components/common'

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
                  {planTarget.targetCalories <= 1600 ? '减脂' : planTarget.targetCalories >= 2200 ? '增肌' : '维持'}计划
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
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-emerald-400 mb-1">缺口</p>
            <p className={`text-xl font-bold ${getCalorieColor(calorieGap)}`}>
              {calorieGap >= 0 ? '+' : ''}{calorieGap}
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
              <span className="text-purple-400">碳水</span>
              <span className="text-gray-400">{todayCarbs}/{carbsTarget}g</span>
            </div>
            <Progress value={Math.min(carbsPercent, 100)} className="h-2" indicatorClassName="bg-purple-500" />
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
                {planTarget.targetCalories <= 1600 ? '减脂' : planTarget.targetCalories >= 2200 ? '增肌' : '维持'}计划详情
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
              {[
                { label: '热量', color: 'orange', key: 'targetCalories', unit: 'kcal' },
                { label: '蛋白质', color: 'blue', key: 'targetProtein', unit: 'g' },
                { label: '脂肪', color: 'yellow', key: 'targetFat', unit: 'g' },
                { label: '碳水', color: 'purple', key: 'targetCarb', unit: 'g' },
              ].map(item => (
                <div key={item.key} className={`bg-${item.color}-500/10 rounded-xl p-4 text-center`}>
                  <p className={`text-xs text-${item.color}-400 mb-1`}>{item.label}</p>
                  {editingGoal ? (
                    <input
                      type="number"
                      value={(planTarget as any)[item.key]}
                      onChange={(e) => setPlanTarget({ ...planTarget, [item.key]: Number(e.target.value) })}
                      className="w-20 text-center bg-white/10 rounded-lg px-2 py-1 text-xl font-bold border border-white/20 focus:border-emerald-400 focus:outline-none"
                    />
                  ) : (
                    <p className={`text-xl font-bold text-${item.color}-400`}>{(planTarget as any)[item.key]}</p>
                  )}
                  <p className="text-xs text-gray-500">{item.unit}</p>
                </div>
              ))}
            </div>

            {/* 最近体成分记录 */}
            <h4 className="text-sm font-medium text-gray-400 mb-3">最近体成分记录</h4>
            {bodyTrend.length > 0 ? (
              <div className="space-y-2">
                {bodyTrend.slice(0, 5).map((record, index) => (
                  <div key={index} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                    <span className="text-sm text-gray-400">
                      {new Date(record.record_date!).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm">
                        体重 <span className="text-emerald-400 font-medium">{record.weight}kg</span>
                      </span>
                      {record.body_fat !== undefined && (
                        <span className="text-sm">
                          体脂 <span className="text-blue-400 font-medium">{record.body_fat}%</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm">
                暂无体成分记录，<br />去「我的数据」页面添加第一条记录吧
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
