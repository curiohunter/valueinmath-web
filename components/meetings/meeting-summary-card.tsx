"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { FileText, Pencil, Check, X, Lightbulb } from "lucide-react"
import { toast } from "sonner"
import { updateMeeting } from "@/services/meeting-service"
import { MeetingHedyBadge } from "./meeting-hedy-badge"
import type { MeetingWithDetails, HedyTopicOverview } from "@/types/meeting"

interface MeetingSummaryCardProps {
  meeting: MeetingWithDetails
  onUpdate: () => void
}

function TopicOverviewSection({ overview }: { overview: HedyTopicOverview }) {
  return (
    <div className="mt-4 pt-4 border-t border-purple-200">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="h-4 w-4 text-purple-600" />
        <span className="text-sm font-medium">다음 회의 준비 노트</span>
      </div>
      {overview.overviewParagraphs?.map((p, i) => (
        <p key={i} className="text-sm text-muted-foreground leading-relaxed mb-2">
          {p}
        </p>
      ))}
      {overview.prepNote && (
        <div className="mt-2">
          <p className="text-sm font-medium mb-1">{overview.prepNote.title}</p>
          <ul className="space-y-1">
            {overview.prepNote.bullets.map((bullet, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-purple-500 mt-0.5">-</span>
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function MeetingSummaryCard({ meeting, onUpdate }: MeetingSummaryCardProps) {
  const [editing, setEditing] = useState(false)
  const [recapValue, setRecapValue] = useState(meeting.recap || "")

  const handleSave = async () => {
    try {
      await updateMeeting(meeting.id, { recap: recapValue })
      toast.success("요약이 수정되었습니다.")
      setEditing(false)
      onUpdate()
    } catch (error: any) {
      toast.error(`수정 실패: ${error.message}`)
    }
  }

  if (!meeting.recap && !meeting.topic?.overview) {
    return null
  }

  return (
    <Card className="border-purple-200 bg-purple-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-purple-600" />
          <span className="flex-1">AI 요약</span>
          <MeetingHedyBadge />
          {!editing && meeting.recap && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={recapValue}
              onChange={(e) => setRecapValue(e.target.value)}
              rows={6}
              className="text-sm bg-white"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                <Check className="h-3 w-3 mr-1" /> 저장
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setRecapValue(meeting.recap || "") }}>
                <X className="h-3 w-3 mr-1" /> 취소
              </Button>
            </div>
          </div>
        ) : (
          <>
            {meeting.recap && (
              <div className="space-y-2">
                {meeting.recap.split("\n").filter(Boolean).map((line, i) => (
                  <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                    {line}
                  </p>
                ))}
              </div>
            )}
            {meeting.topic?.overview && (
              <TopicOverviewSection overview={meeting.topic.overview} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
