import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../stores/appStore'
import { useRealtimeSubscription } from './useRealtimeSubscription'
import { playNotificationSound } from '../lib/notificationSound'
import type { Notification } from '../lib/types'

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const { user, unreadCount, setUnreadCount } = useAppStore()

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Failed to fetch notifications:', error)
        return
      }

      if (data) {
        setNotifications(data as Notification[])
        const unread = data.filter((n: any) => !n.is_read).length
        setUnreadCount(unread)
        window.electronAPI?.setBadge(unread)
      }
    } catch (err) {
      console.error('Notifications fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [user, setUnreadCount])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Real-time new notifications
  useRealtimeSubscription({
    table: 'notifications',
    event: 'INSERT',
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onData: (payload) => {
      const newNotif = payload.new as Notification
      setNotifications((prev) => [newNotif, ...prev])
      const newCount = unreadCount + 1
      setUnreadCount(newCount)
      window.electronAPI?.setBadge(newCount)

      // Play notification sound
      playNotificationSound()

      // Show native notification
      if ('Notification' in window && window.Notification.permission === 'granted') {
        new window.Notification(newNotif.title, { body: newNotif.message })
      }
    },
    enabled: !!user,
  })

  const markAsRead = useCallback(async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true } as any)
      .eq('id', notificationId)

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    )
    const newCount = Math.max(0, unreadCount - 1)
    setUnreadCount(newCount)
    window.electronAPI?.setBadge(newCount)
  }, [unreadCount, setUnreadCount])

  const markAllAsRead = useCallback(async () => {
    if (!user) return
    await supabase
      .from('notifications')
      .update({ is_read: true } as any)
      .eq('user_id', user.id)
      .eq('is_read', false)

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
    window.electronAPI?.setBadge(0)
  }, [user, setUnreadCount])

  return { notifications, loading, markAsRead, markAllAsRead }
}
