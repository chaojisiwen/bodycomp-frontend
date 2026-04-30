import { useState, useRef, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus, Calendar, ChevronRight, User, Scale, Droplets, Bone, Heart, Brain, Flame, Camera, Plus, X, Upload, Pencil, Activity } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useBodyStore, useLatestBodyRecord, useBodyTrend } from '@/stores/bodyStore'
import { TrendChart } from '@/components/ui/TrendChart'
import { recognizeBodyComposition } from '@/cloudbase/services/recognizeApi'
import { useToast } from '@/components/common'
import { CardSkeleton } from '@/components/common/Loading'

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

// 完整的身体指标数据（trend/change 会在组件内根据真实数据动态重算）
const allBodyMetrics: BodyMetric[] = [
  // 核心指标（默认显示）
  { id: 'weight', name: '体重', value: 0, unit: 'kg', normal: '65-75kg', trend: 'stable', change: 0, icon: <Scale className="w-5 h-5" />, isCore: true },
  { id: 'bmi', name: 'BMI', value: 0, unit: '', normal: '18.5-24', trend: 'stable', change: 0, icon: <User className="w-5 h-5" />, isCore: true },
  { id: 'fat', name: '体脂率', value: 0, unit: '%', normal: '15-20%', trend: 'stable', change: 0, icon: <Flame className="w-5 h-5" />, isCore: true },
  { id: 'muscle', name: '肌肉量', value: 0, unit: 'kg', normal: '55-65kg', trend: 'stable', change: 0, icon: <TrendingUp className="w-5 h-5" />, isCore: true },
  // 详细指标
  { id: 'waist', name: '腰围', value: 0, unit: 'cm', normal: '<90cm', trend: 'stable', change: 0, icon: <TrendingDown className="w-5 h-5" /> },
  { id: 'visceral', name: '内脏脂肪', value: 0, unit: '', normal: '1-9', trend: 'stable', change: 0, icon: <Heart className="w-5 h-5" /> },
  { id: 'water', name: '体水分', value: 0, unit: '%', normal: '50-60%', trend: 'stable', change: 0, icon: <Droplets className="w-5 h-5" /> },
  { id: 'bone', name: '骨量', value: 0, unit: 'kg', normal: '2.5-3.5', trend: 'stable', change: 0, icon: <Bone className="w-5 h-5" /> },
  { id: 'metabolism', name: '基础代谢', value: 0, unit: 'kcal', normal: '1600-1800', trend: 'stable', change: 0, icon: <Flame className="w-5 h-5" /> },
  { id: 'protein', name: '蛋白质', value: 0, unit: '%', normal: '16-20%', trend: 'stable', change: 0, icon: <Brain className="w-5 h-5" /> },
  { id: 'bodyage', name: '身体年龄', value: 0, unit: '岁', normal: '<实际年龄', trend: 'stable', change: 0, icon: <User className="w-5 h-5" /> },
  { id: 'subfat', name: '皮下脂肪', value: 0, unit: '%', normal: '9-18%', trend: 'stable', change: 0, icon: <Flame className="w-5 h-5" /> },
  { id: 'fatfree', name: '去脂体重', value: 0, unit: 'kg', normal: '50-60kg', trend: 'stable', change: 0, icon: <TrendingUp className="w-5 h-5" /> },
]

// 手动添加的记录 - 与身体指标一致
interface BodyRecord {
  id: string
  date: string
  weight: number    // 体重 kg
  bmi: number
  fat: number       // 体脂率 %
  muscle: number    // 肌肉量 kg
  waist: number    // 腰围 cm
  visceral: number // 内脏脂肪
  water: number    // 体水分 %
  bone: number     // 骨量 kg
  metabolism: number // 基础代谢 kcal
  protein: number  // 蛋白质 %
  bodyage: number // 身体年龄 岁
  subfat: number  // 皮下脂肪 %
  fatfree: number // 去脂体重 kg
}

