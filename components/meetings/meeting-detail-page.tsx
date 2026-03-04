"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { useMeetingDetail } from "@/hooks/use-meetings"
import { MeetingHeader } from "./meeting-header"
import { MeetingSummaryCard } from "./meeting-summary-card"
import { MeetingItemsSection } from "./meeting-items-section"
import { MeetingParticipantsGrid } from "./meeting-participants-grid"
import { MeetingActionItemsCard } from "./meeting-action-items-card"
import { MeetingQuickActions } from "./meeting-quick-actions"
import { MeetingCollapsibleSection } from "./meeting-collapsible-section"
import { MeetingHedyBadge } from "./meeting-hedy-badge"
import { MessageSquare, Mic } from "lucide-react"

interface MeetingDetailPageProps {
  meetingId: string
}

export function MeetingDetailPage({ meetingId }: MeetingDetailPageProps) {
  const { meeting, isLoading, mutate } = useMeetingDetail(meetingId)

  if (isLoading || !meeting) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <MeetingHeader meeting={meeting} onUpdate={mutate} />

      {/* 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (wider) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Meeting Items (논의/결정/재논의) — AI 분류 요약 */}
          <MeetingItemsSection meeting={meeting} onUpdate={mutate} />

          {/* AI Summary (recap) */}
          <MeetingSummaryCard meeting={meeting} onUpdate={mutate} />

          {/* AI Coaching */}
          {meeting.conversations && (
            <MeetingCollapsibleSection
              title="AI 코칭"
              icon={<MessageSquare className="h-4 w-4 text-purple-600" />}
              badge={<MeetingHedyBadge />}
              defaultOpen={false}
              className="border-purple-200 bg-purple-50/30"
            >
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {meeting.conversations}
              </div>
            </MeetingCollapsibleSection>
          )}

          {/* Transcript */}
          {meeting.transcript && (
            <MeetingCollapsibleSection
              title="녹취록"
              icon={<Mic className="h-4 w-4 text-purple-600" />}
              badge={<MeetingHedyBadge />}
              defaultOpen={false}
              className="border-purple-200 bg-purple-50/30"
            >
              <div className="max-h-96 overflow-y-auto">
                <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-muted-foreground">
                  {meeting.transcript}
                </pre>
              </div>
            </MeetingCollapsibleSection>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Participants */}
          <MeetingParticipantsGrid
            meetingId={meeting.id}
            participants={meeting.participants}
            onUpdate={mutate}
          />

          {/* Action Items */}
          <MeetingActionItemsCard
            meetingId={meeting.id}
            actionItems={meeting.action_items}
            onUpdate={mutate}
          />

          {/* Quick Actions */}
          <MeetingQuickActions meeting={meeting} onUpdate={mutate} />
        </div>
      </div>
    </div>
  )
}
