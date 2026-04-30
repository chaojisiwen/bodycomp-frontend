import { X } from 'lucide-react'

interface BodyAddModalProps {
  visible: boolean
  onClose: () => void
  manualRecord: Record<string, string>
  onRecordChange: (key: string, value: string) => void
  onSave: () => void
  hasAtLeastOneMetric: boolean
}

const fields = [
  { key: 'weight', label: '体重 (kg)', placeholder: '如：72.5', required: true },
  { key: 'bmi', label: 'BMI', placeholder: '如：22.4', required: false },
  { key: 'fat', label: '体脂率 (%)', placeholder: '如：18.5', required: false },
  { key: 'muscle', label: '肌肉量 (kg)', placeholder: '如：58.2', required: false },
  { key: 'waist', label: '腰围 (cm)', placeholder: '如：82', required: false },
  { key: 'visceral', label: '内脏脂肪', placeholder: '如：8', required: false },
  { key: 'water', label: '体水分 (%)', placeholder: '如：55.2', required: false },
  { key: 'bone', label: '骨量 (kg)', placeholder: '如：2.8', required: false },
  { key: 'metabolism', label: '基础代谢 (kcal)', placeholder: '如：1680', required: false },
  { key: 'protein', label: '蛋白质 (%)', placeholder: '如：17.2', required: false },
  { key: 'bodyage', label: '身体年龄 (岁)', placeholder: '如：28', required: false },
  { key: 'subfat', label: '皮下脂肪 (%)', placeholder: '如：12.5', required: false },
  { key: 'fatfree', label: '去脂体重 (kg)', placeholder: '如：54.2', required: false },
]

function BodyAddModal({
  visible,
  onClose,
  manualRecord,
  onRecordChange,
  onSave,
  hasAtLeastOneMetric,
}: BodyAddModalProps) {
  if (!visible) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end pb-[144px]">
      <div className="w-full bg-gray-900 rounded-t-3xl p-6 max-h-[85vh] flex flex-col">
        <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-6 flex-shrink-0" />
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <h3 className="text-lg font-semibold">手动添加记录</h3>
          <button onClick={onClose} className="text-gray-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto flex-1 min-h-0 mb-6">
          {fields.map(field => (
            <div key={field.key}>
              <label className="text-sm text-gray-400 block mb-2">
                {field.label}{field.required ? ' *' : ''}
              </label>
              <input
                type="number"
                step="0.1"
                placeholder={field.placeholder}
                value={manualRecord[field.key] || ''}
                onChange={(e) => onRecordChange(field.key, e.target.value)}
                className="w-full bg-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          ))}
        </div>

        <div className="flex-shrink-0 pt-4 pb-4 border-t border-white/10 -mx-6 px-6 bg-gray-900">
          <button
            onClick={onSave}
            disabled={!hasAtLeastOneMetric}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            保存记录
          </button>
          <button
            onClick={onClose}
            className="w-full mt-3 py-3 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}


export default BodyAddModal
