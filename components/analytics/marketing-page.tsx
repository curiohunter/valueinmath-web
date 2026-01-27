"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Plus, Pencil, Trash2, Megaphone, Gift, CheckCircle2, DollarSign, Users, TrendingUp, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import {
  getCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getParticipants,
  addParticipant,
  removeParticipant,
  updateParticipant,
  markRewardPaid,
  getPendingRewards,
  getCampaignStats,
  getAllEventStats,
  getPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
  type Campaign,
  type CampaignParticipant,
  type CampaignType,
  type CampaignStatus,
  type RewardType,
  type RewardStatus,
  type RewardAmountType,
  type PolicyTarget,
} from "@/services/campaign-service"

// ============ 상수 ============

const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  planned: "예정",
  active: "진행중",
  completed: "완료",
  cancelled: "취소",
}

const PROMO_CHANNELS = [
  { value: "banner", label: "현수막" },
  { value: "flyer", label: "전단지" },
  { value: "blog", label: "블로그" },
  { value: "cafe_mom", label: "맘카페" },
  { value: "ad", label: "온라인광고" },
  { value: "seminar", label: "설명회" },
  { value: "other", label: "기타" },
]

const REWARD_TYPES = [
  { value: "cash", label: "현금" },
  { value: "tuition_discount", label: "학원비 할인" },
  { value: "gift_card", label: "상품권" },
  { value: "other", label: "기타" },
]

const REWARD_AMOUNT_TYPES = [
  { value: "fixed", label: "금액" },
  { value: "percent", label: "할인율 (%)" },
]

const REWARD_STATUS_LABELS: Record<RewardStatus, string> = {
  pending: "대기",
  paid: "지급완료",
  applied: "적용됨",
  cancelled: "취소",
}

const POLICY_TARGET_LABELS: Record<PolicyTarget, string> = {
  sibling: "형제 할인",
  dual_subject: "수학+과학 동시수강 할인",
  early_bird: "조기등록 할인",
  long_term: "장기수강 할인",
  custom: "기타 할인",
}

const POLICY_TARGET_ICONS: Record<PolicyTarget, string> = {
  sibling: "👨‍👩‍👧‍👦",
  dual_subject: "📚",
  early_bird: "🎓",
  long_term: "📅",
  custom: "🎁",
}

// ============ 컴포넌트 ============

