import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useAppStore } from '../../stores/appStore'
import { ClipboardList } from 'lucide-react'

export function WebLoginPage() {
  const { login } = useAuth()
  const { setDesignVersion } = useAppStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err: any) {
      setError(err.message || '로그인에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-10">
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-blue-500/25">
              <ClipboardList className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">WavenetHelper</h1>
            <p className="text-[15px] text-slate-500 mt-1.5">업무처리 요청 시스템</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[14px] font-semibold text-slate-600 mb-2">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 text-[15px] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-slate-50/50 placeholder:text-slate-400 transition-all"
                placeholder="email@company.com"
                required
              />
            </div>
            <div>
              <label className="block text-[14px] font-semibold text-slate-600 mb-2">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 text-[15px] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-slate-50/50 placeholder:text-slate-400 transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="text-[14px] text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-[15px] font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/30"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>

        <div className="text-center mt-6 space-y-2">
          <p className="text-[14px] text-slate-500">
            계정이 없으신가요?{' '}
            <a
              href="/signup"
              className="text-blue-500 hover:text-blue-600 font-medium underline underline-offset-2"
            >
              가입 요청
            </a>
          </p>
          <p className="text-[13px] text-slate-400">
            WavenetHelper v1.0 ·{' '}
            <button
              type="button"
              onClick={() => setDesignVersion('v2')}
              className="text-indigo-500 hover:text-indigo-600 underline underline-offset-2"
            >
              새 디자인 보기
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
