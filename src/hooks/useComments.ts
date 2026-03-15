import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../stores/appStore'
import { useRealtimeSubscription } from './useRealtimeSubscription'
import type { TaskComment } from '../lib/types'

export function useComments(taskId: string) {
  const [comments, setComments] = useState<TaskComment[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAppStore()

  const fetchComments = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })

    if (data) setComments(data as TaskComment[])
    setLoading(false)
  }, [taskId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  // Real-time new comments
  useRealtimeSubscription({
    table: 'task_comments',
    event: 'INSERT',
    filter: `task_id=eq.${taskId}`,
    onData: (payload) => {
      const newComment = payload.new as TaskComment
      setComments((prev) => [...prev, newComment])
    },
    enabled: !!taskId,
  })

  const addComment = useCallback(async (content: string) => {
    if (!user) return
    const { error } = await supabase.from('task_comments').insert({
      task_id: taskId,
      user_id: user.id,
      user_name: user.name || user.email,
      content,
    } as any)
    if (error) throw error
  }, [user, taskId])

  return { comments, loading, addComment }
}
