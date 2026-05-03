// ============================================================
// ⚠️ 登录核心文件 - 修改需谨慎
// 本文件属于系统认证链路的关键环节
// 修改前请确认了解：登录流程、路由守卫、AuthContext 三者关系
// 关键约束：
//   - 必须通过 useAuth().login() 写入登录态（禁止直接操作 localStorage）
//   - 导航路径必须与 router/routes.tsx 中 ROUTES 常量保持一致
//   - 云函数调用参数必须与 cloudfunctions/validateInviteCode/index.js 匹配
//   - Mock 降级仅在 DEV 环境生效，生产环境必须走云函数
// ============================================================

import { useState, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getApp, initCloudbase, callCloudFunction } from '@/cloudbase'

// ── Mock 白名单（仅开发环境使用）────────────────────────────
const MOCK_VALID_CODES = [
  'M-NNC1M0', 'M-3N2000', 'M-YIWWRB', 'M-S89000', 'M-YDA600',
  'M-F00000', 'M-TOD300', 'M-98D700', 'M-WTTJZ0', 'M-SRF150',
  'C-7L2000', 'C-8PTMHO', 'C-7JZZ20', 'C-0SVJ00', 'C-S00000',
]

interface LoginResponse {
  code: number
  message: string
  data?: {
    token?: string
    role?: string
    uid?: string
    name?: string
    userId?: string
    isFirstLogin?: boolean
    needSetPassword?: boolean
    needPassword?: boolean
  }
}

