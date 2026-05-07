/**
 * 云开发数据类型定义
 */

// ============================================================
// 用户相关
// ============================================================

export interface IUser {
  _id: string
  uid?: string           // 云函数生成的稳定用户标识
  openid?: string
  unionid?: string
  name?: string
  phone?: string
  nickname?: string
  avatar?: string
  role: 'member' | 'coach'
  coach_id?: string
  height?: number
  target_weight?: number
  invite_code?: string   // 激活时使用的邀请码
  created_at?: Date
  updated_at?: Date
}

export interface IUserProfile extends Omit<IUser, '_id' | 'openid' | 'unionid'> {
  id: string
}

// ============================================================
// 体成分记录
// ============================================================

export interface IBodyRecord {
  _id?: string
  user_id?: string
  record_date?: Date
  weight?: number
  bmi?: number
  body_fat?: number
  muscle_mass?: number
  water_content?: number
  bone_mass?: number
  basal_metabolism?: number
  visceral_fat?: number
  waist?: number
  metabolism_age?: number
  protein_percent?: number  // 蛋白质 %
  subcutaneous_fat?: number  // 皮下脂肪 %
  fat_free_mass?: number  // 去脂体重 kg
  notes?: string
  image_url?: string
  created_at?: Date
  updated_at?: Date
}

export type IBodyRecordInput = Omit<IBodyRecord, '_id' | 'created_at' | 'updated_at'>

// ============================================================
// 饮食记录
// ============================================================

export interface IFoodItem {
  name: string
  amount: number
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface IMeal {
  _id?: string
  user_id: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  meal_date: Date
  foods: IFoodItem[]
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  image_url?: string
  created_at?: Date
}

export type IMealInput = Omit<IMeal, '_id' | 'created_at'>

// ============================================================
// 运动记录
// ============================================================

export interface IExerciseItem {
  name: string
  duration: number
  calories: number
  intensity: 'low' | 'medium' | 'high'
  /** 动态千卡（Active Energy）- Apple Watch/手表的活跃消耗 */
  activeCalories?: number
  /** 总千卡（Total Energy）- 包含基础代谢的总消耗 */
  totalCalories?: number
  /** 平均心率（次/分） */
  avgHeartRate?: number
}

export interface IExercise {
  _id?: string
  user_id: string
  exercise_date: Date
  exercises: IExerciseItem[]
  total_duration: number
  total_calories: number
  notes?: string
  image_url?: string
  created_at?: Date
}

export type IExerciseInput = Omit<IExercise, '_id' | 'created_at'>

// ============================================================
// 教练相关
// ============================================================

export interface ICoach {
  _id?: string
  user_id?: string
  title?: string
  name?: string
  specialty?: string | string[]
  bio?: string
  avatar?: string
  certifications?: string[]
  rating?: number
  member_count?: number
  memberCount?: number
  verified?: boolean
  invite_code?: string   // 教练邀请码，用于会员搜索
  created_at?: Date
}

export interface ICoachMember {
  _id?: string
  coach_id: string
  member_id: string
  status: 'active' | 'paused' | 'ended'
  start_date?: Date
  end_date?: Date
  created_at?: Date
}

// ============================================================
// 训练计划分配
// ============================================================

export interface IAssignedPlan {
  _id?: string
  plan_id: string
  member_id: string
  coach_id: string
  // 计划快照（保存下发时的完整数据，防止原计划被修改后影响已分配内容）
  plan_name: string
  plan_type: string
  plan_description: string
  duration: number
  target_weight?: number
  target_fat?: number
  target_waist?: number
  calories_min?: number
  calories_max?: number
  protein?: number
  fat?: number
  carbs?: number
  training?: TrainingItem[]
  notes?: string
  // 分配信息
  assigned_at: Date
  start_date?: Date   // 计划开始日期
  end_date?: Date     // 计划结束日期
  status: 'active' | 'completed' | 'cancelled'
  created_at?: Date
}

export interface TrainingItem {
  day: string
  type: string
  detail: string
}

// ============================================================
// 云开发 SDK 类型
// ============================================================

export interface ICloudbase {
  init(config: {
    env: string
    appSecret?: string
    https?: boolean
  }): Promise<void>
  auth(): IAuth
  database(): IDatabase
}

export interface IAuth {
  getLoginState(): Promise<any>
  signInWithWechat(code?: string): Promise<any>
  signInWithPhone(phone: string, code: string): Promise<any>
  signOut(): Promise<void>
}

export interface IDatabase {
  collection(name: string): ICollection
  command: IDatabaseCommand
}

// 合并 ICollection 和 IQuery，简化链式调用类型
export interface ICollection {
  doc(id: string): IDocument
  add(data: any): Promise<any>
  where(query: any): ICollection
  field(projection: any): ICollection
  orderBy(field: string, order: 'asc' | 'desc'): ICollection
  limit(num: number): ICollection
  skip(num: number): ICollection
  count(): Promise<any>
  get(): Promise<any>
  update(data: any): Promise<any>
  remove(): Promise<any>
}

export interface IDocument {
  get(): Promise<any>
  update(data: any): Promise<any>
  set(data: any): Promise<any>
  remove(): Promise<any>
}

export interface IDatabaseCommand {
  eq(val: any): any
  neq(val: any): any
  lt(val: any): any
  lte(val: any): any
  gt(val: any): any
  gte(val: any): any
  in(arr: any[]): any
  nin(arr: any[]): any
  and(...args: any[]): any
  or(...args: any[]): any
  regexp(pattern: RegExp): any
}
