"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Phone, MessageSquare, User, School, Calendar, Target, Clock } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { StudentFollowup, URGENCY_COLORS, ActionPriority, CHANNEL_ICONS } from "./types"
import { AI_TAG_LABELS, AI_TAG_COLORS } from "@/services/consultation-ai-service"
import { AISuggestionCard } from "./ai-suggestion-card"
import { TimelineSection } from "./timeline-section"
import { toast } from "sonner"

interface StudentDetailPanelProps {
  student: StudentFollowup | null
  onAddConsultation: () => void
}

const SCHOOL_TYPE_LABELS: Record<string, string> = {
  '초등학교': '초등',
  '중학교': '중등',
  '고등학교': '고등',
}

export function StudentDetailPanel({ student, onAddConsultation }: StudentDetailPanelProps) {
  if (!student) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">좌측에서 학생을 선택하세요</p>
        </div>
      </div>
    )
  }

  const priority = student.action_priority as ActionPriority
  const colors = URGENCY_COLORS[priority]
  const days = student.days_since_last_contact ?? 0

  // 전화/문자 액션
  const handleCall = () => {
    const phone = student.parent_phone || student.student_phone
    if (phone) {
      window.location.href = `tel:${phone}`
    } else {
      toast.error('연락처가 없습니다.')
    }
  }

  const handleText = () => {
    const phone = student.parent_phone || student.student_phone
    if (phone) {
      window.location.href = `sms:${phone}`
    } else {
      toast.error('연락처가 없습니다.')
    }
  }

  // 학교/학년 정보
  const schoolInfo = student.school_type
    ? `${SCHOOL_TYPE_LABELS[student.school_type] || student.school_type} ${student.grade || '?'}학년`
    : student.grade ? `${student.grade}학년` : '-'

  // 날짜 포맷
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    try {
      return format(new Date(dateStr), 'yyyy.MM.dd', { locale: ko })
    } catch {
      return '-'
    }
  }

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto p-4">
      {/* 1. 상단 요약 카드 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                {student.name}
                <Badge variant="outline" className={cn(colors.bg, colors.text, colors.border)}>
                  D+{days}
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {schoolInfo} • {student.funnel_stage || '-'}
              </p>
            </div>
            {/* 액션 버튼 */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCall}
                disabled={!student.parent_phone && !student.student_phone}
              >
                <Phone className="h-4 w-4 mr-1" />
                전화
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleText}
                disabled={!student.parent_phone && !student.student_phone}
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                문자
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 기본 정보 */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <School className="h-3.5 w-3.5" />
                학교
              </div>
              <p className="text-sm font-medium">{student.school || '-'}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Target className="h-3.5 w-3.5" />
                유입경로
              </div>
              <p className="text-sm font-medium">{student.lead_source || '-'}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Calendar className="h-3.5 w-3.5" />
                첫 상담일
              </div>
              <p className="text-sm font-medium">{formatDate(student.first_contact_date)}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Clock className="h-3.5 w-3.5" />
                마지막 연락
              </div>
              <p className="text-sm font-medium">{formatDate(student.last_consultation_date)}</p>
            </div>
          </div>

          {/* 상담 통계 & 연락처 */}
          <div className="mt-4 pt-4 border-t grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">총 상담</p>
              <p className="text-sm font-medium">{student.total_consultations}회</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">전화/문자/대면</p>
              <p className="text-sm font-medium">
                {student.phone_count}/{student.text_count}/{student.visit_count}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">학부모 연락처</p>
              <p className="text-sm font-medium">{student.parent_phone || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">학생 연락처</p>
              <p className="text-sm font-medium">{student.student_phone || '-'}</p>
            </div>
          </div>

          {/* AI 분석 태그 */}
          {(student.ai_hurdle || student.ai_readiness || student.ai_decision_maker || student.ai_sentiment) && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">AI 분석 (최근 상담 기준)</p>
              <div className="flex flex-wrap gap-1.5">
                {student.ai_hurdle && (
                  <Badge variant="outline" className={cn("text-xs", AI_TAG_COLORS.hurdle)}>
                    {AI_TAG_LABELS.hurdle[student.ai_hurdle as keyof typeof AI_TAG_LABELS.hurdle] || student.ai_hurdle}
                  </Badge>
                )}
                {student.ai_readiness && (
                  <Badge variant="outline" className={cn("text-xs", AI_TAG_COLORS.readiness)}>
                    {AI_TAG_LABELS.readiness[student.ai_readiness as keyof typeof AI_TAG_LABELS.readiness] || student.ai_readiness}
                  </Badge>
                )}
                {student.ai_decision_maker && (
                  <Badge variant="outline" className={cn("text-xs", AI_TAG_COLORS.decision_maker)}>
                    {AI_TAG_LABELS.decision_maker[student.ai_decision_maker as keyof typeof AI_TAG_LABELS.decision_maker] || student.ai_decision_maker}
                  </Badge>
                )}
                {student.ai_sentiment && (
                  <Badge variant="outline" className={cn("text-xs", AI_TAG_COLORS.sentiment)}>
                    {AI_TAG_LABELS.sentiment[student.ai_sentiment as keyof typeof AI_TAG_LABELS.sentiment] || student.ai_sentiment}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* 권장 액션 */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-3">
              <Badge className={cn("text-sm", colors.bg, colors.text, colors.border)}>
                {colors.label}
              </Badge>
              <span className="text-sm">
                {student.recommended_action}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {student.recommended_reason} • 연락 대상: {student.recommended_contact}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 2. AI 제안 블록 */}
      <AISuggestionCard student={student} />

      {/* 3. 상담 타임라인 */}
      <TimelineSection
        studentId={student.id}
        onAddConsultation={onAddConsultation}
      />
    </div>
  )
}
