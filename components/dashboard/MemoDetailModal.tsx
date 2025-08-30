'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

interface MemoDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  content: string | null
}

export function MemoDetailModal({
  open,
  onOpenChange,
  title = "메모",
  content
}: MemoDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            상세 내용을 확인하세요
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[400px] w-full rounded-md border p-4">
          <div className="whitespace-pre-wrap text-sm">
            {content || '메모가 없습니다.'}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}