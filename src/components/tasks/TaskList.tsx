import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, X, SlidersHorizontal, AlertCircle } from 'lucide-react'
import { useTasks } from '../../hooks/useTasks'
import { supabase } from '../../lib/supabase'
import { TaskCard } from './TaskCard'
import { TaskCreateForm } from './TaskCreateForm'
import { TaskDetail } from './TaskDetail'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { CATEGORY_LABELS, PRIORITY_LABELS } from '../../lib/constants'
import type { Task, Department } from '../../lib/types'

const isElectron = !!window.electronAPI

const PAGE_SIZE = 20

export function TaskList() {
  const { tasks, loading, error } = useTasks()
  const [showCreate, setShowCreate] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [departments, setDepartments] = useState<Department[]>([])

  useEffect(() => {
    supabase.from('departments').select('*').then(({ data }) => {
      if (data) setDepartments(data as Department[])
    })
  }, [])

  if (showCreate) {
    return (
      <div className={isElectron ? 'flex flex-col h-full' : 'bg-white rounded-xl border border-gray-200 overflow-hidden min-h-[500px]'}>
        <TaskCreateForm onBack={() => setShowCreate(false)} />
      </div>
    )
  }

  if (selectedTask) {
    return (
      <div className={isElectron ? 'flex flex-col h-full' : 'bg-white rounded-xl border border-gray-200 overflow-hidden min-h-[500px]'}>
        <TaskDetail task={selectedTask} onBack={() => setSelectedTask(null)} />
      </div>
    )
  }

  const filteredTasks = useMemo(() => {
    let result = tasks

    // Status filter
    if (filter !== 'all') {
      result = result.filter((t) => t.status === filter)
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((t) => t.category === categoryFilter)
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      result = result.filter((t) => t.priority === priorityFilter)
    }

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        t.content?.toLowerCase().includes(q) ||
        t.requester_name?.toLowerCase().includes(q)
      )
    }

    return result
  }, [tasks, filter, categoryFilter, priorityFilter, search])

  const visibleTasks = filteredTasks.slice(0, visibleCount)
  const hasMore = visibleCount < filteredTasks.length
  const activeFilterCount = [categoryFilter !== 'all', priorityFilter !== 'all'].filter(Boolean).length

  return (
    <div className={isElectron ? 'flex flex-col h-full' : 'space-y-4'}>
      {/* Filter bar + Create button */}
      <div className={`${isElectron ? 'px-5 py-3.5 border-b border-gray-100 space-y-2' : 'space-y-3'}`}>
        {/* Search + Filters toggle + Create (web) */}
        {!isElectron && (
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE) }}
                placeholder="업무 검색 (제목, 내용, 요청자)"
                className="w-full pl-10 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white placeholder:text-gray-300"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 rounded-xl border transition-colors relative shrink-0 ${
                showFilters || activeFilterCount > 0
                  ? 'border-blue-400 bg-blue-50 text-blue-600'
                  : 'border-gray-200 text-gray-400 hover:border-gray-300'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600 transition-colors shadow-sm shadow-blue-500/20 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">새 업무 요청</span>
              <span className="sm:hidden">요청</span>
            </button>
          </div>
        )}

        {/* Advanced filters */}
        {showFilters && !isElectron && (
          <div className="flex flex-wrap items-center gap-2 px-1">
            <span className="text-xs font-medium text-gray-400">종류:</span>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setVisibleCount(PAGE_SIZE) }}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
            >
              <option value="all">전체</option>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <span className="text-xs font-medium text-gray-400 ml-2">우선순위:</span>
            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setVisibleCount(PAGE_SIZE) }}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
            >
              <option value="all">전체</option>
              {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setCategoryFilter('all'); setPriorityFilter('all') }}
                className="text-xs text-blue-500 hover:text-blue-700 ml-1"
              >
                초기화
              </button>
            )}
          </div>
        )}

        {/* Status tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
          {['all', 'pending', 'processing', 'need_confirm', 'done', 'cancelled'].map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setVisibleCount(PAGE_SIZE) }}
              className={`px-3.5 sm:px-4 py-2 text-xs font-medium rounded-full whitespace-nowrap transition-all ${
                filter === f
                  ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
              }`}
            >
              {f === 'all' ? '전체' : f === 'pending' ? '대기중' : f === 'processing' ? '처리중' : f === 'need_confirm' ? '확인요청' : f === 'done' ? '완료' : '반려'}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl mx-4 sm:mx-0">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Task list */}
      <div className={isElectron ? 'flex-1 overflow-y-auto' : 'bg-white rounded-xl border border-gray-200 overflow-hidden'}>
        {loading ? (
          <LoadingSpinner />
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <p className="text-sm">{search ? '검색 결과가 없습니다' : '업무 요청이 없습니다'}</p>
            {search && (
              <button onClick={() => setSearch('')} className="mt-2 text-xs text-blue-500 hover:text-blue-700">
                검색 초기화
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100/60">
              {visibleTasks.map((task) => (
                <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} department={departments.find(d => d.id === task.target_dept_id)} />
              ))}
            </div>
            {hasMore && (
              <div className="px-5 py-4 text-center border-t border-gray-100">
                <button
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                  className="text-sm text-blue-500 hover:text-blue-700 font-medium"
                >
                  더 보기 ({filteredTasks.length - visibleCount}개 남음)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create button - only for Electron */}
      {isElectron && (
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600 transition-colors shadow-sm shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            새 업무 요청
          </button>
        </div>
      )}
    </div>
  )
}
