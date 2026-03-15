import { useState, useEffect } from 'react'
import { Plus, Trash2, Copy, ExternalLink, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { CATEGORY_LABELS } from '../../lib/constants'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { ConfirmDialog } from '../common/ConfirmDialog'
import type { ExternalClient, Department } from '../../lib/types'

export function ClientManagement() {
  const [clients, setClients] = useState<ExternalClient[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newDeptId, setNewDeptId] = useState('')
  const [newCategory, setNewCategory] = useState('general')
  const [newDescription, setNewDescription] = useState('')
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [clientsRes, deptRes] = await Promise.all([
        supabase.from('external_clients').select('*').order('created_at'),
        supabase.from('departments').select('*').order('name'),
      ])
      if (clientsRes.data) setClients(clientsRes.data as ExternalClient[])
      if (deptRes.data) setDepartments(deptRes.data as Department[])
    } catch (err) {
      console.error('Failed to fetch client data:', err)
    } finally {
      setLoading(false)
    }
  }

  const validate = (): string | null => {
    if (!newName.trim()) return '업체명을 입력해주세요'
    if (!newSlug.trim()) return 'URL 슬러그를 입력해주세요'
    if (newSlug.length < 3) return 'URL 슬러그는 3자 이상이어야 합니다'
    if (!newPassword) return '비밀번호를 입력해주세요'
    if (newPassword.length < 4) return '비밀번호는 4자 이상이어야 합니다'
    if (!newDeptId) return '담당 부서를 선택해주세요'
    return null
  }

  const handleAdd = async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')

    try {
      const { data: hashedPw } = await supabase.rpc('crypt_password', { pw: newPassword })

      const { error: err } = await supabase.from('external_clients').insert({
        name: newName,
        slug: newSlug,
        password_hash: hashedPw,
        target_dept_id: newDeptId,
        default_category: newCategory,
        description: newDescription || null,
      } as any)

      if (err) {
        if (err.message.includes('duplicate') || err.message.includes('unique')) {
          setError('이미 사용 중인 URL 슬러그입니다')
        } else {
          setError(err.message)
        }
        return
      }

      setShowAdd(false)
      setNewName('')
      setNewSlug('')
      setNewPassword('')
      setNewDeptId('')
      setNewCategory('general')
      setNewDescription('')
      fetchAll()
    } catch (err: any) {
      setError(err.message || '업체 추가에 실패했습니다')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await supabase.from('external_clients').delete().eq('id', deleteTarget.id)
      fetchAll()
    } catch (err) {
      console.error('Failed to delete client:', err)
    }
    setDeleteTarget(null)
  }

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      await supabase.from('external_clients').update({ is_active: !currentActive } as any).eq('id', id)
      fetchAll()
    } catch (err) {
      console.error('Failed to toggle client:', err)
    }
  }

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/request/${slug}`
    navigator.clipboard.writeText(url)
    setCopiedSlug(slug)
    setTimeout(() => setCopiedSlug(null), 2000)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">업체 관리</h2>
          <p className="text-sm text-gray-400 mt-1">
            외부 업체에 업무 요청 링크를 제공합니다. 업체는 비밀번호만으로 접속하여 업무를 요청할 수 있습니다.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors shadow-sm shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          업체 추가
        </button>
      </div>

      {showAdd && (
        <div className="bg-blue-50/50 rounded-xl p-6 space-y-4 border border-blue-200/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">업체명 *</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                placeholder="예: ABC 물류"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">URL 슬러그 * <span className="text-gray-300 font-normal">(3자 이상)</span></label>
              <input
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                placeholder="예: abc-logistics"
              />
              {newSlug && (
                <p className="text-xs text-gray-400 mt-1">
                  링크: /request/{newSlug}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">비밀번호 * <span className="text-gray-300 font-normal">(4자 이상)</span></label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                placeholder="접속 비밀번호"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">담당 부서 *</label>
              <select
                value={newDeptId}
                onChange={(e) => setNewDeptId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              >
                <option value="">선택</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">기본 업무종류</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">설명</label>
              <input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                placeholder="업체 설명 (선택)"
              />
            </div>
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl border border-red-100">{error}</div>}
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">
              취소
            </button>
            <button onClick={handleAdd} className="px-5 py-2 text-sm bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors">
              추가
            </button>
          </div>
        </div>
      )}

      {/* Client list */}
      <div className="border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-gray-50/80">
            <tr>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">업체명</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">링크</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">담당부서</th>
              <th className="text-center px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">활성</th>
              <th className="text-center px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {clients.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{c.name}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">/request/{c.slug}</span>
                    <button
                      onClick={() => copyLink(c.slug)}
                      aria-label="링크 복사"
                      className="p-1 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      {copiedSlug === c.slug ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a
                      href={`/request/${c.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="새 탭에서 열기"
                      className="p-1 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-sm text-gray-600">
                  {departments.find((d) => d.id === c.target_dept_id)?.name || '-'}
                </td>
                <td className="px-5 py-3.5 text-center">
                  <button
                    onClick={() => handleToggle(c.id, c.is_active)}
                    role="switch"
                    aria-checked={c.is_active}
                    aria-label={`${c.name} 활성/비활성`}
                    className={`w-10 h-5 rounded-full transition-colors ${
                      c.is_active ? 'bg-green-500' : 'bg-gray-300'
                    } relative inline-flex`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                      c.is_active ? 'right-0.5' : 'left-0.5'
                    }`} />
                  </button>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <button
                    onClick={() => setDeleteTarget({ id: c.id, name: c.name })}
                    aria-label={`${c.name} 삭제`}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-300">
                  등록된 업체가 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="업체 삭제"
        message={`"${deleteTarget?.name}" 업체를 정말 삭제하시겠습니까? 관련 업무 요청 데이터는 유지됩니다.`}
        confirmLabel="삭제"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
