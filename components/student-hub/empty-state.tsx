"use client"

import { Users } from "lucide-react"

export function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full min-h-[60vh]">
      <div className="text-center space-y-3">
        <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
        <p className="text-muted-foreground font-medium">학생을 선택해주세요</p>
        <p className="text-sm text-muted-foreground">
          좌측 목록에서 학생을 클릭하면 상세 정보가 표시됩니다
        </p>
      </div>
    </div>
  )
}
