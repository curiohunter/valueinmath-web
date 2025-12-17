"use client"

import { useState, useMemo, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import AnalyticsTabs from "@/components/analytics/AnalyticsTabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { CalendarIcon } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

// 서비스 imports
import {
  getMarketingActivities,
  createMarketingActivity,
  updateMarketingActivity,
  deleteMarketingActivity,
  getAllChannels,
  getActivityParticipants,
  addActivityParticipants,
  removeActivityParticipant,
  type MarketingActivity,
  type MarketingChannel,
  type MarketingStatus,
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
  type StudentReferral,
  type ReferralType,
  type ReferralStatus,
  type RewardType,
} from "@/services/referral-service"

// 훅 imports
import {
  useBottleneckData,
  useCohortData,
  useLeadSourceData,
  useMarketingData,
  useReferralData,
} from "./hooks"

// 탭 컴포넌트 imports
import {
  BottleneckTab,
  CohortTab,
  LeadSourceTab,
  MarketingTab,
  ReferralTab,
} from "./tabs"

export function FunnelAnalysisPage() {
  const supabase = createClient()
  const channels = getAllChannels()

  // 커스텀 훅 사용
  const bottleneckHook = useBottleneckData()
  const cohortHook = useCohortData()
  const leadSourceHook = useLeadSourceData()
  const marketingHook = useMarketingData()
  const referralHook = useReferralData()

  // 전체 학생 목록은 referralHook에서 관리
  const { allStudents } = referralHook

  // 마케팅 활동 모달 상태
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

  // 추천 모달 상태
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false)
  const [editingReferral, setEditingReferral] = useState<StudentReferral | null>(null)
  const [deleteReferralId, setDeleteReferralId] = useState<string | null>(null)
  const [referralForm, setReferralForm] = useState({
    referrer_student_id: "",
    referred_student_id: "",
    referral_date: new Date(),
    referral_type: "학부모추천" as ReferralType,
    notes: "",
  })
  const [savingReferral, setSavingReferral] = useState(false)
  const [referrerSearchQuery, setReferrerSearchQuery] = useState("")
  const [referredSearchQuery, setReferredSearchQuery] = useState("")

  // 보상 모달 상태
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false)
  const [rewardTargetReferral, setRewardTargetReferral] = useState<StudentReferral | null>(null)
  const [rewardForm, setRewardForm] = useState({
    reward_type: "학원비할인" as RewardType,
    reward_amount: "",
    reward_date: new Date(),
    reward_notes: "",
  })

  // 마케팅 활동 핸들러들
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
      activityDate: new Date(activity.activity_date),
      costAmount: activity.cost_amount?.toString() || "",
      contentUrl: activity.content_url || "",
      status: activity.status,
    })
    setIsActivityModalOpen(true)
  }

  const handleSaveActivity = async () => {
    if (!activityForm.channel || !activityForm.title) {
      toast.error("채널과 제목은 필수입니다")
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
        const result = await updateMarketingActivity(supabase, editingActivity.id, input)
        if (result.success) {
          toast.success("마케팅 활동이 수정되었습니다")
          marketingHook.loadData()
          setIsActivityModalOpen(false)
        } else {
          toast.error(result.error || "수정 실패")
        }
      } else {
        const result = await createMarketingActivity(supabase, input)
        if (result.success) {
          toast.success("마케팅 활동이 등록되었습니다")
          marketingHook.loadData()
          setIsActivityModalOpen(false)
        } else {
          toast.error(result.error || "등록 실패")
        }
      }
    } catch (error) {
      toast.error("저장 중 오류가 발생했습니다")
    } finally {
      setSavingActivity(false)
    }
  }

  const handleDeleteActivity = async () => {
    if (!deleteActivityId) return

    try {
      const result = await deleteMarketingActivity(supabase, deleteActivityId)
      if (result.success) {
        toast.success("마케팅 활동이 삭제되었습니다")
        marketingHook.loadData()
      } else {
        toast.error(result.error || "삭제 실패")
      }
    } catch (error) {
      toast.error("삭제 중 오류가 발생했습니다")
    } finally {
      setDeleteActivityId(null)
    }
  }

  // 추천 핸들러들
  const openCreateReferralModal = () => {
    setEditingReferral(null)
    setReferralForm({
      referrer_student_id: "",
      referred_student_id: "",
      referral_date: new Date(),
      referral_type: "학부모추천",
      notes: "",
    })
    setReferrerSearchQuery("")
    setReferredSearchQuery("")
    setIsReferralModalOpen(true)
  }

  const openEditReferralModal = (referral: StudentReferral) => {
    setEditingReferral(referral)
    setReferralForm({
      referrer_student_id: referral.referrer_student_id || "",
      referred_student_id: referral.referred_student_id || "",
      referral_date: new Date(referral.referral_date),
      referral_type: referral.referral_type,
      notes: referral.notes || "",
    })
    setReferrerSearchQuery(referral.referrer_name_snapshot)
    setReferredSearchQuery(referral.referred_name_snapshot)
    setIsReferralModalOpen(true)
  }

  const handleSaveReferral = async () => {
    if (!referralForm.referrer_student_id || !referralForm.referred_student_id) {
      toast.error("추천인과 피추천인을 모두 선택해주세요.")
      return
    }

    setSavingReferral(true)
    try {
      const referrerStudent = allStudents.find(s => s.id === referralForm.referrer_student_id)
      const referredStudent = allStudents.find(s => s.id === referralForm.referred_student_id)

      if (editingReferral) {
        await updateReferral(supabase, editingReferral.id, {
          notes: referralForm.notes,
        })
        toast.success("추천 정보가 수정되었습니다")
      } else {
        await createReferral(supabase, {
          referrer_student_id: referralForm.referrer_student_id,
          referrer_name_snapshot: referrerStudent?.name || "",
          referred_student_id: referralForm.referred_student_id,
          referred_name_snapshot: referredStudent?.name || "",
          referral_date: format(referralForm.referral_date, "yyyy-MM-dd"),
          referral_type: referralForm.referral_type,
          notes: referralForm.notes,
        })
        toast.success("추천이 등록되었습니다")
      }
      setIsReferralModalOpen(false)
      referralHook.loadData()
    } catch (error) {
      console.error("Failed to save referral:", error)
      toast.error("추천 저장에 실패했습니다.")
    } finally {
      setSavingReferral(false)
    }
  }

  const handleDeleteReferral = async () => {
    if (!deleteReferralId) return
    try {
      await deleteReferral(supabase, deleteReferralId)
      toast.success("추천이 삭제되었습니다")
      setDeleteReferralId(null)
      referralHook.loadData()
    } catch (error) {
      console.error("Failed to delete referral:", error)
      toast.error("추천 삭제에 실패했습니다.")
    }
  }

  const handleChangeReferralStatus = async (referralId: string, status: ReferralStatus) => {
    try {
      const enrolledDate = status === '등록완료' ? format(new Date(), "yyyy-MM-dd") : undefined
      await updateReferralStatus(supabase, referralId, status, enrolledDate)
      toast.success("상태가 변경되었습니다")
      referralHook.loadData()
    } catch (error) {
      console.error("Failed to update referral status:", error)
      toast.error("상태 변경에 실패했습니다.")
    }
  }

  const openRewardModal = (referral: StudentReferral) => {
    setRewardTargetReferral(referral)
    setRewardForm({
      reward_type: "학원비할인",
      reward_amount: "",
      reward_date: new Date(),
      reward_notes: "",
    })
    setIsRewardModalOpen(true)
  }

  const handleGiveReward = async () => {
    if (!rewardTargetReferral || !rewardForm.reward_amount) {
      toast.error("보상 금액을 입력해주세요.")
      return
    }

    try {
      await giveReward(supabase, rewardTargetReferral.id, {
        reward_type: rewardForm.reward_type,
        reward_amount: parseInt(rewardForm.reward_amount),
        reward_date: format(rewardForm.reward_date, "yyyy-MM-dd"),
        reward_notes: rewardForm.reward_notes || undefined,
      })
      toast.success("보상이 지급 처리되었습니다")
      setIsRewardModalOpen(false)
      referralHook.loadData()
    } catch (error) {
      console.error("Failed to give reward:", error)
      toast.error("보상 지급에 실패했습니다.")
    }
  }

  // 필터된 학생 목록
  const filteredReferrerStudents = useMemo(() => {
    if (!referrerSearchQuery) return []
    return allStudents.filter(s =>
      s.name.toLowerCase().includes(referrerSearchQuery.toLowerCase()) &&
      s.id !== referralForm.referred_student_id
    ).slice(0, 10)
  }, [allStudents, referrerSearchQuery, referralForm.referred_student_id])

  const filteredReferredStudents = useMemo(() => {
    if (!referredSearchQuery) return []
    return allStudents.filter(s =>
      s.name.toLowerCase().includes(referredSearchQuery.toLowerCase()) &&
      s.id !== referralForm.referrer_student_id
    ).slice(0, 10)
  }, [allStudents, referredSearchQuery, referralForm.referrer_student_id])

  // 마케팅 참가자용 필터된 학생 목록
  const filteredStudentsForMarketing = useMemo(() => {
    const participantIds = new Set(marketingHook.participants.map(p => p.student_id))
    return allStudents
      .filter(s => !participantIds.has(s.id))
      .filter(s => {
        if (!marketingHook.studentSearchQuery) return true
        return s.name.toLowerCase().includes(marketingHook.studentSearchQuery.toLowerCase())
      })
  }, [allStudents, marketingHook.participants, marketingHook.studentSearchQuery])

  // 로딩 상태
  const isLoading = bottleneckHook.loading || cohortHook.loading || leadSourceHook.loading

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">통계 분석</h1>
      <AnalyticsTabs />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* 병목 구간 분석 */}
          <BottleneckTab
            bottlenecks={bottleneckHook.bottlenecks}
            bottleneckDetails={bottleneckHook.bottleneckDetails}
            successPattern={bottleneckHook.successPattern}
          />

          {/* 리드소스 분석 탭 카드 */}
          <Card>
            <CardHeader>
              <CardTitle>리드소스 분석</CardTitle>
              <CardDescription>유입 채널별 성과 및 월별 코호트 추적 (2024년 9월 이후)</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="lead-source" className="w-full">
                <TabsList className="grid w-full max-w-2xl grid-cols-4">
                  <TabsTrigger value="lead-source">리드소스별 성과</TabsTrigger>
                  <TabsTrigger value="cohort">월별 코호트 추적</TabsTrigger>
                  <TabsTrigger value="marketing">마케팅 활동</TabsTrigger>
                  <TabsTrigger value="referral">추천 관리</TabsTrigger>
                </TabsList>

                {/* 리드소스별 성과 탭 */}
                <TabsContent value="lead-source" className="mt-4">
                  <LeadSourceTab
                    sortedMetrics={leadSourceHook.sortedMetrics}
                    summary={leadSourceHook.summary}
                    sortField={leadSourceHook.sortField}
                    sortDirection={leadSourceHook.sortDirection}
                    onSort={leadSourceHook.handleSort}
                  />
                </TabsContent>

                {/* 월별 코호트 추적 탭 */}
                <TabsContent value="cohort" className="mt-4">
                  <CohortTab
                    filteredCohortData={cohortHook.filteredCohortData}
                    cohortLeadSources={cohortHook.cohortLeadSources}
                    chartData={cohortHook.chartData}
                    cohortSummary={cohortHook.cohortSummary}
                    cohortGradeData={cohortHook.cohortGradeData}
                    cohortEnrolledGradeData={cohortHook.cohortEnrolledGradeData}
                    loadingCohortDetails={cohortHook.loadingCohortDetails}
                    expandedCohorts={cohortHook.expandedCohorts}
                    periodFilter={cohortHook.periodFilter}
                    selectedLeadSource={cohortHook.selectedLeadSource}
                    isCohortTableExpanded={cohortHook.isCohortTableExpanded}
                    setPeriodFilter={cohortHook.setPeriodFilter}
                    setSelectedLeadSource={cohortHook.setSelectedLeadSource}
                    setIsCohortTableExpanded={cohortHook.setIsCohortTableExpanded}
                    toggleCohortExpand={cohortHook.toggleCohortExpand}
                    getConversionColor={cohortHook.getConversionColor}
                    getConversionBadgeClass={cohortHook.getConversionBadgeClass}
                    getDaysBadge={cohortHook.getDaysBadge}
                  />
                </TabsContent>

                {/* 마케팅 활동 탭 */}
                <TabsContent value="marketing" className="mt-4">
                  <MarketingTab
                    marketingActivities={marketingHook.marketingActivities}
                    filteredActivities={marketingHook.filteredActivities}
                    selectedActivityId={marketingHook.selectedActivityId}
                    selectedActivity={marketingHook.selectedActivity}
                    activityStatusFilter={marketingHook.activityStatusFilter}
                    activityCountByStatus={marketingHook.activityCountByStatus}
                    participants={marketingHook.participants}
                    loadingParticipants={marketingHook.loadingParticipants}
                    filteredStudents={filteredStudentsForMarketing}
                    studentSearchQuery={marketingHook.studentSearchQuery}
                    selectedStudentIds={marketingHook.selectedStudentIds}
                    participatedDate={marketingHook.participatedDate}
                    savingParticipants={marketingHook.savingParticipants}
                    onStatusFilterChange={marketingHook.setActivityStatusFilter}
                    onSelectActivity={marketingHook.handleSelectActivity}
                    onOpenCreateModal={openCreateActivityModal}
                    onOpenEditModal={openEditActivityModal}
                    onDeleteActivity={(id) => setDeleteActivityId(id)}
                    onStudentSearchChange={marketingHook.setStudentSearchQuery}
                    onSelectedStudentIdsChange={marketingHook.setSelectedStudentIds}
                    onParticipatedDateChange={marketingHook.setParticipatedDate}
                    onAddParticipants={marketingHook.handleAddParticipants}
                    onRemoveParticipant={marketingHook.handleRemoveParticipant}
                  />
                </TabsContent>

                {/* 추천 관리 탭 */}
                <TabsContent value="referral" className="mt-4">
                  <ReferralTab
                    referrals={referralHook.referrals}
                    referralStats={referralHook.referralStats}
                    topReferrers={referralHook.topReferrers}
                    pendingRewards={referralHook.pendingRewards}
                    loadingReferrals={referralHook.loading}
                    onOpenCreateModal={openCreateReferralModal}
                    onOpenEditModal={openEditReferralModal}
                    onDeleteReferral={(id) => setDeleteReferralId(id)}
                    onChangeStatus={handleChangeReferralStatus}
                    onOpenRewardModal={openRewardModal}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}

      {/* 마케팅 활동 생성/수정 모달 */}
      <Dialog open={isActivityModalOpen} onOpenChange={setIsActivityModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingActivity ? "마케팅 활동 수정" : "마케팅 활동 등록"}
            </DialogTitle>
            <DialogDescription>
              마케팅 활동 정보를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>채널 *</Label>
              <Select
                value={activityForm.channel}
                onValueChange={(value) => setActivityForm(prev => ({ ...prev, channel: value as MarketingChannel }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="채널 선택" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map(channel => (
                    <SelectItem key={channel.value} value={channel.value}>{channel.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>제목 *</Label>
              <Input
                value={activityForm.title}
                onChange={(e) => setActivityForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="활동 제목"
              />
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea
                value={activityForm.description}
                onChange={(e) => setActivityForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="활동 설명"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>활동일</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(activityForm.activityDate, "yyyy-MM-dd", { locale: ko })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={activityForm.activityDate}
                      onSelect={(date) => date && setActivityForm(prev => ({ ...prev, activityDate: date }))}
                      locale={ko}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>상태</Label>
                <Select
                  value={activityForm.status}
                  onValueChange={(value) => setActivityForm(prev => ({ ...prev, status: value as MarketingStatus }))}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>비용 (원)</Label>
                <Input
                  type="number"
                  value={activityForm.costAmount}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, costAmount: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>콘텐츠 URL</Label>
                <Input
                  value={activityForm.contentUrl}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, contentUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActivityModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveActivity} disabled={savingActivity}>
              {savingActivity ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingActivity ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 마케팅 활동 삭제 확인 */}
      <AlertDialog open={!!deleteActivityId} onOpenChange={() => setDeleteActivityId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>마케팅 활동 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 마케팅 활동을 삭제하시겠습니까? 관련 참가자 정보도 함께 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteActivity} className="bg-red-500 hover:bg-red-600">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 추천 생성/수정 모달 */}
      <Dialog open={isReferralModalOpen} onOpenChange={setIsReferralModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingReferral ? "추천 정보 수정" : "추천 등록"}
            </DialogTitle>
            <DialogDescription>
              추천인과 피추천인 정보를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 추천인 선택 */}
            <div className="space-y-2">
              <Label>추천인 (재원생) *</Label>
              <Input
                value={referrerSearchQuery}
                onChange={(e) => setReferrerSearchQuery(e.target.value)}
                placeholder="이름으로 검색..."
                disabled={!!editingReferral}
              />
              {referrerSearchQuery && !editingReferral && filteredReferrerStudents.length > 0 && (
                <ScrollArea className="h-[120px] border rounded-md">
                  <div className="p-2 space-y-1">
                    {filteredReferrerStudents.map(s => (
                      <div
                        key={s.id}
                        className={cn(
                          "p-2 rounded cursor-pointer text-sm hover:bg-muted/50",
                          referralForm.referrer_student_id === s.id && "bg-primary/10"
                        )}
                        onClick={() => {
                          setReferralForm(prev => ({ ...prev, referrer_student_id: s.id }))
                          setReferrerSearchQuery(s.name)
                        }}
                      >
                        {s.name}
                        <span className="text-xs text-muted-foreground ml-2">
                          {s.school_type} {s.grade}학년
                        </span>
                        <Badge variant="outline" className="ml-2 text-[10px]">{s.status}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* 피추천인 선택 */}
            <div className="space-y-2">
              <Label>피추천인 (신규상담) *</Label>
              <Input
                value={referredSearchQuery}
                onChange={(e) => setReferredSearchQuery(e.target.value)}
                placeholder="이름으로 검색..."
                disabled={!!editingReferral}
              />
              {referredSearchQuery && !editingReferral && filteredReferredStudents.length > 0 && (
                <ScrollArea className="h-[120px] border rounded-md">
                  <div className="p-2 space-y-1">
                    {filteredReferredStudents.map(s => (
                      <div
                        key={s.id}
                        className={cn(
                          "p-2 rounded cursor-pointer text-sm hover:bg-muted/50",
                          referralForm.referred_student_id === s.id && "bg-primary/10"
                        )}
                        onClick={() => {
                          setReferralForm(prev => ({ ...prev, referred_student_id: s.id }))
                          setReferredSearchQuery(s.name)
                        }}
                      >
                        {s.name}
                        <span className="text-xs text-muted-foreground ml-2">
                          {s.school_type} {s.grade}학년
                        </span>
                        <Badge variant="outline" className="ml-2 text-[10px]">{s.status}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>추천일</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={!!editingReferral}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(referralForm.referral_date, "yyyy-MM-dd", { locale: ko })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={referralForm.referral_date}
                      onSelect={(date) => date && setReferralForm(prev => ({ ...prev, referral_date: date }))}
                      locale={ko}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>추천 유형</Label>
                <Select
                  value={referralForm.referral_type}
                  onValueChange={(value) => setReferralForm(prev => ({ ...prev, referral_type: value as ReferralType }))}
                  disabled={!!editingReferral}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="학부모추천">학부모 추천</SelectItem>
                    <SelectItem value="학생추천">학생 추천</SelectItem>
                    <SelectItem value="형제자매">형제자매</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>메모</Label>
              <Textarea
                value={referralForm.notes}
                onChange={(e) => setReferralForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="추가 메모..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReferralModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveReferral} disabled={savingReferral}>
              {savingReferral ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingReferral ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 추천 삭제 확인 */}
      <AlertDialog open={!!deleteReferralId} onOpenChange={() => setDeleteReferralId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>추천 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 추천 정보를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReferral} className="bg-red-500 hover:bg-red-600">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 보상 지급 모달 */}
      <Dialog open={isRewardModalOpen} onOpenChange={setIsRewardModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>보상 지급</DialogTitle>
            <DialogDescription>
              {rewardTargetReferral && (
                <>
                  <span className="font-medium">{rewardTargetReferral.referrer_name_snapshot}</span>님에게 보상을 지급합니다.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>보상 유형</Label>
              <Select
                value={rewardForm.reward_type}
                onValueChange={(value) => setRewardForm(prev => ({ ...prev, reward_type: value as RewardType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="학원비할인">학원비 할인</SelectItem>
                  <SelectItem value="현금">현금</SelectItem>
                  <SelectItem value="상품권">상품권</SelectItem>
                  <SelectItem value="기타">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>금액 (원) *</Label>
              <Input
                type="number"
                value={rewardForm.reward_amount}
                onChange={(e) => setRewardForm(prev => ({ ...prev, reward_amount: e.target.value }))}
                placeholder="50000"
              />
            </div>
            <div className="space-y-2">
              <Label>지급일</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(rewardForm.reward_date, "yyyy-MM-dd", { locale: ko })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={rewardForm.reward_date}
                    onSelect={(date) => date && setRewardForm(prev => ({ ...prev, reward_date: date }))}
                    locale={ko}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>메모</Label>
              <Textarea
                value={rewardForm.reward_notes}
                onChange={(e) => setRewardForm(prev => ({ ...prev, reward_notes: e.target.value }))}
                placeholder="보상 관련 메모..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRewardModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleGiveReward}>
              지급 완료
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// 기존 코드와의 호환성을 위한 alias
export { FunnelAnalysisPage as FunnelAnalysisPageClient }
