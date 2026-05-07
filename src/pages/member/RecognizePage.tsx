import { useState, useRef, useCallback } from 'react'
import { Camera, RotateCcw, Check, Loader2, AlertCircle, X, Scale, ChevronRight } from 'lucide-react'
import { useRecognizeStore, type RecognizedFoodItem, type RecognizeAnalysis } from '@/stores'
import { useMealStore } from '@/stores/mealStore'
import { useProfileStore } from '@/stores/profileStore'
import { recognizeFood, calculateTotalNutrition, calibrateFist } from '@/cloudbase/services/recognize'
import type { IFoodItem } from '@/cloudbase/types'

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
type Step = 'idle' | 'camera' | 'preview' | 'recognizing' | 'result' | 'error'
type CalibrateStep = 'intro' | 'topdown' | 'topdown_preview' | 'sideview' | 'sideview_preview' | 'processing' | 'done'

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
}

export function RecognizePage() {
  const [step, setStep] = useState<Step>('idle')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const { setCurrentResult, clearCurrentResult, history } = useRecognizeStore()
  const { addMeal } = useMealStore()
  const { profile } = useProfileStore()
  // 直接从 store 读取 fistCalibration，避免闭包陷阱
  const fistCalibration = profile.fistCalibration
  const setFistCalibration = useProfileStore((s) => s.setFistCalibration)
  const [recognizedFoods, setRecognizedFoods] = useState<RecognizedFoodItem[]>([])
  const [recognizedAnalysis, setRecognizedAnalysis] = useState<RecognizeAnalysis | null>(null)
  const [isMockData, setIsMockData] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // 拳头校准相关
  const [showCalibration, setShowCalibration] = useState(false)
  const [calibrateStep, setCalibrateStep] = useState<CalibrateStep>('intro')
  const [fistTopDown, setFistTopDown] = useState<string | null>(null)
  const [fistSideView, setFistSideView] = useState<string | null>(null)
  const fistFileInputRef = useRef<HTMLInputElement>(null)
  const [fistFileTarget, setFistFileTarget] = useState<'topdown' | 'sideview'>('topdown')

  // 餐次选择弹窗
  const [showMealPicker, setShowMealPicker] = useState(false)
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast')

  const handleSelectImage = () => {
    fileInputRef.current?.click()
  }

  const handleCameraCapture = () => {
    cameraInputRef.current?.click()
  }

  // 验证图片是否能被浏览器加载
  const checkImageLoadable = (dataUrl: string): Promise<{ valid: boolean }> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        console.log('[RecognizePage] 图片可被浏览器加载，尺寸:', img.width, 'x', img.height)
        resolve({ valid: true })
      }
      img.onerror = () => {
        console.log('[RecognizePage] 浏览器不支持此图片格式（可能是 HEIC）')
        resolve({ valid: false })
      }
      img.src = dataUrl
    })
  }

  // 将图片转换为标准 JPEG
  const convertToJpeg = (dataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('无法创建 canvas'))
          return
        }
        ctx.drawImage(img, 0, 0)
        const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.85)
        resolve(jpegDataUrl)
      }
      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = dataUrl
    })
  }

  // 将 HEIC/HEIF 格式转换为 JPEG base64（使用懒加载的重型库）
  const convertHeicToJpeg = useCallback(async (file: File): Promise<string> => {
    console.log('[RecognizePage] 检测到 HEIC/HEIF 格式，开始转换...')
    const { convertHeicToJpeg: heicConvert } = await import('@/utils/heicConvert')
    return heicConvert(file)
  }, [])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 检查文件大小（限制 10MB）
    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过 10MB')
      return
    }

    console.log('[RecognizePage] 读取图片:', file.name, file.type, file.size)

    // 检测是否为 HEIC/HEIF 格式
    const isHeic = file.type === 'image/heic' || 
                   file.type === 'image/heif' || 
                   file.name.toLowerCase().endsWith('.heic') ||
                   file.name.toLowerCase().endsWith('.heif')

    if (isHeic) {
      // 使用 heic2any 转换
      try {
        const jpegUrl = await convertHeicToJpeg(file)
        console.log('[RecognizePage] HEIC 转换成功，长度:', jpegUrl.length)
        
        // 验证转换后的图片是否能被浏览器加载
        const loadable = await checkImageLoadable(jpegUrl)
        if (!loadable.valid) {
          console.error('[RecognizePage] 转换后的图片无法被浏览器加载')
          alert('图片格式转换失败，请尝试其他照片')
          return
        }
        
        console.log('[RecognizePage] 图片验证通过，可以显示')
        setSelectedImage(jpegUrl)
        setStep('preview')
        return
      } catch (err) {
        console.error('[RecognizePage] HEIC 转换失败:', err)
        // HEIC 转换失败时，不继续使用原始文件（浏览器无法显示）
        alert('您的照片格式暂不支持，请尝试保存为 JPG 格式后重试')
        return
      }
    }

    // 普通图片处理
    const reader = new FileReader()
    
    reader.onload = async (e) => {
      const result = e.target?.result as string
      if (!result || !result.startsWith('data:image/')) {
        alert('图片读取失败，请尝试其他图片')
        return
      }
      
      console.log('[RecognizePage] 图片已读取，长度:', result.length)
      
      // 检查图片是否能被浏览器加载
      const loadable = await checkImageLoadable(result)
      
      if (loadable.valid) {
        setSelectedImage(result)
        setStep('preview')
      } else {
        // 尝试 Canvas 转换
        try {
          const jpegDataUrl = await convertToJpeg(result)
          console.log('[RecognizePage] Canvas 转换成功')
          setSelectedImage(jpegDataUrl)
          setStep('preview')
        } catch (err) {
          console.error('[RecognizePage] 转换失败，但仍保存原始数据')
          setSelectedImage(result)
          setStep('preview')
        }
      }
    }
    reader.onerror = () => {
      alert('图片读取失败，请尝试其他图片')
    }
    reader.readAsDataURL(file)
  }

  const handleRecognize = async () => {
    // 保存图片引用，避免闭包问题
    const currentImage = selectedImage
    
    setStep('recognizing')
    setErrorMessage('')

    try {
      // 提取 Base64（不含 data:image/... 前缀）
      let imageBase64: string | undefined
      if (currentImage) {
        const match = currentImage.match(/^data:image\/\w+;base64,(.+)$/)
        imageBase64 = match ? match[1] : undefined
      }

      const result = await recognizeFood(imageBase64, currentImage || undefined, fistCalibration)
      console.log('[RecognizePage] API 结果:', JSON.stringify(result))
      console.log('[RecognizePage] 当前图片:', currentImage ? `base64 (${currentImage.length} chars)` : '无')

      if (!result.success) {
        setErrorMessage(result.error || '识别失败，请重试')
        setStep('error')
        return
      }

      setRecognizedFoods(result.foods)
      setRecognizedAnalysis(result.analysis || null)
      setIsMockData(result.isMock || false)

      // 持久化到 store，同时保存图片和分析报告
      setCurrentResult(result.foods, currentImage || undefined, result.analysis)
      setStep('result')
    } catch (err) {
      console.error('[RecognizePage] 识别失败:', err)
      setErrorMessage('网络错误，请检查网络连接后重试')
      setStep('error')
    }
  }

  // ── 拳头校准 ──────────────────────────────────────────────
  const handleOpenFistCalibration = () => {
    setShowCalibration(true)
    setCalibrateStep('intro')
    setFistTopDown(null)
    setFistSideView(null)
  }

  const handleFistFileSelect = () => {
    fistFileInputRef.current?.click()
  }

  const handleFistFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过 10MB')
      return
    }

    // HEIC 转换
    const isHeic = file.type === 'image/heic' || file.type === 'image/heif' ||
                   file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')

    let dataUrl: string

    if (isHeic) {
      try {
        const { convertHeicToJpeg: heicConvert } = await import('@/utils/heicConvert')
        dataUrl = await heicConvert(file)
      } catch {
        alert('图片格式转换失败，请保存为 JPG 后重试')
        return
      }
    } else {
      dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (ev) => resolve(ev.target?.result as string)
        reader.onerror = () => reject(new Error('读取失败'))
        reader.readAsDataURL(file)
      })
    }

    if (fistFileTarget === 'topdown') {
      setFistTopDown(dataUrl)
      setCalibrateStep('topdown_preview') // 跳转到俯瞰图预览确认页
    } else {
      setFistSideView(dataUrl)
      setCalibrateStep('sideview_preview') // 跳转到侧面图预览确认页
    }

    if (fistFileInputRef.current) fistFileInputRef.current.value = ''
  }

  const doFistCalibration = async (sideViewDataUrl: string, topDownDataUrl: string | null) => {
    console.log('[FistCalibrate] 开始校准...')
    console.log('[FistCalibrate] topDownDataUrl:', topDownDataUrl ? '已提供' : '为空')
    console.log('[FistCalibrate] sideViewDataUrl:', sideViewDataUrl ? '已提供' : '为空')

    if (!topDownDataUrl) {
      console.error('[FistCalibrate] 俯瞰图数据丢失，请重新校准')
      alert('俯瞰图数据丢失，请重新开始校准')
      setFistTopDown(null)
      setFistSideView(null)
      setCalibrateStep('intro')
      return
    }
    const topBase64 = topDownDataUrl.match(/^data:image\/\w+;base64,(.+)$/)?.[1] || ''
    const sideBase64 = sideViewDataUrl.match(/^data:image\/\w+;base64,(.+)$/)?.[1] || ''

    console.log('[FistCalibrate] 调用 calibrateFist API...')
    const result = await calibrateFist(topBase64, sideBase64)
    console.log('[FistCalibrate] API 返回:', JSON.stringify(result))

    if (result.success && result.data) {
      console.log('[FistCalibrate] 校准成功!')
      setFistCalibration({
        calibratedAt: result.data.calibratedAt,
        volumeMl: result.data.volumeMl,
        widthMm: result.data.widthMm,
        depthMm: result.data.depthMm,
        heightMm: result.data.heightMm,
        confidence: result.data.confidence,
      })
      setCalibrateStep('done')
    } else {
      console.error('[FistCalibrate] 校准失败:', result.error)
      // 失败时保留两张照片，回到预览确认页（不跳回侧拍页，避免无限循环）
      // 同时把错误信息写入全局状态供 UI 显示
      alert('校准失败：' + (result.error || '请检查网络后重试'))
      setCalibrateStep('sideview_preview')
    }
  }

  // ── 重置 ──────────────────────────────────────────────────
  const handleReset = () => {
    setStep('idle')
    setSelectedImage(null)
    setRecognizedFoods([])
    setRecognizedAnalysis(null)
    setIsMockData(false)
    setErrorMessage('')
    clearCurrentResult()
    if (fileInputRef.current) {
      (fileInputRef.current as HTMLInputElement).value = ''
    }
    if (cameraInputRef.current) {
      (cameraInputRef.current as HTMLInputElement).value = ''
    }
  }

  const handleAddToIntake = () => {
    setShowMealPicker(true)
  }

  // 确认添加到饮食记录
  const confirmAddToIntake = () => {
    // 将 RecognizedFoodItem[] 转换为 IFoodItem[]
    const foods: IFoodItem[] = recognizedFoods.map((f) => ({
      name: f.name,
      amount: f.weight, // 单位：克
      calories: f.calories,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
    }))

    const totals = calculateTotalNutrition(recognizedFoods)

    // 写入 mealStore（同时保存识别时的照片）
    addMeal({
      user_id: profile.memberId || 'unknown',
      meal_type: selectedMealType,
      meal_date: new Date(),
      foods,
      total_calories: totals.calories,
      total_protein: totals.protein,
      total_carbs: totals.carbs,
      total_fat: totals.fat,
      image_url: selectedImage || undefined,
    })

    // 标记识别历史为已添加
    const latestRecord = history[0]
    if (latestRecord) {
      useRecognizeStore.getState().markAsAdded(latestRecord.id)
    }

    setShowMealPicker(false)
    handleReset()
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="text-center py-4">
        <h2 className="text-xl font-bold mb-2">拍照识别</h2>
        <p className="text-sm text-gray-400">
          拍一张食物照片，AI自动识别热量
        </p>
      </div>

      {/* 拳头校准状态提示 */}
      {fistCalibration ? (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-300">已校准拳头参照物</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-500/70">{fistCalibration.volumeMl}ml</span>
            <button onClick={handleOpenFistCalibration} className="text-xs text-amber-400 underline">重新校准</button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleOpenFistCalibration}
          className="w-full bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex items-center justify-between hover:bg-amber-500/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-amber-300">校准拳头参照物（提升份量精度）</span>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-400" />
        </button>
      )}

      {/* 隐藏的文件输入 - 选择照片（无 capture，可访问相册） */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      {/* 隐藏的文件输入 - 拍照（有 capture，启动相机） */}
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />
      {/* 拳头校准文件输入 */}
      <input
        type="file"
        ref={fistFileInputRef}
        onChange={handleFistFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* 相机/预览区域 */}
      <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl overflow-hidden aspect-square flex items-center justify-center">
        {/* 空闲状态 */}
        {step === 'idle' && (
          <div className="text-center p-8">
            <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <Camera className="w-12 h-12 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">拍摄食物照片</h3>
            <p className="text-sm text-gray-400 mb-6">
              将食物放在光线充足的环境下拍摄，可获得更准确的识别结果
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCameraCapture}
                className="flex-1 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-semibold hover:opacity-90 transition-opacity"
              >
                拍照
              </button>
              <button
                onClick={handleSelectImage}
                className="flex-1 py-3 rounded-full bg-white/10 text-gray-300 font-medium hover:bg-white/20 transition-colors"
              >
                选择照片
              </button>
            </div>
          </div>
        )}

        {/* 预览状态 */}
        {step === 'preview' && selectedImage && (
          <div className="w-full h-full relative">
            <img
              src={selectedImage}
              alt="预览"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Camera className="w-8 h-8" />
                </div>
                <p className="font-medium">照片已选定</p>
              </div>
            </div>
          </div>
        )}

        {/* 识别中状态 */}
        {step === 'recognizing' && (
          <div className="text-center p-8">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
            </div>
            <h3 className="text-lg font-semibold mb-2">AI 正在识别中...</h3>
            <p className="text-sm text-gray-400">
              请稍候，识别结果马上出来
            </p>
            {selectedImage && (
              <img
                src={selectedImage}
                alt="识别中"
                className="mt-6 w-32 h-32 object-cover rounded-xl mx-auto opacity-50"
              />
            )}
          </div>
        )}

        {/* 结果状态 */}
        {step === 'result' && (
          <div className="w-full h-full flex flex-col">
            {selectedImage && (
              <div className="h-[35%] relative">
                <img
                  src={selectedImage}
                  alt="结果"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 flex gap-2">
                  <div className="px-3 py-1 rounded-full bg-emerald-500 text-white text-sm flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    识别完成
                  </div>
                  {isMockData && (
                    <div className="px-3 py-1 rounded-full bg-amber-500/80 text-white text-xs flex items-center gap-1">
                      ⚠️ 测试数据
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="h-[65%] p-4 overflow-y-auto space-y-3">

              {/* 餐食类型标签 */}
              {recognizedAnalysis?.mealType && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🥗</span>
                  <span className="text-white font-semibold text-base">{recognizedAnalysis.mealType}</span>
                  {recognizedAnalysis.mealCategory && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-xs">
                      {recognizedAnalysis.mealCategory}
                    </span>
                  )}
                </div>
              )}

              {/* 营养汇总 */}
              {recognizedFoods.length > 0 && (() => {
                const totals = calculateTotalNutrition(recognizedFoods)
                return (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-xs text-emerald-400 mb-2 font-medium">📊 总营养摄入</p>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold text-white">{totals.calories}</p>
                        <p className="text-xs text-gray-400">kcal</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-blue-400">{totals.protein}g</p>
                        <p className="text-xs text-gray-400">蛋白质</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-yellow-400">{totals.fat}g</p>
                        <p className="text-xs text-gray-400">脂肪</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-orange-400">{totals.carbs}g</p>
                        <p className="text-xs text-gray-400">碳水</p>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* AI 食材拆解 */}
              {recognizedAnalysis?.ingredientBreakdown && recognizedAnalysis.ingredientBreakdown.length > 0 && (
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-xs text-gray-400 mb-2 font-medium">🔍 食材拆解</p>
                  <div className="space-y-1.5">
                    {recognizedAnalysis.ingredientBreakdown.map((item: string, idx: number) => (
                      <p key={idx} className="text-sm text-gray-300 leading-relaxed">{item}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* 营养亮点 */}
              {recognizedAnalysis?.nutritionHighlights && recognizedAnalysis.nutritionHighlights.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-400 mb-2 font-medium">💡 营养亮点</p>
                  <div className="space-y-1">
                    {recognizedAnalysis.nutritionHighlights.map((highlight: string, idx: number) => (
                      <p key={idx} className="text-sm text-gray-200 leading-relaxed flex items-start gap-1.5">
                        <span className="text-amber-400 mt-0.5">•</span>
                        <span>{highlight}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* 识别结果列表（精简版：仅名称+热量） */}
              <div>
                <p className="text-xs text-gray-400 mb-2 font-medium">
                  识别结果（{recognizedFoods.length} 项）
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {recognizedFoods.map((food, index) => (
                    <div
                      key={index}
                      className="p-2 rounded-lg bg-white/5 border border-emerald-500/15 flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-emerald-300 truncate">{food.name}</p>
                        {food.cookingMethod && (
                          <p className="text-[10px] text-gray-500">{food.cookingMethod}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 ml-2 shrink-0">{food.calories} kcal</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 免责声明 */}
              {recognizedAnalysis?.disclaimer && (
                <p className="text-[10px] text-gray-500 text-center leading-relaxed">
                  {recognizedAnalysis.disclaimer}
                </p>
              )}
            </div>
          </div>
        )}

        {/* 错误状态 */}
        {step === 'error' && (
          <div className="text-center p-8">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">识别失败</h3>
            <p className="text-sm text-gray-400 mb-6">{errorMessage}</p>
            <button
              onClick={handleReset}
              className="px-6 py-3 rounded-full bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
            >
              重新拍摄
            </button>
          </div>
        )}
      </div>

      {/* 底部操作按钮 */}
      <div className="flex gap-3">
        {step === 'preview' && (
          <>
            <button
              onClick={handleReset}
              className="flex-1 py-3 rounded-xl bg-white/10 text-gray-300 font-medium hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              重新选择
            </button>
            <button
              onClick={handleRecognize}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              开始识别
            </button>
          </>
        )}

        {step === 'result' && (
          <>
            <button
              onClick={handleReset}
              className="flex-1 py-3 rounded-xl bg-white/10 text-gray-300 font-medium hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              继续拍摄
            </button>
            <button
              onClick={handleAddToIntake}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              添加到饮食记录
            </button>
          </>
        )}
      </div>

      {/* 餐次选择弹窗 */}
      {showMealPicker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end pb-20">
          <div className="absolute inset-0" onClick={() => setShowMealPicker(false)} />
          <div className="relative w-full max-w-lg bg-[#1a1a2e] rounded-t-3xl p-6 pb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">添加到饮食记录</h3>
              <button
                onClick={() => setShowMealPicker(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-400 mb-3">请选择餐次</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedMealType(type)}
                  className={`py-4 rounded-xl font-medium transition-colors ${
                    selectedMealType === type
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {MEAL_TYPE_LABELS[type]}
                </button>
              ))}
            </div>

            <button
              onClick={confirmAddToIntake}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-medium hover:opacity-90 transition-opacity"
            >
              确认添加
            </button>
          </div>
        </div>
      )}

      {/* 提示信息 */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <p className="text-sm text-blue-300">
          <strong>提示：</strong>识别结果仅供参考，实际热量可能因食材分量和烹饪方式有所差异。
        </p>
      </div>

      {/* ── 拳头校准弹窗 ── */}
      {showCalibration && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#1a1a2e] rounded-3xl overflow-hidden">

            {/* 顶部标题栏 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-white">校准拳头参照物</span>
              </div>
              <button onClick={() => setShowCalibration(false)} className="p-1 rounded-full hover:bg-white/10">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-5">
              {/* Step 1: 介绍页 */}
              {calibrateStep === 'intro' && (
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                    <Scale className="w-10 h-10 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">为你的拳头建立参照标准</h3>
                  <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                    你的拳头体积是独一无二的。校准后，每次拍照带上拳头，AI 会以它为比例尺，精确估算食物份量。
                  </p>
                  <div className="text-left bg-slate-800/50 rounded-xl p-4 mb-6 space-y-2">
                    <p className="text-xs text-gray-400 mb-2">校准步骤（共2步）：</p>
                    {['📷 拍摄拳头俯瞰图（从上往下拍）', '📷 拍摄拳头侧面图（从侧面拍）'].map((step, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center flex-shrink-0">{i + 1}</span>
                        {step}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => { setCalibrateStep('topdown'); setFistFileTarget('topdown') }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-400 text-white font-semibold hover:opacity-90"
                  >
                    开始校准
                  </button>
                </div>
              )}

              {/* Step 2: 拍摄俯瞰图（上传页） */}
              {calibrateStep === 'topdown' && (
                <div className="text-center">
                  <div className="bg-slate-800/50 rounded-2xl aspect-square flex flex-col items-center justify-center mb-4 overflow-hidden relative">
                    <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                      <Scale className="w-8 h-8 text-amber-400" />
                    </div>
                    <p className="text-sm text-gray-400 px-4">点击下方按钮拍摄俯瞰图</p>
                  </div>
                  <p className="text-sm text-amber-300 mb-4">📷 请拍摄拳头的俯瞰图（手握拳，从正上方拍摄）</p>
                  <button
                    onClick={handleFistFileSelect}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-400 text-white font-semibold hover:opacity-90 flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    拍摄俯瞰图
                  </button>
                </div>
              )}

              {/* Step 2b: 俯瞰图预览确认页 */}
              {calibrateStep === 'topdown_preview' && fistTopDown && (
                <div className="text-center">
                  <div className="bg-slate-800/50 rounded-2xl aspect-square flex flex-col items-center justify-center mb-4 overflow-hidden relative">
                    <img src={fistTopDown} alt="俯瞰图预览" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-amber-500/30 flex items-center justify-center mb-3 animate-pulse">
                        <Scale className="w-8 h-8 text-amber-400" />
                      </div>
                      <p className="font-medium text-white">照片已选定</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setFistTopDown(null); setCalibrateStep('topdown') }}
                      className="flex-1 py-3 rounded-xl bg-white/10 text-gray-300 font-medium hover:bg-white/20 flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      重新拍摄
                    </button>
                    <button
                      onClick={() => { setCalibrateStep('sideview'); setFistFileTarget('sideview') }}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-400 text-white font-semibold hover:opacity-90 flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      确认
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: 拍摄侧面图（上传页） */}
              {calibrateStep === 'sideview' && (
                <div className="text-center">
                  {/* 俯瞰图缩略图 */}
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                      {fistTopDown ? (
                        <img src={fistTopDown} alt="俯瞰图" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Scale className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">俯瞰图已确认 ✓</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-2xl aspect-square flex flex-col items-center justify-center mb-4 overflow-hidden relative">
                    <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                      <Scale className="w-8 h-8 text-amber-400" />
                    </div>
                    <p className="text-sm text-gray-400 px-4">点击下方按钮拍摄侧面图</p>
                  </div>
                  <p className="text-sm text-amber-300 mb-4">📷 请拍摄拳头的侧面图（手握拳，从侧面拍摄）</p>
                  <button
                    onClick={handleFistFileSelect}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-400 text-white font-semibold hover:opacity-90 flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    拍摄侧面图
                  </button>
                </div>
              )}

              {/* Step 3b: 侧面图预览确认页 */}
              {calibrateStep === 'sideview_preview' && fistSideView && fistTopDown && (
                <div className="text-center">
                  {/* 俯瞰图缩略图 */}
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                      <img src={fistTopDown} alt="俯瞰图" className="w-full h-full object-cover" />
                    </div>
                    <p className="text-xs text-gray-400">俯瞰图已确认 ✓</p>
                  </div>
                  {/* 侧面图大方框 - 带图标覆盖层 */}
                  <div className="bg-slate-800/50 rounded-2xl aspect-square flex flex-col items-center justify-center mb-4 overflow-hidden relative">
                    <img src={fistSideView} alt="侧面图预览" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-amber-500/30 flex items-center justify-center mb-3 animate-pulse">
                        <Scale className="w-8 h-8 text-amber-400" />
                      </div>
                      <p className="font-medium text-white">照片已选定</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setFistSideView(null); setCalibrateStep('sideview') }}
                      className="flex-1 py-3 rounded-xl bg-white/10 text-gray-300 font-medium hover:bg-white/20 flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      重新拍摄
                    </button>
                    <button
                      onClick={() => { setCalibrateStep('processing'); doFistCalibration(fistSideView, fistTopDown) }}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-400 text-white font-semibold hover:opacity-90 flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      确认
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: 处理中 */}
              {calibrateStep === 'processing' && (
                <div className="text-center">
                  {/* 显示已上传的两张图片 */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-xl overflow-hidden aspect-square bg-slate-800">
                      {fistTopDown ? (
                        <img src={fistTopDown} alt="俯瞰图" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Scale className="w-8 h-8 text-gray-500" />
                        </div>
                      )}
                      <p className="text-xs text-center text-gray-400 mt-1">俯瞰图</p>
                    </div>
                    <div className="rounded-xl overflow-hidden aspect-square bg-slate-800">
                      {fistSideView ? (
                        <img src={fistSideView} alt="侧面图" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Scale className="w-8 h-8 text-gray-500" />
                        </div>
                      )}
                      <p className="text-xs text-center text-gray-400 mt-1">侧面图</p>
                    </div>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-3">
                    <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">正在校准中...</h3>
                  <p className="text-sm text-gray-400">AI 正在分析你的拳头数据</p>
                </div>
              )}

              {/* Step 5: 完成 */}
              {calibrateStep === 'done' && fistCalibration && (
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">校准成功！</h3>
                  <div className="bg-slate-800/50 rounded-xl p-4 mb-6 text-left space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">拳头体积</span>
                      <span className="text-amber-400 font-bold">{fistCalibration.volumeMl} ml</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">宽度 / 深度 / 高度</span>
                      <span className="text-white">{fistCalibration.widthMm} × {fistCalibration.depthMm} × {fistCalibration.heightMm} mm</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">置信度</span>
                      <span className="text-emerald-400">{Math.round(fistCalibration.confidence * 100)}%</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">
                    以后每次拍照时，请将拳头与食物一起入镜，AI 将以此为参照精确估算份量。
                  </p>
                  <button
                    onClick={() => setShowCalibration(false)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-semibold hover:opacity-90"
                  >
                    开始拍照识别
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
