"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Phone, MessageSquare, ChevronDown } from "lucide-react"
import { StudentFollowup, URGENCY_COLORS, ActionPriority } from "./types"

interface StudentListItemProps {
  student: StudentFollowup
  isSelected: boolean
  isChecked: boolean
  onSelect: () => void
  onCheck: (checked: boolean) => void
  onAction: (action: 'phone' | 'text' | 'kakao') => void
}

const FUNNEL_STAGE_SHORT: Record<string, string> = {
  '신규상담': '신규',
  '테스트예정': '테스트',
  '테스트완료': '완료',
  '등록유도': '유도',
  '등록완료': '등록',
  '재원': '재원',
}

const SCHOOL_TYPE_SHORT: Record<string, string> = {
  '초등학교': '초',
  '중학교': '중',
  '고등학교': '고',
}

export function StudentListItem({
  student,
  isSelected,
  isChecked,
  onSelect,
  onCheck,
  onAction,
}: StudentListItemProps) {
  const priority = student.action_priority as ActionPriority
  const colors = URGENCY_COLORS[priority]
  const days = student.days_since_last_contact ?? 0

  // 학교+학년 표시
  const schoolInfo = student.school_type
    ? `${SCHOOL_TYPE_SHORT[student.school_type] || student.school_type}${student.grade || '?'}`
    : student.grade ? `${student.grade}학년` : ''

  // 퍼널 단계 축약
  const stageLabel = student.funnel_stage
    ? FUNNEL_STAGE_SHORT[student.funnel_stage] || student.funnel_stage
    : '-'

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors border-b",
        colors.bg,
        colors.border,
        isSelected && "ring-2 ring-primary ring-inset"
      )}
      onClick={onSelect}
    >
      {/* 체크박스 */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center"
      >
        <Checkbox
          checked={isChecked}
          onCheckedChange={onCheck}
          className="h-4 w-4"
        />
      </div>

      {/* 우선순위 도트 + D+일수 */}
      <div className="flex items-center gap-1.5 min-w-[60px]">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: colors.dot }}
        />
        <span className={cn("text-xs font-medium", colors.text)}>
          D+{days}
        </span>
      </div>

      {/* 이름 + 학교/학년 + 단계 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{student.name}</span>
          <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
            {stageLabel}
          </Badge>
        </div>
        {schoolInfo && (
          <div className="text-xs text-muted-foreground truncate">
            {schoolInfo}
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      <div onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 gap-1">
              <Phone className="h-3.5 w-3.5" />
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem
              onClick={() => onAction('phone')}
              disabled={!student.parent_phone}
            >
              <Phone className="h-4 w-4 mr-2" />
              전화하기
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onAction('text')}
              disabled={!student.parent_phone}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              문자보내기
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('kakao')}>
              <span className="mr-2">💛</span>
              카톡보내기
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
