import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS } from '../../lib/constants'
import { CommentSection } from '../common/CommentSection'
import type { ExternalClient, Task, TaskComment } from '../../lib/types'
import { ChevronRight, ArrowLeft, Lock, KeyRound, Plus, Clock, Loader2, CheckCircle, XCircle, ClipboardList, AlertTriangle } from 'lucide-react'

interface ExternalRequestPageProps {
  clientSlug: string
}

export function ExternalRequestPage({ clientSlug }: ExternalRequestPageProps) {
  const [client, setClient] = useState<ExternalClient | null>(null)
  const [authenticated, setAuthenticated] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'dashboard' | 'list' | 'create' | 'detail'>('dashboard')
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  useEffect(() => {
    async function fetchClient() {
      const { data } = await supabase
        .from('external_clients')
        .select('*')
        .eq('slug', clientSlug)
        .eq('is_active', true)
        .single()
      if (data) setClient(data as ExternalClient)
      setLoading(false)
    }
    fetchClient()
  }, [clientSlug])

  useEffect(() => {
    if (!authenticated || !client) return
    fetchTasks()

    const channel = supabase
      .channel(`client-tasks-${client.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'tasks',
        filter: `client_id=eq.${client.id}`
      }, () => fetchTasks())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [authenticated, client])

  const fetchTasks = async () => {
    if (!client) return
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: true })
    if (data) setTasks(data as Task[])
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    const { data } = await supabase.rpc('verify_client_password', {
      client_slug: clientSlug,
      password: password,
    })
    if (data) {
      if (client?.must_change_password) {
        setShowChangePassword(true)
      } else {
        setAuthenticated(true)
      }
    } else {
      setAuthError('비밀번호가 올바르지 않습니다')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">페이지를 찾을 수 없습니다</h1>
          <p className="text-sm text-gray-500">유효하지 않은 링크입니다.</p>
        </div>
      </div>
    )
  }

  if (!authenticated && showChangePassword) {
    return (
      <ChangePasswordScreen
        clientSlug={clientSlug}
        clientName={client.name}
        currentPassword={password}
        onChanged={() => {
          setShowChangePassword(false)
          setAuthenticated(true)
          setClient({ ...client, must_change_password: false })
        }}
      />
    )
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-14 sm:w-16 h-14 sm:h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/25">
              <Lock className="w-7 sm:w-8 h-7 sm:h-8 text-white" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">{client.name}</h1>
            <p className="text-sm text-gray-500 mt-1">업무 요청 시스템</p>
            {client.description && (
              <p className="text-xs text-gray-400 mt-2">{client.description}</p>
            )}
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-sm bg-gray-50/50 placeholder:text-gray-300"
                placeholder="비밀번호를 입력하세요"
                required
              />
            </div>
            {authError && (
              <div className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl border border-red-100">
                {authError}
              </div>
            )}
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-md shadow-blue-500/25"
            >
              로그인
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {view !== 'dashboard' && (
              <button
                onClick={() => { setView('dashboard'); setSelectedTask(null) }}
                className="p-1.5 hover:bg-gray-100 rounded-lg shrink-0"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">{client.name}</h1>
              <p className="text-xs text-gray-500">업무 요청</p>
            </div>
          </div>
          {view === 'list' && (
            <button
              onClick={() => setView('create')}
              className="px-3 sm:px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-600 transition-colors shadow-sm shadow-blue-500/20 shrink-0"
            >
              새 요청
            </button>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        {view === 'dashboard' && (
          <ExternalDashboard
            client={client}
            tasks={tasks}
            onViewAll={() => setView('list')}
            onSelectTask={(task) => { setSelectedTask(task); setView('detail') }}
          />
        )}
        {view === 'list' && (
          <ExternalTaskList
            tasks={tasks}
            onSelect={(task) => { setSelectedTask(task); setView('detail') }}
          />
        )}
        {view === 'create' && (
          <ExternalTaskForm
            client={client}
            onSubmitted={() => { setView('dashboard'); fetchTasks() }}
          />
        )}
        {view === 'detail' && selectedTask && (
          <ExternalTaskDetail
            task={selectedTask}
            clientName={client.name}
            onTaskUpdated={fetchTasks}
          />
        )}
      </div>

      {/* Floating action button */}
      {view === 'dashboard' && (
        <button
          onClick={() => setView('create')}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full shadow-lg shadow-blue-500/30 hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center hover:scale-105 active:scale-95 z-20"
          title="새 요청"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  )
}

// --- Sub Components ---

function ExternalDashboard({ client, tasks, onViewAll, onSelectTask }: {
  client: ExternalClient
  tasks: Task[]
  onViewAll: () => void
  onSelectTask: (task: Task) => void
}) {
  const [deptStats, setDeptStats] = useState<{ id: string; name: string; pending: number; processing: number; done: number; total: number; status: 'green' | 'yellow' | 'red'; slaBreachCount: number; slaWarnCount: number }[]>([])

  const deptIds = client.target_dept_ids?.length > 0 ? client.target_dept_ids : (client.target_dept_id ? [client.target_dept_id] : [])

  useEffect(() => {
    const fetchDeptStats = async () => {
      if (deptIds.length === 0) return
      // Fetch departments
      const { data: departments } = await supabase.from('departments').select('id, name, sla_warn_minutes, sla_escalate_minutes').in('id', deptIds).order('name')
      if (!departments) return
      // Fetch ALL tasks for these departments (not just this client's)
      const { data: allDeptTasks } = await supabase.from('tasks').select('id, status, created_at, target_dept_id').in('target_dept_id', deptIds)
      const allTasks = allDeptTasks || []

      const stats = departments.map(dept => {
        const deptTasks = allTasks.filter(t => t.target_dept_id === dept.id)
        const dPending = deptTasks.filter(t => t.status === 'pending').length
        const dProcessing = deptTasks.filter(t => t.status === 'processing' || t.status === 'need_confirm').length
        const dDone = deptTasks.filter(t => t.status === 'done').length
        const total = deptTasks.length

        let status: 'green' | 'yellow' | 'red' = 'green'
        const activeTasks = deptTasks.filter(t => t.status === 'pending' || t.status === 'processing' || t.status === 'need_confirm')
        let slaBreachCount = 0
        let slaWarnCount = 0
        activeTasks.forEach(t => {
          const elapsedMin = (Date.now() - new Date(t.created_at).getTime()) / 60000
          if (dept.sla_escalate_minutes && elapsedMin >= dept.sla_escalate_minutes) slaBreachCount++
          else if (dept.sla_warn_minutes && elapsedMin >= dept.sla_warn_minutes) slaWarnCount++
        })
        if (slaBreachCount > 0) status = 'red'
        else if (slaWarnCount > 0 || dPending > 0) status = 'yellow'

        return { id: dept.id, name: dept.name, pending: dPending, processing: dProcessing, done: dDone, total, status, slaBreachCount, slaWarnCount }
      })
      setDeptStats(stats)
    }
    fetchDeptStats()
  }, [tasks])

  const pending = tasks.filter(t => t.status === 'pending').length
  const processing = tasks.filter(t => t.status === 'processing' || t.status === 'need_confirm').length
  const done = tasks.filter(t => t.status === 'done').length
  const cancelled = tasks.filter(t => t.status === 'cancelled').length

  // Recent tasks (latest 5)
  const recentTasks = [...tasks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)

  const statusConfig = {
    green: { color: 'bg-emerald-500', label: '정상', bg: 'bg-emerald-50 border-emerald-200', ring: 'ring-emerald-500/30' },
    yellow: { color: 'bg-amber-400', label: '주의', bg: 'bg-amber-50 border-amber-200', ring: 'ring-amber-400/30' },
    red: { color: 'bg-red-500', label: '긴급', bg: 'bg-red-50 border-red-200', ring: 'ring-red-500/30' },
  }

  return (
    <div className="space-y-6">
      {/* My Request Summary */}
      <div>
        <h3 className="text-[15px] font-semibold text-slate-700 mb-3">내 요청 현황</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-amber-50 rounded-xl border border-amber-100 px-4 py-3 flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <div>
              <p className="text-[11px] text-amber-600 font-medium">대기</p>
              <p className="text-xl font-bold text-slate-900">{pending}</p>
            </div>
          </div>
          <div className="bg-blue-50 rounded-xl border border-blue-100 px-4 py-3 flex items-center gap-2.5">
            <Loader2 className="w-4 h-4 text-blue-500 shrink-0" />
            <div>
              <p className="text-[11px] text-blue-600 font-medium">처리중</p>
              <p className="text-xl font-bold text-slate-900">{processing}</p>
            </div>
          </div>
          <div className="bg-emerald-50 rounded-xl border border-emerald-100 px-4 py-3 flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <div>
              <p className="text-[11px] text-emerald-600 font-medium">완료</p>
              <p className="text-xl font-bold text-slate-900">{done}</p>
            </div>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-100 px-4 py-3 flex items-center gap-2.5">
            <XCircle className="w-4 h-4 text-red-500 shrink-0" />
            <div>
              <p className="text-[11px] text-red-600 font-medium">반려</p>
              <p className="text-xl font-bold text-slate-900">{cancelled}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Department Status - Traffic Lights */}
      {deptStats.length > 0 && (
        <div>
          <h3 className="text-[15px] font-semibold text-slate-700 mb-3">부서별 처리 현황</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {deptStats.map(dept => {
              const light = statusConfig[dept.status]
              return (
                <div key={dept.id} className={`rounded-xl border p-4 ${light.bg} transition-all`}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className={`w-3.5 h-3.5 rounded-full ${light.color} ring-4 ${light.ring} shrink-0`} />
                    <div className="flex items-center justify-between flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{dept.name}</p>
                      <span className="text-[10px] font-medium text-slate-500 shrink-0 ml-2">{light.label}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {dept.total > 0 && (
                    <div className="flex items-center gap-0.5 h-2 rounded-full overflow-hidden bg-slate-200/60 mb-2.5">
                      {dept.done > 0 && <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(dept.done / dept.total) * 100}%` }} />}
                      {dept.processing > 0 && <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(dept.processing / dept.total) * 100}%` }} />}
                      {dept.pending > 0 && <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(dept.pending / dept.total) * 100}%` }} />}
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="text-amber-600 font-medium">대기 {dept.pending}</span>
                    <span className="text-blue-600 font-medium">처리 {dept.processing}</span>
                    <span className="text-emerald-600 font-medium">완료 {dept.done}</span>
                    {dept.slaBreachCount > 0 && <span className="text-red-600 font-semibold ml-auto">SLA초과 {dept.slaBreachCount}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent Requests */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-semibold text-slate-700">최근 요청</h3>
          {tasks.length > 5 && (
            <button onClick={onViewAll} className="text-xs text-blue-500 font-medium hover:text-blue-600">
              전체보기 ({tasks.length})
            </button>
          )}
        </div>

        {recentTasks.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">아직 요청한 업무가 없습니다.</p>
            <p className="text-xs text-gray-400 mt-1">오른쪽 하단 + 버튼을 눌러 업무를 요청하세요.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
            {recentTasks.map(task => (
              <button
                key={task.id}
                onClick={() => onSelectTask(task)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 active:bg-gray-100"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md ${STATUS_COLORS[task.status]}`}>
                      {STATUS_LABELS[task.status]}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(task.created_at).toLocaleString('ko-KR')}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ExternalTaskList({ tasks, onSelect }: {
  tasks: Task[]
  onSelect: (task: Task) => void
}) {
  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
        <p className="text-sm text-gray-500">아직 요청한 업무가 없습니다.</p>
        <p className="text-xs text-gray-400 mt-1">새 요청 버튼을 눌러 업무를 요청하세요.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
      {tasks.map((task) => (
        <button
          key={task.id}
          onClick={() => onSelect(task)}
          className="w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors flex items-center gap-3 active:bg-gray-100"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md ${STATUS_COLORS[task.status]}`}>
                {STATUS_LABELS[task.status]}
              </span>
              <span className="text-[10px] text-gray-400">
                {new Date(task.created_at).toLocaleString('ko-KR')}
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
        </button>
      ))}
    </div>
  )
}

function ExternalTaskForm({ client, onSubmitted }: {
  client: ExternalClient
  onSubmitted: () => void
}) {
  const deptIds = client.target_dept_ids?.length > 0 ? client.target_dept_ids : (client.target_dept_id ? [client.target_dept_id] : [])
  const hasMultipleDepts = deptIds.length > 1

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState(client.default_category || 'reception')
  const [targetDeptId, setTargetDeptId] = useState(hasMultipleDepts ? '' : (deptIds[0] || ''))
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!hasMultipleDepts) return
    const fetchDepts = async () => {
      const { data } = await supabase.from('departments').select('id, name').in('id', deptIds).order('name')
      if (data) setDepartments(data)
    }
    fetchDepts()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (hasMultipleDepts && !targetDeptId) {
      setError('부서를 선택해주세요')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { error: err } = await supabase.from('tasks').insert({
        title,
        content,
        category,
        priority: 'normal',
        target_dept_id: targetDeptId || deptIds[0],
        client_id: client.id,
        requester_name: client.name,
        status: 'pending',
      } as any)
      if (err) throw err
      onSubmitted()
    } catch (err: any) {
      setError(err.message || '요청 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
      <h2 className="text-base font-bold text-gray-900 mb-4 sm:mb-5">새 업무 요청</h2>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        {hasMultipleDepts && (
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1.5">업무처리 부서</label>
            <select
              value={targetDeptId}
              onChange={(e) => setTargetDeptId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-sm bg-gray-50/50"
            >
              <option value="">부서를 선택하세요</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-1.5">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-sm bg-gray-50/50 placeholder:text-gray-300"
            placeholder="업무 요청 제목"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-1.5">업무 종류</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                className={`px-3.5 py-2 text-xs font-medium rounded-xl border transition-all ${
                  category === key
                    ? 'border-blue-400 bg-blue-50 text-blue-600 shadow-sm shadow-blue-500/10'
                    : 'border-gray-200 text-gray-400 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-1.5">내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none text-sm bg-gray-50/50 placeholder:text-gray-300"
            rows={5}
            placeholder="업무 요청 상세 내용"
            required
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl border border-red-100">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-500/25"
        >
          {loading ? '요청 중...' : '요청하기'}
        </button>
      </form>
    </div>
  )
}

function ExternalTaskDetail({ task, clientName, onTaskUpdated }: {
  task: Task
  clientName: string
  onTaskUpdated: () => void
}) {
  const [comments, setComments] = useState<TaskComment[]>([])
  const [response, setResponse] = useState('')

  useEffect(() => {
    fetchComments()

    const channel = supabase
      .channel(`ext-comments-${task.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'task_comments',
        filter: `task_id=eq.${task.id}`
      }, () => fetchComments())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [task.id])

  const fetchComments = async () => {
    const { data } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', task.id)
      .order('created_at')
    if (data) setComments(data as TaskComment[])
  }

  const handleSendComment = useCallback(async (content: string) => {
    await supabase.from('task_comments').insert({
      task_id: task.id,
      user_id: '00000000-0000-0000-0000-000000000000',
      user_name: clientName,
      content,
    } as any)
  }, [task.id, clientName])

  const handleConfirm = async () => {
    await supabase.from('tasks').update({
      status: 'processing',
      handler_response: response || undefined,
    } as any).eq('id', task.id)
    onTaskUpdated()
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 sm:p-6 space-y-4">
        {/* Status badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-md ${STATUS_COLORS[task.status]}`}>
            {STATUS_LABELS[task.status]}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(task.created_at).toLocaleString('ko-KR')}
          </span>
        </div>

        <h2 className="text-lg font-bold text-gray-900 leading-snug">{task.title}</h2>

        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{task.content}</p>
        </div>

        {task.handler_response && (
          <div className="bg-blue-50/80 rounded-xl p-4 border border-blue-100/60">
            <p className="text-[11px] font-semibold text-blue-600 mb-1.5">처리 응답</p>
            <p className="text-sm text-blue-900 leading-relaxed">{task.handler_response}</p>
          </div>
        )}

        {task.status === 'need_confirm' && (
          <div className="bg-violet-50 rounded-xl p-4 space-y-3 border border-violet-100/60">
            <p className="text-sm font-semibold text-violet-700">담당자가 확인을 요청했습니다</p>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              className="w-full px-4 py-3 text-sm border border-violet-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 resize-none bg-white placeholder:text-gray-300"
              rows={2}
              placeholder="확인 내용을 입력하세요"
            />
            <button
              onClick={handleConfirm}
              className="w-full sm:w-auto px-5 py-2.5 bg-violet-500 text-white text-sm font-semibold rounded-xl hover:bg-violet-600 transition-colors shadow-sm shadow-violet-500/20"
            >
              확인 완료
            </button>
          </div>
        )}

        {/* Comments */}
        <div className="border-t border-gray-100 pt-4">
          <CommentSection
            comments={comments}
            currentUserName={clientName}
            matchByName
            onSendComment={handleSendComment}
          />
        </div>
      </div>
    </div>
  )
}

function ChangePasswordScreen({ clientSlug, clientName, currentPassword, onChanged }: {
  clientSlug: string
  clientName: string
  currentPassword: string
  onChanged: () => void
}) {
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPw.length < 4) {
      setError('비밀번호는 4자 이상이어야 합니다')
      return
    }
    if (newPw !== confirmPw) {
      setError('비밀번호가 일치하지 않습니다')
      return
    }
    if (newPw === currentPassword) {
      setError('기존 비밀번호와 다른 비밀번호를 입력해주세요')
      return
    }

    setLoading(true)
    try {
      const { data } = await supabase.rpc('change_client_password', {
        client_slug: clientSlug,
        old_password: currentPassword,
        new_password: newPw,
      })
      if (data) {
        onChanged()
      } else {
        setError('비밀번호 변경에 실패했습니다')
      }
    } catch {
      setError('비밀번호 변경에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 sm:w-16 h-14 sm:h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/25">
            <KeyRound className="w-7 sm:w-8 h-7 sm:h-8 text-white" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">{clientName}</h1>
          <p className="text-sm text-gray-500 mt-1">비밀번호 변경이 필요합니다</p>
          <p className="text-xs text-gray-400 mt-1">보안을 위해 새 비밀번호를 설정해주세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1.5">새 비밀번호</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 text-sm bg-gray-50/50 placeholder:text-gray-300"
              placeholder="4자 이상 입력"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1.5">새 비밀번호 확인</label>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 text-sm bg-gray-50/50 placeholder:text-gray-300"
              placeholder="비밀번호 재입력"
              required
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition-all shadow-md shadow-amber-500/25"
          >
            {loading ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>
      </div>
    </div>
  )
}