export default function MarketingPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<"promo" | "event" | "policy">("event")
  const [isLoading, setIsLoading] = useState(true)

  // 캠페인
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [deleteCampaignId, setDeleteCampaignId] = useState<string | null>(null)

  // 참여자
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [participants, setParticipants] = useState<CampaignParticipant[]>([])
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false)
  const [students, setStudents] = useState<Array<{ id: string; name: string }>>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])

  // 참여자 필터/검색
  const [statusFilter, setStatusFilter] = useState<RewardStatus | "all">("all")
  const [studentSearch, setStudentSearch] = useState("")

  // 참여자 추가 폼
  const [addParticipantForm, setAddParticipantForm] = useState({
    participatedAt: format(new Date(), "yyyy-MM-dd"),
    rewardAmount: 0,
    rewardAmountType: "fixed" as RewardAmountType,
  })

  // 참여자 수정
  const [editingParticipant, setEditingParticipant] = useState<CampaignParticipant | null>(null)

  // 참여자 통계 (캠페인별)
  const [participantStats, setParticipantStats] = useState({
    total: 0,
    pending: 0,
    paid: 0,
    applied: 0,
  })

  // 전체 이벤트 통계 (탭 상단용)
  const [overallEventStats, setOverallEventStats] = useState({
    total: 0,
    pending: 0,
    paid: 0,
    applied: 0,
  })

  // 할인정책
  const [policies, setPolicies] = useState<Campaign[]>([])
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<Campaign | null>(null)
  const [deletePolicyId, setDeletePolicyId] = useState<string | null>(null)

  // 형제 그룹 정보 (같은 학부모 전화번호 기준)
  const [siblingGroups, setSiblingGroups] = useState<Array<{
    parentPhone: string
    students: Array<{ id: string; name: string; grade: number | null; school: string | null }>
  }>>([])
  const [expandedSiblingGroups, setExpandedSiblingGroups] = useState<Record<string, boolean>>({})

  // 수학+과학 동시수강 학생 목록
  const [dualSubjectStudents, setDualSubjectStudents] = useState<Array<{
    id: string
    name: string
    grade: number | null
    school: string | null
    mathClasses: string[]
    scienceClasses: string[]
  }>>([])
  const [expandedDualSubject, setExpandedDualSubject] = useState<Record<string, boolean>>({})

  const [policyFormData, setPolicyFormData] = useState({
    title: "",
    description: "",
    policy_target: "sibling" as PolicyTarget,
    reward_amount: 0,
    reward_amount_type: "percent" as RewardAmountType,
    status: "active" as CampaignStatus,
  })

  // 폼 상태
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "active" as CampaignStatus,
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: "",
    channel: "",
    cost_amount: 0,
    reach_count: 0,
    reward_type: "tuition_discount" as RewardType,
    reward_amount: 0,
    reward_amount_type: "fixed" as RewardAmountType,
    reward_description: "",
  })

  // ============ 데이터 로드 ============

  useEffect(() => {
    if (activeTab === "policy") {
      loadPolicies()
    } else {
      loadCampaigns()
    }
    loadStudents()
    if (activeTab === "event") {
      loadOverallEventStats()
    }
  }, [activeTab])

  async function loadCampaigns() {
    setIsLoading(true)
    const result = await getCampaigns(supabase, { type: activeTab })
    if (result.success && result.data) {
      setCampaigns(result.data)
    }
    setIsLoading(false)
  }

  async function loadOverallEventStats() {
    const result = await getAllEventStats(supabase)
    if (result.success && result.data) {
      setOverallEventStats(result.data)
    }
  }

  async function loadPolicies() {
    setIsLoading(true)
    const result = await getPolicies(supabase)
    if (result.success && result.data) {
      setPolicies(result.data)
    }
    // 형제 할인 정책이 있으면 형제 그룹도 로드
    loadSiblingGroups()
    // 수학+과학 동시수강 학생 로드
    loadDualSubjectStudents()
    setIsLoading(false)
  }

  async function loadSiblingGroups() {
    try {
      // 재원 학생 중 parent_phone이 있는 학생들 조회 (활성 학생만)
      const { data: studentsData, error } = await supabase
        .from("students")
        .select("id, name, parent_phone, grade, school")
        .eq("is_active", true)
        .eq("status", "재원")
        .not("parent_phone", "is", null)

      if (error) throw error
      if (!studentsData) return

      // 같은 전화번호를 가진 학생들 그룹화
      const phoneGroups: Record<string, Array<{ id: string; name: string; grade: number | null; school: string | null }>> = {}
      for (const student of studentsData) {
        if (student.parent_phone) {
          const phone = student.parent_phone.replace(/[^0-9]/g, "") // 숫자만 추출
          if (!phoneGroups[phone]) {
            phoneGroups[phone] = []
          }
          phoneGroups[phone].push({
            id: student.id,
            name: student.name,
            grade: student.grade,
            school: student.school,
          })
        }
      }

      // 2명 이상인 그룹만 형제 그룹으로 설정
      const groups = Object.entries(phoneGroups)
        .filter(([_, students]) => students.length >= 2)
        .map(([phone, students]) => ({
          parentPhone: phone,
          students: students.sort((a, b) => (a.grade || 0) - (b.grade || 0)),
        }))

      setSiblingGroups(groups)
    } catch (error) {
      console.error("Failed to load sibling groups:", error)
    }
  }

  async function loadDualSubjectStudents() {
    try {
      // 재원 학생들의 수강 반 정보 조회
      const { data: classStudentsData, error: csError } = await supabase
        .from("class_students")
        .select(`
          student_id,
          class:classes(id, name, subject)
        `)

      if (csError) throw csError
      if (!classStudentsData) return

      // 재원 학생 정보 조회 (활성 학생만)
      const { data: studentsData, error: sError } = await supabase
        .from("students")
        .select("id, name, grade, school, status")
        .eq("is_active", true)
        .eq("status", "재원")

      if (sError) throw sError
      if (!studentsData) return

      const activeStudentIds = new Set(studentsData.map(s => s.id))

      // 학생별 수강 과목 그룹화
      const studentSubjects: Record<string, { mathClasses: string[]; scienceClasses: string[] }> = {}

      for (const cs of classStudentsData) {
        if (!activeStudentIds.has(cs.student_id)) continue // 재원생만

        const classData = cs.class as any
        if (!classData) continue

        if (!studentSubjects[cs.student_id]) {
          studentSubjects[cs.student_id] = { mathClasses: [], scienceClasses: [] }
        }

        const subject = classData.subject
        const className = classData.name

        if (subject === "수학" || subject === "수학특강") {
          studentSubjects[cs.student_id].mathClasses.push(className)
        } else if (subject === "과학" || subject === "과학특강") {
          studentSubjects[cs.student_id].scienceClasses.push(className)
        }
      }

      // 수학과 과학을 모두 수강하는 학생 필터링
      const dualStudents = studentsData
        .filter(s => {
          const subjects = studentSubjects[s.id]
          return subjects && subjects.mathClasses.length > 0 && subjects.scienceClasses.length > 0
        })
        .map(s => ({
          id: s.id,
          name: s.name,
          grade: s.grade,
          school: s.school,
          mathClasses: studentSubjects[s.id]?.mathClasses || [],
          scienceClasses: studentSubjects[s.id]?.scienceClasses || [],
        }))
        .sort((a, b) => (a.grade || 0) - (b.grade || 0))

      setDualSubjectStudents(dualStudents)
    } catch (error) {
      console.error("Failed to load dual subject students:", error)
    }
  }

  async function loadStudents() {
    const { data } = await supabase
      .from("students")
      .select("id, name")
      .eq("is_active", true)
      .eq("status", "재원")
      .order("name")
    setStudents(data || [])
  }

  async function loadParticipants(campaignId: string) {
    const result = await getParticipants(supabase, campaignId)
    if (result.success && result.data) {
      setParticipants(result.data)
      // 통계 계산
      const stats = {
        total: result.data.length,
        pending: result.data.filter(p => p.reward_status === "pending").length,
        paid: result.data.filter(p => p.reward_status === "paid").length,
        applied: result.data.filter(p => p.reward_status === "applied").length,
      }
      setParticipantStats(stats)
    }
    // 전체 통계도 갱신
    loadOverallEventStats()
  }

  // ============ 캠페인 CRUD ============

  function handleOpenModal(campaign?: Campaign) {
    if (campaign) {
      setEditingCampaign(campaign)
      setFormData({
        title: campaign.title,
        description: campaign.description || "",
        status: campaign.status,
        start_date: campaign.start_date,
        end_date: campaign.end_date || "",
        channel: campaign.channel || "",
        cost_amount: campaign.cost_amount || 0,
        reach_count: campaign.reach_count || 0,
        reward_type: (campaign.reward_type as RewardType) || "tuition_discount",
        reward_amount: campaign.reward_amount || 0,
        reward_amount_type: campaign.reward_amount_type || "fixed",
        reward_description: campaign.reward_description || "",
      })
    } else {
      setEditingCampaign(null)
      setFormData({
        title: "",
        description: "",
        status: "active",
        start_date: format(new Date(), "yyyy-MM-dd"),
        end_date: "",
        channel: "",
        cost_amount: 0,
        reach_count: 0,
        reward_type: "tuition_discount",
        reward_amount: 0,
        reward_amount_type: "fixed",
        reward_description: "",
      })
    }
    setIsModalOpen(true)
  }

  async function handleSaveCampaign() {
    if (!formData.title.trim()) {
      toast.error("제목을 입력하세요")
      return
    }

    const data = {
      title: formData.title,
      description: formData.description || undefined,
      campaign_type: activeTab as CampaignType,
      status: formData.status,
      start_date: formData.start_date,
      end_date: formData.end_date || undefined,
      channel: activeTab === "promo" ? formData.channel : undefined,
      cost_amount: activeTab === "promo" ? formData.cost_amount : undefined,
      reach_count: activeTab === "promo" ? formData.reach_count : undefined,
      reward_type: activeTab === "event" ? formData.reward_type : undefined,
      reward_amount: activeTab === "event" ? formData.reward_amount : undefined,
      reward_amount_type: activeTab === "event" ? formData.reward_amount_type : undefined,
      reward_description: activeTab === "event" ? formData.reward_description : undefined,
    }

    let result
    if (editingCampaign) {
      result = await updateCampaign(supabase, editingCampaign.id, data)
    } else {
      result = await createCampaign(supabase, data)
    }

    if (result.success) {
      toast.success(editingCampaign ? "수정되었습니다" : "생성되었습니다")
      setIsModalOpen(false)
      loadCampaigns()
    } else {
      toast.error(result.error || "저장에 실패했습니다")
    }
  }

  async function handleDeleteCampaign() {
    if (!deleteCampaignId) return

    const result = await deleteCampaign(supabase, deleteCampaignId)
    if (result.success) {
      toast.success("삭제되었습니다")
      setDeleteCampaignId(null)
      loadCampaigns()
      if (selectedCampaign?.id === deleteCampaignId) {
        setSelectedCampaign(null)
        setParticipants([])
      }
    } else {
      toast.error(result.error || "삭제에 실패했습니다")
    }
  }

  // ============ 참여자 관리 ============

  function handleSelectCampaign(campaign: Campaign) {
    setSelectedCampaign(campaign)
    loadParticipants(campaign.id)
    // 참여자 추가 폼 초기화
    setAddParticipantForm({
      participatedAt: format(new Date(), "yyyy-MM-dd"),
      rewardAmount: campaign.reward_amount || 0,
      rewardAmountType: campaign.reward_amount_type || "fixed",
    })
    setStatusFilter("all")
  }

  function handleOpenParticipantModal() {
    if (!selectedCampaign) return
    // 캠페인 기본값으로 폼 초기화
    setAddParticipantForm({
      participatedAt: format(new Date(), "yyyy-MM-dd"),
      rewardAmount: selectedCampaign.reward_amount || 0,
      rewardAmountType: selectedCampaign.reward_amount_type || "fixed",
    })
    setSelectedStudentIds([])
    setStudentSearch("")
    setIsParticipantModalOpen(true)
  }

  async function handleAddParticipants() {
    if (!selectedCampaign || selectedStudentIds.length === 0) return

    let successCount = 0
    for (const studentId of selectedStudentIds) {
      // 캠페인 기본값 사용 (rewardAmount, rewardAmountType 미전달)
      const result = await addParticipant(supabase, selectedCampaign.id, studentId)
      if (result.success) successCount++
    }

    toast.success(`${successCount}명 추가되었습니다`)
    setIsParticipantModalOpen(false)
    setSelectedStudentIds([])
    loadParticipants(selectedCampaign.id)
  }

  async function handleUpdateParticipantStatus(participantId: string, newStatus: RewardStatus) {
    const result = await updateParticipant(supabase, participantId, { reward_status: newStatus })
    if (result.success) {
      toast.success("상태가 변경되었습니다")
      if (selectedCampaign) {
        loadParticipants(selectedCampaign.id)
      }
    } else {
      toast.error(result.error || "상태 변경에 실패했습니다")
    }
  }

  async function handleSaveParticipantEdit() {
    if (!editingParticipant) return

    const result = await updateParticipant(supabase, editingParticipant.id, {
      participated_at: editingParticipant.participated_at,
      reward_amount: editingParticipant.reward_amount,
      reward_amount_type: editingParticipant.reward_amount_type,
    })

    if (result.success) {
      toast.success("수정되었습니다")
      setEditingParticipant(null)
      if (selectedCampaign) {
        loadParticipants(selectedCampaign.id)
      }
    } else {
      toast.error(result.error || "수정에 실패했습니다")
    }
  }

  async function handleRemoveParticipant(participantId: string) {
    const result = await removeParticipant(supabase, participantId)
    if (result.success) {
      toast.success("삭제되었습니다")
      if (selectedCampaign) {
        loadParticipants(selectedCampaign.id)
      }
    } else {
      toast.error(result.error || "삭제에 실패했습니다")
    }
  }

  async function handleMarkPaid(participantId: string) {
    const result = await markRewardPaid(supabase, participantId)
    if (result.success) {
      toast.success("지급 완료 처리되었습니다")
      if (selectedCampaign) {
        loadParticipants(selectedCampaign.id)
      }
    } else {
      toast.error(result.error || "처리에 실패했습니다")
    }
  }

  // ============ 할인 정책 CRUD ============

  function handleOpenPolicyModal(policy?: Campaign) {
    if (policy) {
      setEditingPolicy(policy)
      setPolicyFormData({
        title: policy.title,
        description: policy.description || "",
        policy_target: (policy.policy_target as PolicyTarget) || "sibling",
        reward_amount: policy.reward_amount || 0,
        reward_amount_type: policy.reward_amount_type || "percent",
        status: policy.status,
      })
    } else {
      setEditingPolicy(null)
      setPolicyFormData({
        title: "",
        description: "",
        policy_target: "sibling",
        reward_amount: 0,
        reward_amount_type: "percent",
        status: "active",
      })
    }
    setIsPolicyModalOpen(true)
  }

  async function handleSavePolicy() {
    if (!policyFormData.title.trim()) {
      toast.error("제목을 입력하세요")
      return
    }

    const data = {
      title: policyFormData.title,
      description: policyFormData.description || undefined,
      policy_target: policyFormData.policy_target,
      reward_amount: policyFormData.reward_amount,
      reward_amount_type: policyFormData.reward_amount_type,
      status: policyFormData.status,
    }

    let result
    if (editingPolicy) {
      result = await updatePolicy(supabase, editingPolicy.id, data)
    } else {
      result = await createPolicy(supabase, data)
    }

    if (result.success) {
      toast.success(editingPolicy ? "수정되었습니다" : "생성되었습니다")
      setIsPolicyModalOpen(false)
      loadPolicies()
    } else {
      toast.error(result.error || "저장에 실패했습니다")
    }
  }

  async function handleDeletePolicy() {
    if (!deletePolicyId) return

    const result = await deletePolicy(supabase, deletePolicyId)
    if (result.success) {
      toast.success("삭제되었습니다")
      setDeletePolicyId(null)
      loadPolicies()
    } else {
      toast.error(result.error || "삭제에 실패했습니다")
    }
  }

  // ============ 렌더링 ============

  const getStatusBadge = (status: CampaignStatus) => {
    const colors: Record<CampaignStatus, string> = {
      planned: "bg-gray-100 text-gray-700",
      active: "bg-green-100 text-green-700",
      completed: "bg-blue-100 text-blue-700",
      cancelled: "bg-red-100 text-red-700",
    }
    return (
      <Badge className={cn("font-medium", colors[status])}>
        {CAMPAIGN_STATUS_LABELS[status]}
      </Badge>
    )
  }

  const getRewardStatusBadge = (status: RewardStatus) => {
    const colors: Record<RewardStatus, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      paid: "bg-green-100 text-green-700",
      applied: "bg-blue-100 text-blue-700",
      cancelled: "bg-red-100 text-red-700",
    }
    const labels: Record<RewardStatus, string> = {
      pending: "대기",
      paid: "지급완료",
      applied: "적용됨",
      cancelled: "취소",
    }
    return (
      <Badge className={cn("font-medium", colors[status])}>
        {labels[status]}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">마케팅 관리</h2>
          <p className="text-muted-foreground">
            홍보 활동과 고객 이벤트를 관리합니다
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "promo" | "event" | "policy")}>
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="promo" className="gap-2">
            <Megaphone className="w-4 h-4" />
            홍보 활동
          </TabsTrigger>
          <TabsTrigger value="event" className="gap-2">
            <Gift className="w-4 h-4" />
            고객 이벤트
          </TabsTrigger>
          <TabsTrigger value="policy" className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            할인 정책
          </TabsTrigger>
        </TabsList>

        {/* ============ 홍보 활동 탭 ============ */}
        <TabsContent value="promo" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => handleOpenModal()}>
              <Plus className="w-4 h-4 mr-2" />
              새 홍보 활동
            </Button>
          </div>

          <div className="grid gap-4">
            {campaigns.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <Megaphone className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">등록된 홍보 활동이 없습니다</p>
                </CardContent>
              </Card>
            ) : (
              campaigns.map((campaign) => (
                <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {campaign.title}
                          {getStatusBadge(campaign.status)}
                        </CardTitle>
                        <CardDescription>
                          {campaign.start_date}
                          {campaign.end_date && ` ~ ${campaign.end_date}`}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal(campaign)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteCampaignId(campaign.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span>비용: {(campaign.cost_amount || 0).toLocaleString()}원</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>도달: {campaign.reach_count || 0}명</span>
                      </div>
                      {campaign.cost_amount && campaign.reach_count ? (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4 text-muted-foreground" />
                          <span>
                            CPA: {Math.round(campaign.cost_amount / campaign.reach_count).toLocaleString()}원
                          </span>
                        </div>
                      ) : null}
                    </div>
                    {campaign.description && (
                      <p className="text-sm text-muted-foreground mt-2">{campaign.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* ============ 고객 이벤트 탭 ============ */}
        <TabsContent value="event" className="space-y-4">
          {/* 전체 이벤트 통계 카드 */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                  <div className="text-2xl font-bold text-yellow-700">{overallEventStats.pending}</div>
                  <div className="text-sm text-yellow-600">대기</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
                  <div className="text-2xl font-bold text-green-700">{overallEventStats.paid}</div>
                  <div className="text-sm text-green-600">지급완료</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="text-2xl font-bold text-blue-700">{overallEventStats.applied}</div>
                  <div className="text-sm text-blue-600">적용됨</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => handleOpenModal()}>
              <Plus className="w-4 h-4 mr-2" />
              새 이벤트
            </Button>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* 이벤트 목록 */}
            <div className="space-y-4">
              {campaigns.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <Gift className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">등록된 이벤트가 없습니다</p>
                  </CardContent>
                </Card>
              ) : (
                campaigns.map((campaign) => (
                  <Card
                    key={campaign.id}
                    className={cn(
                      "cursor-pointer hover:shadow-md transition-all",
                      selectedCampaign?.id === campaign.id && "ring-2 ring-primary"
                    )}
                    onClick={() => handleSelectCampaign(campaign)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {campaign.title}
                            {getStatusBadge(campaign.status)}
                          </CardTitle>
                          <CardDescription>
                            {campaign.start_date}
                            {campaign.end_date && ` ~ ${campaign.end_date}`}
                          </CardDescription>
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenModal(campaign)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteCampaignId(campaign.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm">
                        <span className="text-muted-foreground">혜택: </span>
                        <span className="font-medium">
                          {REWARD_TYPES.find((r) => r.value === campaign.reward_type)?.label || "미설정"}{" "}
                          {campaign.reward_amount > 0 && (
                            campaign.reward_amount_type === "percent"
                              ? `${campaign.reward_amount}%`
                              : `${campaign.reward_amount.toLocaleString()}원`
                          )}
                        </span>
                      </div>
                      {campaign.reward_description && (
                        <p className="text-sm text-muted-foreground mt-1">{campaign.reward_description}</p>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* 참여자 목록 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      {selectedCampaign ? selectedCampaign.title : "참여자 관리"}
                    </CardTitle>
                    <CardDescription>
                      {selectedCampaign
                        ? `총 ${participantStats.total}명 참여`
                        : "이벤트를 선택하세요"}
                    </CardDescription>
                  </div>
                  {selectedCampaign && (
                    <Button size="sm" onClick={handleOpenParticipantModal}>
                      <Plus className="w-4 h-4 mr-1" />
                      참여자 추가
                    </Button>
                  )}
                </div>

                {/* 상태 필터 버튼 */}
                {selectedCampaign && participantStats.total > 0 && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setStatusFilter("all")}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-sm transition-colors border",
                        statusFilter === "all" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                      )}
                    >
                      전체 ({participantStats.total})
                    </button>
                    <button
                      onClick={() => setStatusFilter("pending")}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-sm transition-colors border",
                        statusFilter === "pending" ? "bg-yellow-100 border-yellow-400 text-yellow-700" : "hover:bg-yellow-50"
                      )}
                    >
                      대기 ({participantStats.pending})
                    </button>
                    <button
                      onClick={() => setStatusFilter("paid")}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-sm transition-colors border",
                        statusFilter === "paid" ? "bg-green-100 border-green-400 text-green-700" : "hover:bg-green-50"
                      )}
                    >
                      지급완료 ({participantStats.paid})
                    </button>
                    <button
                      onClick={() => setStatusFilter("applied")}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-sm transition-colors border",
                        statusFilter === "applied" ? "bg-blue-100 border-blue-400 text-blue-700" : "hover:bg-blue-50"
                      )}
                    >
                      적용됨 ({participantStats.applied})
                    </button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {!selectedCampaign ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <Users className="w-12 h-12 mb-4" />
                    <p>왼쪽에서 이벤트를 선택하세요</p>
                  </div>
                ) : participants.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <Users className="w-12 h-12 mb-4" />
                    <p>참여자가 없습니다</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {participants
                        .filter(p => statusFilter === "all" || p.reward_status === statusFilter)
                        .map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {p.student_name_snapshot || (p.student as any)?.name || "알 수 없음"}
                              </span>
                              {p.referrer_name_snapshot && (
                                <span className="text-sm text-muted-foreground">
                                  (추천: {p.referrer_name_snapshot})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <span>{p.participated_at}</span>
                              <span>|</span>
                              <span>
                                {p.reward_amount_type === "percent"
                                  ? `${p.reward_amount}%`
                                  : `${p.reward_amount.toLocaleString()}원`}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* 인라인 상태 드롭다운 */}
                            <Select
                              value={p.reward_status}
                              onValueChange={(value: RewardStatus) => handleUpdateParticipantStatus(p.id, value)}
                            >
                              <SelectTrigger className={cn(
                                "w-24 h-7 text-xs font-medium border",
                                p.reward_status === "pending" && "bg-yellow-100 text-yellow-700 border-yellow-200",
                                p.reward_status === "paid" && "bg-green-100 text-green-700 border-green-200",
                                p.reward_status === "applied" && "bg-blue-100 text-blue-700 border-blue-200"
                              )}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">대기</SelectItem>
                                <SelectItem value="paid">지급완료</SelectItem>
                                <SelectItem value="applied">적용됨</SelectItem>
                              </SelectContent>
                            </Select>
                            {/* 수정 버튼 */}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditingParticipant(p)}
                              title="수정"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRemoveParticipant(p.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============ 할인 정책 탭 ============ */}
        <TabsContent value="policy" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => handleOpenPolicyModal()}>
              <Plus className="w-4 h-4 mr-2" />
              새 할인 정책
            </Button>
          </div>

          <div className="grid gap-4">
            {policies.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <CheckCircle2 className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">등록된 할인 정책이 없습니다</p>
                </CardContent>
              </Card>
            ) : (
              policies.map((policy) => (
                <Card key={policy.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <span>{POLICY_TARGET_ICONS[policy.policy_target as PolicyTarget] || "🎁"}</span>
                          {policy.title}
                          {getStatusBadge(policy.status)}
                        </CardTitle>
                        <CardDescription>
                          {POLICY_TARGET_LABELS[policy.policy_target as PolicyTarget] || "기타 할인"}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenPolicyModal(policy)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeletePolicyId(policy.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm">
                      <span className="text-muted-foreground">할인: </span>
                      <span className="font-medium">
                        {policy.reward_amount_type === "percent"
                          ? `${policy.reward_amount}%`
                          : `${policy.reward_amount.toLocaleString()}원`}
                      </span>
                    </div>
                    {policy.description && (
                      <p className="text-sm text-muted-foreground">{policy.description}</p>
                    )}

                    {/* 형제할인 정책인 경우 형제 그룹 표시 */}
                    {policy.policy_target === "sibling" && siblingGroups.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <button
                          onClick={() => setExpandedSiblingGroups(prev => ({
                            ...prev,
                            [policy.id]: !prev[policy.id]
                          }))}
                          className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors w-full"
                        >
                          <Users className="w-4 h-4" />
                          형제 할인 대상 {siblingGroups.length}그룹 ({siblingGroups.reduce((sum, g) => sum + g.students.length, 0)}명)
                          {expandedSiblingGroups[policy.id] ? (
                            <ChevronUp className="w-4 h-4 ml-auto" />
                          ) : (
                            <ChevronDown className="w-4 h-4 ml-auto" />
                          )}
                        </button>

                        {expandedSiblingGroups[policy.id] && (
                          <div className="mt-3 space-y-2">
                            {siblingGroups.map((group, idx) => (
                              <div
                                key={group.parentPhone}
                                className="p-3 rounded-lg bg-blue-50 border border-blue-100"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                                    그룹 {idx + 1}
                                  </span>
                                  <span className="text-xs text-blue-500">
                                    ({group.students.length}명)
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {group.students.map((student) => (
                                    <span
                                      key={student.id}
                                      className="inline-flex items-center gap-1 text-sm bg-white px-2 py-1 rounded border border-blue-200"
                                    >
                                      <span className="font-medium">{student.name}</span>
                                      {student.grade && (
                                        <span className="text-xs text-muted-foreground">
                                          ({student.school ? `${student.school} ` : ""}{student.grade}학년)
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 수학+과학 동시수강 정책인 경우 학생 목록 표시 */}
                    {policy.policy_target === "dual_subject" && dualSubjectStudents.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <button
                          onClick={() => setExpandedDualSubject(prev => ({
                            ...prev,
                            [policy.id]: !prev[policy.id]
                          }))}
                          className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-800 transition-colors w-full"
                        >
                          <Users className="w-4 h-4" />
                          동시수강 할인 대상 {dualSubjectStudents.length}명
                          {expandedDualSubject[policy.id] ? (
                            <ChevronUp className="w-4 h-4 ml-auto" />
                          ) : (
                            <ChevronDown className="w-4 h-4 ml-auto" />
                          )}
                        </button>

                        {expandedDualSubject[policy.id] && (
                          <div className="mt-3 space-y-2">
                            {dualSubjectStudents.map((student) => (
                              <div
                                key={student.id}
                                className="p-3 rounded-lg bg-emerald-50 border border-emerald-100"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-medium text-emerald-700">{student.name}</span>
                                  {student.grade && (
                                    <span className="text-xs text-emerald-600">
                                      ({student.school ? `${student.school} ` : ""}{student.grade}학년)
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs">
                                  <div className="flex items-center gap-1">
                                    <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">수학</span>
                                    <span className="text-muted-foreground">{student.mathClasses.join(", ")}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">과학</span>
                                    <span className="text-muted-foreground">{student.scienceClasses.join(", ")}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ============ 캠페인 생성/수정 모달 ============ */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCampaign
                ? activeTab === "promo"
                  ? "홍보 활동 수정"
                  : "이벤트 수정"
                : activeTab === "promo"
                ? "새 홍보 활동"
                : "새 이벤트"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>제목 *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={activeTab === "promo" ? "예: 네이버 블로그 광고" : "예: 친구추천 이벤트"}
              />
            </div>

            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="상세 설명"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>시작일 *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>종료일</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>상태</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v as CampaignStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CAMPAIGN_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 홍보 활동 전용 필드 */}
            {activeTab === "promo" && (
              <>
                <div className="space-y-2">
                  <Label>채널</Label>
                  <Select
                    value={formData.channel}
                    onValueChange={(v) => setFormData({ ...formData, channel: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="채널 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROMO_CHANNELS.map((ch) => (
                        <SelectItem key={ch.value} value={ch.value}>
                          {ch.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>비용 (원)</Label>
                    <Input
                      type="number"
                      value={formData.cost_amount}
                      onChange={(e) =>
                        setFormData({ ...formData, cost_amount: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>도달 인원</Label>
                    <Input
                      type="number"
                      value={formData.reach_count}
                      onChange={(e) =>
                        setFormData({ ...formData, reach_count: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
              </>
            )}

            {/* 고객 이벤트 전용 필드 */}
            {activeTab === "event" && (
              <>
                <div className="space-y-2">
                  <Label>혜택 유형</Label>
                  <Select
                    value={formData.reward_type}
                    onValueChange={(v) => setFormData({ ...formData, reward_type: v as RewardType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REWARD_TYPES.map((rt) => (
                        <SelectItem key={rt.value} value={rt.value}>
                          {rt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>혜택 유형</Label>
                    <Select
                      value={formData.reward_amount_type}
                      onValueChange={(v) => setFormData({ ...formData, reward_amount_type: v as RewardAmountType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REWARD_AMOUNT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      {formData.reward_amount_type === "percent" ? "할인율 (%)" : "혜택 금액 (원)"}
                    </Label>
                    <Input
                      type="number"
                      value={formData.reward_amount}
                      onChange={(e) =>
                        setFormData({ ...formData, reward_amount: parseInt(e.target.value) || 0 })
                      }
                      placeholder={formData.reward_amount_type === "percent" ? "예: 10" : "예: 10000"}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>혜택 설명</Label>
                  <Input
                    value={formData.reward_description}
                    onChange={(e) =>
                      setFormData({ ...formData, reward_description: e.target.value })
                    }
                    placeholder="예: 추천인 현금 2만원, 피추천인 학원비 1만원"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveCampaign}>
              {editingCampaign ? "수정" : "생성"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ 참여자 추가 모달 ============ */}
      <Dialog open={isParticipantModalOpen} onOpenChange={setIsParticipantModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>참여자 추가</DialogTitle>
            <DialogDescription>
              {selectedCampaign?.title}에 참여할 학생을 선택하세요
            </DialogDescription>
          </DialogHeader>

          {/* 이벤트 혜택 정보 표시 */}
          {selectedCampaign && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <div className="text-sm text-amber-800">
                <span className="font-medium">혜택: </span>
                {selectedCampaign.reward_amount_type === "percent"
                  ? `${selectedCampaign.reward_amount}% 할인`
                  : `${selectedCampaign.reward_amount.toLocaleString()}원`}
              </div>
            </div>
          )}

          {/* 학생 검색 */}
          <div className="space-y-2">
            <Label>학생 검색</Label>
            <Input
              placeholder="이름으로 검색..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
          </div>

          <ScrollArea className="h-[280px] border rounded-md p-3">
            <div className="space-y-2">
              {students
                .filter((s) => !participants.some((p) => p.student_id === s.id))
                .filter((s) => studentSearch === "" || s.name.includes(studentSearch))
                .map((student) => (
                  <div key={student.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={student.id}
                      checked={selectedStudentIds.includes(student.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedStudentIds([...selectedStudentIds, student.id])
                        } else {
                          setSelectedStudentIds(selectedStudentIds.filter((id) => id !== student.id))
                        }
                      }}
                    />
                    <label htmlFor={student.id} className="text-sm cursor-pointer">
                      {student.name}
                    </label>
                  </div>
                ))}
              {students.filter((s) => !participants.some((p) => p.student_id === s.id))
                .filter((s) => studentSearch === "" || s.name.includes(studentSearch)).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  검색 결과가 없습니다
                </p>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsParticipantModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAddParticipants} disabled={selectedStudentIds.length === 0}>
              {selectedStudentIds.length}명 추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ 참여자 수정 모달 ============ */}
      <Dialog open={!!editingParticipant} onOpenChange={(open) => !open && setEditingParticipant(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>참여자 수정</DialogTitle>
            <DialogDescription>
              {editingParticipant?.student_name_snapshot || "알 수 없음"}
            </DialogDescription>
          </DialogHeader>

          {editingParticipant && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>참여일</Label>
                <Input
                  type="date"
                  value={editingParticipant.participated_at}
                  onChange={(e) => setEditingParticipant({
                    ...editingParticipant,
                    participated_at: e.target.value
                  })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>혜택 유형</Label>
                  <Select
                    value={editingParticipant.reward_amount_type}
                    onValueChange={(v) => setEditingParticipant({
                      ...editingParticipant,
                      reward_amount_type: v as RewardAmountType
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REWARD_AMOUNT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>
                    {editingParticipant.reward_amount_type === "percent" ? "할인율 (%)" : "혜택 금액 (원)"}
                  </Label>
                  <Input
                    type="number"
                    value={editingParticipant.reward_amount}
                    onChange={(e) => setEditingParticipant({
                      ...editingParticipant,
                      reward_amount: parseInt(e.target.value) || 0
                    })}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingParticipant(null)}>
              취소
            </Button>
            <Button onClick={handleSaveParticipantEdit}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ 캠페인 삭제 확인 ============ */}
      <AlertDialog open={!!deleteCampaignId} onOpenChange={() => setDeleteCampaignId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 관련된 참여자 정보도 함께 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCampaign}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ============ 할인 정책 생성/수정 모달 ============ */}
      <Dialog open={isPolicyModalOpen} onOpenChange={setIsPolicyModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPolicy ? "할인 정책 수정" : "새 할인 정책"}
            </DialogTitle>
            <DialogDescription>
              학원비에 적용할 할인 정책을 설정합니다
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>정책 이름 *</Label>
              <Input
                value={policyFormData.title}
                onChange={(e) => setPolicyFormData({ ...policyFormData, title: e.target.value })}
                placeholder="예: 형제 할인"
              />
            </div>

            <div className="space-y-2">
              <Label>정책 유형 *</Label>
              <Select
                value={policyFormData.policy_target}
                onValueChange={(v) => setPolicyFormData({ ...policyFormData, policy_target: v as PolicyTarget })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(POLICY_TARGET_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {POLICY_TARGET_ICONS[value as PolicyTarget]} {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea
                value={policyFormData.description}
                onChange={(e) => setPolicyFormData({ ...policyFormData, description: e.target.value })}
                placeholder="정책에 대한 상세 설명"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>할인 유형</Label>
                <Select
                  value={policyFormData.reward_amount_type}
                  onValueChange={(v) => setPolicyFormData({ ...policyFormData, reward_amount_type: v as RewardAmountType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REWARD_AMOUNT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  {policyFormData.reward_amount_type === "percent" ? "할인율 (%)" : "할인 금액 (원)"}
                </Label>
                <Input
                  type="number"
                  value={policyFormData.reward_amount}
                  onChange={(e) =>
                    setPolicyFormData({ ...policyFormData, reward_amount: parseInt(e.target.value) || 0 })
                  }
                  placeholder={policyFormData.reward_amount_type === "percent" ? "예: 5" : "예: 10000"}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>상태</Label>
              <Select
                value={policyFormData.status}
                onValueChange={(v) => setPolicyFormData({ ...policyFormData, status: v as CampaignStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CAMPAIGN_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 형제 할인 안내 */}
            {policyFormData.policy_target === "sibling" && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm text-blue-700">
                  💡 형제 할인은 같은 학부모 전화번호로 등록된 재원 학생이 2명 이상일 때 자동으로 적용 대상이 됩니다.
                </p>
              </div>
            )}

            {/* 수학+과학 동시수강 할인 안내 */}
            {policyFormData.policy_target === "dual_subject" && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <p className="text-sm text-emerald-700">
                  💡 수학(수학특강 포함)과 과학(과학특강 포함)을 동시에 수강하는 학생에게 과학 수강료 할인이 적용됩니다.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPolicyModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSavePolicy}>
              {editingPolicy ? "수정" : "생성"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ 할인 정책 삭제 확인 ============ */}
      <AlertDialog open={!!deletePolicyId} onOpenChange={() => setDeletePolicyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>할인 정책을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 해당 정책은 더 이상 적용할 수 없게 됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePolicy}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
