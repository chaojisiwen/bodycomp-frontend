/**
 * Error Boundary 组件
 *
 * 捕获子组件的 JavaScript 错误，防止整页崩溃
 */

import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] 捕获到错误:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[200px] flex flex-col items-center justify-center p-6">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            页面出现了一些问题
          </h3>
          <p className="text-sm text-slate-400 mb-4 text-center max-w-xs">
            {this.state.error?.message || '发生了未知错误'}
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            重试
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// ============================================================
// 便捷包装组件
// ============================================================

/**
 * 带错误边界的卡片
 */
export function SafeCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <ErrorBoundary>
      <div className={className}>{children}</div>
    </ErrorBoundary>
  )
}

/**
 * 带错误边界的区块
 */
export function SafeSection({
  children,
  title,
}: {
  children: ReactNode
  title?: string
}) {
  return (
    <ErrorBoundary>
      {title && (
        <h2 className="text-sm font-medium text-slate-300 mb-3">{title}</h2>
      )}
      {children}
    </ErrorBoundary>
  )
}
