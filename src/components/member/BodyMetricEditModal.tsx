import { X } from 'lucide-react'

interface BodyMetricEditModalProps {
  editingMetric: { id: string; name: string; value: string; unit: string } | null
  onClose: () => void
  onChange: (value: string) => void
  onSave: () => void
}

function BodyMetricEditModal({
  editingMetric,
  onClose,
  onChange,
  onSave,
}: BodyMetricEditModalProps) {
  if (!editingMetric) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end pb-[144px]">
      <div className="w-full bg-gray-900 rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-6" />
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">编辑{editingMetric.name}</h3>
          <button onClick={onClose} className="text-gray-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <label className="text-sm text-gray-400 block mb-2">
            {editingMetric.name} {editingMetric.unit && `(${editingMetric.unit})`}
          </label>
          <input
            type="number"
            step="0.1"
            placeholder={`请输入${editingMetric.name}`}
            value={editingMetric.value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-white/10 rounded-xl py-4 px-4 text-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            autoFocus
          />
        </div>

        <div className="space-y-3">
          <button
            onClick={onSave}
            disabled={!editingMetric.value}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            保存修改
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}


export default BodyMetricEditModal
