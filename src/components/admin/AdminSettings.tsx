import { useState } from 'react'
import { BarChart3, Users, Building2, Briefcase, Bell, Clock, Download, Settings } from 'lucide-react'
import { AdminDashboard } from './AdminDashboard'
import { UserManagement } from './UserManagement'
import { DepartmentManagement } from './DepartmentManagement'
import { ClientManagement } from './ClientManagement'
import { ReminderSettings } from './ReminderSettings'
import { ActivityLog } from './ActivityLog'
import { DataExport } from './DataExport'
import { SystemSettings } from './SystemSettings'

const tabs = [
  { id: 'dashboard', label: '운영 현황', icon: BarChart3 },
  { id: 'users', label: '사용자', icon: Users },
  { id: 'departments', label: '부서', icon: Building2 },
  { id: 'clients', label: '업체', icon: Briefcase },
  { id: 'reminders', label: '리마인더', icon: Bell },
  { id: 'activity', label: '활동 로그', icon: Clock },
  { id: 'export', label: '내보내기', icon: Download },
  { id: 'system', label: '시스템', icon: Settings },
] as const

type SettingsTab = typeof tabs[number]['id']

export function AdminSettings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('dashboard')

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Tab bar - horizontal scroll on mobile */}
      <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 sm:px-5 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {activeTab === 'dashboard' && <AdminDashboard />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'departments' && <DepartmentManagement />}
        {activeTab === 'clients' && <ClientManagement />}
        {activeTab === 'reminders' && <ReminderSettings />}
        {activeTab === 'activity' && <ActivityLog />}
        {activeTab === 'export' && <DataExport />}
        {activeTab === 'system' && <SystemSettings />}
      </div>
    </div>
  )
}
