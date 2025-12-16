"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, History, Phone, MessageSquare, Users, FileText, Sparkles } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { TimelineItem, ConsultationData, EntranceTestData } from "./types"
import { AI_TAG_LABELS, AI_TAG_COLORS } from "@/services/consultation-ai-service"
import { toast } from "sonner"

interface TimelineSectionProps {
  studentId: string | null
  onAddConsultation: () => void
}

const METHOD_ICONS: Record<string, React.ReactNode> = {
  '전화': <Phone className="h-3.5 w-3.5" />,
  '문자': <MessageSquare className="h-3.5 w-3.5" />,
  '대면': <Users className="h-3.5 w-3.5" />,
}

const CONSULTATION_TYPE_COLORS: Record<string, string> = {
  '신규상담': 'bg-blue-100 text-blue-700',
  '재상담': 'bg-green-100 text-green-700',
  '입테후상담': 'bg-purple-100 text-purple-700',
  '결과상담': 'bg-amber-100 text-amber-700',
  '등록유도': 'bg-pink-100 text-pink-700',
  '기타': 'bg-gray-100 text-gray-700',
}

export function TimelineSection({ studentId, onAddConsultation }: TimelineSectionProps) {
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(false)

  // 타임라인 로드
  useEffect(() => {
    if (!studentId) {
      setTimeline([])
      return
    }

    const loadTimeline = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/funnel/student-timeline?studentId=${studentId}`)
        if (response.ok) {
          const data = await response.json()
          setTimeline(data.timeline || [])
        } else {
          toast.error('타임라인을 불러오는데 실패했습니다.')
        }
      } catch (error) {
        console.error('Failed to load timeline:', error)
        toast.error('타임라인을 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadTimeline()
  }, [studentId])

  if (!studentId) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
          <p className="text-sm">학생을 선택하면 상담 이력이 표시됩니다</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          상담 타임라인
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={onAddConsultation}
          className="h-7 text-xs"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          새 이력
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : timeline.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">상담 이력이 없습니다</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="relative">
              {/* 타임라인 선 */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

              <div className="space-y-4">
                {timeline.map((item, index) => (
                  <TimelineItemComponent key={`${item.type}-${index}`} item={item} />
                ))}
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

function TimelineItemComponent({ item }: { item: TimelineItem }) {
  const date = new Date(item.date)
  const formattedDate = format(date, 'MM.dd (EEE)', { locale: ko })
  const formattedTime = format(date, 'HH:mm')

  if (item.type === 'consultation') {
    const data = item.data as ConsultationData
    const typeColor = CONSULTATION_TYPE_COLORS[data.consultationType] || CONSULTATION_TYPE_COLORS['기타']

    return (
      <div className="relative pl-10">
        {/* 아이콘 */}
        <div className="absolute left-0 w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center">
          {METHOD_ICONS[data.method || ''] || <MessageSquare className="h-3.5 w-3.5" />}
        </div>

        {/* 내용 */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          {/* 헤더 */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn("text-xs", typeColor)}>
              {data.consultationType}
            </Badge>
            {data.method && (
              <span className="text-xs text-muted-foreground">{data.method}</span>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {formattedDate} {formattedTime}
            </span>
          </div>

          {/* 내용 */}
          {data.content && (
            <p className="text-sm line-clamp-3">{data.content}</p>
          )}

          {/* 담당자 */}
          <p className="text-xs text-muted-foreground">
            담당: {data.counselorName}
          </p>

          {/* AI 분석 태그 */}
          {data.aiAnalyzed && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t">
              <Sparkles className="h-3 w-3 text-amber-500" />
              {data.aiHurdle && (
                <Badge variant="outline" className={cn("text-xs", AI_TAG_COLORS.hurdle)}>
                  {AI_TAG_LABELS.hurdle[data.aiHurdle as keyof typeof AI_TAG_LABELS.hurdle] || data.aiHurdle}
                </Badge>
              )}
              {data.aiReadiness && (
                <Badge variant="outline" className={cn("text-xs", AI_TAG_COLORS.readiness)}>
                  {AI_TAG_LABELS.readiness[data.aiReadiness as keyof typeof AI_TAG_LABELS.readiness] || data.aiReadiness}
                </Badge>
              )}
              {data.aiDecisionMaker && (
                <Badge variant="outline" className={cn("text-xs", AI_TAG_COLORS.decision_maker)}>
                  {AI_TAG_LABELS.decision_maker[data.aiDecisionMaker as keyof typeof AI_TAG_LABELS.decision_maker] || data.aiDecisionMaker}
                </Badge>
              )}
              {data.aiSentiment && (
                <Badge variant="outline" className={cn("text-xs", AI_TAG_COLORS.sentiment)}>
                  {AI_TAG_LABELS.sentiment[data.aiSentiment as keyof typeof AI_TAG_LABELS.sentiment] || data.aiSentiment}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // 입학테스트
  if (item.type === 'entrance_test') {
    const data = item.data as EntranceTestData

    return (
      <div className="relative pl-10">
        {/* 아이콘 */}
        <div className="absolute left-0 w-8 h-8 rounded-full bg-background border-2 border-amber-500 flex items-center justify-center">
          <FileText className="h-3.5 w-3.5 text-amber-500" />
        </div>

        {/* 내용 */}
        <div className="bg-amber-50/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700">
              입학테스트
            </Badge>
            <span className="text-xs text-muted-foreground ml-auto">
              {formattedDate}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {data.test1Level && (
              <div>
                <span className="text-muted-foreground">진단1: </span>
                <span className="font-medium">{data.test1Level}</span>
                {data.test1Score && <span className="text-muted-foreground ml-1">({data.test1Score}점)</span>}
              </div>
            )}
            {data.test2Level && (
              <div>
                <span className="text-muted-foreground">진단2: </span>
                <span className="font-medium">{data.test2Level}</span>
                {data.test2Score && <span className="text-muted-foreground ml-1">({data.test2Score}점)</span>}
              </div>
            )}
            {data.testResult && (
              <div className="col-span-2">
                <span className="text-muted-foreground">결과: </span>
                <span className="font-medium">{data.testResult}</span>
              </div>
            )}
            {data.recommendedClass && (
              <div className="col-span-2">
                <span className="text-muted-foreground">추천반: </span>
                <span className="font-medium">{data.recommendedClass}</span>
              </div>
            )}
          </div>

          {data.notes && (
            <p className="text-xs text-muted-foreground">{data.notes}</p>
          )}
        </div>
      </div>
    )
  }

  return null
}
