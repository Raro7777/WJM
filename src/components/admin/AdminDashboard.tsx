import { useState, useEffect, useMemo } from 'react'
import { Users, Building2, TrendingUp, AlertTriangle, BarChart3, Star } from 'lucide-react'
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
    const handlers = profiles.filter((p) => ['super_admin', 'site_admin', 'dept_manager', 'dept_sub_manager'].includes(p.role))
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

      // Review stats
      const reviewedTasks = assigned.filter((t) => t.review_rating !== null)
      const avgRating = reviewedTasks.length > 0
        ? Math.round((reviewedTasks.reduce((sum, t) => sum + (t.review_rating ?? 0), 0) / reviewedTasks.length) * 10) / 10
        : null
      const reviewCount = reviewedTasks.length

      return {
        id: h.id,
        name: h.name || '이름 없음',
        avatarColor: h.avatar_color || '#3b82f6',
        processing,
        done,
        total,
        avgHours,
        avgRating,
        reviewCount,
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
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">운영 현황</h2>
        <p className="text-[15px] text-slate-500 mt-1.5">담당자·업체·트렌드를 한눈에 파악합니다.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center shadow-sm">
          <p className="text-[28px] font-bold text-slate-900 tracking-tight">{tasks.length}</p>
          <p className="text-[14px] text-slate-500 mt-1">전체 업무</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center shadow-sm">
          <p className="text-[28px] font-bold text-blue-600 tracking-tight">{profiles.length}</p>
          <p className="text-[14px] text-slate-500 mt-1">사용자</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center shadow-sm">
          <p className="text-[28px] font-bold text-emerald-600 tracking-tight">{departments.length}</p>
          <p className="text-[14px] text-slate-500 mt-1">부서</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center shadow-sm">
          <p className="text-[28px] font-bold text-amber-600 tracking-tight">{slaViolations.length}</p>
          <p className="text-[14px] text-slate-500 mt-1">SLA 초과</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Handler Performance */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-5">
            <Users className="w-5 h-5 text-slate-500" />
            <p className="text-[15px] font-semibold text-slate-700">담당자별 처리 현황</p>
          </div>
          <div className="space-y-4">
            {handlerStats.length === 0 ? (
              <p className="text-[14px] text-slate-400 text-center py-8">담당자가 없습니다</p>
            ) : (
              handlerStats.map((h) => (
                <div key={h.id} className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: h.avatarColor }}
                  >
                    <span className="text-sm font-bold text-white">{h.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[15px] font-medium text-slate-700 truncate">{h.name}</p>
                      <div className="flex items-center gap-2.5 text-[12px] shrink-0">
                        <span className="text-blue-500 font-medium">{h.processing} 처리중</span>
                        <span className="text-emerald-500 font-medium">{h.done} 완료</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full transition-all"
                        style={{ width: h.total > 0 ? `${(h.done / Math.max(h.total, 1)) * 100}%` : '0%' }}
                      />
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {h.avgHours !== null && (
                        <p className="text-[12px] text-slate-400">평균 {h.avgHours}시간</p>
                      )}
                      {h.avgRating !== null && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="text-[12px] font-semibold text-amber-600">{h.avgRating}</span>
                          <span className="text-[11px] text-slate-400">({h.reviewCount}건)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Weekly Trend */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-5">
            <TrendingUp className="w-5 h-5 text-slate-500" />
            <p className="text-[15px] font-semibold text-slate-700">주간 업무 추이 (최근 4주)</p>
          </div>
          <div className="flex items-end gap-4 h-36">
            {weeklyTrend.map((w, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex gap-1 items-end justify-center" style={{ height: '90px' }}>
                  <div
                    className="w-4 bg-blue-400 rounded-t transition-all"
                    style={{ height: `${(w.created / maxWeekly) * 90}px` }}
                    title={`생성: ${w.created}건`}
                  />
                  <div
                    className="w-4 bg-emerald-400 rounded-t transition-all"
                    style={{ height: `${(w.completed / maxWeekly) * 90}px` }}
                    title={`완료: ${w.completed}건`}
                  />
                </div>
                <p className="text-[12px] text-slate-500">{w.label}~</p>
                <div className="text-[11px] text-slate-400">
                  {w.created}/{w.completed}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-[13px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-blue-400" /> 생성
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-400" /> 완료
            </span>
          </div>
        </div>

        {/* Client Stats */}
        {clientStats.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-5">
              <Building2 className="w-5 h-5 text-slate-500" />
              <p className="text-[15px] font-semibold text-slate-700">업체별 요청 현황</p>
            </div>
            <div className="space-y-4">
              {clientStats.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.isActive ? 'bg-green-400' : 'bg-slate-300'}`} />
                    <p className="text-[15px] text-slate-700 truncate">{c.name}</p>
                  </div>
                  <div className="flex items-center gap-3 text-[13px] shrink-0">
                    <span className="text-amber-500 font-medium">{c.pending}</span>
                    <span className="text-blue-500 font-medium">{c.processing}</span>
                    <span className="text-emerald-500 font-medium">{c.done}</span>
                    <span className="text-slate-400 font-medium ml-1">총 {c.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SLA Violations */}
        {slaViolations.length > 0 && (
          <div className="bg-white rounded-xl border border-red-200 p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-5">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <p className="text-[15px] font-semibold text-red-700">SLA 초과 업무</p>
            </div>
            <div className="space-y-3">
              {slaViolations.slice(0, 10).map((v) => (
                <div key={v.task.id} className="flex items-center justify-between px-4 py-3 bg-red-50/60 rounded-xl">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] text-slate-700 truncate">{v.task.title}</p>
                    <p className="text-[13px] text-slate-500 mt-0.5">{v.deptName}</p>
                  </div>
                  <span className="text-[13px] text-red-600 font-semibold shrink-0 ml-3">
                    +{v.exceeded > 60 ? `${Math.round(v.exceeded / 60)}시간` : `${v.exceeded}분`}
                  </span>
                </div>
              ))}
              {slaViolations.length > 10 && (
                <p className="text-[13px] text-slate-500 text-center pt-2">
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
