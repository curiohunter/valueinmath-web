"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Phone,
  AlertCircle,
  Loader2,
  RefreshCw,
  MessageSquare,
  UserX,
  FileText,
  ClipboardList,
} from "lucide-react"
import { AI_TAG_LABELS, AI_TAG_COLORS } from "@/services/consultation-ai-service"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface FollowupStudent {
  id: string
  name: string
  school: string | null
  school_type: string | null
  grade: number | null
  parent_phone: string | null
  student_phone: string | null
  funnel_stage: string | null
  status: string | null
  first_contact_date: string | null
  last_consultation_date: string | null
  days_since_last_contact: number | null
  total_consultations: number
  ai_hurdle: string | null
  ai_readiness: string | null
  ai_decision_maker: string | null
  ai_sentiment: string | null
  recommended_action: string
  recommended_reason: string
  recommended_contact: string
  action_priority: 'urgent' | 'high' | 'medium' | 'low'
}

interface TimelineItem {
  type: 'consultation' | 'entrance_test'
  date: string
  data: any
}

interface FollowupData {
  success: boolean
  total: number
  students: FollowupStudent[]
  summary: {
    urgent: number
    high: number
    medium: number
    low: number
  }
}

const PRIORITY_CONFIG = {
  urgent: { label: '긴급', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  high: { label: '높음', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  medium: { label: '보통', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  low: { label: '낮음', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' }
}

const METHOD_ICONS: Record<string, string> = {
  '전화': '📞',
  '문자': '💬',
  '대면': '🤝'
}

export function FollowupStudentsSection() {
  const [data, setData] = useState<FollowupData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedStage, setSelectedStage] = useState<string>('all')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')
  const [selectedStudent, setSelectedStudent] = useState<FollowupStudent | null>(null)
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [markAsLostDialogOpen, setMarkAsLostDialogOpen] = useState(false)
  const [studentToMarkLost, setStudentToMarkLost] = useState<FollowupStudent | null>(null)

  const loadData = async (stage?: string) => {
    setLoading(true)
    try {
      const url = stage && stage !== 'all'
        ? `/api/funnel/followup-needed?stage=${encodeURIComponent(stage)}`
        : '/api/funnel/followup-needed'

      const response = await fetch(url)
      if (response.ok) {
        const result = await response.json()
        setData(result)
        // 선택된 학생이 새 데이터에 없으면 선택 해제
        if (selectedStudent && !result.students.find((s: FollowupStudent) => s.id === selectedStudent.id)) {
          setSelectedStudent(null)
          setTimeline([])
        }
      } else {
        toast.error('데이터를 불러오는데 실패했습니다.')
      }
    } catch (error) {
      console.error('Failed to load followup data:', error)
      toast.error('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadTimeline = async (studentId: string) => {
    setTimelineLoading(true)
    try {
      const response = await fetch(`/api/funnel/student-timeline?studentId=${studentId}`)
      if (response.ok) {
        const result = await response.json()
        setTimeline(result.timeline || [])
      } else {
        toast.error('타임라인을 불러오는데 실패했습니다.')
      }
    } catch (error) {
      console.error('Failed to load timeline:', error)
      toast.error('타임라인을 불러오는데 실패했습니다.')
    } finally {
      setTimelineLoading(false)
    }
  }

  const handleSelectStudent = (student: FollowupStudent) => {
    setSelectedStudent(student)
    loadTimeline(student.id)
  }

  const handleMarkAsLost = async () => {
    if (!studentToMarkLost) return

    try {
      const response = await fetch('/api/funnel/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentToMarkLost.id,
          status: '미등록'
        })
      })

      if (response.ok) {
        toast.success(`${studentToMarkLost.name} 학생이 미등록으로 변경되었습니다.`)
        loadData(selectedStage)
        if (selectedStudent?.id === studentToMarkLost.id) {
          setSelectedStudent(null)
          setTimeline([])
        }
      } else {
        toast.error('상태 변경에 실패했습니다.')
      }
    } catch (error) {
      console.error('Failed to update status:', error)
      toast.error('상태 변경에 실패했습니다.')
    } finally {
      setMarkAsLostDialogOpen(false)
      setStudentToMarkLost(null)
    }
  }

  useEffect(() => {
    loadData(selectedStage)
  }, [selectedStage])

  // 우선순위 필터링된 학생 목록
  const filteredStudents = data?.students.filter(s =>
    selectedPriority === 'all' || s.action_priority === selectedPriority
  ) || []

  // 학년 표시
  const formatGrade = (schoolType: string | null, grade: number | null) => {
    if (!grade) return ''
    const prefix = schoolType === '중' ? '중' : schoolType === '고' ? '고' : '초'
    return `${prefix}${grade}`
  }

  // AI 태그 색상
  const getHurdleColor = (hurdle: string | null) => {
    if (!hurdle || hurdle === 'none') return null
    return AI_TAG_COLORS.hurdle[hurdle as keyof typeof AI_TAG_COLORS.hurdle]
  }

  const getReadinessColor = (readiness: string | null) => {
    if (!readiness) return null
    return AI_TAG_COLORS.readiness[readiness as keyof typeof AI_TAG_COLORS.readiness]
  }

  // 날짜 포맷
  const formatFullDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              팔로업 필요 학생
            </CardTitle>
            <CardDescription className="text-xs">
              AI 분석 완료 학생만 표시 | 클릭하여 상담 이력 확인
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(selectedStage)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* 필터 영역 */}
        <div className="flex flex-wrap gap-3 mt-3">
          {/* 퍼널 단계 */}
          <Tabs value={selectedStage} onValueChange={setSelectedStage}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs px-2 h-6">전체</TabsTrigger>
              <TabsTrigger value="신규상담" className="text-xs px-2 h-6">신규상담</TabsTrigger>
              <TabsTrigger value="테스트예정" className="text-xs px-2 h-6">테스트예정</TabsTrigger>
              <TabsTrigger value="테스트완료" className="text-xs px-2 h-6">테스트완료</TabsTrigger>
              <TabsTrigger value="등록유도" className="text-xs px-2 h-6">등록유도</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* 우선순위 필터 */}
          {data && (
            <div className="flex gap-1">
              <Button
                variant={selectedPriority === 'all' ? 'default' : 'outline'}
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => setSelectedPriority('all')}
              >
                전체 ({data.total})
              </Button>
              <Button
                variant={selectedPriority === 'urgent' ? 'default' : 'outline'}
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => setSelectedPriority('urgent')}
              >
                <span className="w-2 h-2 rounded-full bg-red-500 mr-1" />
                {data.summary.urgent}
              </Button>
              <Button
                variant={selectedPriority === 'high' ? 'default' : 'outline'}
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => setSelectedPriority('high')}
              >
                <span className="w-2 h-2 rounded-full bg-orange-500 mr-1" />
                {data.summary.high}
              </Button>
              <Button
                variant={selectedPriority === 'medium' ? 'default' : 'outline'}
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => setSelectedPriority('medium')}
              >
                <span className="w-2 h-2 rounded-full bg-yellow-500 mr-1" />
                {data.summary.medium}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.total === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            AI 분석된 팔로업 대상이 없습니다.
          </div>
        ) : (
          <div className="flex gap-4" style={{ minHeight: '400px' }}>
            {/* 왼쪽: 학생 목록 */}
            <div className="w-1/2 border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs bg-muted/50">
                    <TableHead className="w-8 px-2"></TableHead>
                    <TableHead className="px-2">이름</TableHead>
                    <TableHead className="px-2">학교/학년</TableHead>
                    <TableHead className="px-2">전화번호</TableHead>
                    <TableHead className="w-16 px-2">경과</TableHead>
                    <TableHead className="w-8 px-2"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => {
                    const priorityConfig = PRIORITY_CONFIG[student.action_priority]
                    const isSelected = selectedStudent?.id === student.id

                    return (
                      <TableRow
                        key={student.id}
                        className={cn(
                          "text-sm cursor-pointer hover:bg-muted/50 transition-colors",
                          isSelected && "bg-blue-50 hover:bg-blue-50"
                        )}
                        onClick={() => handleSelectStudent(student)}
                      >
                        {/* 우선순위 */}
                        <TableCell className="px-2">
                          <span className={`w-2.5 h-2.5 rounded-full inline-block ${priorityConfig.dot}`} />
                        </TableCell>

                        {/* 이름 */}
                        <TableCell className="px-2 font-medium">
                          {student.name}
                        </TableCell>

                        {/* 학교/학년 */}
                        <TableCell className="px-2 text-xs text-muted-foreground">
                          {student.school || '-'} {formatGrade(student.school_type, student.grade)}
                        </TableCell>

                        {/* 전화번호 */}
                        <TableCell className="px-2">
                          {student.parent_phone ? (
                            <a
                              href={`tel:${student.parent_phone}`}
                              className="text-blue-600 hover:underline flex items-center gap-1 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="h-3 w-3" />
                              {student.parent_phone}
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>

                        {/* 경과일 */}
                        <TableCell className="px-2">
                          <span className={cn(
                            "text-xs",
                            student.days_since_last_contact && student.days_since_last_contact > 30
                              ? 'text-red-600 font-medium'
                              : student.days_since_last_contact && student.days_since_last_contact > 14
                              ? 'text-orange-600'
                              : 'text-muted-foreground'
                          )}>
                            {student.days_since_last_contact !== null
                              ? `${student.days_since_last_contact}일`
                              : '-'}
                          </span>
                        </TableCell>

                        {/* 미등록 처리 버튼 */}
                        <TableCell className="px-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation()
                              setStudentToMarkLost(student)
                              setMarkAsLostDialogOpen(true)
                            }}
                            title="미등록 처리"
                          >
                            <UserX className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* 오른쪽: 타임라인 */}
            <div className="w-1/2 border rounded-lg p-4 overflow-y-auto" style={{ maxHeight: '500px' }}>
              {!selectedStudent ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <FileText className="h-12 w-12 mb-2 opacity-30" />
                  <p className="text-sm">학생을 선택하면 상담 이력이 표시됩니다</p>
                </div>
              ) : timelineLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div>
                  {/* 선택된 학생 정보 헤더 */}
                  <div className="mb-4 pb-3 border-b">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">{selectedStudent.name}</h3>
                      <Badge variant="outline">
                        {selectedStudent.funnel_stage || selectedStudent.status || '-'}
                      </Badge>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {selectedStudent.ai_hurdle && selectedStudent.ai_hurdle !== 'none' && (
                        <Badge className={`text-xs ${getHurdleColor(selectedStudent.ai_hurdle)}`}>
                          {AI_TAG_LABELS.hurdle[selectedStudent.ai_hurdle as keyof typeof AI_TAG_LABELS.hurdle]}
                        </Badge>
                      )}
                      {selectedStudent.ai_readiness && (
                        <Badge className={`text-xs ${getReadinessColor(selectedStudent.ai_readiness)}`}>
                          {AI_TAG_LABELS.readiness[selectedStudent.ai_readiness as keyof typeof AI_TAG_LABELS.readiness]}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {selectedStudent.recommended_action} → {selectedStudent.recommended_contact}
                    </p>
                  </div>

                  {/* 타임라인 */}
                  {timeline.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      상담 이력이 없습니다.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {timeline.map((item, idx) => (
                        <div key={idx} className="relative pl-6 pb-4 border-l-2 border-gray-200 last:border-l-0">
                          <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center">
                            {item.type === 'consultation' ? (
                              <MessageSquare className="h-2 w-2 text-blue-500" />
                            ) : (
                              <ClipboardList className="h-2 w-2 text-green-500" />
                            )}
                          </div>

                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium">
                                  {item.type === 'consultation' ? (
                                    <>
                                      {METHOD_ICONS[item.data.method] || '📋'} {item.data.consultationType}
                                    </>
                                  ) : (
                                    <>📝 입학테스트</>
                                  )}
                                </span>
                                {item.type === 'consultation' && item.data.aiAnalyzed && (
                                  <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                                    AI분석
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {formatFullDate(item.date)}
                              </span>
                            </div>

                            {item.type === 'consultation' ? (
                              <>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                  {item.data.content || '내용 없음'}
                                </p>
                                {item.data.aiAnalyzed && (
                                  <div className="flex gap-1 mt-2">
                                    {item.data.aiHurdle && item.data.aiHurdle !== 'none' && (
                                      <Badge className={`text-xs px-1 py-0 ${getHurdleColor(item.data.aiHurdle)}`}>
                                        {AI_TAG_LABELS.hurdle[item.data.aiHurdle as keyof typeof AI_TAG_LABELS.hurdle]}
                                      </Badge>
                                    )}
                                    {item.data.aiReadiness && (
                                      <Badge className={`text-xs px-1 py-0 ${getReadinessColor(item.data.aiReadiness)}`}>
                                        {AI_TAG_LABELS.readiness[item.data.aiReadiness as keyof typeof AI_TAG_LABELS.readiness]}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                                {item.data.counselorName && (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    상담사: {item.data.counselorName}
                                  </p>
                                )}
                              </>
                            ) : (
                              <>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-muted-foreground">테스트1:</span>{' '}
                                    {item.data.test1Level} ({item.data.test1Score}점)
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">테스트2:</span>{' '}
                                    {item.data.test2Level} ({item.data.test2Score}점)
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">결과:</span>{' '}
                                    {item.data.testResult || '-'}
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">상태:</span>{' '}
                                    {item.data.status || '-'}
                                  </div>
                                </div>
                                {item.data.recommendedClass && (
                                  <p className="text-xs mt-2">
                                    <span className="text-muted-foreground">추천반:</span> {item.data.recommendedClass}
                                  </p>
                                )}
                                {item.data.notes && (
                                  <p className="text-xs text-gray-600 mt-2">{item.data.notes}</p>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {/* 미등록 확인 다이얼로그 */}
      <AlertDialog open={markAsLostDialogOpen} onOpenChange={setMarkAsLostDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>미등록 처리</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{studentToMarkLost?.name}</strong> 학생을 미등록으로 처리하시겠습니까?
              <br />
              미등록 처리된 학생은 팔로업 목록에서 제외됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAsLost} className="bg-red-600 hover:bg-red-700">
              미등록 처리
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
