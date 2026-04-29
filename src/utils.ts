/**
 * 工具函数
 */

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * 合并 Tailwind 类名
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 格式化日期
 */
export function formatDate(date: Date | string, format: 'short' | 'long' = 'short') {
  const d = new Date(date)
  if (format === 'short') {
    return `${d.getMonth() + 1}/${d.getDate()}`
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * 格式化数字
 */
export function formatNumber(num: number, decimals: number = 1) {
  return num.toFixed(decimals)
}

/**
 * 格式化百分比
 */
export function formatPercent(num: number, decimals: number = 1) {
  return `${(num * 100).toFixed(decimals)}%`
}

/**
 * 延迟执行
 */
export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 生成唯一 ID
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
