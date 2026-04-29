import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, BookOpen, ChevronRight, Calendar, Users, Edit, Copy, Trash2, Target, Utensils, Dumbbell, X, RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/common/Modal'
import { usePlanStore, useFilteredPlans, usePlanCountByType, type IPlan, type IPlanForm } from '@/stores/planStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { coachApi } from '@/services/api'
import { assignPlan } from '@/cloudbase/services/coach'
import { useAuth } from '@/contexts/AuthContext'

export function PlanLibraryPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { 
    searchQuery, typeFilter, setSearchQuery, setTypeFilter, 
    fetchPlans, addPlan, updatePlan, deletePlan, copyPlan, getDefaultForm 
  } = usePlanStore()
  const { addNotification } = useNotificationStore()
  const filteredPlans = useFilteredPlans()
  const planCounts = usePlanCountByType()

  // ── 会员列表（从教练 API 真实获取）─────────────────────────────
  const [members, setMembers] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    coachApi.getMyMembers().then(res => {
      if (res.success && res.data) {
        setMembers(res.data.map(m => ({
          id: m.id,
          name: m.name || '未知用户',
        })))
      }
    })
  }, [])

  // 新建/编辑方案弹窗
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<IPlan | null>(null)
  const [planForm, setPlanForm] = useState<IPlanForm>(getDefaultForm())

  // 删除确认弹窗
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingPlan, setDeletingPlan] = useState<IPlan | null>(null)

  // 操作状态（三按钮模式）
  const [actionPlanId, setActionPlanId] = useState<string | null>(null)

  // 查看方案使用会员弹窗
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [selectedPlanForMembers, setSelectedPlanForMembers] = useState<IPlan | null>(null)
  const [planMembers, setPlanMembers] = useState<{ memberId: string; memberName: string; assignedAt: string }[]>([])
  const [planMembersLoading, setPlanMembersLoading] = useState(false)

  // 组件挂载时拉取方案数据
  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  // ── 方案执行进度（按 plan id 缓存）────────────────────────────────
  const [planExecutions, setPlanExecutions] = useState<Record<string, IPlan['executions']>>({})
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshTime, setLastRefreshTime] = useState<string>('')

  // 获取执行进度
  const fetchExecutions = async () => {
    setIsRefreshing(true)
    const executions: Record<string, IPlan['executions']> = {}
    for (const plan of filteredPlans) {
      if (plan.memberCount > 0) {
        const progress = await getPlanExecutionProgress(plan)
        if (progress) {
          executions[plan.id] = progress
        }
      }
    }
    setPlanExecutions(executions)
    setLastRefreshTime(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }))
    setIsRefreshing(false)
  }

  // 初始加载 + 自动刷新（每 30 秒）
  useEffect(() => {
    if (filteredPlans.length > 0) {
      fetchExecutions()
    }
    
    // 每 30 秒自动刷新
    const interval = setInterval(() => {
      if (filteredPlans.length > 0) {
        fetchExecutions()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [filteredPlans])

  const handleCreatePlan = () => {
    setEditingPlan(null)
    setPlanForm(getDefaultForm())
    setShowPlanModal(true)
  }

  const handleEditPlan = (plan: IPlan) => {
    setEditingPlan(plan)
    setPlanForm({
      name: plan.name,
      type: plan.type,
      description: plan.description,
      duration: plan.duration,
      targetWeight: plan.targetWeight || 65,
      targetFat: plan.targetFat || 18,
      targetWaist: plan.targetWaist || 80,
      caloriesMin: plan.caloriesMin || 1600,
      caloriesMax: plan.caloriesMax || 1800,
      protein: Number(plan.protein) || 120,
      fat: plan.fat || 50,
      carbs: plan.carbs || 150,
      training: plan.training || getDefaultForm().training,
      notes: plan.notes || '',
      assignedMember: plan.assignedMember,
    })
    setShowPlanModal(true)
  }

  const handleSavePlan = async () => {
    const planData: IPlan = {
      id: editingPlan?.id || Date.now().toString(),
      name: planForm.name,
      type: planForm.type,
      description: planForm.description,
      duration: planForm.duration,
      memberCount: editingPlan?.memberCount || (planForm.assignedMember ? 1 : 0),
      calories: `${planForm.caloriesMin}-${planForm.caloriesMax}`,
      protein: `${planForm.protein}g`,
      updatedAt: new Date().toISOString().split('T')[0],
      targetWeight: planForm.targetWeight,
      targetFat: planForm.targetFat,
      targetWaist: planForm.targetWaist,
      caloriesMin: planForm.caloriesMin,
      caloriesMax: planForm.caloriesMax,
      fat: planForm.fat,
      carbs: planForm.carbs,
      training: planForm.training,
      notes: planForm.notes,
      assignedMember: planForm.assignedMember,
    }

    if (editingPlan) {
      await updatePlan(editingPlan.id, planData)
      if (planForm.assignedMember) {
        // 写入 assigned_plans 集合
        await assignPlan({
          plan: {
            id: planData.id,
            name: planData.name,
            type: planData.type,
            description: planData.description,
            duration: planData.duration,
            targetWeight: planData.targetWeight,
            targetFat: planData.targetFat,
            targetWaist: planData.targetWaist,
            caloriesMin: planData.caloriesMin,
            caloriesMax: planData.caloriesMax,
            protein: Number(planData.protein),
            fat: Number(planData.fat),
            carbs: Number(planData.carbs),
            training: planData.training,
            notes: planData.notes,
          },
          memberId: planForm.assignedMember.id,
          coachId: String(user?.id || ''),
        })
        addNotification({
          type: 'plan_update',
          title: '方案已更新',
          content: `已更新「${planForm.name}」方案`,
          memberId: planForm.assignedMember.id,
          memberName: planForm.assignedMember.name,
        })
      }
    } else {
      await addPlan(planData)
      if (planForm.assignedMember) {
        // 写入 assigned_plans 集合
        await assignPlan({
          plan: {
            id: planData.id,
            name: planData.name,
            type: planData.type,
            description: planData.description,
            duration: planData.duration,
            targetWeight: planData.targetWeight,
            targetFat: planData.targetFat,
            targetWaist: planData.targetWaist,
            caloriesMin: planData.caloriesMin,
            caloriesMax: planData.caloriesMax,
            protein: Number(planData.protein),
            fat: Number(planData.fat),
            carbs: Number(planData.carbs),
            training: planData.training,
            notes: planData.notes,
          },
          memberId: planForm.assignedMember.id,
          coachId: String(user?.id || ''),
        })
        addNotification({
          type: 'plan_update',
          title: '新方案已创建',
          content: `已为「${planForm.assignedMember.name}」创建「${planForm.name}」方案`,
          memberId: planForm.assignedMember.id,
          memberName: planForm.assignedMember.name,
        })
      }
    }
    setShowPlanModal(false)
  }

  const handleCopyPlan = async (planId: string) => {
    setActionPlanId(null)
    await copyPlan(planId)
  }

  const handleDeletePlan = (plan: IPlan) => {
    setActionPlanId(null)
    setDeletingPlan(plan)
    setShowDeleteConfirm(true)
  }

  const confirmDeletePlan = async () => {
    if (deletingPlan) {
      await deletePlan(deletingPlan.id)
      setShowDeleteConfirm(false)
      setDeletingPlan(null)
    }
  }

  // ── 查看方案使用会员 ──────────────────────────────────────────────
  const handleViewPlanMembers = (plan: IPlan) => {
    if (plan.memberCount === 0) return
    setSelectedPlanForMembers(plan)
    setPlanMembersLoading(true)
    setShowMembersModal(true)

    // 直接从 planStore 的 assignedMember 字段读取（assignPlan 云函数暂未接通）
    if (plan.assignedMember) {
      setPlanMembers([{
        memberId: plan.assignedMember.id,
        memberName: plan.assignedMember.name,
        assignedAt: plan.updatedAt || new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
      }])
    } else {
      setPlanMembers([])
    }
    setPlanMembersLoading(false)
  }

  // ── 获取方案执行进度 ──────────────────────────────────────────────
  const getPlanExecutionProgress = async (plan: IPlan): Promise<IPlan['executions']> => {
    if (!plan.assignedMember) return undefined

    try {
      const { getApp, COLLECTIONS } = await import('@/cloudbase/services')
      const db = getApp()?.database()
      if (!db) return undefined

      const memberId = plan.assignedMember.id
      const startDate = new Date(plan.updatedAt)
      const now = new Date()
      const totalDays = Math.min(plan.duration * 7, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))

      // 统计该会员在计划期间的饮食和运动打卡天数
      const startTimestamp = startDate.getTime()

      const [mealsRes, exercisesRes] = await Promise.all([
        db.collection(COLLECTIONS.MEALS)
          .where({
            user_id: memberId,
            created_at: db.command.gte(startTimestamp),
          })
          .count(),
        db.collection(COLLECTIONS.EXERCISES)
          .where({
            user_id: memberId,
            created_at: db.command.gte(startTimestamp),
          })
          .count(),
      ])

      // 饮食和运动打卡天数（去重）
      const mealDays = mealsRes.total || 0
      const exerciseDays = exercisesRes.total || 0
      const completedDays = Math.max(mealDays, exerciseDays) // 取较大值

      const completionRate = totalDays > 0 ? Math.min(100, Math.round((completedDays / totalDays) * 100)) : 0

      return {
        completedDays,
        totalDays,
        completionRate,
        lastCheckIn: completedDays > 0 ? '近7天有打卡' : '暂无打卡',
      }
    } catch (err) {
      console.warn('[PlanLibrary] 获取执行进度失败:', err)
      return undefined
    }
  }

  // ── 渲染执行进度条 ──────────────────────────────────────────────
  const renderExecutionProgress = (plan: IPlan) => {
    const executions = planExecutions[plan.id] || plan.executions
    if (!executions || plan.memberCount === 0) return null

    const { completionRate, completedDays, totalDays } = executions
    const colorClass = completionRate >= 70 ? 'bg-emerald-500' : completionRate >= 40 ? 'bg-amber-500' : 'bg-red-500'

    return (
      <div className="mt-3 pt-3 border-t border-white/5">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-gray-400">执行进度</span>
          <span className={completionRate >= 70 ? 'text-emerald-400' : completionRate >= 40 ? 'text-amber-400' : 'text-red-400'}>
            {completionRate}%
          </span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${colorClass}`}
            style={{ width: `${completionRate}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          已完成 {completedDays}/{totalDays} 天
        </p>
      </div>
    )
  }

  const types = [
    { id: 'all', name: '全部', count: planCounts.all },
    { id: 'fat-loss', name: '减脂', count: planCounts['fat-loss'] },
    { id: 'muscle-gain', name: '增肌', count: planCounts['muscle-gain'] },
    { id: 'maintain', name: '维持', count: planCounts.maintain },
    { id: 'custom', name: '自定义', count: planCounts.custom },
  ]

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      'fat-loss': 'bg-emerald-500/20 text-emerald-400',
      'muscle-gain': 'bg-blue-500/20 text-blue-400',
      'maintain': 'bg-purple-500/20 text-purple-400',
      'custom': 'bg-orange-500/20 text-orange-400',
    }
    const labels: Record<string, string> = {
      'fat-loss': '减脂',
      'muscle-gain': '增肌',
      'maintain': '维持',
      'custom': '自定义',
    }
    return <span className={`px-2 py-1 text-xs rounded-full ${styles[type]}`}>{labels[type]}</span>
  }

  return (
    <div className="space-y-4 pb-6">
      {/* 页面标题和刷新 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-400" />
          方案库
        </h2>
        <button
          onClick={fetchExecutions}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-emerald-400 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {lastRefreshTime ? `更新于 ${lastRefreshTime}` : '刷新'}
        </button>
      </div>

      {/* 新建方案按钮 */}
      <button 
        onClick={handleCreatePlan}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-medium flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-teal-500 transition-all"
      >
        <Plus className="w-5 h-5" />
        新建方案
      </button>

      {/* 搜索 */}
      <div className="relative">
        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="搜索方案..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
        />
      </div>

      {/* 类型筛选 */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {types.map(type => (
          <button
            key={type.id}
            onClick={() => setTypeFilter(type.id)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                typeFilter === type.id
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {type.name} {type.count > 0 && `(${type.count})`}
          </button>
        ))}
      </div>

      {/* 方案列表 */}
      <div className="space-y-3">
        {filteredPlans.map(plan => (
          <Card key={plan.id} className="p-4 hover:bg-white/5 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div 
                className="flex-1 cursor-pointer"
                onClick={() => handleEditPlan(plan)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{plan.name}</h3>
                  {getTypeBadge(plan.type)}
                </div>
                <p className="text-sm text-gray-400">{plan.description}</p>
              </div>
              {/* 操作按钮（直接显示，无需展开菜单） */}
              <div className="flex items-center gap-1">
                {actionPlanId === plan.id ? (
                  // 选中时显示确认按钮
                  <>
                    <button
                      onClick={() => { setActionPlanId(null); handleDeletePlan(plan) }}
                      className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                      title="确认删除"
                    >
                      <span className="text-xs font-bold">✓</span>
                    </button>
                    <button
                      onClick={() => setActionPlanId(null)}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      title="取消"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </>
                ) : (
                  // 默认显示三个图标按钮
                  <>
                    <button
                      onClick={() => handleEditPlan(plan)}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      title="编辑方案"
                    >
                      <Edit className="w-4 h-4 text-emerald-400" />
                    </button>
                    <button
                      onClick={() => handleCopyPlan(plan.id)}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      title="复制方案"
                    >
                      <Copy className="w-4 h-4 text-blue-400" />
                    </button>
                    <button
                      onClick={() => setActionPlanId(plan.id)}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      title="删除方案"
                    >
                      <Trash2 className="w-4 h-4 text-gray-400" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 方案详情 */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <p className="text-sm font-semibold">{plan.duration}周</p>
                <p className="text-xs text-gray-500">周期</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <p className="text-sm font-semibold text-emerald-400">{plan.calories}</p>
                <p className="text-xs text-gray-500">kcal/天</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <p className="text-sm font-semibold">{plan.protein}</p>
                <p className="text-xs text-gray-500">蛋白质</p>
              </div>
            </div>

            {/* 会员执行进度 */}
            {plan.memberCount > 0 && renderExecutionProgress(plan)}

            {/* 底部信息 */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3 text-gray-400">
                <button
                  onClick={() => handleViewPlanMembers(plan)}
                  className="flex items-center gap-1 hover:text-emerald-400 transition-colors"
                  disabled={plan.memberCount === 0}
                >
                  <Users className="w-4 h-4" />
                  {plan.memberCount} 名会员
                  {plan.memberCount > 0 && <ChevronRight className="w-3.5 h-3.5" />}
                </button>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {plan.updatedAt}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 空状态 */}
      {filteredPlans.length === 0 && (
        <Card className="p-8 text-center text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>没有找到匹配的方案</p>
        </Card>
      )}

      {/* 删除确认弹窗 */}
      <Modal
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="删除方案"
        description={`确定要删除「${deletingPlan?.name}」吗？删除后无法恢复。`}
      >
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 font-medium hover:bg-slate-600 transition-colors"
          >
            取消
          </button>
          <button
            onClick={confirmDeletePlan}
            className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-400 transition-colors"
          >
            确认删除
          </button>
        </div>
      </Modal>

      {/* 新建/编辑方案弹窗 */}
      <Modal
        open={showPlanModal}
        onOpenChange={setShowPlanModal}
        title={editingPlan ? '编辑方案' : '新建方案'}
        description={`周期：${planForm.duration} 周 · ${planForm.type === 'fat-loss' ? '减脂' : planForm.type === 'muscle-gain' ? '增肌' : planForm.type === 'maintain' ? '维持' : '自定义'}计划`}
      >
        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">

          {/* 方案基础信息 */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">方案名称</label>
                <input
                  type="text"
                  value={planForm.name}
                  onChange={e => setPlanForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="例如：减脂计划基础版"
                  className="w-full bg-slate-900 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">方案类型</label>
                <div className="flex gap-2">
                  {[
                    { id: 'fat-loss', name: '减脂', color: 'emerald' },
                    { id: 'muscle-gain', name: '增肌', color: 'blue' },
                    { id: 'maintain', name: '维持', color: 'purple' },
                    { id: 'custom', name: '自定义', color: 'orange' },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setPlanForm(p => ({ ...p, type: t.id as IPlan['type'] }))}
                      className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                        planForm.type === t.id 
                          ? t.color === 'emerald' ? 'bg-emerald-500 text-white' :
                            t.color === 'blue' ? 'bg-blue-500 text-white' :
                            t.color === 'purple' ? 'bg-purple-500 text-white' :
                            'bg-orange-500 text-white'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">周期</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={planForm.duration}
                      onChange={e => setPlanForm(p => ({ ...p, duration: Number(e.target.value) }))}
                      min={1}
                      max={52}
                      className="w-full bg-slate-900 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-center"
                    />
                    <span className="text-slate-500 text-sm">周</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">方案描述</label>
                <textarea
                  value={planForm.description}
                  onChange={e => setPlanForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="描述方案的适用人群和特点..."
                  rows={2}
                  className="w-full bg-slate-900 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">分配给会员（可选）</label>
                <select
                  value={planForm.assignedMember?.id || ''}
                  onChange={e => {
                    const member = members.find(m => m.id === e.target.value)
                    setPlanForm(p => ({ ...p, assignedMember: member || undefined }))
                  }}
                  className="w-full bg-slate-900 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">不分配（仅保存模板）</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}（{m.id}）</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 方案目标 */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              方案目标
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-900 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">目标体重</p>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={planForm.targetWeight}
                    onChange={e => setPlanForm(p => ({ ...p, targetWeight: Number(e.target.value) }))}
                    className="w-14 bg-slate-800 rounded px-2 py-1 text-white text-base font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-slate-500 text-sm">kg</span>
                </div>
              </div>
              <div className="bg-slate-900 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">目标体脂</p>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={planForm.targetFat}
                    onChange={e => setPlanForm(p => ({ ...p, targetFat: Number(e.target.value) }))}
                    className="w-14 bg-slate-800 rounded px-2 py-1 text-white text-base font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-slate-500 text-sm">%</span>
                </div>
              </div>
              <div className="bg-slate-900 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">目标腰围</p>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={planForm.targetWaist}
                    onChange={e => setPlanForm(p => ({ ...p, targetWaist: Number(e.target.value) }))}
                    className="w-14 bg-slate-800 rounded px-2 py-1 text-white text-base font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-slate-500 text-sm">cm</span>
                </div>
              </div>
            </div>
          </div>

          {/* 每日饮食目标 */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Utensils className="w-4 h-4 text-orange-400" />
              每日饮食目标
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">热量范围</p>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={planForm.caloriesMin}
                    onChange={e => setPlanForm(p => ({ ...p, caloriesMin: Number(e.target.value) }))}
                    className="w-14 bg-slate-900 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-slate-500 text-sm">-</span>
                  <input
                    type="number"
                    value={planForm.caloriesMax}
                    onChange={e => setPlanForm(p => ({ ...p, caloriesMax: Number(e.target.value) }))}
                    className="w-14 bg-slate-900 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-slate-500 text-sm ml-1">kcal</span>
                </div>
              </div>
              {[
                { label: '蛋白质', key: 'protein', unit: 'g/天', color: 'text-blue-400' },
                { label: '脂肪', key: 'fat', unit: 'g/天', color: 'text-yellow-400' },
                { label: '碳水', key: 'carbs', unit: 'g/天', color: 'text-emerald-400' },
              ].map(item => (
                <div key={item.key} className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={(planForm as any)[item.key]}
                      onChange={e => setPlanForm(p => ({ ...p, [item.key]: Number(e.target.value) }))}
                      className="w-14 bg-slate-900 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="text-slate-500 text-sm">{item.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 每周训练安排 */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-emerald-400" />
              每周训练安排
            </h4>
            <div className="space-y-2">
              {planForm.training.map((item, idx) => (
                <div key={item.day} className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-3">
                  <span className="text-xs text-slate-500 w-8 flex-shrink-0">{item.day}</span>
                  <input
                    value={item.type}
                    onChange={e => setPlanForm(p => {
                      const training = [...p.training]
                      training[idx] = { ...training[idx], type: e.target.value }
                      return { ...p, training }
                    })}
                    placeholder="训练类型"
                    className="flex-1 bg-slate-900 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <input
                    value={item.detail}
                    onChange={e => setPlanForm(p => {
                      const training = [...p.training]
                      training[idx] = { ...training[idx], detail: e.target.value }
                      return { ...p, training }
                    })}
                    placeholder="训练详情"
                    className="flex-1 bg-slate-900 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-2 sticky bottom-0 bg-slate-900 pb-2">
            <button
              onClick={() => setShowPlanModal(false)}
              className="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 font-medium hover:bg-slate-600 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSavePlan}
              disabled={!planForm.name.trim()}
              className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingPlan ? '保存修改' : '创建方案'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 查看方案使用会员弹窗 */}
      {showMembersModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
          onClick={() => setShowMembersModal(false)}
        >
          <div
            className="w-full max-w-lg bg-[#1a1a2e] rounded-t-3xl p-6 pb-[144px] animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">
                {selectedPlanForMembers?.name}
                <span className="ml-2 text-sm font-normal text-gray-400">
                  {planMembers.length} 名会员
                </span>
              </h3>
              <button
                onClick={() => setShowMembersModal(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {planMembersLoading ? (
              <div className="text-center py-12 text-gray-400">加载中...</div>
            ) : planMembers.length === 0 ? (
              <div className="text-center py-12 text-gray-400">暂无会员使用此方案</div>
            ) : (
              <div className="space-y-3">
                {planMembers.map(m => (
                  <button
                    key={m.memberId}
                    onClick={() => {
                      setShowMembersModal(false)
                      navigate(`/coach/members/${m.memberId}`)
                    }}
                    className="w-full flex items-center justify-between bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors active:bg-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center font-bold">
                        {m.memberName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{m.memberName}</p>
                        <p className="text-xs text-gray-500">分配于 {m.assignedAt}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
