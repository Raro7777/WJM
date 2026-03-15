import { create } from 'zustand'
import type { Profile } from '../lib/types'
import type { TabId } from '../lib/constants'

export type DesignVersion = 'v1' | 'v2'

interface AppState {
  // Auth
  user: Profile | null
  isAuthenticated: boolean
  setUser: (user: Profile | null) => void

  // UI
  isExpanded: boolean
  activeTab: TabId
  setExpanded: (expanded: boolean) => void
  setActiveTab: (tab: TabId) => void

  // Design version (v1: 기존, v2: 새 디자인)
  designVersion: DesignVersion
  setDesignVersion: (v: DesignVersion) => void

  // Notifications
  unreadCount: number
  setUnreadCount: (count: number) => void

  // Reset
  resetStore: () => void
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),

  // UI
  isExpanded: false,
  activeTab: 'tasks',
  setExpanded: (isExpanded) => set({ isExpanded }),
  setActiveTab: (activeTab) => set({ activeTab }),

  // Design version - persisted in localStorage
  designVersion: (() => {
    if (typeof window === 'undefined') return 'v1'
    const v = localStorage.getItem('wjm_design_version')
    return v === 'v2' ? 'v2' : 'v1'
  })(),
  setDesignVersion: (v) => {
    if (typeof window !== 'undefined') localStorage.setItem('wjm_design_version', v)
    set({ designVersion: v })
  },

  // Notifications
  unreadCount: 0,
  setUnreadCount: (unreadCount) => set({ unreadCount }),

  // Reset all state on logout
  resetStore: () => set({
    user: null,
    isAuthenticated: false,
    isExpanded: false,
    activeTab: 'tasks',
    unreadCount: 0,
  }),
}))
