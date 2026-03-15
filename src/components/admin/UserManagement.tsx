import { useState, useEffect, useRef, useCallback } from 'react'
import { Users, Search, Plus, Upload, Download, X, Check, AlertCircle, FileSpreadsheet, UserPlus, Ban } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { ROLE_LABELS, ROLE_COLORS, ROLE_MAP, ROLES } from '../../lib/roles'
import type { Profile, Department } from '../../lib/types'

const COLUMN_MAP: Record<string, string> = {
  '이름': 'name', name: 'name', '이메일': 'email', email: 'email',
  '비밀번호': 'password', password: 'password', '역할': 'role', role: 'role',
  '부서': 'department', department: 'department',
}

interface BulkUser {
  name: string; email: string; password: string; role: string
  department: string; department_id: string | null; errors: string[]
}

interface BulkResult { email: string; success: boolean; error?: string }

interface SignupRequest {
  id: string; name: string; email: string; password_hash: string
  department_name: string | null; reason: string | null
  status: 'pending' | 'approved' | 'rejected'
  requested_type: 'employee' | 'partner'
  reject_reason: string | null; created_at: string
}

type ListFilter = 'all' | 'active' | 'signup'

export function UserManagement() {
  const [users, setUsers] = useState<Profile[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [signupRequests, setSignupRequests] = useState<SignupRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [listFilter, setListFilter] = useState<ListFilter>('all')
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [error, setError] = useState('')

  // 개별 등록
  const [showAddUser, setShowAddUser] = useState(false)
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState('partner')
  const [formDeptId, setFormDeptId] = useState('')
  const [creating, setCreating] = useState(false)
  const [createSuccess, setCreateSuccess] = useState('')

  // Excel
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [bulkUsers, setBulkUsers] = useState<BulkUser[]>([])
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([])
  const [bulkCreating, setBulkCreating] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 가입요청 인라인 처리
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [approveSettings, setApproveSettings] = useState<Record<string, { role: string; deptId: string }>>({})

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [usersRes, deptRes, signupRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at'),
        supabase.from('departments').select('*').order('name'),
        supabase.from('signup_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      ])
      if (usersRes.data) setUsers(usersRes.data as Profile[])
      if (deptRes.data) setDepartments(deptRes.data as Department[])
      if (signupRes.data) setSignupRequests(signupRes.data as SignupRequest[])
    } catch (err) {
      console.error('Failed to fetch:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── 기존 사용자 인라인 편집 ──
  const handleInlineUpdate = async (userId: string, field: 'role' | 'department_id', value: string) => {
    setError('')
    setSavingUserId(userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, [field]: value || null } as Profile : u))
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({ [field]: value || null } as any)
        .eq('id', userId)
      if (err) throw err
    } catch (err: any) {
      setError(err.message || '사용자 정보 수정에 실패했습니다')
      fetchData()
    } finally {
      setSavingUserId(null)
    }
  }

  // ── 개별 등록 ──
  const resetAddForm = () => {
    setFormName(''); setFormEmail(''); setFormPassword('')
    setFormRole('partner'); setFormDeptId(''); setCreateSuccess(''); setError('')
  }

  const handleCreateUser = async () => {
    setError(''); setCreateSuccess('')
    if (!formName.trim()) { setError('이름을 입력해주세요.'); return }
    if (!formEmail.trim()) { setError('이메일을 입력해주세요.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail)) { setError('올바른 이메일 형식이 아닙니다.'); return }
    if (users.some(u => u.email === formEmail.trim())) { setError('이미 등록된 이메일입니다.'); return }
    if (formPassword.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return }

    setCreating(true)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-user', {
        body: { users: [{ name: formName.trim(), email: formEmail.trim(), password: formPassword, role: formRole, department_id: formDeptId || null }] },
      })
      if (fnError) throw fnError
      const result = data?.results?.[0]
      if (result?.success) {
        setCreateSuccess(`${formName} (${formEmail}) 등록 완료!`)
        resetAddForm(); fetchData()
      } else {
        setError(result?.error || '사용자 생성에 실패했습니다.')
      }
    } catch (err: any) {
      setError(err.message || '서버 오류가 발생했습니다.')
    } finally { setCreating(false) }
  }

  // ── 가입 요청 승인 ──
  const handleApproveSignup = async (req: SignupRequest) => {
    setError('')
    setProcessingId(req.id)
    const settings = approveSettings[req.id] || { role: 'partner', deptId: '' }

    try {
      const deptId = settings.deptId || departments.find(d => d.name === req.department_name)?.id || null
      const { data, error: fnError } = await supabase.functions.invoke('create-user', {
        body: { users: [{ name: req.name, email: req.email, password: req.password_hash, role: settings.role, department_id: deptId }] },
      })
      if (fnError) throw fnError
      const result = data?.results?.[0]
      if (!result?.success) throw new Error(result?.error || '사용자 생성 실패')

      const { data: { user: me } } = await supabase.auth.getUser()
      await supabase.from('signup_requests').update({
        status: 'approved', reviewed_by: me?.id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq('id', req.id)

      fetchData()
    } catch (err: any) {
      setError(err.message || '승인 처리 중 오류')
    } finally { setProcessingId(null) }
  }

  // ── 가입 요청 거절 ──
  const handleRejectSignup = async (req: SignupRequest) => {
    setError('')
    setProcessingId(req.id)
    try {
      const { data: { user: me } } = await supabase.auth.getUser()
      await supabase.from('signup_requests').update({
        status: 'rejected', reviewed_by: me?.id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq('id', req.id)
      fetchData()
    } catch (err: any) {
      setError(err.message || '거절 처리 중 오류')
    } finally { setProcessingId(null) }
  }

  // ── Excel ──
  const parseExcelFile = useCallback(async (file: File) => {
    setBulkResults([]); setError('')
    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' })
      if (rawRows.length === 0) { setError('파일에 데이터가 없습니다.'); return }

      const firstRow = rawRows[0]
      const headerMap: Record<string, string> = {}
      for (const key of Object.keys(firstRow)) {
        const normalized = key.trim().toLowerCase()
        for (const [pattern, mapped] of Object.entries(COLUMN_MAP)) {
          if (normalized === pattern.toLowerCase()) { headerMap[key] = mapped; break }
        }
      }

      const existingEmails = new Set(users.map(u => u.email?.toLowerCase()))
      const seenEmails = new Set<string>()
      const deptNameMap = new Map(departments.map(d => [d.name.toLowerCase(), d.id]))

      const parsed: BulkUser[] = rawRows.map((row) => {
        const mapped: Record<string, string> = {}
        for (const [origKey, mappedKey] of Object.entries(headerMap)) {
          mapped[mappedKey] = String(row[origKey] || '').trim()
        }
        const errors: string[] = []
        const name = mapped['name'] || '', email = mapped['email'] || ''
        const password = mapped['password'] || '', roleRaw = mapped['role'] || '', deptName = mapped['department'] || ''

        if (!name) errors.push('이름 누락')
        if (!email) errors.push('이메일 누락')
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('이메일 형식 오류')
        else if (existingEmails.has(email.toLowerCase())) errors.push('이미 등록된 이메일')
        else if (seenEmails.has(email.toLowerCase())) errors.push('파일 내 중복 이메일')
        if (email) seenEmails.add(email.toLowerCase())
        if (!password) errors.push('비밀번호 누락')
        else if (password.length < 6) errors.push('비밀번호 6자 미만')
        const role = ROLE_MAP[roleRaw] || ROLE_MAP[roleRaw.toLowerCase()] || ''
        if (!role) errors.push(`역할 오류: "${roleRaw}"`)
        let department_id: string | null = null
        if (deptName) { const found = deptNameMap.get(deptName.toLowerCase()); if (found) department_id = found; else errors.push(`부서 없음: "${deptName}"`) }
        return { name, email, password, role, department: deptName, department_id, errors }
      })
      setBulkUsers(parsed)
    } catch (err: any) { setError(`파일 파싱 실패: ${err.message}`) }
  }, [users, departments])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (file) parseExcelFile(file); e.target.value = ''
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.csv') || file.name.endsWith('.xls'))) parseExcelFile(file)
    else setError('.xlsx 또는 .csv 파일만 업로드 가능합니다.')
  }

  const validBulkUsers = bulkUsers.filter(u => u.errors.length === 0)
  const invalidCount = bulkUsers.length - validBulkUsers.length

  const handleBulkCreate = async () => {
    if (validBulkUsers.length === 0) return
    setError(''); setBulkCreating(true); setBulkResults([])
    try {
      const payload = validBulkUsers.map(u => ({ name: u.name, email: u.email, password: u.password, role: u.role, department_id: u.department_id }))
      const { data, error: fnError } = await supabase.functions.invoke('create-user', { body: { users: payload } })
      if (fnError) throw fnError
      setBulkResults(data?.results || [])
      if ((data?.summary?.success || 0) > 0) fetchData()
    } catch (err: any) { setError(err.message || '일괄 등록 중 오류') }
    finally { setBulkCreating(false) }
  }

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['이름', '이메일', '비밀번호', '역할', '부서'],
      ['홍길동', 'hong@example.com', 'temp1234', '부서담당', departments[0]?.name || '고객지원팀'],
      ['김철수', 'kim@example.com', 'temp1234', '협력점', departments[1]?.name || ''],
    ])
    ws['!cols'] = [{ wch: 12 }, { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 16 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '사용자')
    XLSX.writeFile(wb, 'WavenetHelper_사용자_등록_양식.xlsx')
  }

  // ── 필터링 ──
  const filteredUsers = users.filter((u) => {
    const matchSearch = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    const matchRole = !roleFilter || u.role === roleFilter
    return matchSearch && matchRole
  })

  const filteredSignups = signupRequests.filter((r) => {
    return !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase())
  })

  const superAdminCount = users.filter((u) => u.role === 'super_admin').length
  const siteAdminCount = users.filter((u) => u.role === 'site_admin').length
  const deptManagerCount = users.filter((u) => u.role === 'dept_manager').length
  const deptSubManagerCount = users.filter((u) => u.role === 'dept_sub_manager').length
  const partnerCount = users.filter((u) => u.role === 'partner').length
  const pendingCount = signupRequests.length

  const getTimeDiff = (d: string) => {
    const diff = Date.now() - new Date(d).getTime()
    const hours = Math.floor(diff / 3600000)
    if (hours < 1) return '방금 전'
    if (hours < 24) return `${hours}시간 전`
    return `${Math.floor(hours / 24)}일 전`
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">사용자 관리</h2>
          <p className="text-[15px] text-slate-500 mt-1.5">시스템 사용자의 역할과 소속 부서를 관리합니다.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setShowAddUser(!showAddUser); setShowBulkUpload(false); resetAddForm() }}
            className={`flex items-center gap-2 px-5 py-3 text-[15px] font-medium rounded-xl transition-colors shadow-sm ${showAddUser ? 'bg-slate-200 text-slate-700' : 'bg-blue-500 text-white hover:bg-blue-600 shadow-blue-500/20'}`}
          >
            {showAddUser ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            사용자 추가
          </button>
          <button
            onClick={() => { setShowBulkUpload(!showBulkUpload); setShowAddUser(false); setBulkUsers([]); setBulkResults([]) }}
            className={`flex items-center gap-2 px-5 py-3 text-[15px] font-medium rounded-xl transition-colors shadow-sm ${showBulkUpload ? 'bg-slate-200 text-slate-700' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'}`}
          >
            {showBulkUpload ? <X className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
            Excel 업로드
          </button>
        </div>
      </div>

      {/* ── 개별 사용자 등록 폼 ── */}
      {showAddUser && (
        <div className="bg-blue-50/50 rounded-xl p-6 space-y-4 border border-blue-200/50">
          <h3 className="text-[16px] font-semibold text-slate-800 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-500" />새 사용자 등록
          </h3>
          {createSuccess && (
            <div className="flex items-center gap-2 text-[14px] text-emerald-700 bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-200">
              <Check className="w-4 h-4" />{createSuccess}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">이름 *</label>
              <input value={formName} onChange={(e) => setFormName(e.target.value)} maxLength={50}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" placeholder="홍길동" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">이메일 *</label>
              <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" placeholder="hong@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">임시 비밀번호 *</label>
              <input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" placeholder="6자 이상" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">역할 *</label>
              <select value={formRole} onChange={(e) => setFormRole(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400">
                {ROLES.map((r) => (<option key={r} value={r}>{ROLE_LABELS[r]}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">부서</label>
              <select value={formDeptId} onChange={(e) => setFormDeptId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400">
                <option value="">미배정</option>
                {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
              </select>
            </div>
          </div>
          {error && showAddUser && <div className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl border border-red-100">{error}</div>}
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => { setShowAddUser(false); resetAddForm() }}
              className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">취소</button>
            <button onClick={handleCreateUser} disabled={creating}
              className="px-5 py-2 text-sm bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50">
              {creating ? '등록 중...' : '등록'}
            </button>
          </div>
        </div>
      )}

      {/* ── Excel 일괄 등록 ── */}
      {showBulkUpload && (
        <div className="bg-emerald-50/50 rounded-xl p-6 space-y-5 border border-emerald-200/50">
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-semibold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-500" />Excel 일괄 등록
            </h3>
            <button onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors font-medium">
              <Download className="w-3.5 h-3.5" />양식 다운로드
            </button>
          </div>

          {bulkUsers.length === 0 && bulkResults.length === 0 && (
            <div onDragOver={(e) => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${dragOver ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/30'}`}>
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="text-[15px] font-medium text-slate-700">파일을 드래그하거나 클릭하여 업로드</p>
              <p className="text-[13px] text-slate-500 mt-1">.xlsx, .xls, .csv 파일 지원</p>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" />
            </div>
          )}

          {bulkUsers.length > 0 && bulkResults.length === 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[14px] font-medium text-slate-700">총 {bulkUsers.length}명</span>
                  {invalidCount > 0 && <span className="inline-flex items-center gap-1 text-[13px] text-red-600 bg-red-50 px-2.5 py-1 rounded-lg"><AlertCircle className="w-3.5 h-3.5" />오류 {invalidCount}건</span>}
                  <span className="text-[13px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">등록 가능 {validBulkUsers.length}명</span>
                </div>
                <button onClick={() => { setBulkUsers([]); setBulkResults([]) }} className="text-[13px] text-slate-500 hover:text-slate-700 font-medium">다시 선택</button>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">#</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">이름</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">이메일</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">비밀번호</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">역할</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">부서</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {bulkUsers.map((u, i) => (
                      <tr key={i} className={u.errors.length > 0 ? 'bg-red-50/50' : 'hover:bg-gray-50/50'}>
                        <td className="text-center px-3 py-2.5 text-gray-500">{i + 1}</td>
                        <td className="px-3 py-2.5 font-medium text-gray-900">{u.name || '-'}</td>
                        <td className="px-3 py-2.5 text-gray-600">{u.email || '-'}</td>
                        <td className="text-center px-3 py-2.5 text-gray-400">{'•'.repeat(Math.min(u.password.length, 8))}</td>
                        <td className="text-center px-3 py-2.5">
                          {u.role ? <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold ${ROLE_COLORS[u.role] || 'bg-slate-100 text-slate-600'}`}>{ROLE_LABELS[u.role] || u.role}</span> : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600">{u.department || '미배정'}</td>
                        <td className="px-3 py-2.5">
                          {u.errors.length > 0 ? <span className="text-red-600 text-[12px]">{u.errors.join(', ')}</span>
                            : <span className="text-emerald-600 text-[12px] font-medium flex items-center gap-1"><Check className="w-3.5 h-3.5" /> 유효</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button onClick={() => { setShowBulkUpload(false); setBulkUsers([]) }} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">취소</button>
                <button onClick={handleBulkCreate} disabled={bulkCreating || validBulkUsers.length === 0}
                  className="px-5 py-2 text-sm bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50">
                  {bulkCreating ? '등록 중...' : `${validBulkUsers.length}명 일괄 등록`}
                </button>
              </div>
            </div>
          )}

          {bulkResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-[14px] font-semibold text-slate-700">등록 결과</span>
                <span className="text-[13px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">성공 {bulkResults.filter(r => r.success).length}명</span>
                {bulkResults.some(r => !r.success) && <span className="text-[13px] text-red-600 bg-red-50 px-2.5 py-1 rounded-lg">실패 {bulkResults.filter(r => !r.success).length}명</span>}
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50/80"><tr><th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 w-10">#</th><th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">이메일</th><th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">결과</th></tr></thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {bulkResults.map((r, i) => (
                      <tr key={i} className={r.success ? '' : 'bg-red-50/50'}>
                        <td className="text-center px-4 py-2.5 text-gray-500">{i + 1}</td>
                        <td className="px-4 py-2.5 text-gray-700">{r.email}</td>
                        <td className="text-center px-4 py-2.5">{r.success ? <span className="inline-flex items-center gap-1 text-emerald-600 font-medium"><Check className="w-4 h-4" /> 성공</span> : <span className="text-red-600">{r.error}</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end"><button onClick={() => { setBulkUsers([]); setBulkResults([]) }} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors font-medium">닫기</button></div>
            </div>
          )}
        </div>
      )}

      {/* Role stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-4 text-center">
          <p className="text-[22px] font-bold text-purple-600 tracking-tight">{superAdminCount}</p>
          <p className="text-[12px] text-purple-500 mt-0.5">최고관리자</p>
        </div>
        <div className="bg-red-50/60 border border-red-100 rounded-xl p-4 text-center">
          <p className="text-[22px] font-bold text-red-600 tracking-tight">{siteAdminCount}</p>
          <p className="text-[12px] text-red-500 mt-0.5">사이트관리자</p>
        </div>
        <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 text-center">
          <p className="text-[22px] font-bold text-blue-600 tracking-tight">{deptManagerCount}</p>
          <p className="text-[12px] text-blue-500 mt-0.5">부서담당</p>
        </div>
        <div className="bg-sky-50/60 border border-sky-100 rounded-xl p-4 text-center">
          <p className="text-[22px] font-bold text-sky-600 tracking-tight">{deptSubManagerCount}</p>
          <p className="text-[12px] text-sky-500 mt-0.5">부서부담당</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-[22px] font-bold text-slate-600 tracking-tight">{partnerCount}</p>
          <p className="text-[12px] text-slate-500 mt-0.5">협력점</p>
        </div>
        <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-4 text-center">
          <p className="text-[22px] font-bold text-amber-600 tracking-tight">{pendingCount}</p>
          <p className="text-[12px] text-amber-500 mt-0.5">가입 대기</p>
        </div>
      </div>

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 text-[15px] border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder:text-slate-400"
            placeholder="이름 또는 이메일로 검색..." />
        </div>
        <div className="flex gap-2">
          {([
            { key: 'all' as ListFilter, label: '전체', count: users.length + pendingCount },
            { key: 'active' as ListFilter, label: '활성 사용자', count: users.length },
            { key: 'signup' as ListFilter, label: '가입 대기', count: pendingCount },
          ]).map(f => (
            <button key={f.key} onClick={() => setListFilter(f.key)}
              className={`px-3.5 py-2.5 text-[13px] font-medium rounded-xl transition-colors whitespace-nowrap ${
                listFilter === f.key ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}>
              {f.label}{f.key === 'signup' && pendingCount > 0 ? ` (${pendingCount})` : ''}
            </button>
          ))}
        </div>
        {listFilter !== 'signup' && (
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-3 text-[15px] border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-slate-700">
            <option value="">전체 역할</option>
            {ROLES.map((r) => (<option key={r} value={r}>{ROLE_LABELS[r]}</option>))}
          </select>
        )}
      </div>

      {error && !showAddUser && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl border border-red-100">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* ── 가입 대기 요청 목록 (signup 또는 all) ── */}
      {(listFilter === 'signup' || listFilter === 'all') && filteredSignups.length > 0 && (
        <div className="space-y-3">
          {listFilter === 'all' && (
            <h3 className="text-[14px] font-semibold text-amber-700 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              가입 대기 ({filteredSignups.length}건)
            </h3>
          )}
          <div className="border border-amber-200 rounded-xl overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-amber-50/80">
                <tr>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-amber-700 uppercase tracking-wider">신청자</th>
                  <th className="text-center px-5 py-3.5 text-xs font-semibold text-amber-700 uppercase tracking-wider w-20">유형</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-amber-700 uppercase tracking-wider">희망부서</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-amber-700 uppercase tracking-wider">사유</th>
                  <th className="text-center px-5 py-3.5 text-xs font-semibold text-amber-700 uppercase tracking-wider">신청일</th>
                  <th className="text-center px-3 py-3.5 text-xs font-semibold text-amber-700 uppercase tracking-wider w-32">역할</th>
                  <th className="text-center px-3 py-3.5 text-xs font-semibold text-amber-700 uppercase tracking-wider w-36">부서 배정</th>
                  <th className="text-center px-3 py-3.5 text-xs font-semibold text-amber-700 uppercase tracking-wider w-24">처리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100 bg-white">
                {filteredSignups.map(req => {
                  const defaultRole = req.requested_type === 'partner' ? 'partner' : 'dept_sub_manager'
                  const settings = approveSettings[req.id] || {
                    role: defaultRole,
                    deptId: departments.find(d => d.name === req.department_name)?.id || '',
                  }
                  const isProcessing = processingId === req.id

                  return (
                    <tr key={req.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{req.name}</p>
                          <p className="text-xs text-gray-500">{req.email}</p>
                        </div>
                      </td>
                      <td className="text-center px-5 py-3.5">
                        <span className={`inline-block px-2.5 py-1 text-[11px] font-semibold rounded-md ${
                          req.requested_type === 'partner'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {req.requested_type === 'partner' ? '협력점' : '직원'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{req.department_name || '-'}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-500 max-w-[200px] truncate" title={req.reason || ''}>{req.reason || '-'}</td>
                      <td className="text-center px-5 py-3.5 text-xs text-gray-500">{getTimeDiff(req.created_at)}</td>
                      <td className="text-center px-3 py-3.5">
                        <select
                          value={settings.role}
                          onChange={(e) => setApproveSettings(prev => ({ ...prev, [req.id]: { ...settings, role: e.target.value } }))}
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                        >
                          {ROLES.map((r) => (<option key={r} value={r}>{ROLE_LABELS[r]}</option>))}
                        </select>
                      </td>
                      <td className="text-center px-3 py-3.5">
                        <select
                          value={settings.deptId}
                          onChange={(e) => setApproveSettings(prev => ({ ...prev, [req.id]: { ...settings, deptId: e.target.value } }))}
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                        >
                          <option value="">미배정</option>
                          {departments.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
                        </select>
                      </td>
                      <td className="text-center px-3 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleApproveSignup(req)}
                            disabled={isProcessing}
                            title="승인"
                            className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRejectSignup(req)}
                            disabled={isProcessing}
                            title="거절"
                            className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 활성 사용자 목록 (업체관리 스타일) ── */}
      {(listFilter === 'active' || listFilter === 'all') && (
        <>
          {listFilter === 'all' && filteredSignups.length > 0 && (
            <h3 className="text-[14px] font-semibold text-slate-700 flex items-center gap-2">
              <Users className="w-4 h-4" />
              활성 사용자 ({filteredUsers.length}명)
            </h3>
          )}
          <div className="border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">사용자</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">역할</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">부서</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">가입일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredUsers.map((u) => {
                  const isSaving = savingUserId === u.id
                  return (
                    <tr key={u.id} className={`hover:bg-gray-50/50 transition-colors ${isSaving ? 'opacity-70' : ''}`}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: u.avatar_color || '#3b82f6' }}>
                            <span className="text-sm font-bold text-white">{u.name?.charAt(0) || '?'}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{u.name || '이름 없음'}</p>
                            <p className="text-xs text-gray-500 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <select
                          value={u.role}
                          onChange={(e) => handleInlineUpdate(u.id, 'role', e.target.value)}
                          disabled={isSaving}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {ROLES.map((r) => (<option key={r} value={r}>{ROLE_LABELS[r]}</option>))}
                        </select>
                      </td>
                      <td className="px-5 py-3.5">
                        <select
                          value={u.department_id || ''}
                          onChange={(e) => handleInlineUpdate(u.id, 'department_id', e.target.value)}
                          disabled={isSaving}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <option value="">미배정</option>
                          {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                        </select>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-500">{new Date(u.created_at).toLocaleDateString('ko-KR')}</td>
                    </tr>
                  )
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-sm text-gray-300">
                      {search || roleFilter ? '검색 결과가 없습니다' : '등록된 사용자가 없습니다'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
