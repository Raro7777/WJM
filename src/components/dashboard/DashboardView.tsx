import { useDashboard } from '../../hooks/useDashboard'
import { StatCard } from './StatCard'
import { TaskChart } from './TaskChart'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { Clock, CheckCircle, Loader2, XCircle, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react'
import { PRIORITY_LABELS } from '../../lib/constants'

export function DashboardView() {
  const { stats, loading } = useDashboard()

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="대기중"
          value={stats.totalPending}
          icon={<Clock className="w-5 h-5 text-amber-500" />}
          color="bg-amber-50 border-amber-100"
        />
        <StatCard
          label="처리중"
          value={stats.totalProcessing}
          icon={<Loader2 className="w-5 h-5 text-blue-500" />}
          color="bg-blue-50 border-blue-100"
        />
        <StatCard
          label="완료"
          value={stats.totalDone}
          icon={<CheckCircle className="w-5 h-5 text-emerald-500" />}
          color="bg-emerald-50 border-emerald-100"
        />
        <StatCard
          label="반려"
          value={stats.totalCancelled}
          icon={<XCircle className="w-5 h-5 text-red-500" />}
          color="bg-red-50 border-red-100"
        />
      </div>

      {/* SLA + Average processing time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.avgProcessingHours !== null && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <p className="text-sm font-medium text-gray-500">평균 처리 시간</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.avgProcessingHours}<span className="text-sm font-medium text-gray-400 ml-1">시간</span>
            </p>
          </div>
        )}

        {(stats.slaWarnCount > 0 || stats.slaBreachCount > 0) && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <p className="text-sm font-medium text-gray-500">SLA 현황</p>
            </div>
            <div className="flex items-baseline gap-4">
              {stats.slaBreachCount > 0 && (
                <div>
                  <span className="text-2xl font-bold text-red-600">{stats.slaBreachCount}</span>
                  <span className="text-xs text-red-400 ml-1">초과</span>
                </div>
              )}
              {stats.slaWarnCount > 0 && (
                <div>
                  <span className="text-2xl font-bold text-amber-600">{stats.slaWarnCount}</span>
                  <span className="text-xs text-amber-400 ml-1">경고</span>
                </div>
              )}
            </div>
          </div>
        )}

        {stats.slaComplianceRate !== null && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <p className="text-sm font-medium text-gray-500">SLA 준수율</p>
            </div>
            <p className={`text-2xl font-bold ${stats.slaComplianceRate >= 90 ? 'text-emerald-600' : stats.slaComplianceRate >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
              {stats.slaComplianceRate}<span className="text-sm font-medium text-gray-400 ml-1">%</span>
            </p>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stats.tasksByDept.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-semibold text-gray-700 mb-4">부서별 업무</p>
            <TaskChart data={stats.tasksByDept} color="#3b82f6" />
          </div>
        )}

        {stats.tasksByPriority.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-semibold text-gray-700 mb-4">우선순위별 업무</p>
            <TaskChart
              data={stats.tasksByPriority.map((d) => ({
                ...d,
                name: PRIORITY_LABELS[d.name] || d.name,
              }))}
              color="#f59e0b"
            />
          </div>
        )}
      </div>
    </div>
  )
}
