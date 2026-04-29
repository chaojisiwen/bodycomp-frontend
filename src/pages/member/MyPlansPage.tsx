/**
 * 会员端 - 我的训练计划页面
 *
 * 显示教练分配的训练计划，支持查看详情和每日训练状态
 */

import { useState, useEffect } from 'react'
import { Calendar, Target, ChevronRight, CheckCircle2, Circle, Minus, Dumbbell } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useAssignedPlanStore } from '@/stores/assignedPlanStore'
import { useAuth } from '@/contexts/AuthContext'
import { Modal } from '@/components/common/Modal'
import type { IAssignedPlan, TrainingItem } from '@/cloudbase/types'

const PLAN_TYPE_LABELS: Record<string, string> = {
  'fat-loss': '减脂计划',
  'muscle-gain': '增肌计划',
  'maintain': '维持计划',
  'custom': '自定义计划',
}

// 获取今日对应的训练项
function getTodayTraining(plan: IAssignedPlan): TrainingItem | null {
  if (!plan.training || plan.training.length === 0) return null

  const today = new Date()
  const dayOfWeek = today.getDay() // 0=周日
  const dayMap: Record<number, string> = {
    0: '周日', 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五', 6: '周六',
  }
  const todayLabel = dayMap[dayOfWeek]

  return plan.training.find((t) => t.day === todayLabel) || null
}

// 计算计划剩余天数
function getDaysLeft(plan: IAssignedPlan): number | null {
  if (!plan.end_date) return null
  const now = new Date()
  const end = new Date(plan.end_date)
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
}

// 计算计划开始至今的天数
function getDaysPassed(plan: IAssignedPlan): number {
  const start = new Date(plan.start_date || plan.assigned_at)
  const now = new Date()
  return Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
}

