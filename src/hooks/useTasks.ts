import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../stores/appStore'
import { useRealtimeSubscription } from './useRealtimeSubscription'
import type { Task } from '../lib/types'

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAppStore()

  const fetchTasks = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

      // Filter based on user role
      if (user.role === 'user') {
        query = query.eq('requester_id', user.id)
      } else if (user.role === 'handler') {
        query = query.or(`requester_id.eq.${user.id},target_dept_id.eq.${user.department_id}`)
      }
      // admin sees all

      const { data, error: fetchError } = await query
      if (fetchError) {
        console.error('Failed to fetch tasks:', fetchError)
        setError('업무 목록을 불러오는데 실패했습니다')
        return
      }
      if (data) setTasks(data as Task[])
    } catch (err) {
      console.error('Tasks fetch error:', err)
      setError('업무 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Real-time updates
  useRealtimeSubscription({
    table: 'tasks',
    event: '*',
    onData: () => fetchTasks(),
    enabled: !!user,
  })

  const createTask = useCallback(async (task: {
    title: string
    content: string
    target_dept_id: string
    category: string
    priority: Task['priority']
  }) => {
    if (!user) return
    const { data, error } = await supabase.from('tasks').insert({
      ...task,
      requester_id: user.id,
      requester_name: user.name,
      status: 'pending',
    } as any).select('id').single()
    if (error) throw error
    return data as { id: string }
  }, [user])

  const updateTaskStatus = useCallback(async (
    taskId: string,
    status: Task['status'],
    handlerResponse?: string
  ) => {
    if (!user) return
    const update: any = { status }

    if (status === 'processing') {
      update.handler_id = user.id
    }
    if (status === 'done' || status === 'cancelled') {
      update.processed_at = new Date().toISOString()
    }
    if (status === 'need_confirm') {
      // handler requests confirmation from requester
    }
    if (handlerResponse) {
      update.handler_response = handlerResponse
    }

    const { error } = await supabase
      .from('tasks')
      .update(update as any)
      .eq('id', taskId)

    if (error) throw error
  }, [user])

  return { tasks, loading, error, createTask, updateTaskStatus, refetch: fetchTasks }
}
