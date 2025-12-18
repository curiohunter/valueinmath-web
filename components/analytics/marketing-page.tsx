"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Plus, Pencil, Trash2, CalendarIcon, DollarSign, Megaphone, Users, Trophy, Clock, Gift, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  getMarketingActivities,
  createMarketingActivity,
  updateMarketingActivity,
  deleteMarketingActivity,
  getAllChannels,
  getChannelLabel,
  getActivityParticipants,
  addActivityParticipants,
  removeActivityParticipant,
  type MarketingActivity,
  type MarketingChannel,
  type MarketingStatus,
  type MarketingActivityParticipant,
} from "@/services/marketing-service"
import {
  getReferrals,
  createReferral,
  updateReferral,
  deleteReferral,
  giveReward,
  updateReferralStatus,
  getReferralStats,
  getTopReferrers,
  getPendingRewards,
  getReferralStatusColor,
  REFERRAL_TYPE_LABELS,
  REFERRAL_STATUS_LABELS,
  REWARD_TYPE_LABELS,
  type StudentReferral,
  type ReferralType,
  type ReferralStatus,
  type RewardType,
  type ReferralStats,
  type TopReferrer,
} from "@/services/referral-service"
import {
  getPendingRewards as getPendingRewardsFromService,
} from "@/services/reward-service"
import type { Reward } from "@/types/reward"
import {
  REWARD_TYPE_LABELS as NEW_REWARD_TYPE_LABELS,
  REWARD_STATUS_LABELS,
  REWARD_ROLE_LABELS,
  formatRewardAmount,
  getRewardStatusColor,
  getRewardRoleColor,
} from "@/types/reward"

