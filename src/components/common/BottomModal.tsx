import { X } from 'lucide-react'

interface BottomModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function BottomModal({ open, onClose, title, children }: BottomModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center">
      <div className="w-full max-w-lg bg-[#1a1a2e] rounded-t-3xl p-6 pb-[144px] animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
