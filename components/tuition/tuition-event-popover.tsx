"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Gift, Plus, Loader2, X, Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  getCampaigns,
  addParticipant,
  type Campaign,
  type RewardAmountType,
} from "@/services/campaign-service"

interface TuitionEventPopoverProps {
  studentId: string
  studentName: string
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export function TuitionEventPopover({
  studentId,
  studentName,
  onSuccess,
  trigger,
}: TuitionEventPopoverProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignsLoading, setCampaignsLoading] = useState(false)

  // Form state
  const [selectedCampaignId, setSelectedCampaignId] = useState("")
  const [rewardAmount, setRewardAmount] = useState("")
  const [rewardAmountType, setRewardAmountType] = useState<RewardAmountType>("fixed")
  const [referrerStudentId, setReferrerStudentId] = useState("")
  const [referrerSearch, setReferrerSearch] = useState("")
  const [students, setStudents] = useState<Array<{ id: string; name: string }>>([])
  const [studentsLoading, setStudentsLoading] = useState(false)

  const supabase = createClient()

  // 이벤트 캠페인 목록 로드
  useEffect(() => {
    if (open) {
      loadCampaigns()
    }
  }, [open])

  const loadCampaigns = async () => {
    setCampaignsLoading(true)
    try {
      const result = await getCampaigns(supabase, { type: "event", status: "active" })
      if (result.success && result.data) {
        setCampaigns(result.data)
      }
    } catch (error) {
      console.error("캠페인 로드 오류:", error)
    } finally {
      setCampaignsLoading(false)
    }
  }

  // 학생 검색 (추천인용)
  useEffect(() => {
    if (referrerSearch.length >= 1) {
      searchStudents(referrerSearch)
    } else {
      setStudents([])
    }
  }, [referrerSearch])

  const searchStudents = async (query: string) => {
    setStudentsLoading(true)
    try {
      const { data } = await supabase
        .from("students")
        .select("id, name")
        .ilike("name", `%${query}%`)
        .neq("id", studentId)
        .limit(10)

      setStudents(data || [])
    } catch (error) {
      console.error("학생 검색 오류:", error)
    } finally {
      setStudentsLoading(false)
    }
  }

  // 캠페인 선택 시 기본 금액 설정
  const handleCampaignChange = (campaignId: string) => {
    setSelectedCampaignId(campaignId)
    const campaign = campaigns.find(c => c.id === campaignId)
    if (campaign) {
      setRewardAmount(campaign.reward_amount.toString())
      setRewardAmountType(campaign.reward_amount_type || "fixed")
    }
  }

  // 참여 등록
  const handleSubmit = async () => {
    if (!selectedCampaignId) {
      toast.error("이벤트를 선택해주세요")
      return
    }

    setLoading(true)
    try {
      const result = await addParticipant(supabase, selectedCampaignId, studentId, {
        referrerStudentId: referrerStudentId || undefined,
        rewardAmount: rewardAmount ? parseInt(rewardAmount) : undefined,
        rewardAmountType: rewardAmountType,
      })

      if (result.success) {
        toast.success("이벤트 참여가 등록되었습니다")
        resetForm()
        setOpen(false)
        onSuccess?.()
      } else {
        toast.error(result.error || "등록에 실패했습니다")
      }
    } catch (error: any) {
      toast.error(error.message || "오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedCampaignId("")
    setRewardAmount("")
    setRewardAmountType("fixed")
    setReferrerStudentId("")
    setReferrerSearch("")
  }

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId)
  const isReferralEvent = selectedCampaign?.title.includes("추천")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
          >
            <Plus className="w-3 h-3 mr-1" />
            이벤트
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-500" />
              이벤트 참여 등록
            </h4>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            학생: <span className="font-medium text-foreground">{studentName}</span>
          </div>

          {/* 이벤트 선택 */}
          <div className="space-y-2">
            <Label className="text-xs">이벤트 선택 *</Label>
            <Select
              value={selectedCampaignId}
              onValueChange={handleCampaignChange}
              disabled={campaignsLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={campaignsLoading ? "로딩 중..." : "이벤트 선택"} />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map(campaign => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    <div className="flex items-center gap-2">
                      <span>{campaign.title}</span>
                      {campaign.reward_amount > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({campaign.reward_amount_type === "percent"
                            ? `${campaign.reward_amount}%`
                            : `${campaign.reward_amount.toLocaleString()}원`})
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
                {campaigns.length === 0 && !campaignsLoading && (
                  <div className="text-xs text-muted-foreground px-2 py-4 text-center">
                    진행 중인 이벤트가 없습니다
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* 혜택 금액 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs">혜택</Label>
              <div className="flex gap-1">
                <button
                  type="button"
                  className={`px-2 py-0.5 text-xs rounded ${rewardAmountType === "fixed" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                  onClick={() => setRewardAmountType("fixed")}
                >
                  금액
                </button>
                <button
                  type="button"
                  className={`px-2 py-0.5 text-xs rounded ${rewardAmountType === "percent" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                  onClick={() => setRewardAmountType("percent")}
                >
                  %
                </button>
              </div>
            </div>
            <div className="relative">
              <Input
                type="number"
                value={rewardAmount}
                onChange={(e) => setRewardAmount(e.target.value)}
                placeholder="0"
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {rewardAmountType === "percent" ? "%" : "원"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              비워두면 이벤트 기본 값이 적용됩니다
            </p>
          </div>

          {/* 추천인 선택 (추천 이벤트인 경우) */}
          {isReferralEvent && (
            <div className="space-y-2">
              <Label className="text-xs">추천인</Label>
              <div className="relative">
                <Input
                  value={referrerSearch}
                  onChange={(e) => setReferrerSearch(e.target.value)}
                  placeholder="추천인 이름 검색..."
                  className="pr-8"
                />
                {studentsLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {students.length > 0 && (
                <div className="border rounded-md max-h-32 overflow-y-auto">
                  {students.map(student => (
                    <button
                      key={student.id}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between"
                      onClick={() => {
                        setReferrerStudentId(student.id)
                        setReferrerSearch(student.name)
                        setStudents([])
                      }}
                    >
                      {student.name}
                      {referrerStudentId === student.id && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}
              {referrerStudentId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => {
                    setReferrerStudentId("")
                    setReferrerSearch("")
                  }}
                >
                  추천인 해제
                </Button>
              )}
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetForm()
                setOpen(false)
              }}
            >
              취소
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={loading || !selectedCampaignId}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  등록 중...
                </>
              ) : (
                "참여 등록"
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
