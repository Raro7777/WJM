import { useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { useAppStore } from './stores/appStore'
import { FloatingButton } from './components/widget/FloatingButton'
import { ExpandedPanel } from './components/widget/ExpandedPanel'
import { LoginForm } from './components/auth/LoginForm'
import { WebLayout } from './components/web/WebLayout'
import { WebLayoutV2 } from './components/web-v2/WebLayoutV2'
import { WebLoginPage } from './components/web/WebLoginPage'
import { WebLoginPageV2 } from './components/web-v2/WebLoginPageV2'
import { TaskDetailWindow } from './components/tasks/TaskDetailWindow'
import { ExternalRequestPage } from './components/external/ExternalRequestPage'
import { SignupRequestPage } from './components/auth/SignupRequestPage'

const isElectron = !!window.electronAPI
const params = new URLSearchParams(window.location.search)
const viewMode = params.get('view')
const taskId = params.get('taskId')

// Check for external client request page: /request/:slug
const pathParts = window.location.pathname.split('/')
const isExternalRequest = pathParts[1] === 'request' && pathParts[2]
const clientSlug = isExternalRequest ? pathParts[2] : null
const isSignupPage = window.location.pathname === '/signup'

export default function App() {
  const { isAuthenticated } = useAuth()
  const { isExpanded, setExpanded, designVersion } = useAppStore()

  useEffect(() => {
    if (isElectron && !viewMode) {
      window.electronAPI.getWidgetState()
        .then(setExpanded)
        .catch((err: any) => console.error('Failed to get widget state:', err))
    }
  }, [setExpanded])

  // Electron: auto-expand for login (only for main widget window)
  useEffect(() => {
    if (isElectron && !viewMode && !isAuthenticated && !isExpanded) {
      setExpanded(true)
      window.electronAPI?.expandWidget()
    }
  }, [isAuthenticated, isExpanded, setExpanded])

  // --- Signup request page ---
  if (isSignupPage) {
    return <SignupRequestPage onBack={() => { window.location.href = '/' }} />
  }

  // --- External client request page ---
  if (clientSlug) {
    return <ExternalRequestPage clientSlug={clientSlug} />
  }

  // --- Detail window mode (separate Electron window) ---
  if (viewMode === 'detail' && taskId) {
    return <TaskDetailWindow taskId={taskId} isCreateMode={taskId === '__create__'} />
  }

  // --- Web mode ---
  if (!isElectron) {
    if (!isAuthenticated) return designVersion === 'v2' ? <WebLoginPageV2 /> : <WebLoginPage />
    return designVersion === 'v2' ? <WebLayoutV2 /> : <WebLayout />
  }

  // --- Electron widget mode ---
  if (!isAuthenticated) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white rounded-2xl shadow-2xl">
        <LoginForm />
      </div>
    )
  }

  return (
    <div className="w-full h-full">
      {isExpanded ? <ExpandedPanel /> : <FloatingButton />}
    </div>
  )
}
