"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import AnalyticsTabs from "@/components/analytics/AnalyticsTabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Loader2, Phone, MessageSquare, Users, TrendingUp, CheckCircle2, AlertTriangle, XCircle, ArrowUpDown, ChevronUp, ChevronDown, ChevronRight, Trophy, Clock, Target, BarChart3, Plus, Pencil, Trash2, CalendarIcon, DollarSign, Megaphone } from "lucide-react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Cell } from "recharts"

interface Bottleneck {
  stage: string
  dropOffRate: number
  avgDaysStuck: number
}

interface BottleneckDetail {
  stage: string
  studentCount: number
  avgConsultations: number
  avgPhone: number
  avgText: number
  avgVisit: number
  avgDaysSinceLastContact: number | null
  dropoutRate: number
}

interface LeadSourceMetrics {
  source: string
  firstContacts: number
  tests: number
  enrollments: number
  conversionRate: number
  testRate: number
  testToEnrollRate: number
  avgDaysToEnroll: number | null
  avgConsultations: number | null
  totalCost: number | null
  costPerLead: number | null
  costPerEnrollment: number | null
}

interface CohortData {
  cohort_month: string
  cohort_date: string
  lead_source?: string
  total_students: number
  test_month_0: number
  test_month_1: number
  test_month_2: number
  test_month_3: number
  test_total: number
  enroll_month_0: number
  enroll_month_1: number
  enroll_month_2: number
  enroll_month_3: number
  enroll_total: number
  final_conversion_rate: number
  avg_days_to_enroll: number | null
  is_ongoing: boolean
}

interface GradeBreakdown {
  school_type: string
  grade: number
  grade_label: string
  total_count: number
  with_test_count: number
  without_test_count: number
}

interface EnrolledGradeBreakdown {
  school_type: string
  grade: number
  grade_label: string
  total_count: number
  same_month_count: number
  delayed_count: number
}

type PeriodFilter = "6months" | "1year" | "all"

type SortField = "source" | "firstContacts" | "tests" | "enrollments" | "conversionRate" | "testRate" | "testToEnrollRate" | "avgDaysToEnroll" | "avgConsultations" | "totalCost"
type SortDirection = "asc" | "desc"

