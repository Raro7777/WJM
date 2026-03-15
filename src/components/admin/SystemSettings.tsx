import { useState, useEffect } from 'react'
import { Save, Plus, Trash2, Palette, Tag } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { CATEGORY_LABELS } from '../../lib/constants'
import { ConfirmDialog } from '../common/ConfirmDialog'

interface SystemConfig {
  companyName: string
  categories: { key: string; label: string }[]
}

export function SystemSettings() {
  const [companyName, setCompanyName] = useState('WJM')
  const [categories, setCategories] = useState<{ key: string; label: string }[]>([])
  const [newCatKey, setNewCatKey] = useState('')
  const [newCatLabel, setNewCatLabel] = useState('')
  const [saved, setSaved] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    // Initialize from constants
    const cats = Object.entries(CATEGORY_LABELS).map(([key, label]) => ({ key, label }))
    setCategories(cats)

    // Load saved config from localStorage
    try {
      const stored = localStorage.getItem('wjm_system_config')
      if (stored) {
        const config: SystemConfig = JSON.parse(stored)
        setCompanyName(config.companyName || 'WJM')
        if (config.categories?.length > 0) {
          setCategories(config.categories)
        }
      }
    } catch {
      // use defaults
    }
  }, [])

  const handleSave = () => {
    setError('')
    if (!companyName.trim()) {
      setError('회사명을 입력해주세요')
      return
    }
    if (categories.length === 0) {
      setError('최소 1개의 업무 종류가 필요합니다')
      return
    }

    const config: SystemConfig = { companyName: companyName.trim(), categories }
    localStorage.setItem('wjm_system_config', JSON.stringify(config))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleAddCategory = () => {
    if (!newCatKey.trim() || !newCatLabel.trim()) {
      setError('키와 이름을 모두 입력해주세요')
      return
    }
    if (categories.some((c) => c.key === newCatKey)) {
      setError('이미 존재하는 키입니다')
      return
    }
    setError('')
    setCategories([...categories, { key: newCatKey.trim().toLowerCase(), label: newCatLabel.trim() }])
    setNewCatKey('')
    setNewCatLabel('')
  }

  const handleDeleteCategory = () => {
    if (!deleteTarget) return
    setCategories(categories.filter((c) => c.key !== deleteTarget))
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-bold text-gray-900">시스템 설정</h2>
        <p className="text-sm text-gray-400 mt-1">
          시스템 기본 설정을 관리합니다.
        </p>
      </div>

      {/* Company name */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-gray-400" />
          <p className="text-sm font-semibold text-gray-700">기본 정보</p>
        </div>
        <div className="max-w-md">
          <label className="block text-sm font-medium text-gray-600 mb-1.5">회사명</label>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            placeholder="회사명"
          />
        </div>
      </div>

      {/* Category management */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-gray-400" />
          <p className="text-sm font-semibold text-gray-700">업무 종류 관리</p>
        </div>
        <p className="text-xs text-gray-400">
          업무 생성 시 선택할 수 있는 업무 종류를 관리합니다. 변경사항은 저장 버튼을 눌러야 적용됩니다.
        </p>

        {/* Current categories */}
        <div className="space-y-2">
          {categories.map((cat) => (
            <div
              key={cat.key}
              className="flex items-center justify-between px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-100"
            >
              <div className="flex items-center gap-3">
                <code className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded font-mono">{cat.key}</code>
                <span className="text-sm text-gray-700 font-medium">{cat.label}</span>
              </div>
              <button
                onClick={() => setDeleteTarget(cat.key)}
                aria-label={`${cat.label} 삭제`}
                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add new category */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <input
            value={newCatKey}
            onChange={(e) => setNewCatKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            placeholder="키 (영문, 예: delivery)"
          />
          <input
            value={newCatLabel}
            onChange={(e) => setNewCatLabel(e.target.value)}
            className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            placeholder="표시 이름 (예: 배송)"
          />
          <button
            onClick={handleAddCategory}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors font-medium shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            추가
          </button>
        </div>
      </div>

      {/* Error & Save */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl border border-red-100">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600 transition-colors shadow-sm shadow-blue-500/20"
        >
          <Save className="w-4 h-4" />
          설정 저장
        </button>
        {saved && (
          <span className="text-sm text-emerald-600 font-medium animate-pulse">
            ✓ 저장되었습니다
          </span>
        )}
      </div>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="업무 종류 삭제"
        message={`"${categories.find((c) => c.key === deleteTarget)?.label}" 업무 종류를 삭제하시겠습니까?`}
        confirmLabel="삭제"
        variant="danger"
        onConfirm={handleDeleteCategory}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
