# 腾讯云云开发集成 - 使用指南

## 快速开始

### 1. 配置环境 ID

在 `src/cloudbase/config.ts` 中配置你的云开发环境 ID：

```typescript
export const CLOUDBASE_CONFIG = {
  envId: 'your-env-id-xxxxxx',  // 替换为你的环境 ID
}
```

### 2. 在应用入口初始化

在 `main.tsx` 或 `App.tsx` 中初始化：

```typescript
import { initCloudbase } from './cloudbase'

// App 入口
initCloudbase().then((success) => {
  if (success) {
    console.log('云开发初始化成功')
  }
})
```

---

## 使用示例

### 用户认证

```typescript
import { loginWithWechat, loginWithPhone, logout } from './cloudbase/services'

// 微信登录
const result = await loginWithWechat()

// 手机号登录
const result2 = await loginWithPhone('13800138000', '123456')

// 登出
await logout()
```

### 体成分记录

```typescript
import { createBodyRecord, getBodyRecords, getLatestBodyRecord } from './cloudbase/services'

// 创建记录
await createBodyRecord({
  user_id: 'user123',
  record_date: new Date(),
  weight: 70,
  bmi: 22.5,
  body_fat: 18,
})

// 获取列表
const records = await getBodyRecords({ limit: 10 })

// 获取最新记录
const latest = await getLatestBodyRecord()
```

### 饮食记录

```typescript
import { createMeal, getMeals, getDailyMealSummary } from './cloudbase/services'

// 创建饮食记录
await createMeal({
  user_id: 'user123',
  meal_type: 'breakfast',
  meal_date: new Date(),
  foods: [
    { name: '鸡蛋', amount: 100, calories: 144, protein: 13, carbs: 1, fat: 10 },
    { name: '牛奶', amount: 250, calories: 155, protein: 8, carbs: 12, fat: 8 },
  ],
})

// 获取日统计
const summary = await getDailyMealSummary(new Date())
console.log(`今日摄入: ${summary.total_calories} kcal`)
```

### 运动记录

```typescript
import { createExercise, getDailyExerciseSummary } from './cloudbase/services'

// 记录运动
await createExercise({
  user_id: 'user123',
  exercise_date: new Date(),
  exercises: [
    { name: '跑步', duration: 30, calories: 300, intensity: 'medium' },
    { name: '力量训练', duration: 20, calories: 150, intensity: 'high' },
  ],
})

// 获取日统计
const summary = await getDailyExerciseSummary()
console.log(`今日运动: ${summary.total_duration} 分钟, 消耗 ${summary.total_calories} kcal`)
```

### 教练服务

```typescript
import { getCoaches, bindCoach, getMyCoach } from './cloudbase/services'

// 获取教练列表
const coaches = await getCoaches({ verified: true, limit: 10 })

// 绑定教练
await bindCoach('coach_id_xxx')

// 获取我的教练
const myCoach = await getMyCoach()
```

---

## 数据类型

详细类型定义见 `src/cloudbase/types.ts`：

- `IUser` - 用户
- `IBodyRecord` - 体成分记录
- `IMeal` - 饮食记录
- `IExercise` - 运动记录
- `ICoach` - 教练
- `ICoachMember` - 教练-会员关系

---

## 权限配置

在腾讯云云开发控制台设置集合权限：

| 集合 | 读权限 | 写权限 |
|------|--------|--------|
| users | 仅创建者 | 仅创建者 |
| body_records | 仅创建者 | 仅创建者 |
| meals | 仅创建者 | 仅创建者 |
| exercises | 仅创建者 | 仅创建者 |
| coaches | 所有用户 | 仅管理员 |
| coach_members | 仅相关方 | 仅创建者 |

---

## 下一步

1. 在腾讯云控制台创建云开发环境
2. 创建数据库集合（参考 `backend-design.md`）
3. 配置集合权限
4. 替换 `config.ts` 中的环境 ID
5. 开始开发！
