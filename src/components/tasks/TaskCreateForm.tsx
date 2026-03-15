import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useTasks } from '../../hooks/useTasks'
import { supabase } from '../../lib/supabase'
import { CATEGORY_LABELS, PRIORITY_LABELS } from '../../lib/constants'
import { FileAttachment, uploadPendingFiles } from '../common/FileAttachment'
import type { Department, Task } from '../../lib/types'

const TITLE_MAX = 100
const CONTENT_MAX = 2000

interface TaskCreateFormProps {
  onBack: () => void
}

export function TaskCreateForm({ onBack }: TaskCreateFormProps) {
  const { createTask } = useTasks()
  const [departments, setDepartments] = useState<Department[]>([])
  const [deptLoading, setDeptLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [targetDeptId, setTargetDeptId] = useState('')
  const [category, setCategory] = useState('general')
  const [priority, setPriority] = useState<Task['priority']>('normal')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fileUrls, setFileUrls] = useState<string[]>([])
  const [pendingFiles, setPendingFiles] = useState<globalThis.File[]>([])


  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const { data, error } = await supabase.from('departments').select('*')
        if (error) {
          console.error('Failed to fetch departments:', error)
          setError('부서 목록을 불러오는데 실패했습니다')
        } else if (data) {
          setDepartments(data as Department[])
        }
      } catch (err) {
        console.error('Departments fetch error:', err)
        setError('부서 목록을 불러오는데 실패했습니다')
      } finally {
        setDeptLoading(false)
      }
    }
    fetchDepts()
  }, [])

  const validate = (): string | null => {
    if (!title.trim()) return '제목을 입력해주세요'
    if (title.length > TITLE_MAX) return `제목은 ${TITLE_MAX}자 이내로 입력해주세요`
    if (!content.trim()) return '내용을 입력해주세요'
    if (content.length > CONTENT_MAX) return `내용은 ${CONTENT_MAX}자 이내로 입력해주세요`
    if (!targetDeptId) return '처리 부서를 선택해주세요'
    return null
  }

  const handleFilesChange = (urls: string[]) => {
    setFileUrls(urls)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    setLoading(true)
    try {
      const result = await createTask({ title, content, target_dept_id: targetDeptId, category, priority })

      // Upload pending files if any
      if (result?.id && pendingFiles.length > 0) {
        const uploadedUrls = await uploadPendingFiles(result.id, pendingFiles)
        if (uploadedUrls.length > 0) {
          await supabase
            .from('tasks')
            .update({ file_urls: uploadedUrls } as any)
            .eq('id', result.id)
        }
      }

      onBack()
    } catch (err: any) {
      setError(err.message || '요청 생성에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
        <button onClick={onBack} className="p-1.5 hover:bg-gray-200/60 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </button>
        <h2 className="text-sm font-semibold text-gray-800">새 업무 요청</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-500 tracking-wide">제목</label>
            <span className={`text-[10px] ${title.length > TITLE_MAX ? 'text-red-500 font-semibold' : 'text-gray-300'}`}>
              {title.length}/{TITLE_MAX}
            </span>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={TITLE_MAX + 10}
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50/50 placeholder:text-gray-300"
            placeholder="업무 요청 제목"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-500 tracking-wide">내용</label>
            <span className={`text-[10px] ${content.length > CONTENT_MAX ? 'text-red-500 font-semibold' : 'text-gray-300'}`}>
              {content.length}/{CONTENT_MAX}
            </span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={CONTENT_MAX + 50}
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none bg-gray-50/50 placeholder:text-gray-300"
            rows={4}
            placeholder="업무 요청 상세 내용을 입력하세요"
            required
          />
        </div>

        <FileAttachment
          files={fileUrls}
          onFilesChange={handleFilesChange}
          onPendingFilesChange={setPendingFiles}
          pendingFilesList={pendingFiles}
        />

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-2 tracking-wide">처리 부서</label>
          <select
            value={targetDeptId}
            onChange={(e) => setTargetDeptId(e.target.value)}
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50/50"
            disabled={deptLoading}
          >
            <option value="">{deptLoading ? '부서 불러오는 중...' : '부서를 선택하세요'}</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-2 tracking-wide">업무 종류</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                className={`px-4 py-2 text-xs font-medium rounded-xl border transition-all ${
                  category === key
                    ? 'border-blue-400 bg-blue-50 text-blue-600 shadow-sm shadow-blue-500/10'
                    : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-2 tracking-wide">우선순위</label>
          <div className="flex gap-2">
            {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPriority(key)}
                className={`flex-1 py-2 text-xs font-medium rounded-xl border transition-all ${
                  priority === key
                    ? 'border-blue-400 bg-blue-50 text-blue-600 shadow-sm shadow-blue-500/10'
                    : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl border border-red-100">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-colors shadow-sm shadow-blue-500/20"
        >
          {loading ? '요청 중...' : '요청하기'}
        </button>
      </form>
    </div>
  )
}
