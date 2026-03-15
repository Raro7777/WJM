import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { ReminderSetting, Department } from '../lib/types'

export function useReminderSettings() {
  const [settings, setSettings] = useState<ReminderSetting[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [settingsRes, deptRes] = await Promise.all([
      supabase.from('reminder_settings').select('*').order('created_at'),
      supabase.from('departments').select('*').order('name'),
    ])
    if (settingsRes.data) setSettings(settingsRes.data as ReminderSetting[])
    if (deptRes.data) setDepartments(deptRes.data as Department[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const updateSetting = useCallback(async (id: string, updates: Partial<ReminderSetting>) => {
    const { error } = await supabase
      .from('reminder_settings')
      .update(updates as any)
      .eq('id', id)
    if (error) throw error
    await fetchAll()
  }, [fetchAll])

  const createSetting = useCallback(async (setting: {
    department_id: string | null
    category: string | null
    stage: string
    interval_minutes: number
  }) => {
    const { error } = await supabase
      .from('reminder_settings')
      .insert(setting as any)
    if (error) throw error
    await fetchAll()
  }, [fetchAll])

  const deleteSetting = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('reminder_settings')
      .delete()
      .eq('id', id)
    if (error) throw error
    await fetchAll()
  }, [fetchAll])

  return { settings, departments, loading, updateSetting, createSetting, deleteSetting }
}
