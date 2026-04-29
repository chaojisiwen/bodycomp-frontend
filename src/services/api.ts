// API 服务层 - 模拟后端接口
// 正式环境替换为真实 API 地址
export const API_BASE = import.meta.env.VITE_API_BASE || '/api'

// 通用响应类型
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// 模拟延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// ============ 认证相关 ============

export interface LoginParams {
  phone: string
  password: string
}

export interface LoginResult {
  token: string
  user: {
    id: string
    name: string
    phone: string
    role: 'member' | 'coach'
    avatar?: string
  }
}

export const authApi = {
  login: async (params: LoginParams): Promise<ApiResponse<LoginResult>> => {
    await delay(800)
    // 模拟登录
    if (params.password === '123456') {
      const isCoach = params.phone.startsWith('139')
      return {
        success: true,
        data: {
          token: 'mock_token_' + Date.now(),
          user: {
            id: isCoach ? 'c001' : 'm001',
            name: isCoach ? '李教练' : '王先生',
            phone: params.phone,
            role: isCoach ? 'coach' : 'member'
          }
        }
      }
    }
    return { success: false, error: '手机号或密码错误' }
  },

  logout: async (): Promise<ApiResponse<void>> => {
    await delay(200)
    return { success: true }
  },

  getProfile: async (): Promise<ApiResponse<LoginResult['user']>> => {
    await delay(300)
    return {
      success: true,
      data: {
        id: 'm001',
        name: '王先生',
        phone: '138****8888',
        role: 'member'
      }
    }
  }
}

// ============ 体成分数据 ============

export interface BodyMetrics {
  weight: number       // 体重 kg
  fatPercent: number   // 体脂率 %
  muscle: number       // 肌肉量 kg
  bmi: number          // BMI
  water: number        // 水分 %
  bone: number         // 骨量 kg
  bmr: number          // 基础代谢 kcal
  visceralFat: number   // 内脏脂肪
  protein: number      // 蛋白质 %
  bodyAge: number      // 身体年龄
}

export interface BodyRecord {
  id: string
  date: string
  metrics: BodyMetrics
  photo?: string
}

export const bodyApi = {
  // 获取最新体成分数据
  getLatest: async (): Promise<ApiResponse<BodyRecord>> => {
    await delay(500)
    return {
      success: true,
      data: {
        id: 'r001',
        date: '2026-04-17',
        metrics: {
          weight: 72.5,
          fatPercent: 18.5,
          muscle: 58.2,
          bmi: 23.4,
          water: 55.2,
          bone: 3.1,
          bmr: 1680,
          visceralFat: 8,
          protein: 17.2,
          bodyAge: 32
        }
      }
    }
  },

  // 获取历史记录
  getHistory: async (days: number = 30): Promise<ApiResponse<BodyRecord[]>> => {
    await delay(500)
    const records: BodyRecord[] = []
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      records.push({
        id: `r${i}`,
        date: date.toISOString().split('T')[0],
        metrics: {
          weight: 73 - i * 0.05 + Math.random() * 0.2,
          fatPercent: 19 - i * 0.02 + Math.random() * 0.1,
          muscle: 57.5 + i * 0.03,
          bmi: 23.5 - i * 0.01,
          water: 54 + Math.random() * 2,
          bone: 3.1,
          bmr: 1670 + i * 0.5,
          visceralFat: 9 - Math.floor(i / 7),
          protein: 17 + Math.random(),
          bodyAge: 33 - Math.floor(i / 10)
        }
      })
    }
    return { success: true, data: records }
  },

  // 提交体成分数据
  submit: async (metrics: Partial<BodyMetrics>): Promise<ApiResponse<BodyRecord>> => {
    await delay(1000)
    return {
      success: true,
      data: {
        id: 'r_new',
        date: new Date().toISOString().split('T')[0],
        metrics: metrics as BodyMetrics
      }
    }
  }
}

// ============ 饮食记录 ============

export interface MealRecord {
  id: string
  date: string
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  foods: FoodItem[]
  totalCalories: number
  totalProtein: number
}

export interface FoodItem {
  id: string
  name: string
  amount: number
  unit: string
  calories: number
  protein: number
}

