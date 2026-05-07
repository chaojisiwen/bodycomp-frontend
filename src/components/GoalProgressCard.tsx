/**
 * 体成分目标进度卡片
 *
 * 让用户自选一项体成分指标作为追踪目标，
 * 展示当前值 vs 目标值的进度。
 */

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Target, TrendingDown, TrendingUp, ChevronDown, Settings2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useLatestBodyRecord } from '@/stores/bodyStore'
import { usePlanTarget, useSetPlanTarget } from '@/stores/planStore'
import { BODY_GOAL_CONFIG, type BodyGoalMetric } from '@/stores/planStore'

/** 计算进度百分比 */
function calculateProgress(current: number, target: number, start: number, direction: 'decrease' | 'increase'): number {
  if (direction === 'decrease') {
    // 减少类：体重/体脂/腰围 → 越小越好
    // 进度 100% = 达到目标值或更低
    if (current <= target) return 100
    if (start <= target) return 0
    const progress = ((start - current) / (start - target)) * 100
    return Math.max(0, Math.min(100, Math.round(progress)))
  } else {
    // 增加类：肌肉量/蛋白质 → 越大越好
    if (current >= target) return 100
    if (start >= target) return 0
    const progress = ((current - start) / (target - start)) * 100
    return Math.max(0, Math.min(100, Math.round(progress)))
  }
}

/** 获取指标颜色 */
function getMetricColor(metric: BodyGoalMetric): string {
  const colors: Record<BodyGoalMetric, string> = {
    weight: 'emerald',
    body_fat: 'blue',
    waist: 'orange',
    muscle_mass: 'purple',
    visceral_fat: 'red',
    fat_free_mass: 'cyan',
    protein_percent: 'pink',
    subcutaneous_fat: 'yellow',
    water_content: 'sky',
    bone_mass: 'slate',
  }
  return colors[metric] || 'emerald'
}

