import { memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface CalorieCardsProps {
  todayCalories: number
  todayBurned: number
  calorieGap: number
  getCalorieColor: (diff: number) => string
}

const CalorieCards = memo(function CalorieCards({ todayCalories, todayBurned, calorieGap, getCalorieColor }: CalorieCardsProps) {
  return (
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
  )
})

export default CalorieCards
