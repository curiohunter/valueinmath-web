"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Settings, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { updateMeeting, deleteMeeting } from "@/services/meeting-service"
import type { MeetingWithDetails, MeetingStatus } from "@/types/meeting"

interface MeetingQuickActionsProps {
  meeting: MeetingWithDetails
  onUpdate: () => void
}

const statusLabels: Record<MeetingStatus, string> = {
  draft: "초안",
  synced: "동기화됨",
  finalized: "확정",
}

export function MeetingQuickActions({ meeting, onUpdate }: MeetingQuickActionsProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const handleStatusChange = async (status: MeetingStatus) => {
    try {
      await updateMeeting(meeting.id, { status })
      toast.success(`상태가 "${statusLabels[status]}"(으)로 변경되었습니다.`)
      onUpdate()
    } catch (error: any) {
      toast.error(`상태 변경 실패: ${error.message}`)
    }
  }

  const handleDelete = async () => {
    if (!confirm("이 회의를 삭제하시겠습니까? 모든 관련 데이터가 함께 삭제됩니다.")) return

    setDeleting(true)
    try {
      await deleteMeeting(meeting.id)
      toast.success("회의가 삭제되었습니다.")
      router.push("/meetings")
    } catch (error: any) {
      toast.error(`삭제 실패: ${error.message}`)
      setDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings className="h-4 w-4" />
          빠른 작업
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status change */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">회의 상태</label>
          <Select
            value={meeting.status}
            onValueChange={(v) => handleStatusChange(v as MeetingStatus)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Delete */}
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Trash2 className="h-3 w-3 mr-1" />
          )}
          회의 삭제
        </Button>
      </CardContent>
    </Card>
  )
}
