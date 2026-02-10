"use client"

import { useState, useMemo, useCallback } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronRight, CheckCircle2, Loader2, Search, X } from "lucide-react"
import { CLASS_COLORS } from "@/types/tuition-session"

export interface ClassInfo {
  id: string
  name: string
  teacher_id: string | null
  monthly_fee: number | null
  sessions_per_month: number | null
}

export interface TeacherInfo {
  id: string
  name: string
}

export interface StudentInfo {
  id: string
  name: string
  class_id: string
  class_name: string
}

interface ClassGroup {
  classId: string
  className: string
  teacherName: string
  color: string
  students: StudentInfo[]
}

interface SessionPlannerSidebarProps {
  classes: ClassInfo[]
  teachers: TeacherInfo[]
  studentsByClass: Map<string, StudentInfo[]>
  selectedStudentsByClass: Map<string, Set<string>>
  savedKeys: Set<string>
  generatingClassIds: Set<string>
  filterClassId: string | null
  onFilterClassChange: (classId: string | null) => void
  onToggleStudent: (studentId: string, classId: string) => void
  onToggleClass: (classId: string) => void
  collapsedClasses: Set<string>
  onToggleCollapse: (classId: string) => void
}

export function SessionPlannerSidebar({
  classes,
  teachers,
  studentsByClass,
  selectedStudentsByClass,
  savedKeys,
  generatingClassIds,
  filterClassId,
  onFilterClassChange,
  onToggleStudent,
  onToggleClass,
  collapsedClasses,
  onToggleCollapse,
}: SessionPlannerSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const teacherMap = useMemo(
    () => new Map(teachers.map((t) => [t.id, t.name])),
    [teachers]
  )

  const classGroups = useMemo((): ClassGroup[] => {
    const activeClasses = filterClassId
      ? classes.filter((c) => c.id === filterClassId)
      : classes

    const query = searchQuery.trim().toLowerCase()

    return activeClasses
      .filter((cls) => {
        const students = studentsByClass.get(cls.id)
        if (!students || students.length === 0) return false
        if (!query) return true
        // 반 이름이 매칭되면 전체 표시
        if (cls.name.toLowerCase().includes(query)) return true
        // 학생 이름 매칭되면 해당 반도 표시
        return students.some((s) => s.name.toLowerCase().includes(query))
      })
      .map((cls): ClassGroup => {
        const globalIdx = classes.findIndex((c) => c.id === cls.id)
        const allStudents = studentsByClass.get(cls.id) ?? []
        // 검색어가 있고 반 이름이 매칭되지 않으면 학생만 필터링
        const filteredStudents =
          query && !cls.name.toLowerCase().includes(query)
            ? allStudents.filter((s) => s.name.toLowerCase().includes(query))
            : allStudents
        return {
          classId: cls.id,
          className: cls.name,
          teacherName: cls.teacher_id ? teacherMap.get(cls.teacher_id) ?? "" : "",
          color: CLASS_COLORS[globalIdx % CLASS_COLORS.length],
          students: filteredStudents,
        }
      })
  }, [classes, filterClassId, studentsByClass, teacherMap, searchQuery])

  const getClassSelectionState = useCallback(
    (classId: string): "none" | "some" | "all" => {
      const selected = selectedStudentsByClass.get(classId)
      if (!selected || selected.size === 0) return "none"
      const students = studentsByClass.get(classId) ?? []
      if (students.length === 0) return "none"
      if (selected.size === students.length) return "all"
      return "some"
    },
    [studentsByClass, selectedStudentsByClass]
  )

  const totalSelected = useMemo(() => {
    let count = 0
    for (const [, students] of selectedStudentsByClass) {
      count += students.size
    }
    return count
  }, [selectedStudentsByClass])

  const selectedClassCount = useMemo(() => {
    let count = 0
    for (const [, students] of selectedStudentsByClass) {
      if (students.size > 0) count++
    }
    return count
  }, [selectedStudentsByClass])

  return (
    <div className="w-80 border-r border-slate-200 bg-white flex flex-col h-full">
      {/* 헤더 */}
      <div className="p-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">
          학생 선택
        </h3>

        {/* 반 필터 */}
        <Select
          value={filterClassId ?? "all"}
          onValueChange={(v) =>
            onFilterClassChange(v === "all" ? null : v)
          }
        >
          <SelectTrigger className="w-full h-8 text-xs">
            <SelectValue placeholder="전체 반" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 반</SelectItem>
            {classes
              .filter((c) => (studentsByClass.get(c.id)?.length ?? 0) > 0)
              .map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        {/* 검색 */}
        <div className="relative mt-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="반/학생 이름 검색"
            className="h-8 text-xs pl-7 pr-7"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 학생 목록 */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {classGroups.length === 0 && (
            <div className="text-center text-xs text-slate-400 py-8">
              {searchQuery
                ? "검색 결과가 없습니다"
                : "학생이 등록된 반이 없습니다"}
            </div>
          )}

          {classGroups.map((group) => {
            const isCollapsed = collapsedClasses.has(group.classId)
            const selectionState = getClassSelectionState(group.classId)
            const isActiveClass = selectionState !== "none"
            const isGenerating = generatingClassIds.has(group.classId)

            return (
              <div
                key={group.classId}
                className={
                  "rounded-md border " +
                  (isActiveClass
                    ? "border-blue-200 ring-1 ring-blue-100"
                    : "border-slate-100")
                }
              >
                {/* 반 헤더 */}
                <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 rounded-t-md">
                  <button
                    type="button"
                    onClick={() => onToggleCollapse(group.classId)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <Checkbox
                    checked={
                      selectionState === "all"
                        ? true
                        : selectionState === "some"
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={() => onToggleClass(group.classId)}
                    className="h-3.5 w-3.5"
                  />

                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: group.color }}
                  />

                  <span className="text-xs font-medium text-slate-700 truncate flex-1">
                    {group.className}
                  </span>

                  {isGenerating && (
                    <Loader2 className="w-3 h-3 text-blue-500 animate-spin flex-shrink-0" />
                  )}

                  {group.teacherName && (
                    <span className="text-[10px] text-slate-400 flex-shrink-0">
                      {group.teacherName}
                    </span>
                  )}

                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1 py-0 h-4 flex-shrink-0"
                  >
                    {group.students.length}명
                  </Badge>
                </div>

                {/* 학생 목록 */}
                {!isCollapsed && (
                  <div className="px-2 py-1 space-y-0.5">
                    {group.students.map((student) => {
                      const isSelected =
                        selectedStudentsByClass.get(group.classId)?.has(student.id) ?? false
                      const isSaved = savedKeys.has(`${group.classId}:${student.id}`)

                      return (
                        <label
                          key={student.id}
                          className={
                            "flex items-center gap-2 px-1.5 py-1 rounded cursor-pointer transition-colors " +
                            (isSelected
                              ? "bg-blue-50"
                              : "hover:bg-slate-50")
                          }
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() =>
                              onToggleStudent(student.id, group.classId)
                            }
                            className="h-3.5 w-3.5"
                          />
                          <span className="text-xs text-slate-700 flex-1 truncate">
                            {student.name}
                          </span>
                          {isSaved && (
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                          )}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* 하단 요약 */}
      <div className="p-3 border-t border-slate-100 bg-slate-50">
        <div className="text-xs text-slate-500">
          선택: <strong className="text-slate-700">{totalSelected}건</strong>
          {selectedClassCount > 1 && (
            <span className="ml-1 text-slate-400">({selectedClassCount}개 반)</span>
          )}
        </div>
      </div>
    </div>
  )
}
