"use client"

import { useState, useMemo } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, RefreshCw, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StudentListItem } from "./student-list-item"
import { FilterControls } from "./filter-controls"
import { StudentFollowup, ActionPriority, FollowupData } from "./types"
import { toast } from "sonner"

interface StudentListPanelProps {
  data: FollowupData | null
  loading: boolean
  onRefresh: () => void
  selectedStudentId: string | null
  onSelectStudent: (student: StudentFollowup | null) => void
  checkedStudentIds: Set<string>
  onCheckStudent: (studentId: string, checked: boolean) => void
  onCheckAll: (checked: boolean) => void
}

export function StudentListPanel({
  data,
  loading,
  onRefresh,
  selectedStudentId,
  onSelectStudent,
  checkedStudentIds,
  onCheckStudent,
  onCheckAll,
}: StudentListPanelProps) {
  // 필터 상태
  const [selectedStage, setSelectedStage] = useState<string>('all')
  const [selectedPriority, setSelectedPriority] = useState<ActionPriority | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // 단계별 카운트 계산
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    data?.students.forEach((s) => {
      const stage = s.funnel_stage || '미분류'
      counts[stage] = (counts[stage] || 0) + 1
    })
    return counts
  }, [data])

  // 우선순위별 카운트
  const priorityCounts = useMemo(() => {
    return data?.summary || { urgent: 0, high: 0, medium: 0, low: 0 }
  }, [data])

  // 필터링된 학생 목록
  const filteredStudents = useMemo(() => {
    if (!data?.students) return []

    return data.students.filter((s) => {
      // 단계 필터
      if (selectedStage !== 'all' && s.funnel_stage !== selectedStage) {
        return false
      }

      // 우선순위 필터
      if (selectedPriority !== 'all' && s.action_priority !== selectedPriority) {
        return false
      }

      // 검색어 필터
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const nameMatch = s.name.toLowerCase().includes(query)
        const schoolMatch = s.school?.toLowerCase().includes(query)
        if (!nameMatch && !schoolMatch) {
          return false
        }
      }

      return true
    })
  }, [data, selectedStage, selectedPriority, searchQuery])

  // 정렬: action_priority → days_since_last_contact DESC → name ASC
  const sortedStudents = useMemo(() => {
    const priorityOrder: Record<ActionPriority, number> = {
      urgent: 0,
      high: 1,
      medium: 2,
      low: 3,
    }

    return [...filteredStudents].sort((a, b) => {
      // 1. 우선순위
      const priorityDiff = priorityOrder[a.action_priority] - priorityOrder[b.action_priority]
      if (priorityDiff !== 0) return priorityDiff

      // 2. 경과일 (오래된 순)
      const daysA = a.days_since_last_contact ?? 0
      const daysB = b.days_since_last_contact ?? 0
      if (daysB !== daysA) return daysB - daysA

      // 3. 이름 가나다순
      return a.name.localeCompare(b.name, 'ko')
    })
  }, [filteredStudents])

  // 전화하기 액션
  const handleAction = (student: StudentFollowup, action: 'phone' | 'text' | 'kakao') => {
    const phone = student.parent_phone || student.student_phone

    if (action === 'phone' && phone) {
      window.location.href = `tel:${phone}`
    } else if (action === 'text' && phone) {
      window.location.href = `sms:${phone}`
    } else if (action === 'kakao') {
      toast.info('카카오톡 연동은 추후 지원 예정입니다.')
    } else {
      toast.error('연락처가 없습니다.')
    }
  }

  // 전체 선택 여부
  const allChecked = filteredStudents.length > 0 &&
    filteredStudents.every((s) => checkedStudentIds.has(s.id))
  const someChecked = filteredStudents.some((s) => checkedStudentIds.has(s.id))

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">
            팔로업 대상
            <span className="ml-1 text-muted-foreground">
              ({sortedStudents.length}명)
            </span>
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="h-7 px-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* 필터 영역 */}
      <div className="px-4 pt-3">
        <FilterControls
          selectedStage={selectedStage}
          onStageChange={setSelectedStage}
          stageCounts={stageCounts}
          selectedPriority={selectedPriority}
          onPriorityChange={setSelectedPriority}
          priorityCounts={priorityCounts}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* 전체 선택 바 */}
      {filteredStudents.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground border-b">
          <input
            type="checkbox"
            checked={allChecked}
            ref={(el) => {
              if (el) el.indeterminate = someChecked && !allChecked
            }}
            onChange={(e) => onCheckAll(e.target.checked)}
            className="h-3.5 w-3.5 rounded"
          />
          <span>{allChecked ? '전체 해제' : '전체 선택'}</span>
          {checkedStudentIds.size > 0 && (
            <span className="ml-auto text-primary font-medium">
              {checkedStudentIds.size}명 선택됨
            </span>
          )}
        </div>
      )}

      {/* 학생 리스트 */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sortedStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm">팔로업이 필요한 학생이 없습니다</p>
          </div>
        ) : (
          <div>
            {sortedStudents.map((student) => (
              <StudentListItem
                key={student.id}
                student={student}
                isSelected={selectedStudentId === student.id}
                isChecked={checkedStudentIds.has(student.id)}
                onSelect={() => onSelectStudent(student)}
                onCheck={(checked) => onCheckStudent(student.id, checked)}
                onAction={(action) => handleAction(student, action)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
