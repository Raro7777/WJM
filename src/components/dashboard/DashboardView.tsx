import { useDashboard, type DeptStatus } from '../../hooks/useDashboard'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { Clock, CheckCircle, Loader2, XCircle } from 'lucide-react'

function getTrafficLight(dept: DeptStatus): { color: string; label: string; bg: string; ring: string } {
  // Red: SLA breach or many pending
  if (dept.slaBreach > 0) return { color: 'bg-red-500', label: '긴급', bg: 'bg-red-50 border-red-200', ring: 'ring-red-500/30' }
  // Yellow: SLA warn or pending > 0
  if (dept.slaWarn > 0 || dept.pending > 0) return { color: 'bg-amber-400', label: '주의', bg: 'bg-amber-50 border-amber-200', ring: 'ring-amber-400/30' }
  // Green: all clear
  return { color: 'bg-emerald-500', label: '정상', bg: 'bg-emerald-50 border-emerald-200', ring: 'ring-emerald-500/30' }
}

export function DashboardView() {
  const { stats, loading } = useDashboard()

  if (loading) return <LoadingSpinner />

  const totalTasks = stats.totalPending + stats.totalProcessing + stats.totalDone + stats.totalCancelled

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-amber-50 rounded-xl border border-amber-100 px-5 py-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-[13px] text-amber-600 font-medium">대기</p>
            <p className="text-2xl font-bold text-slate-900">{stats.totalPending}</p>
          </div>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-100 px-5 py-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-500 shrink-0" />
          <div>
            <p className="text-[13px] text-blue-600 font-medium">처리중</p>
            <p className="text-2xl font-bold text-slate-900">{stats.totalProcessing}</p>
          </div>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-100 px-5 py-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          <div>
            <p className="text-[13px] text-emerald-600 font-medium">완료</p>
            <p className="text-2xl font-bold text-slate-900">{stats.totalDone}</p>
          </div>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-100 px-5 py-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="text-[13px] text-red-600 font-medium">반려</p>
            <p className="text-2xl font-bold text-slate-900">{stats.totalCancelled}</p>
          </div>
        </div>
      </div>

      {/* Department traffic lights */}
      <div>
        <h3 className="text-[15px] font-semibold text-slate-700 mb-4">부서별 처리 현황</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.deptStatuses.map((dept) => {
            const light = getTrafficLight(dept)
            const active = dept.pending + dept.processing
            return (
              <div key={dept.id} className={`rounded-xl border p-5 ${light.bg} transition-all`}>
                <div className="flex items-center gap-3 mb-4">
                  {/* Traffic light */}
                  <div className={`w-4 h-4 rounded-full ${light.color} ring-4 ${light.ring} shrink-0`} />
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-slate-800 truncate">{dept.name}</p>
                    <span className="text-[11px] font-medium text-slate-500 shrink-0 ml-2">{light.label}</span>
                  </div>
                </div>

                {/* Status bars */}
                <div className="flex items-center gap-1 h-2.5 rounded-full overflow-hidden bg-slate-200/60 mb-3">
                  {dept.done > 0 && (
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${dept.total ? (dept.done / dept.total) * 100 : 0}%` }} />
                  )}
                  {dept.processing > 0 && (
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${dept.total ? (dept.processing / dept.total) * 100 : 0}%` }} />
                  )}
                  {dept.pending > 0 && (
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${dept.total ? (dept.pending / dept.total) * 100 : 0}%` }} />
                  )}
                  {dept.cancelled > 0 && (
                    <div className="h-full bg-red-400 rounded-full" style={{ width: `${dept.total ? (dept.cancelled / dept.total) * 100 : 0}%` }} />
                  )}
                </div>

                {/* Counts */}
                <div className="flex items-center gap-4 text-[12px]">
                  <span className="text-amber-600 font-medium">대기 {dept.pending}</span>
                  <span className="text-blue-600 font-medium">처리 {dept.processing}</span>
                  <span className="text-emerald-600 font-medium">완료 {dept.done}</span>
                  {dept.slaBreach > 0 && <span className="text-red-600 font-semibold ml-auto">SLA초과 {dept.slaBreach}</span>}
                  {dept.slaWarn > 0 && !dept.slaBreach && <span className="text-amber-600 font-semibold ml-auto">SLA경고 {dept.slaWarn}</span>}
                </div>
              </div>
            )
          })}
        </div>

        {stats.deptStatuses.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-sm text-slate-400">등록된 부서가 없습니다</p>
          </div>
        )}
      </div>
    </div>
  )
}
