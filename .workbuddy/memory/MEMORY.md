# MEMORY.md — bodycomp 项目长期记忆

> 最后更新：2026-05-06（精简瘦身，历史故障细节已移除，保留结论）

## 用户

- 称呼：韬哥 | 深圳 | 一人公司「超级斯文」创始人
- 偏好：简体中文、结构化分析、务实直接
- 痛点：修 Bug 反复、修这坏那 → 极度敏感，遇挫易沮丧
- 网络：深圳局域网，境外网站需 VPN；腾讯云国内服务免 VPN
- 产品决策：不搞复杂聊天，微信沟通，App 内只做简单通知/评语

## 项目速览

**bodycomp-frontend**（Equilibrio 体成分管理）

| 项 | 值 |
|---|---|
| 路径 | `/Users/wentaozhao/WorkBuddy/20260417225228/bodycomp-frontend` |
| 技术栈 | React 18 + TS + Vite 5 + TailwindCSS + Zustand |
| 页面 | 会员 8 + 教练 7 + 登录 1 = 16 页 |
| 本地端口 | `localhost:5173` |
| 启动 | `./start-dev.sh` |

## 核心架构（一条线）

```
前端部署：腾讯云 CDN → COS 静态网站（纯国内链路，零 VPN）
├── V2（主力）：v2.equilibrio-corporeo.space
└── V1（不动）：equilibrio-corporeo.space

后端：腾讯云 CloudBase（环境 ID: equilibrio-d1g3wgdfj6a16a180）
├── 云函数：validateInviteCode / aiProxy
├── 数据库：9 集合（users, body_records, meals, exercises, coaches 等）
└── 匿名登录

AI 识别：腾讯混元（hunyuan），通过 aiProxy 云函数代理
├── 四个模块：食物、体成分、运动、拳头校准

代码仓库：GitHub（仅存代码）
境外备份：Vercel（测试用，非大陆入口）
```

## 部署命令速查

| 操作 | 命令 |
|------|------|
| 前端上线 | `./publish-cos.sh [--refresh]` |
| 仅上传 | `python3 -u publish-cos.py` |
| 云函数更新 | `tcb fn deploy <函数名> --env-id equilibrio-d1g3wgdfj6a16a180 --force` |

**部署规则**：≥6 个改动点推线上；<6 个攒着，除非明说"推线上"

## V2 线上状态（已全部修复 ✅）

| 配置项 | 状态 | 备注 |
|--------|------|------|
| DNS → CDN | ✅ | CNAME 指向 `cdn.dnsv1.com` |
| CDN 回源 COS | ✅ | cos-website 公开读，回源 HOST 已配 |
| SSL 证书 | ✅ | TrustAsia C1 DV Free，过期 2026-08-02 |
| CloudBase 安全域名 | ✅ | v2.equilibrio-corporeo.space 已加 |
| 匿名登录 | ✅ | 正常 |
| AI 代理云函数 | ✅ | 60s 超时，512MB |
| 邀请码云函数 | ✅ | M- 开头密码 |

## 登录系统

- AuthContext 管理状态，路由：`/coach` / `/member` / `/login`
- 邀请码 → CloudBase 云函数 validateInviteCode 验证
- ⚠️ 4 个文件直接读 localStorage 而非 AuthContext（已知技术债）
- 文档：`docs/LOGIN_ARCHITECTURE.md`

## ⚠️ 双用户态同步（关键风险）

| 层 | 存储 | 持久化 |
|---|---|---|
| AuthContext（React）| `localStorage 'user'` | ✅ 跨刷新 |
| auth.ts 模块变量 | `currentUser` | ❌ 刷新消失 |

**已修复**：AuthContext useEffect 监听 user 变化 → 调 setCurrentUser() 同步；LoginPage finishLogin() 存 inviteCode

## 页面状态一览

| 页面 | 状态 | 备注 |
|------|------|------|
| 登录 | ✅ | |
| 会员首页/饮食/计划/资料 | ✅ | |
| 教练首页/会员列表/预警中心/资料 | ✅ | |
| 运动记录 | 🟡 | 1220 行，文件偏大 |
| AI 食物识别 | ⚠️ | /api/hunyuan 线上待验证 |
| 体成分数据 | 🟡 | 1147 行 |
| 消息中心 | 🟡 | 半成品 |
| 会员详情 | 🔴 | 1302 行需拆分 |
| 方案库 | 🟡 | 6 个 TODO 后端未建 |
| 通知中心 | ⚪ | 仅骨架 |

## 当前 Bug 优先级

- **P0**：头像同步问题、教练端会员名字显示
- **P1**：体成分数据不通、通知红点角色错位、方案展示/应用等（共 5 项）
- **P2**：3 项

## 已知结构性问题

- CoachMemberDetailPage 1302 行需拆分
- PlanStore 6 个未实现 TODO
- 百度识别 `/api/baidu` 代理路径待处理

## 腾讯云密钥

```
SecretId: AKIDeDdqtmHfu44wjT3Slx21rbL0Vp0yjKmX
SecretKey: ugG3sW4nOq8kLzVLDybapCmsoY6RbaMw
```

## 环境变量（.env）

```
VITE_AI_MODE=hunyuan
VITE_GEMINI_API_KEY / VITE_TENCENT_SECRET_KEY / VITE_ZHIPU_API_KEY / VITE_BAIDU_API_KEY / VITE_BAIDU_SECRET_KEY / VITE_OPENCLAW_API_URL
```
⚠️ 密钥曾暴露在 .env.example，需轮换。

## 工具速查

| 工具 | 用途 |
|------|------|
| GitHub | 代码仓库 |
| 腾讯云 CDN + COS | 国内部署 |
| CloudBase | 后端（云函数+DB+登录） |
| 混元 AI | 图片识别 |
| Vercel | 境外测试（非大陆入口） |