export function MyPlansPage() {
  const { user } = useAuth()
  const { plans, isLoading, fetchPlans } = useAssignedPlanStore()
  const [selectedPlan, setSelectedPlan] = useState<IAssignedPlan | null>(null)

  const memberId = user?.id || ''

  useEffect(() => {
    console.log('[MyPlansPage] 当前用户:', user)
    console.log('[MyPlansPage] 会员ID:', memberId)
    if (memberId) {
      fetchPlans(memberId)
    } else {
      console.warn('[MyPlansPage] 用户ID为空，无法获取计划')
    }
  }, [memberId, user?.id])

  // 没有计划时的占位图
  if (!isLoading && plans.length === 0) {
    return (
      <div className="space-y-4 pb-8">
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-6">
            <Dumbbell className="w-10 h-10 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">暂无计划</h3>
          <p className="text-sm text-gray-500">
            教练为你分配计划后<br />会在这里显示
          </p>
        </div>

        <Card className="p-5 bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-sm">什么是训练计划？</p>
              <p className="text-xs text-gray-400 mt-0.5">
                教练根据你的身体数据和目标<br />为你定制的每日训练和饮食方案
              </p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  const activePlan = plans.find((p) => p.status === 'active') || plans[0]

  // 调试信息（开发时可见）
  const debugInfo = {
    memberId: memberId || '空',
    plansCount: plans.length,
    isLoading,
    firstPlan: plans[0] ? {
      name: plans[0].plan_name,
      status: plans[0].status,
      trainingCount: plans[0].training?.length
    } : null
  }

  return (
    <div className="space-y-4 pb-8">
      {/* 调试信息 */}
      {isLoading && (
        <div className="text-xs text-gray-500 p-2 bg-yellow-500/10 rounded">
          正在加载计划... (memberId: {debugInfo.memberId})
        </div>
      )}

      {/* Header */}
      <div className="text-center py-2">
        <h2 className="text-xl font-bold mb-1">我的计划</h2>
        <p className="text-sm text-gray-400">教练为你定制的专属方案</p>
      </div>

      {/* 当前计划卡片 */}
      {activePlan && (
        <Card
          className="p-5 bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border border-emerald-500/20 cursor-pointer hover:border-emerald-500/40 transition-colors"
          onClick={() => setSelectedPlan(activePlan)}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                  {PLAN_TYPE_LABELS[activePlan.plan_type] || '训练计划'}
                </span>
                {getDaysLeft(activePlan) !== null && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs">
                    剩余 {getDaysLeft(activePlan)} 天
                  </span>
                )}
              </div>
              <h3 className="font-bold text-lg">{activePlan.plan_name}</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                第 {getDaysPassed(activePlan)} / {activePlan.duration * 7} 天
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500 mt-1" />
          </div>

          {/* 热量目标 */}
          {(activePlan.calories_min || activePlan.calories_max) && (
            <div className="grid grid-cols-3 gap-3 mb-4 p-3 rounded-xl bg-black/20">
              <div className="text-center">
                <p className="text-sm font-bold text-white">
                  {activePlan.calories_min || 0}~{activePlan.calories_max || 0}
                </p>
                <p className="text-[10px] text-gray-400">目标热量(kcal)</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-blue-400">{activePlan.protein || 0}g</p>
                <p className="text-[10px] text-gray-400">蛋白质</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-yellow-400">{activePlan.fat || 0}g</p>
                <p className="text-[10px] text-gray-400">脂肪</p>
              </div>
            </div>
          )}

          {/* 今日训练 */}
          {(() => {
            const todayTraining = getTodayTraining(activePlan)
            return (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-black/20">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  todayTraining?.type === '休息日' ? 'bg-gray-500/20' : 'bg-blue-500/20'
                }`}>
                  {todayTraining?.type === '休息日'
                    ? <Minus className="w-5 h-5 text-gray-400" />
                    : <Dumbbell className="w-5 h-5 text-blue-400" />
                  }
                </div>
                <div>
                  <p className="text-sm font-medium">
                    今日训练：{todayTraining ? `${todayTraining.type} · ${todayTraining.detail}` : '暂无安排'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {todayTraining?.detail || '教练暂未安排'}
                  </p>
                </div>
              </div>
            )
          })()}
        </Card>
      )}

      {/* 历史计划 */}
      {plans.length > 1 && (
        <div>
          <h4 className="font-semibold text-sm text-gray-400 mb-3">历史计划</h4>
          <div className="space-y-3">
            {plans.slice(1).map((plan) => (
              <Card
                key={plan._id}
                className="p-4 bg-slate-800/60 border border-white/10 cursor-pointer hover:bg-slate-800 transition-colors"
                onClick={() => setSelectedPlan(plan)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{plan.plan_name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 text-xs">
                        {PLAN_TYPE_LABELS[plan.plan_type] || plan.plan_type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(plan.assigned_at).toLocaleDateString('zh-CN')} · {plan.duration} 周
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {plan.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-500" />
                    )}
                    <span className="text-xs text-gray-500">{plan.duration * 7}天</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 计划详情弹窗 */}
      <Modal
        open={!!selectedPlan}
        onOpenChange={(open) => { if (!open) setSelectedPlan(null) }}
        title={selectedPlan?.plan_name || '计划详情'}
      >
        {selectedPlan && (
          <div className="space-y-5">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '计划类型', value: PLAN_TYPE_LABELS[selectedPlan.plan_type] || selectedPlan.plan_type },
                { label: '计划周期', value: `${selectedPlan.duration} 周` },
                { label: '目标体重', value: selectedPlan.target_weight ? `${selectedPlan.target_weight} kg` : '-' },
                { label: '目标体脂', value: selectedPlan.target_fat ? `${selectedPlan.target_fat}%` : '-' },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-xl bg-slate-700/50">
                  <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                  <p className="text-sm font-semibold">{item.value}</p>
                </div>
              ))}
            </div>

            {/* 每日训练 */}
            {selectedPlan.training && selectedPlan.training.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-3">每日训练安排</p>
                <div className="space-y-2">
                  {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((day) => {
                    const item = selectedPlan.training!.find((t) => t.day === day)
                    const today = new Date().getDay()
                    const dayNum = { '周日': 0, '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6 }[day]
                    const isToday = today === dayNum

                    return (
                      <div
                        key={day}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                          isToday ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-slate-700/50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          item?.type === '休息日' ? 'bg-gray-600' : 'bg-blue-500/20'
                        }`}>
                          <Calendar className={`w-4 h-4 ${isToday ? 'text-emerald-400' : 'text-gray-400'}`} />
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${isToday ? 'text-emerald-300' : ''}`}>
                            {day}
                            {isToday && <span className="ml-2 text-xs text-emerald-400 font-normal">(今日)</span>}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium">{item?.type || '暂无'}</p>
                          <p className="text-[10px] text-gray-500">{item?.detail || ''}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 营养目标 */}
            {(selectedPlan.calories_min || selectedPlan.protein) && (
              <div>
                <p className="text-sm font-semibold mb-3">营养目标</p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: '热量', value: `${selectedPlan.calories_min || 0}-${selectedPlan.calories_max || 0}kcal`, color: 'text-white' },
                    { label: '蛋白质', value: `${selectedPlan.protein || 0}g`, color: 'text-blue-400' },
                    { label: '脂肪', value: `${selectedPlan.fat || 0}g`, color: 'text-yellow-400' },
                    { label: '碳水', value: `${selectedPlan.carbs || 0}g`, color: 'text-orange-400' },
                  ].map((item) => (
                    <div key={item.label} className="p-2 rounded-lg bg-slate-700/50">
                      <p className={`text-sm font-bold ${item.color}`}>{item.value.split('kcal')[0]}</p>
                      <p className="text-[10px] text-gray-400">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 备注 */}
            {selectedPlan.notes && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-amber-400 font-medium mb-1">教练备注</p>
                <p className="text-sm text-gray-300">{selectedPlan.notes}</p>
              </div>
            )}

            {/* 关闭按钮 */}
            <button
              onClick={() => setSelectedPlan(null)}
              className="w-full py-3 rounded-xl bg-slate-700 text-gray-300 font-medium hover:bg-slate-600 transition-colors"
            >
              关闭
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