export function MyBodyDataPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | '3months'>('month')
  const [showAllMetrics, setShowAllMetrics] = useState(false)
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<Partial<BodyRecord> | null>(null)
  type TrendMetric = 'weight' | 'bodyFat' | 'muscle' | 'bmi' | 'waist' | 'visceral' | 'water' | 'bone' | 'metabolism'
  const [selectedTrendMetrics, setSelectedTrendMetrics] = useState<TrendMetric[]>(['weight', 'bodyFat'])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  const [manualRecord, setManualRecord] = useState({
    weight: '',
    bmi: '',
    fat: '',
    muscle: '',
    waist: '',
    visceral: '',
    water: '',
    bone: '',
    metabolism: '',
    protein: '',
    bodyage: '',
    subfat: '',
    fatfree: '',
  })

  // ── Store 数据 ──
  const storeRecords = useBodyStore((s) => s.records)
  const isLoading = useBodyStore((s) => s.isLoading)
  const storeError = useBodyStore((s) => s.error)
  const fetchRecords = useBodyStore((s) => s.fetchRecords)
  const addRecord = useBodyStore((s) => s.addRecord)
  const latestBody = useLatestBodyRecord()
  const bodyTrend = useBodyTrend(90)

  // ── 挂载时从 API / localStorage 拉取数据 ──
  useEffect(() => { fetchRecords() }, [])

  // ── Store 错误时 Toast 提示 ──
  useEffect(() => {
    if (storeError) {
      toast.error(storeError)
    }
  }, [storeError])

  // ── 辅助：字段映射 (UI id → store field) ──
  const fieldMap: Record<string, string> = {
    weight: 'weight', bmi: 'bmi',
    fat: 'body_fat', muscle: 'muscle_mass',
    waist: 'waist',
    visceral: 'visceral_fat', water: 'water_content',
    bone: 'bone_mass', metabolism: 'basal_metabolism',
    bodyage: 'metabolism_age',
    protein: 'protein_percent', subfat: 'subcutaneous_fat', fatfree: 'fat_free_mass',
  }

  // 从 store 或默认配置获取最新指标值（取1位小数，避免溢出）
  const getLatestMetricValue = (metricId: string): number => {
    if (latestBody) {
      const storeField = fieldMap[metricId] || metricId
      const raw = (latestBody as Record<string, number | undefined>)[storeField]
      if (raw != null) return Math.round(raw * 10) / 10
    }
    return allBodyMetrics.find(m => m.id === metricId)?.value || 0
  }

  // 从 store 派生最近记录（供列表展示）
  const displayRecords: BodyRecord[] = storeRecords
    .slice(0, 20)
    .map((r, i) => ({
      id: r._id || `store-${i}`,
      date: new Date(r.record_date!).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
      weight: Math.round((r.weight ?? 0) * 10) / 10,
      bmi: Math.round((r.bmi ?? 0) * 10) / 10,
      fat: Math.round((r.body_fat ?? 0) * 10) / 10,
      muscle: Math.round((r.muscle_mass ?? 0) * 10) / 10,
      waist: Math.round((r.waist ?? 0) * 10) / 10,
      visceral: Math.round((r.visceral_fat ?? 0) * 10) / 10,
      water: Math.round((r.water_content ?? 0) * 10) / 10,
      bone: Math.round((r.bone_mass ?? 0) * 10) / 10,
      metabolism: r.basal_metabolism ?? 0,
      protein: Math.round(((r as Record<string, number | undefined>).protein_percent ?? 0) * 10) / 10,
      bodyage: r.metabolism_age ?? 0,
      subfat: Math.round(((r as Record<string, number | undefined>).subcutaneous_fat ?? 0) * 10) / 10,
      fatfree: Math.round(((r as Record<string, number | undefined>).fat_free_mass ?? 0) * 10) / 10,
    }))

  // 根据展开状态显示指标（使用最新值 + 动态趋势）
  const displayedMetrics = (showAllMetrics ? allBodyMetrics : allBodyMetrics.filter(m => m.isCore)).map(m => ({
    ...m,
    value: getLatestMetricValue(m.id),
    // 根据最近两条记录动态计算趋势
    ...(bodyTrend.length >= 2 ? (() => {
      const latest = bodyTrend[bodyTrend.length - 1]
      const prev = bodyTrend[bodyTrend.length - 2]
      const latestVal = (latest as Record<string, number | undefined>)?.[fieldMap[m.id] || m.id]
      const prevVal = (prev as Record<string, number | undefined>)?.[fieldMap[m.id] || m.id]
      if (latestVal == null || prevVal == null) return { trend: 'stable' as const, change: 0 }
      const diff = Math.round((Number(latestVal) - Number(prevVal)) * 10) / 10
      const tol = Math.abs(diff) < 0.05
      return { trend: tol ? 'stable' as const : diff > 0 ? 'up' as const : 'down' as const, change: diff }
    })() : { trend: 'stable' as const, change: 0 })
  }))

  // 趋势图数据（支持多指标）
  const trendChartData = bodyTrend.slice(-14).map(r => ({
    date: new Date(r.record_date!).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
    weight: r.weight ?? undefined,
    bodyFat: r.body_fat ?? undefined,
    muscle: r.muscle_mass ?? undefined,
    bmi: r.bmi ?? undefined,
    waist: r.waist ?? undefined,
    visceral: r.visceral_fat ?? undefined,
    water: r.water_content ?? undefined,
    bone: r.bone_mass ?? undefined,
    metabolism: r.basal_metabolism ?? undefined,
  }))

  const toggleTrendMetric = (metric: TrendMetric) => {
    if (selectedTrendMetrics.includes(metric)) {
      if (selectedTrendMetrics.length > 1) {
        setSelectedTrendMetrics(selectedTrendMetrics.filter(m => m !== metric))
      }
    } else {
      if (selectedTrendMetrics.length < 3) {
        setSelectedTrendMetrics([...selectedTrendMetrics, metric])
      }
    }
  }

  // 单个指标编辑弹窗
  const [editingMetric, setEditingMetric] = useState<{ id: string; name: string; value: string; unit: string } | null>(null)

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-emerald-400" />
      case 'down': return <TrendingDown className="w-4 h-4 text-emerald-400" />
      default: return <Minus className="w-4 h-4 text-gray-400" />
    }
  }

  const getTrendColor = (trend: 'up' | 'down' | 'stable', metricId: string) => {
    if (['weight', 'fat', 'bmi', 'visceral', 'subfat', 'bodyage'].includes(metricId)) {
      return trend === 'down' ? 'text-emerald-400' : trend === 'up' ? 'text-red-400' : 'text-gray-400'
    }
    return trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400'
  }

  const periods = [
    { id: 'week', name: '本周' },
    { id: 'month', name: '本月' },
    { id: '3months', name: '近3月' },
  ]

  // 辅助函数：获取指标单位
  const getMetricUnit = (metric: string) => {
    const units: Record<string, string> = {
      weight: 'kg', bodyFat: '%', muscle: 'kg', bmi: '',
      waist: 'cm', visceral: '', water: '%', bone: 'kg',
      metabolism: 'kcal'
    }
    return units[metric] || ''
  }

  // 辅助函数：获取指标对应的字段名（从 bodyTrend 到 latestBody 的映射）
  const getMetricField = (metric: string) => {
    const fields: Record<string, string> = {
      weight: 'weight', bodyFat: 'body_fat', muscle: 'muscle_mass', bmi: 'bmi',
      waist: 'waist', visceral: 'visceral_fat', water: 'water_content', bone: 'bone_mass',
      metabolism: 'basal_metabolism'
    }
    return fields[metric] || metric
  }

  // 处理图片上传
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsAnalyzing(true)
    setShowCameraModal(false)

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

      console.log('[MyBodyData] 开始 AI 识别体成分数据...')

      // 调用 AI 识别
      const result = await recognizeBodyComposition(base64)

      if (result.success && result.data) {
        console.log('[MyBodyData] AI 识别成功:', result.data)
        setAnalysisResult({
          weight: result.data.weight,
          bmi: result.data.bmi,
          fat: result.data.bodyFat,
          muscle: result.data.muscleMass,
          waist: result.data.waist,
          visceral: result.data.visceralFat,
          water: result.data.water,
          bone: result.data.boneMass,
          metabolism: result.data.basalMetabolism,
          protein: result.data.protein,
          bodyage: result.data.bodyAge,
          subfat: result.data.subfat,
          fatfree: result.data.fatFreeMass,
        })
      } else {
        console.error('[MyBodyData] AI 识别失败:', result.error)
        toast.error(result.error || '识别失败，请重试')
      }
    } catch (error) {
      console.error('[MyBodyData] 处理图片失败:', error)
      toast.error('处理图片失败，请重试')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 拍照功能状态
  const [showCameraView, setShowCameraView] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // 启动摄像头
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setShowCameraView(true)
    } catch (error) {
      console.error('[MyBodyData] 无法访问摄像头:', error)
      toast.error('无法访问摄像头，请确保已授权相机权限')
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
    setShowCameraModal(false)

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

      console.log('[MyBodyData] 开始 AI 识别体成分数据...')

      const result = await recognizeBodyComposition(base64)

      if (result.success && result.data) {
        console.log('[MyBodyData] AI 识别成功:', result.data)
        setAnalysisResult({
          weight: result.data.weight,
          bmi: result.data.bmi,
          fat: result.data.bodyFat,
          muscle: result.data.muscleMass,
          waist: result.data.waist,
          visceral: result.data.visceralFat,
          water: result.data.water,
          bone: result.data.boneMass,
          metabolism: result.data.basalMetabolism,
          protein: result.data.protein,
          bodyage: result.data.bodyAge,
          subfat: result.data.subfat,
          fatfree: result.data.fatFreeMass,
        })
      } else {
        console.error('[MyBodyData] AI 识别失败:', result.error)
        toast.error(result.error || '识别失败，请重试')
      }
    } catch (error) {
      console.error('[MyBodyData] 拍照识别失败:', error)
      toast.error('拍照识别失败，请重试')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 保存分析结果 → 写入 store
  const saveAnalysisResult = () => {
    if (!analysisResult) return
    addRecord({
      user_id: 'local-user',
      record_date: new Date(),
      weight: analysisResult.weight ?? undefined,
      bmi: analysisResult.bmi ?? undefined,
      body_fat: analysisResult.fat ?? undefined,
      muscle_mass: analysisResult.muscle ?? undefined,
      waist: analysisResult.waist ?? undefined,
      visceral_fat: analysisResult.visceral ?? undefined,
      water_content: analysisResult.water ?? undefined,
      bone_mass: analysisResult.bone ?? undefined,
      basal_metabolism: analysisResult.metabolism ?? undefined,
      metabolism_age: analysisResult.bodyage ?? undefined,
      notes: 'AI拍照识别',
    })
    setAnalysisResult(null)
  }

  // 保存单个指标编辑 → 写入 store
  const saveMetricEdit = () => {
    if (!editingMetric) return
    addRecord({
      user_id: 'local-user',
      record_date: new Date(),
      weight: editingMetric.id === 'weight' ? parseFloat(editingMetric.value) || undefined : latestBody?.weight,
      bmi: editingMetric.id === 'bmi' ? parseFloat(editingMetric.value) || undefined : latestBody?.bmi,
      body_fat: editingMetric.id === 'fat' ? parseFloat(editingMetric.value) || undefined : latestBody?.body_fat,
      muscle_mass: editingMetric.id === 'muscle' ? parseFloat(editingMetric.value) || undefined : latestBody?.muscle_mass,
      waist: editingMetric.id === 'waist' ? parseFloat(editingMetric.value) || undefined : latestBody?.waist,
      visceral_fat: editingMetric.id === 'visceral' ? parseFloat(editingMetric.value) || undefined : latestBody?.visceral_fat,
      water_content: editingMetric.id === 'water' ? parseFloat(editingMetric.value) || undefined : latestBody?.water_content,
      bone_mass: editingMetric.id === 'bone' ? parseFloat(editingMetric.value) || undefined : latestBody?.bone_mass,
      basal_metabolism: editingMetric.id === 'metabolism' ? parseFloat(editingMetric.value) || undefined : latestBody?.basal_metabolism,
      metabolism_age: editingMetric.id === 'bodyage' ? parseFloat(editingMetric.value) || undefined : latestBody?.metabolism_age,
    })
    setEditingMetric(null)
  }

  // 检查是否至少填写了一个指标
  const hasAtLeastOneMetric = Object.values(manualRecord).some(v => v !== '')

  // 保存手动记录 → 写入 store
  const saveManualRecord = () => {
    if (!hasAtLeastOneMetric) return
    addRecord({
      user_id: 'local-user',
      record_date: new Date(),
      weight: parseFloat(manualRecord.weight) || undefined,
      bmi: parseFloat(manualRecord.bmi) || undefined,
      body_fat: parseFloat(manualRecord.fat) || undefined,
      muscle_mass: parseFloat(manualRecord.muscle) || undefined,
      waist: parseFloat(manualRecord.waist) || undefined,
      visceral_fat: parseFloat(manualRecord.visceral) || undefined,
      water_content: parseFloat(manualRecord.water) || undefined,
      bone_mass: parseFloat(manualRecord.bone) || undefined,
      basal_metabolism: parseFloat(manualRecord.metabolism) || undefined,
      metabolism_age: parseFloat(manualRecord.bodyage) || undefined,
      protein_percent: parseFloat(manualRecord.protein) || undefined,
      subcutaneous_fat: parseFloat(manualRecord.subfat) || undefined,
      fat_free_mass: parseFloat(manualRecord.fatfree) || undefined,
    })
    setManualRecord({ weight: '', bmi: '', fat: '', muscle: '', waist: '', visceral: '', water: '', bone: '', metabolism: '', protein: '', bodyage: '', subfat: '', fatfree: '' })
    setShowAddModal(false)
  }

  return (
    <div className="space-y-4 pb-24">
      {/* 操作入口卡片 */}
      <div className="grid grid-cols-2 gap-3">
        {/* AI拍照识别 */}
        <Card className="p-4">
          <button
            onClick={() => setShowCameraModal(true)}
            className="w-full flex flex-col items-center gap-2"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-medium">AI拍照识别</span>
            <span className="text-xs text-gray-400">拍照/导入图片</span>
          </button>
        </Card>

        {/* 手动添加 */}
        <Card className="p-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full flex flex-col items-center gap-2"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-medium">手动添加</span>
            <span className="text-xs text-gray-400">输入数据记录</span>
          </button>
        </Card>
      </div>

      {/* 身体指标卡片 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">身体指标</h3>
          <button 
            onClick={() => setShowAllMetrics(!showAllMetrics)}
            className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
          >
            {showAllMetrics ? '收起' : '查看全部'} <ChevronRight className={`w-4 h-4 transition-transform ${showAllMetrics ? 'rotate-90' : ''}`} />
          </button>
        </div>
        
        {/* 指标网格 */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
          {displayedMetrics.map((metric) => (
            <Card 
              key={metric.id} 
              className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => setEditingMetric({ id: metric.id, name: metric.name, value: String(getLatestMetricValue(metric.id)), unit: metric.unit })}
            >
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                {metric.icon}
                <span className="text-sm">{metric.name}</span>
                <Pencil className="w-3 h-3 ml-auto text-gray-500" />
              </div>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-2xl font-bold">{getLatestMetricValue(metric.id)}</span>
                <span className="text-sm text-gray-400 mb-1">{metric.unit}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">正常 {metric.normal}</span>
                <div className="flex items-center gap-1">
                  {getTrendIcon(metric.trend)}
                  <span className={`text-xs ${getTrendColor(metric.trend, metric.id)}`}>
                    {metric.change > 0 ? '+' : ''}{metric.change}
                  </span>
                </div>
              </div>
            </Card>
          ))}
          </div>
        )}
      </div>

      {/* 趋势图表区域 - 多指标对比 */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            身体数据趋势
          </h3>
          <div className="flex gap-1 bg-white/5 rounded-lg p-1">
            {periods.map(period => (
              <button
                key={period.id}
                onClick={() => setSelectedPeriod(period.id as typeof selectedPeriod)}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  selectedPeriod === period.id
                    ? 'bg-emerald-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {period.name}
              </button>
            ))}
          </div>
        </div>

        {/* 指标选择器 */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {([
            { id: 'weight', name: '体重', unit: 'kg' },
            { id: 'bodyFat', name: '体脂率', unit: '%' },
            { id: 'muscle', name: '肌肉量', unit: 'kg' },
            { id: 'bmi', name: 'BMI', unit: '' },
            { id: 'waist', name: '腰围', unit: 'cm' },
            { id: 'visceral', name: '内脏脂肪', unit: '' },
            { id: 'water', name: '体水分', unit: '%' },
            { id: 'bone', name: '骨量', unit: 'kg' },
            { id: 'metabolism', name: '基础代谢', unit: 'kcal' },
          ] as const).map(metric => (
            <button
              key={metric.id}
              onClick={() => toggleTrendMetric(metric.id as TrendMetric)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedTrendMetrics.includes(metric.id as TrendMetric)
                  ? 'bg-emerald-500/30 text-emerald-400 border border-emerald-500/50'
                  : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
              }`}
            >
              {metric.name}
            </button>
          ))}
        </div>

        {/* 多指标趋势图 */}
        {trendChartData.length >= 2 ? (
          <TrendChart
            data={trendChartData}
            metrics={selectedTrendMetrics}
            height={180}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500">
            <TrendingUp className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">记录至少2次数据后即可查看趋势图</p>
          </div>
        )}

        {/* 统计信息 */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/10">
          {/* 起始 */}
          <div className="text-center">
            <p className="text-xs text-gray-400">起始</p>
            <p className="font-semibold">
              {bodyTrend.length > 0 && selectedTrendMetrics.length > 0
                ? (() => {
                    const val = (bodyTrend[0] as Record<string, number | undefined>)?.[getMetricField(selectedTrendMetrics[0])]
                    const unit = getMetricUnit(selectedTrendMetrics[0])
                    return val != null ? `${Math.round(val * 10) / 10}${unit}` : '--'
                  })()
                : '--'}
            </p>
          </div>
          {/* 当前 */}
          <div className="text-center">
            <p className="text-xs text-gray-400">当前</p>
            <p className="font-semibold text-emerald-400">
              {selectedTrendMetrics.length > 0
                ? (() => {
                    const val = (latestBody as Record<string, number | undefined>)?.[getMetricField(selectedTrendMetrics[0])]
                    const unit = getMetricUnit(selectedTrendMetrics[0])
                    return val != null ? `${Math.round(val * 10) / 10}${unit}` : '--'
                  })()
                : '--'}
            </p>
          </div>
          {/* 变化 */}
          <div className="text-center">
            <p className="text-xs text-gray-400">变化</p>
            <p className="font-semibold text-emerald-400">
              {bodyTrend.length > 0 && selectedTrendMetrics.length > 0 && latestBody
                ? (() => {
                    const current = (latestBody as Record<string, number | undefined>)?.[getMetricField(selectedTrendMetrics[0])] ?? 0
                    const start = (bodyTrend[0] as Record<string, number | undefined>)?.[getMetricField(selectedTrendMetrics[0])] ?? 0
                    const diff = current - start
                    const unit = getMetricUnit(selectedTrendMetrics[0])
                    return `${diff > 0 ? '+' : ''}${Math.round(diff * 10) / 10}${unit}`
                  })()
                : '--'}
            </p>
          </div>
        </div>
      </Card>

      {/* 历史记录 */}
      <div>
        <h3 className="font-semibold mb-3">近期记录</h3>
        <Card className="p-0 divide-y divide-white/5">
          {displayRecords.map((record) => {
            // 动态获取有值的字段
            const metricLabels: Record<string, string> = {
              weight: '体重', bmi: 'BMI', fat: '体脂率', muscle: '肌肉量',
              waist: '腰围', visceral: '内脏脂肪', water: '体水分',
              bone: '骨量', metabolism: '基础代谢', protein: '蛋白质',
              bodyage: '身体年龄', subfat: '皮下脂肪', fatfree: '去脂体重'
            }
            const metricUnits: Record<string, string> = {
              weight: 'kg', bmi: '', fat: '%', muscle: 'kg',
              waist: 'cm', visceral: '', water: '%', bone: 'kg',
              metabolism: 'kcal', protein: '%', bodyage: '岁', subfat: '%', fatfree: 'kg'
            }
            // 只保留有值的字段
            const filledMetrics = Object.entries(record)
              .filter(([key, value]) => key !== 'id' && key !== 'date' && value !== 0 && value !== undefined && value !== null)
              .map(([key, value]) => ({
                key,
                value: Math.round(Number(value) * 10) / 10,
                label: metricLabels[key] || key,
                unit: metricUnits[key] || ''
              }))

            return (
              <div key={record.id} className="p-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-300">{record.date}</span>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  {filledMetrics.map(m => (
                    <span key={m.key} className="text-gray-300">
                      {m.label} <span className="font-medium text-white">{m.value}</span>{m.unit}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
          {displayRecords.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              暂无记录
            </div>
          )}
        </Card>
      </div>

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

      {/* AI拍照识别弹窗 */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end pb-[144px]">
          <div className="w-full bg-gray-900 rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-6" />
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">AI拍照识别</h3>
              <button onClick={() => setShowCameraModal(false)} className="text-gray-400">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <p className="text-gray-400 text-sm mb-4">
              拍摄或上传体成分检测仪/智能秤的屏幕照片，AI将自动识别并提取数据
            </p>

            {/* 隐藏的文件输入 */}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageUpload}
              className="hidden"
            />

            <div className="grid grid-cols-2 gap-4">
              {/* 拍照 */}
              <button
                onClick={startCamera}
                className="flex flex-col items-center gap-3 p-6 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="w-16 h-16 rounded-full bg-purple-500/30 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-purple-400" />
                </div>
                <span className="font-medium">拍照识别</span>
                <span className="text-xs text-gray-400">使用相机拍摄</span>
              </button>

              {/* 从相册选择 */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-3 p-6 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="w-16 h-16 rounded-full bg-pink-500/30 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-pink-400" />
                </div>
                <span className="font-medium">相册导入</span>
                <span className="text-xs text-gray-400">选择已有图片</span>
              </button>
            </div>

            <button
              onClick={() => setShowCameraModal(false)}
              className="w-full mt-4 py-3 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 手动添加弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end pb-[144px]">
          <div className="w-full bg-gray-900 rounded-t-3xl p-6 max-h-[85vh] flex flex-col">
            <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-6 flex-shrink-0" />
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <h3 className="text-lg font-semibold">手动添加记录</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 min-h-0 mb-6">
              {/* 体重 */}
              <div>
                <label className="text-sm text-gray-400 block mb-2">体重 (kg) *</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="如：72.5"
                  value={manualRecord.weight}
                  onChange={(e) => setManualRecord({ ...manualRecord, weight: e.target.value })}
                  className="w-full bg-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* BMI */}
              <div>
                <label className="text-sm text-gray-400 block mb-2">BMI</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="如：22.4"
                  value={manualRecord.bmi}
                  onChange={(e) => setManualRecord({ ...manualRecord, bmi: e.target.value })}
                  className="w-full bg-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* 体脂率 */}
              <div>
                <label className="text-sm text-gray-400 block mb-2">体脂率 (%)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="如：18.5"
                  value={manualRecord.fat}
                  onChange={(e) => setManualRecord({ ...manualRecord, fat: e.target.value })}
                  className="w-full bg-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* 肌肉量 */}
              <div>
                <label className="text-sm text-gray-400 block mb-2">肌肉量 (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="如：58.2"
                  value={manualRecord.muscle}
                  onChange={(e) => setManualRecord({ ...manualRecord, muscle: e.target.value })}
                  className="w-full bg-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* 腰围 */}
              <div>
                <label className="text-sm text-gray-400 block mb-2">腰围 (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="如：82"
                  value={manualRecord.waist}
                  onChange={(e) => setManualRecord({ ...manualRecord, waist: e.target.value })}
                  className="w-full bg-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* 内脏脂肪 */}
              <div>
                <label className="text-sm text-gray-400 block mb-2">内脏脂肪</label>
                <input
                  type="number"
                  placeholder="如：8"
                  value={manualRecord.visceral}
                  onChange={(e) => setManualRecord({ ...manualRecord, visceral: e.target.value })}
                  className="w-full bg-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* 体水分 */}
              <div>
                <label className="text-sm text-gray-400 block mb-2">体水分 (%)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="如：55.2"
                  value={manualRecord.water}
                  onChange={(e) => setManualRecord({ ...manualRecord, water: e.target.value })}
                  className="w-full bg-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* 骨量 */}
              <div>
                <label className="text-sm text-gray-400 block mb-2">骨量 (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="如：2.8"
                  value={manualRecord.bone}
                  onChange={(e) => setManualRecord({ ...manualRecord, bone: e.target.value })}
                  className="w-full bg-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* 基础代谢 */}
              <div>
                <label className="text-sm text-gray-400 block mb-2">基础代谢 (kcal)</label>
                <input
                  type="number"
                  placeholder="如：1680"
                  value={manualRecord.metabolism}
                  onChange={(e) => setManualRecord({ ...manualRecord, metabolism: e.target.value })}
                  className="w-full bg-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* 蛋白质 */}
              <div>
                <label className="text-sm text-gray-400 block mb-2">蛋白质 (%)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="如：17.2"
                  value={manualRecord.protein}
                  onChange={(e) => setManualRecord({ ...manualRecord, protein: e.target.value })}
                  className="w-full bg-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* 身体年龄 */}
              <div>
                <label className="text-sm text-gray-400 block mb-2">身体年龄 (岁)</label>
                <input
                  type="number"
                  placeholder="如：28"
                  value={manualRecord.bodyage}
                  onChange={(e) => setManualRecord({ ...manualRecord, bodyage: e.target.value })}
                  className="w-full bg-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* 皮下脂肪 */}
              <div>
                <label className="text-sm text-gray-400 block mb-2">皮下脂肪 (%)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="如：12.5"
                  value={manualRecord.subfat}
                  onChange={(e) => setManualRecord({ ...manualRecord, subfat: e.target.value })}
                  className="w-full bg-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* 去脂体重 */}
              <div>
                <label className="text-sm text-gray-400 block mb-2">去脂体重 (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="如：54.2"
                  value={manualRecord.fatfree}
                  onChange={(e) => setManualRecord({ ...manualRecord, fatfree: e.target.value })}
                  className="w-full bg-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex-shrink-0 pt-4 pb-4 border-t border-white/10 -mx-6 px-6 bg-gray-900">
              <button
                onClick={saveManualRecord}
                disabled={!hasAtLeastOneMetric}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存记录
              </button>

              <button
                onClick={() => setShowAddModal(false)}
                className="w-full mt-3 py-3 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI分析加载中 */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-gray-900 rounded-2xl p-8 text-center max-w-xs mx-4">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin mx-auto mb-4" />
            <h3 className="font-semibold mb-2">AI正在分析...</h3>
            <p className="text-sm text-gray-400">请稍候，正在识别体成分数据</p>
          </div>
        </div>
      )}

      {/* AI分析结果 */}
      {analysisResult && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end pb-[144px]">
          <div className="w-full bg-gray-900 rounded-t-3xl p-6 max-h-[85vh] flex flex-col">
            <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-6 flex-shrink-0" />
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <h3 className="text-lg font-semibold">识别结果</h3>
              <button onClick={() => setAnalysisResult(null)} className="text-gray-400">
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-sm text-gray-400 mb-4 flex-shrink-0">AI已识别出以下体成分数据，请确认是否保存：</p>

            <div className="grid grid-cols-2 gap-3 overflow-y-auto flex-1 min-h-0 mb-6">
              {analysisResult.weight && (
                <Card className="p-4">
                  <div className="text-sm text-gray-400 mb-1">体重</div>
                  <div className="text-2xl font-bold">{analysisResult.weight} <span className="text-sm font-normal text-gray-400">kg</span></div>
                </Card>
              )}
              {analysisResult.bmi && (
                <Card className="p-4">
                  <div className="text-sm text-gray-400 mb-1">BMI</div>
                  <div className="text-2xl font-bold">{analysisResult.bmi}</div>
                </Card>
              )}
              {analysisResult.fat && (
                <Card className="p-4">
                  <div className="text-sm text-gray-400 mb-1">体脂率</div>
                  <div className="text-2xl font-bold">{analysisResult.fat} <span className="text-sm font-normal text-gray-400">%</span></div>
                </Card>
              )}
              {analysisResult.muscle && (
                <Card className="p-4">
                  <div className="text-sm text-gray-400 mb-1">肌肉量</div>
                  <div className="text-2xl font-bold">{analysisResult.muscle} <span className="text-sm font-normal text-gray-400">kg</span></div>
                </Card>
              )}
              {analysisResult.visceral !== undefined && (
                <Card className="p-4">
                  <div className="text-sm text-gray-400 mb-1">内脏脂肪</div>
                  <div className="text-2xl font-bold">{analysisResult.visceral}</div>
                </Card>
              )}
              {analysisResult.water && (
                <Card className="p-4">
                  <div className="text-sm text-gray-400 mb-1">体水分</div>
                  <div className="text-2xl font-bold">{analysisResult.water} <span className="text-sm font-normal text-gray-400">%</span></div>
                </Card>
              )}
              {analysisResult.bone !== undefined && (
                <Card className="p-4">
                  <div className="text-sm text-gray-400 mb-1">骨量</div>
                  <div className="text-2xl font-bold">{analysisResult.bone} <span className="text-sm font-normal text-gray-400">kg</span></div>
                </Card>
              )}
              {analysisResult.metabolism !== undefined && (
                <Card className="p-4">
                  <div className="text-sm text-gray-400 mb-1">基础代谢</div>
                  <div className="text-2xl font-bold">{analysisResult.metabolism} <span className="text-sm font-normal text-gray-400">kcal</span></div>
                </Card>
              )}
              {analysisResult.protein !== undefined && (
                <Card className="p-4">
                  <div className="text-sm text-gray-400 mb-1">蛋白质</div>
                  <div className="text-2xl font-bold">{analysisResult.protein} <span className="text-sm font-normal text-gray-400">%</span></div>
                </Card>
              )}
              {analysisResult.bodyage !== undefined && (
                <Card className="p-4">
                  <div className="text-sm text-gray-400 mb-1">身体年龄</div>
                  <div className="text-2xl font-bold">{analysisResult.bodyage} <span className="text-sm font-normal text-gray-400">岁</span></div>
                </Card>
              )}
              {analysisResult.subfat !== undefined && (
                <Card className="p-4">
                  <div className="text-sm text-gray-400 mb-1">皮下脂肪</div>
                  <div className="text-2xl font-bold">{analysisResult.subfat} <span className="text-sm font-normal text-gray-400">%</span></div>
                </Card>
              )}
              {analysisResult.fatfree !== undefined && (
                <Card className="p-4">
                  <div className="text-sm text-gray-400 mb-1">去脂体重</div>
                  <div className="text-2xl font-bold">{analysisResult.fatfree} <span className="text-sm font-normal text-gray-400">kg</span></div>
                </Card>
              )}
            </div>

            <div className="flex-shrink-0 pt-4 border-t border-white/10 -mx-6 px-6 bg-gray-900">
              <button
                onClick={saveAnalysisResult}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-semibold hover:opacity-90 transition-opacity"
              >
                保存到今日记录
              </button>

              <button
                onClick={() => setAnalysisResult(null)}
                className="w-full mt-3 py-3 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 单个指标编辑弹窗 */}
      {editingMetric && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end pb-[144px]">
          <div className="w-full bg-gray-900 rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-6" />
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">编辑{editingMetric.name}</h3>
              <button onClick={() => setEditingMetric(null)} className="text-gray-400">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <label className="text-sm text-gray-400 block mb-2">
                {editingMetric.name} {editingMetric.unit && `(${editingMetric.unit})`}
              </label>
              <input
                type="number"
                step="0.1"
                placeholder={`请输入${editingMetric.name}`}
                value={editingMetric.value}
                onChange={(e) => setEditingMetric({ ...editingMetric, value: e.target.value })}
                className="w-full bg-white/10 rounded-xl py-4 px-4 text-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
            </div>

            <div className="space-y-3">
              <button
                onClick={saveMetricEdit}
                disabled={!editingMetric.value}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存修改
              </button>

              <button
                onClick={() => setEditingMetric(null)}
                className="w-full py-3 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
