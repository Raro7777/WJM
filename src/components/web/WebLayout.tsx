import { ClipboardList, Bell, BarChart3, LogOut, Settings, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useAuth } from '../../hooks/useAuth'
import { TaskList } from '../tasks/TaskList'
import { NotificationList } from '../notifications/NotificationList'
import { DashboardView } from '../dashboard/DashboardView'
import { AdminSettings } from '../admin/AdminSettings'
import type { TabId } from '../../lib/constants'

const allNavItems: { id: TabId; label: string; Icon: any; adminOnly?: boolean }[] = [
  { id: 'dashboard', label: '대시보드', Icon: BarChart3 },
  { id: 'tasks', label: '업무 요청', Icon: ClipboardList },
  { id: 'notifications', label: '알림', Icon: Bell },
  { id: 'settings', label: '설정', Icon: Settings, adminOnly: true },
]

export function WebLayout() {
  const { activeTab, setActiveTab, user, unreadCount } = useAppStore()
  const { logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isAdmin = user?.role === 'admin'

  const navItems = useMemo(
    () => allNavItems.filter((item) => !item.adminOnly || isAdmin),
    [isAdmin]
  )

  const handleTabChange = (id: TabId) => {
    setActiveTab(id)
    setMobileMenuOpen(false)
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />
      case 'tasks':
        return <TaskList />
      case 'notifications':
        return <NotificationList />
      case 'settings':
        return isAdmin ? <AdminSettings /> : null
    }
  }

  return (
    <div className="flex h-screen bg-gray-50/80">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - drawer on mobile */}
      <aside className={`
        fixed lg:relative z-50 lg:z-auto
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${sidebarOpen ? 'w-64' : 'lg:w-[72px] w-64'}
        h-full bg-white border-r border-gray-200/80 flex flex-col transition-all duration-300 ease-in-out shadow-xl lg:shadow-sm
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-gray-100">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/25">
            <ClipboardList className="w-4.5 h-4.5 text-white" />
          </div>
          {(sidebarOpen || mobileMenuOpen) && (
            <div>
              <span className="font-bold text-gray-900 text-lg tracking-tight">WJM</span>
              <p className="text-[10px] text-gray-400 -mt-0.5">업무처리 시스템</p>
            </div>
          )}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="ml-auto p-1.5 hover:bg-gray-100 rounded-lg lg:hidden"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map(({ id, label, Icon }) => {
            const isActive = activeTab === id
            const badge = id === 'notifications' ? unreadCount : 0

            return (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                title={!sidebarOpen ? label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-sm shadow-blue-500/5'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-600' : ''}`} />
                {(sidebarOpen || mobileMenuOpen) && <span>{label}</span>}
                {badge > 0 && (
                  <span className={`${(sidebarOpen || mobileMenuOpen) ? 'ml-auto' : 'absolute -top-1 -right-1'} min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-sm shadow-red-500/30`}>
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* User & Logout */}
        <div className="border-t border-gray-100 px-3 py-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center shrink-0 ring-2 ring-blue-500/10">
              <span className="text-sm font-bold text-blue-600">
                {user?.name?.charAt(0) || 'U'}
              </span>
            </div>
            {(sidebarOpen || mobileMenuOpen) && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            title={!sidebarOpen ? '로그아웃' : undefined}
            className="w-full flex items-center gap-3 mt-3 px-3 py-2.5 text-sm text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
          >
            <LogOut className="w-4.5 h-4.5 shrink-0" />
            {(sidebarOpen || mobileMenuOpen) && <span>로그아웃</span>}
          </button>
        </div>

        {/* Toggle button - desktop only */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full items-center justify-center text-gray-400 hover:text-gray-600 hover:shadow-sm transition-all z-10 hidden lg:flex"
        >
          {sidebarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200/80 px-4 sm:px-8 h-14 sm:h-16 flex items-center shadow-sm">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-2 mr-2 hover:bg-gray-100 rounded-lg lg:hidden"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-base sm:text-lg font-bold text-gray-900">
            {navItems.find((n) => n.id === activeTab)?.label}
          </h1>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50">
          <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
            {renderContent()}
          </div>
        </div>

        {/* Mobile bottom navigation */}
        <nav className="flex border-t border-gray-200 bg-white lg:hidden pb-[env(safe-area-inset-bottom)]">
          {navItems.map(({ id, label, Icon }) => {
            const isActive = activeTab === id
            const badge = id === 'notifications' ? unreadCount : 0

            return (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 pt-2.5 relative transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            )
          })}
        </nav>
      </main>
    </div>
  )
}
