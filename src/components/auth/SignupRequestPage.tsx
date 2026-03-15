import { useState, useEffect } from 'react'
import { ClipboardList, ArrowLeft, Check, AlertCircle, Users, Building2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type UserType = 'employee' | 'partner'

export function SignupRequestPage({ onBack }: { onBack: () => void }) {
  const [userType, setUserType] = useState<UserType>('employee')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [department, setDepartment] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    supabase.from('departments').select('id, name').order('name')
      .then(({ data }) => { if (data) setDepartments(data) })
  }, [])

  // 협력점 선택 시 부서 초기화
  useEffect(() => {
    if (userType === 'partner') setDepartment('')
  }, [userType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 유효성 검사
    if (!name.trim()) { setError('이름을 입력해주세요.'); return }
    if (!email.trim()) { setError('이메일을 입력해주세요.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('올바른 이메일 형식이 아닙니다.'); return }
    if (password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return }
    if (password !== passwordConfirm) { setError('비밀번호가 일치하지 않습니다.'); return }

    setLoading(true)
    try {
      // 이미 존재하는 이메일인지 체크 (profiles)
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.trim())
        .maybeSingle()

      if (existing) {
        setError('이미 등록된 이메일입니다.')
        setLoading(false)
        return
      }

      // 이미 대기 중인 요청이 있는지 체크
      const { data: pendingReq } = await supabase
        .from('signup_requests')
        .select('id')
        .eq('email', email.trim())
        .eq('status', 'pending')
        .maybeSingle()

      if (pendingReq) {
        setError('이미 가입 요청이 접수되었습니다. 관리자 승인을 기다려주세요.')
        setLoading(false)
        return
      }

      // 가입 요청 삽입 (비밀번호는 평문으로 저장 — Edge Function에서 auth.admin.createUser 시 사용)
      const { error: insertErr } = await supabase
        .from('signup_requests')
        .insert({
          name: name.trim(),
          email: email.trim(),
          password_hash: password, // Edge Function에서 실제 사용자 생성 시 전달
          department_name: userType === 'employee' ? (department || null) : null,
          reason: reason.trim() || null,
          requested_type: userType,
        })

      if (insertErr) {
        if (insertErr.message?.includes('unique') || insertErr.message?.includes('duplicate')) {
          setError('이미 가입 요청이 접수된 이메일입니다.')
        } else {
          throw insertErr
        }
        setLoading(false)
        return
      }

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || '요청 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 제출 완료 화면
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-10 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">가입 요청 완료</h2>
            <p className="text-[15px] text-slate-500 leading-relaxed mb-8">
              가입 요청이 접수되었습니다.<br />
              관리자 승인 후 로그인하실 수 있습니다.
            </p>
            <button
              onClick={onBack}
              className="w-full py-3.5 bg-slate-100 text-slate-700 text-[15px] font-semibold rounded-xl hover:bg-slate-200 transition-colors"
            >
              로그인 페이지로 돌아가기
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-10">
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-blue-500/25">
              <ClipboardList className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">회원가입 요청</h1>
            <p className="text-[14px] text-slate-500 mt-1.5">WavenetHelper 시스템 사용을 위한 가입 신청</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 유형 선택 */}
            <div>
              <label className="block text-[13px] font-semibold text-slate-600 mb-2">
                가입 유형 <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUserType('employee')}
                  className={`flex items-center justify-center gap-2.5 py-3.5 rounded-xl border-2 text-[15px] font-semibold transition-all ${
                    userType === 'employee'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm shadow-blue-500/10'
                      : 'border-slate-200 bg-slate-50/50 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <Building2 className="w-5 h-5" />
                  직원
                </button>
                <button
                  type="button"
                  onClick={() => setUserType('partner')}
                  className={`flex items-center justify-center gap-2.5 py-3.5 rounded-xl border-2 text-[15px] font-semibold transition-all ${
                    userType === 'partner'
                      ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm shadow-amber-500/10'
                      : 'border-slate-200 bg-slate-50/50 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  협력점
                </button>
              </div>
              <p className="text-[12px] text-slate-400 mt-1.5">
                {userType === 'employee' ? '사내 직원으로 가입합니다. 관리자가 부서를 배정합니다.' : '외부 협력점으로 가입합니다. 업무 요청이 가능합니다.'}
              </p>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-slate-600 mb-1.5">
                {userType === 'partner' ? '업체명 / 담당자명' : '이름'} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                className="w-full px-4 py-3 text-[15px] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-slate-50/50 placeholder:text-slate-400 transition-all"
                placeholder={userType === 'partner' ? 'ABC물류 / 홍길동' : '홍길동'}
                required
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-slate-600 mb-1.5">
                이메일 <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 text-[15px] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-slate-50/50 placeholder:text-slate-400 transition-all"
                placeholder="email@company.com"
                required
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-slate-600 mb-1.5">
                비밀번호 <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 text-[15px] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-slate-50/50 placeholder:text-slate-400 transition-all"
                placeholder="6자 이상"
                required
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-slate-600 mb-1.5">
                비밀번호 확인 <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="w-full px-4 py-3 text-[15px] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-slate-50/50 placeholder:text-slate-400 transition-all"
                placeholder="비밀번호 재입력"
                required
              />
            </div>

            {/* 직원일 때만 부서 선택 표시 */}
            {userType === 'employee' && (
              <div>
                <label className="block text-[13px] font-semibold text-slate-600 mb-1.5">희망 부서</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-3 text-[15px] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-slate-50/50 text-slate-700 transition-all"
                >
                  <option value="">선택 안 함 (관리자가 배정)</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[13px] font-semibold text-slate-600 mb-1.5">가입 사유</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full px-4 py-3 text-[15px] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-slate-50/50 placeholder:text-slate-400 resize-none transition-all"
                placeholder={userType === 'partner' ? '협력 업체명과 담당 업무를 작성해주세요' : '가입 목적을 간단히 작성해주세요 (선택)'}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-[14px] text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-[15px] font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/30"
            >
              {loading ? '요청 중...' : '가입 요청'}
            </button>
          </form>
        </div>

        <button
          onClick={onBack}
          className="flex items-center justify-center gap-1.5 w-full mt-5 text-[14px] text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          로그인 페이지로 돌아가기
        </button>
      </div>
    </div>
  )
}
