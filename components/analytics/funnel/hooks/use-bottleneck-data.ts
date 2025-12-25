"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import type { Bottleneck, BottleneckDetail, StageDuration, LeadSourceBottleneck, ConsultationEffect, AIHurdlePattern } from "../types"

export function useBottleneckData() {
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([])
  const [bottleneckDetails, setBottleneckDetails] = useState<BottleneckDetail[]>([])
  const [successPattern, setSuccessPattern] = useState<BottleneckDetail | null>(null)
  const [stageDurations, setStageDurations] = useState<StageDuration[]>([])
  // 심층 분석 데이터
  const [byLeadSource, setByLeadSource] = useState<LeadSourceBottleneck[]>([])
  const [consultationEffects, setConsultationEffects] = useState<ConsultationEffect[]>([])
  const [aiHurdlePatterns, setAiHurdlePatterns] = useState<AIHurdlePattern[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/funnel/bottlenecks")
      if (res.ok) {
        const data = await res.json()
        setBottlenecks(data.data || [])
        setBottleneckDetails(data.details || [])
        setSuccessPattern(data.successPattern || null)
        setStageDurations(data.stageDurations || [])
        // 심층 분석 데이터
        setByLeadSource(data.byLeadSource || [])
        setConsultationEffects(data.consultationEffects || [])
        setAiHurdlePatterns(data.aiHurdlePatterns || [])
      }
    } catch (error) {
      console.error("Failed to load bottleneck data:", error)
      toast.error("병목 데이터를 불러오는데 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // 병목 단계에 해당하는 상세 데이터 찾기
  const getBottleneckDetail = (stage: string) => {
    return bottleneckDetails.find((d) => d.stage === stage)
  }

  // 상담 횟수 상태 판단
  const getConsultationStatus = (avg: number) => {
    if (avg < 2) return { label: "부족", color: "text-red-600" }
    if (avg < 3) return { label: "보통", color: "text-amber-600" }
    return { label: "적절", color: "text-emerald-600" }
  }

  // 액션 포인트 생성
  const getActionPoints = (detail: BottleneckDetail): string[] => {
    const points: string[] = []

    if (detail.avgConsultations < 2) {
      points.push("상담 횟수 증가 필요 (현재 평균 " + detail.avgConsultations.toFixed(1) + "회)")
    }
    if (detail.avgPhone < 1) {
      points.push("전화 상담 강화 권장")
    }
    if (detail.avgDaysSinceLastContact && detail.avgDaysSinceLastContact > 14) {
      points.push("팔로업 주기 단축 필요 (현재 " + Math.round(detail.avgDaysSinceLastContact) + "일)")
    }
    if (detail.dropoutRate > 30) {
      points.push("이탈률 관리 필요 (" + detail.dropoutRate.toFixed(1) + "%)")
    }

    return points.length > 0 ? points : ["현재 적절한 수준입니다"]
  }

  // 구간별 평균 소요일 조회
  const getStageDuration = (fromStage: string | null, toStage: string): StageDuration | undefined => {
    return stageDurations.find(
      d => d.fromStage === fromStage && d.toStage === toStage
    )
  }

  return {
    bottlenecks,
    bottleneckDetails,
    successPattern,
    stageDurations,
    // 심층 분석 데이터
    byLeadSource,
    consultationEffects,
    aiHurdlePatterns,
    loading,
    loadData,
    getBottleneckDetail,
    getConsultationStatus,
    getActionPoints,
    getStageDuration,
  }
}
