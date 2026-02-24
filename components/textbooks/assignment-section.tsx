"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, X, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import {
  getTextbookAssignments,
  cancelAssignment,
} from "@/services/textbook-service"
import {
  ASSIGNMENT_STATUS_LABELS,
  type TextbookAssignment,
  type AssignmentStatus,
} from "@/types/textbook"
import { BulkAssignmentSheet } from "./bulk-assignment-sheet"

interface AssignmentSectionProps {
  textbookId: string
  textbookName: string
  textbookPrice: number
  currentStock: number
  refreshKey?: number
  onAssignmentChange?: (stockDelta: number) => void
}

const STATUS_COLORS: Record<AssignmentStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  applied: "bg-blue-100 text-blue-700 border-blue-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
}

export function AssignmentSection({
  textbookId,
  textbookName,
  textbookPrice,
  currentStock,
  refreshKey,
  onAssignmentChange,
}: AssignmentSectionProps) {
  const supabase = createClient()
  const [assignments, setAssignments] = useState<TextbookAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const loadAssignments = async () => {
    setLoading(true)
    try {
      const result = await getTextbookAssignments(supabase, textbookId)
      if (result.success && result.data) {
        setAssignments(result.data)
      }
    } catch (error) {
      console.error("배정 목록 로드 오류:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAssignments()
  }, [textbookId, refreshKey])

  const handleBulkComplete = (assignedCount: number, stockUsed: number) => {
    loadAssignments()
    onAssignmentChange?.(-stockUsed)
  }

  const handleCancel = async (assignmentId: string) => {
    const confirm = window.confirm("이 배정을 취소하시겠습니까? 재고가 복원됩니다.")
    if (!confirm) return

    // 취소할 배정의 수량을 미리 조회
    const cancelledAssignment = assignments.find((a) => a.id === assignmentId)
    const cancelledQuantity = cancelledAssignment?.quantity || 0

    setActionLoading(assignmentId)
    try {
      const result = await cancelAssignment(supabase, assignmentId)
      if (result.success) {
        toast.success("배정이 취소되었습니다")
        loadAssignments()
        onAssignmentChange?.(cancelledQuantity)
      } else {
        toast.error(result.error || "취소에 실패했습니다")
      }
    } catch (error) {
      toast.error("오류가 발생했습니다")
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          배정 학생
          {loading && <Loader2 className="w-3 h-3 animate-spin" />}
        </h3>
        <Button variant="outline" size="sm" onClick={() => setSheetOpen(true)}>
          <Plus className="w-3 h-3 mr-1" />
          배정
        </Button>
      </div>

      {assignments.length === 0 && !loading ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          배정된 학생이 없습니다
        </div>
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {(a.student as any)?.name || a.student_name_snapshot || "알 수 없음"}
                </span>
                <span className="text-muted-foreground">x{a.quantity}</span>
                <Badge variant="outline" className={STATUS_COLORS[a.status as AssignmentStatus]}>
                  {ASSIGNMENT_STATUS_LABELS[a.status as AssignmentStatus]}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{a.total_price.toLocaleString()}원</span>
                {a.status === "pending" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleCancel(a.id)}
                    disabled={actionLoading === a.id}
                  >
                    {actionLoading === a.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <X className="w-3 h-3" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <BulkAssignmentSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        textbookId={textbookId}
        textbookName={textbookName}
        textbookPrice={textbookPrice}
        currentStock={currentStock}
        onComplete={handleBulkComplete}
      />
    </div>
  )
}
