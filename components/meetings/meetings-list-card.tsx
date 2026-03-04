"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, ListTodo, MessageSquareText } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { Meeting, MeetingStatus } from "@/types/meeting"

interface MeetingsListCardProps {
  meetings: Meeting[]
  isLoading: boolean
  onSelect: (id: string) => void
}

const statusLabels: Record<MeetingStatus, string> = {
  draft: "초안",
  synced: "동기화됨",
  finalized: "확정",
}

const statusColors: Record<MeetingStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  synced: "bg-blue-100 text-blue-700",
  finalized: "bg-green-100 text-green-700",
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

export function MeetingsListCard({ meetings, isLoading, onSelect }: MeetingsListCardProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (meetings.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <MessageSquareText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">회의 기록이 없습니다</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Hedy AI로 회의를 녹음하면 자동으로 동기화됩니다.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {meetings.map((meeting) => (
        <Card
          key={meeting.id}
          className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30 overflow-hidden"
          onClick={() => onSelect(meeting.id)}
        >
          <div className="flex">
            {/* Topic color bar */}
            {meeting.topic?.color && (
              <div
                className="w-1 shrink-0"
                style={{ backgroundColor: `#${meeting.topic.color}` }}
              />
            )}
            <CardContent className="p-4 flex-1 min-w-0">
              {/* Top row: badges + date */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                  {meeting.topic?.name && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0"
                      style={{
                        borderColor: meeting.topic.color ? `#${meeting.topic.color}` : undefined,
                        color: meeting.topic.color ? `#${meeting.topic.color}` : undefined,
                      }}
                    >
                      {meeting.topic.name}
                    </Badge>
                  )}
                  <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${statusColors[meeting.status]}`}>
                    {statusLabels[meeting.status]}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatDate(meeting.meeting_date)}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-medium text-sm truncate mb-1">
                {meeting.title}
              </h3>

              {/* Recap preview */}
              {meeting.recap && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {meeting.recap.slice(0, 200)}
                </p>
              )}

              {/* Meta row */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {meeting.duration_minutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {meeting.duration_minutes}분
                  </span>
                )}
                {meeting.start_time && (
                  <span>
                    {formatTime(meeting.start_time)}
                  </span>
                )}
              </div>
            </CardContent>
          </div>
        </Card>
      ))}
    </div>
  )
}
