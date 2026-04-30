import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageSquare, Calendar, TrendingUp, TrendingDown, Minus, AlertTriangle, Camera, Dumbbell, Flame, Clock, ChevronRight, Scale, User, Droplets, Bone, Heart, Brain, Utensils, Target, Pencil, Send, Check, ClipboardList, MessageCircle, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Modal } from '@/components/common/Modal'
import { coachApi } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { usePlanStore } from '@/stores/planStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { assignPlan, getMemberMeals, getMemberExercises, getMemberBodyRecords, saveMemberPlanNotes } from '@/cloudbase/services/coach'
import { sendNotification as sendNotificationToCloud } from '@/cloudbase/services/notifications'
import type { IMeal, IExercise, IBodyRecord } from '@/cloudbase/types'

interface BodyMetric {
  id: string
  name: string
  value: number
  unit: string
  normal: string
  trend: 'up' | 'down' | 'stable'
  change: number
  icon: React.ReactNode
  isCore?: boolean
}

interface TrainingItem {
  day: string
  type: string
  detail: string
  status: 'completed' | 'under' | 'rest'
}

interface PlanData {
  goal: string
  period: string
  targetWeight: number
  targetFat: number
  targetWaist: number
  caloriesMin: number
  caloriesMax: number
  protein: number
  fat: number
  carbs: number
  training: TrainingItem[]
  notes: string
}

// 教练评语和点赞数据类型
interface FeedbackItem {
  comment?: string       // 评语文字
  liked?: boolean        // 是否点赞
  likeEmoji?: string     // 点赞表情
  updatedAt?: string     // 最后更新时间
}

