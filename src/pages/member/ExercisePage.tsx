import { useState, useMemo, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Flame, Clock, Target, Search, X, Camera, TrendingUp, BarChart3, Heart } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useExerciseStore, useTodayDuration, useTodayCaloriesBurned } from '@/stores/exerciseStore'
import { useAuth } from '@/contexts/AuthContext'
import { useProfileStore } from '@/stores'
import { usePlanTarget } from '@/stores/planStore'
import { BarChart } from '@/components/ui/RingChart'
import type { IExerciseItem } from '@/cloudbase/types'
import { recognizeExercise } from '@/cloudbase/services/recognize'

interface ExerciseRecord {
  id: string
  name: string
  emoji: string
  duration: number
  calories: number
  time: string
  activeCalories?: number  // 动态千卡
  totalCalories?: number   // 总千卡
  avgHeartRate?: number    // 平均心率
}

interface ExerciseType {
  id: string
  name: string
  emoji: string
  color: string
  caloriesPerMinute: number
  category: string
}

// 50种常见运动及其卡路里消耗（基于体重70kg的成年人每小时消耗）
const exerciseTypes: ExerciseType[] = [
  // 有氧运动
  { id: 'running', name: '慢跑', emoji: '🏃', color: 'from-orange-500 to-red-500', caloriesPerMinute: 10, category: '有氧' },
  { id: 'running-fast', name: '快跑', emoji: '🏃', color: 'from-red-500 to-pink-500', caloriesPerMinute: 14, category: '有氧' },
  { id: 'jogging', name: '慢走', emoji: '🚶', color: 'from-green-500 to-emerald-500', caloriesPerMinute: 3, category: '有氧' },
  { id: 'walking', name: '快走', emoji: '🚶', color: 'from-emerald-500 to-teal-500', caloriesPerMinute: 5, category: '有氧' },
  { id: 'cycling', name: '骑行', emoji: '🚴', color: 'from-blue-500 to-cyan-500', caloriesPerMinute: 8, category: '有氧' },
  { id: 'cycling-fast', name: '高速骑行', emoji: '🚴', color: 'from-cyan-500 to-blue-500', caloriesPerMinute: 12, category: '有氧' },
  { id: 'swimming', name: '游泳', emoji: '🏊', color: 'from-cyan-500 to-blue-500', caloriesPerMinute: 11, category: '有氧' },
  { id: 'swimming-fast', name: '快速游泳', emoji: '🏊', color: 'from-blue-500 to-indigo-500', caloriesPerMinute: 15, category: '有氧' },
  { id: 'jump-rope', name: '跳绳', emoji: '🪢', color: 'from-yellow-500 to-orange-500', caloriesPerMinute: 12, category: '有氧' },
  { id: 'aerobic', name: '有氧操', emoji: '💃', color: 'from-pink-500 to-rose-500', caloriesPerMinute: 9, category: '有氧' },
  { id: 'dancing', name: '跳舞', emoji: '🕺', color: 'from-purple-500 to-pink-500', caloriesPerMinute: 7, category: '有氧' },
  { id: 'boxing', name: '拳击', emoji: '🥊', color: 'from-red-600 to-red-500', caloriesPerMinute: 13, category: '有氧' },
  { id: 'kickboxing', name: '跆拳道', emoji: '🥋', color: 'from-red-500 to-orange-500', caloriesPerMinute: 12, category: '有氧' },
  { id: 'basketball', name: '篮球', emoji: '🏀', color: 'from-orange-500 to-amber-500', caloriesPerMinute: 10, category: '有氧' },
  { id: 'football', name: '足球', emoji: '⚽', color: 'from-green-600 to-green-500', caloriesPerMinute: 10, category: '有氧' },
  { id: 'tennis', name: '网球', emoji: '🎾', color: 'from-yellow-600 to-green-500', caloriesPerMinute: 8, category: '有氧' },
  { id: 'badminton', name: '羽毛球', emoji: '🏸', color: 'from-blue-400 to-cyan-500', caloriesPerMinute: 7, category: '有氧' },
  { id: 'pingpong', name: '乒乓球', emoji: '🏓', color: 'from-green-400 to-blue-500', caloriesPerMinute: 5, category: '有氧' },
  { id: 'volleyball', name: '排球', emoji: '🏐', color: 'from-yellow-400 to-orange-400', caloriesPerMinute: 5, category: '有氧' },
  { id: 'climbing', name: '爬山', emoji: '⛰️', color: 'from-green-600 to-emerald-600', caloriesPerMinute: 9, category: '有氧' },
  { id: 'hiking', name: '徒步', emoji: '🥾', color: 'from-amber-600 to-orange-500', caloriesPerMinute: 6, category: '有氧' },
  { id: 'stairs', name: '爬楼梯', emoji: '🪜', color: 'from-gray-500 to-gray-600', caloriesPerMinute: 8, category: '有氧' },
  { id: 'elliptical', name: '椭圆机', emoji: '🚴', color: 'from-teal-500 to-cyan-500', caloriesPerMinute: 8, category: '有氧' },
  { id: 'rowing', name: '划船机', emoji: '🚣', color: 'from-blue-600 to-blue-500', caloriesPerMinute: 10, category: '有氧' },

  // 力量训练
  { id: 'strength', name: '力量训练', emoji: '🏋️', color: 'from-red-500 to-orange-500', caloriesPerMinute: 7, category: '力量' },
  { id: 'weightlifting', name: '举重', emoji: '🏋️', color: 'from-gray-600 to-gray-700', caloriesPerMinute: 8, category: '力量' },
  { id: 'pushup', name: '俯卧撑', emoji: '💪', color: 'from-orange-500 to-red-500', caloriesPerMinute: 6, category: '力量' },
  { id: 'situp', name: '仰卧起坐', emoji: '🧘', color: 'from-pink-500 to-rose-500', caloriesPerMinute: 5, category: '力量' },
  { id: 'plank', name: '平板支撑', emoji: '🧘', color: 'from-purple-500 to-indigo-500', caloriesPerMinute: 4, category: '力量' },
  { id: 'squat', name: '深蹲', emoji: '🦵', color: 'from-blue-500 to-purple-500', caloriesPerMinute: 6, category: '力量' },
  { id: 'crunch', name: '卷腹', emoji: '💪', color: 'from-rose-500 to-pink-500', caloriesPerMinute: 5, category: '力量' },
  { id: 'burpee', name: '波比跳', emoji: '🔥', color: 'from-red-500 to-orange-500', caloriesPerMinute: 12, category: '力量' },

  // 柔韧/平衡
  { id: 'yoga', name: '瑜伽', emoji: '🧘', color: 'from-purple-500 to-pink-500', caloriesPerMinute: 4, category: '柔韧' },
  { id: 'pilates', name: '普拉提', emoji: '🧘', color: 'from-pink-400 to-rose-400', caloriesPerMinute: 5, category: '柔韧' },
  { id: 'stretching', name: '拉伸', emoji: '🤸', color: 'from-teal-400 to-cyan-400', caloriesPerMinute: 3, category: '柔韧' },
  { id: 'taiji', name: '太极拳', emoji: '☯️', color: 'from-gray-400 to-gray-500', caloriesPerMinute: 4, category: '柔韧' },

  // 休闲运动
  { id: 'golf', name: '高尔夫', emoji: '⛳', color: 'from-green-500 to-emerald-500', caloriesPerMinute: 5, category: '休闲' },
  { id: 'bowling', name: '保龄球', emoji: '🎳', color: 'from-purple-400 to-pink-400', caloriesPerMinute: 3, category: '休闲' },
  { id: 'table', name: '台球', emoji: '🎱', color: 'from-gray-500 to-gray-600', caloriesPerMinute: 2, category: '休闲' },
  { id: 'fishing', name: '钓鱼', emoji: '🎣', color: 'from-blue-400 to-teal-400', caloriesPerMinute: 3, category: '休闲' },
  { id: 'kite', name: '放风筝', emoji: '🪁', color: 'from-sky-400 to-blue-400', caloriesPerMinute: 4, category: '休闲' },
  { id: 'skateboard', name: '滑板', emoji: '🛹', color: 'from-orange-500 to-red-500', caloriesPerMinute: 6, category: '休闲' },

  // 冬季/水上运动
  { id: 'skiing', name: '滑雪', emoji: '⛷️', color: 'from-sky-300 to-white', caloriesPerMinute: 10, category: '冬季' },
  { id: 'snowboard', name: '单板滑雪', emoji: '🏂', color: 'from-blue-300 to-sky-300', caloriesPerMinute: 10, category: '冬季' },
  { id: 'ice-skate', name: '滑冰', emoji: '⛸️', color: 'from-cyan-300 to-blue-300', caloriesPerMinute: 8, category: '冬季' },
  { id: 'surfing', name: '冲浪', emoji: '🏄', color: 'from-cyan-400 to-blue-400', caloriesPerMinute: 7, category: '水上' },
  { id: 'kayaking', name: '皮划艇', emoji: '🚣', color: 'from-blue-500 to-teal-500', caloriesPerMinute: 7, category: '水上' },

  // 其他
  { id: 'martial', name: '武术', emoji: '🥋', color: 'from-red-600 to-amber-500', caloriesPerMinute: 8, category: '其他' },
  { id: 'crossfit', name: 'CrossFit', emoji: '💪', color: 'from-orange-500 to-red-500', caloriesPerMinute: 15, category: '其他' },
  { id: 'HIIT', name: 'HIIT训练', emoji: '⚡', color: 'from-yellow-500 to-orange-500', caloriesPerMinute: 14, category: '其他' },
]

