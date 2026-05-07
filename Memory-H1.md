# Memory-H1 — bodycomp-frontend H1 分支工作记录

> 分支: `clean-dataflow`
> 根目录: `~/WorkBuddy/20260417225228/bodycomp-frontend-H1`

## 项目概况

基于 React + TypeScript + Vite 的体成分管理系统，已提上 Vercel 部署。CloudBase 后端连接不可用（无回调地址），登录降级到 Mock 模式。H1 作为 clean-dataflow 清理重写分支。

## 当前状态 (2026-05-07)

总代码量 21,391 行，16 页面，10 Store，8 服务模块，4 测试文件。

### 页面清单

| 页面 | 行数 | 状态 | 备注 |
|------|------|------|------|
| 登录页 | 541 | ✅ 完成 | Mock 降级 |
| 会员首页 | 462 | ✅ 完成 | |
| 饮食录入 | 722 | ✅ 完成 | |
| 运动记录 | 1136 | 🟡 需优化 | 需拆分 |
| AI 食物识别 | 978 | 🟡 需优化 | 百度代理已修复 |
| 体成分数据 | 1075 | 🟡 需优化 | 需拆分 |
| 个人资料 | 927 | ✅ 完成 | |
| 我的计划 | 339 | ✅ 完成 | |
| 消息中心 | 398 | 🟡 需优化 | reaction 云端同步待处理 |
| 教练首页 | 314 | ✅ 完成 | |
| 会员列表 | 218 | ✅ 完成 | |
| 会员详情 | 1275 | 🔴 需重构 | 最胖页面 |
| 预警中心 | 226 | ✅ 完成 | |
| 方案库 | 852 | 🟡 需优化 | planStore 6 TODOs |
| 教练资料 | 315 | ✅ 完成 | |
| 通知中心 | 131 | ⚪ 基础 | 功能单薄 |

### 剩余 P1 问题

1. CoachMemberDetailPage 1275 行拆分
2. ExercisePage 1136 行 & MyBodyDataPage 1075 行过大
3. planStore 6 处 TODO
4. 目标进度反馈缺失

### 最新提交 (2026-05-04)

`5aa7fa8` — fix: 统一API代理路径，修复Vercel上混元/百度API跨域问题

H1 由 6 个 commit 构成：
1. `8020d23` 初始版本
2. `854cdb2` P0-P3 重构
3. `bd1e451` CloudBase Mock 降级登录
4. `61d6542` 密码设置 Mock 降级
5. `f3577c5` 登录无限循环修复 + 重试按钮
6. `5aa7fa8` API 代理路径统一

## 关键决策记录

### 2026-05-07: H1 扫描 & 看板更新
- 桌面看板 `bodycomp-项目看板.html` 已更新（29,761 字节，最新数据）
- 本地预览通过 `npx vite preview` 在 `http://localhost:4173/` 运行

### 2026-05-07: 用户资料名称回退 Bug 修复
**Bug**: 用 M-TOD300 登录后改名字为 "Ale"，切到其他页面再切回来名字恢复为默认值
**根因**: `profileStore.fetchProfile()` 中 `name: user.nickname || user.name || state.profile.name` — 每次进入 MemberProfilePage 时 `fetchProfile` 用 CloudBase 返回的数据覆盖了用户本地修改的名字
**修复**: `profileStore.ts` 中 `fetchProfile` 的 name 字段改为「用户编辑优先」策略：若 `state.profile.name` 不是默认值 `'用户'` 则保留本地，否则用云端值

### 规则
- ❌ 不动 C1 / V1 / V2，除非用户明确允许
- ✅ 所有更改只局限在 H1 工作目录
