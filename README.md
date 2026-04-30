# BodyComp · 身体成分管理系统

基于 React + TypeScript + Vite 的身体成分管理应用，包含会员端和教练端双端。

## 技术栈

- React 18 + TypeScript
- Vite 5 + TailwindCSS 3
- Zustand（状态管理）
- React Router 7（HashRouter）
- Radix UI（基础组件）
- Lucide React（图标）
- 腾讯云 CloudBase（后端服务）

## 项目结构

```
src/
├── components/         # UI 组件
│   ├── coach/         # 教练端组件
│   ├── common/        # 公共组件（Toast, Modal, Loading 等）
│   ├── layout/        # 布局组件（MobileLayout）
│   ├── member/        # 会员端组件
│   └── ui/            # 基础 UI 组件
├── cloudbase/          # 腾讯云 CloudBase 服务
│   └── services/      # API 服务（auth/bodyRecords/meals/exercises/coach/notifications）
├── contexts/           # React Context
├── data/               # 静态数据
├── hooks/              # 自定义 Hooks
├── pages/              # 页面
│   ├── coach/         # 教练端页面
│   └── member/        # 会员端页面
├── router/             # 路由配置（HashRouter + 懒加载）
├── stores/             # Zustand 状态管理
├── types/              # 类型定义
└── utils/              # 工具函数
```

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 环境变量

复制 `.env.example` 为 `.env`，填入对应的 API Key：

```bash
cp .env.example .env
```

支持的 AI 识别模式：
- `gemini` — Google Gemini（推荐）
- `zhipu` — 智谱 GLM-4V
- `hunyuan` — 腾讯云混元
- `baidu` — 百度菜品识别

## 功能概览

### 会员端
- 🏠 首页：目标追踪、热量记录、营养素进度
- 🍽️ 摄入：食物记录、AI拍照识别
- 🏃 运动：运动记录、消耗追踪
- 📊 数据：体成分指标、趋势图表
- 🏷️ 拍照识别：AI 食物/体成分识别

### 教练端
- 📋 首页：会员看板、今日任务、预警
- 👥 会员管理：会员列表、详情
- ⚠️ 预警中心：异常数据监控
- 📚 方案库：训练/饮食计划
