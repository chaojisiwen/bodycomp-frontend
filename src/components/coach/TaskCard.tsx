import { memo } from 'react'

// 任务卡片
const TaskCard = memo(function TaskCard({
  label, value, icon: Icon, colorClass, bgClass, onClick,
}: {
  label: string; value: number; icon: React.ElementType; colorClass: string; bgClass: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 hover:bg-slate-800/70 transition-colors text-left active:scale-95"
    >
      <div className={`w-8 h-8 rounded-lg ${bgClass} flex items-center justify-center mb-2`}>
        <Icon className={`w-4 h-4 ${colorClass}`} />
      </div>
      <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
    </button>
  )
})

export default TaskCard
