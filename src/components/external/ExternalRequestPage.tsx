import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS } from '../../lib/constants'
import { CommentSection } from '../common/CommentSection'
import type { ExternalClient, Task, TaskComment } from '../../lib/types'
import { ChevronRight, ArrowLeft, Lock, KeyRound } from 'lucide-react'

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
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list')
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
            {view !== 'list' && (
              <button
                onClick={() => { setView('list'); setSelectedTask(null) }}
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
        {view === 'list' && (
          <ExternalTaskList
            tasks={tasks}
            onSelect={(task) => { setSelectedTask(task); setView('detail') }}
          />
        )}
        {view === 'create' && (
          <ExternalTaskForm
            client={client}
            onSubmitted={() => { setView('list'); fetchTasks() }}
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
    </div>
  )
}

// --- Sub Components ---

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
