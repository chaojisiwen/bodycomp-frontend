import { memo } from 'react'
import type { WarningCard as WarningCardType } from '@/hooks/useCoachDashboard'

// 预警卡片
const WarningCard = memo(function WarningCard({
  warning, onHandle, onNavigate,
}: {
  warning: WarningCardType; onHandle: () => void; onNavigate: () => void
}) {
  const config = {
    danger: {
      bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-500',
      text: 'text-red-300', label: '严重', labelBg: 'bg-red-500/20', labelText: 'text-red-400',
      btnBg: 'bg-red-500/20', btnText: 'text-red-400',
      pulse: true,
    },
    warning: {
      bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-500',
      text: 'text-orange-300', label: '警告', labelBg: 'bg-orange-500/20', labelText: 'text-orange-400',
      btnBg: 'bg-orange-500/20', btnText: 'text-orange-400',
      pulse: false,
    },
    info: {
      bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dot: 'bg-yellow-500',
      text: 'text-yellow-300', label: '关注', labelBg: 'bg-yellow-500/20', labelText: 'text-yellow-400',
      btnBg: 'bg-yellow-500/20', btnText: 'text-yellow-400',
      pulse: false,
    },
    done: {
      bg: 'bg-slate-800/50', border: 'border-slate-700/50', dot: 'bg-slate-500',
      text: 'text-slate-400', label: '已处理', labelBg: 'bg-slate-500/20', labelText: 'text-slate-400',
      btnBg: 'bg-slate-500/20', btnText: 'text-slate-400',
      pulse: false,
    },
  }[warning.level]

  return (
    <div className={`${config.bg} border ${config.border} rounded-xl p-3 flex items-start gap-3`}>
      <div className={`w-2 h-2 rounded-full ${config.dot} mt-1.5 shrink-0 ${config.pulse ? 'animate-pulse' : ''}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium truncate ${config.text}`}>{warning.title}</p>
          <span className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 ${config.labelBg} ${config.labelText}`}>
            {config.label}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{warning.time}</p>
      </div>
      {warning.level !== 'done' ? (
        <button onClick={onHandle} className={`px-3 py-1 text-xs rounded-lg shrink-0 ${config.btnBg} ${config.btnText}`}>
          处理
        </button>
      ) : (
        <button onClick={onNavigate} className={`px-3 py-1 text-xs rounded-lg shrink-0 ${config.btnBg} ${config.btnText}`}>
          详情
        </button>
      )}
    </div>
  )
})

export default WarningCard
