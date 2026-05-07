// ============================================================
// 辅助函数
// ============================================================

import type { RecognizedFoodItem } from './types'

/**
 * 计算食物总热量
 */
export function calculateTotalCalories(foods: RecognizedFoodItem[]): number {
  return Math.round(foods.reduce((sum, f) => sum + f.calories, 0))
}

/**
 * 计算食物总营养成分
 * 热量由营养素计算得出：蛋白质×4 + 脂肪×9 + 碳水×4
 */
export function calculateTotalNutrition(foods: RecognizedFoodItem[]) {
  const totalProtein = Math.round(foods.reduce((sum, f) => sum + f.protein, 0) * 10) / 10
  const totalFat = Math.round(foods.reduce((sum, f) => sum + f.fat, 0) * 10) / 10
  const totalCarbs = Math.round(foods.reduce((sum, f) => sum + f.carbs, 0) * 10) / 10
  // 热量由营养素精确计算：蛋白质×4 + 脂肪×9 + 碳水×4
  const calories = Math.round(totalProtein * 4 + totalFat * 9 + totalCarbs * 4)
  return {
    calories,
    protein: totalProtein,
    fat: totalFat,
    carbs: totalCarbs,
  }
}
