"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { format } from "date-fns"
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
  type MarketingActivityParticipant,
} from "@/services/marketing-service"

export interface ActivityFormData {
  channel: MarketingChannel | ""
  title: string
  description: string
  activityDate: Date
  costAmount: string
  contentUrl: string
  status: MarketingStatus
}

export interface StudentOption {
  id: string
  name: string
  school_type: string | null
  grade: number | null
  status: string
}

export function useMarketingData() {
  const [marketingActivities, setMarketingActivities] = useState<MarketingActivity[]>([])
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<MarketingActivity | null>(null)
  const [deleteActivityId, setDeleteActivityId] = useState<string | null>(null)
  const [activityForm, setActivityForm] = useState<ActivityFormData>({
    channel: "",
    title: "",
    description: "",
    activityDate: new Date(),
    costAmount: "",
    contentUrl: "",
    status: "in_progress",
  })
  const [savingActivity, setSavingActivity] = useState(false)

  // 참가자 관리 관련 상태
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  const [participants, setParticipants] = useState<MarketingActivityParticipant[]>([])
  const [allStudents, setAllStudents] = useState<StudentOption[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [loadingParticipants, setLoadingParticipants] = useState(false)
  const [savingParticipants, setSavingParticipants] = useState(false)
  const [studentSearchQuery, setStudentSearchQuery] = useState("")
  const [activityStatusFilter, setActivityStatusFilter] = useState<MarketingStatus | "all">("all")
  const [participatedDate, setParticipatedDate] = useState<Date>(new Date())

  const supabase = createClient()
  const channels = getAllChannels()

  const loadMarketingActivities = async () => {
    const activities = await getMarketingActivities(supabase)
    setMarketingActivities(activities)
  }

  const loadAllStudents = async () => {
    const { data } = await supabase
      .from("students")
      .select("id, name, school_type, grade, status")
      .order("name")
    setAllStudents(data || [])
  }

  useEffect(() => {
    loadMarketingActivities()
    loadAllStudents()
  }, [])

  // 활동 선택 시 참가자 로드
  const handleSelectActivity = async (activityId: string) => {
    setSelectedActivityId(activityId)
    setLoadingParticipants(true)
    setSelectedStudentIds([])
    setStudentSearchQuery("")

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

  // 필터된 학생 목록
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

  return {
    // 활동 데이터
    marketingActivities,
    filteredActivities,
    selectedActivity,
    activityCountByStatus,
    channels,
    loadMarketingActivities,
    loadData: loadMarketingActivities,  // alias for consistency

    // 활동 모달
    isActivityModalOpen,
    setIsActivityModalOpen,
    editingActivity,
    activityForm,
    setActivityForm,
    savingActivity,
    openCreateActivityModal,
    openEditActivityModal,
    handleSaveActivity,

    // 활동 삭제
    deleteActivityId,
    setDeleteActivityId,
    handleDeleteActivity,

    // 활동 필터
    activityStatusFilter,
    setActivityStatusFilter,

    // 참가자 관리
    selectedActivityId,
    participants,
    allStudents,
    selectedStudentIds,
    setSelectedStudentIds,
    loadingParticipants,
    savingParticipants,
    studentSearchQuery,
    setStudentSearchQuery,
    participatedDate,
    setParticipatedDate,
    filteredStudents,
    handleSelectActivity,
    handleAddParticipants,
    handleRemoveParticipant,
  }
}
