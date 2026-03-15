import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../stores/appStore'

interface DashboardStats {
  totalPending: number
  totalProcessing: number
  totalDone: number
  totalCancelled: number
  avgProcessingHours: number | null
  tasksByDept: { name: string; count: number }[]
  tasksByPriority: { name: string; count: number }[]
  recentTasks: any[]
  slaWarnCount: number
  slaBreachCount: number
  slaComplianceRate: number | null
}

const defaultStats: DashboardStats = {
  totalPending: 0,
  totalProcessing: 0,
  totalDone: 0,
  totalCancelled: 0,
  avgProcessingHours: null,
  tasksByDept: [],
  tasksByPriority: [],
  recentTasks: [],
  slaWarnCount: 0,
  slaBreachCount: 0,
  slaComplianceRate: null,
}

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats>(defaultStats)
  const [loading, setLoading] = useState(true)
  const { user } = useAppStore()

  const fetchStats = useCallback(async () => {
    if (!user) return
    setLoading(true)

    try {
    // Fetch all tasks
    const { data: allTasks, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch dashboard stats:', error)
      setLoading(false)
      return
    }

    if (!allTasks) {
      setLoading(false)
      return
    }

    const totalPending = allTasks.filter((t: any) => t.status === 'pending').length
    const totalProcessing = allTasks.filter((t: any) => t.status === 'processing').length
    const totalDone = allTasks.filter((t: any) => t.status === 'done').length
    const totalCancelled = allTasks.filter((t: any) => t.status === 'cancelled').length

    // Average processing time
    const doneTasks = allTasks.filter((t: any) => t.status === 'done' && t.processed_at)
    let avgProcessingHours: number | null = null
    if (doneTasks.length > 0) {
      const totalMs = doneTasks.reduce((sum: number, t: any) => {
        return sum + (new Date(t.processed_at).getTime() - new Date(t.created_at).getTime())
      }, 0)
      avgProcessingHours = Math.round((totalMs / doneTasks.length / 3600000) * 10) / 10
    }

    // Tasks by priority
    const priorityCounts = new Map<string, number>()
    allTasks.forEach((t: any) => {
      priorityCounts.set(t.priority, (priorityCounts.get(t.priority) || 0) + 1)
    })
    const tasksByPriority = Array.from(priorityCounts.entries()).map(([name, count]) => ({
      name,
      count,
    }))

    // Tasks by department + SLA
    const { data: departments } = await supabase.from('departments').select('*')
    const deptMap = new Map((departments || []).map((d: any) => [d.id, d]))
    const deptCounts = new Map<string, number>()
    allTasks.forEach((t: any) => {
      const dept = deptMap.get(t.target_dept_id)
      const deptName = dept?.name || '미지정'
      deptCounts.set(deptName, (deptCounts.get(deptName) || 0) + 1)
    })
    const tasksByDept = Array.from(deptCounts.entries()).map(([name, count]) => ({
      name,
      count,
    }))

    // SLA statistics
    let slaWarnCount = 0
    let slaBreachCount = 0
    const activeTasks = allTasks.filter((t: any) =>
      t.status === 'pending' || t.status === 'processing' || t.status === 'need_confirm'
    )
    activeTasks.forEach((t: any) => {
      const dept = deptMap.get(t.target_dept_id) as any
      if (!dept) return
      const elapsedMin = (Date.now() - new Date(t.created_at).getTime()) / 60000
      if (dept.sla_escalate_minutes && elapsedMin >= dept.sla_escalate_minutes) {
        slaBreachCount++
      } else if (dept.sla_warn_minutes && elapsedMin >= dept.sla_warn_minutes) {
        slaWarnCount++
      }
    })
    // SLA compliance = tasks completed within SLA / total done tasks
    let slaComplianceRate: number | null = null
    if (doneTasks.length > 0 && departments) {
      const withinSla = doneTasks.filter((t: any) => {
        const dept = deptMap.get(t.target_dept_id) as any
        if (!dept?.sla_escalate_minutes) return true
        const processedMin = (new Date(t.processed_at).getTime() - new Date(t.created_at).getTime()) / 60000
        return processedMin <= dept.sla_escalate_minutes
      }).length
      slaComplianceRate = Math.round((withinSla / doneTasks.length) * 100)
    }

    setStats({
      totalPending,
      totalProcessing,
      totalDone,
      totalCancelled,
      avgProcessingHours,
      tasksByDept,
      tasksByPriority,
      recentTasks: allTasks.slice(0, 10),
      slaWarnCount,
      slaBreachCount,
      slaComplianceRate,
    })
    } catch (err) {
      console.error('Dashboard stats error:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, loading, refetch: fetchStats }
}
