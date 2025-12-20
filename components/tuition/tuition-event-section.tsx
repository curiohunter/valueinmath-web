"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  Gift,
  Plus,
  Trash2,
  Loader2,
  Check,
  Clock,
  ArrowRight,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  getCampaigns,
  getStudentParticipations,
  addParticipant,
  removeParticipant,
  markRewardPaid,
  applyRewardToTuition,
  type Campaign,
  type CampaignParticipant,
  type RewardStatus,
} from "@/services/campaign-service"
import { TuitionEventPopover } from "./tuition-event-popover"

interface TuitionEventSectionProps {
  studentId: string
  studentName: string
  tuitionFeeId: string
  onDiscountApplied?: () => void
  readOnly?: boolean
}

const formatAmount = (amount: number, type?: string) => {
  if (type === "percent") {
    return `${amount}%`
  }
  return amount.toLocaleString() + "원"
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

const STATUS_CONFIG: Record<RewardStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: "대기중",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: <Clock className="w-3 h-3" />,
  },
  paid: {
    label: "지급완료",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: <Check className="w-3 h-3" />,
  },
  applied: {
    label: "학원비적용",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <ArrowRight className="w-3 h-3" />,
  },
  cancelled: {
    label: "취소됨",
    color: "bg-gray-100 text-gray-500 border-gray-200",
    icon: null,
  },
}

export function TuitionEventSection({
  studentId,
  studentName,
  tuitionFeeId,
  onDiscountApplied,
  readOnly = false,
}: TuitionEventSectionProps) {
  const supabase = createClient()
  const [participations, setParticipations] = useState<CampaignParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // 참여 이력 로드
  const loadParticipations = async () => {
    setLoading(true)
    try {
      const result = await getStudentParticipations(supabase, studentId)
      if (result.success && result.data) {
        setParticipations(result.data)
      }
    } catch (error) {
      console.error("참여 이력 로드 오류:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (studentId) {
      loadParticipations()
    }
  }, [studentId])

  // 참여 삭제
  const handleRemove = async (participantId: string) => {
    const confirm = window.confirm("이 이벤트 참여를 삭제하시겠습니까?")
    if (!confirm) return

    setActionLoading(participantId)
    try {
      const result = await removeParticipant(supabase, participantId)
      if (result.success) {
        toast.success("삭제되었습니다")
        loadParticipations()
      } else {
        toast.error(result.error || "삭제에 실패했습니다")
      }
    } catch (error) {
      toast.error("오류가 발생했습니다")
    } finally {
      setActionLoading(null)
    }
  }

  // 현금 보상 지급완료 처리
  const handleMarkPaid = async (participantId: string) => {
    const confirm = window.confirm("현금 보상을 지급 완료 처리하시겠습니까?")
    if (!confirm) return

    setActionLoading(participantId)
    try {
      const result = await markRewardPaid(supabase, participantId)
      if (result.success) {
        toast.success("지급 완료 처리되었습니다")
        loadParticipations()
      } else {
        toast.error(result.error || "처리에 실패했습니다")
      }
    } catch (error) {
      toast.error("오류가 발생했습니다")
    } finally {
      setActionLoading(null)
    }
  }

  // 학원비에 할인 적용
  const handleApplyToTuition = async (participantId: string) => {
    const confirm = window.confirm("이 혜택을 현재 학원비에 할인으로 적용하시겠습니까?")
    if (!confirm) return

    setActionLoading(participantId)
    try {
      const result = await applyRewardToTuition(supabase, participantId, tuitionFeeId)
      if (result.success) {
        toast.success("학원비에 할인이 적용되었습니다")
        loadParticipations()
        onDiscountApplied?.()
      } else {
        toast.error(result.error || "적용에 실패했습니다")
      }
    } catch (error) {
      toast.error("오류가 발생했습니다")
    } finally {
      setActionLoading(null)
    }
  }

  // pending 상태인 참여만 필터 (액션 필요)
  const pendingParticipations = participations.filter(p => p.reward_status === "pending")
  const otherParticipations = participations.filter(p => p.reward_status !== "pending")

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Gift className="w-5 h-5 text-amber-500" />
          이벤트 참여 이력
          {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </h2>
        {!readOnly && (
          <TuitionEventPopover
            studentId={studentId}
            studentName={studentName}
            onSuccess={loadParticipations}
            trigger={
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                참여 추가
              </Button>
            }
          />
        )}
      </div>

      {/* 대기중 참여 (액션 필요) */}
      {pendingParticipations.length > 0 && (
        <div className="space-y-2 mb-4">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            처리 필요 ({pendingParticipations.length}건)
          </div>
          {pendingParticipations.map(participation => {
            const campaign = participation.campaign as Campaign | undefined
            const statusConfig = STATUS_CONFIG[participation.reward_status]
            const isCashReward = campaign?.reward_type === "cash"

            return (
              <div
                key={participation.id}
                className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-amber-800 truncate">
                    {campaign?.title || "이벤트"}
                  </div>
                  <div className="text-xs text-amber-600 flex items-center gap-2">
                    <span>{formatDate(participation.participated_at)}</span>
                    {participation.referrer_name_snapshot && (
                      <span>• 추천인: {participation.referrer_name_snapshot}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-700">
                    {formatAmount(participation.reward_amount, (participation as any).reward_amount_type)}
                  </span>
                  {!readOnly && (
                    <div className="flex gap-1">
                      {isCashReward ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                          onClick={() => handleMarkPaid(participation.id)}
                          disabled={actionLoading === participation.id}
                        >
                          {actionLoading === participation.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            "지급완료"
                          )}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                          onClick={() => handleApplyToTuition(participation.id)}
                          disabled={actionLoading === participation.id}
                        >
                          {actionLoading === participation.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            "할인적용"
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRemove(participation.id)}
                        disabled={actionLoading === participation.id}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 처리 완료된 참여 */}
      {otherParticipations.length > 0 && (
        <div className="space-y-2">
          {pendingParticipations.length > 0 && (
            <div className="text-xs font-medium text-muted-foreground mb-2">
              처리 완료 ({otherParticipations.length}건)
            </div>
          )}
          {otherParticipations.map(participation => {
            const campaign = participation.campaign as Campaign | undefined
            const statusConfig = STATUS_CONFIG[participation.reward_status]

            return (
              <div
                key={participation.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {campaign?.title || "이벤트"}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${statusConfig.color}`}
                    >
                      {statusConfig.icon}
                      <span className="ml-1">{statusConfig.label}</span>
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{formatDate(participation.participated_at)}</span>
                    {participation.referrer_name_snapshot && (
                      <span>• 추천인: {participation.referrer_name_snapshot}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-muted-foreground">
                    {formatAmount(participation.reward_amount, (participation as any).reward_amount_type)}
                  </span>
                  {!readOnly && participation.reward_status !== "applied" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleRemove(participation.id)}
                      disabled={actionLoading === participation.id}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 참여 이력 없음 */}
      {participations.length === 0 && !loading && (
        <div className="text-sm text-muted-foreground text-center py-6">
          이벤트 참여 이력이 없습니다
        </div>
      )}
    </Card>
  )
}
