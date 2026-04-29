/**
 * 环形进度图组件
 * 用于显示营养素摄入进度
 */

interface RingChartProps {
  value: number
  max: number
  label: string
  unit: string
  color: string
  size?: number
  strokeWidth?: number
}

export function RingChart({
  value,
  max,
  label,
  unit,
  color,
  size = 80,
  strokeWidth = 8
}: RingChartProps) {
  const percentage = Math.min((value / max) * 100, 100)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  const colorMap: Record<string, string> = {
    blue: 'stroke-blue-400',
    yellow: 'stroke-yellow-400',
    orange: 'stroke-orange-400',
    purple: 'stroke-purple-400',
    emerald: 'stroke-emerald-400',
    pink: 'stroke-pink-400',
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* 背景圆环 */}
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* 进度圆环 */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className={colorMap[color] || `stroke-${color}-400`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
              transition: 'stroke-dashoffset 0.5s ease-out',
            }}
          />
        </svg>
        {/* 中心文字 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold">{Math.round(value)}</span>
          <span className="text-[10px] text-gray-400">{unit}</span>
        </div>
      </div>
      <span className="text-xs text-gray-400 mt-2">{label}</span>
      <span className="text-[10px] text-gray-500">{max}{unit}</span>
    </div>
  )
}

/**
 * 简易柱状图组件
 * 用于显示本周数据趋势
 */
interface BarChartProps {
  data: { label: string; value: number; color?: string }[]
  maxValue?: number
  height?: number
  unit?: string
}

export function BarChart({
  data,
  maxValue,
  height = 120,
  unit = ''
}: BarChartProps) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1)

  return (
    <div className="flex items-end justify-between gap-1" style={{ height }}>
      {data.map((item, index) => {
        const barHeight = max > 0 ? (item.value / max) * 100 : 0
        return (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            {/* 数值 */}
            {item.value > 0 && (
              <span className="text-[10px] text-gray-400">
                {Math.round(item.value)}{unit}
              </span>
            )}
            {/* 柱子 */}
            <div
              className={`w-full rounded-t-sm transition-all ${
                item.color || 'bg-emerald-500/70'
              } hover:bg-emerald-500`}
              style={{
                height: `${Math.max(barHeight, item.value > 0 ? 4 : 0)}%`,
                minHeight: '2px',
              }}
            />
            {/* 标签 */}
            <span className="text-[10px] text-gray-500">{item.label}</span>
          </div>
        )
      })}
    </div>
  )
}
