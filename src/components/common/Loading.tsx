/**
 * Loading Skeleton 组件
 *
 * 用于数据加载时的占位显示
 */

import { cn } from '@/utils'

interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-slate-700/50',
        className
      )}
      style={style}
    />
  )
}

// ============================================================
// 常用 Skeleton 模式
// ============================================================

/**
 * 卡片骨架屏
 */
export function CardSkeleton() {
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-20 w-full mb-3" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  )
}

/**
 * 列表骨架屏
 */
export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg">
          <Skeleton className="w-12 h-12 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  )
}

/**
 * 图表骨架屏
 */
export function ChartSkeleton() {
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <Skeleton className="h-4 w-24 mb-4" />
      <div className="h-32 flex items-end gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2">
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-3 w-8" />
      </div>
    </div>
  )
}

/**
 * 数字卡片骨架屏
 */
export function StatCardSkeleton() {
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <Skeleton className="h-5 w-5 mb-2" />
      <Skeleton className="h-8 w-16 mb-1" />
      <Skeleton className="h-3 w-12" />
    </div>
  )
}

/**
 * 全屏加载
 */
export function FullPageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-400 text-sm">加载中...</p>
    </div>
  )
}

/**
 * 内联加载
 */
export function InlineLoader({ text = '加载中...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8">
      <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-slate-400 text-sm">{text}</span>
    </div>
  )
}