export function FunnelAnalysisPageClient() {
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([])
  const [bottleneckDetails, setBottleneckDetails] = useState<BottleneckDetail[]>([])
  const [successPattern, setSuccessPattern] = useState<BottleneckDetail | null>(null)
  const [leadSourceMetrics, setLeadSourceMetrics] = useState<LeadSourceMetrics[]>([])
  const [leadSourceSummary, setLeadSourceSummary] = useState<LeadSourceMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  // 코호트 관련 상태
  const [cohortData, setCohortData] = useState<CohortData[]>([])
  const [cohortAggregated, setCohortAggregated] = useState<CohortData[]>([])
  const [cohortLeadSources, setCohortLeadSources] = useState<string[]>([])
  const [selectedLeadSource, setSelectedLeadSource] = useState<string>("all")
  const [cohortLoading, setCohortLoading] = useState(false)
  const [expandedCohorts, setExpandedCohorts] = useState<Set<string>>(new Set())
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("1year")
  const [isCohortTableExpanded, setIsCohortTableExpanded] = useState(true) // 디폴트 펼침
  const [cohortGradeData, setCohortGradeData] = useState<Record<string, GradeBreakdown[]>>({})
  const [cohortEnrolledGradeData, setCohortEnrolledGradeData] = useState<Record<string, EnrolledGradeBreakdown[]>>({})
  const [loadingCohortDetails, setLoadingCohortDetails] = useState<Set<string>>(new Set())

  // 리드소스 테이블 정렬 상태
  const [sortField, setSortField] = useState<SortField>("firstContacts")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

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

  const supabase = createClient()
  const channels = getAllChannels()

  useEffect(() => {
    loadData()
    loadMarketingActivities()
    loadAllStudents()
    loadReferralData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [bottlenecksRes, leadSourceRes, cohortRes] = await Promise.all([
        fetch("/api/funnel/bottlenecks"),
        fetch("/api/funnel/by-source"),
        fetch("/api/funnel/cohort"),
      ])

      if (bottlenecksRes.ok) {
        const bottlenecksData = await bottlenecksRes.json()
        setBottlenecks(bottlenecksData.data)
        setBottleneckDetails(bottlenecksData.details || [])
        setSuccessPattern(bottlenecksData.successPattern || null)
      }

      if (leadSourceRes.ok) {
        const leadSourceData = await leadSourceRes.json()
        setLeadSourceMetrics(leadSourceData.data || [])
        setLeadSourceSummary(leadSourceData.summary || null)
      }

      if (cohortRes.ok) {
        const cohortResult = await cohortRes.json()
        setCohortData(cohortResult.data || [])
        setCohortAggregated(cohortResult.aggregated || [])
        setCohortLeadSources(cohortResult.leadSources || [])
      }
    } catch (error) {
      console.error("Failed to load funnel data:", error)
      toast.error("퍼널 데이터를 불러오는데 실패했습니다.")
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

  // 추천 모달 열기 (등록)
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

  // 추천 모달 열기 (수정)
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

  // 추천 저장
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
      loadReferralData()
    } catch (error) {
      console.error("Failed to save referral:", error)
      toast.error("추천 저장에 실패했습니다.")
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
    } catch (error) {
      console.error("Failed to delete referral:", error)
      toast.error("추천 삭제에 실패했습니다.")
    }
  }

  // 추천 상태 변경
  const handleChangeReferralStatus = async (referralId: string, status: ReferralStatus) => {
    try {
      const enrolledDate = status === '등록완료' ? format(new Date(), "yyyy-MM-dd") : undefined
      await updateReferralStatus(supabase, referralId, status, enrolledDate)
      toast.success("상태가 변경되었습니다")
      loadReferralData()
    } catch (error) {
      console.error("Failed to update referral status:", error)
      toast.error("상태 변경에 실패했습니다.")
    }
  }

  // 보상 모달 열기
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

  // 보상 지급 처리
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
      loadReferralData()
    } catch (error) {
      console.error("Failed to give reward:", error)
      toast.error("보상 지급에 실패했습니다.")
    }
  }

  // 추천인 검색 필터
  const filteredReferrerStudents = useMemo(() => {
    if (!referrerSearchQuery) return []
    return allStudents.filter(s =>
      s.name.toLowerCase().includes(referrerSearchQuery.toLowerCase()) &&
      s.id !== referralForm.referred_student_id
    ).slice(0, 10)
  }, [allStudents, referrerSearchQuery, referralForm.referred_student_id])

  // 피추천인 검색 필터
  const filteredReferredStudents = useMemo(() => {
    if (!referredSearchQuery) return []
    return allStudents.filter(s =>
      s.name.toLowerCase().includes(referredSearchQuery.toLowerCase()) &&
      s.id !== referralForm.referrer_student_id
    ).slice(0, 10)
  }, [allStudents, referredSearchQuery, referralForm.referrer_student_id])

  // 활동 선택 시 참가자 로드
  const handleSelectActivity = async (activityId: string) => {
    setSelectedActivityId(activityId)
    setLoadingParticipants(true)
    setSelectedStudentIds([])
    setStudentSearchQuery("")

    // 선택한 활동의 날짜로 참가 날짜 초기화
    const activity = marketingActivities.find(a => a.id === activityId)
    if (activity) {
      setParticipatedDate(new Date(activity.activity_date))
    }

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

  // 참가자 추가
  const handleAddParticipants = async () => {
    if (!selectedActivityId || selectedStudentIds.length === 0) return

    setSavingParticipants(true)
    try {
      const participatedAtStr = format(participatedDate, "yyyy-MM-dd")
      const result = await addActivityParticipants(supabase, selectedActivityId, selectedStudentIds, undefined, participatedAtStr)
      if (result.added > 0) {
        toast.success(`${result.added}명의 참가자가 추가되었습니다.`)
        // 참가자 목록 새로고침
        const data = await getActivityParticipants(supabase, selectedActivityId)
        setParticipants(data)
        setSelectedStudentIds([])
      }
      if (result.errors.length > 0) {
        toast.error(result.errors[0])
      }
    } catch (error) {
      console.error("Failed to add participants:", error)
      toast.error("참가자 추가에 실패했습니다.")
    } finally {
      setSavingParticipants(false)
    }
  }

  // 참가자 삭제
  const handleRemoveParticipant = async (participantId: string) => {
    if (!selectedActivityId) return

    try {
      const result = await removeActivityParticipant(supabase, participantId)
      if (result.success) {
        toast.success("참가자가 삭제되었습니다.")
        // 참가자 목록 새로고침
        const data = await getActivityParticipants(supabase, selectedActivityId)
        setParticipants(data)
      } else {
        toast.error(result.error || "참가자 삭제에 실패했습니다.")
      }
    } catch (error) {
      console.error("Failed to remove participant:", error)
      toast.error("참가자 삭제에 실패했습니다.")
    }
  }

  // 필터된 학생 목록 (이미 참가한 학생 제외)
  const filteredStudents = useMemo(() => {
    const participantIds = new Set(participants.map(p => p.student_id))
    return allStudents
      .filter(s => !participantIds.has(s.id))
      .filter(s => {
        if (!studentSearchQuery) return true
        const query = studentSearchQuery.toLowerCase()
        return s.name.toLowerCase().includes(query)
      })
  }, [allStudents, participants, studentSearchQuery])

  // 선택된 활동 정보
  const selectedActivity = useMemo(() => {
    return marketingActivities.find(a => a.id === selectedActivityId)
  }, [marketingActivities, selectedActivityId])

  // 상태별 필터링된 활동 목록
  const filteredActivities = useMemo(() => {
    if (activityStatusFilter === "all") return marketingActivities
    return marketingActivities.filter(a => a.status === activityStatusFilter)
  }, [marketingActivities, activityStatusFilter])

  // 상태별 활동 개수
  const activityCountByStatus = useMemo(() => {
    return {
      all: marketingActivities.length,
      planned: marketingActivities.filter(a => a.status === "planned").length,
      in_progress: marketingActivities.filter(a => a.status === "in_progress").length,
      completed: marketingActivities.filter(a => a.status === "completed").length,
      cancelled: marketingActivities.filter(a => a.status === "cancelled").length,
    }
  }, [marketingActivities])

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
      activityDate: new Date(activity.activity_date),
      costAmount: activity.cost_amount?.toString() || "",
      contentUrl: activity.content_url || "",
      status: activity.status,
    })
    setIsActivityModalOpen(true)
  }

  // 마케팅 활동 저장
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
          loadMarketingActivities()
          setIsActivityModalOpen(false)
        } else {
          toast.error(result.error || "수정 실패")
        }
      } else {
        const result = await createMarketingActivity(supabase, input)
        if (result.success) {
          toast.success("마케팅 활동이 등록되었습니다")
          loadMarketingActivities()
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

  // 마케팅 활동 삭제
  const handleDeleteActivity = async () => {
    if (!deleteActivityId) return

    try {
      const result = await deleteMarketingActivity(supabase, deleteActivityId)
      if (result.success) {
        toast.success("마케팅 활동이 삭제되었습니다")
        loadMarketingActivities()
      } else {
        toast.error(result.error || "삭제 실패")
      }
    } catch (error) {
      toast.error("삭제 중 오류가 발생했습니다")
    } finally {
      setDeleteActivityId(null)
    }
  }

  // 병목 단계에 해당하는 상세 데이터 찾기
  const getDetailForStage = (stageName: string): BottleneckDetail | null => {
    const stageMapping: Record<string, string> = {
      "첫 상담 → 입학테스트": "테스트미완료",
      "입학테스트 → 등록완료": "테스트완료-미등록",
    }
    const detailStage = stageMapping[stageName]
    return bottleneckDetails.find(d => d.stage === detailStage) || null
  }

  // 상담 횟수 상태 판단
  const getConsultationStatus = (current: number, baseline: number) => {
    const ratio = current / baseline
    if (ratio < 0.5) return { status: "critical", color: "text-red-600", bg: "bg-red-50", label: "매우 부족" }
    if (ratio < 0.8) return { status: "warning", color: "text-amber-600", bg: "bg-amber-50", label: "부족" }
    if (ratio <= 1.2) return { status: "normal", color: "text-gray-600", bg: "bg-gray-50", label: "적정" }
    return { status: "excess", color: "text-blue-600", bg: "bg-blue-50", label: "기준 초과" }
  }

  // 액션 포인트 생성
  const getActionPoints = (detail: BottleneckDetail, success: BottleneckDetail | null): string[] => {
    const actions: string[] = []
    if (!success) return actions

    if (detail.stage === "테스트미완료") {
      const gap = success.avgConsultations - detail.avgConsultations
      if (gap > 0.5) {
        actions.push(`상담 횟수가 기준 대비 ${gap.toFixed(1)}회 부족합니다. 최소 2회 이상 상담 권장`)
      }
      if (detail.avgDaysSinceLastContact && detail.avgDaysSinceLastContact > 14) {
        actions.push(`${detail.studentCount}명이 평균 ${Math.round(detail.avgDaysSinceLastContact)}일 방치 상태입니다. 즉시 팔로업 필요`)
      }
      if (detail.avgPhone < success.avgPhone) {
        actions.push(`전화 상담 비율을 높이세요 (현재 ${detail.avgPhone}회 → 목표 ${success.avgPhone}회)`)
      }
    } else if (detail.stage === "테스트완료-미등록") {
      if (detail.avgConsultations >= success.avgConsultations) {
        actions.push(`상담 횟수는 충분합니다 (${detail.avgConsultations}회). 가격/거리/경쟁학원 등 다른 요인 분석 필요`)
      }
      if (detail.avgVisit > success.avgVisit) {
        actions.push(`대면 상담이 많음에도 이탈. 상담 내용/제안 방식 점검 권장`)
      }
      if (detail.avgDaysSinceLastContact && detail.avgDaysSinceLastContact > 14) {
        actions.push(`${detail.studentCount}명 미등록 상태로 ${Math.round(detail.avgDaysSinceLastContact)}일 경과. 마지막 설득 시도 권장`)
      }
    }
    return actions
  }

  // 리드소스 테이블 정렬
  const sortedLeadSourceMetrics = useMemo(() => {
    const sorted = [...leadSourceMetrics].sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      // null 처리
      if (aVal === null) aVal = -Infinity
      if (bVal === null) bVal = -Infinity

      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
      }
    })
    return sorted
  }, [leadSourceMetrics, sortField, sortDirection])

  // 정렬 토글
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  // 정렬 아이콘
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />
    return sortDirection === "asc"
      ? <ChevronUp className="h-3 w-3 ml-1" />
      : <ChevronDown className="h-3 w-3 ml-1" />
  }

  // 기간 필터 적용된 코호트 데이터
  const periodFilteredCohortData = useMemo(() => {
    const baseData = selectedLeadSource === "all" ? cohortAggregated : cohortData.filter(d => d.lead_source === selectedLeadSource)

    if (periodFilter === "all") {
      return baseData
    }

    const now = new Date()
    const monthsBack = periodFilter === "6months" ? 6 : 12
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1)
    const cutoffStr = cutoffDate.toISOString().slice(0, 7) // "YYYY-MM"

    return baseData.filter(d => d.cohort_month >= cutoffStr)
  }, [cohortData, cohortAggregated, selectedLeadSource, periodFilter])

  // 코호트 데이터 필터링 (하위 호환용)
  const filteredCohortData = periodFilteredCohortData

  // 전환율 색상
  const getConversionColor = (rate: number, isOngoing: boolean) => {
    if (isOngoing) return "text-gray-500"
    if (rate >= 50) return "text-emerald-600"
    if (rate >= 30) return "text-sky-600"
    if (rate >= 15) return "text-amber-600"
    return "text-red-600"
  }

  // 전환율 배지 색상
  const getConversionBadgeClass = (rate: number, isOngoing: boolean) => {
    if (isOngoing) return "bg-gray-100 text-gray-600 border-gray-200"
    if (rate >= 40) return "bg-emerald-100 text-emerald-700 border-emerald-200"
    if (rate >= 20) return "bg-amber-100 text-amber-700 border-amber-200"
    return "bg-red-100 text-red-700 border-red-200"
  }

  // 소요일 배지
  const getDaysBadge = (days: number | null) => {
    if (days === null) return null
    if (days <= 14) return { label: "즉시등록", class: "bg-emerald-100 text-emerald-700" }
    if (days <= 30) return { label: "빠른등록", class: "bg-sky-100 text-sky-700" }
    if (days <= 60) return { label: "일반", class: "bg-gray-100 text-gray-600" }
    return { label: "지연등록", class: "bg-amber-100 text-amber-700" }
  }

  // 코호트별 학년 데이터 가져오기 (미등록 + 등록)
  const fetchCohortGradeData = async (cohortMonth: string, leadSource: string | null) => {
    const cacheKey = `${cohortMonth}-${leadSource || 'all'}`

    // 이미 로딩 중이거나 데이터가 있으면 스킵
    if (loadingCohortDetails.has(cacheKey) || cohortGradeData[cacheKey]) {
      return
    }

    setLoadingCohortDetails(prev => new Set(prev).add(cacheKey))

    try {
      const params = new URLSearchParams({ cohort_month: cohortMonth })
      if (leadSource && leadSource !== 'all') {
        params.append('lead_source', leadSource)
      }

      const res = await fetch(`/api/funnel/cohort/details?${params}`)
      if (res.ok) {
        const data = await res.json()
        // 미등록 학년 데이터
        setCohortGradeData(prev => ({
          ...prev,
          [cacheKey]: data.gradeBreakdown || []
        }))
        // 등록 학년 데이터
        setCohortEnrolledGradeData(prev => ({
          ...prev,
          [cacheKey]: data.enrolledGradeBreakdown || []
        }))
      }
    } catch (error) {
      console.error('Failed to fetch cohort grade data:', error)
    } finally {
      setLoadingCohortDetails(prev => {
        const next = new Set(prev)
        next.delete(cacheKey)
        return next
      })
    }
  }

  // 코호트 행 토글
  const toggleCohortExpand = (cohortKey: string, cohortMonth: string, leadSource: string | undefined) => {
    setExpandedCohorts(prev => {
      const next = new Set(prev)
      if (next.has(cohortKey)) {
        next.delete(cohortKey)
      } else {
        next.add(cohortKey)
        // 확장될 때 학년 데이터 가져오기
        fetchCohortGradeData(cohortMonth, leadSource || null)
      }
      return next
    })
  }

  // 코호트 요약 통계 계산
  const cohortSummary = useMemo(() => {
    const data = filteredCohortData
    if (data.length === 0) return null

    // 최근 3개월 (진행중 제외)
    const completedCohorts = data.filter(c => !c.is_ongoing)
    const recent3Months = completedCohorts.slice(0, 3)
    const older3Months = completedCohorts.slice(3, 6)

    // 최근 3개월 평균 전환율
    const recent3Avg = recent3Months.length > 0
      ? recent3Months.reduce((sum, c) => sum + c.final_conversion_rate, 0) / recent3Months.length
      : 0

    // 이전 3개월 평균 전환율 (비교용)
    const older3Avg = older3Months.length > 0
      ? older3Months.reduce((sum, c) => sum + c.final_conversion_rate, 0) / older3Months.length
      : 0

    const conversionChange = recent3Avg - older3Avg

    // 진행중 코호트
    const ongoingCohorts = data.filter(c => c.is_ongoing)
    const totalOngoing = ongoingCohorts.reduce((sum, c) => sum + c.total_students, 0)
    const convertedOngoing = ongoingCohorts.reduce((sum, c) => sum + c.enroll_total, 0)

    // 평균 등록 소요일 (완료된 코호트만)
    const cohortsWithDays = completedCohorts.filter(c => c.avg_days_to_enroll !== null)
    const avgDaysToEnroll = cohortsWithDays.length > 0
      ? cohortsWithDays.reduce((sum, c) => sum + (c.avg_days_to_enroll || 0), 0) / cohortsWithDays.length
      : null

    // Best/Worst 코호트 (진행중 포함)
    const allCohorts = data
    const bestCohort = allCohorts.length > 0
      ? allCohorts.reduce((best, c) => c.final_conversion_rate > best.final_conversion_rate ? c : best)
      : null
    const worstCohort = allCohorts.length > 0
      ? allCohorts.reduce((worst, c) => c.final_conversion_rate < worst.final_conversion_rate ? c : worst)
      : null

    return {
      recent3Avg: Math.round(recent3Avg * 10) / 10,
      conversionChange: Math.round(conversionChange * 10) / 10,
      totalOngoing,
      convertedOngoing,
      ongoingConversionRate: totalOngoing > 0 ? Math.round((convertedOngoing / totalOngoing) * 1000) / 10 : 0,
      avgDaysToEnroll: avgDaysToEnroll !== null ? Math.round(avgDaysToEnroll) : null,
      bestCohort,
      worstCohort,
    }
  }, [filteredCohortData])

  // 차트용 데이터 (월 오름차순) + YoY 계산
  const chartData = useMemo(() => {
    const sorted = [...filteredCohortData].sort((a, b) => a.cohort_month.localeCompare(b.cohort_month))

    // 연도-월별로 매핑해서 전년 동월 찾기
    const monthMap = new Map<string, number>()
    sorted.forEach(c => {
      monthMap.set(c.cohort_month, c.final_conversion_rate)
    })

    return sorted.map(c => {
      const [year, month] = c.cohort_month.split('-')
      const prevYearMonth = `${parseInt(year) - 1}-${month}`
      const prevYearRate = monthMap.get(prevYearMonth)

      // YoY 변화율 계산 (전년 데이터 있을 때만)
      let yoyChange: number | null = null
      if (prevYearRate !== undefined && prevYearRate > 0) {
        yoyChange = Math.round((c.final_conversion_rate - prevYearRate) * 10) / 10
      }

      return {
        month: c.cohort_month.slice(5), // "2024-09" -> "09"
        fullMonth: c.cohort_month,
        year: year,
        전환율: c.final_conversion_rate,
        총원: c.total_students,
        등록: c.enroll_total,
        isOngoing: c.is_ongoing,
        yoyChange, // YoY 변화 (전년 대비 %p 차이)
        prevYearRate, // 전년도 전환율
      }
    })
  }, [filteredCohortData])


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">통계 분석</h1>
      <AnalyticsTabs />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* 병목 구간 분석 */}
          <Card>
            <CardHeader>
              <CardTitle>병목 구간 상세 분석</CardTitle>
              <CardDescription>
                이탈 구간별 상담 패턴과 등록 성공 패턴을 비교하여 액션 포인트를 도출합니다. (2024년 9월 이후)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 등록 성공 패턴 기준 배너 */}
              {successPattern && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold mb-3">
                    <CheckCircle2 className="h-5 w-5" />
                    등록 성공 패턴 ({successPattern.studentCount}명 기준)
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      <span>평균 <strong>{successPattern.avgConsultations}회</strong> 상담</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-emerald-600" />
                      <span>전화 <strong>{successPattern.avgPhone}회</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-emerald-600" />
                      <span>문자 <strong>{successPattern.avgText}회</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-emerald-600" />
                      <span>대면 <strong>{successPattern.avgVisit}회</strong></span>
                    </div>
                  </div>
                </div>
              )}

              {/* 병목 단계별 상세 분석 - 좌우 배치 */}
              {bottlenecks.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {bottlenecks.map((bottleneck, index) => {
                    const detail = getDetailForStage(bottleneck.stage)
                    const consultStatus = detail && successPattern
                      ? getConsultationStatus(detail.avgConsultations, successPattern.avgConsultations)
                      : null
                    const actions = detail ? getActionPoints(detail, successPattern) : []

                    return (
                      <div
                        key={index}
                        className={`rounded-lg border-2 overflow-hidden ${
                          bottleneck.dropOffRate > 40
                            ? "border-red-200"
                            : bottleneck.dropOffRate > 20
                            ? "border-amber-200"
                            : "border-gray-200"
                        }`}
                      >
                        {/* 헤더 */}
                        <div className={`px-4 py-3 flex items-center justify-between ${
                          bottleneck.dropOffRate > 40
                            ? "bg-red-50"
                            : bottleneck.dropOffRate > 20
                            ? "bg-amber-50"
                            : "bg-gray-50"
                        }`}>
                          <div className="flex items-center gap-3">
                            {bottleneck.dropOffRate > 40 ? (
                              <XCircle className="h-5 w-5 text-red-500" />
                            ) : bottleneck.dropOffRate > 20 ? (
                              <AlertTriangle className="h-5 w-5 text-amber-500" />
                            ) : (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            )}
                            <div>
                              <p className="font-semibold">{bottleneck.stage}</p>
                              {detail && (
                                <p className="text-sm text-muted-foreground">{detail.studentCount}명 해당</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${
                              bottleneck.dropOffRate > 40
                                ? "text-red-600"
                                : bottleneck.dropOffRate > 20
                                ? "text-amber-600"
                                : "text-green-600"
                            }`}>
                              {bottleneck.dropOffRate}%
                            </div>
                            <p className="text-xs text-muted-foreground">이탈률</p>
                          </div>
                        </div>

                        {/* 상세 내용 */}
                        {detail && (
                          <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className={`p-3 rounded-lg ${consultStatus?.bg || "bg-gray-50"}`}>
                                <div className="text-xs text-muted-foreground mb-1">상담 횟수</div>
                                <div className={`text-xl font-bold ${consultStatus?.color || "text-gray-600"}`}>
                                  {detail.avgConsultations}회
                                </div>
                                {successPattern && (
                                  <div className="text-xs mt-1">
                                    {detail.avgConsultations < successPattern.avgConsultations ? (
                                      <span className="text-red-500">
                                        ▼ {(successPattern.avgConsultations - detail.avgConsultations).toFixed(1)}회 부족
                                      </span>
                                    ) : detail.avgConsultations > successPattern.avgConsultations ? (
                                      <span className="text-blue-500">
                                        ▲ {(detail.avgConsultations - successPattern.avgConsultations).toFixed(1)}회 초과
                                      </span>
                                    ) : (
                                      <span className="text-green-500">기준 충족</span>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className={`p-3 rounded-lg ${
                                successPattern && detail.avgPhone < successPattern.avgPhone * 0.7
                                  ? "bg-red-50"
                                  : "bg-gray-50"
                              }`}>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                  <Phone className="h-3 w-3" /> 전화
                                </div>
                                <div className="text-xl font-bold">{detail.avgPhone}회</div>
                                {successPattern && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    기준 {successPattern.avgPhone}회
                                  </div>
                                )}
                              </div>

                              <div className="p-3 rounded-lg bg-gray-50">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                  <MessageSquare className="h-3 w-3" /> 문자
                                </div>
                                <div className="text-xl font-bold">{detail.avgText}회</div>
                                {successPattern && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    기준 {successPattern.avgText}회
                                  </div>
                                )}
                              </div>

                              <div className={`p-3 rounded-lg ${
                                successPattern && detail.avgVisit > successPattern.avgVisit * 1.5
                                  ? "bg-blue-50"
                                  : "bg-gray-50"
                              }`}>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                  <Users className="h-3 w-3" /> 대면
                                </div>
                                <div className="text-xl font-bold">{detail.avgVisit}회</div>
                                {successPattern && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    기준 {successPattern.avgVisit}회
                                  </div>
                                )}
                              </div>
                            </div>

                            {actions.length > 0 && (
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
                                  <AlertTriangle className="h-4 w-4" />
                                  액션 포인트
                                </div>
                                <ul className="space-y-1.5 text-sm text-amber-800">
                                  {actions.map((action, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <span className="text-amber-500 mt-0.5">•</span>
                                      {action}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {!detail && (
                          <div className="p-4 text-center text-muted-foreground">
                            상세 분석 데이터가 없습니다.
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  병목 분석 데이터가 없습니다.
                </div>
              )}
            </CardContent>
          </Card>

          {/* 리드소스 성과 & 코호트 분석 탭 */}
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
                <TabsContent value="lead-source" className="mt-4 space-y-4">
                  {/* 테이블 상단 설명 */}
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">유입 채널별 전환율 및 비용 효율 분석</p>
                  </div>

                  {sortedLeadSourceMetrics.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            <th
                              className="text-left p-2 cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("source")}
                            >
                              <div className="flex items-center">
                                소스 <SortIcon field="source" />
                              </div>
                            </th>
                            <th
                              className="text-center p-2 cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("firstContacts")}
                            >
                              <div className="flex items-center justify-center">
                                첫상담 <SortIcon field="firstContacts" />
                              </div>
                            </th>
                            <th
                              className="text-center p-2 cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("tests")}
                            >
                              <div className="flex items-center justify-center">
                                테스트 <SortIcon field="tests" />
                              </div>
                            </th>
                            <th
                              className="text-center p-2 cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("enrollments")}
                            >
                              <div className="flex items-center justify-center">
                                등록 <SortIcon field="enrollments" />
                              </div>
                            </th>
                            <th
                              className="text-center p-2 cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("testRate")}
                            >
                              <div className="flex items-center justify-center">
                                리드→테스트 <SortIcon field="testRate" />
                              </div>
                            </th>
                            <th
                              className="text-center p-2 cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("testToEnrollRate")}
                            >
                              <div className="flex items-center justify-center">
                                테스트→등록 <SortIcon field="testToEnrollRate" />
                              </div>
                            </th>
                            <th
                              className="text-center p-2 cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("conversionRate")}
                            >
                              <div className="flex items-center justify-center">
                                전체전환율 <SortIcon field="conversionRate" />
                              </div>
                            </th>
                            <th
                              className="text-center p-2 cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("avgDaysToEnroll")}
                            >
                              <div className="flex items-center justify-center">
                                소요일 <SortIcon field="avgDaysToEnroll" />
                              </div>
                            </th>
                            <th
                              className="text-center p-2 cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("avgConsultations")}
                            >
                              <div className="flex items-center justify-center">
                                상담횟수 <SortIcon field="avgConsultations" />
                              </div>
                            </th>
                            <th
                              className="text-center p-2 cursor-pointer hover:bg-muted/50 select-none"
                              onClick={() => handleSort("totalCost")}
                            >
                              <div className="flex items-center justify-center">
                                비용 <SortIcon field="totalCost" />
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedLeadSourceMetrics.map((source) => (
                            <tr key={source.source} className="border-b hover:bg-muted/50">
                              <td className="p-2 font-medium">{source.source}</td>
                              <td className="p-2 text-center">{source.firstContacts}</td>
                              <td className="p-2 text-center">{source.tests}</td>
                              <td className="p-2 text-center font-bold text-green-600">
                                {source.enrollments}
                              </td>
                              <td className="p-2 text-center">
                                <Badge
                                  className={
                                    source.testRate >= 70
                                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                      : source.testRate >= 50
                                      ? "bg-sky-100 text-sky-700 hover:bg-sky-100"
                                      : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                                  }
                                >
                                  {source.testRate}%
                                </Badge>
                              </td>
                              <td className="p-2 text-center">
                                <Badge
                                  className={
                                    source.testToEnrollRate >= 60
                                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                      : source.testToEnrollRate >= 40
                                      ? "bg-sky-100 text-sky-700 hover:bg-sky-100"
                                      : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                                  }
                                >
                                  {source.testToEnrollRate}%
                                </Badge>
                              </td>
                              <td className="p-2 text-center">
                                <Badge
                                  className={
                                    source.conversionRate >= 30
                                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                      : source.conversionRate >= 15
                                      ? "bg-sky-100 text-sky-700 hover:bg-sky-100"
                                      : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                                  }
                                >
                                  {source.conversionRate}%
                                </Badge>
                              </td>
                              <td className="p-2 text-center text-muted-foreground">
                                {source.avgDaysToEnroll !== null ? `${source.avgDaysToEnroll}일` : "-"}
                              </td>
                              <td className="p-2 text-center text-muted-foreground">
                                {source.avgConsultations !== null ? `${source.avgConsultations}회` : "-"}
                              </td>
                              <td className="p-2 text-center text-muted-foreground">
                                {source.totalCost !== null ? `${source.totalCost.toLocaleString()}원` : "-"}
                              </td>
                            </tr>
                          ))}
                          {leadSourceSummary && (
                            <tr className="border-t-2 bg-muted/50 font-semibold">
                              <td className="p-2">{leadSourceSummary.source}</td>
                              <td className="p-2 text-center">{leadSourceSummary.firstContacts}</td>
                              <td className="p-2 text-center">{leadSourceSummary.tests}</td>
                              <td className="p-2 text-center text-green-600">
                                {leadSourceSummary.enrollments}
                              </td>
                              <td className="p-2 text-center">
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                  {leadSourceSummary.testRate}%
                                </Badge>
                              </td>
                              <td className="p-2 text-center">
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                  {leadSourceSummary.testToEnrollRate}%
                                </Badge>
                              </td>
                              <td className="p-2 text-center">
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                  {leadSourceSummary.conversionRate}%
                                </Badge>
                              </td>
                              <td className="p-2 text-center">
                                {leadSourceSummary.avgDaysToEnroll !== null ? `${leadSourceSummary.avgDaysToEnroll}일` : "-"}
                              </td>
                              <td className="p-2 text-center">
                                {leadSourceSummary.avgConsultations !== null ? `${leadSourceSummary.avgConsultations}회` : "-"}
                              </td>
                              <td className="p-2 text-center">
                                {leadSourceSummary.totalCost !== null ? `${leadSourceSummary.totalCost.toLocaleString()}원` : "-"}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      리드 소스 데이터가 없습니다.
                    </div>
                  )}
                </TabsContent>

                {/* 월별 코호트 추적 탭 */}
                <TabsContent value="cohort" className="mt-4 space-y-6">
                  {/* 필터 영역 */}
                  <div className="flex flex-wrap items-center gap-4">
                    {/* 기간 필터 */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">기간:</span>
                      <Select value={periodFilter} onValueChange={(value: PeriodFilter) => setPeriodFilter(value)}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="6months">최근 6개월</SelectItem>
                          <SelectItem value="1year">최근 1년</SelectItem>
                          <SelectItem value="all">전체</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 리드소스 필터 */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">리드소스:</span>
                      <Select value={selectedLeadSource} onValueChange={setSelectedLeadSource}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="전체" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">전체 (합산)</SelectItem>
                          {cohortLeadSources.map(source => (
                            <SelectItem key={source} value={source}>{source}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* 상단 요약 카드 4개 */}
                  {cohortSummary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* 최근 3개월 평균 전환율 */}
                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-4 border border-emerald-200">
                        <div className="flex items-center gap-2 text-emerald-700 mb-2">
                          <Target className="h-4 w-4" />
                          <span className="text-xs font-medium">최근 3개월 평균</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-emerald-700">
                            {cohortSummary.recent3Avg}%
                          </span>
                          {cohortSummary.conversionChange !== 0 && (
                            <span className={`text-sm font-medium ${cohortSummary.conversionChange > 0 ? "text-emerald-600" : "text-red-500"}`}>
                              {cohortSummary.conversionChange > 0 ? "▲" : "▼"} {Math.abs(cohortSummary.conversionChange)}%p
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-emerald-600 mt-1">vs 이전 3개월</p>
                      </div>

                      {/* 진행중 코호트 현황 */}
                      <div className="bg-gradient-to-br from-sky-50 to-sky-100/50 rounded-xl p-4 border border-sky-200">
                        <div className="flex items-center gap-2 text-sky-700 mb-2">
                          <BarChart3 className="h-4 w-4" />
                          <span className="text-xs font-medium">진행중 코호트</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-sky-700">
                            {cohortSummary.convertedOngoing}/{cohortSummary.totalOngoing}
                          </span>
                          <span className="text-sm text-sky-600">명</span>
                        </div>
                        <p className="text-xs text-sky-600 mt-1">
                          현재 {cohortSummary.ongoingConversionRate}% 전환
                        </p>
                      </div>

                      {/* 평균 등록 소요일 */}
                      <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 rounded-xl p-4 border border-violet-200">
                        <div className="flex items-center gap-2 text-violet-700 mb-2">
                          <Clock className="h-4 w-4" />
                          <span className="text-xs font-medium">평균 등록 소요</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-violet-700">
                            {cohortSummary.avgDaysToEnroll !== null ? cohortSummary.avgDaysToEnroll : "-"}
                          </span>
                          {cohortSummary.avgDaysToEnroll !== null && (
                            <span className="text-sm text-violet-600">일</span>
                          )}
                        </div>
                        <p className="text-xs text-violet-600 mt-1">첫상담 → 등록</p>
                      </div>

                      {/* Best/Worst 코호트 */}
                      <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-4 border border-amber-200">
                        <div className="flex items-center gap-2 text-amber-700 mb-2">
                          <Trophy className="h-4 w-4" />
                          <span className="text-xs font-medium">Best / Worst</span>
                        </div>
                        <div className="space-y-1">
                          {cohortSummary.bestCohort && (
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-600 text-lg">🏆</span>
                              <span className="text-sm font-medium text-emerald-700">
                                {cohortSummary.bestCohort.cohort_month.slice(5)}월 {cohortSummary.bestCohort.final_conversion_rate}%
                              </span>
                              {cohortSummary.bestCohort.is_ongoing && (
                                <span className="text-[10px] text-sky-600 bg-sky-100 px-1 rounded">진행중</span>
                              )}
                            </div>
                          )}
                          {cohortSummary.worstCohort && (
                            <div className="flex items-center gap-2">
                              <span className="text-red-400 text-lg">📉</span>
                              <span className="text-sm font-medium text-red-600">
                                {cohortSummary.worstCohort.cohort_month.slice(5)}월 {cohortSummary.worstCohort.final_conversion_rate}%
                              </span>
                              {cohortSummary.worstCohort.is_ongoing && (
                                <span className="text-[10px] text-sky-600 bg-sky-100 px-1 rounded">진행중</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 전환율 추이 + 상담/등록 건수 + YoY 통합 차트 */}
                  {chartData.length > 0 && (
                    <div className="bg-white rounded-xl border p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium text-muted-foreground">월별 코호트 현황</h4>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#6366f1' }}></span>
                            <span className="text-muted-foreground">상담</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#14b8a6' }}></span>
                            <span className="text-muted-foreground">등록</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-0.5 rounded" style={{ backgroundColor: '#f97316' }}></span>
                            <span className="text-muted-foreground">전환율</span>
                          </span>
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={260}>
                        <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 40, left: -10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            dataKey="fullMonth"
                            height={55}
                            tick={(props: { x: number; y: number; payload: { value: string } }) => {
                              const { x, y, payload } = props
                              const dataItem = chartData.find(d => d.fullMonth === payload.value)
                              const yoyChange = dataItem?.yoyChange
                              const hasYoY = yoyChange !== null && yoyChange !== undefined
                              const isPositive = yoyChange !== null && yoyChange >= 0
                              return (
                                <g transform={`translate(${x},${y})`}>
                                  <text x={0} y={0} dy={12} textAnchor="middle" fill="#666" fontSize={11}>
                                    {payload.value?.slice(2) || ''}
                                  </text>
                                  <text
                                    x={0}
                                    y={0}
                                    dy={26}
                                    textAnchor="middle"
                                    fill={hasYoY ? (isPositive ? '#10b981' : '#ef4444') : '#d1d5db'}
                                    fontSize={10}
                                    fontWeight={500}
                                  >
                                    {hasYoY ? `${isPositive ? '+' : ''}${yoyChange}%` : '-'}
                                  </text>
                                </g>
                              )
                            }}
                          />
                          {/* 왼쪽 Y축: 건수 (명) */}
                          <YAxis
                            yAxisId="left"
                            tick={{ fontSize: 11 }}
                            tickFormatter={(value) => `${value}`}
                            domain={[0, 'auto']}
                          />
                          {/* 오른쪽 Y축: 전환율 (%) */}
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fontSize: 11 }}
                            tickFormatter={(value) => `${value}%`}
                            domain={[0, 'auto']}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null
                              const data = payload[0]?.payload
                              if (!data) return null
                              const yoyChange = data.yoyChange
                              const hasYoY = yoyChange !== null
                              const isPositive = yoyChange > 0
                              return (
                                <div className="bg-white shadow-lg border rounded-lg p-3 text-sm">
                                  <p className="font-semibold mb-2">{data.fullMonth}</p>
                                  <div className="space-y-1">
                                    <p style={{ color: '#6366f1' }}>신규 상담: {data.총원}명</p>
                                    <p style={{ color: '#14b8a6' }}>등록: {data.등록}명</p>
                                    <p style={{ color: '#f97316' }}>전환율: {data.전환율}%</p>
                                  </div>
                                  {hasYoY && (
                                    <div className="mt-2 pt-2 border-t">
                                      <p className={isPositive ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                                        YoY: {isPositive ? '+' : ''}{yoyChange}%p
                                      </p>
                                      <p className="text-xs text-muted-foreground">전년 동월: {data.prevYearRate}%</p>
                                    </div>
                                  )}
                                  {data.isOngoing && (
                                    <p className="text-sky-500 text-xs mt-1">진행중</p>
                                  )}
                                </div>
                              )
                            }}
                          />
                          {/* 신규 상담 막대 (인디고) */}
                          <Bar yAxisId="left" dataKey="총원" name="신규상담" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={20} />
                          {/* 등록 막대 (틸) */}
                          <Bar yAxisId="left" dataKey="등록" name="등록" fill="#14b8a6" radius={[3, 3, 0, 0]} maxBarSize={20} />
                          {/* 전환율 라인 (오렌지) */}
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="전환율"
                            stroke="#f97316"
                            strokeWidth={2.5}
                            dot={{ r: 3, fill: "#f97316", strokeWidth: 0 }}
                            activeDot={{ r: 5 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* 코호트 리스트 (토글 가능) */}
                  {filteredCohortData.length > 0 ? (
                    <Collapsible open={isCohortTableExpanded} onOpenChange={setIsCohortTableExpanded}>
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between cursor-pointer hover:bg-muted/30 rounded-lg px-2 py-1 -mx-2">
                          <h4 className="text-sm font-medium text-muted-foreground">월별 코호트 상세</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{filteredCohortData.length}개 코호트</span>
                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isCohortTableExpanded ? "" : "-rotate-90"}`} />
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border rounded-lg overflow-hidden mt-2">
                        {/* 헤더 */}
                        <div className="grid grid-cols-12 gap-2 bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground">
                          <div className="col-span-3">첫상담월</div>
                          <div className="col-span-2 text-center">총원</div>
                          <div className="col-span-3 text-center">최종 전환율</div>
                          <div className="col-span-3 text-center">평균 소요일</div>
                          <div className="col-span-1"></div>
                        </div>

                        {/* 코호트 행들 */}
                        {filteredCohortData.map((cohort) => {
                          const cohortKey = `${cohort.cohort_month}-${cohort.lead_source || 'all'}`
                          const isExpanded = expandedCohorts.has(cohortKey)
                          const daysBadge = getDaysBadge(cohort.avg_days_to_enroll)
                          const notEnrolled = cohort.total_students - cohort.enroll_total
                          const testedButNotEnrolled = cohort.test_total - Math.min(cohort.test_total, cohort.enroll_total)

                          return (
                            <Collapsible key={cohortKey} open={isExpanded} onOpenChange={() => toggleCohortExpand(cohortKey, cohort.cohort_month, cohort.lead_source)}>
                              <CollapsibleTrigger asChild>
                                <div className="grid grid-cols-12 gap-2 px-4 py-3 border-t hover:bg-muted/30 cursor-pointer transition-colors items-center">
                                  {/* 첫상담월 */}
                                  <div className="col-span-3 flex items-center gap-2">
                                    <span className="font-semibold">{cohort.cohort_month}</span>
                                    {cohort.is_ongoing && (
                                      <Badge className="bg-sky-100 text-sky-700 text-[10px] px-1.5">진행중</Badge>
                                    )}
                                  </div>

                                  {/* 총원 */}
                                  <div className="col-span-2 text-center">
                                    <span className="font-semibold">{cohort.total_students}</span>
                                    <span className="text-muted-foreground">명</span>
                                  </div>

                                  {/* 최종 전환율 */}
                                  <div className="col-span-3 text-center">
                                    <Badge className={`text-sm font-bold border ${getConversionBadgeClass(cohort.final_conversion_rate, cohort.is_ongoing)}`}>
                                      {cohort.final_conversion_rate}%
                                    </Badge>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                      {cohort.enroll_total}/{cohort.total_students}명
                                    </div>
                                  </div>

                                  {/* 평균 소요일 */}
                                  <div className="col-span-3 text-center">
                                    {daysBadge ? (
                                      <Badge className={`${daysBadge.class} text-xs`}>
                                        {daysBadge.label}
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                    {cohort.avg_days_to_enroll !== null && (
                                      <div className="text-xs text-muted-foreground mt-0.5">
                                        {cohort.avg_days_to_enroll}일
                                      </div>
                                    )}
                                  </div>

                                  {/* 확장 아이콘 */}
                                  <div className="col-span-1 flex justify-end">
                                    <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                                  </div>
                                </div>
                              </CollapsibleTrigger>

                              <CollapsibleContent>
                                <div className="bg-muted/20 px-4 py-3 border-t">
                                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                                    {/* 등록 전환 추이 */}
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-2 font-medium">등록 전환 추이</p>
                                      <div className="space-y-0.5">
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs text-muted-foreground w-8">M+0</span>
                                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                              className="h-full bg-emerald-500 rounded-full"
                                              style={{ width: `${cohort.total_students > 0 ? (cohort.enroll_month_0 / cohort.total_students) * 100 : 0}%` }}
                                            />
                                          </div>
                                          <span className="text-xs font-medium w-6 text-right">{cohort.enroll_month_0}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs text-muted-foreground w-8">M+1</span>
                                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                              className="h-full bg-emerald-400 rounded-full"
                                              style={{ width: `${cohort.total_students > 0 ? (cohort.enroll_month_1 / cohort.total_students) * 100 : 0}%` }}
                                            />
                                          </div>
                                          <span className="text-xs font-medium w-6 text-right">{cohort.enroll_month_1}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs text-muted-foreground w-8">M+2</span>
                                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                              className="h-full bg-emerald-300 rounded-full"
                                              style={{ width: `${cohort.total_students > 0 ? (cohort.enroll_month_2 / cohort.total_students) * 100 : 0}%` }}
                                            />
                                          </div>
                                          <span className="text-xs font-medium w-6 text-right">{cohort.enroll_month_2}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs text-muted-foreground w-8">M+3+</span>
                                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                              className="h-full bg-emerald-200 rounded-full"
                                              style={{ width: `${cohort.total_students > 0 ? (cohort.enroll_month_3 / cohort.total_students) * 100 : 0}%` }}
                                            />
                                          </div>
                                          <span className="text-xs font-medium w-6 text-right">{cohort.enroll_month_3}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* 테스트 현황 */}
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-2 font-medium">테스트 현황</p>
                                      <div className="space-y-0.5 text-xs">
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">완료</span>
                                          <span className="font-medium">{cohort.test_total}명</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">테스트율</span>
                                          <span className="font-medium">
                                            {cohort.total_students > 0 ? Math.round((cohort.test_total / cohort.total_students) * 100) : 0}%
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">테스트후 미등록</span>
                                          <span className="font-medium text-amber-600">{testedButNotEnrolled}명</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* 미등록 현황 */}
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-2 font-medium">미등록 현황</p>
                                      <div className="space-y-0.5 text-xs">
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">총 미등록</span>
                                          <span className="font-medium text-amber-600">{notEnrolled}명</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">이탈률</span>
                                          <span className="font-medium text-red-500">
                                            {cohort.total_students > 0 ? Math.round((notEnrolled / cohort.total_students) * 100) : 0}%
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">테스트X 이탈</span>
                                          <span className="font-medium text-gray-500">{notEnrolled - testedButNotEnrolled}명</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* 미등록 학년별 구성 */}
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-2 font-medium">미등록 학년별 구성</p>
                                      {(() => {
                                        const gradeData = cohortGradeData[cohortKey]
                                        const isLoading = loadingCohortDetails.has(cohortKey)

                                        if (isLoading) {
                                          return (
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                              <span className="text-xs">로딩중...</span>
                                            </div>
                                          )
                                        }

                                        if (!gradeData || gradeData.length === 0) {
                                          return (
                                            <span className="text-xs text-muted-foreground">데이터 없음</span>
                                          )
                                        }

                                        return (
                                          <div className="space-y-0.5">
                                            {gradeData.map((g, idx) => (
                                              <div key={idx} className="flex justify-between text-xs gap-1">
                                                <span className="text-muted-foreground">{g.grade_label}</span>
                                                <span className="font-medium">{g.total_count}<span className="text-muted-foreground text-[10px] ml-0.5">({g.with_test_count}/{g.without_test_count})</span></span>
                                              </div>
                                            ))}
                                          </div>
                                        )
                                      })()}
                                    </div>

                                    {/* 등록 학년별 구성 */}
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-2 font-medium">등록 학년별 구성</p>
                                      {(() => {
                                        const enrolledGradeData = cohortEnrolledGradeData[cohortKey]
                                        const isLoading = loadingCohortDetails.has(cohortKey)

                                        if (isLoading) {
                                          return (
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                              <span className="text-xs">로딩중...</span>
                                            </div>
                                          )
                                        }

                                        if (!enrolledGradeData || enrolledGradeData.length === 0) {
                                          return (
                                            <span className="text-xs text-muted-foreground">데이터 없음</span>
                                          )
                                        }

                                        return (
                                          <div className="space-y-0.5">
                                            {enrolledGradeData.map((g, idx) => (
                                              <div key={idx} className="flex justify-between text-xs gap-1">
                                                <span className="text-muted-foreground">{g.grade_label}</span>
                                                <span className="font-medium text-emerald-600">{g.total_count}<span className="text-muted-foreground text-[10px] ml-0.5">({g.same_month_count}/{g.delayed_count})</span></span>
                                              </div>
                                            ))}
                                          </div>
                                        )
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          )
                        })}
                      </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      코호트 데이터가 없습니다.
                    </div>
                  )}

                  {/* 범례 */}
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border-t pt-4">
                    <div className="flex items-center gap-1">
                      <span className="text-emerald-700 font-medium">M+0:</span> 같은 달 등록
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-emerald-600">M+1:</span> 1개월 후
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-emerald-500">M+2:</span> 2개월 후
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-emerald-400">M+3+:</span> 3개월+
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">40%+</Badge>
                      <Badge className="bg-amber-100 text-amber-700 text-[10px]">20-40%</Badge>
                      <Badge className="bg-red-100 text-red-700 text-[10px]">&lt;20%</Badge>
                    </div>
                  </div>
                </TabsContent>

                {/* 마케팅 활동 탭 - 좌우 2열 레이아웃 */}
                <TabsContent value="marketing" className="mt-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* 왼쪽: 마케팅 활동 목록 */}
                    <div className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Megaphone className="w-4 h-4" />
                          마케팅 활동
                        </h3>
                        <Button onClick={openCreateActivityModal} size="sm">
                          <Plus className="w-4 h-4 mr-1" />
                          등록
                        </Button>
                      </div>

                      {/* 상태 필터 */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {(["all", "in_progress", "planned", "completed", "cancelled"] as const).map((status) => (
                          <Button
                            key={status}
                            variant={activityStatusFilter === status ? "default" : "outline"}
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setActivityStatusFilter(status)}
                          >
                            {status === "all" ? "전체" : status === "in_progress" ? "진행중" : status === "planned" ? "예정" : status === "completed" ? "완료" : "취소"}
                            <span className="ml-1 text-[10px] opacity-70">
                              ({activityCountByStatus[status]})
                            </span>
                          </Button>
                        ))}
                      </div>

                      {filteredActivities.length > 0 ? (
                        <ScrollArea className="h-[360px]">
                          <div className="space-y-2">
                            {filteredActivities.map((activity) => (
                              <div
                                key={activity.id}
                                className={cn(
                                  "p-3 border rounded-lg cursor-pointer transition-colors",
                                  selectedActivityId === activity.id
                                    ? "border-primary bg-primary/5"
                                    : "hover:bg-muted/50"
                                )}
                                onClick={() => handleSelectActivity(activity.id)}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant="outline" className="text-[10px]">
                                        {getChannelLabel(activity.channel)}
                                      </Badge>
                                      <Badge
                                        className={cn(
                                          "text-[10px]",
                                          activity.status === "in_progress"
                                            ? "bg-green-100 text-green-700"
                                            : activity.status === "planned"
                                            ? "bg-blue-100 text-blue-700"
                                            : activity.status === "completed"
                                            ? "bg-gray-100 text-gray-700"
                                            : "bg-red-100 text-red-700"
                                        )}
                                      >
                                        {activity.status === "in_progress" ? "진행중" : activity.status === "planned" ? "예정" : activity.status === "completed" ? "완료" : "취소"}
                                      </Badge>
                                    </div>
                                    <p className="font-medium text-sm truncate">{activity.title}</p>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                      <span>{format(new Date(activity.activity_date), "yyyy-MM-dd")}</span>
                                      {activity.cost_amount && (
                                        <span>{activity.cost_amount.toLocaleString()}원</span>
                                      )}
                                      <span className="flex items-center">
                                        <Users className="w-3 h-3 mr-1" />
                                        {activity.reach_count || 0}명
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openEditActivityModal(activity)
                                      }}
                                      title="수정"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setDeleteActivityId(activity.id)
                                      }}
                                      title="삭제"
                                    >
                                      <Trash2 className="w-3 h-3 text-red-500" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                          <Megaphone className="w-10 h-10 mb-3 opacity-50" />
                          {marketingActivities.length === 0 ? (
                            <>
                              <p className="text-sm">등록된 마케팅 활동이 없습니다.</p>
                              <Button onClick={openCreateActivityModal} variant="outline" size="sm" className="mt-3">
                                <Plus className="w-4 h-4 mr-1" />
                                첫 활동 등록하기
                              </Button>
                            </>
                          ) : (
                            <>
                              <p className="text-sm">해당 상태의 활동이 없습니다.</p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-3"
                                onClick={() => setActivityStatusFilter("all")}
                              >
                                전체 보기
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 오른쪽: 참가자 관리 */}
                    <div className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          참가자 관리
                        </h3>
                        {selectedActivity && (
                          <Badge variant="secondary">{selectedActivity.title}</Badge>
                        )}
                      </div>

                      {selectedActivityId ? (
                        loadingParticipants ? (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* 참가자 추가 영역 */}
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">학생 추가</Label>

                              {/* 참가 일자 선택 */}
                              <div className="flex gap-2 items-center">
                                <Label className="text-xs text-muted-foreground whitespace-nowrap">참가일:</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-sm justify-start"
                                    >
                                      <CalendarIcon className="w-3 h-3 mr-1" />
                                      {format(participatedDate, "yyyy-MM-dd", { locale: ko })}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={participatedDate}
                                      onSelect={(date) => date && setParticipatedDate(date)}
                                      locale={ko}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>

                              <div className="flex gap-2">
                                <Input
                                  placeholder="학생 이름 검색..."
                                  value={studentSearchQuery}
                                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                                  className="h-8 text-sm"
                                />
                                <Button
                                  size="sm"
                                  onClick={handleAddParticipants}
                                  disabled={selectedStudentIds.length === 0 || savingParticipants}
                                  className="h-8"
                                >
                                  {savingParticipants ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <>
                                      <Plus className="w-3 h-3 mr-1" />
                                      추가 ({selectedStudentIds.length})
                                    </>
                                  )}
                                </Button>
                              </div>

                              {/* 학생 선택 목록 */}
                              {studentSearchQuery && (
                                <ScrollArea className="h-[120px] border rounded-md">
                                  <div className="p-2 space-y-1">
                                    {filteredStudents.length > 0 ? (
                                      filteredStudents.slice(0, 20).map((student) => (
                                        <div
                                          key={student.id}
                                          className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50"
                                        >
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
                                          <label
                                            htmlFor={`student-${student.id}`}
                                            className="flex-1 text-sm cursor-pointer flex items-center gap-2"
                                          >
                                            <span>{student.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                              {student.school_type} {student.grade}학년
                                            </span>
                                            <Badge
                                              variant="outline"
                                              className={cn(
                                                "text-[10px] h-4",
                                                student.status === "재원" && "bg-green-50 text-green-700 border-green-200",
                                                student.status === "퇴원" && "bg-gray-50 text-gray-500 border-gray-200",
                                                student.status === "휴원" && "bg-yellow-50 text-yellow-700 border-yellow-200",
                                                student.status === "신규상담" && "bg-blue-50 text-blue-700 border-blue-200"
                                              )}
                                            >
                                              {student.status}
                                            </Badge>
                                          </label>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-xs text-muted-foreground text-center py-2">
                                        검색 결과가 없습니다.
                                      </p>
                                    )}
                                  </div>
                                </ScrollArea>
                              )}
                            </div>

                            {/* 현재 참가자 목록 */}
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">
                                현재 참가자 ({participants.length}명)
                              </Label>
                              <ScrollArea className="h-[200px] border rounded-md">
                                {participants.length > 0 ? (
                                  <div className="p-2 space-y-1">
                                    {participants.map((p) => (
                                      <div
                                        key={p.id}
                                        className="flex items-center justify-between p-2 rounded hover:bg-muted/50"
                                      >
                                        <div className="flex flex-col gap-1">
                                          <div className="flex items-center gap-2">
                                            <Users className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="text-sm font-medium">
                                              {p.student?.name || "알 수 없음"}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                              {p.student?.school_type} {p.student?.grade}학년
                                            </span>
                                            <Badge
                                              variant="outline"
                                              className={cn(
                                                "text-[10px] h-4",
                                                p.student?.status === "재원" && "bg-green-50 text-green-700 border-green-200",
                                                p.student?.status === "퇴원" && "bg-gray-50 text-gray-500 border-gray-200",
                                                p.student?.status === "휴원" && "bg-yellow-50 text-yellow-700 border-yellow-200",
                                                p.student?.status === "신규상담" && "bg-blue-50 text-blue-700 border-blue-200"
                                              )}
                                            >
                                              {p.student?.status}
                                            </Badge>
                                          </div>
                                          {p.participated_at && (
                                            <span className="text-[10px] text-muted-foreground ml-5">
                                              참가일: {p.participated_at}
                                            </span>
                                          )}
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0"
                                          onClick={() => handleRemoveParticipant(p.id)}
                                          title="삭제"
                                        >
                                          <XCircle className="w-3.5 h-3.5 text-red-500" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                    <Users className="w-8 h-8 mb-2 opacity-50" />
                                    <p className="text-sm">등록된 참가자가 없습니다.</p>
                                    <p className="text-xs mt-1">위에서 학생을 검색하여 추가하세요.</p>
                                  </div>
                                )}
                              </ScrollArea>
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                          <Target className="w-10 h-10 mb-3 opacity-50" />
                          <p className="text-sm">왼쪽에서 마케팅 활동을 선택하세요.</p>
                          <p className="text-xs mt-1">선택한 활동의 참가자를 관리할 수 있습니다.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* 추천 관리 탭 */}
                <TabsContent value="referral" className="mt-4">
                  {loadingReferrals ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* 통계 카드 */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                          <CardContent className="pt-4">
                            <div className="text-2xl font-bold">{referralStats?.totalReferrals || 0}</div>
                            <p className="text-xs text-muted-foreground">전체 추천</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4">
                            <div className="text-2xl font-bold text-green-600">{referralStats?.enrolledCount || 0}</div>
                            <p className="text-xs text-muted-foreground">등록 완료</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4">
                            <div className="text-2xl font-bold text-blue-600">{referralStats?.successRate || 0}%</div>
                            <p className="text-xs text-muted-foreground">추천 성공률</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4">
                            <div className="text-2xl font-bold text-purple-600">
                              {(referralStats?.totalRewardAmount || 0).toLocaleString()}원
                            </div>
                            <p className="text-xs text-muted-foreground">지급된 보상 총액</p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* 추천왕 & 보상 대기 */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* 추천왕 TOP 5 */}
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Trophy className="w-4 h-4 text-yellow-500" />
                              추천왕 TOP 5
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {topReferrers.length > 0 ? (
                              <div className="space-y-2">
                                {topReferrers.map((referrer, idx) => (
                                  <div key={referrer.student_id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                                    <div className="flex items-center gap-2">
                                      <span className={cn(
                                        "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold",
                                        idx === 0 && "bg-yellow-100 text-yellow-700",
                                        idx === 1 && "bg-gray-100 text-gray-700",
                                        idx === 2 && "bg-orange-100 text-orange-700",
                                        idx > 2 && "bg-muted text-muted-foreground"
                                      )}>
                                        {idx + 1}
                                      </span>
                                      <span className="font-medium">{referrer.student_name}</span>
                                      <Badge variant="outline" className="text-[10px]">{referrer.student_status}</Badge>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-medium">{referrer.referral_count}명 추천</div>
                                      <div className="text-xs text-muted-foreground">
                                        성공 {referrer.enrolled_count}명 ({referrer.success_rate}%)
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-4">추천 데이터가 없습니다.</p>
                            )}
                          </CardContent>
                        </Card>

                        {/* 보상 대기 */}
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-green-500" />
                              보상 대기 ({pendingRewards.length}건)
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {pendingRewards.length > 0 ? (
                              <ScrollArea className="h-[150px]">
                                <div className="space-y-2">
                                  {pendingRewards.map((referral) => (
                                    <div key={referral.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                                      <div>
                                        <div className="text-sm">
                                          <span className="font-medium">{referral.referrer_name_snapshot}</span>
                                          <span className="text-muted-foreground"> → </span>
                                          <span className="font-medium">{referral.referred_name_snapshot}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          등록일: {referral.enrolled_date}
                                        </div>
                                      </div>
                                      <Button size="sm" variant="outline" onClick={() => openRewardModal(referral)}>
                                        <DollarSign className="w-3 h-3 mr-1" />
                                        보상 지급
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-4">대기 중인 보상이 없습니다.</p>
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      {/* 추천 등록 버튼 & 목록 */}
                      <Card>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-sm">추천 내역</CardTitle>
                            <Button size="sm" onClick={openCreateReferralModal}>
                              <Plus className="w-4 h-4 mr-1" />
                              추천 등록
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {referrals.length > 0 ? (
                            <ScrollArea className="h-[300px]">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b bg-muted/30">
                                    <th className="text-left p-2">추천인</th>
                                    <th className="text-left p-2">피추천인</th>
                                    <th className="text-center p-2">추천일</th>
                                    <th className="text-center p-2">유형</th>
                                    <th className="text-center p-2">상태</th>
                                    <th className="text-right p-2">보상</th>
                                    <th className="text-center p-2">액션</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {referrals.map((referral) => (
                                    <tr key={referral.id} className="border-b hover:bg-muted/30">
                                      <td className="p-2">
                                        <div className="font-medium">{referral.referrer_name_snapshot}</div>
                                        {referral.referrer_student && (
                                          <div className="text-xs text-muted-foreground">
                                            {referral.referrer_student.school_type} {referral.referrer_student.grade}학년
                                          </div>
                                        )}
                                      </td>
                                      <td className="p-2">
                                        <div className="font-medium">{referral.referred_name_snapshot}</div>
                                        {referral.referred_student && (
                                          <div className="text-xs text-muted-foreground">
                                            {referral.referred_student.school_type} {referral.referred_student.grade}학년
                                          </div>
                                        )}
                                      </td>
                                      <td className="p-2 text-center text-muted-foreground">{referral.referral_date}</td>
                                      <td className="p-2 text-center">
                                        <Badge variant="outline" className="text-[10px]">
                                          {REFERRAL_TYPE_LABELS[referral.referral_type]}
                                        </Badge>
                                      </td>
                                      <td className="p-2 text-center">
                                        <Select
                                          value={referral.referral_status}
                                          onValueChange={(value) => handleChangeReferralStatus(referral.id, value as ReferralStatus)}
                                        >
                                          <SelectTrigger className="h-7 text-xs w-24">
                                            <Badge variant="outline" className={cn("text-[10px]", getReferralStatusColor(referral.referral_status))}>
                                              {REFERRAL_STATUS_LABELS[referral.referral_status]}
                                            </Badge>
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="상담중">상담 중</SelectItem>
                                            <SelectItem value="테스트완료">테스트 완료</SelectItem>
                                            <SelectItem value="등록완료">등록 완료</SelectItem>
                                            <SelectItem value="미등록">미등록</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </td>
                                      <td className="p-2 text-right">
                                        {referral.reward_given ? (
                                          <div>
                                            <div className="text-green-600 font-medium">
                                              {referral.reward_amount.toLocaleString()}원
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">
                                              {REWARD_TYPE_LABELS[referral.reward_type as RewardType] || referral.reward_type}
                                            </div>
                                          </div>
                                        ) : (
                                          <span className="text-muted-foreground">-</span>
                                        )}
                                      </td>
                                      <td className="p-2 text-center">
                                        <div className="flex gap-1 justify-center">
                                          {referral.referral_status === '등록완료' && !referral.reward_given && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 w-7 p-0"
                                              onClick={() => openRewardModal(referral)}
                                              title="보상 지급"
                                            >
                                              <DollarSign className="w-3.5 h-3.5 text-green-500" />
                                            </Button>
                                          )}
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0"
                                            onClick={() => openEditReferralModal(referral)}
                                            title="수정"
                                          >
                                            <Pencil className="w-3.5 h-3.5" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0"
                                            onClick={() => setDeleteReferralId(referral.id)}
                                            title="삭제"
                                          >
                                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </ScrollArea>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                              <Users className="w-10 h-10 mb-3 opacity-50" />
                              <p className="text-sm">등록된 추천이 없습니다.</p>
                              <Button onClick={openCreateReferralModal} variant="outline" size="sm" className="mt-3">
                                <Plus className="w-4 h-4 mr-1" />
                                첫 추천 등록하기
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}

      {/* 마케팅 활동 등록/수정 모달 */}
      <Dialog open={isActivityModalOpen} onOpenChange={setIsActivityModalOpen}>
        <DialogContent className="max-w-md">
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
                onValueChange={(value) =>
                  setActivityForm({ ...activityForm, channel: value as MarketingChannel })
                }
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
              <Label>제목 *</Label>
              <Input
                value={activityForm.title}
                onChange={(e) =>
                  setActivityForm({ ...activityForm, title: e.target.value })
                }
                placeholder="마케팅 활동 제목"
              />
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea
                value={activityForm.description}
                onChange={(e) =>
                  setActivityForm({ ...activityForm, description: e.target.value })
                }
                placeholder="활동 설명 (선택)"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>활동 날짜</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !activityForm.activityDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {activityForm.activityDate
                      ? format(activityForm.activityDate, "PPP", { locale: ko })
                      : "날짜 선택"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={activityForm.activityDate}
                    onSelect={(date) =>
                      date && setActivityForm({ ...activityForm, activityDate: date })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>비용 (원)</Label>
              <Input
                type="number"
                value={activityForm.costAmount}
                onChange={(e) =>
                  setActivityForm({ ...activityForm, costAmount: e.target.value })
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>콘텐츠 URL</Label>
              <Input
                value={activityForm.contentUrl}
                onChange={(e) =>
                  setActivityForm({ ...activityForm, contentUrl: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>상태</Label>
              <Select
                value={activityForm.status}
                onValueChange={(value) =>
                  setActivityForm({ ...activityForm, status: value as MarketingStatus })
                }
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActivityModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveActivity} disabled={savingActivity}>
              {savingActivity ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {editingActivity ? "수정" : "등록"}
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
            <AlertDialogAction onClick={handleDeleteActivity} className="bg-red-600 hover:bg-red-700">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 추천 등록/수정 모달 */}
      <Dialog open={isReferralModalOpen} onOpenChange={setIsReferralModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingReferral ? "추천 수정" : "추천 등록"}
            </DialogTitle>
            <DialogDescription>
              추천인과 피추천인 정보를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 추천인 선택 */}
            <div className="space-y-2">
              <Label>추천인 (원내 재원생/학부모) *</Label>
              <Input
                placeholder="학생 이름 검색..."
                value={referrerSearchQuery}
                onChange={(e) => {
                  setReferrerSearchQuery(e.target.value)
                  if (!e.target.value) {
                    setReferralForm({ ...referralForm, referrer_student_id: "" })
                  }
                }}
                disabled={!!editingReferral}
              />
              {referrerSearchQuery && !referralForm.referrer_student_id && filteredReferrerStudents.length > 0 && (
                <div className="border rounded-md max-h-32 overflow-y-auto">
                  {filteredReferrerStudents.map((student) => (
                    <div
                      key={student.id}
                      className="p-2 hover:bg-muted cursor-pointer flex items-center gap-2"
                      onClick={() => {
                        setReferralForm({ ...referralForm, referrer_student_id: student.id })
                        setReferrerSearchQuery(student.name)
                      }}
                    >
                      <span className="font-medium">{student.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {student.school_type} {student.grade}학년
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          student.status === "재원" && "bg-green-50 text-green-700"
                        )}
                      >
                        {student.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              {referralForm.referrer_student_id && (
                <Badge variant="secondary" className="mt-1">
                  선택됨: {allStudents.find(s => s.id === referralForm.referrer_student_id)?.name}
                </Badge>
              )}
            </div>

            {/* 피추천인 선택 */}
            <div className="space-y-2">
              <Label>피추천인 (신규 상담 학생) *</Label>
              <Input
                placeholder="학생 이름 검색..."
                value={referredSearchQuery}
                onChange={(e) => {
                  setReferredSearchQuery(e.target.value)
                  if (!e.target.value) {
                    setReferralForm({ ...referralForm, referred_student_id: "" })
                  }
                }}
                disabled={!!editingReferral}
              />
              {referredSearchQuery && !referralForm.referred_student_id && filteredReferredStudents.length > 0 && (
                <div className="border rounded-md max-h-32 overflow-y-auto">
                  {filteredReferredStudents.map((student) => (
                    <div
                      key={student.id}
                      className="p-2 hover:bg-muted cursor-pointer flex items-center gap-2"
                      onClick={() => {
                        setReferralForm({ ...referralForm, referred_student_id: student.id })
                        setReferredSearchQuery(student.name)
                      }}
                    >
                      <span className="font-medium">{student.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {student.school_type} {student.grade}학년
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          student.status === "재원" && "bg-green-50 text-green-700",
                          student.status === "신규상담" && "bg-blue-50 text-blue-700"
                        )}
                      >
                        {student.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              {referralForm.referred_student_id && (
                <Badge variant="secondary" className="mt-1">
                  선택됨: {allStudents.find(s => s.id === referralForm.referred_student_id)?.name}
                </Badge>
              )}
            </div>

            {/* 추천일 */}
            <div className="space-y-2">
              <Label>추천일 *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start" disabled={!!editingReferral}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(referralForm.referral_date, "yyyy년 MM월 dd일", { locale: ko })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={referralForm.referral_date}
                    onSelect={(date) => date && setReferralForm({ ...referralForm, referral_date: date })}
                    locale={ko}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* 추천 유형 */}
            <div className="space-y-2">
              <Label>추천 유형 *</Label>
              <Select
                value={referralForm.referral_type}
                onValueChange={(value) =>
                  setReferralForm({ ...referralForm, referral_type: value as ReferralType })
                }
                disabled={!!editingReferral}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="학부모추천">학부모 추천</SelectItem>
                  <SelectItem value="학생추천">학생 추천</SelectItem>
                  <SelectItem value="지인추천">지인 추천</SelectItem>
                  <SelectItem value="기타">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 메모 */}
            <div className="space-y-2">
              <Label>메모</Label>
              <Textarea
                value={referralForm.notes}
                onChange={(e) =>
                  setReferralForm({ ...referralForm, notes: e.target.value })
                }
                placeholder="추천 관련 메모..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReferralModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveReferral} disabled={savingReferral}>
              {savingReferral ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {editingReferral ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 보상 지급 모달 */}
      <Dialog open={isRewardModalOpen} onOpenChange={setIsRewardModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>보상 지급</DialogTitle>
            <DialogDescription>
              {rewardTargetReferral && (
                <>
                  <span className="font-medium">{rewardTargetReferral.referrer_name_snapshot}</span>
                  님에게 보상을 지급합니다.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 보상 유형 */}
            <div className="space-y-2">
              <Label>보상 유형 *</Label>
              <Select
                value={rewardForm.reward_type}
                onValueChange={(value) =>
                  setRewardForm({ ...rewardForm, reward_type: value as RewardType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="학원비할인">학원비 할인</SelectItem>
                  <SelectItem value="현금">현금</SelectItem>
                  <SelectItem value="상품권">상품권</SelectItem>
                  <SelectItem value="무료수업">무료 수업</SelectItem>
                  <SelectItem value="기타">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 보상 금액 */}
            <div className="space-y-2">
              <Label>보상 금액 (원) *</Label>
              <Input
                type="number"
                value={rewardForm.reward_amount}
                onChange={(e) =>
                  setRewardForm({ ...rewardForm, reward_amount: e.target.value })
                }
                placeholder="50000"
              />
            </div>

            {/* 지급일 */}
            <div className="space-y-2">
              <Label>지급일 *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(rewardForm.reward_date, "yyyy년 MM월 dd일", { locale: ko })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={rewardForm.reward_date}
                    onSelect={(date) => date && setRewardForm({ ...rewardForm, reward_date: date })}
                    locale={ko}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* 메모 */}
            <div className="space-y-2">
              <Label>메모</Label>
              <Textarea
                value={rewardForm.reward_notes}
                onChange={(e) =>
                  setRewardForm({ ...rewardForm, reward_notes: e.target.value })
                }
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
              <DollarSign className="w-4 h-4 mr-1" />
              지급 완료
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
              이 추천 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReferral} className="bg-red-600 hover:bg-red-700">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
