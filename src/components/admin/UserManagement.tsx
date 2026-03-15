import { useState, useEffect } from 'react'
import { Users, Search, Shield, UserCog, User as UserIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { ConfirmDialog } from '../common/ConfirmDialog'
import type { Profile, Department } from '../../lib/types'

const ROLE_LABELS: Record<string, string> = {
  admin: '관리자',
  handler: '담당자',
  user: '일반 사용자',
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  handler: 'bg-blue-100 text-blue-700',
  user: 'bg-gray-100 text-gray-600',
}

const ROLE_ICONS: Record<string, typeof Shield> = {
  admin: Shield,
  handler: UserCog,
  user: UserIcon,
}

export function UserManagement() {
  const [users, setUsers] = useState<Profile[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [editRole, setEditRole] = useState('')
  const [editDeptId, setEditDeptId] = useState('')
  const [confirmAction, setConfirmAction] = useState<{ userId: string; userName: string; action: string } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [usersRes, deptRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at'),
        supabase.from('departments').select('*').order('name'),
      ])
      if (usersRes.data) setUsers(usersRes.data as Profile[])
      if (deptRes.data) setDepartments(deptRes.data as Department[])
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setError('')
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({ role: newRole } as any)
        .eq('id', userId)
      if (err) throw err
      fetchData()
    } catch (err: any) {
      setError(err.message || '역할 변경에 실패했습니다')
    }
  }

  const handleUpdateDept = async (userId: string, deptId: string | null) => {
    setError('')
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({ department_id: deptId } as any)
        .eq('id', userId)
      if (err) throw err
      fetchData()
    } catch (err: any) {
      setError(err.message || '부서 변경에 실패했습니다')
    }
  }

  const handleSaveEdit = async () => {
    if (!editingUser) return
    setError('')
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({
          role: editRole,
          department_id: editDeptId || null,
        } as any)
        .eq('id', editingUser.id)
      if (err) throw err
      setEditingUser(null)
      fetchData()
    } catch (err: any) {
      setError(err.message || '사용자 정보 수정에 실패했습니다')
    }
  }

  const openEdit = (user: Profile) => {
    setEditingUser(user)
    setEditRole(user.role)
    setEditDeptId(user.department_id || '')
  }

  const getDeptName = (deptId: string | null) => {
    if (!deptId) return '미배정'
    return departments.find((d) => d.id === deptId)?.name || '알 수 없음'
  }

  const filteredUsers = users.filter((u) => {
    const matchSearch = !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    const matchRole = !roleFilter || u.role === roleFilter
    return matchSearch && matchRole
  })

  // Stats
  const adminCount = users.filter((u) => u.role === 'admin').length
  const handlerCount = users.filter((u) => u.role === 'handler').length
  const userCount = users.filter((u) => u.role === 'user').length

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-gray-900">사용자 관리</h2>
        <p className="text-sm text-gray-400 mt-1">
          시스템 사용자의 역할과 소속 부서를 관리합니다.
        </p>
      </div>

      {/* Role stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-50/50 border border-red-100 rounded-xl p-3.5 text-center">
          <p className="text-2xl font-bold text-red-600">{adminCount}</p>
          <p className="text-xs text-red-400 mt-0.5">관리자</p>
        </div>
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 text-center">
          <p className="text-2xl font-bold text-blue-600">{handlerCount}</p>
          <p className="text-xs text-blue-400 mt-0.5">담당자</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-center">
          <p className="text-2xl font-bold text-gray-600">{userCount}</p>
          <p className="text-xs text-gray-400 mt-0.5">일반 사용자</p>
        </div>
      </div>

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            placeholder="이름 또는 이메일로 검색..."
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
        >
          <option value="">전체 역할</option>
          {Object.entries(ROLE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl border border-red-100">
          {error}
        </div>
      )}

      {/* Edit modal */}
      {editingUser && (
        <div className="bg-blue-50/50 rounded-xl p-6 space-y-4 border border-blue-200/50">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center ring-2 ring-white shadow-sm"
              style={{ backgroundColor: editingUser.avatar_color || '#3b82f6' }}
            >
              <span className="text-sm font-bold text-white">{editingUser.name?.charAt(0) || '?'}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{editingUser.name}</p>
              <p className="text-xs text-gray-400">{editingUser.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">역할</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              >
                {Object.entries(ROLE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">소속 부서</label>
              <select
                value={editDeptId}
                onChange={(e) => setEditDeptId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              >
                <option value="">미배정</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setEditingUser(null)}
              className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-5 py-2 text-sm bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors"
            >
              저장
            </button>
          </div>
        </div>
      )}

      {/* User list */}
      <div className="border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-gray-50/80">
            <tr>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">사용자</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">역할</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">부서</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">가입일</th>
              <th className="text-center px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {filteredUsers.map((u) => {
              const RoleIcon = ROLE_ICONS[u.role] || UserIcon
              return (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: u.avatar_color || '#3b82f6' }}
                      >
                        <span className="text-xs font-bold text-white">{u.name?.charAt(0) || '?'}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{u.name || '이름 없음'}</p>
                        <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>
                      <RoleIcon className="w-3 h-3" />
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">
                    {getDeptName(u.department_id)}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-400">
                    {new Date(u.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      onClick={() => openEdit(u)}
                      aria-label={`${u.name} 편집`}
                      className="px-3 py-1.5 text-xs text-blue-500 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                    >
                      편집
                    </button>
                  </td>
                </tr>
              )
            })}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-300">
                  {search || roleFilter ? '검색 결과가 없습니다' : '등록된 사용자가 없습니다'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-300 text-center">
        총 {filteredUsers.length}명{search || roleFilter ? ` (전체 ${users.length}명)` : ''}
      </p>
    </div>
  )
}
