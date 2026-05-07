import { ChevronRight } from 'lucide-react'

interface CoachMenuItemData {
  icon: React.ReactNode
  label: string
  badge?: string | number
  description?: string
  onClick?: () => void
}

export function CoachMenuItem({ icon, label, badge, description, onClick }: CoachMenuItemData) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
    >
      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 text-left">
        <span className="font-medium">{label}</span>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      {badge && (
        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
          {badge}
        </span>
      )}
      <ChevronRight className="w-5 h-5 text-gray-500" />
    </button>
  )
}
