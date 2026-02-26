"use client"

import { useState, useEffect, useCallback } from "react"
import { useWizard } from "./wizard-context"
import { WizardNavigation } from "./wizard-steps"
import { createClient } from "@/lib/supabase/client"
import {
  getApplicablePoliciesBatch,
  getPendingRewards,
  calculatePolicyDiscount,
  getCampaigns,
  addParticipant,
  type Campaign,
  type CampaignParticipant,
} from "@/services/campaign-service"
import type { AppliedDiscount } from "@/types/tuition"
import type { ClassSessionSegment } from "@/types/tuition-session"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, Gift, Tag, Plus, X, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface StepDiscountProps {
  selectedStudentsByClass: Map<string, Set<string>>
  studentsByClass: Map<string, { id: string; name: string; class_id: string; class_name: string }[]>
  segments: ClassSessionSegment[]
}

export function StepDiscount({ selectedStudentsByClass, studentsByClass, segments }: StepDiscountProps) {
  const { state, dispatch } = useWizard()
  const [isLoading, setIsLoading] = useState(true)

  // 반별 금액 맵
  const amountByClass = new Map<string, number>()
  for (const seg of segments) {
    if (!amountByClass.has(seg.classId)) {
      amountByClass.set(seg.classId, seg.calculatedAmount)
    }
  }

  // 모든 선택된 학생 ID
  const allStudentIds = [...selectedStudentsByClass.values()].flatMap((ids) => [...ids])

  // 데이터 로드
  useEffect(() => {
    async function fetchDiscountData() {
      setIsLoading(true)
      const supabase = createClient()

      try {
        const [policiesRes, rewardsRes] = await Promise.all([
          getApplicablePoliciesBatch(supabase, allStudentIds),
          getPendingRewards(supabase),
        ])

        if (policiesRes.success && policiesRes.data) {
          dispatch({ type: "SET_POLICIES", data: policiesRes.data })
        }

        if (rewardsRes.success && rewardsRes.data) {
          // 학생별로 그룹화
          const byStudent: Record<string, CampaignParticipant[]> = {}
          for (const r of rewardsRes.data) {
            const sid = r.student_id
            if (!allStudentIds.includes(sid)) continue
            if (!byStudent[sid]) byStudent[sid] = []
            byStudent[sid].push(r)
          }
          dispatch({ type: "SET_PENDING_REWARDS", data: byStudent })
        }
      } catch (err) {
        console.error("할인 데이터 로드 실패:", err)
        toast.error("할인 데이터를 불러오지 못했습니다")
      } finally {
        setIsLoading(false)
      }
    }
    fetchDiscountData()
  }, [])

  const handleApplyPolicy = useCallback(
    (entryKey: string, policy: Campaign, baseAmount: number) => {
      const { discountAmount } = calculatePolicyDiscount(policy, baseAmount)
      const discount: AppliedDiscount = {
        id: policy.id,
        type: "policy",
        title: policy.reward_amount_type === "percent"
          ? `${policy.title} (${policy.reward_amount}%)`
          : policy.title,
        amount: discountAmount,
        amountType: policy.reward_amount_type,
        rawValue: policy.reward_amount,
      }
      dispatch({ type: "APPLY_DISCOUNT", entryKey, discount })
    },
    [dispatch],
  )

  const handleApplyReward = useCallback(
    (entryKey: string, participant: CampaignParticipant, baseAmount: number) => {
      const amountType = participant.reward_amount_type || "fixed"
      const discountAmount = amountType === "percent"
        ? Math.round(baseAmount * (participant.reward_amount / 100))
        : participant.reward_amount
      const campaignTitle = (participant.campaign as Campaign | undefined)?.title ?? "이벤트"
      const discount: AppliedDiscount = {
        id: participant.id,
        type: "event",
        title: amountType === "percent"
          ? `${campaignTitle} (${participant.reward_amount}%)`
          : campaignTitle,
        amount: discountAmount,
        amountType,
        rawValue: participant.reward_amount,
      }
      dispatch({ type: "APPLY_DISCOUNT", entryKey, discount })
    },
    [dispatch],
  )

  const handlePrev = useCallback(() => dispatch({ type: "GO_TO_STEP", step: 1 }), [dispatch])
  const handleNext = useCallback(() => dispatch({ type: "NEXT_STEP" }), [dispatch])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
        <span className="text-sm text-slate-500">할인 정보 로딩 중...</span>
      </div>
    )
  }

  // 반별 학생 카드 렌더링
  const classEntries = [...selectedStudentsByClass.entries()].filter(([, ids]) => ids.size > 0)

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className="text-xs text-slate-500">
          학생별로 적용 가능한 할인을 확인하고 적용하세요. 건너뛰려면 &quot;다음&quot;을 클릭하세요.
        </p>

        {classEntries.map(([classId, studentIds]) => {
          const classStudents = studentsByClass.get(classId) ?? []
          const className = classStudents[0]?.class_name ?? ""
          const baseAmount = amountByClass.get(classId) ?? 0

          return (
            <div key={classId} className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700">{className}</h3>
              {[...studentIds].map((studentId) => {
                const student = classStudents.find((s) => s.id === studentId)
                if (!student) return null
                const entryKey = `${classId}:${studentId}`

                return (
                  <StudentDiscountCard
                    key={entryKey}
                    entryKey={entryKey}
                    studentId={studentId}
                    studentName={student.name}
                    baseAmount={baseAmount}
                    policies={state.policiesByStudent[studentId] ?? []}
                    pendingRewards={state.pendingRewardsByStudent[studentId] ?? []}
                    appliedDiscounts={state.discountsByEntry[entryKey] ?? []}
                    onApplyPolicy={handleApplyPolicy}
                    onApplyReward={handleApplyReward}
                    onRemoveDiscount={(discountId) =>
                      dispatch({ type: "REMOVE_DISCOUNT", entryKey, discountId })
                    }
                    onRewardAdded={(participant) => {
                      // pendingRewards에 추가
                      const current = state.pendingRewardsByStudent[studentId] ?? []
                      dispatch({
                        type: "SET_PENDING_REWARDS",
                        data: {
                          ...state.pendingRewardsByStudent,
                          [studentId]: [...current, participant],
                        },
                      })
                    }}
                  />
                )
              })}
            </div>
          )
        })}
      </div>

      <WizardNavigation onPrev={handlePrev} onNext={handleNext} />
    </div>
  )
}

