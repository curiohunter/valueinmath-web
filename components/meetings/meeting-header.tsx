"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Calendar, Clock, Users, Timer, Pencil, Check, X } from "lucide-react"
import { toast } from "sonner"
import { updateMeeting } from "@/services/meeting-service"
import type { MeetingWithDetails, MeetingStatus } from "@/types/meeting"

interface MeetingHeaderProps {
  meeting: MeetingWithDetails
  onUpdate: () => void
}

const statusLabels: Record<MeetingStatus, string> = {
  draft: "초안",
  synced: "동기화됨",
  finalized: "확정",
}

const statusColors: Record<MeetingStatus, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-300",
  synced: "bg-blue-100 text-blue-700 border-blue-300",
  finalized: "bg-green-100 text-green-700 border-green-300",
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function MeetingHeader({ meeting, onUpdate }: MeetingHeaderProps) {
  const router = useRouter()
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(meeting.title)

  const handleSaveTitle = async () => {
    if (!titleValue.trim() || titleValue === meeting.title) {
      setEditingTitle(false)
      return
    }
    try {
      await updateMeeting(meeting.id, { title: titleValue.trim() })
      toast.success("제목이 수정되었습니다.")
      setEditingTitle(false)
      onUpdate()
    } catch (error: any) {
      toast.error(`수정 실패: ${error.message}`)
    }
  }

  return (
    <div className="space-y-2">
      {/* Back button + Title row */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 mt-0.5"
          onClick={() => router.push("/meetings")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle()
                  if (e.key === "Escape") setEditingTitle(false)
                }}
                className="text-xl font-bold h-9"
                autoFocus
              />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveTitle}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingTitle(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight truncate">
                {meeting.title}
              </h1>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setEditingTitle(true)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Badges + Meta */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {meeting.topic?.name && (
              <Badge
                variant="outline"
                className="text-xs"
                style={{
                  borderColor: meeting.topic.color ? `#${meeting.topic.color}` : undefined,
                  color: meeting.topic.color ? `#${meeting.topic.color}` : undefined,
                }}
              >
                {meeting.topic.name}
              </Badge>
            )}
            <Badge variant="outline" className={`text-xs ${statusColors[meeting.status]}`}>
              {statusLabels[meeting.status]}
            </Badge>
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(meeting.meeting_date)}
            </span>
            {meeting.start_time && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(meeting.start_time)}
                {meeting.end_time && ` ~ ${formatTime(meeting.end_time)}`}
              </span>
            )}
            {meeting.duration_minutes && (
              <span className="flex items-center gap-1">
                <Timer className="h-3 w-3" />
                {meeting.duration_minutes}분
              </span>
            )}
            {meeting.participants.length > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                참석 {meeting.participants.length}명
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
