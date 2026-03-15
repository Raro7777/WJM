import { Bell, CheckCheck } from 'lucide-react'
import { useNotifications } from '../../hooks/useNotifications'
import { LoadingSpinner } from '../common/LoadingSpinner'

export function NotificationList() {
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications()

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <Bell className="w-4 h-4 text-slate-500" />
          <h2 className="text-[15px] font-bold text-slate-900">알림</h2>
          <span className="text-[13px] text-slate-500">({notifications.length})</span>
        </div>
        {notifications.some((n) => !n.is_read) && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 text-[13px] font-medium text-blue-500 hover:text-blue-600 px-3 py-2 hover:bg-blue-50 rounded-lg transition-colors"
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
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Bell className="w-12 h-12 mb-4" />
            <p className="text-[15px]">알림이 없습니다</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {notifications.map((notif) => (
              <button
                key={notif.id}
                onClick={() => !notif.is_read && markAsRead(notif.id)}
                className={`w-full text-left px-6 py-4.5 hover:bg-slate-50/90 transition-colors ${
                  !notif.is_read ? 'bg-blue-50/50' : ''
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {!notif.is_read && (
                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-full mt-2 shrink-0 shadow-sm shadow-blue-500/30" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[15px] leading-relaxed ${!notif.is_read ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                      {notif.title}
                    </p>
                    <p className="text-[14px] text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{notif.message}</p>
                    <p className="text-[12px] text-slate-400 mt-2.5">
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
