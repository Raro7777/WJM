import { useMemo, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ScrollText, ChevronRight, Plus, LogOut } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { useAuth } from '../../hooks/useAuth'
import { useTasks } from '../../hooks/useTasks'
import { PRIORITY_COLORS, PRIORITY_LABELS, STATUS_LABELS, CATEGORY_LABELS } from '../../lib/constants'
import type { Task } from '../../lib/types'

const isElectron = !!window.electronAPI

// Fixed widths
const PANEL_WIDTH = 360

// Heights for dynamic sizing
const HEADER_HEIGHT = 64
const FOOTER_HEIGHT = 92 // footer with create button
const ITEM_HEIGHT = 68
const EMPTY_HEIGHT = 160
const MIN_PANEL_HEIGHT = 240
const MAX_PANEL_HEIGHT = 700

function getStatusIcon(status: string) {
  if (status === 'pending') return '!'
  if (status === 'processing') return '\u25B6'
  if (status === 'need_confirm') return '?'
  return '\u2713'
}

function getStatusColor(status: string) {
  if (status === 'pending') return 'text-amber-400'
  if (status === 'processing') return 'text-sky-400'
  if (status === 'need_confirm') return 'text-violet-400'
  return 'text-emerald-400'
}

function getStatusBgColor(status: string) {
  if (status === 'pending') return 'bg-amber-400/10'
  if (status === 'processing') return 'bg-sky-400/10'
  if (status === 'need_confirm') return 'bg-violet-400/10'
  return 'bg-emerald-400/10'
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '\uBC29\uAE08'
  if (mins < 60) return `${mins}\uBD84 \uC804`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}\uC2DC\uAC04 \uC804`
  const days = Math.floor(hours / 24)
  return `${days}\uC77C \uC804`
}

export function ExpandedPanel() {
  const { setExpanded } = useAppStore()
  const { logout } = useAuth()
  const { tasks, loading } = useTasks()
  const resizedRef = useRef(false)

  // Memoize active tasks filtering and sorting
  const activeTasks = useMemo(() =>
    tasks
      .filter((t) => t.status === 'pending' || t.status === 'processing' || t.status === 'need_confirm')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [tasks]
  )

  // Dynamic resize based on content
  useEffect(() => {
    if (!isElectron || loading) return

    let contentHeight: number
    if (activeTasks.length === 0) {
      contentHeight = HEADER_HEIGHT + EMPTY_HEIGHT + FOOTER_HEIGHT
    } else {
      const listPadding = 16 // p-2 top + bottom
      contentHeight = HEADER_HEIGHT + listPadding + (activeTasks.length * ITEM_HEIGHT) + FOOTER_HEIGHT
    }

    const targetHeight = Math.max(MIN_PANEL_HEIGHT, Math.min(contentHeight, MAX_PANEL_HEIGHT))
    window.electronAPI?.resizeWidget(PANEL_WIDTH, targetHeight)
    resizedRef.current = true
  }, [activeTasks.length, loading])

  const handleMouseLeave = async () => {
    setExpanded(false)
    await window.electronAPI?.collapseWidget()
  }

  const handleTaskClick = async (task: Task) => {
    if (isElectron) {
      await window.electronAPI.openDetail(task.id)
    }
  }

  const handleCreateClick = async () => {
    if (isElectron) {
      await window.electronAPI.openCreate()
    }
  }

  return (
    <motion.div
      onMouseLeave={handleMouseLeave}
      className="w-full h-full bg-[#1a1b2e]/95 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/5 backdrop-blur-xl"
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
          <ScrollText className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-[15px] font-semibold text-white/90 tracking-wide">
            업무 요청
          </h2>
        </div>
        <div className="px-3 py-1 rounded-full bg-white/5 text-[11px] text-white/50 font-medium">
          {activeTasks.length}건
        </div>
        <button
          onClick={async (e) => {
            e.stopPropagation()
            await logout()
          }}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          title="로그아웃"
        >
          <LogOut className="w-3.5 h-3.5 text-white/30 hover:text-white/60" />
        </button>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
          </div>
        ) : activeTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-white/25">
            <ScrollText className="w-10 h-10 mb-3" />
            <p className="text-sm">처리할 업무가 없습니다</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {activeTasks.map((task, index) => (
              <motion.button
                key={task.id}
                onClick={() => handleTaskClick(task)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl ${getStatusBgColor(task.status)} hover:bg-white/8 transition-all text-left group`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                {/* Status icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${getStatusBgColor(task.status)}`}>
                  <span className={`text-xs font-bold ${getStatusColor(task.status)}`}>
                    {getStatusIcon(task.status)}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="text-[13px] text-white/85 truncate font-medium leading-tight">
                    {task.title}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-1.5 py-0.5 text-[9px] rounded-md bg-white/5 text-white/40 font-medium">
                      {CATEGORY_LABELS[task.category] || task.category}
                    </span>
                    <span className={`px-1.5 py-0.5 text-[9px] rounded-md ${PRIORITY_COLORS[task.priority]}`}>
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                    <span className="text-[9px] text-white/25">&middot;</span>
                    <span className="text-[9px] text-white/35">
                      {task.requester_name || ''}
                    </span>
                    <span className="text-[9px] text-white/25">&middot;</span>
                    <span className="text-[9px] text-white/30">
                      {timeAgo(task.created_at)}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight className="w-4 h-4 text-white/15 group-hover:text-white/40 shrink-0 transition-colors" />
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Footer with create button */}
      <div className="px-4 py-3 border-t border-white/5 space-y-2">
        <button
          onClick={handleCreateClick}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          새 업무 요청
        </button>
        <p className="text-[10px] text-white/15 text-center tracking-wider">클릭하여 상세 보기</p>
      </div>
    </motion.div>
  )
}
