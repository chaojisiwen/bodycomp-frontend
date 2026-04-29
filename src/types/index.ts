// 用户相关
export interface User {
  id: number
  phone: string
  name: string
  avatar?: string
  role: 'member' | 'coach' | 'admin'
  gender?: 'male' | 'female' | 'other'
  height?: number
  birthDate?: string
  createdAt: string
}

export interface MemberProfile {
  userId: number
  name: string
  avatar?: string
  target: {
    type: 'fat_loss' | 'muscle_gain' | 'maintain' | 'weight_gain'
    targetWeight: number
    targetBodyfat: number
    targetCycle: number
    startAt: string
    endAt: string
  }
  coach?: {
    id: number
    name: string
    avatar: string
    title: string
  }
  stats: {
    totalDays: number
    checkInDays: number
    totalRecords: number
  }
}

// 体成分相关
export interface BodyComposition {
  id: number
  measureTime: string
  weight: number
  bmi?: number
  waistHipRatio?: number
  visceralFat?: number
  bodyfat?: number
  bodyfatRate?: number
  leanMass?: number
  muscleMass?: number
  skeletalMuscle?: number
  bmr?: number
  totalWater?: number
  inorganicSalt?: number
  protein?: number
  dataSource: 'manual' | 'ocr' | 'import'
}

// 饮食相关
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface DietRecord {
  id: number
  mealType: MealType
  mealDate: string
  foodName: string
  weight?: number
  calorie: number
  protein?: number
  fat?: number
  carbohydrate?: number
  dataSource: 'manual' | 'ocr' | 'ai'
}

// 运动相关
export interface ExerciseRecord {
  id: number
  exerciseDate: string
  exerciseType: string
  exerciseName: string
  duration: number
  calorie: number
  intensity?: 'low' | 'medium' | 'high'
  distance?: number
  status: 'completed' | 'cancelled'
}

// 目标相关
export interface Target {
  date: string
  calorieTarget: number
  calorieMin?: number
  calorieMax?: number
  proteinTarget: number
  fatTarget: number
  carbTarget: number
  exerciseTarget?: number
  stepsTarget?: number
}

// 预警相关
export type WarningType =
  | 'calorie_high'
  | 'calorie_low'
  | 'protein_low'
  | 'bodyfat_rise'
  | 'muscle_fall'
  | 'weight_fluctuation'
  | 'no_update'
  | 'no_checkin'

export interface Warning {
  id: number
  type: WarningType
  level: 'yellow' | 'red'
  title: string
  message: string
  currentValue?: number
  targetValue?: number
  status: 'pending' | 'viewed' | 'resolved' | 'ignored'
  createdAt: string
}

// 方案相关
export type PlanType = 'diet' | 'exercise' | 'combined'

export interface Plan {
  id: number
  coachId: number
  title: string
  type: PlanType
  category?: string
  content: Record<string, unknown>
  status: 'draft' | 'published' | 'archived'
  usageCount: number
}

// 消息相关
export type MessageType = 'plan' | 'comment' | 'reminder' | 'system'

export interface Message {
  id: number
  senderId: number
  sender?: User
  receiverId: number
  type: MessageType
  title?: string
  content: string
  relatedPlanId?: number
  isRead: boolean
  createdAt: string
}
