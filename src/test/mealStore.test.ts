import { describe, it, expect, beforeEach } from 'vitest'
import { useMealStore } from '@/stores/mealStore'

// 重置 store 状态
beforeEach(() => {
    useMealStore.setState({
    meals: [],
    isLoading: false,
    error: null,
  })
})

describe('mealStore', () => {
  const testMeal = {
    user_id: 'test_user_001',
    meal_type: 'lunch' as const,
    meal_date: new Date('2026-05-03T12:00:00'),
    foods: [
      {
        name: '测试食物',
        amount: 100,
        calories: 200,
        protein: 10,
        carbs: 20,
        fat: 5,
      },
    ],
    total_calories: 200,
    total_protein: 10,
    total_carbs: 20,
    total_fat: 5,
  }

  it('初始状态应为空', () => {
    const state = useMealStore.getState()
    expect(state.meals).toEqual([])
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('addMeal 应添加一餐记录（本地模式）', async () => {
    const { addMeal } = useMealStore.getState()
    await addMeal(testMeal)

    const state = useMealStore.getState()
    expect(state.meals).toHaveLength(1)
    expect(state.meals[0].user_id).toBe('test_user_001')
    expect(state.meals[0].meal_type).toBe('lunch')
    expect(state.meals[0].total_calories).toBe(200)
    expect(state.meals[0].foods).toHaveLength(1)
  })

  it('updateMeal 应更新已有餐记录', async () => {
    const { addMeal, updateMeal } = useMealStore.getState()
    await addMeal(testMeal)

    const mealId = useMealStore.getState().meals[0]._id!
    await updateMeal(mealId, { total_calories: 300 })

    const state = useMealStore.getState()
    expect(state.meals[0].total_calories).toBe(300)
  })

  it('deleteMeal 应删除餐记录', async () => {
    const { addMeal, deleteMeal } = useMealStore.getState()
    await addMeal(testMeal)

    const mealId = useMealStore.getState().meals[0]._id!
    await deleteMeal(mealId)

    const state = useMealStore.getState()
    expect(state.meals).toHaveLength(0)
  })

  it('添加多条记录应正确存储', async () => {
    const { addMeal } = useMealStore.getState()

    const meal1 = { ...testMeal, meal_date: new Date('2026-05-03T12:00:00') }
    const meal2 = { ...testMeal, meal_date: new Date('2026-05-03T08:00:00'), meal_type: 'breakfast' as const }

    await addMeal(meal1)
    await addMeal(meal2)

    const state = useMealStore.getState()
    expect(state.meals).toHaveLength(2)
    expect(state.meals.map((m) => m.meal_type).sort()).toEqual(['breakfast', 'lunch'])
  })
})
