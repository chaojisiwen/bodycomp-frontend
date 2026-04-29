import { useState } from 'react'

// 本地 mock 模式的邀请码白名单（仅用于本地开发调试）
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
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'code' | 'password' | 'setPassword'>('code')
  const [loginData, setLoginData] = useState<LoginResponse['data'] | null>(null)

  // ── Step 1: 输入邀请码 ───────────────────────────────────────
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return

    setLoading(true)
    setError('')

    try {
      const app = (window as any).__TCBA__?.app
      if (!app) {
        // Mock 模式
        const upper = code.trim().toUpperCase()
        if (!MOCK_VALID_CODES.includes(upper)) {
          setError('邀请码无效，请输入正确的邀请码')
          setLoading(false)
          return
        }
        // 检查本地是否已设置过密码
        const storedPw = localStorage.getItem(`pw_${upper}`)
        if (storedPw) {
          // 已有密码 → 要求输入密码
          setLoginData({ needPassword: true } as any)
          setStep('password')
        } else {
          // 无密码记录 → 首次或未设密码
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

      const res = await app.callFunction({
        name: 'validateInviteCode',
        data: { action: 'login', code: code.trim() }
      }) as { result: LoginResponse }

      const result = res.result

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

      // 登录成功（首次新用户）
      await finishLogin(result.data?.role || 'member', result.data)
    } catch {
      setError('登录失败，请检查网络')
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
      const app = (window as any).__TCBA__?.app
      if (!app) {
        // Mock 模式：验证本地存储的密码
        const upper = code.trim().toUpperCase()
        const storedPw = localStorage.getItem(`pw_${upper}`)
        if (storedPw && storedPw !== password.trim()) {
          setError('密码错误')
          setLoading(false)
          return
        }
        // 密码正确（或未设置密码）→ 完成登录
        await finishLogin(loginData?.role || 'member', loginData || null)
        return
      }

      const res = await app.callFunction({
        name: 'validateInviteCode',
        data: { action: 'login', code: code.trim(), password: password.trim() }
      }) as { result: LoginResponse }

      const result = res.result

      if (result.code !== 0) {
        setError(result.message || '登录失败')
        setLoading(false)
        return
      }

      await finishLogin(result.data?.role || 'member', result.data)
    } catch {
      setError('登录失败，请检查网络')
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

    try {
      const app = (window as any).__TCBA__?.app
      const upper = code.trim().toUpperCase()

      if (!app) {
        // Mock 模式：存密码到 localStorage
        localStorage.setItem(`pw_${upper}`, password.trim())
        await finishLogin(loginData?.role || 'member', loginData || null)
        return
      }

      const res = await app.callFunction({
        name: 'validateInviteCode',
        data: { action: 'setPassword', code: upper, password: password.trim() }
      }) as { result: LoginResponse }

      const result = res.result

      if (result.code !== 0) {
        setError(result.message || '设置失败')
        setLoading(false)
        return
      }

      await finishLogin(result.data?.role || loginData?.role || 'member', result.data)
    } catch {
      setError('设置失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  // ── 跳过设置密码 ─────────────────────────────────────────────
  const handleSkipPassword = () => {
    const upper = code.trim().toUpperCase()
    // 标记该账号已有密码保护，下次必须输入
    localStorage.setItem(`pw_${upper}`, '__REQUIRED__')
    // 跳转到密码输入页，下次必须输密码
    setPassword('')
    setError('')
    setStep('password')
  }

  // ── 完成登录 ─────────────────────────────────────────────────
  const finishLogin = async (role: string, data: LoginResponse['data'] | null) => {
    const userData = {
      id: data?.uid || data?.userId || `mock-${code}`,
      name: data?.name || '用户',
      phone: '',
      role,
      coachId: '',
    }

    localStorage.setItem('user', JSON.stringify(userData))

    if (role === 'coach') {
      window.location.href = '/#coach/home'
    } else {
      window.location.href = '/#member/home'
    }
  }

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
            <form onSubmit={handleCodeSubmit} className="space-y-6">
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

              {error && <p className="text-sm text-red-500 text-center">{error}</p>}

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
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
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

              {error && <p className="text-sm text-red-500 text-center">{error}</p>}

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
            <form onSubmit={handleSetPassword} className="space-y-6">
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

              {error && <p className="text-sm text-red-500 text-center">{error}</p>}

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
