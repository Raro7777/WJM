import { create } from 'zustand'
import type { Profile } from '../lib/types'
import type { TabId } from '../lib/constants'

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
