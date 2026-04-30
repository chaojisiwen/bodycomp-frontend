import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, ChevronDown, ChevronUp, Plus, X, Search, Filter, Sunrise, Sun, Moon, Apple } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { foodDatabase, foodCategories, nutritionTags, getFoodTagLabels, type FoodItem, type NutritionTag } from '@/data/foods'
import { useAuth } from '@/contexts/AuthContext'
import { useMealStore, useTodayCalories } from '@/stores/mealStore'
import type { IFoodItem } from '@/cloudbase/types'

interface FoodEntry {
  id: string
  name: string
  emoji: string
  calories: number
  protein: number
  fat: number
  carbs: number
  amount: number
  unit: string
}

/** 单条饮食记录 */
interface MealRecord {
  _id: string
  foods: FoodEntry[]
  imageUrl?: string
}

/** 按餐次分组的 UI 数据 */
interface MealData {
  id: string
  name: string
  icon: React.ReactNode
  color: string
  bgColor: string
  records: MealRecord[]   // 支持同一餐次多条记录
  isOpen: boolean
}

export function IntakePage() {
  const navigate = useNavigate()

  // ── 当前登录用户 ──
  const { user } = useAuth()
  const currentUserId = user?.id || (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).id : 'local-user')

  // ── Store 数据 ──
  const storeMeals = useMealStore((s) => s.meals)
  const fetchMeals = useMealStore((s) => s.fetchMeals)
  const todayCalories = useTodayCalories()
  const addMeal = useMealStore((s) => s.addMeal)
  const updateMeal = useMealStore((s) => s.updateMeal)
  const deleteMeal = useMealStore((s) => s.deleteMeal)

  // ── 挂载时从 API / localStorage 拉取数据 ──
  useEffect(() => { fetchMeals() }, [])

  // 目标热量（从计划目标读取，默认2000）
  const [targetCalories] = useState(() => {
    const saved = localStorage.getItem('plan_target')
    return saved ? (JSON.parse(saved)).targetCalories || 2000 : 2000
  })

  // ── UI 状态 ──
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set(['breakfast']))
  const [showAddFood, setShowAddFood] = useState(false)
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('全部')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedFoods, setSelectedFoods] = useState<Map<string, { amount: number; unit: string; name: string; calories: number; protein: number; fat: number; carbs: number; emoji: string }>>(new Map())
  const [showCustomFood, setShowCustomFood] = useState(false)
  const [customFood, setCustomFood] = useState({ name: '', calories: '', protein: '', fat: '', carbs: '', amount: '100', unit: 'g' })
  const [selectedNutritionTags, setSelectedNutritionTags] = useState<NutritionTag[]>([])

  // ── 辅助：meal type → MealData ──
  const mealTypeMap: Record<string, { name: string; icon: React.ReactNode; color: string; bgColor: string }> = {
    breakfast: { name: '早餐', icon: <Sunrise className="w-5 h-5" />, color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
    lunch:     { name: '午餐', icon: <Sun className="w-5 h-5" />, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
    dinner:    { name: '晚餐', icon: <Moon className="w-5 h-5" />, color: 'text-indigo-400', bgColor: 'bg-indigo-500/20' },
    snack:     { name: '加餐', icon: <Apple className="w-5 h-5" />, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
  }

  // 从 store meals 派生 UI meals 数据（按餐次分组，支持多条记录）
  const todayStr = new Date().toDateString()
  const uiMeals: MealData[] = (['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => {
    const meta = mealTypeMap[type]
    const typeMeals = storeMeals.filter(
      (m) => m.meal_type === type && new Date(m.meal_date).toDateString() === todayStr
    )
    const records: MealRecord[] = typeMeals
      .filter((sm) => !!sm._id)
      .map((sm) => ({
        _id: sm._id!,
        imageUrl: sm.image_url,
        foods: (sm.foods || []).map((f: IFoodItem, fi: number) => ({
          id: `${sm._id}-food-${fi}`,
          name: f.name,
          emoji: (f as any).emoji || '🍽️',
          calories: f.calories,
          protein: f.protein,
          fat: f.fat,
          carbs: f.carbs,
          amount: f.amount,
          unit: 'g',
        })),
      }))
    return {
      id: type,
      name: meta.name,
      icon: meta.icon,
      color: meta.color,
      bgColor: meta.bgColor,
      records,
      isOpen: expandedMeals.has(type),
    }
  })

  // 切换营养标签
  const toggleNutritionTag = (tag: NutritionTag) => {
    setSelectedNutritionTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  // 搜索、分类和营养标签过滤
  const filteredFoods = useMemo(() => {
    let foods = foodDatabase.filter(food => {
      const matchCategory = selectedCategory === '全部' || food.category === selectedCategory
      const matchSearch = !searchKeyword || food.name.toLowerCase().includes(searchKeyword.toLowerCase())
      const matchTags = selectedNutritionTags.length === 0 || 
        selectedNutritionTags.every(tag => {
          const tagConfig = nutritionTags.find(t => t.key === tag)
          return tagConfig?.condition(food)
        })
      return matchCategory && matchSearch && matchTags
    })

    // 如果有营养标签筛选，按匹配度排序
    if (selectedNutritionTags.length > 0) {
      foods.sort((a, b) => {
        const aMatchCount = nutritionTags.filter(t => selectedNutritionTags.includes(t.key) && t.condition(a)).length
        const bMatchCount = nutritionTags.filter(t => selectedNutritionTags.includes(t.key) && t.condition(b)).length
        return bMatchCount - aMatchCount
      })
    }

    return foods
  }, [selectedCategory, searchKeyword, selectedNutritionTags])

  const toggleMeal = (mealId: string) => {
    setExpandedMeals((prev) => {
      const next = new Set(prev)
      if (next.has(mealId)) next.delete(mealId)
      else next.add(mealId)
      return next
    })
  }

  const removeFood = (mealRecordId: string, foodIndex: number) => {
    const existing = storeMeals.find((m) => m._id === mealRecordId)
    if (!existing?._id) return
    const newFoods = existing.foods.filter((_: any, i: number) => i !== foodIndex)
    if (newFoods.length === 0) {
      deleteMeal(existing._id)
    } else {
      updateMeal(existing._id, {
        foods: newFoods,
        total_calories: newFoods.reduce((s, f) => s + f.calories, 0),
        total_protein: newFoods.reduce((s, f) => s + f.protein, 0),
        total_fat: newFoods.reduce((s, f) => s + f.fat, 0),
        total_carbs: newFoods.reduce((s, f) => s + f.carbs, 0),
      })
    }
  }

  const getMealCalories = (meal: MealData) => {
    return meal.records.reduce(
      (sum, rec) => sum + rec.foods.reduce((s, f) => s + f.calories, 0),
      0
    )
  }

  const consumedCalories = todayCalories
  const remaining = targetCalories - consumedCalories

  // 打开添加食物弹窗
  const openAddFood = (mealId: string) => {
    setSelectedMealId(mealId)
    // 清空时保留自定义食物（如果用户刚填过）
    if (!showCustomFood) {
      setSelectedFoods(new Map())
    }
    setSearchKeyword('')
    setSelectedCategory('全部')
    setSelectedNutritionTags([])
    setShowAddFood(true)
  }

  // 选择食物
  const toggleFoodSelection = (food: FoodItem) => {
    const newSelected = new Map(selectedFoods)
    if (newSelected.has(food.id)) {
      newSelected.delete(food.id)
    } else {
      newSelected.set(food.id, {
        amount: food.defaultAmount,
        unit: food.unit,
        name: food.name,
        calories: food.calories,
        protein: food.protein,
        fat: food.fat,
        carbs: food.carbs,
        emoji: food.emoji,
      })
    }
    setSelectedFoods(newSelected)
  }

  // 更新已选食物的份量
  const updateSelectedAmount = (foodId: string, amount: number, unit: string) => {
    const existing = selectedFoods.get(foodId)
    if (!existing) return
    const newSelected = new Map(selectedFoods)
    newSelected.set(foodId, { ...existing, amount, unit })
    setSelectedFoods(newSelected)
  }

  // 计算已选食物的总热量
  const selectedTotalCalories = useMemo(() => {
    let total = 0
    selectedFoods.forEach((selection) => {
      const ratio = selection.amount / 100
      total += Math.round(selection.calories * ratio)
    })
    return total
  }, [selectedFoods])

  // 添加自定义食物到待选列表
  const addCustomFoodToSelection = () => {
    if (!customFood.name || !customFood.calories) return
    const amount = parseFloat(customFood.amount) || 100
    const calories = parseFloat(customFood.calories) || 0
    const protein = parseFloat(customFood.protein) || 0
    const fat = parseFloat(customFood.fat) || 0
    const carbs = parseFloat(customFood.carbs) || 0
    setSelectedFoods(prev => {
      const newMap = new Map(prev)
      newMap.set('custom-food', {
        amount,
        unit: customFood.unit,
        name: customFood.name,
        calories,
        protein,
        fat,
        carbs,
        emoji: '🍽️',
      })
      return newMap
    })
    setCustomFood({ name: '', calories: '', protein: '', fat: '', carbs: '', amount: '100', unit: 'g' })
    setShowCustomFood(false)
  }

  // 确认添加食物 → 写入 store
  const confirmAddFoods = () => {
    if (!selectedMealId) return

    // 构建 IFoodItem[]
    const newFoodItems: IFoodItem[] = []
    selectedFoods.forEach((selection, foodId) => {
      const ratio = selection.amount / 100
      if (foodId === 'custom-food') {
        newFoodItems.push({
          name: selection.name,
          amount: selection.amount,
          calories: Math.round(selection.calories * ratio),
          protein: Math.round(selection.protein * ratio * 10) / 10,
          fat: Math.round(selection.fat * ratio * 10) / 10,
          carbs: Math.round(selection.carbs * ratio * 10) / 10,
        })
      } else {
        const food = foodDatabase.find(f => f.id === foodId)
        if (food) {
          newFoodItems.push({
            name: food.name,
            amount: selection.amount,
            calories: Math.round(food.calories * ratio),
            protein: Math.round(food.protein * ratio * 10) / 10,
            fat: Math.round(food.fat * ratio * 10) / 10,
            carbs: Math.round(food.carbs * ratio * 10) / 10,
          })
        }
      }
    })

    if (newFoodItems.length === 0) return

    // 每次添加都创建独立的一条记录，不覆盖已有记录
    addMeal({
      user_id: currentUserId,
      meal_type: selectedMealId as any,
      meal_date: new Date(),
      foods: newFoodItems,
      total_calories: newFoodItems.reduce((s, f) => s + f.calories, 0),
      total_protein: newFoodItems.reduce((s, f) => s + f.protein, 0),
      total_fat: newFoodItems.reduce((s, f) => s + f.fat, 0),
      total_carbs: newFoodItems.reduce((s, f) => s + f.carbs, 0),
    })

    setShowAddFood(false)
    setSelectedFoods(new Map())
    setCustomFood({ name: '', calories: '', protein: '', fat: '', carbs: '', amount: '100', unit: 'g' })
  }

  return (
    <div className="space-y-4 pb-24">
      {/* 今日摄入统计 */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <span>🔥</span>
            今日摄入
          </div>
          <div className="text-2xl font-bold">{consumedCalories} <span className="text-sm text-gray-400">kcal</span></div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <span>🎯</span>
            目标
          </div>
          <div className="text-2xl font-bold">{targetCalories} <span className="text-sm text-gray-400">kcal</span></div>
        </Card>
      </div>

      {/* 热量进度条 */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">目标进度</span>
          <span className="text-sm text-gray-400">{consumedCalories} / {targetCalories} kcal</span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
            style={{ width: `${Math.min((consumedCalories / targetCalories) * 100, 100)}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-2 text-sm">
          <span className="text-gray-400">已摄入</span>
          <span className={remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}>
            {remaining >= 0 ? `剩余 ${remaining} kcal` : `超标 ${Math.abs(remaining)} kcal`}
          </span>
        </div>
      </Card>

      {/* 拍照识别 + 添加食物入口 */}
      <div className="grid grid-cols-2 gap-3">
          <Card className="p-3">
            <button
              onClick={() => navigate('/member/recognize')}
              className="w-full flex flex-col items-center gap-2"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Camera className="w-6 h-6 text-emerald-400" />
              </div>
              <span className="text-sm font-medium">拍照识别</span>
            </button>
          </Card>
          <Card className="p-3">
            <button
              onClick={() => openAddFood(uiMeals.find(m => m.isOpen)?.id || 'breakfast')}
              className="w-full flex flex-col items-center gap-2"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Plus className="w-6 h-6 text-amber-400" />
              </div>
              <span className="text-sm font-medium">添加食物</span>
            </button>
          </Card>
        </div>

        {/* 餐食列表 */}
        <div className="space-y-3">
          {uiMeals.map(meal => (
            <Card key={meal.id} className="p-0 overflow-hidden">
              {/* 餐食头部 */}
              <button
                onClick={() => toggleMeal(meal.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${meal.bgColor} flex items-center justify-center ${meal.color}`}>
                    {meal.icon}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">{meal.name}</p>
                    <p className="text-sm text-gray-400">{getMealCalories(meal)} kcal</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {meal.isOpen ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* 食物列表：每个记录块独立展示 */}
              {meal.isOpen && (
                <div className="px-4 pb-4 space-y-4">
                  {meal.records.length === 0 && (
                    <p className="text-center text-gray-500 text-sm py-4">暂无记录</p>
                  )}
                  {meal.records.map((record) => (
                    <div key={record._id} className="space-y-2">
                      {/* 识别照片 */}
                      {record.imageUrl && (
                        <div className="relative rounded-xl overflow-hidden bg-white/5 border border-white/10">
                          <img
                            src={record.imageUrl}
                            alt="识别照片"
                            className="w-full h-28 object-cover"
                          />
                          <div className="absolute bottom-2 right-2 px-2 py-1 rounded-full bg-black/50 text-xs text-white flex items-center gap-1">
                            <Camera className="w-3 h-3" />
                            AI 识别
                          </div>
                        </div>
                      )}
                      {/* 食物列表 */}
                      {record.foods.map((food, idx) => (
                        <div
                          key={food.id}
                          className="bg-white/5 rounded-xl p-3 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{food.emoji}</span>
                            <div>
                              <p className="font-medium text-sm">{food.name} {food.amount}{food.unit}</p>
                              <p className="text-xs text-gray-400">
                                {food.calories} kcal | P:{food.protein}g F:{food.fat}g C:{food.carbs}g
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFood(record._id, idx)}
                            className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* 添加食物弹窗 */}
        {showAddFood && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex flex-col pb-20">
            {/* 头部 */}
            <div className="bg-gray-900 p-4">
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setShowAddFood(false)} className="text-gray-400">
                  <X className="w-6 h-6" />
                </button>
                <h3 className="font-semibold">添加食物</h3>
                <div className="w-6" />
              </div>
              {/* 餐次选择器 */}
              <div className="flex gap-2 justify-center">
                {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedMealId(type)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      selectedMealId === type
                        ? `${mealTypeMap[type].color} ${mealTypeMap[type].bgColor} ring-2 ring-current`
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    {mealTypeMap[type].icon} {mealTypeMap[type].name}
                  </button>
                ))}
              </div>
            </div>

            {/* 内容区 */}
            <div className="flex-1 overflow-y-auto pb-64 bg-gray-900">
              {/* 搜索框 */}
              <div className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索食物..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="w-full bg-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* 营养标签筛选 */}
              <div className="px-4 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-400">营养筛选</span>
                  {selectedNutritionTags.length > 0 && (
                    <button 
                      onClick={() => setSelectedNutritionTags([])}
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      清除
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {nutritionTags.map(tag => (
                    <button
                      key={tag.key}
                      onClick={() => toggleNutritionTag(tag.key)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                        selectedNutritionTags.includes(tag.key)
                          ? `${tag.color} ring-2 ring-offset-1 ring-offset-gray-900`
                          : 'bg-white/10 text-gray-300'
                      }`}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 分类标签 */}
              <div className="px-4 pb-3 overflow-x-auto">
                <div className="flex gap-2 whitespace-nowrap">
                  <button
                    onClick={() => setSelectedCategory('全部')}
                    className={`px-3 py-1.5 rounded-full text-sm ${
                      selectedCategory === '全部' ? 'bg-emerald-500 text-white' : 'bg-white/10 text-gray-300'
                    }`}
                  >
                    全部
                  </button>
                  {foodCategories.map(cat => (
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

              {/* 添加自定义食物按钮 - 固定在分类下方 */}
              <div className="px-4 py-5">
                <button
                  onClick={() => setShowCustomFood(!showCustomFood)}
                  className="w-full py-4 rounded-xl border border-dashed border-emerald-500 text-emerald-400 text-sm flex items-center justify-center gap-2 hover:bg-emerald-500/10 transition-colors active:bg-emerald-500/20"
                >
                  <Plus className="w-4 h-4" />
                  添加自定义食物
                </button>
              </div>

              {/* 自定义食物表单 */}
              {showCustomFood && (
                <div className="px-4 py-5">
                  <div className="p-5 bg-white/5 rounded-xl space-y-4">
                    <input
                      type="text"
                      placeholder="食物名称"
                      value={customFood.name}
                      onChange={(e) => setCustomFood({ ...customFood, name: e.target.value })}
                      className="w-full bg-white/10 rounded-lg py-3 px-4 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-400">热量 (kcal/100g)</label>
                        <input
                          type="number"
                          placeholder="热量"
                          value={customFood.calories}
                          onChange={(e) => setCustomFood({ ...customFood, calories: e.target.value })}
                          className="w-full bg-white/10 rounded-lg py-3 px-4 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">蛋白质 (g)</label>
                        <input
                          type="number"
                          placeholder="蛋白质"
                          value={customFood.protein}
                          onChange={(e) => setCustomFood({ ...customFood, protein: e.target.value })}
                          className="w-full bg-white/10 rounded-lg py-3 px-4 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">脂肪 (g)</label>
                        <input
                          type="number"
                          placeholder="脂肪"
                          value={customFood.fat}
                          onChange={(e) => setCustomFood({ ...customFood, fat: e.target.value })}
                          className="w-full bg-white/10 rounded-lg py-3 px-4 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">碳水 (g)</label>
                        <input
                          type="number"
                          placeholder="碳水"
                          value={customFood.carbs}
                          onChange={(e) => setCustomFood({ ...customFood, carbs: e.target.value })}
                          className="w-full bg-white/10 rounded-lg py-3 px-4 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                    <button
                      onClick={addCustomFoodToSelection}
                      disabled={!customFood.name || !customFood.calories}
                      className="w-full py-3 px-4 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      确认添加
                    </button>
                  </div>
                </div>
              )}

              {/* 食物列表 */}
              <div className="px-4 pb-4">
                <div className="grid grid-cols-3 gap-2">
                  {filteredFoods.slice(0, 60).map(food => {
                    const isSelected = selectedFoods.has(food.id)
                    const selection = selectedFoods.get(food.id)
                    const tags = getFoodTagLabels(food)
                    return (
                      <div
                        key={food.id}
                        className={`p-3 rounded-xl text-center transition-all relative ${
                          isSelected ? 'bg-emerald-500/30 ring-2 ring-emerald-500' : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <button
                          onClick={() => toggleFoodSelection(food)}
                          className="w-full"
                        >
                          <div className="text-2xl mb-1">{food.emoji}</div>
                          <div className="text-xs text-gray-300 truncate">{food.name}</div>
                          <div className="text-xs text-gray-500">{food.calories} kcal</div>
                        </button>
                        {/* 营养标签 */}
                        {tags.length > 0 && (
                          <div className="flex flex-wrap justify-center gap-1 mt-1">
                            {tags.slice(0, 2).map(tag => (
                              <span key={tag} className="text-[10px] px-1 py-0.5 rounded bg-white/10 text-gray-400">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* 份量选择 */}
                        {isSelected && (
                          <div 
                            className="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-full mt-2 bg-gray-800 rounded-lg p-2 shadow-lg z-10 w-28"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-1 mb-1">
                              <input
                                type="number"
                                min="0.1"
                                step="0.5"
                                value={selection?.amount || food.defaultAmount}
                                onChange={(e) => updateSelectedAmount(food.id, parseFloat(e.target.value) || 1, selection?.unit || food.unit)}
                                className="w-14 bg-white/10 rounded px-2 py-1 text-xs text-white text-center"
                              />
                              <span className="text-xs text-gray-400">{food.unit}</span>
                            </div>
                            <div className="text-[10px] text-gray-500 text-center">
                              ≈ {Math.round(food.calories * (selection?.amount || food.defaultAmount) / 100)} kcal
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* 底部确认栏 */}
            <div className="absolute bottom-20 left-0 right-0 bg-gray-900 p-4 border-t border-white/10">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-400">已选热量</span>
                <span className="text-xl font-bold text-emerald-400">{selectedTotalCalories} kcal</span>
              </div>
              <button
                onClick={confirmAddFoods}
                disabled={selectedFoods.size === 0 && (!customFood.name || !customFood.calories)}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedFoods.size > 0 || (customFood.name && customFood.calories)
                  ? `确认添加 (${selectedFoods.size + (customFood.name && customFood.calories ? 1 : 0)}项)`
                  : '请选择食物'
                }
              </button>
            </div>
          </div>
        )}
    </div>
  )
}
