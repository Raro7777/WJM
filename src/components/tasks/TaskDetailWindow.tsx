import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { TaskDetail } from './TaskDetail'
import { TaskCreateForm } from './TaskCreateForm'
import { LoadingSpinner } from '../common/LoadingSpinner'
import type { Task } from '../../lib/types'

interface TaskDetailWindowProps {
  taskId: string
  isCreateMode?: boolean
}

export function TaskDetailWindow({ taskId, isCreateMode = false }: TaskDetailWindowProps) {
  useAuth() // initialize auth
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(!isCreateMode)

  useEffect(() => {
    if (isCreateMode) return

    async function fetchTask() {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single()
      if (data) setTask(data as Task)
      setLoading(false)
    }
    fetchTask()

    // Subscribe to changes on this task
    const channel = supabase
      .channel(`task-detail-${taskId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `id=eq.${taskId}` },
        (payload) => {
          if (payload.new) setTask(payload.new as Task)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [taskId, isCreateMode])

  const handleClose = async () => {
    await window.electronAPI?.closeDetail()
  }

  // --- Create mode ---
  if (isCreateMode) {
    return (
      <div className="h-screen flex flex-col bg-white">
        <div className="drag-region flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
          <p className="text-xs font-medium text-gray-600 no-drag truncate flex-1">
            새 업무 요청
          </p>
          <button
            onClick={handleClose}
            className="no-drag p-1 hover:bg-gray-200 rounded transition-colors shrink-0 ml-2"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <TaskCreateForm onBack={handleClose} />
        </div>
      </div>
    )
  }

  // --- Loading ---
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <LoadingSpinner />
      </div>
    )
  }

  // --- Not found ---
  if (!task) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white gap-3">
        <p className="text-sm text-gray-500">업무를 찾을 수 없습니다</p>
        <button onClick={handleClose} className="text-sm text-blue-500 hover:underline">
          닫기
        </button>
      </div>
    )
  }

  // --- Detail mode ---
  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Title bar */}
      <div className="drag-region flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <p className="text-xs font-medium text-gray-600 no-drag truncate flex-1">
          {task.title}
        </p>
        <button
          onClick={handleClose}
          className="no-drag p-1 hover:bg-gray-200 rounded transition-colors shrink-0 ml-2"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Task detail (reuse existing component) */}
      <div className="flex-1 overflow-hidden">
        <TaskDetail task={task} onBack={handleClose} />
      </div>
    </div>
  )
}
