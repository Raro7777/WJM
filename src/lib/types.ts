export interface Department {
  id: string
  name: string
  description: string | null
  parent_id: string | null
  sla_warn_minutes: number | null
  sla_urgent_minutes: number | null
  sla_escalate_minutes: number | null
  color: string | null
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  name: string
  email: string
  department_id: string | null
  role: string
  avatar_color: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  title: string
  content: string
  category: string
  requester_id: string | null
  requester_name: string | null
  target_dept_id: string
  handler_id: string | null
  client_id: string | null
  status: string
  priority: string
  escalation_level: number | null
  ai_summary: string | null
  ai_priority_reason: string | null
  handler_response: string | null
  file_urls: any | null
  created_at: string
  updated_at: string
  processed_at: string | null
  confirmed_at: string | null
}

export interface ExternalClient {
  id: string
  name: string
  slug: string
  target_dept_id: string
  target_dept_ids: string[]
  default_category: string
  logo_url: string | null
  description: string | null
  is_active: boolean
  must_change_password: boolean
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  task_id: string | null
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  user_name: string
  content: string
  created_at: string
}

export interface ReminderSetting {
  id: string
  department_id: string | null
  category: string | null
  stage: string
  interval_minutes: number
  is_enabled: boolean
  created_at: string
  updated_at: string
}

// Electron API types
declare global {
  interface Window {
    electronAPI: {
      expandWidget: () => Promise<void>
      collapseWidget: () => Promise<void>
      toggleWidget: () => Promise<void>
      getWidgetState: () => Promise<boolean>
      getWidgetCorner: () => Promise<string>
      resizeWidget: (width: number, height: number) => Promise<void>
      setBadge: (count: number) => Promise<void>
      openDetail: (taskId: string) => Promise<void>
      openCreate: () => Promise<void>
      closeDetail: () => Promise<void>
      minimize: () => Promise<void>
      close: () => Promise<void>
      platform: string
    }
  }
}