export const mealApi = {
  // 获取今日饮食记录
  getToday: async (): Promise<ApiResponse<MealRecord[]>> => {
    await delay(400)
    return {
      success: true,
      data: [
        {
          id: 'm1',
          date: new Date().toISOString().split('T')[0],
          type: 'breakfast',
          foods: [
            { id: 'f1', name: '全麦面包', amount: 2, unit: '片', calories: 180, protein: 8 },
            { id: 'f2', name: '鸡蛋', amount: 2, unit: '个', calories: 140, protein: 12 }
          ],
          totalCalories: 320,
          totalProtein: 20
        },
        {
          id: 'm2',
          date: new Date().toISOString().split('T')[0],
          type: 'lunch',
          foods: [
            { id: 'f3', name: '米饭', amount: 200, unit: 'g', calories: 232, protein: 4 }
          ],
          totalCalories: 232,
          totalProtein: 4
        }
      ]
    }
  },

  // 添加食物
  addFood: async (recordId: string, food: Omit<FoodItem, 'id'>): Promise<ApiResponse<FoodItem>> => {
    console.log('Adding food to record:', recordId)
    await delay(500)
    return {
      success: true,
      data: {
        id: 'f_new',
        ...food
      }
    }
  }
}

// ============ 食物识别 AI ============

export interface RecognizeResult {
  foods: {
    name: string
    calories: number
    protein: number
    confidence: number
  }[]
  imageUrl?: string
}

export const recognizeApi = {
  // 识别食物图片
  recognize: async (imageFile: File): Promise<ApiResponse<RecognizeResult>> => {
    await delay(2000) // 模拟 AI 处理时间

    // 模拟识别结果
    const mockResults = [
      { name: '米饭', calories: 116, protein: 2, confidence: 0.95 },
      { name: '炒青菜', calories: 85, protein: 3, confidence: 0.88 },
      { name: '红烧肉', calories: 250, protein: 15, confidence: 0.92 },
      { name: '番茄炒蛋', calories: 120, protein: 8, confidence: 0.90 },
    ]

    const randomIndex = Math.floor(Math.random() * mockResults.length)
    const result = mockResults[randomIndex]

    return {
      success: true,
      data: {
        foods: [result],
        imageUrl: URL.createObjectURL(imageFile)
      }
    }
  },

  // 识别体成分（拍照测脸）
  recognizeBody: async (imageFile: File): Promise<ApiResponse<BodyMetrics>> => {
    console.log('Recognizing body from image:', imageFile.name)
    await delay(2500)

    return {
      success: true,
      data: {
        weight: 70 + Math.random() * 5,
        fatPercent: 18 + Math.random() * 4,
        muscle: 55 + Math.random() * 8,
        bmi: 22 + Math.random() * 3,
        water: 53 + Math.random() * 4,
        bone: 2.8 + Math.random() * 0.5,
        bmr: 1600 + Math.random() * 200,
        visceralFat: 7 + Math.floor(Math.random() * 5),
        protein: 16 + Math.random() * 3,
        bodyAge: 28 + Math.floor(Math.random() * 10)
      }
    }
  }
}

// ============ 运动记录 ============

export interface ExerciseRecord {
  id: string
  date: string
  type: string
  duration: number  // 分钟
  calories: number
}

export const exerciseApi = {
  getToday: async (): Promise<ApiResponse<ExerciseRecord[]>> => {
    await delay(400)
    return {
      success: true,
      data: [
        { id: 'e1', date: new Date().toISOString().split('T')[0], type: '跑步', duration: 30, calories: 280 },
        { id: 'e2', date: new Date().toISOString().split('T')[0], type: '力量训练', duration: 45, calories: 320 }
      ]
    }
  },

  add: async (record: Omit<ExerciseRecord, 'id'>): Promise<ApiResponse<ExerciseRecord>> => {
    await delay(500)
    return {
      success: true,
      data: { id: 'e_new', ...record }
    }
  }
}

// ============ 教练相关 ============

export interface Coach {
  id: string
  name: string
  avatar?: string
  certifications: string[]
  rating: number
  memberCount: number
}

export interface Member {
  id: string
  name: string
  phone: string
  avatar?: string
  progress: number
  lastRecord?: string
  warnings: number
  hasPlan: boolean        // 教练是否已为其创建方案
  joinDate: string       // 入会日期
  // 新增：真实体成分数据
  weight?: number
  bodyFat?: number
  goal?: string
  week?: number
}

