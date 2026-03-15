import { Bell, CheckCheck } from 'lucide-react'
import { useNotifications } from '../../hooks/useNotifications'
import { LoadingSpinner } from '../common/LoadingSpinner'

export function NotificationList() {
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications()

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-bold text-gray-900">알림</h2>
          <span className="text-xs text-gray-400">({notifications.length})</span>
        </div>
        {notifications.some((n) => !n.is_read) && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 text-xs font-medium text-blue-500 hover:text-blue-600 px-3 py-1.5 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            모두 읽음
          </button>
        )}
      </div>

      {/* Content */}
      <div className="max-h-[600px] overflow-y-auto">
        {loading ? (
          <LoadingSpinner />
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <Bell className="w-12 h-12 mb-3" />
            <p className="text-sm">알림이 없습니다</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map((notif) => (
              <button
                key={notif.id}
                onClick={() => !notif.is_read && markAsRead(notif.id)}
                className={`w-full text-left px-6 py-4 hover:bg-gray-50/80 transition-colors ${
                  !notif.is_read ? 'bg-blue-50/40' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {!notif.is_read && (
                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-full mt-1.5 shrink-0 shadow-sm shadow-blue-500/30" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-relaxed ${!notif.is_read ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                      {notif.title}
                    </p>
                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">{notif.message}</p>
                    <p className="text-xs text-gray-300 mt-2">
                      {new Date(notif.created_at).toLocaleString('ko-KR')}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
