import { memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface NutritionProgressProps {
  todayProtein: number
  proteinTarget: number
  proteinPercent: number
  todayFat: number
  fatTarget: number
  fatPercent: number
  todayCarbs: number
  carbsTarget: number
  carbsPercent: number
}

const NutritionProgress = memo(function NutritionProgress({
  todayProtein,
  proteinTarget,
  proteinPercent,
  todayFat,
  fatTarget,
  fatPercent,
  todayCarbs,
  carbsTarget,
  carbsPercent,
}: NutritionProgressProps) {
  return (
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
          <Progress value={Math.min(carbsPercent, 100)} className="h-2" indicatorClassName="bg-purple-500" />
        </div>
      </CardContent>
    </Card>
  )
})

export default NutritionProgress