const exerciseCategories = ['全部', '有氧', '力量', '柔韧', '休闲', '冬季', '水上', '其他']

export function ExercisePage() {
  // ── URL 参数（用于从首页直接打开添加弹窗） ──
  const [searchParams] = useSearchParams()

  // ── 当前登录用户 ──
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user: _user } = useAuth()
  const { profile } = useProfileStore()
  const currentUserId = profile.memberId || 'local-user'

  // ── Store 数据 ──
  const storeExercises = useExerciseStore((s) => s.exercises)
  const fetchExercises = useExerciseStore((s) => s.fetchExercises)
  const addExercise = useExerciseStore((s) => s.addExercise)
  const deleteExercise = useExerciseStore((s) => s.deleteExercise)
  const todayDuration = useTodayDuration()
  const todayCalories = useTodayCaloriesBurned()

  // ── 挂载时从 API / localStorage 拉取数据 ──
  useEffect(() => {
    fetchExercises()
    // 检查 URL 参数，如果 addModal=true 则打开添加弹窗
    if (searchParams.get('addModal') === 'true') {
      setShowAddModal(true)
    }
  }, [])

  // ── UI 状态 ──
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedType, setSelectedType] = useState<ExerciseType | null>(null)
  const [duration, setDuration] = useState(30)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('全部')
  const [showCustom, setShowCustom] = useState(false)
  const [customExercise, setCustomExercise] = useState({ name: '', caloriesPerMinute: '' })

  // AI拍照识别运动报告
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiResult, setAiResult] = useState<ExerciseRecord[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 记录详情弹窗
  const [detailRecord, setDetailRecord] = useState<ExerciseRecord | null>(null)

  // 目标热量（从计划目标读取，默认500）
  const planTarget = usePlanTarget()
  const [targetCalories] = useState(() => planTarget?.targetCalories || 500)

  // 计算本周统计数据
  const today = new Date()
  const todayDayOfWeek = (today.getDay() + 6) % 7 // 转为周一=0格式
  const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

  // 本周每天的运动数据
  const weeklyData = weekDays.map((day, index) => {
    const targetDate = new Date(today)
    targetDate.setDate(today.getDate() - (todayDayOfWeek - index))
    const dateStr = targetDate.toISOString().split('T')[0]

    const dayExercises = storeExercises.filter(ex => {
      const exDate = new Date(ex.exercise_date).toISOString().split('T')[0]
      return exDate === dateStr
    })

    const totalDuration = Math.round(dayExercises.reduce((sum, ex) => sum + (ex.total_duration || 0), 0))
    const totalCalories = Math.round(dayExercises.reduce((sum, ex) => sum + (ex.total_calories || 0), 0))

    return {
      label: day,
      duration: totalDuration,
      calories: totalCalories,
      isToday: index === todayDayOfWeek
    }
  })

  // 本周总时长和卡路里
  const weekTotalDuration = Math.round(weeklyData.reduce((sum, d) => sum + d.duration, 0))
  const weekTotalCalories = Math.round(weeklyData.reduce((sum, d) => sum + d.calories, 0))

  // 运动类型分类统计
  const categoryStats = useMemo(() => {
    const stats: Record<string, { duration: number; calories: number }> = {}
    storeExercises.forEach(ex => {
      ex.exercises.forEach((item: IExerciseItem) => {
        // 根据运动名称简单分类
        const category = exerciseTypes.find(t => t.name === item.name)?.category || '其他'
        if (!stats[category]) stats[category] = { duration: 0, calories: 0 }
        stats[category].duration = Math.round(stats[category].duration + item.duration)
        stats[category].calories = Math.round(stats[category].calories + item.calories)
      })
    })
    return Object.entries(stats)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.calories - a.calories)
  }, [storeExercises])

  // 根据运动名称获取 emoji
  const getExerciseEmoji = (name: string): string => {
    const nameLower = name.toLowerCase()
    if (nameLower.includes('跑') || nameLower.includes('run') || nameLower.includes('jog')) return '🏃'
    if (nameLower.includes('骑') || nameLower.includes('cycle') || nameLower.includes('bike')) return '🚴'
    if (nameLower.includes('泳') || nameLower.includes('swim')) return '🏊'
    if (nameLower.includes('走') || nameLower.includes('walk')) return '🚶'
    if (nameLower.includes('跳') || nameLower.includes('jump')) return '🪢'
    if (nameLower.includes('瑜伽') || nameLower.includes('yoga')) return '🧘'
    if (nameLower.includes('力量') || nameLower.includes('weight') || nameLower.includes('gym') || nameLower.includes('训练')) return '🏋️'
    if (nameLower.includes('球') || nameLower.includes('ball')) return '🏀'
    if (nameLower.includes('舞') || nameLower.includes('dance')) return '💃'
    return '🏃'
  }

  // 从 store 派生显示记录（每个 IExerciseItem → 一条 UI 记录）
  const displayRecords: ExerciseRecord[] = storeExercises
    .sort((a, b) => new Date(b.exercise_date).getTime() - new Date(a.exercise_date).getTime())
    .flatMap((ex) =>
      ex.exercises.map((item: IExerciseItem) => ({
        id: `${ex._id || ex.exercise_date}-${item.name}`,
        name: item.name,
        emoji: getExerciseEmoji(item.name),
        duration: item.duration,
        calories: item.calories,
        time: new Date(ex.exercise_date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        activeCalories: item.activeCalories,
        totalCalories: item.totalCalories,
        avgHeartRate: item.avgHeartRate,
      }))
    )

  // 过滤运动列表
  const filteredExercises = useMemo(() => {
    return exerciseTypes.filter(ex => {
      const matchSearch = ex.name.toLowerCase().includes(searchKeyword.toLowerCase())
      const matchCategory = selectedCategory === '全部' || ex.category === selectedCategory
      return matchSearch && matchCategory
    })
  }, [searchKeyword, selectedCategory])

  // 添加自定义运动
  const addCustomExercise = () => {
    if (!customExercise.name || !customExercise.caloriesPerMinute) return
    const newType: ExerciseType = {
      id: `custom-${Date.now()}`,
      name: customExercise.name,
      emoji: '🎯',
      color: 'from-emerald-500 to-teal-500',
      caloriesPerMinute: parseFloat(customExercise.caloriesPerMinute) || 5,
      category: '自定义'
    }
    setSelectedType(newType)
    setShowCustom(false)
    setCustomExercise({ name: '', caloriesPerMinute: '' })
  }

  const handleTypeSelect = (type: ExerciseType) => {
    setSelectedType(type)
  }

  // 根据每分钟消耗计算强度
  const getIntensity = (cpm: number): 'low' | 'medium' | 'high' => {
    if (cpm >= 10) return 'high'
    if (cpm >= 5) return 'medium'
    return 'low'
  }

  const handleConfirm = () => {
    if (!selectedType) return
    const calories = Math.round(selectedType.caloriesPerMinute * duration)
    const item: IExerciseItem = {
      name: selectedType.name,
      duration,
      calories,
      intensity: getIntensity(selectedType.caloriesPerMinute),
    }
    addExercise({
      user_id: currentUserId,
      exercise_date: new Date(),
      exercises: [item],
      total_duration: duration,
      total_calories: calories,
    })
    setShowAddModal(false)
    setSelectedType(null)
    setDuration(30)
  }

  const removeRecord = (recordId: string) => {
    // recordId 格式为 "${ex._id}-${item.name}"
    const targetExercise = storeExercises.find(ex => {
      const prefix = `${ex._id || ex.exercise_date}-`
      return recordId.startsWith(prefix)
    })
    if (targetExercise?._id) {
      deleteExercise(targetExercise._id)
    }
  }

  // 摄像头相关状态
  const [showCameraView, setShowCameraView] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // 处理图片上传
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsAnalyzing(true)

    try {
      // 将图片转换为 base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          // 移除 data:image/... 前缀
          const base64Data = result.replace(/^data:image\/\w+;base64,/, '')
          resolve(base64Data)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      console.log('[ExercisePage] 开始 AI 识别运动报告...')

      // 调用 AI 识别
      const result = await recognizeExercise(base64)

      if (result.success && result.exercises && result.exercises.length > 0) {
        console.log('[ExercisePage] AI 识别成功:', result.exercises)
        const now = new Date()
        const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
        
        // 转换为 ExerciseRecord 格式
        const records: ExerciseRecord[] = result.exercises.map((ex, index) => ({
          id: `ai-${Date.now()}-${index}`,
          name: ex.name,
          emoji: getExerciseEmoji(ex.name),
          duration: ex.duration,
          calories: ex.calories,
          time,
          activeCalories: ex.activeCalories,
          totalCalories: ex.totalCalories,
          avgHeartRate: ex.avgHeartRate,
        }))
        
        setAiResult(records)
      } else {
        console.error('[ExercisePage] AI 识别失败:', result.error)
        alert(result.error || '未识别到运动数据，请重试')
      }
    } catch (error) {
      console.error('[ExercisePage] 处理图片失败:', error)
      alert('处理图片失败，请重试')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 停止摄像头
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setShowCameraView(false)
  }

  // 拍照并识别
  const captureAndRecognize = async () => {
    if (!videoRef.current) return

    setIsAnalyzing(true)
    stopCamera()

    try {
      // 从 video 元素捕获画面
      const video = videoRef.current
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(video, 0, 0)
      
      // 转换为 base64
      const base64 = canvas.toDataURL('image/jpeg', 0.9)
        .replace(/^data:image\/\w+;base64,/, '')

      console.log('[ExercisePage] 开始 AI 识别运动报告...')

      const result = await recognizeExercise(base64)

      if (result.success && result.exercises && result.exercises.length > 0) {
        console.log('[ExercisePage] AI 识别成功:', result.exercises)
        const now = new Date()
        const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
        
        const records: ExerciseRecord[] = result.exercises.map((ex, index) => ({
          id: `ai-${Date.now()}-${index}`,
          name: ex.name,
          emoji: getExerciseEmoji(ex.name),
          duration: ex.duration,
          calories: ex.calories,
          time,
          activeCalories: ex.activeCalories,
          totalCalories: ex.totalCalories,
          avgHeartRate: ex.avgHeartRate,
        }))
        
        setAiResult(records)
      } else {
        console.error('[ExercisePage] AI 识别失败:', result.error)
        alert(result.error || '未识别到运动数据，请重试')
      }
    } catch (error) {
      console.error('[ExercisePage] 拍照识别失败:', error)
      alert('拍照识别失败，请重试')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 保存AI识别结果 → 写入 store
  const saveAIResult = () => {
    if (!aiResult) return
    aiResult.forEach((r) => {
      const intensity: 'low' | 'medium' | 'high' = r.calories / r.duration >= 10 ? 'high' : r.calories / r.duration >= 5 ? 'medium' : 'low'
      addExercise({
        user_id: currentUserId,
        exercise_date: new Date(),
        exercises: [{ 
          name: r.name, 
          duration: r.duration, 
          calories: r.calories, 
          intensity,
          activeCalories: r.activeCalories,
          totalCalories: r.totalCalories,
          avgHeartRate: r.avgHeartRate,
        }],
        total_duration: r.duration,
        total_calories: r.calories,
      })
    })
    setAiResult(null)
  }

  const closeModal = () => {
    setShowAddModal(false)
    setSelectedType(null)
    setDuration(30)
    setSearchKeyword('')
    setSelectedCategory('全部')
    setShowCustom(false)
  }

  return (
    <div className="space-y-4 pb-24">
      {/* 今日运动统计 */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Clock className="w-4 h-4" />
            运动时长
          </div>
          <div className="text-2xl font-bold">{todayDuration} <span className="text-sm text-gray-400">分钟</span></div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Flame className="w-4 h-4" />
            消耗热量
          </div>
          <div className="text-2xl font-bold">{todayCalories} <span className="text-sm text-gray-400">kcal</span></div>
        </Card>
      </div>

      {/* 目标进度 */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            <span className="font-medium">今日目标</span>
          </div>
          <span className="text-sm text-gray-400">{todayCalories} / {targetCalories} kcal</span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
            style={{ width: `${Math.min((todayCalories / targetCalories) * 100, 100)}%` }}
          />
        </div>
      </Card>

      {/* 本周统计 */}
      {weekTotalDuration > 0 && (
        <>
          {/* 本周概览 */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-medium">本周运动概览</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-blue-500/10 rounded-xl">
                <p className="text-2xl font-bold text-blue-400">{weekTotalDuration}</p>
                <p className="text-xs text-gray-400">总时长(分钟)</p>
              </div>
              <div className="text-center p-3 bg-orange-500/10 rounded-xl">
                <p className="text-2xl font-bold text-orange-400">{weekTotalCalories}</p>
                <p className="text-xs text-gray-400">总消耗(kcal)</p>
              </div>
            </div>

            {/* 本周趋势图 */}
            <div className="mb-3">
              <p className="text-xs text-gray-400 mb-2">每日消耗趋势</p>
              <BarChart
                data={weeklyData.map(d => ({
                  label: d.label,
                  value: d.calories,
                  color: d.isToday
                    ? 'bg-emerald-500/70'
                    : d.calories > 0
                      ? 'bg-blue-500/50'
                      : 'bg-white/10'
                }))}
                maxValue={Math.max(targetCalories * 1.5, ...weeklyData.map(d => d.calories))}
                height={60}
                unit="k"
              />
            </div>

            {/* 本周运动时长趋势 */}
            <div>
              <p className="text-xs text-gray-400 mb-2">每日时长趋势</p>
              <BarChart
                data={weeklyData.map(d => ({
                  label: d.label.slice(0, 1),
                  value: d.duration,
                  color: d.isToday
                    ? 'bg-purple-500/70'
                    : d.duration > 0
                      ? 'bg-purple-500/30'
                      : 'bg-white/10'
                }))}
                maxValue={60}
                height={40}
                unit="min"
              />
            </div>
          </Card>

          {/* 运动类型分布 */}
          {categoryStats.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-medium">运动类型分布</h3>
              </div>
              <div className="space-y-2">
                {categoryStats.slice(0, 5).map((stat, index) => {
                  const totalCal = categoryStats.reduce((s, c) => s + c.calories, 0)
                  const percentage = totalCal > 0 ? Math.round((stat.calories / totalCal) * 100) : 0
                  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-purple-500', 'bg-yellow-500']
                  return (
                    <div key={stat.name} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-8">{index + 1}</span>
                      <span className="text-sm flex-1">{stat.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${colors[index % colors.length]}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-10 text-right">{percentage}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </>
      )}

      {/* 记录运动按钮 */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center gap-2"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <p className="font-semibold text-sm">相册导入</p>
            <p className="text-xs text-gray-400">从相册选择图片</p>
          </button>
        </Card>

        <Card className="p-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full flex flex-col items-center gap-2"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/30 flex items-center justify-center">
              <Plus className="w-6 h-6 text-blue-400" />
            </div>
            <p className="font-semibold text-sm">记录运动</p>
            <p className="text-xs text-gray-400">添加运动</p>
          </button>
        </Card>
      </div>

      {/* 运动记录列表 */}
      {displayRecords.length > 0 ? (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">今日记录</h3>
          <div className="space-y-3">
            {displayRecords.map(record => (
              <Card 
                key={record.id} 
                className="p-4 relative group cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setDetailRecord(record)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl">
                      {record.emoji}
                    </div>
                    <div>
                      <p className="font-semibold">{record.name}</p>
                      <p className="text-sm text-gray-400">{record.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-400">{record.calories} kcal</p>
                    <p className="text-sm text-gray-400">{record.duration} 分钟</p>
                  </div>
                </div>
                {/* 新增字段指示器 */}
                {(record.activeCalories !== undefined || record.totalCalories !== undefined || record.avgHeartRate !== undefined) && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {record.activeCalories !== undefined && (
                      <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full">
                        动态 {record.activeCalories}
                      </span>
                    )}
                    {record.totalCalories !== undefined && (
                      <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">
                        总计 {record.totalCalories}
                      </span>
                    )}
                    {record.avgHeartRate !== undefined && (
                      <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full flex items-center gap-1">
                        <Heart className="w-3 h-3" /> {record.avgHeartRate}
                      </span>
                    )}
                  </div>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); removeRecord(record.id); }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/10 hover:bg-red-500/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="text-xs">×</span>
                </button>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card className="p-8 text-center">
          <div className="text-4xl mb-3">🏃</div>
          <p className="text-gray-400">暂无运动记录</p>
          <p className="text-sm text-gray-500 mt-1">点击上方按钮记录今日运动</p>
        </Card>
      )}

      {/* 添加运动弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex flex-col">
          <div className="bg-gray-900 p-4 flex items-center justify-between">
            <button onClick={closeModal} className="text-gray-400">
              <X className="w-6 h-6" />
            </button>
            <h3 className="font-semibold">添加运动</h3>
            <div className="w-6" />
          </div>

          <div className="flex-1 overflow-y-auto pb-32">
            {!selectedType ? (
              <>
                {/* 搜索框 */}
                <div className="p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="搜索运动..."
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      className="w-full bg-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* 分类标签 */}
                <div className="px-4 pb-3 overflow-x-auto">
                  <div className="flex gap-2 whitespace-nowrap">
                    {exerciseCategories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-full text-sm ${
                          selectedCategory === cat ? 'bg-emerald-500 text-white' : 'bg-white/10 text-gray-300'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 添加自定义运动按钮 */}
                <div className="px-4 py-3">
                  <button
                    onClick={() => setShowCustom(!showCustom)}
                    className="w-full py-4 rounded-xl border border-dashed border-emerald-500 text-emerald-400 text-sm flex items-center justify-center gap-2 hover:bg-emerald-500/10 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    添加自定义运动
                  </button>
                </div>

                {/* 自定义运动表单 */}
                {showCustom && (
                  <div className="px-4 pb-4">
                    <div className="p-5 bg-white/5 rounded-xl space-y-4">
                      <input
                        type="text"
                        placeholder="运动名称"
                        value={customExercise.name}
                        onChange={(e) => setCustomExercise({ ...customExercise, name: e.target.value })}
                        className="w-full bg-white/10 rounded-lg py-3 px-4 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">每分钟消耗 (kcal/分钟)</label>
                        <input
                          type="number"
                          placeholder="如：5"
                          value={customExercise.caloriesPerMinute}
                          onChange={(e) => setCustomExercise({ ...customExercise, caloriesPerMinute: e.target.value })}
                          className="w-full bg-white/10 rounded-lg py-3 px-4 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <button
                        onClick={addCustomExercise}
                        disabled={!customExercise.name || !customExercise.caloriesPerMinute}
                        className="w-full py-3 px-4 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        添加并选择
                      </button>
                    </div>
                  </div>
                )}

                {/* 运动列表 */}
                <div className="px-4 pb-4">
                  <p className="text-xs text-gray-500 mb-3">共 {filteredExercises.length} 种运动</p>
                  <div className="grid grid-cols-3 gap-2">
                    {filteredExercises.map(type => (
                      <button
                        key={type.id}
                        onClick={() => handleTypeSelect(type)}
                        className="flex flex-col items-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center text-xl mb-1`}>
                          {type.emoji}
                        </div>
                        <span className="text-xs text-center">{type.name}</span>
                        <span className="text-[10px] text-gray-500">{type.caloriesPerMinute} kcal/分</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">设置时长</h3>
                    <button onClick={() => setSelectedType(null)} className="text-gray-400 hover:text-white">
                      ← 返回
                    </button>
                  </div>

                  {/* 选中运动显示 */}
                  <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-white/5">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${selectedType.color} flex items-center justify-center text-3xl`}>
                      {selectedType.emoji}
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{selectedType.name}</p>
                      <p className="text-sm text-gray-400">约 {selectedType.caloriesPerMinute} kcal/分钟</p>
                    </div>
                  </div>

                  {/* 时长选择 */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-400">运动时长</span>
                      <span className="text-2xl font-bold text-emerald-400">{duration} <span className="text-sm text-gray-400">分钟</span></span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="180"
                      step="5"
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:rounded-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>5分钟</span>
                      <span>180分钟</span>
                    </div>
                  </div>

                  {/* 预估消耗 */}
                  <div className="bg-white/5 rounded-xl p-4 mb-6">
                    <div className="text-sm text-gray-400 mb-1">预计消耗</div>
                    <div className="text-3xl font-bold text-emerald-400">
                      {Math.round(selectedType.caloriesPerMinute * duration)} <span className="text-sm text-gray-400">kcal</span>
                    </div>
                  </div>

                  {/* 快捷时长按钮 */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {[15, 30, 45, 60, 90, 120].map(min => (
                      <button
                        key={min}
                        onClick={() => setDuration(min)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          duration === min
                            ? 'bg-emerald-500 text-white'
                            : 'bg-white/10 text-gray-400 hover:bg-white/20'
                        }`}
                      >
                        {min}分钟
                      </button>
                    ))}
                  </div>

                  {/* 确认按钮 */}
                  <button
                    onClick={handleConfirm}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-semibold hover:opacity-90 transition-opacity"
                  >
                    确认添加
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 摄像头预览界面 */}
      {showCameraView && (
        <div className="fixed inset-0 bg-black z-[60] flex flex-col">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="flex-1 object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-center gap-8">
            <button
              onClick={stopCamera}
              className="w-16 h-16 rounded-full bg-gray-800/80 flex items-center justify-center"
            >
              <X className="w-8 h-8 text-white" />
            </button>
            <button
              onClick={captureAndRecognize}
              className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center border-4 border-white"
            >
              <Camera className="w-10 h-10 text-white" />
            </button>
            <div className="w-16 h-16" /> {/* 占位 */}
          </div>
        </div>
      )}

      {/* 隐藏的文件输入 */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* AI识别加载中 */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-gray-900 rounded-2xl p-8 text-center max-w-xs mx-4">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin mx-auto mb-4" />
            <h3 className="font-semibold mb-2">AI正在分析...</h3>
            <p className="text-sm text-gray-400">正在识别运动报告数据</p>
          </div>
        </div>
      )}

      {/* AI识别结果 */}
      {aiResult && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end pb-[144px]">
          <div className="w-full bg-gray-900 rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-6" />
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">识别结果</h3>
              <button onClick={() => setAiResult(null)} className="text-gray-400">
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-sm text-gray-400 mb-4">AI已识别出以下运动数据：</p>

            <div className="space-y-3 mb-6">
              {aiResult.map((record) => (
                <Card key={record.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl">
                        {record.emoji}
                      </div>
                      <div>
                        <p className="font-semibold">{record.name}</p>
                        <p className="text-sm text-gray-400">{record.time}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-emerald-400">{record.calories} kcal</p>
                      <p className="text-sm text-gray-400">{record.duration} 分钟</p>
                    </div>
                  </div>
                  {/* 额外数据：动态千卡、总千卡、平均心率 */}
                  {(record.activeCalories !== undefined || record.totalCalories !== undefined || record.avgHeartRate !== undefined) && (
                    <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-3 gap-2">
                      {record.activeCalories !== undefined && (
                        <div className="text-center p-2 bg-orange-500/10 rounded-lg">
                          <p className="text-xs text-gray-400">动态千卡</p>
                          <p className="font-semibold text-orange-400">{record.activeCalories}</p>
                        </div>
                      )}
                      {record.totalCalories !== undefined && (
                        <div className="text-center p-2 bg-blue-500/10 rounded-lg">
                          <p className="text-xs text-gray-400">总千卡</p>
                          <p className="font-semibold text-blue-400">{record.totalCalories}</p>
                        </div>
                      )}
                      {record.avgHeartRate !== undefined && (
                        <div className="text-center p-2 bg-red-500/10 rounded-lg flex items-center justify-center gap-1">
                          <Heart className="w-3 h-3 text-red-400" />
                          <div>
                            <p className="text-xs text-gray-400">平均心率</p>
                            <p className="font-semibold text-red-400">{record.avgHeartRate}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>

            <div className="bg-white/5 rounded-xl p-4 mb-6">
              {/* 热量总计 */}
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-400">消耗总计</span>
                <div className="text-right">
                  <p className="text-xl font-bold text-emerald-400">
                    {aiResult.reduce((sum, r) => sum + r.calories, 0)} kcal
                  </p>
                  <p className="text-sm text-gray-400">
                    {aiResult.reduce((sum, r) => sum + r.duration, 0)} 分钟
                  </p>
                </div>
              </div>
              {/* 额外统计：动态千卡、总千卡、心率 */}
              {(aiResult.some(r => r.activeCalories !== undefined) || 
                aiResult.some(r => r.totalCalories !== undefined) || 
                aiResult.some(r => r.avgHeartRate !== undefined)) && (
                <div className="pt-3 border-t border-white/10 grid grid-cols-3 gap-2">
                  {aiResult.some(r => r.activeCalories !== undefined) && (
                    <div className="text-center p-2 bg-orange-500/10 rounded-lg">
                      <p className="text-xs text-gray-400">动态千卡</p>
                      <p className="font-semibold text-orange-400">
                        {aiResult.reduce((sum, r) => sum + (r.activeCalories || 0), 0)}
                      </p>
                    </div>
                  )}
                  {aiResult.some(r => r.totalCalories !== undefined) && (
                    <div className="text-center p-2 bg-blue-500/10 rounded-lg">
                      <p className="text-xs text-gray-400">总千卡</p>
                      <p className="font-semibold text-blue-400">
                        {aiResult.reduce((sum, r) => sum + (r.totalCalories || 0), 0)}
                      </p>
                    </div>
                  )}
                  {aiResult.some(r => r.avgHeartRate !== undefined) && (
                    <div className="text-center p-2 bg-red-500/10 rounded-lg flex items-center justify-center gap-1">
                      <Heart className="w-3 h-3 text-red-400" />
                      <div>
                        <p className="text-xs text-gray-400">平均心率</p>
                        <p className="font-semibold text-red-400">
                          {Math.round(aiResult.reduce((sum, r) => sum + (r.avgHeartRate || 0), 0) / aiResult.filter(r => r.avgHeartRate !== undefined).length)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={saveAIResult}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-semibold hover:opacity-90 transition-opacity"
            >
              保存到今日记录
            </button>

            <button
              onClick={() => setAiResult(null)}
              className="w-full mt-3 py-3 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 记录详情弹窗 */}
      {detailRecord && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center pb-20 sm:pb-0"
          onClick={() => setDetailRecord(null)}
        >
          <div 
            className="bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-lg">运动详情</h3>
              <button 
                onClick={() => setDetailRecord(null)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 运动图标和名称 */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-3xl">
                {detailRecord.emoji}
              </div>
              <div>
                <p className="font-bold text-xl">{detailRecord.name}</p>
                <p className="text-gray-400">{detailRecord.time}</p>
              </div>
            </div>

            {/* 核心数据 */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <Flame className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-emerald-400">{detailRecord.calories}</p>
                <p className="text-sm text-gray-400">消耗 (kcal)</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <Clock className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-400">{detailRecord.duration}</p>
                <p className="text-sm text-gray-400">时长 (分钟)</p>
              </div>
            </div>

            {/* Apple Watch 额外数据 */}
            {(detailRecord.activeCalories !== undefined || detailRecord.totalCalories !== undefined || detailRecord.avgHeartRate !== undefined) && (
              <div className="border-t border-white/10 pt-4">
                <p className="text-sm text-gray-400 mb-3">Apple Watch 数据</p>
                <div className="space-y-3">
                  {detailRecord.activeCalories !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-orange-500" />
                        动态千卡
                      </span>
                      <span className="font-semibold text-orange-400">{detailRecord.activeCalories} kcal</span>
                    </div>
                  )}
                  {detailRecord.totalCalories !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-500" />
                        总千卡
                      </span>
                      <span className="font-semibold text-blue-400">{detailRecord.totalCalories} kcal</span>
                    </div>
                  )}
                  {detailRecord.avgHeartRate !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-red-400" />
                        平均心率
                      </span>
                      <span className="font-semibold text-red-400">{detailRecord.avgHeartRate} 次/分</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 关闭按钮 */}
            <button
              onClick={() => setDetailRecord(null)}
              className="w-full mt-6 py-3 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