export default function MarketingPage() {
  // 마케팅 활동 관련 상태
  const [marketingActivities, setMarketingActivities] = useState<MarketingActivity[]>([])
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<MarketingActivity | null>(null)
  const [deleteActivityId, setDeleteActivityId] = useState<string | null>(null)
  const [activityForm, setActivityForm] = useState({
    channel: "" as MarketingChannel | "",
    title: "",
    description: "",
    activityDate: new Date(),
    costAmount: "",
    contentUrl: "",
    status: "in_progress" as MarketingStatus,
  })
  const [savingActivity, setSavingActivity] = useState(false)

  // 참가자 관리 관련 상태
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  const [participants, setParticipants] = useState<MarketingActivityParticipant[]>([])
  const [allStudents, setAllStudents] = useState<{ id: string; name: string; school_type: string | null; grade: number | null; status: string }[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [loadingParticipants, setLoadingParticipants] = useState(false)
  const [savingParticipants, setSavingParticipants] = useState(false)
  const [studentSearchQuery, setStudentSearchQuery] = useState("")
  const [activityStatusFilter, setActivityStatusFilter] = useState<MarketingStatus | "all">("all")
  const [participatedDate, setParticipatedDate] = useState<Date>(new Date())

  // 추천 관리 관련 상태
  const [referrals, setReferrals] = useState<StudentReferral[]>([])
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null)
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([])
  const [pendingRewards, setPendingRewards] = useState<StudentReferral[]>([])
  const [loadingReferrals, setLoadingReferrals] = useState(false)
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false)
  const [editingReferral, setEditingReferral] = useState<StudentReferral | null>(null)
  const [deleteReferralId, setDeleteReferralId] = useState<string | null>(null)
  const [savingReferral, setSavingReferral] = useState(false)
  const [referralForm, setReferralForm] = useState({
    referrer_student_id: "",
    referred_student_id: "",
    referral_date: new Date(),
    referral_type: "학부모추천" as ReferralType,
    notes: "",
    marketing_activity_id: "",
  })
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false)
  const [rewardTargetReferral, setRewardTargetReferral] = useState<StudentReferral | null>(null)
  const [rewardForm, setRewardForm] = useState({
    reward_type: "학원비할인" as RewardType,
    reward_amount: "",
    reward_date: new Date(),
    reward_notes: "",
  })
  const [referrerSearchQuery, setReferrerSearchQuery] = useState("")
  const [referredSearchQuery, setReferredSearchQuery] = useState("")

  // 보상 현황 관련 상태
  const [pendingRewardsNew, setPendingRewardsNew] = useState<Reward[]>([])
  const [loadingPendingRewards, setLoadingPendingRewards] = useState(false)

  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const channels = getAllChannels()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadMarketingActivities(),
        loadAllStudents(),
        loadReferralData(),
        loadPendingRewardsNew(),
      ])
    } catch (error) {
      console.error("Failed to load data:", error)
      toast.error("데이터를 불러오는데 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  // 마케팅 활동 로드
  const loadMarketingActivities = async () => {
    const activities = await getMarketingActivities(supabase)
    setMarketingActivities(activities)
  }

  // 전체 학생 목록 로드 (참가자 선택용)
  const loadAllStudents = async () => {
    const { data } = await supabase
      .from("students")
      .select("id, name, school_type, grade, status")
      .order("name")
    setAllStudents(data || [])
  }

  // 추천 데이터 로드
  const loadReferralData = async () => {
    setLoadingReferrals(true)
    try {
      const [referralsData, statsData, topData, pendingData] = await Promise.all([
        getReferrals(supabase, { limit: 50 }),
        getReferralStats(supabase),
        getTopReferrers(supabase, 5),
        getPendingRewards(supabase),
      ])
      setReferrals(referralsData)
      setReferralStats(statsData)
      setTopReferrers(topData)
      setPendingRewards(pendingData)
    } catch (error) {
      console.error("Failed to load referral data:", error)
      toast.error("추천 데이터를 불러오는데 실패했습니다.")
    } finally {
      setLoadingReferrals(false)
    }
  }

  // 신규 보상 시스템 데이터 로드
  const loadPendingRewardsNew = async () => {
    setLoadingPendingRewards(true)
    try {
      const rewards = await getPendingRewardsFromService(supabase)
      setPendingRewardsNew(rewards)
    } catch (error) {
      console.error("Failed to load pending rewards:", error)
    } finally {
      setLoadingPendingRewards(false)
    }
  }

  // 참가자 로드
  const loadParticipants = async (activityId: string) => {
    setLoadingParticipants(true)
    try {
      const data = await getActivityParticipants(supabase, activityId)
      setParticipants(data)
    } catch (error) {
      console.error("Failed to load participants:", error)
      toast.error("참가자 목록을 불러오는데 실패했습니다.")
    } finally {
      setLoadingParticipants(false)
    }
  }

  // 마케팅 활동 선택
  const handleActivitySelect = (activityId: string) => {
    setSelectedActivityId(activityId)
    setSelectedStudentIds([])
    loadParticipants(activityId)
  }

  // 마케팅 활동 모달 열기
  const openCreateActivityModal = () => {
    setEditingActivity(null)
    setActivityForm({
      channel: "",
      title: "",
      description: "",
      activityDate: new Date(),
      costAmount: "",
      contentUrl: "",
      status: "in_progress",
    })
    setIsActivityModalOpen(true)
  }

  const openEditActivityModal = (activity: MarketingActivity) => {
    setEditingActivity(activity)
    setActivityForm({
      channel: activity.channel,
      title: activity.title,
      description: activity.description || "",
      activityDate: activity.activity_date ? new Date(activity.activity_date) : new Date(),
      costAmount: activity.cost_amount?.toString() || "",
      contentUrl: activity.content_url || "",
      status: activity.status,
    })
    setIsActivityModalOpen(true)
  }

  // 마케팅 활동 저장
  const handleSaveActivity = async () => {
    if (!activityForm.channel || !activityForm.title) {
      toast.error("채널과 제목은 필수입니다.")
      return
    }

    setSavingActivity(true)
    try {
      const input = {
        channel: activityForm.channel as MarketingChannel,
        title: activityForm.title,
        description: activityForm.description || undefined,
        activityDate: format(activityForm.activityDate, "yyyy-MM-dd"),
        costAmount: activityForm.costAmount ? parseInt(activityForm.costAmount) : undefined,
        contentUrl: activityForm.contentUrl || undefined,
        status: activityForm.status,
      }

      if (editingActivity) {
        await updateMarketingActivity(supabase, editingActivity.id, input)
        toast.success("마케팅 활동이 수정되었습니다")
      } else {
        await createMarketingActivity(supabase, input)
        toast.success("마케팅 활동이 등록되었습니다")
      }

      setIsActivityModalOpen(false)
      loadMarketingActivities()
    } catch (error: any) {
      toast.error(error.message || "저장에 실패했습니다.")
    } finally {
      setSavingActivity(false)
    }
  }

  // 마케팅 활동 삭제
  const handleDeleteActivity = async () => {
    if (!deleteActivityId) return

    try {
      await deleteMarketingActivity(supabase, deleteActivityId)
      toast.success("마케팅 활동이 삭제되었습니다")
      setDeleteActivityId(null)
      if (selectedActivityId === deleteActivityId) {
        setSelectedActivityId(null)
        setParticipants([])
      }
      loadMarketingActivities()
    } catch (error: any) {
      toast.error(error.message || "삭제에 실패했습니다.")
    }
  }

  // 참가자 추가
  const handleAddParticipants = async () => {
    if (!selectedActivityId || selectedStudentIds.length === 0) return

    setSavingParticipants(true)
    try {
      await addActivityParticipants(supabase, selectedActivityId, selectedStudentIds, format(participatedDate, "yyyy-MM-dd"))
      toast.success(`${selectedStudentIds.length}명의 참가자가 추가되었습니다`)
      setSelectedStudentIds([])
      loadParticipants(selectedActivityId)
    } catch (error: any) {
      toast.error(error.message || "참가자 추가에 실패했습니다.")
    } finally {
      setSavingParticipants(false)
    }
  }

  // 참가자 제거
  const handleRemoveParticipant = async (participantId: string) => {
    if (!selectedActivityId) return

    try {
      await removeActivityParticipant(supabase, participantId)
      toast.success("참가자가 제거되었습니다")
      loadParticipants(selectedActivityId)
    } catch (error: any) {
      toast.error(error.message || "참가자 제거에 실패했습니다.")
    }
  }

  // 추천 모달 열기 (등록)
  const openCreateReferralModal = () => {
    setEditingReferral(null)
    setReferralForm({
      referrer_student_id: "",
      referred_student_id: "",
      referral_date: new Date(),
      referral_type: "학부모추천",
      notes: "",
      marketing_activity_id: "",
    })
    setReferrerSearchQuery("")
    setReferredSearchQuery("")
    setIsReferralModalOpen(true)
  }

  // 추천 모달 열기 (수정)
  const openEditReferralModal = (referral: StudentReferral) => {
    setEditingReferral(referral)
    setReferralForm({
      referrer_student_id: referral.referrer_student_id || "",
      referred_student_id: referral.referred_student_id || "",
      referral_date: referral.referral_date ? new Date(referral.referral_date) : new Date(),
      referral_type: referral.referral_type,
      notes: referral.notes || "",
      marketing_activity_id: referral.marketing_activity_id || "",
    })
    setReferrerSearchQuery(referral.referrer_name_snapshot || "")
    setReferredSearchQuery(referral.referred_name_snapshot || "")
    setIsReferralModalOpen(true)
  }

  // 추천 저장
  const handleSaveReferral = async () => {
    if (!referralForm.referrer_student_id || !referralForm.referred_student_id) {
      toast.error("추천인과 피추천인을 선택해주세요.")
      return
    }

    const referrerStudent = allStudents.find(s => s.id === referralForm.referrer_student_id)
    const referredStudent = allStudents.find(s => s.id === referralForm.referred_student_id)

    setSavingReferral(true)
    try {
      if (editingReferral) {
        await updateReferral(supabase, editingReferral.id, {
          referrer_student_id: referralForm.referrer_student_id,
          referrer_name_snapshot: referrerStudent?.name,
          referred_student_id: referralForm.referred_student_id,
          referred_name_snapshot: referredStudent?.name,
          referral_date: format(referralForm.referral_date, "yyyy-MM-dd"),
          referral_type: referralForm.referral_type,
          notes: referralForm.notes || undefined,
          marketing_activity_id: referralForm.marketing_activity_id || null,
        })
        toast.success("추천 정보가 수정되었습니다")
      } else {
        await createReferral(supabase, {
          referrer_student_id: referralForm.referrer_student_id,
          referrer_name_snapshot: referrerStudent?.name || "알 수 없음",
          referred_student_id: referralForm.referred_student_id,
          referred_name_snapshot: referredStudent?.name || "알 수 없음",
          referral_date: format(referralForm.referral_date, "yyyy-MM-dd"),
          referral_type: referralForm.referral_type,
          notes: referralForm.notes || undefined,
          marketing_activity_id: referralForm.marketing_activity_id || undefined,
        })
        toast.success("추천이 등록되었습니다")
      }

      setIsReferralModalOpen(false)
      loadReferralData()
    } catch (error: any) {
      toast.error(error.message || "저장에 실패했습니다.")
    } finally {
      setSavingReferral(false)
    }
  }

  // 추천 삭제
  const handleDeleteReferral = async () => {
    if (!deleteReferralId) return

    try {
      await deleteReferral(supabase, deleteReferralId)
      toast.success("추천이 삭제되었습니다")
      setDeleteReferralId(null)
      loadReferralData()
    } catch (error: any) {
      toast.error(error.message || "삭제에 실패했습니다.")
    }
  }

  // 보상 지급 모달 열기
  const openRewardModal = (referral: StudentReferral) => {
    setRewardTargetReferral(referral)
    setRewardForm({
      reward_type: (referral.reward_type as RewardType) || "학원비할인",
      reward_amount: referral.reward_amount?.toString() || "",
      reward_date: new Date(),
      reward_notes: "",
    })
    setIsRewardModalOpen(true)
  }

  // 보상 지급
  const handleGiveReward = async () => {
    if (!rewardTargetReferral) return
    if (!rewardForm.reward_amount || parseInt(rewardForm.reward_amount) <= 0) {
      toast.error("보상 금액을 입력해주세요.")
      return
    }

    setSavingReferral(true)
    try {
      await giveReward(supabase, rewardTargetReferral.id, {
        reward_type: rewardForm.reward_type,
        reward_amount: parseInt(rewardForm.reward_amount),
        reward_date: format(rewardForm.reward_date, "yyyy-MM-dd"),
        reward_notes: rewardForm.reward_notes || undefined,
      })
      toast.success("보상이 지급되었습니다")
      setIsRewardModalOpen(false)
      loadReferralData()
    } catch (error: any) {
      toast.error(error.message || "보상 지급에 실패했습니다.")
    } finally {
      setSavingReferral(false)
    }
  }

  // 추천 상태 변경
  const handleStatusChange = async (referralId: string, newStatus: ReferralStatus) => {
    try {
      await updateReferralStatus(supabase, referralId, newStatus)
      toast.success("상태가 변경되었습니다")
      loadReferralData()
    } catch (error: any) {
      toast.error(error.message || "상태 변경에 실패했습니다.")
    }
  }

  // 필터링된 학생 목록
  const filteredStudents = allStudents.filter(s =>
    s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) &&
    !participants.some(p => p.student_id === s.id)
  )

  // 필터링된 마케팅 활동
  const filteredActivities = marketingActivities.filter(a =>
    activityStatusFilter === "all" || a.status === activityStatusFilter
  )

  // 추천 타입별 마케팅 활동 필터링 (추천 관련 활동만)
  const referralMarketingActivities = marketingActivities.filter(a =>
    a.channel === "referral" || a.title.includes("추천")
  )

  // 추천인/피추천인 검색용 필터링
  const filteredReferrers = allStudents.filter(s =>
    s.name.toLowerCase().includes(referrerSearchQuery.toLowerCase()) &&
    s.id !== referralForm.referred_student_id
  )
  const filteredReferred = allStudents.filter(s =>
    s.name.toLowerCase().includes(referredSearchQuery.toLowerCase()) &&
    s.id !== referralForm.referrer_student_id
  )

  const selectedActivity = marketingActivities.find(a => a.id === selectedActivityId)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="activities" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="activities">마케팅 활동</TabsTrigger>
          <TabsTrigger value="referral">추천 관리</TabsTrigger>
          <TabsTrigger value="rewards">보상 현황</TabsTrigger>
        </TabsList>

        {/* 마케팅 활동 탭 */}
        <TabsContent value="activities" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            {/* 왼쪽: 마케팅 활동 목록 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    <Megaphone className="w-5 h-5 inline mr-2" />
                    마케팅 활동
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={activityStatusFilter} onValueChange={(v) => setActivityStatusFilter(v as MarketingStatus | "all")}>
                      <SelectTrigger className="w-[120px] h-8">
                        <SelectValue placeholder="상태 필터" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        <SelectItem value="planned">예정</SelectItem>
                        <SelectItem value="in_progress">진행중</SelectItem>
                        <SelectItem value="completed">완료</SelectItem>
                        <SelectItem value="cancelled">취소</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={openCreateActivityModal}>
                      <Plus className="w-4 h-4 mr-1" />
                      등록
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {filteredActivities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Megaphone className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">등록된 마케팅 활동이 없습니다.</p>
                      <p className="text-xs mt-1">새 마케팅 활동을 등록해주세요.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredActivities.map((activity) => (
                        <div
                          key={activity.id}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-colors",
                            selectedActivityId === activity.id
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          )}
                          onClick={() => handleActivitySelect(activity.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {getChannelLabel(activity.channel)}
                              </Badge>
                              <span className="font-medium">{activity.title}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEditActivityModal(activity)
                                }}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeleteActivityId(activity.id)
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            {activity.activity_date && (
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3" />
                                {format(new Date(activity.activity_date), "yyyy.MM.dd")}
                              </span>
                            )}
                            {activity.cost_amount && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                {activity.cost_amount.toLocaleString()}원
                              </span>
                            )}
                            <Badge
                              variant={
                                activity.status === "completed" ? "default" :
                                activity.status === "in_progress" ? "secondary" :
                                activity.status === "cancelled" ? "destructive" : "outline"
                              }
                              className="text-[10px] h-5"
                            >
                              {activity.status === "planned" ? "예정" :
                               activity.status === "in_progress" ? "진행중" :
                               activity.status === "completed" ? "완료" : "취소"}
                            </Badge>
                          </div>
                          {activity.description && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                              {activity.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* 오른쪽: 참가자 관리 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  <Users className="w-5 h-5 inline mr-2" />
                  참가자 관리
                  {selectedActivity && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      - {selectedActivity.title}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedActivityId ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">왼쪽에서 마케팅 활동을 선택하세요.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* 참가자 추가 */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="학생 검색..."
                          value={studentSearchQuery}
                          onChange={(e) => setStudentSearchQuery(e.target.value)}
                          className="h-8"
                        />
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 w-[130px]">
                              <CalendarIcon className="w-3.5 h-3.5 mr-1" />
                              {format(participatedDate, "yyyy.MM.dd")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                              mode="single"
                              selected={participatedDate}
                              onSelect={(date) => date && setParticipatedDate(date)}
                              locale={ko}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <ScrollArea className="h-[150px] border rounded-md p-2">
                        {filteredStudents.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            {studentSearchQuery ? "검색 결과가 없습니다." : "추가할 학생이 없습니다."}
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {filteredStudents.map((student) => (
                              <div key={student.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50">
                                <Checkbox
                                  id={`student-${student.id}`}
                                  checked={selectedStudentIds.includes(student.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedStudentIds([...selectedStudentIds, student.id])
                                    } else {
                                      setSelectedStudentIds(selectedStudentIds.filter(id => id !== student.id))
                                    }
                                  }}
                                />
                                <label htmlFor={`student-${student.id}`} className="flex-1 text-sm cursor-pointer">
                                  {student.name}
                                  <span className="text-xs text-muted-foreground ml-1">
                                    ({student.school_type || "미지정"} {student.grade || ""}학년)
                                  </span>
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>

                      <Button
                        onClick={handleAddParticipants}
                        disabled={selectedStudentIds.length === 0 || savingParticipants}
                        className="w-full h-8"
                        size="sm"
                      >
                        {savingParticipants ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-1" />
                            {selectedStudentIds.length}명 추가
                          </>
                        )}
                      </Button>
                    </div>

                    {/* 참가자 목록 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">참가자 목록</span>
                        <Badge variant="secondary">{participants.length}명</Badge>
                      </div>
                      <ScrollArea className="h-[200px] border rounded-md">
                        {loadingParticipants ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : participants.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            참가자가 없습니다.
                          </p>
                        ) : (
                          <div className="p-2 space-y-1">
                            {participants.map((p) => (
                              <div key={p.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                                <div>
                                  <span className="text-sm font-medium">{p.student?.name || "알 수 없음"}</span>
                                  {p.participated_at && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      {format(new Date(p.participated_at), "yyyy.MM.dd")}
                                    </span>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => handleRemoveParticipant(p.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 추천 관리 탭 */}
        <TabsContent value="referral" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            {/* 통계 카드들 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">총 추천 현황</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{referralStats?.totalReferrals || 0}건</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    등록완료 {referralStats?.enrolledCount || 0}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    진행중 {referralStats?.pendingCount || 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">미지급 보상</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{pendingRewards.length}건</div>
                <p className="text-xs text-muted-foreground mt-1">
                  지급 대기 중인 보상
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">전환율</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{referralStats?.successRate?.toFixed(1) || 0}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  등록완료 / 전체 추천
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            {/* 추천 왕 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  추천 왕
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topReferrers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">아직 추천 데이터가 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {topReferrers.map((referrer, idx) => (
                      <div key={referrer.student_id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium",
                            idx === 0 ? "bg-amber-100 text-amber-700" :
                            idx === 1 ? "bg-gray-100 text-gray-700" :
                            idx === 2 ? "bg-orange-100 text-orange-700" : "bg-muted"
                          )}>
                            {idx + 1}
                          </span>
                          <span className="text-sm">{referrer.student_name}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {referrer.referral_count}건
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 미지급 보상 목록 */}
            <Card className="col-span-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    보상 지급 대기
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={openCreateReferralModal}>
                    <Plus className="w-4 h-4 mr-1" />
                    추천 등록
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {pendingRewards.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    지급 대기 중인 보상이 없습니다.
                  </p>
                ) : (
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {pendingRewards.map((referral) => (
                        <div key={referral.id} className="flex items-center justify-between p-2 rounded-lg border">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{referral.referrer_name_snapshot}</span>
                              <span className="text-xs text-muted-foreground">→</span>
                              <span>{referral.referred_name_snapshot}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {REFERRAL_TYPE_LABELS[referral.referral_type] || referral.referral_type}
                              </Badge>
                              {referral.reward_amount && (
                                <span className="text-xs text-muted-foreground">
                                  {referral.reward_amount.toLocaleString()}원
                                </span>
                              )}
                            </div>
                          </div>
                          <Button size="sm" onClick={() => openRewardModal(referral)}>
                            <Gift className="w-4 h-4 mr-1" />
                            지급
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 추천 목록 */}
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">추천 내역</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingReferrals ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : referrals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">등록된 추천이 없습니다.</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {referrals.map((referral) => (
                      <div key={referral.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div>
                              <span className="font-medium">{referral.referrer_name_snapshot}</span>
                              <span className="text-xs text-muted-foreground ml-1">(추천인)</span>
                            </div>
                            <span className="text-muted-foreground">→</span>
                            <div>
                              <span className="font-medium">{referral.referred_name_snapshot}</span>
                              <span className="text-xs text-muted-foreground ml-1">(피추천인)</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {REFERRAL_TYPE_LABELS[referral.referral_type] || referral.referral_type}
                            </Badge>
                            <Badge className={cn("text-xs", getReferralStatusColor(referral.referral_status))}>
                              {REFERRAL_STATUS_LABELS[referral.referral_status] || referral.referral_status}
                            </Badge>
                            {referral.reward_given && (
                              <Badge variant="default" className="text-xs bg-green-100 text-green-700">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                보상완료
                              </Badge>
                            )}
                            {referral.referral_date && (
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(referral.referral_date), "yyyy.MM.dd")}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Select
                            value={referral.referral_status}
                            onValueChange={(value) => handleStatusChange(referral.id, value as ReferralStatus)}
                          >
                            <SelectTrigger className="w-[100px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="상담중">상담중</SelectItem>
                              <SelectItem value="테스트완료">테스트완료</SelectItem>
                              <SelectItem value="등록완료">등록완료</SelectItem>
                              <SelectItem value="미등록">미등록</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditReferralModal(referral)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteReferralId(referral.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 보상 현황 탭 */}
        <TabsContent value="rewards" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            {/* 학원비 할인 대기 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Gift className="w-4 h-4 text-blue-500" />
                  학원비 할인 대기
                </CardTitle>
                <CardDescription>학원비에 적용할 수 있는 할인 보상</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPendingRewards ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    {pendingRewardsNew.filter(r => r.reward_type === "tuition_discount").length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        학원비 할인 대기 보상이 없습니다.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {pendingRewardsNew.filter(r => r.reward_type === "tuition_discount").map((reward) => (
                          <div key={reward.id} className="p-3 rounded-lg border">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium">{reward.student_name_snapshot || reward.student?.name || "알 수 없음"}</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge className={cn("text-xs", getRewardRoleColor(reward.role))}>
                                    {REWARD_ROLE_LABELS[reward.role]}
                                  </Badge>
                                  <span className="text-sm font-medium text-blue-600">
                                    {formatRewardAmount(reward.reward_amount, reward.amount_type)}
                                  </span>
                                </div>
                              </div>
                              <Button size="sm" variant="outline">
                                학원비에 적용
                              </Button>
                            </div>
                            {reward.activity_title_snapshot && (
                              <p className="text-xs text-muted-foreground mt-2">
                                {reward.activity_title_snapshot}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* 현금 지급 대기 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  현금 지급 대기
                </CardTitle>
                <CardDescription>현금으로 지급할 보상</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPendingRewards ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    {pendingRewardsNew.filter(r => r.reward_type === "cash").length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        현금 지급 대기 보상이 없습니다.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {pendingRewardsNew.filter(r => r.reward_type === "cash").map((reward) => (
                          <div key={reward.id} className="p-3 rounded-lg border">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium">{reward.student_name_snapshot || reward.student?.name || "알 수 없음"}</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge className={cn("text-xs", getRewardRoleColor(reward.role))}>
                                    {REWARD_ROLE_LABELS[reward.role]}
                                  </Badge>
                                  <span className="text-sm font-medium text-green-600">
                                    {formatRewardAmount(reward.reward_amount, reward.amount_type)}
                                  </span>
                                </div>
                              </div>
                              <Button size="sm" variant="outline">
                                지급 완료
                              </Button>
                            </div>
                            {reward.activity_title_snapshot && (
                              <p className="text-xs text-muted-foreground mt-2">
                                {reward.activity_title_snapshot}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* 마케팅 활동 등록/수정 모달 */}
      <Dialog open={isActivityModalOpen} onOpenChange={setIsActivityModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingActivity ? "마케팅 활동 수정" : "마케팅 활동 등록"}
            </DialogTitle>
            <DialogDescription>
              마케팅 활동 정보를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>채널 *</Label>
                <Select
                  value={activityForm.channel}
                  onValueChange={(v) => setActivityForm({ ...activityForm, channel: v as MarketingChannel })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="채널 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map((ch) => (
                      <SelectItem key={ch.value} value={ch.value}>
                        {ch.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>상태</Label>
                <Select
                  value={activityForm.status}
                  onValueChange={(v) => setActivityForm({ ...activityForm, status: v as MarketingStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">예정</SelectItem>
                    <SelectItem value="in_progress">진행중</SelectItem>
                    <SelectItem value="completed">완료</SelectItem>
                    <SelectItem value="cancelled">취소</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>제목 *</Label>
              <Input
                value={activityForm.title}
                onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                placeholder="마케팅 활동 제목"
              />
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea
                value={activityForm.description}
                onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                placeholder="활동 설명"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>활동 일자</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {format(activityForm.activityDate, "yyyy.MM.dd")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={activityForm.activityDate}
                      onSelect={(date) => date && setActivityForm({ ...activityForm, activityDate: date })}
                      locale={ko}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>비용 (원)</Label>
                <Input
                  type="number"
                  value={activityForm.costAmount}
                  onChange={(e) => setActivityForm({ ...activityForm, costAmount: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>콘텐츠 URL</Label>
              <Input
                value={activityForm.contentUrl}
                onChange={(e) => setActivityForm({ ...activityForm, contentUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActivityModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveActivity} disabled={savingActivity}>
              {savingActivity ? <Loader2 className="w-4 h-4 animate-spin" /> : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 마케팅 활동 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deleteActivityId} onOpenChange={() => setDeleteActivityId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>마케팅 활동 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 마케팅 활동을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteActivity} className="bg-destructive text-destructive-foreground">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 추천 등록/수정 모달 */}
      <Dialog open={isReferralModalOpen} onOpenChange={setIsReferralModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingReferral ? "추천 수정" : "추천 등록"}
            </DialogTitle>
            <DialogDescription>
              추천 정보를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>추천인 (기존 학생) *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    {referralForm.referrer_student_id
                      ? allStudents.find(s => s.id === referralForm.referrer_student_id)?.name
                      : "추천인 선택"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-2">
                  <Input
                    placeholder="검색..."
                    value={referrerSearchQuery}
                    onChange={(e) => setReferrerSearchQuery(e.target.value)}
                    className="mb-2"
                  />
                  <ScrollArea className="h-[200px]">
                    {filteredReferrers.map((student) => (
                      <div
                        key={student.id}
                        className="p-2 rounded cursor-pointer hover:bg-muted"
                        onClick={() => {
                          setReferralForm({ ...referralForm, referrer_student_id: student.id })
                          setReferrerSearchQuery(student.name)
                        }}
                      >
                        <span>{student.name}</span>
                        <span className="text-xs text-muted-foreground ml-1">
                          ({student.school_type || "미지정"} {student.grade || ""}학년)
                        </span>
                      </div>
                    ))}
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>피추천인 (신규 학생) *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    {referralForm.referred_student_id
                      ? allStudents.find(s => s.id === referralForm.referred_student_id)?.name
                      : "피추천인 선택"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-2">
                  <Input
                    placeholder="검색..."
                    value={referredSearchQuery}
                    onChange={(e) => setReferredSearchQuery(e.target.value)}
                    className="mb-2"
                  />
                  <ScrollArea className="h-[200px]">
                    {filteredReferred.map((student) => (
                      <div
                        key={student.id}
                        className="p-2 rounded cursor-pointer hover:bg-muted"
                        onClick={() => {
                          setReferralForm({ ...referralForm, referred_student_id: student.id })
                          setReferredSearchQuery(student.name)
                        }}
                      >
                        <span>{student.name}</span>
                        <span className="text-xs text-muted-foreground ml-1">
                          ({student.school_type || "미지정"} {student.grade || ""}학년)
                        </span>
                      </div>
                    ))}
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>추천 유형</Label>
                <Select
                  value={referralForm.referral_type}
                  onValueChange={(v) => setReferralForm({ ...referralForm, referral_type: v as ReferralType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(REFERRAL_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>추천일</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {format(referralForm.referral_date, "yyyy.MM.dd")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={referralForm.referral_date}
                      onSelect={(date) => date && setReferralForm({ ...referralForm, referral_date: date })}
                      locale={ko}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label>연결된 마케팅 활동</Label>
              <Select
                value={referralForm.marketing_activity_id}
                onValueChange={(v) => setReferralForm({ ...referralForm, marketing_activity_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="마케팅 활동 선택 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">없음</SelectItem>
                  {referralMarketingActivities.map((activity) => (
                    <SelectItem key={activity.id} value={activity.id}>
                      {activity.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>메모</Label>
              <Textarea
                value={referralForm.notes}
                onChange={(e) => setReferralForm({ ...referralForm, notes: e.target.value })}
                placeholder="추가 메모"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReferralModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveReferral} disabled={savingReferral}>
              {savingReferral ? <Loader2 className="w-4 h-4 animate-spin" /> : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 추천 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deleteReferralId} onOpenChange={() => setDeleteReferralId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>추천 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 추천을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReferral} className="bg-destructive text-destructive-foreground">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 보상 지급 모달 */}
      <Dialog open={isRewardModalOpen} onOpenChange={setIsRewardModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>보상 지급</DialogTitle>
            <DialogDescription>
              {rewardTargetReferral?.referrer_name_snapshot}님에게 보상을 지급합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>보상 유형</Label>
              <Select
                value={rewardForm.reward_type}
                onValueChange={(v) => setRewardForm({ ...rewardForm, reward_type: v as RewardType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REWARD_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>보상 금액 (원) *</Label>
              <Input
                type="number"
                value={rewardForm.reward_amount}
                onChange={(e) => setRewardForm({ ...rewardForm, reward_amount: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>지급일</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {format(rewardForm.reward_date, "yyyy.MM.dd")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={rewardForm.reward_date}
                    onSelect={(date) => date && setRewardForm({ ...rewardForm, reward_date: date })}
                    locale={ko}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>메모</Label>
              <Textarea
                value={rewardForm.reward_notes}
                onChange={(e) => setRewardForm({ ...rewardForm, reward_notes: e.target.value })}
                placeholder="보상 지급 관련 메모"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRewardModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleGiveReward} disabled={savingReferral}>
              {savingReferral ? <Loader2 className="w-4 h-4 animate-spin" /> : "지급"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
