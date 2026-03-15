import { useState, useEffect, useMemo } from 'react'
import { Users, Building2, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { STATUS_LABELS, PRIORITY_LABELS } from '../../lib/constants'
import { LoadingSpinner } from '../common/LoadingSpinner'
import type { Task, Profile, Department, ExternalClient } from '../../lib/types'

export function AdminDashboard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [clients, setClients] = useState<ExternalClient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [tasksRes, profilesRes, deptRes, clientRes] = await Promise.all([
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*'),
        supabase.from('departments').select('*'),
        supabase.from('external_clients').select('*'),
      ])
      if (tasksRes.data) setTasks(tasksRes.data as Task[])
      if (profilesRes.data) setProfiles(profilesRes.data as Profile[])
      if (deptRes.data) setDepartments(deptRes.data as Department[])
      if (clientRes.data) setClients(clientRes.data as ExternalClient[])
    } catch (err) {
      console.error('Failed to fetch admin dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handler performance stats
  const handlerStats = useMemo(() => {
    const handlers = profiles.filter((p) => p.role === 'handler' || p.role === 'admin')
    return handlers.map((h) => {
      const assigned = tasks.filter((t) => t.handler_id === h.id)
      const processing = assigned.filter((t) => t.status === 'processing').length
      const done = assigned.filter((t) => t.status === 'done').length
      const total = assigned.length

      // Average completion time
      const completedTasks = assigned.filter((t) => t.status === 'done' && t.processed_at)
      let avgHours: number | null = null
      if (completedTasks.length > 0) {
        const totalMs = completedTasks.reduce((sum, t) => {
          return sum + (new Date(t.processed_at!).getTime() - new Date(t.created_at).getTime())
        }, 0)
        avgHours = Math.round((totalMs / completedTasks.length / 3600000) * 10) / 10
      }

      return {
        id: h.id,
        name: h.name || '이름 없음',
        avatarColor: h.avatar_color || '#3b82f6',
        processing,
        done,
        total,
        avgHours,
      }
    }).sort((a, b) => b.done - a.done)
  }, [tasks, profiles])

  // Client request stats
  const clientStats = useMemo(() => {
    return clients.map((c) => {
      const clientTasks = tasks.filter((t) => t.client_id === c.id)
      const pending = clientTasks.filter((t) => t.status === 'pending').length
      const processing = clientTasks.filter((t) => t.status === 'processing').length
      const done = clientTasks.filter((t) => t.status === 'done').length
      return {
        id: c.id,
        name: c.name,
        total: clientTasks.length,
        pending,
        processing,
        done,
        isActive: c.is_active,
      }
    }).filter((c) => c.total > 0).sort((a, b) => b.total - a.total)
  }, [tasks, clients])

  // Weekly trend (last 4 weeks)
  const weeklyTrend = useMemo(() => {
    const weeks: { label: string; created: number; completed: number }[] = []
    const now = new Date()

    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 86400000)
      const weekEnd = new Date(now.getTime() - i * 7 * 86400000)
      const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`

      const created = tasks.filter((t) => {
        const d = new Date(t.created_at)
        return d >= weekStart && d < weekEnd
      }).length

      const completed = tasks.filter((t) => {
        if (!t.processed_at) return false
        const d = new Date(t.processed_at)
        return d >= weekStart && d < weekEnd
      }).length

      weeks.push({ label, created, completed })
    }
    return weeks
  }, [tasks])

  // SLA violations
  const slaViolations = useMemo(() => {
    const deptMap = new Map(departments.map((d) => [d.id, d]))
    return tasks
      .filter((t) => t.status === 'pending' || t.status === 'processing' || t.status === 'need_confirm')
      .map((t) => {
        const dept = deptMap.get(t.target_dept_id)
        if (!dept?.sla_escalate_minutes) return null
        const elapsedMin = (Date.now() - new Date(t.created_at).getTime()) / 60000
        if (elapsedMin >= dept.sla_escalate_minutes) {
          return {
            task: t,
            deptName: dept.name,
            exceeded: Math.round(elapsedMin - dept.sla_escalate_minutes),
          }
        }
        return null
      })
      .filter(Boolean) as { task: Task; deptName: string; exceeded: number }[]
  }, [tasks, departments])

  if (loading) return <LoadingSpinner />

  const maxWeekly = Math.max(...weeklyTrend.map((w) => Math.max(w.created, w.completed)), 1)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-gray-900">운영 현황</h2>
        <p className="text-sm text-gray-400 mt-1">담당자·업체·트렌드를 한눈에 파악합니다.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">전체 업무</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{profiles.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">사용자</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{departments.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">부서</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{slaViolations.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">SLA 초과</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Handler Performance */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-700">담당자별 처리 현황</p>
          </div>
          <div className="space-y-3">
            {handlerStats.length === 0 ? (
              <p className="text-xs text-gray-300 text-center py-4">담당자가 없습니다</p>
            ) : (
              handlerStats.map((h) => (
                <div key={h.id} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: h.avatarColor }}
                  >
                    <span className="text-xs font-bold text-white">{h.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-700 truncate">{h.name}</p>
                      <div className="flex items-center gap-2 text-[11px] shrink-0">
                        <span className="text-blue-500">{h.processing} 처리중</span>
                        <span className="text-emerald-500">{h.done} 완료</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full transition-all"
                        style={{ width: h.total > 0 ? `${(h.done / Math.max(h.total, 1)) * 100}%` : '0%' }}
                      />
                    </div>
                    {h.avgHours !== null && (
                      <p className="text-[10px] text-gray-300 mt-0.5">평균 {h.avgHours}시간</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Weekly Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-700">주간 업무 추이 (최근 4주)</p>
          </div>
          <div className="flex items-end gap-3 h-32">
            {weeklyTrend.map((w, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex gap-0.5 items-end justify-center" style={{ height: '80px' }}>
                  <div
                    className="w-3 bg-blue-400 rounded-t transition-all"
                    style={{ height: `${(w.created / maxWeekly) * 80}px` }}
                    title={`생성: ${w.created}건`}
                  />
                  <div
                    className="w-3 bg-emerald-400 rounded-t transition-all"
                    style={{ height: `${(w.completed / maxWeekly) * 80}px` }}
                    title={`완료: ${w.completed}건`}
                  />
                </div>
                <p className="text-[10px] text-gray-400">{w.label}~</p>
                <div className="text-[9px] text-gray-300">
                  {w.created}/{w.completed}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-blue-400" /> 생성
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-emerald-400" /> 완료
            </span>
          </div>
        </div>

        {/* Client Stats */}
        {clientStats.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-gray-400" />
              <p className="text-sm font-semibold text-gray-700">업체별 요청 현황</p>
            </div>
            <div className="space-y-3">
              {clientStats.map((c) => (
                <div key={c.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${c.isActive ? 'bg-green-400' : 'bg-gray-300'}`} />
                    <p className="text-sm text-gray-700 truncate">{c.name}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] shrink-0">
                    <span className="text-amber-500">{c.pending}</span>
                    <span className="text-blue-500">{c.processing}</span>
                    <span className="text-emerald-500">{c.done}</span>
                    <span className="text-gray-300 font-medium ml-1">총 {c.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SLA Violations */}
        {slaViolations.length > 0 && (
          <div className="bg-white rounded-xl border border-red-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <p className="text-sm font-semibold text-red-700">SLA 초과 업무</p>
            </div>
            <div className="space-y-2">
              {slaViolations.slice(0, 10).map((v) => (
                <div key={v.task.id} className="flex items-center justify-between px-3 py-2 bg-red-50/50 rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700 truncate">{v.task.title}</p>
                    <p className="text-[10px] text-gray-400">{v.deptName}</p>
                  </div>
                  <span className="text-xs text-red-600 font-medium shrink-0 ml-2">
                    +{v.exceeded > 60 ? `${Math.round(v.exceeded / 60)}시간` : `${v.exceeded}분`}
                  </span>
                </div>
              ))}
              {slaViolations.length > 10 && (
                <p className="text-[11px] text-gray-400 text-center pt-1">
                  외 {slaViolations.length - 10}건 더
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
