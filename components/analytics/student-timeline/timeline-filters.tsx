"use client"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import { Card } from "@/components/ui/card"

interface TimelineFiltersProps {
  statusFilter: string
  setStatusFilter: (value: string) => void
  gradeFilter: string
  setGradeFilter: (value: string) => void
  searchQuery: string
  setSearchQuery: (value: string) => void
  selectedStudent: string
  setSelectedStudent: (value: string) => void
  viewMode: 'month' | 'quarter' | 'semester'
  setViewMode: (value: 'month' | 'quarter' | 'semester') => void
  gradeOptions: string[]
  filteredStudents: Array<{
    id: string
    name: string
    school_type: string
    grade: number
  }>
  onReset: () => void
}

export function TimelineFilters({
  statusFilter,
  setStatusFilter,
  gradeFilter,
  setGradeFilter,
  searchQuery,
  setSearchQuery,
  selectedStudent,
  setSelectedStudent,
  viewMode,
  setViewMode,
  gradeOptions,
  filteredStudents,
  onReset
}: TimelineFiltersProps) {
  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
        {/* 1. 상태 필터 */}
        <div className="space-y-2">
          <Label htmlFor="status-filter" className="text-sm font-medium">상태</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger id="status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="재원">재원</SelectItem>
              <SelectItem value="퇴원">퇴원</SelectItem>
              <SelectItem value="전체">전체</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 2. 학년 필터 */}
        <div className="space-y-2">
          <Label htmlFor="grade-filter" className="text-sm font-medium">학년</Label>
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger id="grade-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {gradeOptions.map(grade => (
                <SelectItem key={grade} value={grade}>
                  {grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 3. 학생 선택 드롭다운 */}
        <div className="space-y-2">
          <Label htmlFor="student-select" className="text-sm font-medium">
            학생 ({filteredStudents.length}명)
          </Label>
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger id="student-select">
              <SelectValue placeholder="학생 선택" />
            </SelectTrigger>
            <SelectContent>
              {filteredStudents.map(student => {
                const schoolTypeShort = student.school_type ? 
                  student.school_type.replace('등학교', '').substring(0, 1) : ''
                return (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name}
                    {student.school_type && student.grade && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({schoolTypeShort}{student.grade})
                      </span>
                    )}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        {/* 4. 학생 검색 */}
        <div className="space-y-2">
          <Label htmlFor="student-search" className="text-sm font-medium">검색</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="student-search"
              type="text"
              placeholder="이름으로 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* 5. 기간 선택 */}
        <div className="space-y-2">
          <Label htmlFor="period-select" className="text-sm font-medium">기간</Label>
          <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
            <SelectTrigger id="period-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">최근 1개월</SelectItem>
              <SelectItem value="quarter">최근 3개월</SelectItem>
              <SelectItem value="semester">최근 6개월</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 필터 초기화 버튼 */}
        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={onReset}
            className="w-full"
          >
            초기화
          </Button>
        </div>
      </div>

      {/* 검색 결과 안내 */}
      {searchQuery && (
        <div className="mt-3 text-sm text-muted-foreground">
          "{searchQuery}" 검색 결과: {filteredStudents.length}명
        </div>
      )}
    </Card>
  )
}