// 从云数据库获取会员真实数据
async function fetchRealMemberData(coachId: string): Promise<Member[]> {
  try {
    // 动态导入避免循环依赖
    const { getApp, COLLECTIONS } = await import('@/cloudbase/services')

    const db = getApp()?.database()
    if (!db) return []

    // 1. 获取教练的会员关系
    const relations = await db
      .collection(COLLECTIONS.COACH_MEMBERS)
      .where({ coach_id: coachId, status: 'active' })
      .get()

    if (!relations.data || relations.data.length === 0) return []

    const memberIds = relations.data.map((r: any) => r.member_id)

    // 2. 批量获取会员信息
    const usersRes = await db
      .collection(COLLECTIONS.USERS)
      .where({ _id: db.command.in(memberIds) })
      .get()

    const usersMap = new Map<string, any>()
    usersRes.data?.forEach((u: any) => usersMap.set(u._id || u.uid, u))

    // 3. 获取所有会员的最新体成分记录
    const now = Date.now()
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000

    const bodyRes = await db
      .collection(COLLECTIONS.BODY_RECORDS)
      .where({
        user_id: db.command.in(memberIds),
        record_date: db.command.gte(oneMonthAgo),
      })
      .orderBy('record_date', 'desc')
      .get()

    // 取每个会员最新的一条记录
    const latestBodyMap = new Map<string, any>()
    bodyRes.data?.forEach((r: any) => {
      if (!latestBodyMap.has(r.user_id)) {
        latestBodyMap.set(r.user_id, r)
      }
    })

    // 4. 检查哪些会员有分配的计划
    const plansRes = await db
      .collection(COLLECTIONS.ASSIGNED_PLANS)
      .where({
        member_id: db.command.in(memberIds),
        status: 'active',
      })
      .get()

    const membersWithPlans = new Set<string>()
    plansRes.data?.forEach((p: any) => membersWithPlans.add(p.member_id))

    // 5. 组装真实数据
    const members: Member[] = relations.data.map((relation: any) => {
      const userId = relation.member_id
      const user = usersMap.get(userId) || {}
      const bodyRecord = latestBodyMap.get(userId)
      const joinDate = relation.start_date
        ? new Date(relation.start_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]
      const lastRecordDate = bodyRecord?.record_date
        ? new Date(bodyRecord.record_date).toISOString().split('T')[0].slice(5)
        : undefined

      // 计算训练周期（周数）
      const weeks = joinDate
        ? Math.floor((Date.now() - new Date(joinDate).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
        : 1

      // 判断目标（根据 target_weight 和当前体重判断）
      const currentWeight = bodyRecord?.weight
      const targetWeight = user?.target_weight
      let goal = '维持'
      if (targetWeight && currentWeight) {
        if (targetWeight < currentWeight) goal = '减脂'
        else if (targetWeight > currentWeight) goal = '增肌'
      }

      // 统计预警数（基于体成分偏离度简单判断）
      let warnings = 0
      if (bodyRecord) {
        if (bodyRecord.body_fat && bodyRecord.body_fat > 25) warnings++
        if (bodyRecord.weight && currentWeight && targetWeight) {
          if (currentWeight > targetWeight + 5) warnings++
        }
      }

      return {
        id: userId,
        name: user?.name || user?.nickname || '未知用户',
        phone: user?.phone ? user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '',
        avatar: user?.avatar,
        progress: Math.min(100, weeks * 10),
        lastRecord: lastRecordDate,
        warnings,
        hasPlan: membersWithPlans.has(userId),
        joinDate,
        weight: bodyRecord?.weight,
        bodyFat: bodyRecord?.body_fat,
        goal,
        week: weeks,
      }
    })

    return members
  } catch (error) {
    console.error('[coachApi] 获取真实会员数据失败:', error)
    return []
  }
}

export const coachApi = {
  getMyCoach: async (): Promise<ApiResponse<Coach>> => {
    await delay(400)
    return {
      success: true,
      data: {
        id: 'c001',
        name: '李教练',
        certifications: ['国家一级健身教练', '减脂专家', '营养指导师'],
        rating: 4.9,
        memberCount: 28
      }
    }
  },

  getMyMembers: async (): Promise<ApiResponse<Member[]>> => {
    // 先尝试从云数据库获取真实数据
    const realMembers = await fetchRealMemberData('c001') // TODO: 替换为当前教练ID

    if (realMembers.length > 0) {
      return { success: true, data: realMembers }
    }

    // 如果云数据库没有数据，返回带结构的模拟数据（保证UI正常）
    await delay(500)
    return {
      success: true,
      data: [
        { id: 'm001', name: '王先生', phone: '138****8888', progress: 65, lastRecord: '04-19', warnings: 1, hasPlan: true, joinDate: '2026-01-15' },
        { id: 'm002', name: '张女士', phone: '136****6666', progress: 82, lastRecord: '04-18', warnings: 0, hasPlan: true, joinDate: '2026-02-01' },
        { id: 'm003', name: '刘先生', phone: '135****5555', progress: 45, lastRecord: '04-15', warnings: 2, hasPlan: true, joinDate: '2026-03-10' },
        { id: 'm004', name: '陈静', phone: '137****3456', progress: 20, lastRecord: '04-12', warnings: 0, hasPlan: false, joinDate: '2026-04-15' },
        { id: 'm005', name: '赵鹏', phone: '139****7890', progress: 10, lastRecord: '04-19', warnings: 1, hasPlan: false, joinDate: '2026-04-18' },
      ]
    }
  },

  // 获取最新评语
  getLatestComment: async (_memberId: string): Promise<ApiResponse<{ content: string; date: string }>> => {
    await delay(300)
    return {
      success: true,
      data: {
        content: '本周体重下降趋势良好，注意保持睡眠时间，建议增加力量训练。',
        date: '04-17'
      }
    }
  },

  // 获取会员详情（教练端）
  getMemberDetail: async (memberId: string): Promise<ApiResponse<{
    id: string
    name: string
    avatar: string
    goal: string
    week: number
    startWeight: number
    currentWeight: number
    startFat: number
    currentFat: number
    phone: string
    joinDate: string
  }>> => {
    await delay(300)
    const members = [
      { id: '1', name: '张明', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face', goal: '减脂目标', week: 4, startWeight: 75.0, currentWeight: 72.5, startFat: 22.5, currentFat: 19.2, phone: '138****1234', joinDate: '2026-03-01' },
      { id: '2', name: '李雪', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face', goal: '增肌目标', week: 2, startWeight: 53.0, currentWeight: 55.0, startFat: 24.0, currentFat: 22.5, phone: '136****5678', joinDate: '2026-04-01' },
      { id: '3', name: '王强', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face', goal: '维持目标', week: 8, startWeight: 68.0, currentWeight: 68.0, startFat: 15.8, currentFat: 15.8, phone: '135****9012', joinDate: '2026-02-01' },
      { id: '4', name: '陈静', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face', goal: '减脂目标', week: 1, startWeight: 63.0, currentWeight: 62.0, startFat: 27.0, currentFat: 26.5, phone: '137****3456', joinDate: '2026-04-12' },
    ]
    const member = members.find(m => m.id === memberId) || members[0]
    return { success: true, data: member }
  },

  // 获取会员运动记录
  getMemberExercise: async (_memberId: string): Promise<ApiResponse<{
    records: { date: string; type: string; duration: number; calories: number; status: 'completed' | 'under' | 'rest' }[]
    weeklyTarget: number
    weeklyCompleted: number
    totalCalories: number
    avgDuration: number
  }>> => {
    await delay(300)
    return {
      success: true,
      data: {
        weeklyTarget: 300,
        weeklyCompleted: 215,
        totalCalories: 1860,
        avgDuration: 48,
        records: [
          { date: '04-17', type: '力量训练', duration: 55, calories: 420, status: 'completed' },
          { date: '04-16', type: '有氧跑步', duration: 40, calories: 380, status: 'completed' },
          { date: '04-15', type: 'HIIT训练', duration: 30, calories: 350, status: 'completed' },
          { date: '04-14', type: '力量训练', duration: 50, calories: 410, status: 'under' },
          { date: '04-13', type: '休息日', duration: 0, calories: 0, status: 'rest' },
          { date: '04-12', type: '游泳', duration: 60, calories: 450, status: 'completed' },
          { date: '04-11', type: '力量训练', duration: 45, calories: 380, status: 'completed' },
        ]
      }
    }
  },

  // 发送评语给会员
  sendComment: async (_memberId: string, _content: string): Promise<ApiResponse<{ id: string; date: string }>> => {
    await delay(400)
    return {
      success: true,
      data: { id: `cmt_${Date.now()}`, date: new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) }
    }
  }
}
