/**
 * 腾讯云云开发配置
 *
 * 使用说明：
 * 1. 登录腾讯云云开发控制台：https://console.cloud.tencent.com/tcb
 * 2. 创建环境，获取环境 ID
 * 3. 将下方 envId 替换为你的环境 ID
 *
 * 文档：https://docs.cloudbase.net/
 */

// ============================================================
// ⚠️ 配置区域 - 请替换为你的云开发环境信息
// ============================================================

export const CLOUDBASE_CONFIG = {
  // 云开发环境 ID（在云开发控制台 -> 环境设置 中查看）
  envId: 'equilibrio-d1g3wgdfj6a16a180',

  // 应用密钥（可选，用于增强安全性）
  appSecret: '',

  // 是否启用 HTTPS
  https: true,
}

// ============================================================
// 集合名称常量
// ============================================================

export const COLLECTIONS = {
  USERS: 'users',                    // 用户表
  BODY_RECORDS: 'body_records',      // 体成分记录
  MEALS: 'meals',                    // 饮食记录
  EXERCISES: 'exercises',            // 运动记录
  COACHES: 'coaches',                // 教练表
  COACH_MEMBERS: 'coach_members',    // 教练-会员关系
  ASSIGNED_PLANS: 'assigned_plans',  // 分配的训练计划
  NOTIFICATIONS: 'notifications',    // 通知消息
  WARNINGS: 'warnings',              // 预警记录
} as const

// ============================================================
// 角色类型
// ============================================================

export type UserRole = 'member' | 'coach'

// ============================================================
// 导出类型
// ============================================================

export type { ICloudbase } from './types'
