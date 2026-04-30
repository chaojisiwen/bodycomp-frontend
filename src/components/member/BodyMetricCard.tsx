import { memo } from 'react'
import { Card } from '@/components/ui/card'
import { Pencil } from 'lucide-react'
import { getLatestMetricValue, getTrendIcon, getTrendColor } from '@/hooks/useBodyData'
import type { BodyMetric } from '@/hooks/useBodyData'

interface BodyMetricCardProps {
  metric: BodyMetric
  latestBody: any
  onEdit: (metric: BodyMetric) => void
}

const BodyMetricCard = memo(function BodyMetricCard({ metric, latestBody, onEdit }: BodyMetricCardProps) {
  return (
    <Card
      className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
      onClick={() => onEdit(metric)}
    >
      <div className="flex items-center gap-2 text-gray-400 mb-2">
        {metric.icon}
        <span className="text-sm">{metric.name}</span>
        <Pencil className="w-3 h-3 ml-auto text-gray-500" />
      </div>
      <div className="flex items-end gap-1 mb-1">
        <span className="text-2xl font-bold">{getLatestMetricValue(metric.id, latestBody)}</span>
        <span className="text-sm text-gray-400 mb-1">{metric.unit}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">正常 {metric.normal}</span>
        <div className="flex items-center gap-1">
          {getTrendIcon(metric.trend)}
          <span className={`text-xs ${getTrendColor(metric.trend, metric.id)}`}>
            {metric.change > 0 ? '+' : ''}{metric.change}
          </span>
        </div>
      </div>
    </Card>
  )
})

export default BodyMetricCard
