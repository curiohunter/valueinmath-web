"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { toast } from "sonner"
import { Eye, EyeOff, Save, FileEdit, FilePlus, ChevronDown, ChevronUp, Calendar, ClipboardList, FileText, Users, Calculator, BookOpen, GraduationCap } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

// 출석 상태 라벨
const attendanceLabels: Record<number, string> = {
  5: "출석",
  4: "지각",
  3: "조퇴",
  2: "보강",
  1: "결석"
}

// 숙제 점수 라벨
const homeworkLabels: Record<number, string> = {
  5: "100% 마무리",
  4: "90% 이상",
  3: "추가 추적 필요",
  2: "보강필요",
  1: "결석"
}

// 집중도 점수 라벨
const focusLabels: Record<number, string> = {
  5: "매우 열의있음",
  4: "대체로 잘참여",
  3: "산만하나 진행가능",
  2: "조치필요",
  1: "결석"
}

const commentFormSchema = z.object({
  content: z
    .string()
    .min(10, "코멘트 내용을 10자 이상 입력해주세요.")
    .max(2000, "코멘트 내용은 2000자 이내로 작성해주세요."),
})

type CommentFormData = z.infer<typeof commentFormSchema>

interface StudentWithComment {
  id: string
  name: string
  grade: string
  school: string
  className?: string
  hasComment: boolean
  comment?: {
    id: string
    content: string
    created_at: string
    updated_at: string
  }
}

interface StudentCommentEditorProps {
  student: StudentWithComment | null
  year: number
  month: number
  onSaveSuccess: () => void
  onRequestNextStudent?: () => void
}

