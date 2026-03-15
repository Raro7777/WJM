import { useState, useRef, useCallback } from 'react'
import { Paperclip, Upload, File, Image, X, Download } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx']
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif']

interface FileAttachmentProps {
  files: string[]
  onFilesChange: (files: string[]) => void
  readonly?: boolean
  taskId?: string
  /** For create mode: callback to track pending File objects in parent */
  onPendingFilesChange?: (files: globalThis.File[]) => void
  /** For create mode: current pending File objects from parent */
  pendingFilesList?: globalThis.File[]
}

interface UploadProgress {
  fileName: string
  progress: number
}

function getFileExtension(url: string): string {
  const name = url.split('/').pop() || ''
  return name.split('.').pop()?.toLowerCase() || ''
}

function getFileName(url: string): string {
  const parts = url.split('/')
  const lastPart = parts[parts.length - 1] || 'file'
  // Remove timestamp prefix if present (e.g., "1234567890_filename.pdf")
  const decoded = decodeURIComponent(lastPart)
  const underscoreIndex = decoded.indexOf('_')
  if (underscoreIndex > 0 && /^\d+$/.test(decoded.substring(0, underscoreIndex))) {
    return decoded.substring(underscoreIndex + 1)
  }
  return decoded
}

function isImageFile(url: string): boolean {
  return IMAGE_EXTENSIONS.includes(getFileExtension(url))
}

function validateFile(file: globalThis.File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `${file.name}: 파일 크기가 10MB를 초과합니다`
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `${file.name}: 허용되지 않는 파일 형식입니다 (${ALLOWED_EXTENSIONS.join(', ')})`
  }
  return null
}

export function FileAttachment({
  files,
  onFilesChange,
  readonly = false,
  taskId,
  onPendingFilesChange,
  pendingFilesList,
}: FileAttachmentProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = useCallback(async (selectedFiles: globalThis.File[]) => {
    setError('')

    // Validate all files
    for (const file of selectedFiles) {
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }
    }

    if (!taskId) {
      // No task yet - store files as pending via parent callback
      if (onPendingFilesChange && pendingFilesList) {
        onPendingFilesChange([...pendingFilesList, ...selectedFiles])
      }
      const newPseudoUrls = selectedFiles.map(f => `pending:${f.name}`)
      onFilesChange([...files, ...newPseudoUrls])
      return
    }

    // Upload directly to Supabase Storage
    setUploading(true)
    setUploadProgress(selectedFiles.map(f => ({ fileName: f.name, progress: 0 })))

    const newUrls: string[] = []

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      const filePath = `${taskId}/${Date.now()}_${file.name}`

      setUploadProgress(prev =>
        prev.map((p, idx) => idx === i ? { ...p, progress: 30 } : p)
      )

      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(filePath, file)

      if (uploadError) {
        setError(`${file.name} 업로드 실패: ${uploadError.message}`)
        setUploading(false)
        setUploadProgress([])
        return
      }

      setUploadProgress(prev =>
        prev.map((p, idx) => idx === i ? { ...p, progress: 80 } : p)
      )

      const { data: urlData } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(filePath)

      newUrls.push(urlData.publicUrl)

      setUploadProgress(prev =>
        prev.map((p, idx) => idx === i ? { ...p, progress: 100 } : p)
      )
    }

    onFilesChange([...files, ...newUrls])
    setUploading(false)
    setUploadProgress([])
  }, [taskId, files, onFilesChange, onPendingFilesChange, pendingFilesList])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (!selected || selected.length === 0) return
    handleUpload(Array.from(selected))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [handleUpload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      handleUpload(droppedFiles)
    }
  }, [handleUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleRemove = useCallback((index: number) => {
    const url = files[index]
    if (url.startsWith('pending:') && onPendingFilesChange && pendingFilesList) {
      const pendingName = url.replace('pending:', '')
      onPendingFilesChange(pendingFilesList.filter(f => f.name !== pendingName))
    }
    const updated = files.filter((_, i) => i !== index)
    onFilesChange(updated)
  }, [files, onFilesChange, onPendingFilesChange, pendingFilesList])

  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold text-gray-500 tracking-wide flex items-center gap-1.5">
        <Paperclip className="w-3.5 h-3.5" />
        첨부파일
      </label>

      {/* Upload area */}
      {!readonly && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-blue-400 bg-blue-50/50'
              : 'border-gray-200 hover:border-gray-300 bg-gray-50/30'
          }`}
        >
          <Upload className="w-5 h-5 mx-auto mb-1.5 text-gray-400" />
          <p className="text-xs text-gray-400">
            파일을 드래그하거나 클릭하여 업로드
          </p>
          <p className="text-[10px] text-gray-300 mt-1">
            최대 10MB / jpg, png, gif, pdf, doc, docx, xls, xlsx
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Upload progress */}
      {uploadProgress.length > 0 && (
        <div className="space-y-2">
          {uploadProgress.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1">
                <p className="text-[11px] text-gray-500 mb-1 truncate">{p.fileName}</p>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl border border-red-100">
          {error}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((url, index) => {
            const isPending = url.startsWith('pending:')
            const displayName = isPending ? url.replace('pending:', '') : getFileName(url)
            const isImage = isPending
              ? IMAGE_EXTENSIONS.includes(displayName.split('.').pop()?.toLowerCase() || '')
              : isImageFile(url)

            return (
              <div
                key={index}
                className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100 group"
              >
                {isImage ? (
                  <Image className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <File className="w-4 h-4 text-blue-500 shrink-0" />
                )}

                <span className="text-xs text-gray-600 truncate flex-1">
                  {displayName}
                </span>

                {isImage && !isPending && (
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={url}
                      alt={displayName}
                      className="w-8 h-8 rounded object-cover border border-gray-200"
                    />
                  </a>
                )}

                {!isPending && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-gray-200/60 rounded-lg transition-colors"
                    title="다운로드"
                  >
                    <Download className="w-3.5 h-3.5 text-gray-400" />
                  </a>
                )}

                {!readonly && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemove(index)
                    }}
                    className="p-1 hover:bg-red-100 rounded-lg transition-colors"
                    title="삭제"
                  >
                    <X className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {readonly && files.length === 0 && (
        <p className="text-xs text-gray-300">첨부파일 없음</p>
      )}
    </div>
  )
}

/** Upload pending files after task creation and return their public URLs */
export async function uploadPendingFiles(
  taskId: string,
  pendingFiles: globalThis.File[]
): Promise<string[]> {
  const uploadedUrls: string[] = []

  for (const file of pendingFiles) {
    const filePath = `${taskId}/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('task-attachments')
      .upload(filePath, file)

    if (uploadError) {
      console.error(`Failed to upload ${file.name}:`, uploadError)
      continue
    }

    const { data: urlData } = supabase.storage
      .from('task-attachments')
      .getPublicUrl(filePath)

    uploadedUrls.push(urlData.publicUrl)
  }

  return uploadedUrls
}
