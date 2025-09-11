"use client"

import { useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"

interface NoteModalProps {
  isOpen: boolean
  value: string
  onValueChange: (value: string) => void
  onSave: () => void
  onClose: () => void
}

export function NoteModal({ 
  isOpen, 
  value, 
  onValueChange, 
  onSave, 
  onClose 
}: NoteModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-[400px] max-w-full">
        <div className="mb-4 font-semibold text-lg">특이사항 입력</div>
        <input
          ref={inputRef}
          className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={value}
          onChange={e => onValueChange(e.target.value)}
          placeholder="특이사항을 입력하세요"
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button variant="default" onClick={onSave}>저장</Button>
        </div>
      </div>
    </div>
  )
}