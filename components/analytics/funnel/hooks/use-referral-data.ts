"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { format } from "date-fns"
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
  type ReferralStats,
  type TopReferrer,
} from "@/services/referral-service"

export interface ReferralFormData {
  referrer_student_id: string
  referred_student_id: string
  referral_date: Date
  referral_type: ReferralType
  notes: string
}

export interface RewardFormData {
  reward_type: RewardType
  reward_amount: string
  reward_date: Date
  reward_notes: string
}

export interface StudentOption {
  id: string
  name: string
  school_type: string | null
  grade: number | null
  status: string
}

export function useReferralData() {
  const supabase = createClient()

  // 내부적으로 학생 목록 관리
  const [allStudents, setAllStudents] = useState<StudentOption[]>([])
  const [referrals, setReferrals] = useState<StudentReferral[]>([])
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null)
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([])
  const [pendingRewards, setPendingRewards] = useState<StudentReferral[]>([])
  const [loadingReferrals, setLoadingReferrals] = useState(false)
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false)
  const [editingReferral, setEditingReferral] = useState<StudentReferral | null>(null)
  const [deleteReferralId, setDeleteReferralId] = useState<string | null>(null)
  const [savingReferral, setSavingReferral] = useState(false)
  const [referralForm, setReferralForm] = useState<ReferralFormData>({
    referrer_student_id: "",
    referred_student_id: "",
    referral_date: new Date(),
    referral_type: "학부모추천",
    notes: "",
  })
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false)
  const [rewardTargetReferral, setRewardTargetReferral] = useState<StudentReferral | null>(null)
  const [rewardForm, setRewardForm] = useState<RewardFormData>({
    reward_type: "학원비할인",
    reward_amount: "",
    reward_date: new Date(),
    reward_notes: "",
  })
  const [referrerSearchQuery, setReferrerSearchQuery] = useState("")
  const [referredSearchQuery, setReferredSearchQuery] = useState("")

  // 학생 목록 로드
  const loadAllStudents = async () => {
    const { data } = await supabase
      .from("students")
      .select("id, name, school_type, grade, status")
      .order("name")
    setAllStudents(data || [])
  }

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

  useEffect(() => {
    loadAllStudents()
    loadReferralData()
  }, [])

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

  return {
    // 추천 데이터
    referrals,
    referralStats,
    topReferrers,
    pendingRewards,
    loadingReferrals,
    loading: loadingReferrals,  // alias for consistency
    loadReferralData,
    loadData: loadReferralData,  // alias for consistency

    // 추천 모달
    isReferralModalOpen,
    setIsReferralModalOpen,
    editingReferral,
    referralForm,
    setReferralForm,
    savingReferral,
    openCreateReferralModal,
    openEditReferralModal,
    handleSaveReferral,

    // 추천 삭제
    deleteReferralId,
    setDeleteReferralId,
    handleDeleteReferral,

    // 추천 상태
    handleChangeReferralStatus,

    // 보상 모달
    isRewardModalOpen,
    setIsRewardModalOpen,
    rewardTargetReferral,
    rewardForm,
    setRewardForm,
    openRewardModal,
    handleGiveReward,

    // 학생 검색
    referrerSearchQuery,
    setReferrerSearchQuery,
    referredSearchQuery,
    setReferredSearchQuery,
    filteredReferrerStudents,
    filteredReferredStudents,

    // 학생 데이터 (다른 컴포넌트에서 사용)
    allStudents,
    loadAllStudents,
  }
}
