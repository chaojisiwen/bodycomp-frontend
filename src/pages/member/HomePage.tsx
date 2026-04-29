import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Camera, Play, Target, Calendar, X } from 'lucide-react'
import { useTodayCalories } from '@/stores/mealStore'
import { useTodayCaloriesBurned } from '@/stores/exerciseStore'
import { useLatestBodyRecord, useBodyTrend } from '@/stores/bodyStore'

// 热量目标（从最新体成分数据估算，或使用默认值）
const DEFAULT_TARGET = {
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

  // ── Store 数据 ──
  const todayCalories = useTodayCalories()
  const todayBurned = useTodayCaloriesBurned()
  const latestBody = useLatestBodyRecord()
  const bodyTrend = useBodyTrend()
  const currentDate = new Date()
  const startDate = new Date(DEFAULT_TARGET.startDate)
  const completedDays = Math.max(0, Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
  const totalDays = DEFAULT_TARGET.totalDays
  const daysLeft = Math.max(0, totalDays - completedDays)
  const progress = totalDays > 0 ? Math.min(100, Math.round((completedDays / totalDays) * 100)) : 0

  // 缺口 = 消耗 - 摄入（正值表示有热量缺口，利于减脂）
  const calorieGap = todayBurned - todayCalories

  // 营养素计算
  const proteinTarget = latestBody?.muscle_mass ? Math.round(latestBody.muscle_mass * 1.8) : 120
  const proteinPercent = Math.round((todayCalories * 0.15 / 4) / proteinTarget * 100)
  const fatTarget = 60
  const fatPercent = Math.round((todayCalories * 0.25 / 9) / fatTarget * 100)
  const carbsTarget = 150
  const carbsPercent = Math.round((todayCalories * 0.45 / 4) / carbsTarget * 100)

  // 预警：热量摄入偏低时提示
  const showCalorieWarning = todayCalories > 0 && todayCalories < 1200

  // ── 教练列表 ──
  const availableCoaches = [
    { id: 'c001', name: '李教练', avatar: '李', tags: ['国家一级健身教练', '减脂专家'], rating: 4.9 },
    { id: 'c002', name: '王教练', avatar: '王', tags: ['增肌专家', '运动康复'], rating: 4.7 },
    { id: 'c003', name: '张教练', avatar: '张', tags: ['马拉松教练', '体能训练'], rating: 4.8 },
  ]

  // ── 教练绑定状态（与 MemberProfilePage 同步） ──
  const [hasCoach, setHasCoach] = useState<boolean>(() => {
    const saved = localStorage.getItem('bodycomp_hasCoach')
    return saved !== null ? saved === 'true' : true
  })
  const [coachId, setCoachId] = useState<string>(() => {
    return localStorage.getItem('bodycomp_coachId') || 'c001'
  })
  const currentCoach = availableCoaches.find(c => c.id === coachId) || availableCoaches[0]

  // 监听其他页面修改教练状态
  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem('bodycomp_hasCoach')
      setHasCoach(saved !== null ? saved === 'true' : true)
      const savedCoachId = localStorage.getItem('bodycomp_coachId')
      if (savedCoachId) setCoachId(savedCoachId)
      else if (saved === 'false') setCoachId('c001')
    }
    window.addEventListener('storage', handleStorage)
    // 也轮询本地值（同一页面内修改不会触发 storage 事件）
    const interval = setInterval(handleStorage, 500)
    return () => {
      window.removeEventListener('storage', handleStorage)
      clearInterval(interval)
    }
  }, [])

  const getCalorieColor = (diff: number) => {
    if (diff < -200) return 'text-red-400'
    if (diff > 200) return 'text-yellow-400'
    return 'text-emerald-400'
  }

  return (
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
              <p className="text-lg font-bold">减脂计划 · 剩余{daysLeft}天</p>
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
              <span className="text-gray-400">{Math.round(todayCalories * 0.15 / 4)}/{proteinTarget}g</span>
            </div>
            <Progress value={Math.min(proteinPercent, 100)} className="h-2" indicatorClassName="bg-blue-500" />
          </div>
          
          {/* 脂肪 */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-yellow-400">脂肪</span>
              <span className="text-gray-400">{Math.round(todayCalories * 0.25 / 9)}/{fatTarget}g</span>
            </div>
            <Progress value={Math.min(fatPercent, 100)} className="h-2" indicatorClassName="bg-yellow-500" />
          </div>
          
          {/* 碳水 */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-purple-400">碳水</span>
              <span className="text-gray-400">{Math.round(todayCalories * 0.45 / 4)}/{carbsTarget}g</span>
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

      {/* Coach Message — 解绑教练后不显示 */}
      {hasCoach && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-lg">
                👨‍🏫
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{currentCoach.name}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                    评语
                  </span>
                </div>
                <p className="text-sm text-gray-300 mt-1">
                  今天的训练强度不错！记得晚上多补充点蛋白质，配合减脂效果会更好。
                </p>
                <p className="text-xs text-gray-500 mt-2">2小时前</p>
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
                减脂计划详情
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
                <p className="font-semibold">2026-03-01</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                  <Calendar className="w-4 h-4" />
                  结束日期
                </div>
                <p className="font-semibold">2026-05-30</p>
              </div>
            </div>

            {/* 总体进度 */}
            <div className="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-emerald-400">总体进度</span>
                <span className="text-2xl font-bold text-emerald-400">50%</span>
              </div>
              <Progress value={50} className="h-3" indicatorClassName="bg-gradient-to-r from-emerald-400 to-cyan-400" />
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>已进行 45 天</span>
                <span>剩余 45 天</span>
              </div>
            </div>

            {/* 每日目标 */}
            <h4 className="text-sm font-medium text-gray-400 mb-3">每日营养目标</h4>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-orange-500/10 rounded-xl p-4 text-center">
                <p className="text-xs text-orange-400 mb-1">热量</p>
                <p className="text-xl font-bold text-orange-400">1800</p>
                <p className="text-xs text-gray-500">kcal</p>
              </div>
              <div className="bg-blue-500/10 rounded-xl p-4 text-center">
                <p className="text-xs text-blue-400 mb-1">蛋白质</p>
                <p className="text-xl font-bold text-blue-400">120</p>
                <p className="text-xs text-gray-500">g</p>
              </div>
              <div className="bg-yellow-500/10 rounded-xl p-4 text-center">
                <p className="text-xs text-yellow-400 mb-1">脂肪</p>
                <p className="text-xl font-bold text-yellow-400">60</p>
                <p className="text-xs text-gray-500">g</p>
              </div>
              <div className="bg-purple-500/10 rounded-xl p-4 text-center">
                <p className="text-xs text-purple-400 mb-1">碳水</p>
                <p className="text-xl font-bold text-purple-400">150</p>
                <p className="text-xs text-gray-500">g</p>
              </div>
            </div>

            {/* 最近体成分记录 */}
            <h4 className="text-sm font-medium text-gray-400 mb-3">最近体成分记录</h4>
            {bodyTrend.length > 0 ? (
              <div className="space-y-2">
                {bodyTrend.slice(0, 5).map((record, index) => (
                  <div key={index} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                    <span className="text-sm text-gray-400">
                      {new Date(record.record_date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
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
              <button className="w-full py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors">
                修改计划目标
              </button>
              <button
                onClick={() => setShowPlanDetail(false)}
                className="w-full py-3 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
