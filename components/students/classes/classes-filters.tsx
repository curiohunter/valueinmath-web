import React from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Printer, Search, Check, X } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Teacher {
  id: string
  name: string
  position?: string
}

interface ClassesFiltersProps {
  teachers: Teacher[]
  onOpen: () => void
  onPrint?: () => void
  teacherFilter: string[]
  setTeacherFilter: (value: string[]) => void
  subjectFilter: string
  setSubjectFilter: (value: string) => void
  studentSearch: string
  setStudentSearch: (value: string) => void
}

export function ClassesFilters({ teachers, onOpen, onPrint, teacherFilter, setTeacherFilter, subjectFilter, setSubjectFilter, studentSearch, setStudentSearch }: ClassesFiltersProps) {
  const handleTeacherToggle = (teacherId: string) => {
    if (teacherFilter.includes(teacherId)) {
      setTeacherFilter(teacherFilter.filter(id => id !== teacherId))
    } else {
      setTeacherFilter([...teacherFilter, teacherId])
    }
  }

  const clearTeacherFilter = () => {
    setTeacherFilter([])
  }

  const getTeacherFilterLabel = () => {
    if (teacherFilter.length === 0) return "선생님 전체"
    if (teacherFilter.length === 1) {
      const teacher = teachers.find(t => t.id === teacherFilter[0])
      return teacher?.name || "1명 선택"
    }
    return `${teacherFilter.length}명 선택`
  }

  return (
    <div className="flex items-center gap-2 px-6 py-4 border-b bg-background flex-wrap">
      {/* 선생님 다중 선택 */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-36 justify-between font-normal",
              teacherFilter.length > 0 && "border-blue-500 bg-blue-50"
            )}
          >
            <span className="truncate">{getTeacherFilterLabel()}</span>
            {teacherFilter.length > 0 ? (
              <X
                className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  clearTeacherFilter()
                }}
              />
            ) : (
              <Search className="h-4 w-4 shrink-0 opacity-50" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 py-1.5 text-xs text-gray-500">
              <span>선생님 선택</span>
              {teacherFilter.length > 0 && (
                <button
                  onClick={clearTeacherFilter}
                  className="text-blue-500 hover:text-blue-700"
                >
                  전체 해제
                </button>
              )}
            </div>
            <div className="max-h-60 overflow-y-auto">
              {teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className={cn(
                    "flex items-center gap-2 px-2 py-2 rounded cursor-pointer hover:bg-gray-100",
                    teacherFilter.includes(teacher.id) && "bg-blue-50"
                  )}
                  onClick={() => handleTeacherToggle(teacher.id)}
                >
                  <Checkbox
                    checked={teacherFilter.includes(teacher.id)}
                    onCheckedChange={() => handleTeacherToggle(teacher.id)}
                  />
                  <span className="text-sm">{teacher.name}</span>
                  {teacher.position && (
                    <span className="text-xs text-gray-400">({teacher.position})</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* 선택된 선생님 뱃지 표시 */}
      {teacherFilter.length > 0 && teacherFilter.length <= 3 && (
        <div className="flex items-center gap-1">
          {teacherFilter.map(id => {
            const teacher = teachers.find(t => t.id === id)
            return teacher ? (
              <Badge
                key={id}
                variant="secondary"
                className="text-xs cursor-pointer hover:bg-gray-200"
                onClick={() => handleTeacherToggle(id)}
              >
                {teacher.name}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ) : null
          })}
        </div>
      )}

      <Select value={subjectFilter} onValueChange={setSubjectFilter}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="과목 전체" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체</SelectItem>
          <SelectItem value="regular">정규전체</SelectItem>
          <SelectItem value="special">특강전체</SelectItem>
          <SelectItem value="수학">수학</SelectItem>
          <SelectItem value="과학">과학</SelectItem>
          <SelectItem value="수학특강">수학특강</SelectItem>
          <SelectItem value="과학특강">과학특강</SelectItem>
        </SelectContent>
      </Select>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="학생 이름 검색"
          value={studentSearch}
          onChange={(e) => setStudentSearch(e.target.value)}
          className="w-40 pl-9"
        />
      </div>
      <Button onClick={onOpen}>+ 반 만들기</Button>
      {onPrint && (
        <Button
          onClick={onPrint}
          variant="outline"
          className="ml-auto"
        >
          <Printer className="w-4 h-4 mr-2" />
          인쇄
        </Button>
      )}
    </div>
  )
}