export function StudentCommentEditor({
  student,
  year,
  month,
  onSaveSuccess,
  onRequestNextStudent,
}: StudentCommentEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [learningDataOpen, setLearningDataOpen] = useState(true)

  // 학습 상황 데이터
  const [studyLogs, setStudyLogs] = useState<any[]>([])
  const [testLogs, setTestLogs] = useState<any[]>([])
  const [consultations, setConsultations] = useState<any[]>([])
  const [makeupClasses, setMakeupClasses] = useState<any[]>([])
  const [mathflatRecords, setMathflatRecords] = useState<any[]>([])
  const [loadingLearningData, setLoadingLearningData] = useState(false)

  // 각 섹션 표시 상태 (카드 클릭으로 토글)
  const [showStudyLogs, setShowStudyLogs] = useState(false)
  const [showTestLogs, setShowTestLogs] = useState(false)
  const [showConsultations, setShowConsultations] = useState(false)
  const [showMakeupClasses, setShowMakeupClasses] = useState(false)
  const [showMathflatRecords, setShowMathflatRecords] = useState(false)

  const form = useForm<CommentFormData>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: {
      content: "",
    },
  })

  // 학생 선택 시 또는 코멘트 변경 시 폼 업데이트
  useEffect(() => {
    if (student) {
      form.reset({
        content: student.comment?.content || "",
      })
    }
  }, [student?.id, student?.comment?.id, form])

  // 학습 상황 데이터 로드
  useEffect(() => {
    if (!student) {
      setStudyLogs([])
      setTestLogs([])
      setConsultations([])
      setMakeupClasses([])
      setMathflatRecords([])
      return
    }

    const loadLearningData = async () => {
      setLoadingLearningData(true)
      const supabase = createClient()

      try {
        // 로컬 시간대로 날짜 포맷 (타임존 문제 방지)
        const formatDate = (date: Date) => {
          const y = date.getFullYear()
          const m = String(date.getMonth() + 1).padStart(2, '0')
          const d = String(date.getDate()).padStart(2, '0')
          return `${y}-${m}-${d}`
        }

        // 해당 년/월의 시작일과 종료일 계산
        const startDate = formatDate(new Date(year, month - 1, 1))
        const lastDay = new Date(year, month, 0).getDate()
        const endDate = formatDate(new Date(year, month - 1, lastDay))

        // 병렬로 모든 데이터 조회
        const [studyLogsRes, testLogsRes, consultationsRes, makeupClassesRes, mathflatRes] = await Promise.all([
          // study_logs
          supabase
            .from('study_logs')
            .select('*')
            .eq('student_id', student.id)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: false }),

          // test_logs
          supabase
            .from('test_logs')
            .select('*')
            .eq('student_id', student.id)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: false }),

          // consultations
          supabase
            .from('consultations')
            .select('*')
            .eq('student_id', student.id)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: false }),

          // makeup_classes
          supabase
            .from('makeup_classes')
            .select('*')
            .eq('student_id', student.id)
            .gte('absence_date', startDate)
            .lte('absence_date', endDate)
            .order('absence_date', { ascending: false }),

          // mathflat_records
          supabase
            .from('mathflat_records')
            .select('*')
            .eq('student_id', student.id)
            .gte('event_date', startDate)
            .lte('event_date', endDate)
            .order('event_date', { ascending: false }),
        ])

        setStudyLogs(studyLogsRes.data || [])
        setTestLogs(testLogsRes.data || [])
        setConsultations(consultationsRes.data || [])
        setMakeupClasses(makeupClassesRes.data || [])
        setMathflatRecords(mathflatRes.data || [])
      } catch (error) {
        toast.error('학습 상황을 불러오는데 실패했습니다.')
      } finally {
        setLoadingLearningData(false)
      }
    }

    loadLearningData()
  }, [student?.id, year, month])

  const onSubmit = async (data: CommentFormData) => {
    if (!student) {
      toast.error("학생을 선택해주세요.")
      return
    }

    setIsSubmitting(true)

    try {
      const endpoint = student.hasComment
        ? "/api/learning-comments"
        : "/api/learning-comments"

      const method = student.hasComment ? "PUT" : "POST"

      const body = student.hasComment
        ? {
            id: student.comment!.id,
            content: data.content,
          }
        : {
            student_id: student.id,
            year,
            month,
            content: data.content,
          }

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "학습 코멘트 저장에 실패했습니다.")
      }

      toast.success(
        student.hasComment
          ? "학습 코멘트가 수정되었습니다."
          : "학습 코멘트가 작성되었습니다."
      )

      // 부모 컴포넌트에 저장 성공 알림
      onSaveSuccess()

      // 신규 작성이고 다음 학생 요청 함수가 있으면 호출
      if (!student.hasComment && onRequestNextStudent) {
        onRequestNextStudent()
      }
    } catch (error: any) {
      toast.error(error.message || "학습 코멘트 저장에 실패했습니다.")
      console.error("Submit comment error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const contentLength = form.watch("content")?.length || 0

  // 학생이 선택되지 않은 경우
  if (!student) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>코멘트 작성</CardTitle>
          <CardDescription>
            학생을 선택하면 코멘트를 작성할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            좌측에서 학생을 선택해주세요
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {student.hasComment ? (
                <>
                  <FileEdit className="h-5 w-5" />
                  코멘트 수정
                </>
              ) : (
                <>
                  <FilePlus className="h-5 w-5" />
                  코멘트 작성
                </>
              )}
            </CardTitle>
            <CardDescription>
              {year}년 {month}월 학습 코멘트
            </CardDescription>
          </div>
          <Badge variant={student.hasComment ? "default" : "secondary"}>
            {student.hasComment ? "작성완료" : "미작성"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {/* 학생 정보 */}
        <div className="mb-4 p-4 bg-muted/50 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">학생</span>
            <span className="font-semibold">{student.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">학년</span>
            <span className="text-sm">{student.grade}학년</span>
          </div>
          {student.className && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">반</span>
              <span className="text-sm">{student.className}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">학교</span>
            <span className="text-sm">{student.school}</span>
          </div>
        </div>

        {/* 학습 상황 Accordion */}
        <Collapsible
          open={learningDataOpen}
          onOpenChange={setLearningDataOpen}
          className="mb-6"
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between"
              type="button"
            >
              <span className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                {year}년 {month}월 학습 상황
              </span>
              {learningDataOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3">
            {loadingLearningData ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                로딩 중...
              </div>
            ) : (
              <>
                {/* 요약 카드 5개 */}
                <div className="grid grid-cols-5 gap-2">
                  {/* 1. 학습 카드 (attendance + homework + focus 평균) */}
                  <button
                    type="button"
                    onClick={() => setShowStudyLogs(!showStudyLogs)}
                    className="p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer text-left"
                  >
                    <div className="text-xs text-muted-foreground mb-1">학습 ({studyLogs.length}회)</div>
                    <div className="text-xs space-y-0.5">
                      <div>
                        출석: {studyLogs.length > 0
                          ? (studyLogs.reduce((sum, log) => sum + (log.attendance_status || 0), 0) / studyLogs.length).toFixed(1)
                          : "0.0"}
                      </div>
                      <div>
                        숙제: {studyLogs.length > 0
                          ? (studyLogs.reduce((sum, log) => sum + (log.homework || 0), 0) / studyLogs.length).toFixed(1)
                          : "0.0"}
                      </div>
                      <div>
                        집중도: {studyLogs.length > 0
                          ? (studyLogs.reduce((sum, log) => sum + (log.focus || 0), 0) / studyLogs.length).toFixed(1)
                          : "0.0"}
                      </div>
                    </div>
                  </button>

                  {/* 2. 시험 카드 */}
                  <button
                    type="button"
                    onClick={() => setShowTestLogs(!showTestLogs)}
                    className="p-3 bg-green-50 rounded-lg text-center hover:bg-green-100 transition-colors cursor-pointer"
                  >
                    <div className="text-xs text-muted-foreground mb-1">시험</div>
                    <div className="text-lg font-bold">{testLogs.length}</div>
                    <div className="text-xs text-muted-foreground">회</div>
                  </button>

                  {/* 3. 상담 카드 */}
                  <button
                    type="button"
                    onClick={() => setShowConsultations(!showConsultations)}
                    className="p-3 bg-purple-50 rounded-lg text-center hover:bg-purple-100 transition-colors cursor-pointer"
                  >
                    <div className="text-xs text-muted-foreground mb-1">상담</div>
                    <div className="text-lg font-bold">{consultations.length}</div>
                    <div className="text-xs text-muted-foreground">회</div>
                  </button>

                  {/* 4. 보강 카드 */}
                  <button
                    type="button"
                    onClick={() => setShowMakeupClasses(!showMakeupClasses)}
                    className="p-3 bg-orange-50 rounded-lg text-center hover:bg-orange-100 transition-colors cursor-pointer"
                  >
                    <div className="text-xs text-muted-foreground mb-1">보강</div>
                    <div className="text-lg font-bold">{makeupClasses.length}</div>
                    <div className="text-xs text-muted-foreground">회</div>
                  </button>

                  {/* 5. 매쓰플랫 카드 */}
                  <button
                    type="button"
                    onClick={() => setShowMathflatRecords(!showMathflatRecords)}
                    className="p-3 bg-indigo-50 rounded-lg text-center hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    <div className="text-xs text-muted-foreground mb-1">매쓰플랫</div>
                    <div className="text-lg font-bold">
                      {(() => {
                        if (mathflatRecords.length === 0) return "0%"
                        const totalProblems = mathflatRecords.reduce((sum, r) => sum + (r.problem_solved || 0), 0)
                        const totalCorrect = mathflatRecords.reduce((sum, r) => sum + (r.correct_count || 0), 0)
                        return totalProblems > 0 ? ((totalCorrect / totalProblems) * 100).toFixed(0) + "%" : "0%"
                      })()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {mathflatRecords.reduce((sum, r) => sum + (r.problem_solved || 0), 0)}문제
                    </div>
                  </button>
                </div>

                {/* 학습 로그 - 카드 클릭 시 표시 */}
                {showStudyLogs && studyLogs.length > 0 && (
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <GraduationCap className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-sm">학습 로그 ({studyLogs.length})</span>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {studyLogs.map((log, idx) => (
                        <div key={idx} className="text-xs border-b pb-2 last:border-b-0">
                          <div className="font-medium text-gray-700 mb-1">{log.date}</div>
                          <div className="space-y-1 text-muted-foreground">
                            <div>
                              <span className="font-medium">출석:</span> {log.attendance_status || '-'} ({attendanceLabels[log.attendance_status] || '-'})
                            </div>
                            <div>
                              <span className="font-medium">숙제:</span> {log.homework || '-'} ({homeworkLabels[log.homework] || '-'})
                            </div>
                            <div>
                              <span className="font-medium">집중도:</span> {log.focus || '-'} ({focusLabels[log.focus] || '-'})
                            </div>
                            {log.book1 && (
                              <div>
                                <span className="font-medium">교재1:</span> {log.book1}
                                {log.book1log && ` - ${log.book1log}`}
                              </div>
                            )}
                            {log.book2 && (
                              <div>
                                <span className="font-medium">교재2:</span> {log.book2}
                                {log.book2log && ` - ${log.book2log}`}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 시험 로그 - 카드 클릭 시 표시 */}
                {showTestLogs && testLogs.length > 0 && (
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-sm">시험 로그 ({testLogs.length})</span>
                    </div>
                    <div className="space-y-1 max-h-96 overflow-y-auto">
                      {testLogs.map((log, idx) => (
                        <div key={idx} className="text-xs text-muted-foreground border-b pb-1 last:border-b-0">
                          <div className="font-medium text-gray-700">{log.date}</div>
                          <div>유형: {log.test_type || '-'}</div>
                          <div>시험: {log.test || '-'}</div>
                          <div>점수: {log.test_score || '-'}점</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 상담 - 카드 클릭 시 표시 */}
                {showConsultations && consultations.length > 0 && (
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-purple-600" />
                      <span className="font-medium text-sm">상담 ({consultations.length})</span>
                    </div>
                    <div className="space-y-1 max-h-96 overflow-y-auto">
                      {consultations.map((con, idx) => (
                        <div key={idx} className="text-xs text-muted-foreground border-b pb-1 last:border-b-0">
                          <div className="font-medium text-gray-700">{con.date}</div>
                          <div>유형: {con.type || '일반상담'}</div>
                          <div>방법: {con.method || '-'}</div>
                          {con.content && (
                            <div className="text-gray-600 mt-1">{con.content}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 보강 - 카드 클릭 시 표시 */}
                {showMakeupClasses && makeupClasses.length > 0 && (
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-orange-600" />
                      <span className="font-medium text-sm">보강 ({makeupClasses.length})</span>
                    </div>
                    <div className="space-y-1 max-h-96 overflow-y-auto">
                      {makeupClasses.map((makeup, idx) => (
                        <div key={idx} className="text-xs text-muted-foreground border-b pb-1 last:border-b-0">
                          <div className="font-medium text-gray-700">결석: {makeup.absence_date || '-'}</div>
                          <div className="text-gray-600">사유: {makeup.absence_reason || '-'}</div>
                          {makeup.makeup_date && (
                            <div className="text-gray-600">보강: {makeup.makeup_date}</div>
                          )}
                          {makeup.status && (
                            <div className="text-gray-600">상태: {makeup.status}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 매쓰플랫 - 카드 클릭 시 표시 */}
                {showMathflatRecords && mathflatRecords.length > 0 && (
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calculator className="h-4 w-4 text-indigo-600" />
                      <span className="font-medium text-sm">매쓰플랫 ({mathflatRecords.length})</span>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {mathflatRecords.map((record, idx) => {
                        const accuracy = (record.problem_solved || 0) > 0
                          ? (((record.correct_count || 0) / (record.problem_solved || 0)) * 100).toFixed(1)
                          : '0.0'

                        return (
                          <div key={idx} className="text-xs border-b pb-2 last:border-b-0">
                            <div className="font-medium text-gray-700 mb-1">{record.event_date}</div>
                            <div className="space-y-1 text-muted-foreground">
                              <div>
                                <span className="font-medium">유형:</span> {record.mathflat_type || '-'}
                              </div>
                              <div>
                                <span className="font-medium">교재:</span> {record.book_title || '-'}
                              </div>
                              <div>
                                <span className="font-medium">문제:</span> {record.problem_solved || 0}개
                              </div>
                              <div>
                                <span className="font-medium">정답:</span> {record.correct_count || 0}개 ({accuracy}%)
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 데이터 없음 */}
                {studyLogs.length === 0 &&
                  testLogs.length === 0 &&
                  consultations.length === 0 &&
                  makeupClasses.length === 0 &&
                  mathflatRecords.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      {year}년 {month}월 학습 기록이 없습니다.
                    </div>
                  )}
              </>
            )}
          </CollapsibleContent>
        </Collapsible>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Content */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>코멘트 내용</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={`${student.name} 학생의 ${month}월 학습 코멘트를 작성해주세요.`}
                      className="min-h-[300px] resize-none"
                      maxLength={2000}
                      {...field}
                    />
                  </FormControl>
                  <div className="flex items-center justify-between">
                    <FormMessage />
                    <span className="text-xs text-muted-foreground">
                      {contentLength}/2000
                    </span>
                  </div>
                </FormItem>
              )}
            />

            {/* Preview Toggle */}
            {contentLength > 0 && (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="mb-3"
                >
                  {showPreview ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      미리보기 닫기
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      미리보기
                    </>
                  )}
                </Button>

                {showPreview && (
                  <Card className="bg-white">
                    <CardHeader>
                      <CardTitle className="text-base">
                        {year}년 {month}월 학습 코멘트
                      </CardTitle>
                      <CardDescription>{student.name}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-700">
                        {form.watch("content")}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={isSubmitting}>
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting
                  ? "저장 중..."
                  : student.hasComment
                  ? "코멘트 수정"
                  : "코멘트 저장"}
              </Button>
            </div>
          </form>
        </Form>

        {/* 마지막 수정 정보 (수정 모드인 경우) */}
        {student.hasComment && student.comment && (
          <div className="mt-6 pt-6 border-t">
            <p className="text-xs text-muted-foreground">
              마지막 수정:{" "}
              {new Date(student.comment.updated_at).toLocaleString("ko-KR")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
