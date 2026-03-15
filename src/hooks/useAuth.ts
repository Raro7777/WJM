import { useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../stores/appStore'

export function useAuth() {
  const { user, isAuthenticated, setUser, resetStore } = useAppStore()

  useEffect(() => {
    // Check existing session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          fetchProfile(session.user.id)
        }
      })
      .catch((err) => {
        console.error('Failed to get session:', err)
      })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Failed to fetch profile:', error)
        return
      }
      if (data) {
        setUser(data as any)
      }
    } catch (err) {
      console.error('Profile fetch error:', err)
    }
  }

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const logout = useCallback(async () => {
    try {
      await supabase.removeAllChannels()
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Logout error:', err)
    }
    resetStore()
  }, [resetStore])

  return { user, isAuthenticated, login, logout }
}
