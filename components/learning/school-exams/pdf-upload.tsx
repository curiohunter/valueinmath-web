"use client"

import { useCallback, useState } from "react"
import { Upload, File, X, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface PdfUploadProps {
  value?: File | null
  onChange: (file: File | null) => void
  maxSize?: number // in MB
  disabled?: boolean
}

export function PdfUpload({ value, onChange, maxSize = 5, disabled = false }: PdfUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (file.type !== "application/pdf") {
      return "PDF 파일만 업로드 가능합니다"
    }

    // Check file size (convert MB to bytes)
    const maxSizeBytes = maxSize * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return `파일 크기는 ${maxSize}MB 이하여야 합니다`
    }

    return null
  }, [maxSize])

  const handleFile = useCallback((file: File) => {
    const validationError = validateFile(file)

    if (validationError) {
      setError(validationError)
      onChange(null)
      return
    }

    setError(null)
    onChange(file)
  }, [onChange, validateFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (disabled) return

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        handleFile(files[0])
      }
    },
    [disabled, handleFile]
  )

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }, [handleFile])

  const handleRemove = useCallback(() => {
    onChange(null)
    setError(null)
  }, [onChange])

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }, [])

  return (
    <div className="space-y-2">
      {!value ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative border-2 border-dashed rounded-lg p-8 transition-colors",
            isDragging && !disabled && "border-primary bg-primary/5",
            !isDragging && !disabled && "border-muted-foreground/25 hover:border-muted-foreground/50",
            disabled && "opacity-50 cursor-not-allowed",
            !disabled && "cursor-pointer"
          )}
        >
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileInput}
            disabled={disabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />

          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <div className={cn(
              "p-3 rounded-full",
              isDragging ? "bg-primary/10" : "bg-muted"
            )}>
              <Upload className={cn(
                "w-8 h-8",
                isDragging ? "text-primary" : "text-muted-foreground"
              )} />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">
                {isDragging ? "파일을 놓아주세요" : "PDF 파일을 드래그하거나 클릭하여 선택"}
              </p>
              <p className="text-xs text-muted-foreground">
                최대 {maxSize}MB
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-muted/50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="p-2 bg-background rounded">
                <File className="w-5 h-5 text-red-600" />
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-medium truncate">
                  {value.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(value.size)}
                </p>
              </div>
            </div>

            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="p-1 hover:bg-background rounded transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
