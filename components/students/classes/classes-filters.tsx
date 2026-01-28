import React from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Printer, Search } from "lucide-react"

interface Teacher {
  id: string
  name: string
  position?: string
}

interface ClassesFiltersProps {
  teachers: Teacher[]
  onOpen: () => void
  onPrint?: () => void
  teacherFilter: string
  setTeacherFilter: (value: string) => void
  subjectFilter: string
  setSubjectFilter: (value: string) => void
  studentSearch: string
  setStudentSearch: (value: string) => void
}

export function ClassesFilters({ teachers, onOpen, onPrint, teacherFilter, setTeacherFilter, subjectFilter, setSubjectFilter, studentSearch, setStudentSearch }: ClassesFiltersProps) {
  return (
    <div className="flex items-center gap-2 px-6 py-4 border-b bg-background">
      <Select value={teacherFilter} onValueChange={setTeacherFilter}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="선생님" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">선생님</SelectItem>
          {teachers.map((t) => (
            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
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