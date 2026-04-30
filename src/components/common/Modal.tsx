/**
 * Modal 弹窗组件
 *
 * 基于 Radix UI Dialog
 */

import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/utils'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  showClose?: boolean
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  showClose = true,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200" />
        <Dialog.Content
          className={cn(
            'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
            'w-[90vw] max-w-md max-h-[85vh] overflow-y-auto',
            'bg-slate-900 rounded-2xl border border-slate-700/50 shadow-xl',
            'animate-in fade-in zoom-in-95 duration-200',
            className
          )}
        >
          {/* Header */}
          {(title || showClose) && (
            <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
              <div>
                {title && (
                  <Dialog.Title className="text-lg font-semibold text-white">
                    {title}
                  </Dialog.Title>
                )}
                {description && (
                  <Dialog.Description className="text-sm text-slate-400 mt-1">
                    {description}
                  </Dialog.Description>
                )}
              </div>
              {showClose && (
                <Dialog.Close className="p-2 rounded-lg hover:bg-slate-800 transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </Dialog.Close>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ============================================================
// 底部抽屉
// ============================================================

interface DrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  children: React.ReactNode
  className?: string
  showClose?: boolean
  showHandle?: boolean  // 是否显示拖动条，默认 true
}

export function Drawer({
  open,
  onOpenChange,
  title,
  children,
  className,
  showClose = false,
  showHandle = true,
}: DrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200" />
        <Dialog.Content
          className={cn(
            'fixed bottom-0 left-0 right-0 z-50',
            'max-h-[90vh] overflow-y-auto rounded-t-2xl',
            'bg-slate-900 border-t border-slate-700/50',
            'animate-in slide-in-from-bottom duration-300',
            className
          )}
        >
          {/* 拖动条 */}
          {showHandle && (
            <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mt-3 mb-2" />
          )}

          {/* Header */}
          {(title || showClose) && (
            <div className={cn('flex items-center justify-between px-5', showHandle ? '' : 'mt-3')}>
              {title && (
                <Dialog.Title className="text-lg font-semibold text-white">
                  {title}
                </Dialog.Title>
              )}
              {showClose && (
                <Dialog.Close className="ml-auto p-2 rounded-lg hover:bg-slate-800 transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </Dialog.Close>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-5 pb-[calc(36px+env(safe-area-inset-bottom,16px))]">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
