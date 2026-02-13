"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { StudentListItem } from "./hooks/use-student-list"

const STATUS_COLORS: Record<string, string> = {
  "재원": "bg-green-50 text-green-700 border-green-200",
  "퇴원": "bg-gray-50 text-gray-500 border-gray-200",
  "휴원": "bg-yellow-50 text-yellow-700 border-yellow-200",
  "미등록": "bg-blue-50 text-blue-700 border-blue-200",
  "신규상담": "bg-purple-50 text-purple-700 border-purple-200",
}

const DEPARTMENT_COLORS: Record<string, string> = {
  "고등관": "bg-rose-50 text-rose-700 border-rose-200",
  "중등관": "bg-sky-50 text-sky-700 border-sky-200",
  "영재관": "bg-amber-50 text-amber-700 border-amber-200",
}

interface StudentListItemProps {
  student: StudentListItem
  isSelected: boolean
  onClick: () => void
}

export function StudentListItemRow({ student, isSelected, onClick }: StudentListItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-md transition-colors",
        isSelected
          ? "bg-primary/10 border border-primary/20"
          : "hover:bg-muted/50 border border-transparent"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{student.name}</span>
          {student.grade && (
            <span className="text-xs text-muted-foreground shrink-0">
              {student.grade}학년
            </span>
          )}
        </div>
        {student.school && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {student.school}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Badge
          variant="outline"
          className={cn("text-[10px] px-1.5 py-0", STATUS_COLORS[student.status] || "")}
        >
          {student.status}
        </Badge>
        {student.department && (
          <Badge
            variant="outline"
            className={cn("text-[10px] px-1.5 py-0", DEPARTMENT_COLORS[student.department] || "")}
          >
            {student.department}
          </Badge>
        )}
      </div>
    </button>
  )
}
