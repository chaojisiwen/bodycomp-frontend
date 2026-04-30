import { TrendingUp, TrendingDown, Minus, Scale, User, Flame, Heart, Droplets, Bone, Brain } from 'lucide-react'
import type { ReactNode } from 'react'
import type { IBodyRecord } from '@/cloudbase/types'

// ============================================================
// 类型定义
// ============================================================

export interface BodyMetric {
  id: string
  name: string
  value: number
  unit: string
  normal: string
  trend: 'up' | 'down' | 'stable'
  change: number
  icon: ReactNode
  isCore?: boolean
}

export interface BodyRecord {
  id: string
  date: string
  weight: number
  bmi: number
  fat: number
  muscle: number
  waist: number
  visceral: number
  water: number
  bone: number
  metabolism: number
  protein: number
  bodyage: number
  subfat: number
  fatfree: number
}

// ============================================================
// 字段映射
// ============================================================


/** UI id → store field 映射 */
export const fieldMap: Record<string, string> = {
  weight: 'weight', bmi: 'bmi',
  fat: 'body_fat', muscle: 'muscle_mass',
  waist: 'waist',
  visceral: 'visceral_fat', water: 'water_content',
  bone: 'bone_mass', metabolism: 'basal_metabolism',
  bodyage: 'metabolism_age',
  protein: 'protein_percent', subfat: 'subcutaneous_fat', fatfree: 'fat_free_mass',
}

// ============================================================
// 指标数据
// ============================================================

export const allBodyMetrics: BodyMetric[] = [
  // 核心指标（默认显示）
  { id: 'weight', name: '体重', value: 0, unit: 'kg', normal: '65-75kg', trend: 'stable', change: 0, icon: <Scale className="w-5 h-5" />, isCore: true },
  { id: 'bmi', name: 'BMI', value: 0, unit: '', normal: '18.5-24', trend: 'stable', change: 0, icon: <User className="w-5 h-5" />, isCore: true },
  { id: 'fat', name: '体脂率', value: 0, unit: '%', normal: '15-20%', trend: 'stable', change: 0, icon: <Flame className="w-5 h-5" />, isCore: true },
  { id: 'muscle', name: '肌肉量', value: 0, unit: 'kg', normal: '55-65kg', trend: 'stable', change: 0, icon: <TrendingUp className="w-5 h-5" />, isCore: true },
  // 详细指标
  { id: 'waist', name: '腰围', value: 0, unit: 'cm', normal: '<90cm', trend: 'stable', change: 0, icon: <TrendingDown className="w-5 h-5" /> },
  { id: 'visceral', name: '内脏脂肪', value: 0, unit: '', normal: '1-9', trend: 'stable', change: 0, icon: <Heart className="w-5 h-5" /> },
  { id: 'water', name: '体水分', value: 0, unit: '%', normal: '50-60%', trend: 'stable', change: 0, icon: <Droplets className="w-5 h-5" /> },
  { id: 'bone', name: '骨量', value: 0, unit: 'kg', normal: '2.5-3.5', trend: 'stable', change: 0, icon: <Bone className="w-5 h-5" /> },
  { id: 'metabolism', name: '基础代谢', value: 0, unit: 'kcal', normal: '1600-1800', trend: 'stable', change: 0, icon: <Flame className="w-5 h-5" /> },
  { id: 'protein', name: '蛋白质', value: 0, unit: '%', normal: '16-20%', trend: 'stable', change: 0, icon: <Brain className="w-5 h-5" /> },
  { id: 'bodyage', name: '身体年龄', value: 0, unit: '岁', normal: '<实际年龄', trend: 'stable', change: 0, icon: <User className="w-5 h-5" /> },
  { id: 'subfat', name: '皮下脂肪', value: 0, unit: '%', normal: '9-18%', trend: 'stable', change: 0, icon: <Flame className="w-5 h-5" /> },
  { id: 'fatfree', name: '去脂体重', value: 0, unit: 'kg', normal: '50-60kg', trend: 'stable', change: 0, icon: <TrendingUp className="w-5 h-5" /> },
]

// ============================================================
// 辅助函数
// ============================================================

/** 从 store 或默认配置获取最新指标值（取1位小数，避免溢出） */
export function getLatestMetricValue(metricId: string, latestBody: IBodyRecord | null): number {
  if (latestBody) {
    const storeField = fieldMap[metricId] || metricId
    const raw = (latestBody as Record<string, number | undefined>)[storeField]
    if (raw != null) return Math.round(raw * 10) / 10
  }
  return allBodyMetrics.find(m => m.id === metricId)?.value || 0
}

/** 获取趋势图标 */
export function getTrendIcon(trend: 'up' | 'down' | 'stable'): ReactNode {
  switch (trend) {
    case 'up': return <TrendingUp className="w-4 h-4 text-emerald-400" />
    case 'down': return <TrendingDown className="w-4 h-4 text-emerald-400" />
    default: return <Minus className="w-4 h-4 text-gray-400" />
  }
}

/** 获取趋势颜色 */
export function getTrendColor(trend: 'up' | 'down' | 'stable', metricId: string): string {
  if (['weight', 'fat', 'bmi', 'visceral', 'subfat', 'bodyage'].includes(metricId)) {
    return trend === 'down' ? 'text-emerald-400' : trend === 'up' ? 'text-red-400' : 'text-gray-400'
  }
  return trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400'
}

/** 获取指标单位（用于趋势图统计） */
export function getMetricUnit(metric: string): string {
  const units: Record<string, string> = {
    weight: 'kg', bodyFat: '%', muscle: 'kg', bmi: '',
    waist: 'cm', visceral: '', water: '%', bone: 'kg',
    metabolism: 'kcal',
  }
  return units[metric] || ''
}

