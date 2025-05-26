import React from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Teacher {
  id: string
  name: string
  position?: string
}

interface ClassesFiltersProps {
  teachers: Teacher[]
  onOpen: () => void
  teacherFilter: string
  setTeacherFilter: (value: string) => void
  subjectFilter: string
  setSubjectFilter: (value: string) => void
}

export function ClassesFilters({ teachers, onOpen, teacherFilter, setTeacherFilter, subjectFilter, setSubjectFilter }: ClassesFiltersProps) {
  return (
    <div className="flex items-center gap-2 p-4 border-b bg-background">
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
          <SelectItem value="all">과목 전체</SelectItem>
          <SelectItem value="수학">수학</SelectItem>
          <SelectItem value="과학">과학</SelectItem>
        </SelectContent>
      </Select>
      <Button onClick={onOpen}>+ 반 만들기</Button>
    </div>
  )
} 