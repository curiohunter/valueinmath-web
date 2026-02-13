"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useStudentList } from "./hooks/use-student-list"
import { StudentListItemRow } from "./student-list-item"
import type { StudentStatus, Department } from "@/types/student"

interface StudentListPanelProps {
  selectedStudentId: string | null
  onSelectStudent: (studentId: string) => void
}

export function StudentListPanel({ selectedStudentId, onSelectStudent }: StudentListPanelProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StudentStatus | "all">("재원")
  const [departmentFilter, setDepartmentFilter] = useState<Department | "all">("all")

  const { students, isLoading } = useStudentList({
    search,
    statusFilter,
    departmentFilter,
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 space-y-2 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="학생 이름 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StudentStatus | "all")}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              <SelectItem value="재원">재원</SelectItem>
              <SelectItem value="퇴원">퇴원</SelectItem>
              <SelectItem value="휴원">휴원</SelectItem>
              <SelectItem value="미등록">미등록</SelectItem>
              <SelectItem value="신규상담">신규상담</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={departmentFilter}
            onValueChange={(v) => setDepartmentFilter(v as Department | "all")}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="부서" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 부서</SelectItem>
              <SelectItem value="고등관">고등관</SelectItem>
              <SelectItem value="중등관">중등관</SelectItem>
              <SelectItem value="영재관">영재관</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs text-muted-foreground">
          {students.length}명
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              학생이 없습니다
            </div>
          ) : (
            students.map((student) => (
              <StudentListItemRow
                key={student.id}
                student={student}
                isSelected={selectedStudentId === student.id}
                onClick={() => onSelectStudent(student.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
