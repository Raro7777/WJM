export const STATUS_LABELS: Record<string, string> = {
  pending: '대기중',
  processing: '처리중',
  need_confirm: '확인요청',
  done: '완료',
  cancelled: '반려',
}

export const PRIORITY_LABELS: Record<string, string> = {
  low: '낮음',
  normal: '보통',
  high: '높음',
  urgent: '긴급',
}

export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  need_confirm: 'bg-purple-100 text-purple-800',
  done: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  normal: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600',
}

export const CATEGORY_LABELS: Record<string, string> = {
  reception: '접수',
  policy: '정책',
  settlement: '정산',
  gift: '사은품',
  general: '기타',
}

export const CATEGORY_COLORS: Record<string, string> = {
  reception: 'bg-cyan-100 text-cyan-700',
  policy: 'bg-indigo-100 text-indigo-700',
  settlement: 'bg-emerald-100 text-emerald-700',
  gift: 'bg-pink-100 text-pink-700',
  general: 'bg-gray-100 text-gray-700',
}

export const REMINDER_STAGE_LABELS: Record<string, string> = {
  pending_accept: '접수 대기',
  processing: '처리 중',
  need_confirm: '확인 요청',
}

export const TAB_ITEMS = [
  { id: 'tasks', label: '업무', icon: 'ClipboardList' },
  { id: 'notifications', label: '알림', icon: 'Bell' },
  { id: 'dashboard', label: '대시보드', icon: 'BarChart3' },
  { id: 'settings', label: '설정', icon: 'Settings' },
] as const

export type TabId = typeof TAB_ITEMS[number]['id']
