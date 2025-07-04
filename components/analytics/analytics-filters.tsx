"use client"

import { useState } from "react"
import { Calendar, Users, Filter } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import type { StudentInfo, AnalyticsFilters } from "@/types/analytics"

interface AnalyticsFiltersProps {
  students: StudentInfo[]
  filters: AnalyticsFilters
  onFiltersChange: (filters: AnalyticsFilters) => void
  isLoading?: boolean
}

export function AnalyticsFilters({
  students,
  filters,
  onFiltersChange,
  isLoading = false
}: AnalyticsFiltersProps) {
  // 현재 년도 기준으로 년도 목록 생성
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i)
  
  // 월 목록 생성
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: `${i + 1}월`
  }))

  // 선택된 학생 정보
  const selectedStudent = students.find(s => s.id === filters.studentId)

  const handleYearChange = (year: string) => {
    onFiltersChange({
      ...filters,
      year: parseInt(year)
    })
  }

  const handleMonthChange = (month: string) => {
    onFiltersChange({
      ...filters,
      month: parseInt(month)
    })
  }

  const handleStudentChange = (studentId: string) => {
    onFiltersChange({
      ...filters,
      studentId
    })
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="h-5 w-5" />
          분석 조건 선택
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 년도 선택 */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              년도
            </Label>
            <Select 
              value={filters.year.toString()} 
              onValueChange={handleYearChange}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="년도 선택" />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}년
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 월 선택 */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              월
            </Label>
            <Select 
              value={filters.month.toString()} 
              onValueChange={handleMonthChange}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="월 선택" />
              </SelectTrigger>
              <SelectContent>
                {months.map(month => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 학생 선택 */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              학생
            </Label>
            <Select 
              value={filters.studentId} 
              onValueChange={handleStudentChange}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="학생 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 학생</SelectItem>
                {students.map(student => (
                  <SelectItem key={student.id} value={student.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{student.name}</span>
                      {student.school && (
                        <span className="text-xs text-muted-foreground">
                          {student.school} {student.grade}학년
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </div>

        {/* 선택된 정보 표시 */}
        {selectedStudent && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900 dark:text-blue-100">
                선택된 학생:
              </span>
              <span className="text-blue-800 dark:text-blue-200">
                {selectedStudent.name}
              </span>
              {selectedStudent.department && (
                <span className="text-blue-600 dark:text-blue-400">
                  ({selectedStudent.department})
                </span>
              )}
              {selectedStudent.school && (
                <span className="text-blue-600 dark:text-blue-400">
                  • {selectedStudent.school} {selectedStudent.grade}학년
                </span>
              )}
            </div>
          </div>
        )}

        {/* 전체 학생 선택 시 안내 */}
        {filters.studentId === "all" && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
              <Users className="h-4 w-4" />
              <span>
                전체 학생이 선택되었습니다. 개별 학생을 선택하면 상세 분석을 확인할 수 있습니다.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}