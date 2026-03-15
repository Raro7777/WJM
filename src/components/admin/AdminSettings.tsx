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
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Tab bar - horizontal scroll on mobile */}
      <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide bg-slate-50/50">
        {tabs.map((tab, index) => {
          const Icon = tab.icon
          return (
            <div key={tab.id} className="flex items-stretch">
              {index > 0 && (
                <div className="w-px bg-slate-200 self-center h-6 shrink-0 mx-4" aria-hidden />
              )}
              <button
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-2.5 min-h-[48px] px-5 sm:px-6 py-3.5 text-[15px] font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 touch-manipulation ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-700 bg-blue-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/80'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            </div>
          )
        })}
      </div>

      {/* Content */}
      <div className="pt-6 pb-6 px-8 sm:pt-8 sm:pb-8 sm:px-12 lg:pt-10 lg:pb-10 lg:px-16 bg-slate-50/30 min-h-[400px]">
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