export default function LoginPage() {
  const { login } = useAuth()
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'code' | 'password' | 'setPassword'>('code')
  const [loginData, setLoginData] = useState<LoginResponse['data'] | null>(null)

  // 表单引用，供重试按钮调用
  const formRef = useRef<HTMLFormElement>(null)

  // ── 工具：判断当前是否使用 Mock 降级 ─────────────────────────
  const isMockMode = useCallback(() => {
    return import.meta.env.DEV && !getApp()
  }, [])

  // ── Step 1: 输入邀请码 ───────────────────────────────────────
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return

    setLoading(true)
    setError('')

    try {
      // ── Mock 降级：SDK 未初始化时使用本地白名单 ──────────
      if (isMockMode()) {
        console.log('[LoginPage] Mock 模式：SDK 未初始化，使用本地白名单')
        const upper = code.trim().toUpperCase()
        if (!MOCK_VALID_CODES.includes(upper)) {
          setError('邀请码无效，请输入正确的邀请码')
          setLoading(false)
          return
        }
        // 检查本地是否已设置过密码
        const storedPw = localStorage.getItem(`pw_${upper}`)
        if (storedPw) {
          setLoginData({ needPassword: true } as any)
          setStep('password')
        } else {
          const mockRole = upper.startsWith('C-') ? 'coach' : 'member'
          setLoginData({
            role: mockRole,
            uid: `mock-${upper}`,
            name: mockRole === 'coach' ? '教练' : '会员',
            userId: `mock-${upper}`,
            isFirstLogin: true,
            needSetPassword: false,
          })
          setStep('setPassword')
        }
        setLoading(false)
        return
      }

      // ── 正常路径：SDK 调用云函数 ──────────────────────────
      await initCloudbase()
      const app = getApp()
      if (!app) {
        setError('服务未初始化，请点击下方重试按钮')
        setLoading(false)
        return
      }

      const result = await callCloudFunction<LoginResponse>('validateInviteCode', {
        action: 'login',
        code: code.trim(),
      })

      // 需要输入密码
      if (result.code === -2) {
        setLoginData(result.data || null)
        setStep('password')
        setLoading(false)
        return
      }

      // 需要设置密码
      if (result.code === -3) {
        setLoginData(result.data || null)
        setStep('setPassword')
        setLoading(false)
        return
      }

      if (result.code !== 0) {
        setError(result.message || '邀请码无效')
        setLoading(false)
        return
      }

      // 登录成功
      finishLogin(result.data?.role || 'member', result.data)
    } catch (err) {
      console.error('[LoginPage] Step 1 异常:', err)
      setError('服务暂不可用，请检查网络连接后点击重试')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: 输入密码 ─────────────────────────────────────────
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return

    setLoading(true)
    setError('')

    try {
      // ── Mock 降级：验证本地存储的密码 ────────────────────
      if (isMockMode()) {
        console.log('[LoginPage] Mock 密码验证')
        const upper = code.trim().toUpperCase()
        const storedPw = localStorage.getItem(`pw_${upper}`)
        if (storedPw && storedPw !== password.trim()) {
          setError('密码错误')
          setLoading(false)
          return
        }
        finishLogin(loginData?.role || 'member', loginData || null)
        return
      }

      // ── 正常路径 ─────────────────────────────────────────
      await initCloudbase()
      const app = getApp()
      if (!app) {
        setError('服务未初始化，请点击重试')
        setLoading(false)
        return
      }

      const result = await callCloudFunction<LoginResponse>('validateInviteCode', {
        action: 'login',
        code: code.trim(),
        password: password.trim(),
      })

      if (result.code !== 0) {
        setError(result.message || '登录失败')
        setLoading(false)
        return
      }

      finishLogin(result.data?.role || 'member', result.data)
    } catch (err) {
      console.error('[LoginPage] Step 2 异常:', err)
      setError('服务暂不可用，请检查网络连接后点击重试')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 3: 设置密码 ─────────────────────────────────────────
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim() || password.trim().length < 6) {
      setError('密码至少6位')
      return
    }

    setLoading(true)
    setError('')

    const upper = code.trim().toUpperCase()

    try {
      // ── Mock 降级：存密码到 localStorage ────────────────
      if (isMockMode()) {
        console.log('[LoginPage] Mock 设置密码')
        localStorage.setItem(`pw_${upper}`, password.trim())
        finishLogin(loginData?.role || 'member', loginData || null)
        return
      }

      // ── 正常路径 ─────────────────────────────────────────
      await initCloudbase()
      const app = getApp()
      if (!app) {
        setError('服务未初始化，请点击重试')
        setLoading(false)
        return
      }

      const result = await callCloudFunction<LoginResponse>('validateInviteCode', {
        action: 'setPassword',
        code: upper,
        password: password.trim(),
      })

      if (result.code !== 0) {
        setError(result.message || '设置失败')
        setLoading(false)
        return
      }

      finishLogin(result.data?.role || loginData?.role || 'member', result.data)
    } catch (err) {
      console.error('[LoginPage] Step 3 异常:', err)
      setError('服务暂不可用，请检查网络连接后点击重试')
    } finally {
      setLoading(false)
    }
  }

  // ── 重试按钮 ─────────────────────────────────────────────────
  const handleRetry = () => {
    setError('')
    formRef.current?.requestSubmit()
  }

  // ── 跳过设置密码 ─────────────────────────────────────────────
  const handleSkipPassword = () => {
    const upper = code.trim().toUpperCase()
    localStorage.setItem(`pw_${upper}`, '__REQUIRED__')
    setPassword('')
    setError('')
    setStep('password')
  }

  // ── 完成登录 ─────────────────────────────────────────────────
  // 注意：必须用 window.location.href 而非 navigate()
  // 原因：login() 调用 setUser() 是异步的，navigate() 执行时
  // isAuthenticated 仍为 false，RequireAuth 会拦截跳转踢回 /login
  // window.location.href 触发全页刷新，AuthProvider 从 localStorage 恢复状态
  const finishLogin = (role: string, data: LoginResponse['data'] | null) => {
    const userData = {
      id: data?.uid || data?.userId || code.trim().toUpperCase(),
      name: data?.name || '用户',
      phone: '',
      role: role as 'member' | 'coach',
      coachId: '',
    }

    login(userData)

    if (role === 'coach') {
      window.location.href = '/#/coach'
    } else {
      window.location.href = '/#/member'
    }
  }

  // ── 渲染 ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Equilibrio Corporeo</h1>
          <p className="text-gray-500 mt-1">身体成分管理系统</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {step === 'code' && (
            <form ref={formRef} onSubmit={handleCodeSubmit} className="space-y-6">
              <div className="text-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">欢迎回来</h2>
                <p className="text-sm text-gray-500 mt-1">输入您的邀请码登录</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">邀请码</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="如 M-A3K9F2"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all uppercase"
                  autoFocus
                  autoComplete="off"
                />
              </div>

              {error && (
                <div className="text-center">
                  <p className="text-sm text-red-500">{error}</p>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="text-sm text-emerald-600 font-medium mt-1 hover:text-emerald-700"
                  >
                    点击重试
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-semibold rounded-xl transition-colors shadow-md disabled:shadow-none"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    登录中...
                  </span>
                ) : '进入'}
              </button>

              <p className="text-xs text-gray-400 text-center">
                首次登录后建议设置密码，防止邀请码被他人使用
              </p>
            </form>
          )}

          {step === 'password' && (
            <form ref={formRef} onSubmit={handlePasswordSubmit} className="space-y-6">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-800">请输入密码</h2>
                <p className="text-sm text-gray-500 mt-1">邀请码 {code}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all pr-12"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-center">
                  <p className="text-sm text-red-500">{error}</p>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="text-sm text-emerald-600 font-medium mt-1 hover:text-emerald-700"
                  >
                    点击重试
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !password.trim()}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-semibold rounded-xl transition-colors shadow-md disabled:shadow-none"
              >
                {loading ? '登录中...' : '登录'}
              </button>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => { setStep('code'); setPassword(''); setError('') }}
                  className="py-2 px-4 text-gray-500 font-medium text-sm hover:text-gray-700 transition-colors"
                >
                  ← 返回
                </button>
              </div>
            </form>
          )}

          {step === 'setPassword' && (
            <form ref={formRef} onSubmit={handleSetPassword} className="space-y-6">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-800">
                  {loginData?.isFirstLogin ? '设置登录密码' : '设置密码保护账号'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  为您的账号设置密码，保护账号安全
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  设置密码 <span className="text-gray-400 font-normal">（至少6位）</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all pr-12"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-center">
                  <p className="text-sm text-red-500">{error}</p>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="text-sm text-emerald-600 font-medium mt-1 hover:text-emerald-700"
                  >
                    点击重试
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || password.trim().length < 6}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-semibold rounded-xl transition-colors shadow-md disabled:shadow-none"
              >
                {loading ? '设置中...' : '确认并进入'}
              </button>

              {!loginData?.isFirstLogin && (
                <button
                  type="button"
                  onClick={handleSkipPassword}
                  className="w-full py-2.5 text-gray-500 font-medium text-sm hover:text-gray-700 transition-colors"
                >
                  暂不设置 →
                </button>
              )}
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Equilibrio Corporeo · 身体成分管理
        </p>
      </div>
    </div>
  )
}
