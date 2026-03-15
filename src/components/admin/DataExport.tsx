import { useState } from 'react'
import { Download, FileSpreadsheet, Calendar } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { STATUS_LABELS, PRIORITY_LABELS, CATEGORY_LABELS } from '../../lib/constants'
import type { Task, Department } from '../../lib/types'

export function DataExport() {
  const [loading, setLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [exportType, setExportType] = useState<'tasks' | 'stats'>('tasks')

  const handleExportTasks = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (dateFrom) query = query.gte('created_at', new Date(dateFrom).toISOString())
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setDate(endDate.getDate() + 1)
        query = query.lt('created_at', endDate.toISOString())
      }
      if (statusFilter) query = query.eq('status', statusFilter)

      const [tasksRes, deptRes] = await Promise.all([
        query,
        supabase.from('departments').select('*'),
      ])

      const tasks = (tasksRes.data || []) as Task[]
      const departments = (deptRes.data || []) as Department[]
      const deptMap = new Map(departments.map((d) => [d.id, d.name]))

      // Build CSV
      const headers = ['제목', '내용', '상태', '우선순위', '업무종류', '요청자', '처리부서', '생성일', '처리일', '확인일']
      const rows = tasks.map((t) => [
        `"${(t.title || '').replace(/"/g, '""')}"`,
        `"${(t.content || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        STATUS_LABELS[t.status] || t.status,
        PRIORITY_LABELS[t.priority] || t.priority,
        CATEGORY_LABELS[t.category] || t.category,
        t.requester_name || '',
        deptMap.get(t.target_dept_id) || '',
        new Date(t.created_at).toLocaleString('ko-KR'),
        t.processed_at ? new Date(t.processed_at).toLocaleString('ko-KR') : '',
        t.confirmed_at ? new Date(t.confirmed_at).toLocaleString('ko-KR') : '',
      ])

      const bom = '\uFEFF'
      const csv = bom + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      downloadFile(csv, `업무목록_${getDateStr()}.csv`, 'text/csv;charset=utf-8')
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExportStats = async () => {
    setLoading(true)
    try {
      const [tasksRes, deptRes, profilesRes] = await Promise.all([
        supabase.from('tasks').select('*'),
        supabase.from('departments').select('*'),
        supabase.from('profiles').select('*'),
      ])

      const tasks = (tasksRes.data || []) as Task[]
      const departments = (deptRes.data || []) as Department[]

      // Status summary
      const statusCounts = Object.entries(STATUS_LABELS).map(([key, label]) => ({
        status: label,
        count: tasks.filter((t) => t.status === key).length,
      }))

      // Department summary
      const deptMap = new Map(departments.map((d) => [d.id, d.name]))
      const deptCounts = new Map<string, { total: number; done: number; pending: number }>()
      tasks.forEach((t) => {
        const name = deptMap.get(t.target_dept_id) || '미지정'
        const entry = deptCounts.get(name) || { total: 0, done: 0, pending: 0 }
        entry.total++
        if (t.status === 'done') entry.done++
        if (t.status === 'pending') entry.pending++
        deptCounts.set(name, entry)
      })

      // Build CSV
      const lines: string[] = []
      lines.push('=== 상태별 현황 ===')
      lines.push('상태,건수')
      statusCounts.forEach((s) => lines.push(`${s.status},${s.count}`))
      lines.push('')
      lines.push('=== 부서별 현황 ===')
      lines.push('부서,전체,대기,완료')
      deptCounts.forEach((v, k) => lines.push(`${k},${v.total},${v.pending},${v.done}`))

      const bom = '\uFEFF'
      const csv = bom + lines.join('\n')
      downloadFile(csv, `통계_${getDateStr()}.csv`, 'text/csv;charset=utf-8')
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getDateStr = () => {
    const now = new Date()
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-gray-900">데이터 내보내기</h2>
        <p className="text-sm text-gray-400 mt-1">
          업무 데이터를 CSV 파일로 다운로드합니다. Excel에서 바로 열 수 있습니다.
        </p>
      </div>

      {/* Export type selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => setExportType('tasks')}
          className={`p-5 rounded-xl border-2 text-left transition-all ${
            exportType === 'tasks'
              ? 'border-blue-400 bg-blue-50/50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <FileSpreadsheet className={`w-6 h-6 mb-2 ${exportType === 'tasks' ? 'text-blue-500' : 'text-gray-300'}`} />
          <p className="text-sm font-semibold text-gray-900">업무 목록</p>
          <p className="text-xs text-gray-400 mt-0.5">전체 업무 데이터를 CSV로 내보냅니다</p>
        </button>
        <button
          onClick={() => setExportType('stats')}
          className={`p-5 rounded-xl border-2 text-left transition-all ${
            exportType === 'stats'
              ? 'border-blue-400 bg-blue-50/50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <FileSpreadsheet className={`w-6 h-6 mb-2 ${exportType === 'stats' ? 'text-blue-500' : 'text-gray-300'}`} />
          <p className="text-sm font-semibold text-gray-900">통계 요약</p>
          <p className="text-xs text-gray-400 mt-0.5">상태·부서별 집계 데이터를 내보냅니다</p>
        </button>
      </div>

      {/* Task export filters */}
      {exportType === 'tasks' && (
        <div className="bg-gray-50 rounded-xl p-5 space-y-4 border border-gray-200">
          <p className="text-sm font-medium text-gray-600">필터 조건 (선택)</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                <Calendar className="w-3 h-3 inline mr-1" />시작일
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                <Calendar className="w-3 h-3 inline mr-1" />종료일
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">상태</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              >
                <option value="">전체</option>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Download button */}
      <button
        onClick={exportType === 'tasks' ? handleExportTasks : handleExportStats}
        disabled={loading}
        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-colors shadow-sm shadow-blue-500/20"
      >
        <Download className="w-4 h-4" />
        {loading ? '내보내는 중...' : 'CSV 다운로드'}
      </button>
    </div>
  )
}
