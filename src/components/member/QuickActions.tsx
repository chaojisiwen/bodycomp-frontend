import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Play } from 'lucide-react'

const QuickActions = memo(function QuickActions() {
  const navigate = useNavigate()

  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={() => navigate('/member/recognize')}
        className="glass rounded-2xl p-5 text-left card-hover btn-press group"
      >
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
          <Camera className="w-7 h-7 text-white" />
        </div>
        <p className="font-semibold">拍照识别食物</p>
        <p className="text-sm text-gray-400">AI智能分析</p>
      </button>
      <button
        onClick={() => navigate('/member/exercise?addModal=true')}
        className="glass rounded-2xl p-5 text-left card-hover btn-press group"
      >
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
          <Play className="w-7 h-7 text-white" />
        </div>
        <p className="font-semibold">记录运动</p>
        <p className="text-sm text-gray-400">追踪每日消耗</p>
      </button>
    </div>
  )
})

export default QuickActions
