import { useState, useEffect } from 'react'
import { UserPlus, Check, X, Clock, AlertCircle, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { LoadingSpinner } from '../common/LoadingSpinner'
import type { Department } from '../../lib/types'

interface SignupRequest {
  id: string
  name: string
  email: string
  password_hash: string
  department_name: string | null
  reason: string | null
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by: string | null
  reviewed_at: string | null
  reject_reason: string | null
  created_at: string
}

const STATUS_CONFIG = {
  pending: { label: '대기중', color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: '승인', color: 'bg-emerald-100 text-emerald-700', icon: Check },
  rejected: { label: '거절', color: 'bg-red-100 text-red-700', icon: X },
}

export function SignupRequestManagement() {
  const [requests, setRequests] = useState<SignupRequest[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [search, setSearch] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [assignRole, setAssignRole] = useState('user')
  const [assignDeptId, setAssignDeptId] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [reqRes, deptRes] = await Promise.all([
        supabase.from('signup_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('departments').select('*').order('name'),
      ])
      if (reqRes.data) setRequests(reqRes.data as SignupRequest[])
      if (deptRes.data) setDepartments(deptRes.data as Department[])
    } catch (err) {
      console.error('Failed to fetch signup requests:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (req: SignupRequest) => {
    setError('')
    setProcessing(req.id)

    try {
      // Edge Function으로 사용자 생성
      const deptId = assignDeptId || departments.find(d => d.name === req.department_name)?.id || null

      const { data, error: fnError } = await supabase.functions.invoke('create-user', {
        body: {
          users: [{
            name: req.name,
            email: req.email,
            password: req.password_hash,
            role: assignRole,
            department_id: deptId,
          }],
        },
      })

      if (fnError) throw fnError

      const result = data?.results?.[0]
      if (!result?.success) {
        throw new Error(result?.error || '사용자 생성에 실패했습니다.')
      }

      // 요청 상태 업데이트
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      await supabase
        .from('signup_requests')
        .update({
          status: 'approved',
          reviewed_by: currentUser?.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', req.id)

      setExpandedId(null)
      setAssignRole('user')
      setAssignDeptId('')
      fetchData()
    } catch (err: any) {
      setError(err.message || '승인 처리 중 오류가 발생했습니다.')
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (req: SignupRequest) => {
    setError('')
    setProcessing(req.id)

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      await supabase
        .from('signup_requests')
        .update({
          status: 'rejected',
          reviewed_by: currentUser?.id,
          reviewed_at: new Date().toISOString(),
          reject_reason: rejectReason.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', req.id)

      setExpandedId(null)
      setRejectReason('')
      fetchData()
    } catch (err: any) {
      setError(err.message || '거절 처리 중 오류가 발생했습니다.')
    } finally {
      setProcessing(null)
    }
  }

  const filteredRequests = requests.filter(r => {
    const matchStatus = !statusFilter || r.status === statusFilter
    const matchSearch = !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const pendingCount = requests.filter(r => r.status === 'pending').length

  const formatDate = (d: string) => {
    const date = new Date(d)
    return `${date.toLocaleDateString('ko-KR')} ${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`
  }

  const getTimeDiff = (d: string) => {
    const diff = Date.now() - new Date(d).getTime()
    const hours = Math.floor(diff / 3600000)
    if (hours < 1) return '방금 전'
    if (hours < 24) return `${hours}시간 전`
    const days = Math.floor(hours / 24)
    return `${days}일 전`
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-500" />
            가입 요청 관리
          </h2>
          <p className="text-[14px] text-slate-500 mt-1">
            사용자 가입 요청을 검토하고 승인/거절합니다.
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold bg-amber-100 text-amber-700 rounded-lg">
            <Clock className="w-3.5 h-3.5" />
            대기 {pendingCount}건
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-[14px] border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder:text-slate-400"
            placeholder="이름 또는 이메일로 검색..."
          />
        </div>
        <div className="flex gap-2">
          {(['', 'pending', 'approved', 'rejected'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3.5 py-2 text-[13px] font-medium rounded-lg transition-colors ${
                statusFilter === s
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === '' ? '전체' : STATUS_CONFIG[s].label}
              {s === 'pending' && pendingCount > 0 && ` (${pendingCount})`}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-[14px] text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Request list */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-16 text-[15px] text-slate-400">
          {statusFilter === 'pending' ? '대기 중인 요청이 없습니다.' : '요청이 없습니다.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map(req => {
            const config = STATUS_CONFIG[req.status]
            const StatusIcon = config.icon
            const isExpanded = expandedId === req.id

            return (
              <div key={req.id} className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
                {/* Summary row */}
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/80 transition-colors"
                  onClick={() => {
                    setExpandedId(isExpanded ? null : req.id)
                    setAssignRole('user')
                    setAssignDeptId(departments.find(d => d.name === req.department_name)?.id || '')
                    setRejectReason('')
                  }}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-blue-600">{req.name.charAt(0)}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-semibold text-slate-900 truncate">{req.name}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md ${config.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </span>
                    </div>
                    <p className="text-[13px] text-slate-500 truncate">{req.email}</p>
                  </div>

                  {/* Time */}
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-[13px] text-slate-500">{getTimeDiff(req.created_at)}</p>
                    {req.department_name && (
                      <p className="text-[12px] text-slate-400 mt-0.5">{req.department_name}</p>
                    )}
                  </div>

                  {/* Expand icon */}
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  }
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-5 py-5 bg-slate-50/50 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[14px]">
                      <div>
                        <span className="text-slate-500">이름:</span>{' '}
                        <span className="font-medium text-slate-800">{req.name}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">이메일:</span>{' '}
                        <span className="font-medium text-slate-800">{req.email}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">희망 부서:</span>{' '}
                        <span className="font-medium text-slate-800">{req.department_name || '미선택'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">신청일:</span>{' '}
                        <span className="font-medium text-slate-800">{formatDate(req.created_at)}</span>
                      </div>
                    </div>

                    {req.reason && (
                      <div className="text-[14px]">
                        <span className="text-slate-500">가입 사유:</span>
                        <p className="mt-1 text-slate-700 bg-white rounded-lg px-3 py-2 border border-slate-200">{req.reason}</p>
                      </div>
                    )}

                    {/* 승인 처리 결과 */}
                    {req.status !== 'pending' && (
                      <div className={`text-[14px] px-4 py-3 rounded-lg ${
                        req.status === 'approved' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
                      }`}>
                        <p className={req.status === 'approved' ? 'text-emerald-700' : 'text-red-700'}>
                          {req.status === 'approved' ? '✅ 승인 완료' : '❌ 거절됨'}
                          {req.reviewed_at && ` (${formatDate(req.reviewed_at)})`}
                        </p>
                        {req.reject_reason && (
                          <p className="text-red-600 mt-1">사유: {req.reject_reason}</p>
                        )}
                      </div>
                    )}

                    {/* 승인/거절 액션 (pending일 때만) */}
                    {req.status === 'pending' && (
                      <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[13px] font-medium text-slate-600 mb-1.5">부여할 역할</label>
                            <select
                              value={assignRole}
                              onChange={(e) => setAssignRole(e.target.value)}
                              className="w-full px-3 py-2.5 text-[14px] border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            >
                              <option value="user">일반 사용자</option>
                              <option value="handler">담당자</option>
                              <option value="admin">관리자</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[13px] font-medium text-slate-600 mb-1.5">배정할 부서</label>
                            <select
                              value={assignDeptId}
                              onChange={(e) => setAssignDeptId(e.target.value)}
                              className="w-full px-3 py-2.5 text-[14px] border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            >
                              <option value="">미배정</option>
                              {departments.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[13px] font-medium text-slate-600 mb-1.5">거절 사유 (거절 시)</label>
                          <input
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="w-full px-3 py-2.5 text-[14px] border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-slate-400"
                            placeholder="거절 시 사유를 입력하세요 (선택)"
                          />
                        </div>

                        <div className="flex gap-3 justify-end">
                          <button
                            onClick={() => handleReject(req)}
                            disabled={processing === req.id}
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-[14px] font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                            거절
                          </button>
                          <button
                            onClick={() => handleApprove(req)}
                            disabled={processing === req.id}
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-[14px] font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                            {processing === req.id ? '처리 중...' : '승인'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <p className="text-[13px] text-slate-400 text-center">
        총 {filteredRequests.length}건{statusFilter ? ` (전체 ${requests.length}건)` : ''}
      </p>
    </div>
  )
}
