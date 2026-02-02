"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RefreshCw, Sparkles, CalendarIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import AnalyticsTabs from "@/components/analytics/AnalyticsTabs"
import { StudentListPanel } from "./student-list-panel"
import { StudentDetailPanel } from "./student-detail-panel"
import { StudentFollowup, FollowupData, URGENCY_COLORS } from "./types"
import { createClient } from "@/lib/supabase/client"

const CONSULTATION_TYPES = [
  { value: '신규상담', label: '신규상담' },
  { value: '재상담', label: '재상담' },
  { value: '입테후상담', label: '입테후상담' },
  { value: '결과상담', label: '결과상담' },
  { value: '등록유도', label: '등록유도' },
  { value: '기타', label: '기타' },
]

const CONSULTATION_METHODS = [
  { value: '전화', label: '전화' },
  { value: '문자', label: '문자' },
  { value: '대면', label: '대면' },
]

export function FunnelActionCenter() {
  const [data, setData] = useState<FollowupData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<StudentFollowup | null>(null)
  const [checkedStudentIds, setCheckedStudentIds] = useState<Set<string>>(new Set())

  // 상담 기록 모달 상태
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false)
  const [savingConsultation, setSavingConsultation] = useState(false)
  const [consultationForm, setConsultationForm] = useState({
    date: new Date(),
    type: '재상담',
    method: '전화',
    content: '',
    nextAction: '',
    nextDate: null as Date | null,
  })

  // 데이터 로드
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/funnel/followup-needed')
      if (response.ok) {
        const result = await response.json()
        setData(result)

        // 선택된 학생이 새 데이터에 없으면 선택 해제
        if (selectedStudent) {
          const stillExists = result.students.find(
            (s: StudentFollowup) => s.id === selectedStudent.id
          )
          if (!stillExists) {
            setSelectedStudent(null)
          } else {
            // 선택된 학생 데이터 업데이트
            setSelectedStudent(stillExists)
          }
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
  }, [selectedStudent])

  // 초기 로드
  useEffect(() => {
    loadData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 체크박스 핸들러
  const handleCheckStudent = (studentId: string, checked: boolean) => {
    setCheckedStudentIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(studentId)
      } else {
        next.delete(studentId)
      }
      return next
    })
  }

  const handleCheckAll = (checked: boolean) => {
    if (checked && data?.students) {
      setCheckedStudentIds(new Set(data.students.map((s) => s.id)))
    } else {
      setCheckedStudentIds(new Set())
    }
  }

  // 상담 기록 저장
  const handleSaveConsultation = async () => {
    if (!selectedStudent) return
    if (!consultationForm.content.trim()) {
      toast.error('상담 내용을 입력해주세요.')
      return
    }

    setSavingConsultation(true)
    try {
      const supabase = createClient()

      // 현재 사용자 정보 가져오기
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('로그인이 필요합니다.')
        return
      }

      // 직원 정보 조회
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('auth_id', user.id)
        .single()

      // 상담 기록 저장
      const { error } = await supabase.from('consultations').insert({
        student_id: selectedStudent.id,
        date: format(consultationForm.date, 'yyyy-MM-dd'),
        type: consultationForm.type,
        method: consultationForm.method,
        content: consultationForm.content,
        next_action: consultationForm.nextAction || null,
        next_date: consultationForm.nextDate
          ? format(consultationForm.nextDate, 'yyyy-MM-dd')
          : null,
        counselor_id: employee?.id || null,
        student_name_snapshot: selectedStudent.name,
      })

      if (error) throw error

      toast.success('상담 기록이 저장되었습니다.')
      setIsConsultationModalOpen(false)

      // 폼 초기화
      setConsultationForm({
        date: new Date(),
        type: '재상담',
        method: '전화',
        content: '',
        nextAction: '',
        nextDate: null,
      })

      // 데이터 새로고침
      loadData()
    } catch (error) {
      console.error('Failed to save consultation:', error)
      toast.error('상담 기록 저장에 실패했습니다.')
    } finally {
      setSavingConsultation(false)
    }
  }

  // 일괄 처리 (미래 기능)
  const handleBatchAction = () => {
    if (checkedStudentIds.size === 0) {
      toast.info('먼저 학생을 선택해주세요.')
      return
    }
    toast.info('일괄 처리 기능은 추후 지원 예정입니다.')
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* 헤더 */}
      <div className="mb-4">
        <AnalyticsTabs />
      </div>

      {/* 페이지 제목 & 액션 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">퍼널 액션 센터</h1>
          <p className="text-sm text-muted-foreground">
            팔로업이 필요한 학생을 확인하고 즉시 연락하세요
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData()}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
            새로고침
          </Button>
        </div>
      </div>

      {/* 요약 배지 */}
      {data?.summary && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {(['urgent', 'high', 'medium', 'low'] as const).map((priority) => {
            const count = data.summary[priority]
            const colors = URGENCY_COLORS[priority]
            return (
              <Badge
                key={priority}
                variant="outline"
                className={cn(colors.bg, colors.text, colors.border, "text-sm")}
              >
                {colors.label}: {count}명
              </Badge>
            )
          })}
          <span className="text-sm text-muted-foreground self-center ml-2">
            총 {data.total}명
          </span>
        </div>
      )}

      {/* 2컬럼 레이아웃 */}
      <div className="flex gap-4 h-[calc(100vh-280px)] min-h-[600px]">
        {/* 좌측: 학생 리스트 (35%) */}
        <div className="w-[35%] min-w-[300px] bg-background border rounded-lg overflow-hidden">
          <StudentListPanel
            data={data}
            loading={loading}
            onRefresh={loadData}
            selectedStudentId={selectedStudent?.id || null}
            onSelectStudent={setSelectedStudent}
            checkedStudentIds={checkedStudentIds}
            onCheckStudent={handleCheckStudent}
            onCheckAll={handleCheckAll}
          />
        </div>

        {/* 우측: 상세 패널 (65%) */}
        <div className="flex-1 min-w-[400px] bg-background border rounded-lg overflow-hidden">
          <StudentDetailPanel
            student={selectedStudent}
            onAddConsultation={() => setIsConsultationModalOpen(true)}
          />
        </div>
      </div>

      {/* 하단 일괄 처리 바 */}
      {checkedStudentIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg p-4 z-50">
          <div className="container mx-auto max-w-7xl flex items-center justify-between">
            <span className="text-sm font-medium">
              {checkedStudentIds.size}명 선택됨
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCheckedStudentIds(new Set())}>
                선택 해제
              </Button>
              <Button onClick={handleBatchAction}>
                <Sparkles className="h-4 w-4 mr-1" />
                AI 일괄 액션 제안
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 상담 기록 모달 */}
      <Dialog open={isConsultationModalOpen} onOpenChange={setIsConsultationModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>상담 기록 추가</DialogTitle>
            <DialogDescription>
              {selectedStudent?.name} 학생의 상담 내용을 기록합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 날짜 & 유형 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>상담일</Label>
                <Popover modal={true}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(consultationForm.date, 'PPP', { locale: ko })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={consultationForm.date}
                      onSelect={(date) =>
                        setConsultationForm((prev) => ({
                          ...prev,
                          date: date || new Date(),
                        }))
                      }
                      locale={ko}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>상담 유형</Label>
                <Select
                  value={consultationForm.type}
                  onValueChange={(v) =>
                    setConsultationForm((prev) => ({ ...prev, type: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONSULTATION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 채널 */}
            <div className="space-y-2">
              <Label>상담 방법</Label>
              <Select
                value={consultationForm.method}
                onValueChange={(v) =>
                  setConsultationForm((prev) => ({ ...prev, method: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONSULTATION_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 내용 */}
            <div className="space-y-2">
              <Label>상담 내용 *</Label>
              <Textarea
                placeholder="상담 내용을 입력하세요..."
                value={consultationForm.content}
                onChange={(e) =>
                  setConsultationForm((prev) => ({
                    ...prev,
                    content: e.target.value,
                  }))
                }
                rows={4}
              />
            </div>

            {/* 다음 액션 */}
            <div className="space-y-2">
              <Label>다음 액션 (선택)</Label>
              <Input
                placeholder="예: 다음 주 전화 팔로업"
                value={consultationForm.nextAction}
                onChange={(e) =>
                  setConsultationForm((prev) => ({
                    ...prev,
                    nextAction: e.target.value,
                  }))
                }
              />
            </div>

            {/* 다음 연락일 */}
            <div className="space-y-2">
              <Label>다음 연락 예정일 (선택)</Label>
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {consultationForm.nextDate
                      ? format(consultationForm.nextDate, 'PPP', { locale: ko })
                      : '선택 안함'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={consultationForm.nextDate || undefined}
                    onSelect={(date) =>
                      setConsultationForm((prev) => ({
                        ...prev,
                        nextDate: date || null,
                      }))
                    }
                    locale={ko}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConsultationModalOpen(false)}
              disabled={savingConsultation}
            >
              취소
            </Button>
            <Button onClick={handleSaveConsultation} disabled={savingConsultation}>
              {savingConsultation && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
