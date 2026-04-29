interface TrendChartProps {
  data: {
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
  metrics: ('weight' | 'bodyFat' | 'muscle' | 'bmi' | 'waist' | 'visceral' | 'water' | 'bone' | 'metabolism')[]
  height?: number
}

const metricConfig: Record<string, { label: string; unit: string; color: string; gradient: string }> = {
  weight: { label: '体重', unit: 'kg', color: '#10b981', gradient: 'from-emerald-500/50 to-transparent' },
  bodyFat: { label: '体脂率', unit: '%', color: '#f97316', gradient: 'from-orange-500/50 to-transparent' },
  muscle: { label: '肌肉量', unit: 'kg', color: '#8b5cf6', gradient: 'from-purple-500/50 to-transparent' },
  bmi: { label: 'BMI', unit: '', color: '#3b82f6', gradient: 'from-blue-500/50 to-transparent' },
  waist: { label: '腰围', unit: 'cm', color: '#ec4899', gradient: 'from-pink-500/50 to-transparent' },
  visceral: { label: '内脏脂肪', unit: '', color: '#ef4444', gradient: 'from-red-500/50 to-transparent' },
  water: { label: '体水分', unit: '%', color: '#06b6d4', gradient: 'from-cyan-500/50 to-transparent' },
  bone: { label: '骨量', unit: 'kg', color: '#eab308', gradient: 'from-yellow-500/50 to-transparent' },
  metabolism: { label: '基础代谢', unit: 'kcal', color: '#f97316', gradient: 'from-orange-500/50 to-transparent' },
}

export function TrendChart({ data, metrics, height = 200 }: TrendChartProps) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
        数据不足，请至少记录2次
      </div>
    )
  }

  // 计算每个指标的 min/max 用于归一化
  const ranges: Record<string, { min: number; max: number }> = {}
  metrics.forEach(metric => {
    const values = data.map(d => (d as any)[metric] ?? 0).filter(v => v > 0)
    if (values.length > 0) {
      ranges[metric] = {
        min: Math.min(...values) * 0.95,
        max: Math.max(...values) * 1.05
      }
    }
  })

  // SVG 坐标计算
  const padding = { top: 20, right: 20, bottom: 30, left: 45 }
  const chartWidth = 320
  const chartHeight = height
  const innerWidth = chartWidth - padding.left - padding.right
  const innerHeight = chartHeight - padding.top - padding.bottom

  // 生成折线点
  const generatePath = (metric: string) => {
    const validData = data.filter(d => (d as any)[metric] > 0)
    if (validData.length < 2) return ''

    const { min, max } = ranges[metric] || { min: 0, max: 100 }
    const range = max - min || 1

    const points = validData.map((d, i) => {
      const x = padding.left + (i / (validData.length - 1)) * innerWidth
      const y = padding.top + innerHeight - ((d as any)[metric] - min) / range * innerHeight
      return `${x},${y}`
    })

    return `M ${points.join(' L ')}`
  }

  // 生成填充区域
  const generateArea = (metric: string) => {
    const validData = data.filter(d => (d as any)[metric] > 0)
    if (validData.length < 2) return ''

    const { min, max } = ranges[metric] || { min: 0, max: 100 }
    const range = max - min || 1

    const points = validData.map((d, i) => {
      const x = padding.left + (i / (validData.length - 1)) * innerWidth
      const y = padding.top + innerHeight - ((d as any)[metric] - min) / range * innerHeight
      return `${x},${y}`
    })

    return `M ${padding.left},${padding.top + innerHeight} L ${points.join(' L ')} L ${padding.left + innerWidth},${padding.top + innerHeight} Z`
  }

  // Y轴刻度
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => padding.top + innerHeight * (1 - t))

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          {metrics.map((metric) => {
            return (
              <linearGradient key={metric} id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={metricConfig[metric].color} stopOpacity="0.3" />
                <stop offset="100%" stopColor={metricConfig[metric].color} stopOpacity="0" />
              </linearGradient>
            )
          })}
        </defs>

        {/* 网格线 */}
        {yTicks.map((y, i) => (
          <line
            key={i}
            x1={padding.left}
            y1={y}
            x2={padding.left + innerWidth}
            y2={y}
            stroke="rgba(255,255,255,0.1)"
            strokeDasharray="4,4"
          />
        ))}

        {/* 填充区域 */}
        {metrics.map(metric => (
          <path
            key={`area-${metric}`}
            d={generateArea(metric)}
            fill={`url(#gradient-${metric})`}
            className="transition-all duration-500"
          />
        ))}

        {/* 折线 */}
        {metrics.map(metric => (
          <path
            key={`line-${metric}`}
            d={generatePath(metric)}
            fill="none"
            stroke={metricConfig[metric].color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-500"
          />
        ))}

        {/* 数据点 */}
        {metrics.map(metric => {
          const validData = data.filter(d => (d as any)[metric] > 0)
          const { min, max } = ranges[metric] || { min: 0, max: 100 }
          const range = max - min || 1

          return validData.map((d, i) => {
            const x = padding.left + (i / (validData.length - 1)) * innerWidth
            const y = padding.top + innerHeight - ((d as any)[metric] - min) / range * innerHeight
            return (
              <circle
                key={`dot-${metric}-${i}`}
                cx={x}
                cy={y}
                r={4}
                fill={metricConfig[metric].color}
                stroke="rgba(0,0,0,0.3)"
                strokeWidth={2}
                className="transition-all duration-300 hover:r-6"
              />
            )
          })
        })}

        {/* X轴标签 */}
        {data.filter((_, i) => i % Math.ceil(data.length / 5) === 0 || i === data.length - 1).map((d, i) => {
          const originalIndex = data.indexOf(d)
          const x = padding.left + (originalIndex / (data.length - 1)) * innerWidth
          return (
            <text
              key={`x-${i}`}
              x={x}
              y={chartHeight - 8}
              textAnchor="middle"
              className="fill-gray-500 text-[10px]"
            >
              {d.date}
            </text>
          )
        })}
      </svg>

      {/* 图例 */}
      <div className="flex justify-center gap-4 mt-2 flex-wrap">
        {metrics.map(metric => (
          <div key={metric} className="flex items-center gap-1.5 text-xs">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: metricConfig[metric].color }}
            />
            <span className="text-gray-400">{metricConfig[metric].label}</span>
            <span className="text-gray-500">({metricConfig[metric].unit})</span>
          </div>
        ))}
      </div>
    </div>
  )
}
