import { useState, useEffect } from 'react'
import { ArrowLeft, CheckCircle, XCircle, PlayCircle, HelpCircle, RotateCcw, UserRoundCog } from 'lucide-react'
import { useTasks } from '../../hooks/useTasks'
import { useComments } from '../../hooks/useComments'
import { useAppStore } from '../../stores/appStore'
import { supabase } from '../../lib/supabase'
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, CATEGORY_LABELS, CATEGORY_COLORS } from '../../lib/constants'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { CommentSection } from '../common/CommentSection'
import { FileAttachment } from '../common/FileAttachment'
import type { Task, Profile } from '../../lib/types'

interface TaskDetailProps {
  task: Task
  onBack: () => void
}

export function TaskDetail({ task, onBack }: TaskDetailProps) {
  const { updateTaskStatus } = useTasks()
  const { comments, addComment } = useComments(task.id)
  const { user } = useAppStore()
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ status: Task['status']; title: string; message: string } | null>(null)
  const [actionError, setActionError] = useState('')
  const [handlers, setHandlers] = useState<Profile[]>([])
  const [showReassign, setShowReassign] = useState(false)
  const [fileUrls, setFileUrls] = useState<string[]>(
    Array.isArray(task.file_urls) ? task.file_urls : []
  )

  const isAdmin = user?.role === 'super_admin' || user?.role === 'site_admin'
  const isHandler = user?.role === 'dept_manager' || user?.role === 'dept_sub_manager' || isAdmin
  const isRequester = user?.id === task.requester_id

  // Handler actions
  const canProcess = isHandler && task.status === 'pending'
  const canComplete = isHandler && task.status === 'processing' && task.handler_id === user?.id
  const canRequestConfirm = isHandler && task.status === 'processing' && task.handler_id === user?.id
  const canCancel = isHandler && (task.status === 'pending' || task.status === 'processing')

  // Requester actions
  const canConfirm = isRequester && task.status === 'need_confirm'

  // Fetch handlers for reassignment (admin only)
  useEffect(() => {
    if (!isAdmin || !showReassign) return
    supabase.from('profiles').select('*')
      .in('role', ['super_admin', 'site_admin', 'dept_manager', 'dept_sub_manager'])
      .then(({ data }) => {
        if (data) setHandlers(data as Profile[])
      })
  }, [isAdmin, showReassign])

  const handleReassign = async (newHandlerId: string) => {
    setActionError('')
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ handler_id: newHandlerId, status: 'processing' } as any)
        .eq('id', task.id)
      if (error) throw error

      // Create notification for new handler
      const newHandler = handlers.find(h => h.id === newHandlerId)
      await supabase.from('notifications').insert({
        user_id: newHandlerId,
        task_id: task.id,
        type: 'reassigned',
        title: '업무 재배정',
        message: `"${task.title}" 업무가 ${user?.name}님으로부터 재배정되었습니다.`,
      } as any)

      setShowReassign(false)
    } catch (err: any) {
      setActionError(err.message || '재배정에 실패했습니다')
    }
  }

  const requestAction = (status: Task['status']) => {
    if (status === 'cancelled') {
      setConfirmAction({
        status,
        title: '업무 반려',
        message: '이 업무를 정말 반려하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
      })
    } else if (status === 'done') {
      setConfirmAction({
        status,
        title: '업무 완료',
        message: '이 업무를 완료 처리하시겠습니까?',
      })
    } else {
      handleAction(status)
    }
  }

  const handleAction = async (status: Task['status']) => {
    setLoading(true)
    setActionError('')
    setConfirmAction(null)
    try {
      await updateTaskStatus(task.id, status, response || undefined)
      if (status === 'done' || status === 'cancelled') {
        onBack()
      }
    } catch (err: any) {
      setActionError(err.message || '상태 변경에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUrlsChange = async (urls: string[]) => {
    setFileUrls(urls)
    // Persist to database (only real URLs, not pending ones)
    const realUrls = urls.filter(u => !u.startsWith('pending:'))
    await supabase
      .from('tasks')
      .update({ file_urls: realUrls } as any)
      .eq('id', task.id)
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
        <button onClick={onBack} className="p-1.5 hover:bg-gray-200/60 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </button>
        <h2 className="text-sm font-semibold text-gray-800">업무 상세</h2>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* Status & Priority & Category */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-md ${STATUS_COLORS[task.status]}`}>
            {STATUS_LABELS[task.status]}
          </span>
          <span className={`px-2.5 py-1 text-[11px] font-medium rounded-md ${PRIORITY_COLORS[task.priority]}`}>
            {PRIORITY_LABELS[task.priority]}
          </span>
          <span className={`px-2.5 py-1 text-[11px] font-medium rounded-md ${CATEGORY_COLORS[task.category] || 'bg-gray-100 text-gray-600'}`}>
            {CATEGORY_LABELS[task.category] || task.category}
          </span>
        </div>

        <h3 className="text-lg font-bold text-gray-900 leading-snug">{task.title}</h3>

        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{task.content}</p>
        </div>

        {/* File attachments */}
        {(fileUrls.length > 0 || isHandler) && (
          <FileAttachment
            files={fileUrls}
            onFilesChange={handleFileUrlsChange}
            readonly={!isHandler}
            taskId={task.id}
          />
        )}

        <div className="text-xs text-gray-400 space-y-1.5 pl-1">
          <p>요청자: <span className="text-gray-600">{task.requester_name || '알 수 없음'}</span></p>
          <p>요청일시: <span className="text-gray-600">{new Date(task.created_at).toLocaleString('ko-KR')}</span></p>
          {task.processed_at && (
            <p>처리일시: <span className="text-gray-600">{new Date(task.processed_at).toLocaleString('ko-KR')}</span></p>
          )}
          {task.confirmed_at && (
            <p>확인일시: <span className="text-gray-600">{new Date(task.confirmed_at).toLocaleString('ko-KR')}</span></p>
          )}
        </div>

        {task.handler_response && (
          <div className="bg-blue-50/80 rounded-xl p-4 border border-blue-100/60">
            <p className="text-[11px] font-semibold text-blue-600 mb-1.5">처리 응답</p>
            <p className="text-sm text-blue-900 leading-relaxed">{task.handler_response}</p>
          </div>
        )}

        {/* Admin: Reassign handler */}
        {isAdmin && task.status !== 'done' && task.status !== 'cancelled' && (
          <div className="pt-3 border-t border-gray-100">
            <button
              onClick={() => setShowReassign(!showReassign)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-500 transition-colors"
            >
              <UserRoundCog className="w-3.5 h-3.5" />
              담당자 변경
            </button>
            {showReassign && (
              <div className="mt-2 space-y-2">
                {handlers.filter(h => h.id !== task.handler_id).map((h) => (
                  <button
                    key={h.id}
                    onClick={() => handleReassign(h.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm border border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-colors text-left"
                  >
                    <div className="w-7 h-7 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center ring-1 ring-blue-500/10">
                      <span className="text-xs font-bold text-blue-600">{h.name?.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{h.name}</p>
                      <p className="text-[10px] text-gray-400">{
                        h.role === 'super_admin' ? '최고관리자' :
                        h.role === 'site_admin' ? '사이트관리자' :
                        h.role === 'dept_manager' ? '부서담당' : '부서부담당'
                      }</p>
                    </div>
                  </button>
                ))}
                {handlers.length === 0 && (
                  <p className="text-xs text-gray-300 py-2 text-center">배정 가능한 담당자가 없습니다</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action buttons for handlers */}
        {isHandler && task.status !== 'done' && task.status !== 'cancelled' && task.status !== 'need_confirm' && (
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none bg-gray-50/50 placeholder:text-gray-300"
              rows={2}
              placeholder="처리 내용을 입력하세요"
            />
            <div className="flex flex-wrap gap-2">
              {canProcess && (
                <button
                  onClick={() => requestAction('processing')}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-500 text-white text-xs font-semibold rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-colors shadow-sm shadow-blue-500/20"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  접수
                </button>
              )}
              {canComplete && (
                <button
                  onClick={() => requestAction('done')}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500 text-white text-xs font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-colors shadow-sm shadow-emerald-500/20"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  완료
                </button>
              )}
              {canRequestConfirm && (
                <button
                  onClick={() => requestAction('need_confirm')}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-violet-500 text-white text-xs font-semibold rounded-xl hover:bg-violet-600 disabled:opacity-50 transition-colors shadow-sm shadow-violet-500/20"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  확인요청
                </button>
              )}
              {canCancel && (
                <button
                  onClick={() => requestAction('cancelled')}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-500 text-white text-xs font-semibold rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors shadow-sm shadow-red-500/20"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  반려
                </button>
              )}
            </div>
          </div>
        )}

        {/* Requester confirmation action */}
        {canConfirm && (
          <div className="space-y-3 pt-4 border-t border-purple-100">
            <div className="bg-violet-50 rounded-xl p-4 border border-violet-100/60">
              <p className="text-[11px] font-semibold text-violet-600 mb-1.5">담당자가 확인을 요청했습니다</p>
              <p className="text-sm text-violet-800 leading-relaxed">내용을 확인하고 응답해주세요.</p>
            </div>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 resize-none bg-gray-50/50 placeholder:text-gray-300"
              rows={2}
              placeholder="확인 내용을 입력하세요"
            />
            <button
              onClick={() => handleAction('processing')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-violet-500 text-white text-xs font-semibold rounded-xl hover:bg-violet-600 disabled:opacity-50 transition-colors shadow-sm shadow-violet-500/20"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              확인 완료 (처리 재개)
            </button>
          </div>
        )}

        {actionError && (
          <div className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl border border-red-100">
            {actionError}
          </div>
        )}

        {/* Comments section */}
        <div className="pt-4 border-t border-gray-100">
          <CommentSection
            comments={comments}
            currentUserId={user?.id}
            onSendComment={addComment}
          />
        </div>
      </div>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.title || ''}
        message={confirmAction?.message || ''}
        confirmLabel={confirmAction?.status === 'cancelled' ? '반려' : '완료'}
        variant={confirmAction?.status === 'cancelled' ? 'danger' : 'info'}
        onConfirm={() => confirmAction && handleAction(confirmAction.status)}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  )
}
