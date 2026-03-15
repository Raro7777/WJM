import { ClipboardList, Bell, BarChart3 } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import type { TabId } from '../../lib/constants'

const tabs: { id: TabId; label: string; Icon: any }[] = [
  { id: 'tasks', label: '업무', Icon: ClipboardList },
  { id: 'notifications', label: '알림', Icon: Bell },
  { id: 'dashboard', label: '대시보드', Icon: BarChart3 },
]

export function TabBar() {
  const { activeTab, setActiveTab, unreadCount } = useAppStore()

  return (
    <div className="flex border-t border-gray-200 bg-white">
      {tabs.map(({ id, label, Icon }) => {
        const isActive = activeTab === id
        const badge = id === 'notifications' ? unreadCount : 0

        return (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex flex-col items-center py-2 relative transition-colors ${
              isActive ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {badge > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[14px] h-3.5 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