export function GoalProgressCard() {
  const latestRecord = useLatestBodyRecord()
  const planTarget = usePlanTarget()

  const [isEditing, setIsEditing] = useState(false)

  const metric = planTarget.bodyGoalMetric
  const target = planTarget.bodyGoalTarget
  const start = planTarget.bodyGoalStart
  const config = metric ? BODY_GOAL_CONFIG[metric] : null

  // 当前值（从最新记录取）
  const currentValue = metric && latestRecord ? (latestRecord as any)[metric] : undefined

  // 进度
  const progress =
    metric && currentValue !== undefined && target !== undefined && start !== undefined
      ? calculateProgress(currentValue, target, start, config!.direction)
      : 0

  // 差值
  const diff = currentValue !== undefined && target !== undefined
    ? Math.abs(currentValue - target)
    : 0

  // 颜色
  const color = metric ? getMetricColor(metric) : 'emerald'
  const colorClass = `text-${color}-400`
  const bgClass = `bg-${color}-500/10`
  const borderClass = `border-${color}-500/20`
  const barClass = `bg-${color}-500`

  // 未设置目标 → 显示引导
  if (!metric) {
    return (
      <>
        <Card
          className="bg-gradient-to-r from-white/5 to-white/[0.02] border-white/10 cursor-pointer hover:border-white/20 transition-colors"
          onClick={() => setIsEditing(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <Target className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">设定体成分目标</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  选择一项指标追踪进度（体重/体脂/腰围等）
                </p>
              </div>
              <Settings2 className="w-4 h-4 text-gray-500" />
            </div>
          </CardContent>
        </Card>
        {/* 编辑弹层 — 完全脱离 Card DOM 树，用 Portal 挂载到 body */}
        {isEditing && <GoalEditor onClose={() => setIsEditing(false)} />}
      </>
    )
  }

  return (
    <>
      <Card className={`${bgClass} ${borderClass} border`}>
        <CardContent className="p-4">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className={`w-4 h-4 ${colorClass}`} />
              <span className={`text-sm font-medium ${colorClass}`}>
                {config?.label}目标
              </span>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>

          {/* 数值对比 */}
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-2xl font-bold text-white">
                {currentValue !== undefined ? currentValue : '--'}
                <span className="text-sm font-normal text-gray-500 ml-1">{config?.unit}</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                当前{config?.label}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-400">
                {target !== undefined ? target : '--'}
                <span className="text-xs font-normal text-gray-600 ml-1">{config?.unit}</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                目标值
              </p>
            </div>
          </div>

          {/* 进度条 */}
          <div className="mb-2">
            <Progress value={progress} className="h-2.5" indicatorClassName={barClass} />
          </div>

          {/* 底部信息 */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">
              进度 <span className={`font-semibold ${colorClass}`}>{progress}%</span>
            </span>
            {currentValue !== undefined && target !== undefined && (
              <span className="text-gray-500">
                {config?.direction === 'decrease' ? (
                  currentValue <= target ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" /> 已达标！
                    </span>
                  ) : (
                    <span className="text-gray-500">
                      还差 <span className={colorClass}>{diff.toFixed(1)}</span> {config?.unit}
                    </span>
                  )
                ) : (
                  currentValue >= target ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> 已达标！
                    </span>
                  ) : (
                    <span className="text-gray-500">
                      还差 <span className={colorClass}>{diff.toFixed(1)}</span> {config?.unit}
                    </span>
                  )
                )}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
      {/* 编辑弹层 — 完全脱离 Card DOM 树，用 Portal 挂载到 body */}
      {isEditing && (
        <GoalEditor
          currentMetric={metric}
          currentTarget={target}
          onClose={() => setIsEditing(false)}
        />
      )}
    </>
  )
}

// ============================================================
// 目标编辑器（内联弹层）
// ============================================================

interface GoalEditorProps {
  currentMetric?: BodyGoalMetric
  currentTarget?: number
  onClose: () => void
}

function GoalEditor({ currentMetric, currentTarget, onClose }: GoalEditorProps) {
  const latestRecord = useLatestBodyRecord()
  const planTarget = usePlanTarget()
  const setPlanTarget = useSetPlanTarget()

  const [selectedMetric, setSelectedMetric] = useState<BodyGoalMetric | undefined>(currentMetric)
  const [targetValue, setTargetValue] = useState<string>(currentTarget?.toString() ?? '')
  const [showPicker, setShowPicker] = useState(!currentMetric)

  const currentValue = selectedMetric && latestRecord ? (latestRecord as any)[selectedMetric] : undefined

  const handleSave = () => {
    if (!selectedMetric || !targetValue) return

    const target = Number(targetValue)
    if (isNaN(target)) return

    // 起始值 = 当前最新记录值（如果没有则用目标值）
    const start = currentValue !== undefined ? Number(currentValue) : target

    setPlanTarget({
      ...planTarget,
      bodyGoalMetric: selectedMetric,
      bodyGoalTarget: target,
      bodyGoalStart: start,
      bodyGoalSetAt: new Date().toISOString().split('T')[0],
    })
    onClose()
  }

  const handleClear = () => {
    const { bodyGoalMetric, bodyGoalTarget, bodyGoalStart, bodyGoalSetAt, ...rest } = planTarget as any
    setPlanTarget(rest)
    onClose()
  }

  const modal = (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-gray-900 rounded-2xl border border-white/10 p-5 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Target className="w-5 h-5 text-emerald-400" />
        {currentMetric ? '修改追踪目标' : '设定体成分目标'}
      </h3>

        {/* 指标选择 */}
        <div className="mb-4">
          <label className="text-xs text-gray-500 mb-2 block">选择追踪指标</label>
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
          >
            <span className="text-sm">
              {selectedMetric ? BODY_GOAL_CONFIG[selectedMetric].label : '点击选择指标'}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showPicker ? 'rotate-180' : ''}`} />
          </button>

          {showPicker && (
            <div className="mt-2 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
              {(Object.keys(BODY_GOAL_CONFIG) as BodyGoalMetric[]).map((key) => {
                const cfg = BODY_GOAL_CONFIG[key]
                const val = latestRecord ? (latestRecord as any)[key] : undefined
                const isSelected = selectedMetric === key
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedMetric(key)
                      setShowPicker(false)
                      // 自动填充当前值作为默认目标
                      if (val !== undefined && !targetValue) {
                        setTargetValue(val.toString())
                      }
                    }}
                    className={`text-left px-3 py-2.5 rounded-xl text-sm transition-all ${
                      isSelected
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                        : 'bg-white/5 border border-transparent hover:bg-white/10 text-gray-300'
                    }`}
                  >
                    <div className="font-medium">{cfg.label}</div>
                    {val !== undefined && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        当前 {val} {cfg.unit}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 目标值输入 */}
        {selectedMetric && (
          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-2 block">
              目标值（{BODY_GOAL_CONFIG[selectedMetric].unit}）
              {BODY_GOAL_CONFIG[selectedMetric].direction === 'decrease' ? '（减少）' : '（增加）'}
            </label>
            <input
              type="number"
              step="0.1"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder={`当前 ${currentValue !== undefined ? currentValue : '--'} ${BODY_GOAL_CONFIG[selectedMetric].unit}`}
              className="w-full bg-white/5 rounded-xl px-3 py-2.5 text-sm border border-white/10 focus:border-emerald-400 focus:outline-none transition-colors"
            />
            {currentValue !== undefined && targetValue && (
              <p className="text-xs text-gray-500 mt-1.5">
                {Number(targetValue) < currentValue ? (
                  <span className="text-blue-400">目标比当前低 {(currentValue - Number(targetValue)).toFixed(1)} {BODY_GOAL_CONFIG[selectedMetric].unit}</span>
                ) : Number(targetValue) > currentValue ? (
                  <span className="text-purple-400">目标比当前高 {(Number(targetValue) - currentValue).toFixed(1)} {BODY_GOAL_CONFIG[selectedMetric].unit}</span>
                ) : (
                  <span className="text-emerald-400">目标与当前值相同</span>
                )}
              </p>
            )}
          </div>
        )}

        {/* 按钮 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20 transition-colors text-sm"
          >
            取消
          </button>
          {currentMetric && (
            <button
              onClick={handleClear}
              className="flex-1 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm"
            >
              清除目标
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!selectedMetric || !targetValue}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-white/10 disabled:text-gray-500 transition-colors text-sm font-medium"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
