import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { ClipboardList } from 'lucide-react'

export function LoginForm() {
  const { login } = useAuth()
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
    <div className="w-full max-w-xs p-6">
      <div className="flex flex-col items-center mb-6">
        <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-3">
          <ClipboardList className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">WavenetHelper</h1>
        <p className="text-[14px] text-slate-500 mt-0.5">업무처리 요청 시스템</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[13px] font-medium text-slate-600 mb-1.5">이메일</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 text-[15px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            placeholder="email@company.com"
            required
          />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-slate-600 mb-1.5">비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 text-[15px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            placeholder="••••••••"
            required
          />
        </div>

        {error && (
          <p className="text-[13px] text-red-500">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-500 text-white text-[15px] font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </div>
  )
}
