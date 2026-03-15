import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

type Event = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

interface SubscriptionOptions {
  table: string
  event?: Event
  filter?: string
  onData: (payload: any) => void
  enabled?: boolean
}

export function useRealtimeSubscription({
  table,
  event = '*',
  filter,
  onData,
  enabled = true,
}: SubscriptionOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!enabled) return

    const channelName = `${table}-${event}-${filter || 'all'}-${Date.now()}`

    const channelConfig: any = {
      event,
      schema: 'public',
      table,
    }

    if (filter) {
      channelConfig.filter = filter
    }

    channelRef.current = supabase
      .channel(channelName)
      .on('postgres_changes', channelConfig, (payload) => {
        onData(payload)
      })
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [table, event, filter, enabled])
}