/** 获取指标对应的字段名（从 bodyTrend 到 latestBody 的映射） */
export function getMetricField(metric: string): string {
  const fields: Record<string, string> = {
    weight: 'weight', bodyFat: 'body_fat', muscle: 'muscle_mass', bmi: 'bmi',
    waist: 'waist', visceral: 'visceral_fat', water: 'water_content', bone: 'bone_mass',
    metabolism: 'basal_metabolism',
  }
  return fields[metric] || metric
}

/** 派生最近记录（供列表展示） */
export function buildDisplayRecords(storeRecords: IBodyRecord[]): BodyRecord[] {
  return storeRecords
    .slice(0, 20)
    .map((r, i) => ({
      id: r._id || `store-${i}`,
      date: new Date(r.record_date!).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
      weight: Math.round((r.weight ?? 0) * 10) / 10,
      bmi: Math.round((r.bmi ?? 0) * 10) / 10,
      fat: Math.round((r.body_fat ?? 0) * 10) / 10,
      muscle: Math.round((r.muscle_mass ?? 0) * 10) / 10,
      waist: Math.round((r.waist ?? 0) * 10) / 10,
      visceral: Math.round((r.visceral_fat ?? 0) * 10) / 10,
      water: Math.round((r.water_content ?? 0) * 10) / 10,
      bone: Math.round((r.bone_mass ?? 0) * 10) / 10,
      metabolism: r.basal_metabolism ?? 0,
      protein: Math.round((r.protein_percent ?? 0) * 10) / 10,
      bodyage: r.metabolism_age ?? 0,
      subfat: Math.round((r.subcutaneous_fat ?? 0) * 10) / 10,
      fatfree: Math.round((r.fat_free_mass ?? 0) * 10) / 10,
    }))
}

/** 构建展示指标（含动态趋势计算） */
export function buildDisplayedMetrics(
  showAllMetrics: boolean,
  latestBody: IBodyRecord | null,
  bodyTrend: IBodyRecord[],
): BodyMetric[] {
  return (showAllMetrics ? allBodyMetrics : allBodyMetrics.filter(m => m.isCore)).map(m => ({
    ...m,
    value: getLatestMetricValue(m.id, latestBody),
    ...(bodyTrend.length >= 2 ? (() => {
      const latest = bodyTrend[bodyTrend.length - 1]
      const prev = bodyTrend[bodyTrend.length - 2]
      const latestVal = (latest as Record<string, number | undefined>)?.[fieldMap[m.id] || m.id]
      const prevVal = (prev as Record<string, number | undefined>)?.[fieldMap[m.id] || m.id]
      if (latestVal == null || prevVal == null) return { trend: 'stable' as const, change: 0 }
      const diff = Math.round((Number(latestVal) - Number(prevVal)) * 10) / 10
      const tol = Math.abs(diff) < 0.05
      return { trend: tol ? 'stable' as const : diff > 0 ? 'up' as const : 'down' as const, change: diff }
    })() : { trend: 'stable' as const, change: 0 }),
  }))
}

/** 构建趋势图数据 */
export function buildTrendChartData(bodyTrend: IBodyRecord[]) {
  return bodyTrend.slice(-14).map(r => ({
    date: new Date(r.record_date!).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
    weight: r.weight ?? undefined,
    bodyFat: r.body_fat ?? undefined,
    muscle: r.muscle_mass ?? undefined,
    bmi: r.bmi ?? undefined,
    waist: r.waist ?? undefined,
    visceral: r.visceral_fat ?? undefined,
    water: r.water_content ?? undefined,
    bone: r.bone_mass ?? undefined,
    metabolism: r.basal_metabolism ?? undefined,
  }))
}

/** 指标标签映射 */
export const metricLabels: Record<string, string> = {
  weight: '体重', bmi: 'BMI', fat: '体脂率', muscle: '肌肉量',
  waist: '腰围', visceral: '内脏脂肪', water: '体水分',
  bone: '骨量', metabolism: '基础代谢', protein: '蛋白质',
  bodyage: '身体年龄', subfat: '皮下脂肪', fatfree: '去脂体重',
}

/** 指标单位映射 */
export const metricUnits: Record<string, string> = {
  weight: 'kg', bmi: '', fat: '%', muscle: 'kg',
  waist: 'cm', visceral: '', water: '%', bone: 'kg',
  metabolism: 'kcal', protein: '%', bodyage: '岁', subfat: '%', fatfree: 'kg',
}

/** 趋势图可选指标列表 */
export const trendMetricOptions = [
  { id: 'weight', name: '体重', unit: 'kg' },
  { id: 'bodyFat', name: '体脂率', unit: '%' },
  { id: 'muscle', name: '肌肉量', unit: 'kg' },
  { id: 'bmi', name: 'BMI', unit: '' },
  { id: 'waist', name: '腰围', unit: 'cm' },
  { id: 'visceral', name: '内脏脂肪', unit: '' },
  { id: 'water', name: '体水分', unit: '%' },
  { id: 'bone', name: '骨量', unit: 'kg' },
  { id: 'metabolism', name: '基础代谢', unit: 'kcal' },
]

/** 周期选项 */
export const periods = [
  { id: 'week', name: '本周' },
  { id: 'month', name: '本月' },
  { id: '3months', name: '近3月' },
]

/** 解析图片为 base64 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64Data = result.replace(/^data:image\/\w+;base64,/, '')
      resolve(base64Data)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
