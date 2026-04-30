import { ChevronRight } from 'lucide-react'
import BodyMetricCard from './BodyMetricCard'
import type { BodyMetric } from '@/hooks/useBodyData'

interface BodyMetricsGridProps {
  showAllMetrics: boolean
  displayedMetrics: BodyMetric[]
  latestBody: any
  onToggleAll: () => void
  onEditMetric: (metric: BodyMetric) => void
}

function BodyMetricsGrid({
  showAllMetrics,
  displayedMetrics,
  latestBody,
  onToggleAll,
  onEditMetric,
}: BodyMetricsGridProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">身体指标</h3>
        <button
          onClick={onToggleAll}
          className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
        >
          {showAllMetrics ? '收起' : '查看全部'} <ChevronRight className={`w-4 h-4 transition-transform ${showAllMetrics ? 'rotate-90' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {displayedMetrics.map((metric) => (
          <BodyMetricCard
            key={metric.id}
            metric={metric}
            latestBody={latestBody}
            onEdit={onEditMetric}
          />
        ))}
      </div>
    </div>
  )
}


export default BodyMetricsGrid
