// ============================================================
// 配置
// ============================================================

import type { AIConfig } from './types'

export const AI_CONFIG: AIConfig = {
  secretKey: import.meta.env.VITE_TENCENT_SECRET_KEY || '',
  geminiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
  zhipuKey: import.meta.env.VITE_ZHIPU_API_KEY || '',
  baiduApiKey: import.meta.env.VITE_BAIDU_API_KEY || '',
  baiduSecretKey: import.meta.env.VITE_BAIDU_SECRET_KEY || '',
  openclawUrl: import.meta.env.VITE_OPENCLAW_API_URL || '',
  mode: (import.meta.env.VITE_AI_MODE as AIConfig['mode']) || 'mock',
}

// 腾讯云混元 API 地址（统一走代理路径，Vite/Vercel 各自转发）
export const HUNYUAN_API_URL = '/api/hunyuan/v1/chat/completions'
export const HUNYUAN_MODEL = 'hunyuan-vision'

// Google Gemini API 地址
export const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

// 智谱 GLM-4V API 地址
export const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
export const ZHIPU_MODEL = 'glm-4v'
