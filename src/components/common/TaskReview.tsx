import { useState } from 'react'
import { Star } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface TaskReviewProps {
  taskId: string
  existingRating: number | null
  existingComment: string | null
  reviewedAt: string | null
  canReview: boolean
  onSubmitted?: () => void
}

export function TaskReview({ taskId, existingRating, existingComment, reviewedAt, canReview, onSubmitted }: TaskReviewProps) {
  const [rating, setRating] = useState(existingRating ?? 0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState(existingComment ?? '')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(existingRating !== null)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          review_rating: rating,
          review_comment: comment || null,
          reviewed_at: new Date().toISOString(),
        } as any)
        .eq('id', taskId)
      if (error) throw error
      setSubmitted(true)
      onSubmitted?.()
    } catch (err) {
      console.error('Review submit error:', err)
    } finally {
      setLoading(false)
    }
  }

  const displayRating = hoverRating || rating

  // Read-only display (already reviewed)
  if (submitted || !canReview) {
    if (existingRating === null && !submitted) return null
    const showRating = submitted ? rating : existingRating!
    const showComment = submitted ? comment : existingComment

    return (
      <div className="bg-amber-50/60 rounded-xl p-4 border border-amber-100/60">
        <p className="text-[11px] font-semibold text-amber-700 mb-2">처리 평가</p>
        <div className="flex items-center gap-1 mb-1.5">
          {[1, 2, 3, 4, 5].map(i => (
            <Star
              key={i}
              className={`w-5 h-5 ${i <= showRating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
            />
          ))}
          <span className="text-sm font-bold text-slate-700 ml-2">{showRating}</span>
        </div>
        {showComment && (
          <p className="text-sm text-slate-600 leading-relaxed mt-2">{showComment}</p>
        )}
        {reviewedAt && (
          <p className="text-[10px] text-slate-400 mt-2">{new Date(reviewedAt).toLocaleString('ko-KR')}</p>
        )}
      </div>
    )
  }

  // Editable form
  return (
    <div className="bg-amber-50/60 rounded-xl p-4 border border-amber-100/60 space-y-3">
      <p className="text-[11px] font-semibold text-amber-700">처리에 대한 평가를 남겨주세요</p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <button
            key={i}
            type="button"
            onClick={() => setRating(i === rating ? 0 : i)}
            onMouseEnter={() => setHoverRating(i)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              className={`w-7 h-7 transition-colors ${
                i <= displayRating
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-slate-200 hover:text-amber-200'
              }`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="text-sm font-bold text-slate-600 ml-2">{rating}점</span>
        )}
      </div>
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        className="w-full px-4 py-3 text-sm border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 resize-none bg-white placeholder:text-slate-300"
        rows={2}
        placeholder="처리에 대한 의견을 남겨주세요 (선택)"
      />
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="px-5 py-2.5 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-colors shadow-sm shadow-amber-500/20"
      >
        {loading ? '제출 중...' : '평가 제출'}
      </button>
    </div>
  )
}
