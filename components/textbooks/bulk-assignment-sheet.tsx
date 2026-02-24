"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Search,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { bulkAssignTextbook } from "@/services/textbook-service"

interface BulkAssignmentSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  textbookId: string
  textbookName: string
  textbookPrice: number
  currentStock: number
  onComplete: (assignedCount: number, stockUsed: number) => void
}

interface StudentInfo {
  id: string
  name: string
}

interface ClassInfo {
  id: string
  name: string
}

interface ClassStudentRow {
  student_id: string
  class_id: string
}

interface ClassGroup {
  classId: string | null
  className: string
  students: StudentInfo[]
}

export function BulkAssignmentSheet({
  open,
  onOpenChange,
  textbookId,
  textbookName,
  textbookPrice,
  currentStock,
  onComplete,
}: BulkAssignmentSheetProps) {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [classFilter, setClassFilter] = useState("all")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [alreadyAssignedIds, setAlreadyAssignedIds] = useState<Set<string>>(
    new Set()
  )
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([])
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [allClasses, setAllClasses] = useState<ClassInfo[]>([])

  // 데이터 로딩
  useEffect(() => {
    if (!open) return

    const loadData = async () => {
      setLoading(true)
      setSelectedIds(new Set())
      setSearchTerm("")
      setClassFilter("all")
      setCollapsedGroups(new Set())

      try {
        const [classesRes, classStudentsRes, studentsRes, assignmentsRes] =
          await Promise.all([
            supabase
              .from("classes")
              .select("id, name")
              .eq("is_active", true)
              .order("name"),
            supabase
              .from("class_students")
              .select("student_id, class_id"),
            supabase
              .from("students")
              .select("id, name")
              .eq("status", "재원")
              .eq("is_active", true)
              .order("name"),
            supabase
              .from("textbook_assignments")
              .select("student_id")
              .eq("textbook_id", textbookId)
              .neq("status", "cancelled"),
          ])

        const classes: ClassInfo[] = classesRes.data || []
        const classStudents: ClassStudentRow[] = classStudentsRes.data || []
        const students: StudentInfo[] = studentsRes.data || []
        const assignments = assignmentsRes.data || []

        setAllClasses(classes)
        setAlreadyAssignedIds(
          new Set(assignments.map((a) => a.student_id))
        )

        // 학생을 반별로 그룹핑
        const studentClassMap = new Map<string, string[]>()
        for (const cs of classStudents) {
          const existing = studentClassMap.get(cs.student_id) || []
          studentClassMap.set(cs.student_id, [...existing, cs.class_id])
        }

        const studentMap = new Map(students.map((s) => [s.id, s]))
        const groups: ClassGroup[] = []
        const assignedToClass = new Set<string>()

        for (const cls of classes) {
          const classStudentIds = classStudents
            .filter((cs) => cs.class_id === cls.id)
            .map((cs) => cs.student_id)

          const groupStudents = classStudentIds
            .map((id) => studentMap.get(id))
            .filter((s): s is StudentInfo => !!s)

          if (groupStudents.length > 0) {
            groups.push({
              classId: cls.id,
              className: cls.name,
              students: groupStudents,
            })
            for (const s of groupStudents) {
              assignedToClass.add(s.id)
            }
          }
        }

        // 미배정 학생
        const unassigned = students.filter((s) => !assignedToClass.has(s.id))
        if (unassigned.length > 0) {
          groups.push({
            classId: null,
            className: "미배정",
            students: unassigned,
          })
        }

        setClassGroups(groups)
      } catch (error) {
        console.error("데이터 로드 오류:", error)
        toast.error("데이터를 불러오는 중 오류가 발생했습니다")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [open, textbookId])

  // 필터링된 그룹
  const filteredGroups = useMemo(() => {
    return classGroups
      .filter((group) => {
        if (classFilter === "all") return true
        if (classFilter === "unassigned") return group.classId === null
        return group.classId === classFilter
      })
      .map((group) => {
        if (!searchTerm) return group
        const term = searchTerm.toLowerCase()
        return {
          ...group,
          students: group.students.filter((s) =>
            s.name.toLowerCase().includes(term)
          ),
        }
      })
      .filter((group) => group.students.length > 0)
  }, [classGroups, classFilter, searchTerm])

  // 선택 관련 계산
  const selectedCount = selectedIds.size
  const totalBooks = selectedCount * quantity
  const totalCost = totalBooks * textbookPrice
  const remainingStock = currentStock - totalBooks
  const isOverStock = remainingStock < 0

  // 그룹 전체선택 토글
  const handleGroupToggle = (group: ClassGroup) => {
    const selectableStudents = group.students.filter(
      (s) => !alreadyAssignedIds.has(s.id)
    )
    const allSelected = selectableStudents.every((s) => selectedIds.has(s.id))

    const next = new Set(selectedIds)
    if (allSelected) {
      for (const s of selectableStudents) {
        next.delete(s.id)
      }
    } else {
      for (const s of selectableStudents) {
        next.add(s.id)
      }
    }
    setSelectedIds(next)
  }

  // 개별 학생 토글
  const handleStudentToggle = (studentId: string) => {
    const next = new Set(selectedIds)
    if (next.has(studentId)) {
      next.delete(studentId)
    } else {
      next.add(studentId)
    }
    setSelectedIds(next)
  }

  // 그룹 접기/펼치기
  const handleGroupCollapse = (groupKey: string) => {
    const next = new Set(collapsedGroups)
    if (next.has(groupKey)) {
      next.delete(groupKey)
    } else {
      next.add(groupKey)
    }
    setCollapsedGroups(next)
  }

  // 배부 실행
  const handleSubmit = async () => {
    if (selectedCount === 0) return
    if (isOverStock) return

    setSubmitting(true)
    try {
      const result = await bulkAssignTextbook(supabase, {
        textbookId,
        studentIds: Array.from(selectedIds),
        quantity,
      })

      if (result.success && result.data) {
        const { successCount, failCount, totalStockUsed } = result.data
        if (failCount > 0) {
          toast.warning(
            `${successCount}명 배부 완료, ${failCount}명 실패`
          )
        } else {
          toast.success(`${successCount}명에게 교재를 배부했습니다`)
        }
        onComplete(successCount, totalStockUsed)
        onOpenChange(false)
      } else {
        toast.error(result.error || "배부에 실패했습니다")
      }
    } catch (error) {
      console.error("배부 오류:", error)
      toast.error("오류가 발생했습니다")
    } finally {
      setSubmitting(false)
    }
  }

  const groupKey = (group: ClassGroup) => group.classId || "unassigned"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[480px] flex flex-col">
        <SheetHeader>
          <SheetTitle>교재 배부</SheetTitle>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{textbookName}</span>
            <span className="ml-2">
              (재고: {currentStock}권, 단가: {textbookPrice.toLocaleString()}원)
            </span>
          </div>
        </SheetHeader>

        {/* 필터 영역 */}
        <div className="space-y-3 pt-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">반 필터</Label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {allClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="unassigned">미배정</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-24">
              <Label className="text-xs text-muted-foreground">
                수량(인당)
              </Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                }
                min={1}
                className="h-9 mt-1"
              />
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="학생 이름 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
        </div>

        <Separator className="my-3" />

        {/* 학생 목록 */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              표시할 학생이 없습니다
            </div>
          ) : (
            <div className="space-y-1">
              {filteredGroups.map((group) => {
                const key = groupKey(group)
                const isCollapsed = collapsedGroups.has(key)
                const selectableStudents = group.students.filter(
                  (s) => !alreadyAssignedIds.has(s.id)
                )
                const selectedInGroup = selectableStudents.filter((s) =>
                  selectedIds.has(s.id)
                ).length
                const allSelected =
                  selectableStudents.length > 0 &&
                  selectedInGroup === selectableStudents.length
                const someSelected =
                  selectedInGroup > 0 &&
                  selectedInGroup < selectableStudents.length

                return (
                  <div key={key}>
                    {/* 반 헤더 */}
                    <div className="flex items-center justify-between py-2 px-1">
                      <button
                        className="flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors"
                        onClick={() => handleGroupCollapse(key)}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                        {group.className}
                        <span className="text-muted-foreground font-normal">
                          ({group.students.length}명)
                        </span>
                      </button>
                      {selectableStudents.length > 0 && (
                        <div className="flex items-center gap-2">
                          {selectedInGroup > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {selectedInGroup}명
                            </span>
                          )}
                          <Checkbox
                            checked={
                              allSelected
                                ? true
                                : someSelected
                                ? "indeterminate"
                                : false
                            }
                            onCheckedChange={() => handleGroupToggle(group)}
                            aria-label={`${group.className} 전체선택`}
                          />
                        </div>
                      )}
                    </div>

                    {/* 학생 목록 */}
                    {!isCollapsed && (
                      <div className="pl-6 space-y-0.5">
                        {group.students.map((student) => {
                          const isAssigned = alreadyAssignedIds.has(student.id)
                          const isSelected = selectedIds.has(student.id)

                          return (
                            <label
                              key={student.id}
                              className={`flex items-center justify-between py-1.5 px-2 rounded-md text-sm cursor-pointer transition-colors ${
                                isAssigned
                                  ? "opacity-50 cursor-not-allowed"
                                  : isSelected
                                  ? "bg-blue-50"
                                  : "hover:bg-muted/50"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span>{student.name}</span>
                                {isAssigned && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    배부됨
                                  </Badge>
                                )}
                              </div>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() =>
                                  handleStudentToggle(student.id)
                                }
                                disabled={isAssigned}
                              />
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        <Separator className="my-3" />

        {/* 요약 및 액션 */}
        <SheetFooter className="flex-col gap-3 sm:flex-col">
          <div className="w-full text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">선택</span>
              <span className="font-medium">
                {selectedCount}명 · 총 {totalBooks}권 ·{" "}
                {totalCost.toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">배부 후 잔여 재고</span>
              <span
                className={`font-medium ${
                  isOverStock ? "text-red-600" : "text-green-600"
                }`}
              >
                {remainingStock}권
              </span>
            </div>
            {isOverStock && (
              <div className="flex items-center gap-1.5 text-red-600 text-xs mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                재고가 부족합니다
              </div>
            )}
          </div>
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              취소
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={
                submitting || selectedCount === 0 || isOverStock
              }
            >
              {submitting && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              배부하기
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
