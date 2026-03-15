import { useState, useEffect, useRef } from 'react'
import { Send } from 'lucide-react'
import type { TaskComment } from '../../lib/types'

interface CommentSectionProps {
  comments: TaskComment[]
  currentUserId?: string
  currentUserName?: string
  onSendComment: (content: string) => Promise<void>
  /** Whether to match by user_name instead of user_id (for external clients) */
  matchByName?: boolean
}

export function CommentSection({
  comments,
  currentUserId,
  currentUserName,
  onSendComment,
  matchByName = false,
}: CommentSectionProps) {
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  const handleSend = async () => {
    const trimmed = comment.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      await onSendComment(trimmed)
      setComment('')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isMe = (c: TaskComment) => {
    if (matchByName) return c.user_name === currentUserName
    return c.user_id === currentUserId
  }

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-3 tracking-wide">
        댓글 ({comments.length})
      </p>

      {comments.length === 0 ? (
        <p className="text-xs text-gray-300 py-4 text-center">아직 댓글이 없습니다</p>
      ) : (
        <div className="space-y-3 mb-4">
          {comments.map((c) => {
            const mine = isMe(c)
            return (
              <div key={c.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%] sm:max-w-[75%]">
                  <p className={`text-[10px] mb-1 ${mine ? 'text-right' : ''} text-gray-400 font-medium`}>
                    {c.user_name}
                  </p>
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                      mine
                        ? 'bg-blue-500 text-white rounded-br-lg'
                        : 'bg-gray-100 text-gray-800 rounded-bl-lg'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{c.content}</p>
                  </div>
                  <p className={`text-[10px] mt-1 ${mine ? 'text-right' : ''} text-gray-300`}>
                    {new Date(c.created_at).toLocaleString('ko-KR', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={commentsEndRef} />
        </div>
      )}

      {/* Comment input */}
      <div className="flex items-end gap-2.5">
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none max-h-20 bg-gray-50/50 placeholder:text-gray-300"
          rows={1}
          placeholder="댓글을 입력하세요..."
        />
        <button
          onClick={handleSend}
          disabled={!comment.trim() || sending}
          className="p-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-40 transition-colors shrink-0 shadow-sm shadow-blue-500/20"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
