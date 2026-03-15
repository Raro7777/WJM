import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, Building2, Clock, AlertTriangle, XCircle, Pencil } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { ConfirmDialog } from '../common/ConfirmDialog'
import type { Department, Profile } from '../../lib/types'

const DEPT_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
]

export function DepartmentManagement() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [error, setError] = useState('')

  // Form state
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formColor, setFormColor] = useState(DEPT_COLORS[0])
  const [formSlaWarn, setFormSlaWarn] = useState<number | ''>('')
  const [formSlaUrgent, setFormSlaUrgent] = useState<number | ''>('')
  const [formSlaEscalate, setFormSlaEscalate] = useState<number | ''>('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [deptRes, profileRes] = await Promise.all([
        supabase.from('departments').select('*').order('name'),
        supabase.from('profiles').select('*'),
      ])
      if (deptRes.data) setDepartments(deptRes.data as Department[])
      if (profileRes.data) setProfiles(profileRes.data as Profile[])
    } catch (err) {
      console.error('Failed to fetch departments:', err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormName('')
    setFormDesc('')
    setFormColor(DEPT_COLORS[0])
    setFormSlaWarn('')
    setFormSlaUrgent('')
    setFormSlaEscalate('')
  }

  const openEdit = (dept: Department) => {
    setEditingDept(dept)
    setShowAdd(false)
    setFormName(dept.name)
    setFormDesc(dept.description || '')
    setFormColor(dept.color || DEPT_COLORS[0])
    setFormSlaWarn(dept.sla_warn_minutes ?? '')
    setFormSlaUrgent(dept.sla_urgent_minutes ?? '')
    setFormSlaEscalate(dept.sla_escalate_minutes ?? '')
  }

  const openAdd = () => {
    setEditingDept(null)
    resetForm()
    setShowAdd(true)
  }

  const validate = (): string | null => {
    if (!formName.trim()) return '부서명을 입력해주세요'
    if (formName.length > 50) return '부서명은 50자 이내로 입력해주세요'
    // SLA validation: warn < urgent < escalate
    const warn = formSlaWarn === '' ? null : Number(formSlaWarn)
    const urgent = formSlaUrgent === '' ? null : Number(formSlaUrgent)
    const escalate = formSlaEscalate === '' ? null : Number(formSlaEscalate)
    if (warn !== null && urgent !== null && warn >= urgent) return 'SLA 경고 시간은 긴급 시간보다 작아야 합니다'
    if (urgent !== null && escalate !== null && urgent >= escalate) return 'SLA 긴급 시간은 초과 시간보다 작아야 합니다'
    if (warn !== null && escalate !== null && warn >= escalate) return 'SLA 경고 시간은 초과 시간보다 작아야 합니다'
    return null
  }

  const handleAdd = async () => {
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setError('')

    try {
      const { error: err } = await supabase.from('departments').insert({
        name: formName.trim(),
        description: formDesc.trim() || null,
        color: formColor,
        sla_warn_minutes: formSlaWarn === '' ? null : Number(formSlaWarn),
        sla_urgent_minutes: formSlaUrgent === '' ? null : Number(formSlaUrgent),
        sla_escalate_minutes: formSlaEscalate === '' ? null : Number(formSlaEscalate),
      } as any)
      if (err) throw err
      setShowAdd(false)
      resetForm()
      fetchData()
    } catch (err: any) {
      setError(err.message || '부서 추가에 실패했습니다')
    }
  }

  const handleUpdate = async () => {
    if (!editingDept) return
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setError('')

    try {
      const { error: err } = await supabase.from('departments').update({
        name: formName.trim(),
        description: formDesc.trim() || null,
        color: formColor,
        sla_warn_minutes: formSlaWarn === '' ? null : Number(formSlaWarn),
        sla_urgent_minutes: formSlaUrgent === '' ? null : Number(formSlaUrgent),
        sla_escalate_minutes: formSlaEscalate === '' ? null : Number(formSlaEscalate),
      } as any).eq('id', editingDept.id)
      if (err) throw err
      setEditingDept(null)
      resetForm()
      fetchData()
    } catch (err: any) {
      setError(err.message || '부서 수정에 실패했습니다')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const { error: err } = await supabase.from('departments').delete().eq('id', deleteTarget.id)
      if (err) throw err
      fetchData()
    } catch (err: any) {
      setError(err.message || '부서 삭제에 실패했습니다')
    }
    setDeleteTarget(null)
  }

  const getMemberCount = (deptId: string) =>
    profiles.filter((p) => p.department_id === deptId).length

  const formatMinutes = (min: number | null) => {
    if (min === null) return '-'
    if (min < 60) return `${min}분`
    const h = Math.floor(min / 60)
    const m = min % 60
    return m > 0 ? `${h}시간 ${m}분` : `${h}시간`
  }

  if (loading) return <LoadingSpinner />

  const isEditing = showAdd || editingDept

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">부서 관리</h2>
          <p className="text-[15px] text-slate-500 mt-1.5">
            부서 정보와 SLA(서비스 수준 목표) 기준 시간을 설정합니다.
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-5 py-3 text-[15px] font-medium bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors shadow-sm shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            부서 추가
          </button>
        )}
      </div>

      {/* Add / Edit form */}
      {isEditing && (
        <div className="bg-blue-50/50 rounded-xl p-6 space-y-5 border border-blue-200/50">
          <p className="text-sm font-semibold text-gray-700">
            {editingDept ? `"${editingDept.name}" 수정` : '새 부서 추가'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">부서명 *</label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                placeholder="예: 고객지원팀"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">설명</label>
              <input
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                placeholder="부서 설명 (선택)"
              />
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">부서 색상</label>
            <div className="flex gap-2 flex-wrap">
              {DEPT_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setFormColor(color)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    formColor === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`색상 ${color}`}
                />
              ))}
            </div>
          </div>

          {/* SLA settings */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              SLA 기준 시간 <span className="text-gray-300 font-normal">(분 단위, 비워두면 미적용)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="relative">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-medium text-amber-600">경고</span>
                </div>
                <input
                  type="number"
                  min={1}
                  value={formSlaWarn}
                  onChange={(e) => setFormSlaWarn(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2.5 text-sm border border-amber-200 rounded-xl bg-amber-50/30 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400"
                  placeholder="예: 60"
                />
              </div>
              <div className="relative">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-xs font-medium text-orange-600">긴급</span>
                </div>
                <input
                  type="number"
                  min={1}
                  value={formSlaUrgent}
                  onChange={(e) => setFormSlaUrgent(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2.5 text-sm border border-orange-200 rounded-xl bg-orange-50/30 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                  placeholder="예: 120"
                />
              </div>
              <div className="relative">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-xs font-medium text-red-600">초과</span>
                </div>
                <input
                  type="number"
                  min={1}
                  value={formSlaEscalate}
                  onChange={(e) => setFormSlaEscalate(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2.5 text-sm border border-red-200 rounded-xl bg-red-50/30 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
                  placeholder="예: 240"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl border border-red-100">{error}</div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => { setShowAdd(false); setEditingDept(null); resetForm(); setError('') }}
              className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
            >
              취소
            </button>
            <button
              onClick={editingDept ? handleUpdate : handleAdd}
              className="px-5 py-2 text-sm bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors"
            >
              {editingDept ? '수정' : '추가'}
            </button>
          </div>
        </div>
      )}

      {/* Department cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {departments.map((dept) => {
          const memberCount = getMemberCount(dept.id)
          return (
            <div
              key={dept.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${dept.color || '#3b82f6'}15` }}
                  >
                    <Building2 className="w-5 h-5" style={{ color: dept.color || '#3b82f6' }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{dept.name}</h3>
                    {dept.description && (
                      <p className="text-xs text-gray-400 mt-0.5">{dept.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(dept)}
                    aria-label={`${dept.name} 수정`}
                    className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget({ id: dept.id, name: dept.name })}
                    aria-label={`${dept.name} 삭제`}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Info row */}
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="font-medium text-gray-600">{memberCount}</span>명
                </span>
                <span className="text-gray-200">|</span>
                <div className="flex items-center gap-2">
                  {dept.sla_warn_minutes ? (
                    <span className="flex items-center gap-0.5 text-amber-500">
                      <Clock className="w-3 h-3" />
                      {formatMinutes(dept.sla_warn_minutes)}
                    </span>
                  ) : null}
                  {dept.sla_escalate_minutes ? (
                    <span className="flex items-center gap-0.5 text-red-500">
                      <XCircle className="w-3 h-3" />
                      {formatMinutes(dept.sla_escalate_minutes)}
                    </span>
                  ) : null}
                  {!dept.sla_warn_minutes && !dept.sla_escalate_minutes && (
                    <span className="text-gray-300">SLA 미설정</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {departments.length === 0 && (
          <div className="col-span-2 text-center py-12 text-sm text-gray-300">
            등록된 부서가 없습니다
          </div>
        )}
      </div>

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="부서 삭제"
        message={`"${deleteTarget?.name}" 부서를 정말 삭제하시겠습니까? 소속 사용자의 부서가 미배정으로 변경됩니다.`}
        confirmLabel="삭제"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
