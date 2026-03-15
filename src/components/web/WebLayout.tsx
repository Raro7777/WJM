import { ClipboardList, Bell, BarChart3, LogOut, Settings, ChevronLeft, ChevronRight, Menu, X, Palette } from 'lucide-react'
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
  const { activeTab, setActiveTab, user, unreadCount, designVersion, setDesignVersion } = useAppStore()
  const { logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isAdmin = user?.role === 'super_admin' || user?.role === 'site_admin'

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
    <div className="flex h-screen bg-slate-100/90">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - drawer on mobile */}
      <aside         className={`
        fixed lg:relative z-50 lg:z-auto
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${sidebarOpen ? 'w-64' : 'lg:w-[72px] w-64'}
        h-full bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out shadow-lg lg:shadow-sm
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-100">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/25">
            <ClipboardList className="w-4.5 h-4.5 text-white" />
          </div>
          {(sidebarOpen || mobileMenuOpen) && (
            <div>
              <span className="font-bold text-slate-900 text-lg tracking-tight">WavenetHelper</span>
              <p className="text-[11px] text-slate-500 -mt-0.5 font-medium">업무처리 시스템</p>
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-all duration-200 relative ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-sm shadow-blue-500/5'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
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
        <div className="border-t border-slate-100 px-3 py-2">
          <button
            onClick={() => setDesignVersion(designVersion === 'v2' ? 'v1' : 'v2')}
            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            title="디자인 버전 전환"
          >
            <Palette className="w-3.5 h-3.5" />
            <span>{designVersion === 'v2' ? '기존' : '새'} 디자인으로 전환</span>
          </button>
        </div>
        <div className="border-t border-slate-100 px-3 py-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center shrink-0 ring-2 ring-blue-500/10">
              <span className="text-sm font-bold text-blue-600">
                {user?.name?.charAt(0) || 'U'}
              </span>
            </div>
            {(sidebarOpen || mobileMenuOpen) && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            title={!sidebarOpen ? '로그아웃' : undefined}
            className="w-full flex items-center gap-3 mt-3 px-3 py-2.5 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
          >
            <LogOut className="w-4.5 h-4.5 shrink-0" />
            {(sidebarOpen || mobileMenuOpen) && <span>로그아웃</span>}
          </button>
        </div>

        {/* Toggle button - desktop only, inside sidebar to avoid overlapping content */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute right-3 top-20 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-700 hover:shadow-sm transition-all z-10 hidden lg:flex"
        >
          {sidebarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-8 h-14 sm:h-16 flex items-center shadow-sm">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-2 mr-2 hover:bg-slate-100 rounded-lg lg:hidden"
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            {navItems.find((n) => n.id === activeTab)?.label}
          </h1>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-slate-100/60">
          <div className="max-w-5xl mx-auto p-5 sm:p-7 lg:p-10">
            {renderContent()}
          </div>
        </div>

        {/* Mobile bottom navigation */}
        <nav className="flex border-t border-slate-200 bg-white lg:hidden pb-[env(safe-area-inset-bottom)]">
          {navItems.map(({ id, label, Icon }) => {
            const isActive = activeTab === id
            const badge = id === 'notifications' ? unreadCount : 0

            return (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 pt-2.5 relative transition-colors ${
                  isActive ? 'text-blue-600' : 'text-slate-500'
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
