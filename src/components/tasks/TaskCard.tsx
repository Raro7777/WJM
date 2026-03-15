import { Clock, AlertTriangle } from 'lucide-react'
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, CATEGORY_LABELS, CATEGORY_COLORS } from '../../lib/constants'
import type { Task, Department } from '../../lib/types'

interface TaskCardProps {
  task: Task
  onClick: () => void
  department?: Department | null
}

export function TaskCard({ task, onClick, department }: TaskCardProps) {
  const timeAgo = getTimeAgo(task.created_at)
  const slaStatus = getSlaStatus(task, department)

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-5 py-4 hover:bg-gray-50/80 transition-colors group ${
        slaStatus === 'escalate' ? 'bg-red-50/30' : slaStatus === 'warn' ? 'bg-amber-50/30' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {slaStatus && (
              <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${
                slaStatus === 'escalate' ? 'text-red-500' : 'text-amber-500'
              }`} />
            )}
            <p className="text-sm font-semibold text-gray-900 truncate leading-relaxed">{task.title}</p>
          </div>
          <p className="text-xs text-gray-400 truncate mt-1 leading-relaxed">{task.content}</p>
        </div>
        <span className={`px-2 py-1 text-[10px] font-semibold rounded-md ${STATUS_COLORS[task.status]} shrink-0`}>
          {STATUS_LABELS[task.status]}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-2.5">
        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-md ${CATEGORY_COLORS[task.category] || 'bg-gray-100 text-gray-500'}`}>
          {CATEGORY_LABELS[task.category] || task.category}
        </span>
        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-md ${PRIORITY_COLORS[task.priority]}`}>
          {PRIORITY_LABELS[task.priority]}
        </span>
        {slaStatus && (
          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md ${
            slaStatus === 'escalate' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {slaStatus === 'escalate' ? 'SLA 초과' : 'SLA 경고'}
          </span>
        )}
        <span className="flex items-center gap-1 text-[10px] text-gray-300 ml-auto">
          <Clock className="w-3 h-3" />
          {timeAgo}
        </span>
      </div>
    </button>
  )
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}

function getSlaStatus(task: Task, dept?: Department | null): 'warn' | 'escalate' | null {
  // Only check SLA for active tasks
  if (task.status === 'done' || task.status === 'cancelled') return null
  if (!dept) return null

  const elapsedMinutes = (Date.now() - new Date(task.created_at).getTime()) / 60000

  if (dept.sla_escalate_minutes && elapsedMinutes >= dept.sla_escalate_minutes) {
    return 'escalate'
  }
  if (dept.sla_warn_minutes && elapsedMinutes >= dept.sla_warn_minutes) {
    return 'warn'
  }
  return null
}
