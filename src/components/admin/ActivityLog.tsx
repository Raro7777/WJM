import { useState, useEffect, useCallback } from 'react'
import { Clock, Filter, ChevronDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS } from '../../lib/constants'
import { LoadingSpinner } from '../common/LoadingSpinner'
import type { Task, Profile } from '../../lib/types'

interface ActivityEntry {
  id: string
  task: Task
  type: 'created' | 'status_changed' | 'completed' | 'cancelled'
  timestamp: string
  handlerName?: string
  requesterName?: string
}

const PAGE_SIZE = 30

export function ActivityLog() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    fetchData()
  }, [dateRange])

  const fetchData = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('tasks')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(200)

      // Date filter
      const now = new Date()
      if (dateRange === 'today') {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        query = query.gte('updated_at', todayStart)
      } else if (dateRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString()
        query = query.gte('updated_at', weekAgo)
      } else if (dateRange === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString()
        query = query.gte('updated_at', monthAgo)
      }

      const [tasksRes, profilesRes] = await Promise.all([
        query,
        supabase.from('profiles').select('*'),
      ])

      if (tasksRes.data) setTasks(tasksRes.data as Task[])
      if (profilesRes.data) setProfiles(profilesRes.data as Profile[])
    } catch (err) {
      console.error('Failed to fetch activity log:', err)
    } finally {
      setLoading(false)
    }
  }

  const getProfileName = useCallback((id: string | null) => {
    if (!id) return null
    return profiles.find((p) => p.id === id)?.name || null
  }, [profiles])

  // Build activity entries from tasks
  const activities: ActivityEntry[] = tasks
    .filter((t) => !statusFilter || t.status === statusFilter)
    .map((t) => ({
      id: t.id,
      task: t,
      type: t.status === 'done' ? 'completed' as const
        : t.status === 'cancelled' ? 'cancelled' as const
        : t.status === 'pending' ? 'created' as const
        : 'status_changed' as const,
      timestamp: t.updated_at,
      handlerName: getProfileName(t.handler_id) || undefined,
      requesterName: t.requester_name || getProfileName(t.requester_id) || undefined,
    }))

  const visibleActivities = activities.slice(0, visibleCount)

  const getActivityIcon = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-600',
      processing: 'bg-blue-100 text-blue-600',
      need_confirm: 'bg-violet-100 text-violet-600',
      done: 'bg-emerald-100 text-emerald-600',
      cancelled: 'bg-red-100 text-red-600',
    }
    return colors[status] || 'bg-gray-100 text-gray-600'
  }

  const getActivityMessage = (entry: ActivityEntry) => {
    const { task } = entry
    switch (task.status) {
      case 'pending':
        return `${entry.requesterName || '알 수 없음'}님이 업무를 요청했습니다`
      case 'processing':
        return `${entry.handlerName || '담당자'}님이 업무를 접수했습니다`
      case 'need_confirm':
        return `${entry.handlerName || '담당자'}님이 확인을 요청했습니다`
      case 'done':
        return `업무가 완료 처리되었습니다`
      case 'cancelled':
        return `업무가 반려되었습니다`
      default:
        return `업무 상태가 변경되었습니다`
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return '방금'
    if (diffMins < 60) return `${diffMins}분 전`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}시간 전`
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-gray-900">활동 로그</h2>
        <p className="text-sm text-gray-400 mt-1">
          업무 상태 변경 및 주요 이벤트 기록을 확인합니다.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1.5 bg-gray-100 rounded-xl p-1">
          {([
            ['today', '오늘'],
            ['week', '1주'],
            ['month', '1개월'],
            ['all', '전체'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setDateRange(key); setVisibleCount(PAGE_SIZE) }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                dateRange === key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setVisibleCount(PAGE_SIZE) }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
        >
          <option value="">모든 상태</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <div className="text-sm text-gray-400 flex items-center ml-auto">
          총 {activities.length}건
        </div>
      </div>

      {/* Timeline */}
      {visibleActivities.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-300">
          해당 기간에 활동 기록이 없습니다
        </div>
      ) : (
        <div className="space-y-1">
          {visibleActivities.map((entry, index) => (
            <div
              key={`${entry.id}-${index}`}
              className="flex items-start gap-3.5 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              {/* Status dot */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${getActivityIcon(entry.task.status)}`}>
                <span className="text-[10px] font-bold">
                  {entry.task.status === 'pending' ? '!' :
                   entry.task.status === 'processing' ? '▶' :
                   entry.task.status === 'done' ? '✓' :
                   entry.task.status === 'cancelled' ? '✕' : '?'}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md ${STATUS_COLORS[entry.task.status]}`}>
                    {STATUS_LABELS[entry.task.status]}
                  </span>
                  <span className="text-[10px] text-gray-300">
                    {PRIORITY_LABELS[entry.task.priority]}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 truncate">{entry.task.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{getActivityMessage(entry)}</p>
              </div>

              {/* Time */}
              <div className="text-[11px] text-gray-300 shrink-0 mt-1">
                {formatTime(entry.timestamp)}
              </div>
            </div>
          ))}

          {/* Load more */}
          {visibleCount < activities.length && (
            <div className="text-center pt-4">
              <button
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="px-4 py-2 text-sm text-blue-500 hover:bg-blue-50 rounded-xl transition-colors font-medium"
              >
                더 보기 ({activities.length - visibleCount}건 남음)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
