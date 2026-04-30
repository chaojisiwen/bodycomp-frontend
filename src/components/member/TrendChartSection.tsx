import { Activity } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { TrendChart } from '@/components/ui/TrendChart'

interface TrendChartSectionProps {
  selectedPeriod: 'week' | 'month' | '3months'
  onPeriodChange: (period: 'week' | 'month' | '3months') => void
  selectedTrendMetrics: ('weight' | 'bodyFat' | 'muscle' | 'bmi' | 'waist' | 'visceral' | 'water' | 'bone' | 'metabolism')[]
  onToggleMetric: (metric: 'weight' | 'bodyFat' | 'muscle' | 'bmi' | 'waist' | 'visceral' | 'water' | 'bone' | 'metabolism') => void
  trendChartData: {
    date: string
    weight?: number
    bodyFat?: number
    muscle?: number
    bmi?: number
    waist?: number
    visceral?: number
    water?: number
    bone?: number
    metabolism?: number
  }[]
  startValue: string
  currentValue: string
  changeValue: string
}

export default function TrendChartSection({
  selectedPeriod,
  onPeriodChange,
  selectedTrendMetrics,
  onToggleMetric,
  trendChartData,
  startValue,
  currentValue,
  changeValue,
}: TrendChartSectionProps) {
  const periods = [
    { id: 'week' as const, name: '本周' },
    { id: 'month' as const, name: '本月' },
    { id: '3months' as const, name: '近3月' },
  ]

  const metricOptions = [
    { id: 'weight', name: '体重' },
    { id: 'bodyFat', name: '体脂率' },
    { id: 'muscle', name: '肌肉量' },
    { id: 'bmi', name: 'BMI' },
    { id: 'waist', name: '腰围' },
    { id: 'visceral', name: '内脏脂肪' },
    { id: 'water', name: '体水分' },
    { id: 'bone', name: '骨量' },
    { id: 'metabolism', name: '基础代谢' },
  ]

  return (
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
              onClick={() => onPeriodChange(period.id)}
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
        {metricOptions.map(metric => (
          <button
            key={metric.id}
            onClick={() => onToggleMetric(metric.id as any)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              selectedTrendMetrics.includes(metric.id as any)
                ? 'bg-emerald-500/30 text-emerald-400 border border-emerald-500/50'
                : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
            }`}
          >
            {metric.name}
          </button>
        ))}
      </div>

      {/* 趋势图 */}
      {trendChartData.length >= 2 ? (
        <TrendChart
          data={trendChartData}
          metrics={selectedTrendMetrics}
          height={180}
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-40 text-gray-500">
          <Activity className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">记录至少2次数据后即可查看趋势图</p>
        </div>
      )}

      {/* 统计信息 */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/10">
        <div className="text-center">
          <p className="text-xs text-gray-400">起始</p>
          <p className="font-semibold">{startValue || '--'}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">当前</p>
          <p className="font-semibold text-emerald-400">{currentValue || '--'}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">变化</p>
          <p className="font-semibold text-emerald-400">{changeValue || '--'}</p>
        </div>
      </div>
    </Card>
  )
}
