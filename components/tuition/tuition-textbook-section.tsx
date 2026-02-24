"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, BookOpen, Plus, ArrowRight, Clock, Check, X as XIcon } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import {
  getStudentAssignments,
  applyTextbookToTuition,
  type TextbookAssignment,
} from "@/services/textbook-service"
import type { AssignmentStatus } from "@/types/textbook"

interface TuitionTextbookSectionProps {
  studentId: string
  studentName: string
  tuitionFeeId: string
  onChargeApplied?: () => void
  readOnly?: boolean
}

const STATUS_CONFIG: Record<AssignmentStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: "대기중",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: <Clock className="w-3 h-3" />,
  },
  applied: {
    label: "수강료적용",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <Check className="w-3 h-3" />,
  },
  cancelled: {
    label: "취소됨",
    color: "bg-gray-100 text-gray-500 border-gray-200",
    icon: <XIcon className="w-3 h-3" />,
  },
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "-"
  const date = new Date(dateStr)
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function TuitionTextbookSection({
  studentId,
  studentName,
  tuitionFeeId,
  onChargeApplied,
  readOnly = false,
}: TuitionTextbookSectionProps) {
  const supabase = createClient()
  const [assignments, setAssignments] = useState<TextbookAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadAssignments = async () => {
    setLoading(true)
    try {
      const result = await getStudentAssignments(supabase, studentId)
      if (result.success && result.data) {
        setAssignments(result.data)
      }
    } catch (error) {
      console.error("교재 배정 로드 오류:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (studentId) {
      loadAssignments()
    }
  }, [studentId])

  const handleApplyToTuition = async (assignmentId: string) => {
    const confirm = window.confirm("이 교재비를 현재 수강료에 추가하시겠습니까?")
    if (!confirm) return

    setActionLoading(assignmentId)
    try {
      const result = await applyTextbookToTuition(supabase, assignmentId, tuitionFeeId)
      if (result.success) {
        toast.success("교재비가 수강료에 추가되었습니다")
        loadAssignments()
        onChargeApplied?.()
      } else {
        toast.error(result.error || "적용에 실패했습니다")
      }
    } catch (error) {
      toast.error("오류가 발생했습니다")
    } finally {
      setActionLoading(null)
    }
  }

  const pendingAssignments = assignments.filter((a) => a.status === "pending")
  const otherAssignments = assignments.filter((a) => a.status !== "pending")

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-500" />
          교재 배정 내역
          {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </h2>
      </div>

      {/* 대기중 배정 (액션 필요) */}
      {pendingAssignments.length > 0 && (
        <div className="space-y-2 mb-4">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            교재비 적용 대기 ({pendingAssignments.length}건)
          </div>
          {pendingAssignments.map((assignment) => {
            const textbook = assignment.textbook as any
            return (
              <div
                key={assignment.id}
                className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-indigo-800 truncate">
                    {textbook?.name || assignment.textbook_name_snapshot || "교재"}
                  </div>
                  <div className="text-xs text-indigo-600 flex items-center gap-2">
                    <span>x{assignment.quantity}</span>
                    <span>({formatDate(assignment.assigned_at)})</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-indigo-700">
                    +{assignment.total_price.toLocaleString()}원
                  </span>
                  {!readOnly && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs bg-indigo-100 text-indigo-700 border-indigo-300 hover:bg-indigo-200"
                      onClick={() => handleApplyToTuition(assignment.id)}
                      disabled={actionLoading === assignment.id}
                    >
                      {actionLoading === assignment.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <ArrowRight className="w-3 h-3 mr-1" />
                          교재비 적용
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 처리 완료된 배정 */}
      {otherAssignments.length > 0 && (
        <div className="space-y-2">
          {pendingAssignments.length > 0 && (
            <div className="text-xs font-medium text-muted-foreground mb-2">
              처리 완료 ({otherAssignments.length}건)
            </div>
          )}
          {otherAssignments.map((assignment) => {
            const textbook = assignment.textbook as any
            const statusConfig = STATUS_CONFIG[assignment.status as AssignmentStatus]

            return (
              <div
                key={assignment.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {textbook?.name || assignment.textbook_name_snapshot || "교재"}
                    </span>
                    <Badge variant="outline" className={`text-xs ${statusConfig.color}`}>
                      {statusConfig.icon}
                      <span className="ml-1">{statusConfig.label}</span>
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    x{assignment.quantity} ({formatDate(assignment.assigned_at)})
                  </div>
                </div>
                <span className="font-medium text-muted-foreground">
                  +{assignment.total_price.toLocaleString()}원
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* 배정 없음 */}
      {assignments.length === 0 && !loading && (
        <div className="text-sm text-muted-foreground text-center py-6">
          교재 배정 내역이 없습니다
        </div>
      )}
    </Card>
  )
}
