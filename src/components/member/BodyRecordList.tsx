import { Card } from '@/components/ui/card'
import { Calendar } from 'lucide-react'
import { metricLabels, metricUnits } from '@/hooks/useBodyData'
import type { BodyRecord } from '@/hooks/useBodyData'

interface BodyRecordListProps {
  records: BodyRecord[]
}

function BodyRecordList({ records }: BodyRecordListProps) {
  return (
    <div>
      <h3 className="font-semibold mb-3">近期记录</h3>
      <Card className="p-0 divide-y divide-white/5">
        {records.map((record) => {
          // 只保留有值的字段
          const filledMetrics = Object.entries(record)
            .filter(([key, value]) => key !== 'id' && key !== 'date' && value !== 0 && value !== undefined && value !== null)
            .map(([key, value]) => ({
              key,
              value: Math.round(Number(value) * 10) / 10,
              label: metricLabels[key] || key,
              unit: metricUnits[key] || '',
            }))

          return (
            <div key={record.id} className="p-4 hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-5 h-5 text-gray-500" />
                <span className="text-gray-300">{record.date}</span>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                {filledMetrics.map(m => (
                  <span key={m.key} className="text-gray-300">
                    {m.label} <span className="font-medium text-white">{m.value}</span>{m.unit}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
        {records.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            暂无记录
          </div>
        )}
      </Card>
    </div>
  )
}


export default BodyRecordList