// --- 학생별 할인 카드 ---

interface StudentDiscountCardProps {
  entryKey: string
  studentId: string
  studentName: string
  baseAmount: number
  policies: Campaign[]
  pendingRewards: CampaignParticipant[]
  appliedDiscounts: AppliedDiscount[]
  onApplyPolicy: (entryKey: string, policy: Campaign, baseAmount: number) => void
  onApplyReward: (entryKey: string, participant: CampaignParticipant, baseAmount: number) => void
  onRemoveDiscount: (discountId: string) => void
  onRewardAdded: (participant: CampaignParticipant) => void
}

function StudentDiscountCard({
  entryKey,
  studentId,
  studentName,
  baseAmount,
  policies,
  pendingRewards,
  appliedDiscounts,
  onApplyPolicy,
  onApplyReward,
  onRemoveDiscount,
  onRewardAdded,
}: StudentDiscountCardProps) {
  const totalDiscount = appliedDiscounts.reduce((sum, d) => sum + d.amount, 0)
  const appliedIds = new Set(appliedDiscounts.map((d) => d.id))

  return (
    <Card className="border-slate-200">
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium">{studentName}</CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">{baseAmount.toLocaleString()}원</span>
            {totalDiscount > 0 && (
              <span className="text-red-500 font-medium">-{totalDiscount.toLocaleString()}원</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-2 space-y-1.5">
        {/* 적용 가능한 정책 할인 */}
        {policies.map((policy) => {
          const isApplied = appliedIds.has(policy.id)
          const { discountAmount } = calculatePolicyDiscount(policy, baseAmount)
          return (
            <div key={policy.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <Tag className="w-3 h-3 text-blue-500" />
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-blue-50 text-blue-600 border-blue-200">
                  자동추천
                </Badge>
                <span className="text-slate-700">{policy.title}</span>
                <span className="text-slate-400">-{discountAmount.toLocaleString()}원</span>
              </div>
              {isApplied ? (
                <button
                  onClick={() => onRemoveDiscount(policy.id)}
                  className="flex items-center gap-0.5 text-green-600 hover:text-red-500 transition-colors"
                >
                  <Check className="w-3 h-3" />
                  <span>적용됨</span>
                </button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-[10px] text-blue-600 hover:text-blue-800"
                  onClick={() => onApplyPolicy(entryKey, policy, baseAmount)}
                >
                  적용
                </Button>
              )}
            </div>
          )
        })}

        {/* 미지급 이벤트 보상 */}
        {pendingRewards.map((reward) => {
          const isApplied = appliedIds.has(reward.id)
          const amountType = reward.reward_amount_type || "fixed"
          const discountAmount = amountType === "percent"
            ? Math.round(baseAmount * (reward.reward_amount / 100))
            : reward.reward_amount
          const campaignTitle = (reward.campaign as Campaign | undefined)?.title ?? "이벤트"
          return (
            <div key={reward.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <Gift className="w-3 h-3 text-purple-500" />
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-purple-50 text-purple-600 border-purple-200">
                  이벤트
                </Badge>
                <span className="text-slate-700">{campaignTitle}</span>
                <span className="text-slate-400">-{discountAmount.toLocaleString()}원</span>
              </div>
              {isApplied ? (
                <button
                  onClick={() => onRemoveDiscount(reward.id)}
                  className="flex items-center gap-0.5 text-green-600 hover:text-red-500 transition-colors"
                >
                  <Check className="w-3 h-3" />
                  <span>적용됨</span>
                </button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-[10px] text-purple-600 hover:text-purple-800"
                  onClick={() => onApplyReward(entryKey, reward, baseAmount)}
                >
                  적용
                </Button>
              )}
            </div>
          )
        })}

        {/* 이벤트 참여 등록 버튼 */}
        <EventParticipationPopover
          studentId={studentId}
          studentName={studentName}
          onRewardAdded={onRewardAdded}
        />

        {/* 할인 없을 때 안내 */}
        {policies.length === 0 && pendingRewards.length === 0 && appliedDiscounts.length === 0 && (
          <p className="text-[10px] text-slate-400 py-1">적용 가능한 할인이 없습니다</p>
        )}
      </CardContent>
    </Card>
  )
}

// --- 이벤트 참여 등록 Popover ---

interface EventParticipationPopoverProps {
  studentId: string
  studentName: string
  onRewardAdded: (participant: CampaignParticipant) => void
}

function EventParticipationPopover({ studentId, studentName, onRewardAdded }: EventParticipationPopoverProps) {
  const [open, setOpen] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    async function loadCampaigns() {
      setIsLoadingCampaigns(true)
      const supabase = createClient()
      const res = await getCampaigns(supabase, { type: "event", status: "active" })
      if (res.success && res.data) {
        setCampaigns(res.data)
      }
      setIsLoadingCampaigns(false)
    }
    loadCampaigns()
  }, [open])

  const handleSelect = async (campaign: Campaign) => {
    setIsSubmitting(true)
    const supabase = createClient()
    const result = await addParticipant(supabase, campaign.id, studentId)

    if (result.success && result.data) {
      toast.success(`${studentName} - ${campaign.title} 참여 등록 완료`)
      onRewardAdded({ ...result.data, campaign })
      setOpen(false)
    } else {
      toast.error(result.error ?? "등록 실패")
    }
    setIsSubmitting(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-1.5 text-[10px] text-slate-500 hover:text-indigo-600 w-fit"
        >
          <Plus className="w-3 h-3 mr-0.5" />
          이벤트 참여 등록
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <p className="text-xs font-medium text-slate-700 mb-2">활성 이벤트 캠페인</p>
        {isLoadingCampaigns ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          </div>
        ) : campaigns.length === 0 ? (
          <p className="text-[10px] text-slate-400 py-2">활성 이벤트가 없습니다</p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {campaigns.map((c) => (
              <button
                key={c.id}
                disabled={isSubmitting}
                onClick={() => handleSelect(c)}
                className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                <div className="font-medium text-slate-700">{c.title}</div>
                <div className="text-[10px] text-slate-400">
                  {c.reward_amount_type === "percent"
                    ? `${c.reward_amount}% 할인`
                    : `${c.reward_amount.toLocaleString()}원`}
                </div>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
