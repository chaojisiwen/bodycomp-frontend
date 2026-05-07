# 登录链路架构文档

> ⚠️ **这是系统的核心链路。修改任何相关文件前，请先阅读本文档。**

---

## 一、登录时序图

```
用户打开 localhost:5173/
    │
    ▼
HashRouter 匹配到 "/"
    │
    ▼
自动重定向到 "/member" (ROUTES.MEMBER_HOME)
    │
    ▼
RequireAuth 检查 isAuthenticated
    │
    ├─ 已登录 ──► 渲染 MobileLayout + MemberHomePage
    │
    └─ 未登录 ──► 重定向到 "/login" (ROUTES.LOGIN)
                        │
                        ▼
            用户看到 LoginPage（邀请码输入）
                        │
                        ▼
            输入邀请码，点击"进入"
                        │
                        ▼
            initCloudbase() → getApp() → callCloudFunction('validateInviteCode', {action:'login', code})
                        │
                        ▼
            云函数返回：
                ├─ code: -3 → 首次登录，需设置密码 → 显示密码设置表单
                ├─ code: -2 → 已有密码，需输入密码 → 显示密码输入表单
                ├─ code:  0 → 登录成功 → finishLogin(role, data)
                └─ code: -1/-500 → 错误 → 显示错误提示
                        │
                        ▼
            finishLogin() 中：
                1. 构造 userData 对象
                2. 调用 useAuth().login(userData)  ← 【关键】必须走这里
                3. navigate('/member') 或 navigate('/coach')
                        │
                        ▼
            AuthContext.login() 中：
                1. setUser(userData) → isAuthenticated = true
                2. useEffect 触发 → localStorage.setItem('user', JSON.stringify(userData))
                        │
                        ▼
            路由重新渲染，RequireAuth 发现 isAuthenticated = true
                        │
                        ▼
            渲染会员/教练首页 ✅
```

---

## 二、核心文件与职责

| 文件 | 职责 | 禁止做的事 |
|------|------|-----------|
| `src/pages/LoginPage.tsx` | 登录页面 UI、调用云函数、完成登录跳转 | 禁止直接操作 localStorage；禁止绕过 useAuth().login() |
| `src/router/index.tsx` | RequireAuth 路由守卫，拦截未登录用户 | 禁止添加任何绕过 isAuthenticated 检查的逻辑 |
| `src/contexts/AuthContext.tsx` | 提供登录态（user、isAuthenticated、login、logout） | 禁止修改 localStorage key；禁止修改 isAuthenticated 的计算方式 |
| `src/router/routes.tsx` | 路由配置表，定义所有路径常量 | 修改路径需同步更新 LoginPage.tsx 的 navigate() |
| `src/cloudbase/index.ts` | CloudBase SDK 初始化、云函数调用封装 | 禁止在 init 失败时降级为模拟逻辑 |
| `cloudfunctions/validateInviteCode/index.js` | 后端邀请码验证、密码校验、token 生成 | 禁止调用 wx-server-sdk 不存在的 API |

---

## 三、关键约束

### 3.1 登录态同步

**唯一正确的登录态写入方式：**
```typescript
// ✅ 正确：通过 AuthContext
const { login } = useAuth()
login(userData)  // 这会同时更新 React state 和 localStorage

// ❌ 错误：直接写 localStorage
localStorage.setItem('user', JSON.stringify(userData))  // 状态不同步！
```

### 3.2 导航路径

LoginPage.tsx 中的 `navigate()` 目标必须与 `ROUTES` 常量完全一致：

| 角色 | LoginPage 中的路径 | ROUTES 常量 |
|------|-------------------|------------|
| 会员 | `navigate('/member')` | `ROUTES.MEMBER_HOME = '/member'` |
| 教练 | `navigate('/coach')` | `ROUTES.COACH_HOME = '/coach'` |

### 3.3 云函数契约

前端调用参数 ↔ 云函数入参必须一致：

| action | 前端参数 | 云函数接收 |
|--------|---------|-----------|
| login | `{action:'login', code}` | `event.action`, `event.code` |
| login（有密码） | `{action:'login', code, password}` | `event.action`, `event.code`, `event.password` |
| setPassword | `{action:'setPassword', code, password}` | `event.action`, `event.code`, `event.password` |

返回体结构（前端唯一判断依据）：
```typescript
{
  code: 0 | -1 | -2 | -3 | -500,
  message: string,
  data: {
    token: string,
    role: 'member' | 'coach',
    uid: string,
    name: string,
    userId: string,
  }
}
```

### 3.4 回归测试

**新增或修改登录相关代码后，必须运行：**
```bash
npm run test
```

当前有 **18 个测试**（5 auth + 8 auth-flow + 5 mealStore），全部通过才能提交。

---

## 四、修改速查表

### "我要改 X，需要注意什么"

| 我要改... | 必须检查... | 必须同步更新... |
|-----------|------------|----------------|
| LoginPage.tsx 的 UI | 云函数调用参数不变 | 无 |
| LoginPage.tsx 的登录逻辑 | `finishLogin()` 是否调用 `login()` | 无 |
| 路由路径（如 `/member` → `/dashboard`） | LoginPage.tsx 的 navigate() | ROUTES 常量、所有导航链接 |
| AuthContext 的 User 接口 | LoginPage.tsx 的 finishLogin() 构造的 userData | 所有使用 User 接口的文件 |
| localStorage key | 所有读取 localStorage('user') 的地方 | stores/warningStore.ts、stores/coachProfileStore.ts、services/api.ts |
| 云函数入参/返回体 | LoginPage.tsx 的 callCloudFunction 调用 | 双方必须同步 |
| RequireAuth 逻辑 | **绝对禁止添加绕过条件** | 回归测试必须仍通过 |

---

## 五、已知技术债（非登录核心，但相关）

以下文件直接读取 `localStorage.getItem('user')`，未通过 AuthContext：
- `src/stores/warningStore.ts`
- `src/stores/coachProfileStore.ts`
- `src/services/api.ts`
- `src/pages/member/IntakePage.tsx`

**风险**：如果 AuthContext 改了数据格式或 key，这些地方会静默失败。
**建议**：未来逐步改为通过 AuthContext 获取，或在组件层传入 userId。

---

## 六、历史故障记录

| 时间 | 故障 | 根因 | 修复 |
|------|------|------|------|
| 2026-05-03 | 打开直接显示首页 | `RequireAuth` 有 `if (import.meta.env.DEV)` 跳过逻辑 | 删除 DEV 环境判断 |
| 2026-05-03 | 登录后页面异常循环 | `finishLogin()` 直接写 localStorage，未调用 `login()` | 引入 `useAuth()` 并调用 `login()` |
| 2026-05-03 | 导航路径错误 | `navigate('/member/home')` 但路由是 `/member` | 修正为 `/member` 和 `/coach` |
| 2026-05-03 | 设置密码报 500 | 云函数调用 `cloud.auth()`（wx-server-sdk 不存在此 API） | 改为 `generateToken()` 生成 token |

---

*文档最后更新：2026-05-03*
