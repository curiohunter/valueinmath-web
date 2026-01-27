"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, CheckCircle2, XCircle, Eye, EyeOff, Loader2 } from "lucide-react"
import { getStudentsWithCommentStatus } from "@/services/comments"
import { toast } from "sonner"
import type { LearningComment } from "@/types/comments"

interface StudentWithComment {
  id: string
  name: string
  grade: string
  school: string
  status: string
  className?: string
  teacherName?: string
  hasComment: boolean
  comment?: LearningComment
}

interface StudentManagementListProps {
  teacherId?: string
  selectedYear: number
  selectedMonth: number
  selectedStudentId?: string
  onStudentSelect: (student: StudentWithComment) => void
  onYearMonthChange?: (year: number, month: number) => void
  onRefresh?: () => void
  refreshTrigger?: number
}

export function StudentManagementList({
  teacherId,
  selectedYear,
  selectedMonth,
  selectedStudentId,
  onStudentSelect,
  onYearMonthChange,
  onRefresh,
  refreshTrigger,
}: StudentManagementListProps) {
  const [students, setStudents] = useState<StudentWithComment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterClass, setFilterClass] = useState<string>("전체")
  const [filterGrade, setFilterGrade] = useState<string>("전체")
  const [filterStatus, setFilterStatus] = useState<string>("전체")

  // 다중 선택을 위한 상태
  const [selectedCommentIds, setSelectedCommentIds] = useState<Set<string>>(new Set())
  const [isUpdating, setIsUpdating] = useState(false)

  // 학생 목록 로드
  const loadStudents = async () => {
    setLoading(true)
    try {
      const data = await getStudentsWithCommentStatus(
        selectedYear,
        selectedMonth,
        teacherId
      )
      setStudents(data)
      // 새로고침 시 선택 초기화
      setSelectedCommentIds(new Set())
    } catch (error) {
      console.error("학생 목록 로딩 오류:", error)
      toast.error("학생 목록을 불러오는데 실패했습니다.")
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStudents()
  }, [selectedYear, selectedMonth, teacherId, refreshTrigger])

  // 외부에서 새로고침 요청 시
  useEffect(() => {
    if (onRefresh) {
      // onRefresh 함수를 외부에서 호출할 수 있도록 노출
      // 대신 여기서는 year/month 변경 시에만 자동 새로고침
    }
  }, [onRefresh])

  // 고유한 반 목록 (선생님별로 정렬)
  const classList = useMemo(() => {
    // 반 이름과 선생님 이름을 함께 저장
    const classMap = new Map<string, string>()
    students.forEach((s) => {
      if (s.className && !classMap.has(s.className)) {
        classMap.set(s.className, s.teacherName || "")
      }
    })

    // 선생님별로 정렬 후, 같은 선생님 내에서는 반 이름으로 정렬
    const sortedClasses = Array.from(classMap.entries())
      .sort((a, b) => {
        const [classNameA, teacherNameA] = a
        const [classNameB, teacherNameB] = b

        // 선생님 이름으로 먼저 정렬 (가나다순)
        if (teacherNameA !== teacherNameB) {
          return teacherNameA.localeCompare(teacherNameB, 'ko')
        }

        // 같은 선생님이면 반 이름으로 정렬
        return classNameA.localeCompare(classNameB, 'ko')
      })
      .map(([className]) => className)

    return ["전체", ...sortedClasses]
  }, [students])

  // 고유한 학년 목록
  const gradeList = useMemo(() => {
    const grades = new Set<string>()
    students.forEach((s) => {
      if (s.grade) grades.add(s.grade)
    })
    return ["전체", ...Array.from(grades).sort()]
  }, [students])

  // 필터링된 학생 목록
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      // 검색어 필터
      if (searchQuery && !student.name.includes(searchQuery)) {
        return false
      }

      // 반 필터
      if (filterClass !== "전체" && student.className !== filterClass) {
        return false
      }

      // 학년 필터
      if (filterGrade !== "전체" && student.grade !== filterGrade) {
        return false
      }

      // 작성여부 필터
      if (filterStatus === "작성완료" && !student.hasComment) {
        return false
      }
      if (filterStatus === "미작성" && student.hasComment) {
        return false
      }

      return true
    })
  }, [students, searchQuery, filterClass, filterGrade, filterStatus])

  // 코멘트가 있는 학생만 필터링 (선택 가능한 학생)
  const studentsWithComments = useMemo(() => {
    return filteredStudents.filter((s) => s.hasComment && s.comment?.id)
  }, [filteredStudents])

  // 통계
  const stats = useMemo(() => {
    const total = filteredStudents.length
    const completed = filteredStudents.filter((s) => s.hasComment).length
    const pending = total - completed
    return { total, completed, pending }
  }, [filteredStudents])

  // 년도 옵션 생성 (현재 년도 ±1년)
  const currentYear = new Date().getFullYear()
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1]
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)

  // 전체 선택 핸들러
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(studentsWithComments.map((s) => s.comment!.id))
      setSelectedCommentIds(allIds)
    } else {
      setSelectedCommentIds(new Set())
    }
  }

  // 개별 선택 핸들러
  const handleSelectOne = (commentId: string, checked: boolean) => {
    const newSet = new Set(selectedCommentIds)
    if (checked) {
      newSet.add(commentId)
    } else {
      newSet.delete(commentId)
    }
    setSelectedCommentIds(newSet)
  }

  // 전체 선택 여부
  const isAllSelected = studentsWithComments.length > 0 &&
    studentsWithComments.every((s) => selectedCommentIds.has(s.comment!.id))

  // 일부 선택 여부
  const isPartiallySelected = selectedCommentIds.size > 0 && !isAllSelected

  // 일괄 공개/비공개 설정
  const handleBatchVisibility = async (isPublic: boolean) => {
    if (selectedCommentIds.size === 0) {
      toast.error("선택된 코멘트가 없습니다.")
      return
    }

    setIsUpdating(true)
    try {
      const response = await fetch("/api/learning-comments/batch-visibility", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment_ids: Array.from(selectedCommentIds),
          is_public: isPublic,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "공개 설정 변경에 실패했습니다.")
      }

      toast.success(result.message)

      // 데이터 새로고침
      await loadStudents()
      setSelectedCommentIds(new Set())

      // 부모 컴포넌트 새로고침 (우측 패널용)
      if (onRefresh) {
        onRefresh()
      }
    } catch (error: any) {
      console.error("Batch visibility error:", error)
      toast.error(error.message || "공개 설정 변경에 실패했습니다.")
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="space-y-3">
          {/* 상단: 제목과 통계 */}
          <div className="flex items-center justify-between">
            <CardTitle>학생 목록</CardTitle>
            <div className="flex gap-2 text-sm">
              <Badge variant="outline" className="bg-green-50">
                <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                작성: {stats.completed}
              </Badge>
              <Badge variant="outline" className="bg-orange-50">
                <XCircle className="h-3 w-3 mr-1 text-orange-600" />
                미작성: {stats.pending}
              </Badge>
            </div>
          </div>

          {/* 년/월 선택 */}
          <div className="flex items-center gap-2">
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => {
                const year = parseInt(value)
                onYearMonthChange?.(year, selectedMonth)
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}년
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedMonth.toString()}
              onValueChange={(value) => {
                const month = parseInt(value)
                onYearMonthChange?.(selectedYear, month)
              }}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((month) => (
                  <SelectItem key={month} value={month.toString()}>
                    {month}월
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <CardDescription className="ml-2">
              코멘트 작성 현황
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 검색 및 필터 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="학생 이름 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* 반 필터 */}
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger>
              <SelectValue placeholder="반 선택" />
            </SelectTrigger>
            <SelectContent>
              {classList.map((cls) => (
                <SelectItem key={cls} value={cls}>
                  {cls}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 학년 필터 */}
          <Select value={filterGrade} onValueChange={setFilterGrade}>
            <SelectTrigger>
              <SelectValue placeholder="학년 선택" />
            </SelectTrigger>
            <SelectContent>
              {gradeList.map((grade) => (
                <SelectItem key={grade} value={grade}>
                  {grade === "전체" ? "전체" : `${grade}학년`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 작성여부 필터 */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="작성여부" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="전체">전체</SelectItem>
              <SelectItem value="작성완료">작성완료</SelectItem>
              <SelectItem value="미작성">미작성</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 일괄 공개/비공개 버튼 */}
        {selectedCommentIds.size > 0 && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">
              {selectedCommentIds.size}개 선택됨
            </span>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchVisibility(true)}
              disabled={isUpdating}
              className="gap-1"
            >
              {isUpdating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
              공개로 변경
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchVisibility(false)}
              disabled={isUpdating}
              className="gap-1"
            >
              {isUpdating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
              비공개로 변경
            </Button>
          </div>
        )}

        {/* 학생 테이블 */}
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="전체 선택"
                    disabled={studentsWithComments.length === 0}
                    className={isPartiallySelected ? "data-[state=checked]:bg-primary/50" : ""}
                  />
                </TableHead>
                <TableHead className="w-[100px]">이름</TableHead>
                <TableHead className="w-[60px]">학년</TableHead>
                <TableHead className="w-[80px]">반</TableHead>
                <TableHead className="w-[90px]">학교</TableHead>
                <TableHead className="text-center w-[120px]">작성상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    로딩 중...
                  </TableCell>
                </TableRow>
              ) : filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    학생이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student, index) => {
                  const hasComment = student.hasComment && student.comment?.id
                  const isSelected = hasComment && selectedCommentIds.has(student.comment!.id)

                  return (
                    <TableRow
                      key={`${student.id}-${student.className || 'no-class'}-${index}`}
                      className={`cursor-pointer hover:bg-muted/50 ${
                        selectedStudentId === student.id ? "bg-muted" : ""
                      }`}
                      onClick={() => onStudentSelect(student)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {hasComment ? (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              handleSelectOne(student.comment!.id, checked as boolean)
                            }
                            aria-label={`${student.name} 선택`}
                          />
                        ) : (
                          <div className="w-4 h-4" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell className="text-sm">{student.grade}학년</TableCell>
                      <TableCell className="text-sm">{student.className || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate">
                        {student.school}
                      </TableCell>
                      <TableCell className="text-center">
                        {student.hasComment ? (
                          <div className="flex items-center justify-center gap-1">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              작성완료
                            </Badge>
                            {student.comment?.is_public ? (
                              <Eye className="h-3 w-3 text-green-600" title="공개" />
                            ) : (
                              <EyeOff className="h-3 w-3 text-gray-400" title="비공개" />
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            <XCircle className="h-3 w-3 mr-1" />
                            미작성
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* 전체 학생 수 */}
        <div className="text-sm text-muted-foreground text-right">
          전체 {stats.total}명 중 {filteredStudents.length}명 표시
        </div>
      </CardContent>
    </Card>
  )
}
