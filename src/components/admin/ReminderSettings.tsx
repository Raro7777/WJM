import { useState } from 'react'
import { Plus, Trash2, Save } from 'lucide-react'
import { useReminderSettings } from '../../hooks/useReminderSettings'
import { CATEGORY_LABELS, REMINDER_STAGE_LABELS } from '../../lib/constants'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { Toggle } from '../common/Toggle'

export function ReminderSettings() {
  const { settings, departments, loading, updateSetting, createSetting, deleteSetting } = useReminderSettings()
  const [showAdd, setShowAdd] = useState(false)
  const [newDeptId, setNewDeptId] = useState<string>('')
  const [newCategory, setNewCategory] = useState<string>('')
  const [newStage, setNewStage] = useState('pending_accept')
  const [newInterval, setNewInterval] = useState(10)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editInterval, setEditInterval] = useState(0)

  if (loading) return <LoadingSpinner />

  const handleAdd = async () => {
    try {
      await createSetting({
        department_id: newDeptId || null,
        category: newCategory || null,
        stage: newStage,
        interval_minutes: newInterval,
      })
      setShowAdd(false)
      setNewDeptId('')
      setNewCategory('')
      setNewStage('pending_accept')
      setNewInterval(10)
    } catch (err: any) {
      alert(err.message || '추가 실패')
    }
  }

  const handleSave = async (id: string) => {
    await updateSetting(id, { interval_minutes: editInterval })
    setEditingId(null)
  }

  const handleToggle = async (id: string, currentEnabled: boolean) => {
    await updateSetting(id, { is_enabled: !currentEnabled })
  }

  const getDeptName = (deptId: string | null) => {
    if (!deptId) return '전체 (기본값)'
    return departments.find((d) => d.id === deptId)?.name || deptId
  }

  const getCategoryName = (cat: string | null) => {
    if (!cat) return '전체'
    return CATEGORY_LABELS[cat] || cat
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">리마인더 알림 설정</h2>
          <p className="text-sm text-gray-400 mt-1">
            각 단계별 알림 반복 간격을 설정합니다. 부서/업무종류별로 다르게 설정할 수 있습니다.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors shadow-sm shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          추가
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-blue-50/50 rounded-xl p-6 space-y-4 border border-blue-200/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">부서</label>
              <select
                value={newDeptId}
                onChange={(e) => setNewDeptId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              >
                <option value="">전체 (기본값)</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">업무 종류</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              >
                <option value="">전체</option>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">단계</label>
              <select
                value={newStage}
                onChange={(e) => setNewStage(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              >
                {Object.entries(REMINDER_STAGE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">간격 (분)</label>
              <input
                type="number"
                min={1}
                value={newInterval}
                onChange={(e) => setNewInterval(Number(e.target.value))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleAdd}
              className="px-5 py-2 text-sm bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors"
            >
              추가
            </button>
          </div>
        </div>
      )}

      {/* Settings table */}
      <div className="border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-gray-50/80">
            <tr>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">부서</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">업무종류</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">단계</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">간격(분)</th>
              <th className="text-center px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">활성</th>
              <th className="text-center px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {settings.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3.5 text-sm text-gray-700">{getDeptName(s.department_id)}</td>
                <td className="px-5 py-3.5 text-sm text-gray-700">{getCategoryName(s.category)}</td>
                <td className="px-5 py-3.5">
                  <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 rounded-lg text-gray-600">
                    {REMINDER_STAGE_LABELS[s.stage] || s.stage}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  {editingId === s.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={editInterval}
                        onChange={(e) => setEditInterval(Number(e.target.value))}
                        className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                      <button
                        onClick={() => handleSave(s.id)}
                        aria-label="저장"
                        className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingId(s.id); setEditInterval(s.interval_minutes) }}
                      className="text-sm text-gray-700 hover:text-blue-500 transition-colors"
                    >
                      {s.interval_minutes}분
                    </button>
                  )}
                </td>
                <td className="px-5 py-3.5 text-center">
                  <Toggle
                    checked={s.is_enabled}
                    onChange={() => handleToggle(s.id, s.is_enabled)}
                    label={`${getDeptName(s.department_id)} ${REMINDER_STAGE_LABELS[s.stage] || s.stage} 리마인더 활성화`}
                  />
                </td>
                <td className="px-5 py-3.5 text-center">
                  <button
                    onClick={() => deleteSetting(s.id)}
                    aria-label="삭제"
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {settings.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-300">
                  설정된 리마인더가 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