export function CoachMemberDetailPage() {
  const { memberId } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'overview' | 'diet' | 'exercise' | 'plan'>('overview')
  const [showPlanDetail, setShowPlanDetail] = useState(false)
  const [isEditingPlan, setIsEditingPlan] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [customMessage, setCustomMessage] = useState('')
  const [messageSent, setMessageSent] = useState(false)
  const [showAssignPlanModal, setShowAssignPlanModal] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [assignStartDate, setAssignStartDate] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignSuccess, setAssignSuccess] = useState(false)

  // ── Hooks（必须在其他函数之前） ──
  const { user } = useAuth()
  const { plans, fetchPlans } = usePlanStore()
  const { addNotification } = useNotificationStore()
  const [member, setMember] = useState<{
    name: string
    avatar: string
    goal: string
    week: number
    startWeight: number
    currentWeight: number
    startFat: number
    currentFat: number
    phone: string
    joinDate: string
  } | null>(null)

  // ── 教练评语 & 点赞 state ──
  // key = `meal-{index}` 或 `exercise-{index}`
  const [feedbacks, setFeedbacks] = useState<Record<string, FeedbackItem>>({})
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [draftComment, setDraftComment] = useState('')

  // ── 会员真实数据 state ──
  const [todayMealsData, setTodayMealsData] = useState<IMeal[]>([])
  const [exerciseData, setExerciseData] = useState<IExercise[]>([])
  const [bodyRecords, setBodyRecords] = useState<IBodyRecord[]>([])
  const [, setDataLoading] = useState(true)

  // ── 获取会员真实数据 ──
  useEffect(() => {
    if (!memberId) return

    const fetchMemberData = async () => {
      setDataLoading(true)
      try {
        const [meals, exercises, bodies] = await Promise.all([
          getMemberMeals(memberId, new Date()),
          getMemberExercises(memberId, 7),
          getMemberBodyRecords(memberId, 10),
        ])
        setTodayMealsData(meals)
        setExerciseData(exercises)
        setBodyRecords(bodies)
      } catch (error) {
        console.error('[CoachMemberDetail] 获取会员数据失败:', error)
      } finally {
        setDataLoading(false)
      }
    }

    fetchMemberData()
  }, [memberId])

  // ── 计算运动统计 ──
  const exerciseStats = {
    weeklyTarget: 300,
    weeklyCompleted: exerciseData.reduce((sum, r) => sum + (r.total_duration || 0), 0),
    completionRate: exerciseData.length > 0 ? Math.round((exerciseData.filter(r => r.total_duration > 0).length / Math.min(exerciseData.length, 7)) * 100) : 0,
    totalCalories: exerciseData.reduce((sum, r) => sum + (r.total_calories || 0), 0),
    avgDuration: exerciseData.length > 0 ? Math.round(exerciseData.reduce((sum, r) => sum + (r.total_duration || 0), 0) / exerciseData.length) : 0,
  }

  // ── 饮食数据映射 ──
  const mealTypeMap: Record<string, string> = {
    breakfast: '早餐',
    lunch: '午餐',
    dinner: '晚餐',
    snack: '加餐',
  }

  const todayMeals = todayMealsData.length > 0 ? todayMealsData.map(m => ({
    meal: mealTypeMap[m.meal_type] || m.meal_type,
    calories: m.total_calories || 0,
    status: 'normal' as 'normal' | 'over' | 'under',
  })) : [
    { meal: '早餐', calories: 420, status: 'normal' as const },
    { meal: '午餐', calories: 850, status: 'over' as const },
    { meal: '晚餐', calories: 380, status: 'normal' as const },
    { meal: '加餐', calories: 350, status: 'over' as const },
  ]

  // ── 运动记录映射 ──
  const exerciseRecords = exerciseData.length > 0 ? exerciseData.map((r) => {
    const dateStr = new Date(r.exercise_date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
    const firstExercise = r.exercises?.[0]
    const status = r.total_duration === 0 ? 'rest' : r.total_duration < 30 ? 'under' : 'completed'
    return {
      date: dateStr,
      type: firstExercise?.name || '运动',
      duration: r.total_duration || 0,
      calories: r.total_calories || 0,
      status: status as 'completed' | 'under' | 'rest',
    }
  }) : [
    { date: '04-17', type: '力量训练', duration: 55, calories: 420, status: 'completed' as const },
    { date: '04-16', type: '有氧跑步', duration: 40, calories: 380, status: 'completed' as const },
    { date: '04-15', type: 'HIIT训练', duration: 30, calories: 350, status: 'completed' as const },
    { date: '04-14', type: '力量训练', duration: 50, calories: 410, status: 'under' as const },
    { date: '04-13', type: '休息日', duration: 0, calories: 0, status: 'rest' as const },
    { date: '04-12', type: '游泳', duration: 60, calories: 450, status: 'completed' as const },
    { date: '04-11', type: '力量训练', duration: 45, calories: 380, status: 'completed' as const },
  ]

  // ── 体成分数据映射 ──
  const latestBody = bodyRecords[0]
  const allBodyMetrics: BodyMetric[] = latestBody ? [
    { id: 'weight', name: '体重', value: latestBody.weight || 72.5, unit: 'kg', normal: '65-75kg', trend: 'down', change: -2.5, icon: <Scale className="w-4 h-4 text-gray-400" />, isCore: true },
    { id: 'bmi', name: 'BMI', value: latestBody.bmi || 22.4, unit: '', normal: '18.5-24', trend: 'down', change: -0.4, icon: <User className="w-4 h-4 text-gray-400" /> },
    { id: 'fat', name: '体脂率', value: latestBody.body_fat || 19.2, unit: '%', normal: '15-20%', trend: 'down', change: -3.3, icon: <Flame className="w-4 h-4 text-gray-400" />, isCore: true },
    { id: 'muscle', name: '肌肉量', value: latestBody.muscle_mass || 56.5, unit: 'kg', normal: '55-65kg', trend: 'up', change: 1.2, icon: <TrendingUp className="w-4 h-4 text-gray-400" />, isCore: true },
    { id: 'visceral', name: '内脏脂肪', value: latestBody.visceral_fat || 8, unit: '', normal: '1-9', trend: 'down', change: -1, icon: <Heart className="w-4 h-4 text-gray-400" /> },
    { id: 'water', name: '体水分', value: latestBody.water_content || 55.2, unit: '%', normal: '50-60%', trend: 'stable', change: 0.3, icon: <Droplets className="w-4 h-4 text-gray-400" /> },
    { id: 'bone', name: '骨量', value: latestBody.bone_mass || 2.8, unit: 'kg', normal: '2.5-3.5', trend: 'stable', change: 0, icon: <Bone className="w-4 h-4 text-gray-400" /> },
    { id: 'metabolism', name: '基础代谢', value: latestBody.basal_metabolism || 1680, unit: 'kcal', normal: '1600-1800', trend: 'stable', change: 0, icon: <Flame className="w-4 h-4 text-gray-400" /> },
    { id: 'protein', name: '蛋白质', value: latestBody.protein_percent || 17.2, unit: '%', normal: '16-20%', trend: 'up', change: 0.3, icon: <Brain className="w-4 h-4 text-gray-400" /> },
    { id: 'bodyage', name: '身体年龄', value: latestBody.metabolism_age || 28, unit: '岁', normal: '<实际年龄', trend: 'down', change: -2, icon: <User className="w-4 h-4 text-gray-400" /> },
    { id: 'subfat', name: '皮下脂肪', value: latestBody.subcutaneous_fat || 12.5, unit: '%', normal: '9-18%', trend: 'down', change: -0.5, icon: <Flame className="w-4 h-4 text-gray-400" /> },
    { id: 'fatfree', name: '去脂体重', value: latestBody.fat_free_mass || 54.2, unit: 'kg', normal: '50-60kg', trend: 'up', change: 0.3, icon: <TrendingUp className="w-4 h-4 text-gray-400" /> },
  ] : [
    { id: 'weight', name: '体重', value: 72.5, unit: 'kg', normal: '65-75kg', trend: 'down', change: -2.5, icon: <Scale className="w-4 h-4 text-gray-400" />, isCore: true },
    { id: 'bmi', name: 'BMI', value: 22.4, unit: '', normal: '18.5-24', trend: 'down', change: -0.4, icon: <User className="w-4 h-4 text-gray-400" /> },
    { id: 'fat', name: '体脂率', value: 19.2, unit: '%', normal: '15-20%', trend: 'down', change: -3.3, icon: <Flame className="w-4 h-4 text-gray-400" />, isCore: true },
    { id: 'muscle', name: '肌肉量', value: 56.5, unit: 'kg', normal: '55-65kg', trend: 'up', change: 1.2, icon: <TrendingUp className="w-4 h-4 text-gray-400" />, isCore: true },
    { id: 'visceral', name: '内脏脂肪', value: 8, unit: '', normal: '1-9', trend: 'down', change: -1, icon: <Heart className="w-4 h-4 text-gray-400" /> },
    { id: 'water', name: '体水分', value: 55.2, unit: '%', normal: '50-60%', trend: 'stable', change: 0.3, icon: <Droplets className="w-4 h-4 text-gray-400" /> },
    { id: 'bone', name: '骨量', value: 2.8, unit: 'kg', normal: '2.5-3.5', trend: 'stable', change: 0, icon: <Bone className="w-4 h-4 text-gray-400" /> },
    { id: 'metabolism', name: '基础代谢', value: 1680, unit: 'kcal', normal: '1600-1800', trend: 'stable', change: 0, icon: <Flame className="w-4 h-4 text-gray-400" /> },
    { id: 'protein', name: '蛋白质', value: 17.2, unit: '%', normal: '16-20%', trend: 'up', change: 0.3, icon: <Brain className="w-4 h-4 text-gray-400" /> },
    { id: 'bodyage', name: '身体年龄', value: 28, unit: '岁', normal: '<实际年龄', trend: 'down', change: -2, icon: <User className="w-4 h-4 text-gray-400" /> },
    { id: 'subfat', name: '皮下脂肪', value: 12.5, unit: '%', normal: '9-18%', trend: 'down', change: -0.5, icon: <Flame className="w-4 h-4 text-gray-400" /> },
    { id: 'fatfree', name: '去脂体重', value: 54.2, unit: 'kg', normal: '50-60kg', trend: 'up', change: 0.3, icon: <TrendingUp className="w-4 h-4 text-gray-400" /> },
  ]

  // ── 近期记录（体成分趋势）──
  const recentRecords = bodyRecords.length > 0 ? bodyRecords.slice(0, 7).reverse().map(r => ({
    date: new Date(r.record_date!).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
    weight: r.weight || 0,
    fat: r.body_fat || 0,
    calories: 1800,
  })) : [
    { date: '04-17', weight: 72.5, fat: 19.2, calories: 1850 },
    { date: '04-16', weight: 72.6, fat: 19.3, calories: 2100 },
    { date: '04-15', weight: 72.8, fat: 19.5, calories: 1650 },
    { date: '04-14', weight: 73.0, fat: 19.6, calories: 1900 },
  ]

  // 点赞循环表情
  const LIKE_EMOJIS = ['👍', '🔥', '💪', '🌟', '❤️']

  const handleLike = (key: string) => {
    setFeedbacks(prev => {
      const item = prev[key] || {}
      if (item.liked) {
        const idx = LIKE_EMOJIS.indexOf(item.likeEmoji || '👍')
        const nextEmoji = LIKE_EMOJIS[(idx + 1) % LIKE_EMOJIS.length]
        return { ...prev, [key]: { ...item, likeEmoji: nextEmoji, updatedAt: new Date().toISOString() } }
      }
      return { ...prev, [key]: { ...item, liked: true, likeEmoji: '👍', updatedAt: new Date().toISOString() } }
    })
  }

  const handleUnlike = (key: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setFeedbacks(prev => {
      const item = prev[key] || {}
      return { ...prev, [key]: { ...item, liked: false, likeEmoji: undefined } }
    })
  }

  const handleOpenComment = (key: string) => {
    const existing = feedbacks[key]?.comment || ''
    setDraftComment(existing)
    setEditingKey(key)
  }

  const handleSaveComment = async (key: string, recordLabel: string) => {
    const trimmed = draftComment.trim()
    setFeedbacks(prev => ({
      ...prev,
      [key]: { ...(prev[key] || {}), comment: trimmed || undefined, updatedAt: new Date().toISOString() },
    }))
    if (trimmed) {
      // 1. 写入本地 store（会员端立即可见）
      addNotification({
        type: 'comment',
        title: '教练评语',
        content: trimmed,
        coachName: user?.name || '教练',
        recordLabel,
        memberId: memberId || undefined,
      })
      // 2. 写入云端 notifications 集合（持久化）
      const coachId = user?.id || 'coach'
      await sendNotificationToCloud({
        userId: memberId || '',
        coachId,
        title: '教练评语',
        content: trimmed,
        type: 'comment',
      })
    }
    setEditingKey(null)
    setDraftComment('')
  }
  const [loading, setLoading] = useState(true)

  // ── 从 API 拉取会员详情 ──
  useEffect(() => {
    if (!memberId) return
    // 去掉 'm' 前缀以匹配 getMemberDetail 的模拟数据（m001 → 001 → 尝试 '1'）
    const apiId = memberId.replace(/^m0*/, '')
    coachApi.getMemberDetail(apiId).then((res) => {
      if (res.success && res.data) {
        setMember(res.data)
      }
      setLoading(false)
    })
    fetchPlans()
  }, [memberId])

  // 预设消息模板
  const quickMessages = [
    { emoji: '💪', text: '今天的训练计划记得完成哦～' },
    { emoji: '🥗', text: '今天的饮食记录还没填呢，快去记录吧' },
    { emoji: '📊', text: '本周数据报告出来了，效果不错！' },
    { emoji: '⏰', text: '明天记得来复测～' },
    { emoji: '❓', text: '有什么问题随时问我' },
  ]

  const handleSendMessage = () => {
    if (!customMessage.trim()) return
    // 发消息通知到会员端（写入 notificationStore，后续同步到后端）
    addNotification({
      type: 'system',
      title: '教练消息',
      content: customMessage,
      memberId: memberId || undefined,
      memberName: member?.name,
    })
    console.log('[教练端] 发送消息给会员:', member?.name, customMessage)
    setMessageSent(true)
    setTimeout(() => {
      setShowMessageModal(false)
      setMessageSent(false)
      setCustomMessage('')
    }, 1500)
  }

  const handleAssignPlan = async () => {
    if (!selectedPlanId || !memberId) return
    const plan = plans.find((p) => p.id === selectedPlanId)
    if (!plan) return

    setAssigning(true)
    const coachId = user?.id || 'coach'
    const startDate = assignStartDate ? new Date(assignStartDate) : undefined

    const result = await assignPlan({
      plan: {
        id: plan.id,
        name: plan.name,
        type: plan.type,
        description: plan.description,
        duration: plan.duration,
        targetWeight: plan.targetWeight,
        targetFat: plan.targetFat,
        targetWaist: plan.targetWaist,
        caloriesMin: plan.caloriesMin,
        caloriesMax: plan.caloriesMax,
        protein: plan.protein ? Number(plan.protein) : undefined,
        fat: plan.fat ? Number(plan.fat) : undefined,
        carbs: plan.carbs ? Number(plan.carbs) : undefined,
        training: plan.training,
        notes: plan.notes,
      },
      memberId,
      coachId,
      startDate,
    })

    setAssigning(false)
    if (result.success) {
      setAssignSuccess(true)
      setTimeout(() => {
        setShowAssignPlanModal(false)
        setAssignSuccess(false)
        setSelectedPlanId('')
        setAssignStartDate('')
      }, 1500)
    }
  }

  // ── 方案数据（后续从 API 拉取）──
  const [planData, setPlanData] = useState<PlanData>({
    goal: member?.goal ?? '加载中',
    period: `2026-04-01 至 2026-06-30`,
    targetWeight: member?.currentWeight ? member.currentWeight - 4 : 70,
    targetFat: member?.currentFat ? Number((member.currentFat - 3).toFixed(1)) : 18,
    targetWaist: 80,
    caloriesMin: 1600,
    caloriesMax: 1800,
    protein: 120,
    fat: 50,
    carbs: 150,
    training: [
      { day: '周一', type: '胸+三头肌', detail: '力量训练 60min', status: 'completed' },
      { day: '周二', type: '有氧跑步', detail: '慢跑 40min', status: 'completed' },
      { day: '周三', type: '背+二头肌', detail: '力量训练 60min', status: 'completed' },
      { day: '周四', type: 'HIIT', detail: '高强度间歇 30min', status: 'under' },
      { day: '周五', type: '腿+肩部', detail: '力量训练 60min', status: 'rest' },
      { day: '周六', type: '有氧游泳', detail: '游泳 60min', status: 'rest' },
      { day: '周日', type: '休息日', detail: '拉伸/放松', status: 'rest' },
    ],
    notes: '每次力量训练前后务必热身/拉伸10分钟。有氧保持心率120-150次/分。饮食记录每日必填，如有身体不适立即停止训练并告知。',
  })

  const [showAllMetrics, setShowAllMetrics] = useState(false)
  const displayedMetrics = showAllMetrics ? allBodyMetrics : allBodyMetrics.filter(m => m.isCore)

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-emerald-400" />
      case 'down': return <TrendingDown className="w-4 h-4 text-emerald-400" />
      default: return <Minus className="w-4 h-4 text-gray-400" />
    }
  }

  const tabs = [
    { id: 'overview', name: '概览' },
    { id: 'diet', name: '饮食' },
    { id: 'exercise', name: '运动' },
    { id: 'plan', name: '方案' },
  ]

  const weeklyPlan = [
    { day: '周一', name: '胸+三头', status: 'completed' },
    { day: '周二', name: '有氧', status: 'completed' },
    { day: '周三', name: '背+二头', status: 'completed' },
    { day: '周四', name: 'HIIT', status: 'under' },
    { day: '周五', name: '腿+肩', status: 'rest' },
    { day: '周六', name: '有氧', status: 'rest' },
    { day: '周日', name: '休息', status: 'rest' },
  ]

  // ── 会员数据加载后，同步方案目标 ──
  useEffect(() => {
    if (!member) return
    setPlanData((prev) => ({
      ...prev,
      goal: member.goal,
      targetWeight: member.currentWeight - 4,
      targetFat: Number((member.currentFat - 3).toFixed(1)),
    }))
  }, [member])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">加载中...</div>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="text-slate-400">未找到该会员</div>
        <button onClick={() => navigate('/coach/members')} className="text-blue-400 text-sm">返回会员列表</button>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-6">
      {/* 返回按钮 */}
      <button
        onClick={() => navigate('/coach/members')}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>返回会员列表</span>
      </button>

      {/* 会员信息卡片 */}
      <Card className="p-4">
        <div className="flex items-center gap-4 mb-4">
          <img src={member.avatar} alt="" className="w-16 h-16 rounded-full object-cover" />
          <div className="flex-1">
            <h2 className="text-xl font-bold">{member.name}</h2>
            <p className="text-gray-400">{member.goal} · 第{member.week}周</p>
          </div>
          <button 
            onClick={() => setShowMessageModal(true)}
            className="p-3 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 transition-colors"
          >
            <MessageSquare className="w-5 h-5 text-emerald-400" />
          </button>
        </div>

        {/* 进度概览 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-sm text-gray-400 mb-1">体重变化</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-emerald-400">{(member.startWeight - member.currentWeight).toFixed(1)}kg</span>
              <span className="text-sm text-gray-400 mb-1">↓</span>
            </div>
            <p className="text-xs text-gray-500">{member.startWeight} → {member.currentWeight}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-sm text-gray-400 mb-1">体脂变化</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-emerald-400">{(member.startFat - member.currentFat).toFixed(1)}%</span>
              <span className="text-sm text-gray-400 mb-1">↓</span>
            </div>
            <p className="text-xs text-gray-500">{member.startFat}% → {member.currentFat}%</p>
          </div>
        </div>
      </Card>

      {/* 预警提示 */}
      <Card className="p-4 border border-red-500/30">
        <div className="flex items-center gap-3 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <div>
            <p className="font-medium">需要关注</p>
            <p className="text-sm text-red-400/80">午餐和加餐热量超标，建议调整饮食结构</p>
          </div>
        </div>
      </Card>

      {/* 标签切换 */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
              activeTab === tab.id
                ? 'bg-emerald-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* 概览内容 */}
      {activeTab === 'overview' && (
        <>
          {/* 身体指标 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">身体指标</h3>
              <button
                onClick={() => setShowAllMetrics(!showAllMetrics)}
                className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                {showAllMetrics ? '收起' : '查看全部'}
                <ChevronRight className={`w-4 h-4 transition-transform ${showAllMetrics ? 'rotate-90' : ''}`} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {displayedMetrics.map(metric => (
                <Card key={metric.id} className="p-3">
                  <div className="flex items-center gap-1.5 text-gray-400 mb-1.5">
                    {metric.icon}
                    <span className="text-sm">{metric.name}</span>
                  </div>
                  <p className="text-xl font-bold">{metric.value}<span className="text-sm text-gray-400">{metric.unit}</span></p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">正常 {metric.normal}</span>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(metric.trend)}
                      <span className={`text-xs ${['weight', 'bmi', 'fat', 'visceral', 'bodyage', 'subfat'].includes(metric.id) ? (metric.trend === 'down' ? 'text-emerald-400' : metric.trend === 'up' ? 'text-red-400' : 'text-gray-400') : (metric.trend === 'up' ? 'text-emerald-400' : metric.trend === 'down' ? 'text-red-400' : 'text-gray-400')}`}>
                        {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}{metric.unit}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* 近期记录 */}
          <div>
            <h3 className="font-medium mb-3">近期记录</h3>
            <Card className="p-0 divide-y divide-white/5">
              {recentRecords.map((record, index) => (
                <div key={index} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">{record.date}</span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span>{record.weight}kg</span>
                    <span className="text-gray-400">{record.fat}%</span>
                    <span className={record.calories > 2000 ? 'text-red-400' : record.calories < 1500 ? 'text-yellow-400' : 'text-emerald-400'}>
                      {record.calories}kcal
                    </span>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </>
      )}

      {/* 饮食内容 */}
      {activeTab === 'diet' && (
        <div>
          <h3 className="font-medium mb-3">今日饮食</h3>
          <Card className="p-4 space-y-4">
            {todayMeals.map((meal, index) => {
              const key = `meal-${index}`
              const fb = feedbacks[key] || {}
              const isEditing = editingKey === key
              return (
                <div key={index} className="space-y-2">
                  {/* 记录主行 */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">{meal.meal}</span>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm ${
                        meal.status === 'over' ? 'text-red-400' : meal.status === 'under' ? 'text-yellow-400' : 'text-emerald-400'
                      }`}>
                        {meal.calories} kcal
                      </span>
                      {meal.status === 'over' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                    </div>
                  </div>

                  {/* 评语 & 点赞操作栏 */}
                  <div className="flex items-center gap-2 pl-1">
                    {/* 点赞按钮 */}
                    <button
                      onClick={(e) => fb.liked ? handleUnlike(key, e) : handleLike(key)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${
                        fb.liked
                          ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                          : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300'
                      }`}
                      title={fb.liked ? '点击切换表情，长按取消' : '给这条记录点个赞'}
                    >
                      <span className="text-base leading-none">{fb.liked ? (fb.likeEmoji || '👍') : '👍'}</span>
                      {fb.liked && (
                        <X
                          className="w-3 h-3 text-amber-400/60 hover:text-amber-400"
                          onClick={(e) => handleUnlike(key, e)}
                        />
                      )}
                    </button>

                    {/* 评语按钮 */}
                    <button
                      onClick={() => handleOpenComment(key)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${
                        fb.comment
                          ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                          : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300'
                      }`}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{fb.comment ? '编辑评语' : '+ 评语'}</span>
                    </button>
                  </div>

                  {/* 已有评语展示 */}
                  {fb.comment && !isEditing && (
                    <div className="ml-1 flex items-start gap-2 bg-emerald-500/10 rounded-lg px-3 py-2">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-emerald-300 leading-relaxed">{fb.comment}</p>
                    </div>
                  )}

                  {/* Inline 评语输入框 */}
                  {isEditing && (
                    <div className="ml-1 space-y-2">
                      <textarea
                        value={draftComment}
                        onChange={e => setDraftComment(e.target.value)}
                        placeholder={`给 ${meal.meal} 写点评语...`}
                        rows={2}
                        autoFocus
                        className="w-full bg-slate-800/60 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveComment(key, meal.meal)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-400 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          保存
                        </button>
                        <button
                          onClick={() => { setEditingKey(null); setDraftComment('') }}
                          className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-400 text-xs hover:bg-slate-600 transition-colors"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 分隔线（非最后一条） */}
                  {index < todayMeals.length - 1 && (
                    <div className="border-t border-white/5 pt-2" />
                  )}
                </div>
              )
            })}
          </Card>
        </div>
      )}

      {/* 运动内容 */}
      {activeTab === 'exercise' && (
        <>
          {/* 本周概览 */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Dumbbell className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-gray-400">训练时长</span>
              </div>
              <p className="text-xl font-bold">{exerciseStats.weeklyCompleted}<span className="text-sm text-gray-400">min</span></p>
              <p className="text-xs text-gray-500">目标 {exerciseStats.weeklyTarget}min</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-gray-400">消耗热量</span>
              </div>
              <p className="text-xl font-bold">{exerciseStats.totalCalories}<span className="text-sm text-gray-400">kcal</span></p>
              <p className="text-xs text-gray-500">本周累计</p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-400">平均时长</span>
              </div>
              <p className="text-xl font-bold">{exerciseStats.avgDuration}<span className="text-sm text-gray-400">min</span></p>
              <p className="text-xs text-gray-500">每次训练</p>
            </Card>
          </div>

          {/* 完成率进度条 */}
          <Card className="p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">本周计划完成率</span>
              <span className="text-emerald-400 font-semibold">{exerciseStats.completionRate}%</span>
            </div>
            <Progress value={exerciseStats.completionRate} className="h-2" />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">周一</span>
              <span className="text-xs text-gray-500">周日</span>
            </div>
          </Card>

          {/* 周计划 */}
          <div className="mb-4">
            <h3 className="font-medium mb-3">本周训练安排</h3>
            <div className="grid grid-cols-7 gap-2">
              {weeklyPlan.map((item, idx) => (
                <div key={idx} className="text-center">
                  <p className="text-xs text-gray-500 mb-1">{item.day}</p>
                  <div className={`rounded-lg p-2 text-xs min-h-[48px] flex flex-col items-center justify-center gap-1 ${
                    item.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                    item.status === 'under' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-white/5 text-gray-500'
                  }`}>
                    {item.status === 'completed' && <Dumbbell className="w-3 h-3" />}
                    {item.status === 'under' && <span className="text-[10px]">!</span>}
                    {item.status === 'rest' && <span className="text-[10px]">休</span>}
                    <span className="text-[10px] leading-tight">{item.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 近期训练记录 */}
          <div>
            <h3 className="font-medium mb-3">近期训练记录</h3>
            <Card className="p-3 space-y-1 divide-y divide-white/5">
              {exerciseRecords.map((record, index) => {
                const key = `exercise-${index}`
                const fb = feedbacks[key] || {}
                const isEditing = editingKey === key
                return (
                  <div key={index} className="pt-3 first:pt-0 space-y-2">
                    {/* 主行 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          record.status === 'completed' ? 'bg-emerald-500/20' :
                          record.status === 'under' ? 'bg-yellow-500/20' : 'bg-white/5'
                        }`}>
                          <Dumbbell className={`w-4 h-4 ${
                            record.status === 'completed' ? 'text-emerald-400' :
                            record.status === 'under' ? 'text-yellow-400' : 'text-gray-500'
                          }`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{record.type}</p>
                          <p className="text-xs text-gray-500">{record.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {record.status === 'rest' ? (
                          <span className="text-xs text-gray-500">休息日</span>
                        ) : (
                          <>
                            <p className="text-sm">{record.duration}min</p>
                            <p className={`text-xs ${record.status === 'under' ? 'text-yellow-400' : 'text-emerald-400'}`}>
                              {record.calories} kcal
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 仅非休息日显示评语&点赞 */}
                    {record.status !== 'rest' && (
                      <>
                        {/* 操作栏 */}
                        <div className="flex items-center gap-2 pl-1">
                          <button
                            onClick={(e) => fb.liked ? handleUnlike(key, e) : handleLike(key)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${
                              fb.liked
                                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                                : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300'
                            }`}
                          >
                            <span className="text-base leading-none">{fb.liked ? (fb.likeEmoji || '👍') : '👍'}</span>
                            {fb.liked && (
                              <X
                                className="w-3 h-3 text-amber-400/60 hover:text-amber-400"
                                onClick={(e) => handleUnlike(key, e)}
                              />
                            )}
                          </button>
                          <button
                            onClick={() => handleOpenComment(key)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${
                              fb.comment
                                ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                                : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300'
                            }`}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>{fb.comment ? '编辑评语' : '+ 评语'}</span>
                          </button>
                        </div>

                        {/* 已有评语 */}
                        {fb.comment && !isEditing && (
                          <div className="ml-1 flex items-start gap-2 bg-emerald-500/10 rounded-lg px-3 py-2">
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-emerald-300 leading-relaxed">{fb.comment}</p>
                          </div>
                        )}

                        {/* Inline 评语输入 */}
                        {isEditing && (
                          <div className="ml-1 space-y-2">
                            <textarea
                              value={draftComment}
                              onChange={e => setDraftComment(e.target.value)}
                              placeholder={`给 ${record.date} ${record.type} 写点评语...`}
                              rows={2}
                              autoFocus
                              className="w-full bg-slate-800/60 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveComment(key, record.type)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-400 transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                                保存
                              </button>
                              <button
                                onClick={() => { setEditingKey(null); setDraftComment('') }}
                                className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-400 text-xs hover:bg-slate-600 transition-colors"
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </Card>
          </div>
        </>
      )}

      {/* 方案内容 */}
      {activeTab === 'plan' && (
        <>
          <Card className="p-4">
            <h3 className="font-medium mb-3">当前方案：减脂计划</h3>
            <div className="space-y-2 text-sm text-gray-400">
              <p>目标热量：1600-1800 kcal/天</p>
              <p>蛋白质：120g/天</p>
              <p>脂肪：50g/天</p>
              <p>碳水：150g/天</p>
            </div>
            <button
              onClick={() => setShowPlanDetail(true)}
              className="w-full mt-4 p-3 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
            >
              查看完整方案
            </button>
          </Card>

          {/* 分配训练计划按钮 */}
          <button
            onClick={() => setShowAssignPlanModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-medium hover:opacity-90 transition-opacity"
          >
            <ClipboardList className="w-4 h-4" />
            分配训练计划
          </button>
        </>
      )}

      {/* 拍照上传提示 */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Camera className="w-6 h-6 text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium">最新照片</p>
            <p className="text-sm text-gray-400">会员尚未上传最新照片</p>
          </div>
        </div>
      </Card>

      {/* 完整方案弹窗 */}
      <Modal
        open={showPlanDetail}
        onOpenChange={(open) => {
          setShowPlanDetail(open)
          if (!open) setIsEditingPlan(false)
        }}
        title={`${member.name} 的方案`}
        description={`方案周期：${planData.period} · 第${member.week}周`}
      >
        <div className="space-y-5">

          {/* 方案目标（始终只读） */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              方案目标
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-900 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">目标体重</p>
                {isEditingPlan ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={planData.targetWeight}
                      onChange={e => setPlanData(p => ({ ...p, targetWeight: Number(e.target.value) }))}
                      className="w-14 bg-slate-800 rounded px-2 py-1 text-white text-base font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="text-slate-500 text-sm">kg</span>
                  </div>
                ) : (
                  <p className="text-lg font-bold text-white">{planData.targetWeight} kg</p>
                )}
              </div>
              <div className="bg-slate-900 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">目标体脂</p>
                {isEditingPlan ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={planData.targetFat}
                      onChange={e => setPlanData(p => ({ ...p, targetFat: Number(e.target.value) }))}
                      className="w-14 bg-slate-800 rounded px-2 py-1 text-white text-base font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="text-slate-500 text-sm">%</span>
                  </div>
                ) : (
                  <p className="text-lg font-bold text-white">{planData.targetFat}%</p>
                )}
              </div>
              <div className="bg-slate-900 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">目标腰围</p>
                {isEditingPlan ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={planData.targetWaist}
                      onChange={e => setPlanData(p => ({ ...p, targetWaist: Number(e.target.value) }))}
                      className="w-14 bg-slate-800 rounded px-2 py-1 text-white text-base font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="text-slate-500 text-sm">cm</span>
                  </div>
                ) : (
                  <p className="text-lg font-bold text-white">{planData.targetWaist} cm</p>
                )}
              </div>
            </div>
          </div>

          {/* 每日饮食目标 */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Utensils className="w-4 h-4 text-orange-400" />
              每日饮食目标
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '热量范围', key: 'calories', unit: 'kcal', color: 'text-orange-400', editable: true, getter: () => `${planData.caloriesMin}-${planData.caloriesMax}`, minKey: 'caloriesMin', maxKey: 'caloriesMax' },
                { label: '蛋白质', key: 'protein', unit: 'g/天', color: 'text-blue-400', editable: true },
                { label: '脂肪', key: 'fat', unit: 'g/天', color: 'text-yellow-400', editable: true },
                { label: '碳水', key: 'carbs', unit: 'g/天', color: 'text-emerald-400', editable: true },
              ].map(item => (
                <div key={item.key} className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                  {isEditingPlan && item.editable ? (
                    item.key === 'calories' ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={planData.caloriesMin}
                          onChange={e => setPlanData(p => ({ ...p, caloriesMin: Number(e.target.value) }))}
                          className="w-16 bg-slate-900 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <span className="text-slate-500 text-sm">-</span>
                        <input
                          type="number"
                          value={planData.caloriesMax}
                          onChange={e => setPlanData(p => ({ ...p, caloriesMax: Number(e.target.value) }))}
                          className="w-16 bg-slate-900 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={(planData as unknown as Record<string, number>)[item.key]}
                          onChange={e => setPlanData(p => ({ ...p, [item.key]: Number(e.target.value) }))}
                          className="w-16 bg-slate-900 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <span className="text-slate-500 text-sm">{item.unit}</span>
                      </div>
                    )
                  ) : (
                    <p className={`text-lg font-bold ${item.color}`}>{item.getter ? item.getter() : `${(planData as unknown as Record<string, number>)[item.key]}${item.unit}`}</p>
                  )}
                  {!isEditingPlan && <p className="text-xs text-slate-500 mt-0.5">{item.unit}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* 每周训练安排 */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-emerald-400" />
              每周训练安排
            </h4>
            <div className="space-y-2">
              {planData.training.map((item, idx) => (
                <div key={item.day} className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-3">
                  <span className="text-xs text-slate-500 w-8 flex-shrink-0">{item.day}</span>
                  {isEditingPlan ? (
                    <>
                      <input
                        value={item.type}
                        onChange={e => setPlanData(p => {
                          const training = [...p.training]
                          training[idx] = { ...training[idx], type: e.target.value }
                          return { ...p, training }
                        })}
                        placeholder="训练类型"
                        className="flex-1 bg-slate-900 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <input
                        value={item.detail}
                        onChange={e => setPlanData(p => {
                          const training = [...p.training]
                          training[idx] = { ...training[idx], detail: e.target.value }
                          return { ...p, training }
                        })}
                        placeholder="训练详情"
                        className="flex-1 bg-slate-900 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-white font-medium">{item.type}</span>
                      <span className="text-xs text-slate-400">{item.detail}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 教练叮嘱 */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <span className="w-4 h-4 flex items-center justify-center text-orange-400 text-xs">✎</span>
              教练叮嘱
            </h4>
            {isEditingPlan ? (
              <textarea
                value={planData.notes}
                onChange={e => setPlanData(p => ({ ...p, notes: e.target.value }))}
                rows={4}
                className="w-full bg-slate-800/50 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                placeholder="填写对会员的叮嘱内容..."
              />
            ) : (
              <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/50 rounded-xl px-4 py-3">{planData.notes}</p>
            )}
          </div>

          {/* 底部操作栏 */}
          <div className="flex gap-3 pt-2">
            {isEditingPlan ? (
              <>
                <button
                  onClick={async () => {
                    if (!memberId || !user?.id) return
                    // 调用 API 保存方案备注
                    const result = await saveMemberPlanNotes(memberId, user.id, planData.notes)
                    if (result.success) {
                      console.log('[教练端] 保存会员方案备注成功:', memberId)
                    } else {
                      console.error('[教练端] 保存失败:', result.error)
                    }
                    setIsEditingPlan(false)
                  }}
                  className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-400 transition-colors"
                >
                  保存方案
                </button>
                <button
                  onClick={() => setIsEditingPlan(false)}
                  className="px-4 py-3 rounded-xl bg-slate-700 text-slate-300 font-medium hover:bg-slate-600 transition-colors"
                >
                  取消
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowPlanDetail(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 font-medium hover:bg-slate-600 transition-colors"
                >
                  关闭
                </button>
                <button
                  onClick={() => setIsEditingPlan(true)}
                  className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  编辑方案
                </button>
              </>
            )}
          </div>
        </div>
      </Modal>

      {/* 分配训练计划弹窗 */}
      <Modal
        open={showAssignPlanModal}
        onOpenChange={setShowAssignPlanModal}
        title="分配训练计划"
        description={`将训练计划分配给 ${member?.name || '该会员'}`}
      >
        {assignSuccess ? (
          <div className="flex flex-col items-center py-8">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-lg font-medium text-white">分配成功</p>
            <p className="text-sm text-slate-400 mt-1">会员可在「我的计划」中查看</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 选择方案 */}
            <div>
              <p className="text-sm text-slate-400 mb-2">选择训练方案</p>
              {plans.length === 0 ? (
                <p className="text-sm text-gray-500 p-3 bg-slate-800/50 rounded-xl">
                  暂无训练方案，请先去「方案库」创建
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {plans.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`w-full text-left p-3 rounded-xl transition-all ${
                        selectedPlanId === plan.id
                          ? 'bg-emerald-500/20 border border-emerald-500/50'
                          : 'bg-slate-800/50 border border-transparent hover:bg-slate-800'
                      }`}
                    >
                      <p className="text-sm font-medium">{plan.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {plan.duration}周 · {plan.description || '无描述'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 开始日期 */}
            <div>
              <p className="text-sm text-slate-400 mb-2">计划开始日期（可选）</p>
              <input
                type="date"
                value={assignStartDate}
                onChange={(e) => setAssignStartDate(e.target.value)}
                className="w-full p-3 bg-slate-800/50 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <p className="text-xs text-gray-500 mt-1">不填则默认为今天开始</p>
            </div>

            {/* 确认按钮 */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowAssignPlanModal(false)}
                className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 font-medium hover:bg-slate-600 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAssignPlan}
                disabled={!selectedPlanId || assigning}
                className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {assigning ? '分配中...' : '确认分配'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 发送消息弹窗 */}
      <Modal
        open={showMessageModal}
        onOpenChange={setShowMessageModal}
        title={`发消息给 ${member.name}`}
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
            {/* 快捷消息模板 */}
            <div>
              <p className="text-sm text-slate-400 mb-2">快捷消息</p>
              <div className="grid grid-cols-1 gap-2">
                {quickMessages.map((msg, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCustomMessage(msg.text)}
                    className={`text-left p-3 rounded-xl transition-all ${
                      customMessage === msg.text 
                        ? 'bg-emerald-500/20 border border-emerald-500/50' 
                        : 'bg-slate-800/50 border border-transparent hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-base mr-2">{msg.emoji}</span>
                    <span className="text-sm text-slate-200">{msg.text}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 自定义输入 */}
            <div>
              <p className="text-sm text-slate-400 mb-2">或编辑消息</p>
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
