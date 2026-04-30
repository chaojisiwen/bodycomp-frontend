import { Card } from '@/components/ui/card'
import { X } from 'lucide-react'

interface BodyAnalysisResultProps {
  analysisResult: Partial<{
    weight: number
    bmi: number
    fat: number
    muscle: number
    waist: number
    visceral: number
    water: number
    bone: number
    metabolism: number
    protein: number
    bodyage: number
    subfat: number
    fatfree: number
  }> | null
  onClose: () => void
  onSave: () => void
}

function BodyAnalysisResult({
  analysisResult,
  onClose,
  onSave,
}: BodyAnalysisResultProps) {
  if (!analysisResult) return null

  const items: { key: keyof typeof analysisResult; label: string; unit: string }[] = [
    { key: 'weight', label: '体重', unit: 'kg' },
    { key: 'bmi', label: 'BMI', unit: '' },
    { key: 'fat', label: '体脂率', unit: '%' },
    { key: 'muscle', label: '肌肉量', unit: 'kg' },
    { key: 'waist', label: '腰围', unit: 'cm' },
    { key: 'visceral', label: '内脏脂肪', unit: '' },
    { key: 'water', label: '体水分', unit: '%' },
    { key: 'bone', label: '骨量', unit: 'kg' },
    { key: 'metabolism', label: '基础代谢', unit: 'kcal' },
    { key: 'protein', label: '蛋白质', unit: '%' },
    { key: 'bodyage', label: '身体年龄', unit: '岁' },
    { key: 'subfat', label: '皮下脂肪', unit: '%' },
    { key: 'fatfree', label: '去脂体重', unit: 'kg' },
  ]

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end pb-[144px]">
      <div className="w-full bg-gray-900 rounded-t-3xl p-6 max-h-[85vh] flex flex-col">
        <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-6 flex-shrink-0" />
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <h3 className="text-lg font-semibold">识别结果</h3>
          <button onClick={onClose} className="text-gray-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-4 flex-shrink-0">AI已识别出以下体成分数据，请确认是否保存：</p>

        <div className="grid grid-cols-2 gap-3 overflow-y-auto flex-1 min-h-0 mb-6">
          {items
            .filter(item => analysisResult[item.key] !== undefined && analysisResult[item.key] !== null)
            .map(item => (
              <Card key={item.key} className="p-4">
                <div className="text-sm text-gray-400 mb-1">{item.label}</div>
                <div className="text-2xl font-bold">
                  {analysisResult[item.key]}
                  {item.unit && <span className="text-sm font-normal text-gray-400"> {item.unit}</span>}
                </div>
              </Card>
            ))}
        </div>

        <div className="flex-shrink-0 pt-4 border-t border-white/10 -mx-6 px-6 bg-gray-900">
          <button
            onClick={onSave}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-semibold hover:opacity-90 transition-opacity"
          >
            保存到今日记录
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


export default BodyAnalysisResult
