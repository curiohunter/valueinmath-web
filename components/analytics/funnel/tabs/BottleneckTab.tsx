"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Phone, MessageSquare, Users, TrendingUp, CheckCircle2, AlertTriangle, XCircle, BarChart3
} from "lucide-react"
import type { BottleneckDetail, StageDuration, LeadSourceBottleneck, ConsultationEffect } from "../types"

interface BottleneckTabProps {
  bottleneckDetails: BottleneckDetail[]
  successPattern: BottleneckDetail | null
  stageDurations: StageDuration[]
  byLeadSource: LeadSourceBottleneck[]
  consultationEffects: ConsultationEffect[]
}

export function BottleneckTab({
  bottleneckDetails,
  successPattern,
  stageDurations,
  byLeadSource,
  consultationEffects,
}: BottleneckTabProps) {
  // Sankey 데이터 계산 (정확한 퍼널 추적)
  const sankeyData = useMemo(() => {
    if (byLeadSource.length === 0) return null

    const totalContacts = byLeadSource.reduce((sum, d) => sum + d.totalCount, 0)
    const totalTests = byLeadSource.reduce((sum, d) => sum + d.testCount, 0)
    const totalEnrolls = byLeadSource.reduce((sum, d) => sum + d.enrollCount, 0)
    const enrollAfterTest = byLeadSource.reduce((sum, d) => sum + d.enrollAfterTestCount, 0)
    const directEnroll = byLeadSource.reduce((sum, d) => sum + d.directEnrollCount, 0)

    // 테스트 미진행 중 등록하지 않은 수
    const noTestNoEnroll = totalContacts - totalTests - directEnroll
    // 테스트 후 미등록
    const testNoEnroll = totalTests - enrollAfterTest

    return {
      stages: [
        { name: "첫 상담", count: totalContacts, percentage: 100 },
        { name: "테스트 완료", count: totalTests, percentage: Math.round((totalTests / totalContacts) * 100) },
        { name: "등록 완료", count: totalEnrolls, percentage: Math.round((totalEnrolls / totalContacts) * 100) },
      ],
      flows: {
        // 메인 플로우
        contactToTest: totalTests,
        testToEnroll: enrollAfterTest,
        // 분기 플로우
        directEnroll: directEnroll,
        noTestNoEnroll: noTestNoEnroll,
        testNoEnroll: testNoEnroll,
      },
      dropoffs: [
        {
          from: "첫 상담",
          to: "테스트 미진행 이탈",
          count: noTestNoEnroll,
          percentage: totalContacts > 0 ? Math.round((noTestNoEnroll / totalContacts) * 100) : 0,
        },
        {
          from: "테스트 완료",
          to: "테스트 후 미등록",
          count: testNoEnroll,
          percentage: totalTests > 0 ? Math.round((testNoEnroll / totalTests) * 100) : 0,
        },
      ],
      conversionRates: {
        contactToTest: totalContacts > 0 ? Math.round((totalTests / totalContacts) * 100) : 0,
        testToEnroll: totalTests > 0 ? Math.round((enrollAfterTest / totalTests) * 100) : 0,
        overall: totalContacts > 0 ? Math.round((totalEnrolls / totalContacts) * 100) : 0,
        directEnrollRate: totalContacts > 0 ? Math.round((directEnroll / totalContacts) * 100) : 0,
      },
    }
  }, [byLeadSource])

  // 상담 효과 분석 - 단계별 그룹화
  const consultationAnalysis = useMemo(() => {
    if (consultationEffects.length === 0) return null

    // 테스트 유도 단계 (신규상담, 입테유도) - toTestRate가 핵심
    const preTestTypes = ["신규상담", "입테유도"]
    const preTestData = consultationEffects
      .filter(e => preTestTypes.includes(e.consultationType))
      .sort((a, b) => {
        // 유형별로 먼저 정렬, 같은 유형 내에서는 건수로 정렬
        if (a.consultationType !== b.consultationType) {
          return preTestTypes.indexOf(a.consultationType) - preTestTypes.indexOf(b.consultationType)
        }
        return b.count - a.count
      })

    // 등록 유도 단계 (입테후상담, 등록유도) - toEnrollRate가 핵심
    const postTestTypes = ["입테후상담", "등록유도"]
    const postTestData = consultationEffects
      .filter(e => postTestTypes.includes(e.consultationType))
      .sort((a, b) => {
        if (a.consultationType !== b.consultationType) {
          return postTestTypes.indexOf(a.consultationType) - postTestTypes.indexOf(b.consultationType)
        }
        return b.count - a.count
      })

    // 방법별 집계 (테스트 유도 단계)
    const preTestByMethod = ["전화", "대면", "문자"].map(method => {
      const items = preTestData.filter(e => e.method === method)
      const totalCount = items.reduce((s, e) => s + e.count, 0)
      const weightedRate = totalCount > 0
        ? items.reduce((s, e) => s + e.toTestRate * e.count, 0) / totalCount
        : 0
      return { method, count: totalCount, rate: Math.round(weightedRate * 10) / 10 }
    }).filter(m => m.count > 0)

    // 방법별 집계 (등록 유도 단계)
    const postTestByMethod = ["전화", "대면", "문자"].map(method => {
      const items = postTestData.filter(e => e.method === method)
      const totalCount = items.reduce((s, e) => s + e.count, 0)
      const weightedRate = totalCount > 0
        ? items.reduce((s, e) => s + e.toEnrollRate * e.count, 0) / totalCount
        : 0
      return { method, count: totalCount, rate: Math.round(weightedRate * 10) / 10 }
    }).filter(m => m.count > 0)

    // 인사이트 생성
    const insights: string[] = []

    // 테스트 유도 최고 방법
    const bestPreTest = [...preTestByMethod].filter(m => m.count >= 3).sort((a, b) => b.rate - a.rate)[0]
    if (bestPreTest && bestPreTest.rate > 30) {
      insights.push(`테스트 유도에는 ${bestPreTest.method}가 가장 효과적 (${bestPreTest.rate}%)`)
    }

    // 등록 유도 최고 방법
    const bestPostTest = [...postTestByMethod].filter(m => m.count >= 3).sort((a, b) => b.rate - a.rate)[0]
    if (bestPostTest && bestPostTest.rate > 40) {
      insights.push(`등록 유도에는 ${bestPostTest.method}가 가장 효과적 (${bestPostTest.rate}%)`)
    }

    // 대면 vs 전화 비교 (등록 단계)
    const postFace = postTestByMethod.find(m => m.method === "대면")
    const postPhone = postTestByMethod.find(m => m.method === "전화")
    if (postFace && postPhone && postFace.count >= 3 && postPhone.count >= 3) {
      const diff = postFace.rate - postPhone.rate
      if (Math.abs(diff) > 10) {
        if (diff > 0) {
          insights.push(`등록 유도 시 대면이 전화보다 ${diff.toFixed(0)}%p 높은 전환율`)
        } else {
          insights.push(`등록 유도 시 전화가 대면보다 ${Math.abs(diff).toFixed(0)}%p 높은 전환율`)
        }
      }
    }

    return {
      preTest: { data: preTestData, byMethod: preTestByMethod },
      postTest: { data: postTestData, byMethod: postTestByMethod },
      insights,
    }
  }, [consultationEffects])

  // 병목 분석만 있는 경우 (상담 효과 없음)
  const showOnlyFlow = sankeyData && !consultationAnalysis
  // 상담 효과만 있는 경우 (병목 분석 없음)
  const showOnlyConsultation = !sankeyData && consultationAnalysis

  // 둘 다 없으면 빈 상태 표시
  if (!sankeyData && !consultationAnalysis) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        분석 데이터가 없습니다.
      </div>
    )
  }

  // 하나만 있는 경우 탭 없이 바로 표시
  if (showOnlyFlow) {
    return (
      <div className="space-y-6 p-4 border rounded-lg bg-white">
        <FlowAnalysis
          sankeyData={sankeyData}
          bottleneckDetails={bottleneckDetails}
          successPattern={successPattern}
        />
      </div>
    )
  }

  if (showOnlyConsultation) {
    return (
      <div className="space-y-6 p-4 border rounded-lg bg-white">
        <ConsultationAnalysis consultationAnalysis={consultationAnalysis} />
      </div>
    )
  }

  // 둘 다 있는 경우 탭으로 표시
  return (
    <div className="p-4 border rounded-lg bg-white">
      <Tabs defaultValue="flow" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="flow" className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" />
            퍼널 흐름
          </TabsTrigger>
          <TabsTrigger value="consultation" className="flex items-center gap-1.5">
            <Phone className="h-4 w-4" />
            상담 효과
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flow" className="space-y-6">
          {sankeyData && (
            <FlowAnalysis
              sankeyData={sankeyData}
              bottleneckDetails={bottleneckDetails}
              successPattern={successPattern}
            />
          )}
        </TabsContent>

        <TabsContent value="consultation" className="space-y-6">
          {consultationAnalysis && (
            <ConsultationAnalysis consultationAnalysis={consultationAnalysis} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// 퍼널 흐름 분석 컴포넌트
function FlowAnalysis({
  sankeyData,
  bottleneckDetails,
  successPattern,
}: {
  sankeyData: NonNullable<ReturnType<typeof useSankeyData>>
  bottleneckDetails: BottleneckDetail[]
  successPattern: BottleneckDetail | null
}) {
  return (
    <>
      {/* 전체 전환율 요약 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-sm text-blue-600 mb-1">첫상담 → 테스트</div>
          <div className="text-2xl font-bold text-blue-700">{sankeyData.conversionRates.contactToTest}%</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
          <div className="text-sm text-purple-600 mb-1">테스트 → 등록</div>
          <div className="text-2xl font-bold text-purple-700">{sankeyData.conversionRates.testToEnroll}%</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <div className="text-sm text-amber-600 mb-1">직접 등록</div>
          <div className="text-2xl font-bold text-amber-700">{sankeyData.conversionRates.directEnrollRate}%</div>
          <div className="text-xs text-amber-500">({sankeyData.flows.directEnroll}명)</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
          <div className="text-sm text-emerald-600 mb-1">전체 전환율</div>
          <div className="text-2xl font-bold text-emerald-700">{sankeyData.conversionRates.overall}%</div>
        </div>
      </div>

      {/* 퍼널 흐름 시각화 - 스택 바 차트 */}
      <div className="space-y-4">
        {/* 첫 상담 → 분기 */}
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-lg">첫 상담</span>
            <span className="text-2xl font-bold">{sankeyData.stages[0].count}명</span>
          </div>
          <div className="h-8 bg-gray-100 rounded-lg overflow-hidden flex">
            {/* 테스트 진행 */}
            <div
              className="bg-purple-500 flex items-center justify-center text-white text-sm font-medium"
              style={{ width: `${sankeyData.conversionRates.contactToTest}%` }}
              title={`테스트 진행: ${sankeyData.stages[1].count}명`}
            >
              {sankeyData.conversionRates.contactToTest}%
            </div>
            {/* 직접 등록 */}
            <div
              className="bg-amber-400 flex items-center justify-center text-white text-sm font-medium"
              style={{ width: `${sankeyData.conversionRates.directEnrollRate}%` }}
              title={`직접 등록: ${sankeyData.flows.directEnroll}명`}
            >
              {sankeyData.conversionRates.directEnrollRate > 5 ? `${sankeyData.conversionRates.directEnrollRate}%` : ''}
            </div>
            {/* 이탈 */}
            <div
              className="bg-red-400 flex items-center justify-center text-white text-sm font-medium flex-1"
              title={`이탈: ${sankeyData.flows.noTestNoEnroll}명`}
            >
              {sankeyData.dropoffs[0].percentage}%
            </div>
          </div>
          <div className="flex gap-4 mt-2 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-purple-500"></div>
              <span>테스트 진행 {sankeyData.stages[1].count}명</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-amber-400"></div>
              <span>직접 등록 {sankeyData.flows.directEnroll}명</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-400"></div>
              <span>이탈 {sankeyData.flows.noTestNoEnroll}명</span>
            </div>
          </div>
        </div>

        {/* 테스트 완료 → 분기 */}
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-lg">테스트 완료</span>
            <span className="text-2xl font-bold">{sankeyData.stages[1].count}명</span>
          </div>
          <div className="h-8 bg-gray-100 rounded-lg overflow-hidden flex">
            {/* 등록 */}
            <div
              className="bg-emerald-500 flex items-center justify-center text-white text-sm font-medium"
              style={{ width: `${sankeyData.conversionRates.testToEnroll}%` }}
              title={`등록: ${sankeyData.flows.testToEnroll}명`}
            >
              {sankeyData.conversionRates.testToEnroll}%
            </div>
            {/* 미등록 */}
            <div
              className="bg-red-400 flex items-center justify-center text-white text-sm font-medium flex-1"
              title={`미등록: ${sankeyData.flows.testNoEnroll}명`}
            >
              {sankeyData.dropoffs[1].percentage}%
            </div>
          </div>
          <div className="flex gap-4 mt-2 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-500"></div>
              <span>등록 {sankeyData.flows.testToEnroll}명</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-400"></div>
              <span>미등록 이탈 {sankeyData.flows.testNoEnroll}명</span>
            </div>
          </div>
        </div>

        {/* 최종 등록 요약 */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-lg text-emerald-700">등록 완료</span>
              <div className="text-sm text-emerald-600 mt-1">
                테스트 후 등록 {sankeyData.flows.testToEnroll}명 + 직접 등록 {sankeyData.flows.directEnroll}명
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-emerald-700">{sankeyData.stages[2].count}명</div>
              <div className="text-sm text-emerald-600">전체 전환율 {sankeyData.conversionRates.overall}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* 병목 분석 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 테스트 전 이탈 분석 */}
        <div className={`rounded-lg border-2 overflow-hidden ${
          sankeyData.dropoffs[0].percentage > 50 ? "border-red-200" :
          sankeyData.dropoffs[0].percentage > 30 ? "border-amber-200" : "border-gray-200"
        }`}>
          <div className={`px-4 py-3 ${
            sankeyData.dropoffs[0].percentage > 50 ? "bg-red-50" :
            sankeyData.dropoffs[0].percentage > 30 ? "bg-amber-50" : "bg-gray-50"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {sankeyData.dropoffs[0].percentage > 50 ? (
                  <XCircle className="h-5 w-5 text-red-500" />
                ) : sankeyData.dropoffs[0].percentage > 30 ? (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
                <span className="font-semibold">테스트 미진행 이탈</span>
              </div>
              <div className={`text-xl font-bold ${
                sankeyData.dropoffs[0].percentage > 50 ? "text-red-600" :
                sankeyData.dropoffs[0].percentage > 30 ? "text-amber-600" : "text-green-600"
              }`}>
                {sankeyData.dropoffs[0].percentage}%
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="text-sm text-muted-foreground mb-2">
              {sankeyData.flows.noTestNoEnroll}명이 테스트 없이 이탈 (직접등록 {sankeyData.flows.directEnroll}명 제외)
            </div>
            {bottleneckDetails.find(d => d.stage === "테스트미완료") && (
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="bg-gray-50 rounded p-2 text-center">
                  <div className="text-muted-foreground text-xs">평균 상담</div>
                  <div className="font-semibold">
                    {bottleneckDetails.find(d => d.stage === "테스트미완료")?.avgConsultations}회
                  </div>
                </div>
                <div className="bg-gray-50 rounded p-2 text-center">
                  <div className="text-muted-foreground text-xs">전화</div>
                  <div className="font-semibold">
                    {bottleneckDetails.find(d => d.stage === "테스트미완료")?.avgPhone}회
                  </div>
                </div>
                <div className="bg-gray-50 rounded p-2 text-center">
                  <div className="text-muted-foreground text-xs">방치일</div>
                  <div className="font-semibold">
                    {Math.round(bottleneckDetails.find(d => d.stage === "테스트미완료")?.avgDaysSinceLastContact || 0)}일
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 테스트 후 이탈 분석 */}
        <div className={`rounded-lg border-2 overflow-hidden ${
          sankeyData.dropoffs[1].percentage > 50 ? "border-red-200" :
          sankeyData.dropoffs[1].percentage > 30 ? "border-amber-200" : "border-gray-200"
        }`}>
          <div className={`px-4 py-3 ${
            sankeyData.dropoffs[1].percentage > 50 ? "bg-red-50" :
            sankeyData.dropoffs[1].percentage > 30 ? "bg-amber-50" : "bg-gray-50"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {sankeyData.dropoffs[1].percentage > 50 ? (
                  <XCircle className="h-5 w-5 text-red-500" />
                ) : sankeyData.dropoffs[1].percentage > 30 ? (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
                <span className="font-semibold">테스트 → 등록</span>
              </div>
              <div className={`text-xl font-bold ${
                sankeyData.dropoffs[1].percentage > 50 ? "text-red-600" :
                sankeyData.dropoffs[1].percentage > 30 ? "text-amber-600" : "text-green-600"
              }`}>
                {sankeyData.dropoffs[1].percentage}% 이탈
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="text-sm text-muted-foreground mb-2">
              {sankeyData.dropoffs[1].count}명이 테스트 후 미등록
            </div>
            {bottleneckDetails.find(d => d.stage === "테스트완료-미등록") && (
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="bg-gray-50 rounded p-2 text-center">
                  <div className="text-muted-foreground text-xs">평균 상담</div>
                  <div className="font-semibold">
                    {bottleneckDetails.find(d => d.stage === "테스트완료-미등록")?.avgConsultations}회
                  </div>
                </div>
                <div className="bg-gray-50 rounded p-2 text-center">
                  <div className="text-muted-foreground text-xs">대면</div>
                  <div className="font-semibold">
                    {bottleneckDetails.find(d => d.stage === "테스트완료-미등록")?.avgVisit}회
                  </div>
                </div>
                <div className="bg-gray-50 rounded p-2 text-center">
                  <div className="text-muted-foreground text-xs">방치일</div>
                  <div className="font-semibold">
                    {Math.round(bottleneckDetails.find(d => d.stage === "테스트완료-미등록")?.avgDaysSinceLastContact || 0)}일
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 성공 패턴 비교 */}
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
    </>
  )
}

// useSankeyData 타입 추론을 위한 더미 함수
function useSankeyData() {
  return {
    stages: [] as { name: string; count: number; percentage: number }[],
    flows: {
      contactToTest: 0,
      testToEnroll: 0,
      directEnroll: 0,
      noTestNoEnroll: 0,
      testNoEnroll: 0,
    },
    dropoffs: [] as { from: string; to: string; count: number; percentage: number }[],
    conversionRates: {
      contactToTest: 0,
      testToEnroll: 0,
      overall: 0,
      directEnrollRate: 0,
    },
  }
}

// 상담 효과 분석 컴포넌트
function ConsultationAnalysis({
  consultationAnalysis,
}: {
  consultationAnalysis: NonNullable<ReturnType<typeof useConsultationAnalysis>>
}) {
  return (
    <>
      {/* 인사이트 박스 */}
      {consultationAnalysis.insights.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-700 font-semibold mb-3">
            <TrendingUp className="h-5 w-5" />
            핵심 인사이트
          </div>
          <ul className="space-y-1.5 text-sm text-blue-800">
            {consultationAnalysis.insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 두 단계 병렬 배치 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1단계: 테스트 유도 */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-purple-50 border-b border-purple-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold">1</div>
              <div>
                <h3 className="font-semibold text-purple-900">테스트 유도 단계</h3>
                <p className="text-xs text-purple-600">신규상담, 입테유도 → 목표: 테스트 진행</p>
              </div>
            </div>
          </div>

          {/* 방법별 비교 바 차트 */}
          <div className="p-4 space-y-3">
            <div className="text-sm font-medium text-gray-700 mb-2">방법별 테스트 진행률</div>
            {consultationAnalysis.preTest.byMethod.map((m) => {
              const maxRate = Math.max(...consultationAnalysis.preTest.byMethod.map(x => x.rate))
              const isBest = m.rate === maxRate && m.count >= 3
              return (
                <div key={m.method} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1.5">
                      {m.method === "전화" && <Phone className="h-3.5 w-3.5 text-blue-500" />}
                      {m.method === "문자" && <MessageSquare className="h-3.5 w-3.5 text-green-500" />}
                      {m.method === "대면" && <Users className="h-3.5 w-3.5 text-purple-500" />}
                      {m.method}
                      <span className="text-gray-400">({m.count}건)</span>
                      {isBest && <Badge className="bg-purple-100 text-purple-700 text-xs">Best</Badge>}
                    </span>
                    <span className={`font-semibold ${m.rate >= 50 ? "text-green-600" : m.rate >= 30 ? "text-amber-600" : "text-gray-600"}`}>
                      {m.rate}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isBest ? "bg-purple-500" : "bg-purple-300"}`}
                      style={{ width: `${Math.min(m.rate, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* 상세 테이블 */}
          <div className="border-t">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-left p-2 pl-4 font-medium">상담 유형</th>
                  <th className="text-left p-2 font-medium">방법</th>
                  <th className="text-center p-2 font-medium">건수</th>
                  <th className="text-center p-2 pr-4 font-medium">테스트율</th>
                </tr>
              </thead>
              <tbody>
                {consultationAnalysis.preTest.data.map((item, idx) => (
                  <tr key={idx} className="border-t hover:bg-gray-50">
                    <td className="p-2 pl-4">
                      <span className="text-gray-700">{item.consultationType}</span>
                    </td>
                    <td className="p-2">
                      <span className="flex items-center gap-1">
                        {item.method === "전화" && <Phone className="h-3 w-3 text-blue-500" />}
                        {item.method === "문자" && <MessageSquare className="h-3 w-3 text-green-500" />}
                        {item.method === "대면" && <Users className="h-3 w-3 text-purple-500" />}
                        {item.method}
                      </span>
                    </td>
                    <td className="p-2 text-center text-gray-600">{item.count}</td>
                    <td className="p-2 pr-4 text-center">
                      <span className={`font-medium ${item.toTestRate >= 50 ? "text-green-600" : item.toTestRate >= 30 ? "text-amber-600" : "text-gray-500"}`}>
                        {item.toTestRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2단계: 등록 유도 */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">2</div>
              <div>
                <h3 className="font-semibold text-emerald-900">등록 유도 단계</h3>
                <p className="text-xs text-emerald-600">입테후상담, 등록유도 → 목표: 등록 완료</p>
              </div>
            </div>
          </div>

          {/* 방법별 비교 바 차트 */}
          <div className="p-4 space-y-3">
            <div className="text-sm font-medium text-gray-700 mb-2">방법별 등록 전환률</div>
            {consultationAnalysis.postTest.byMethod.map((m) => {
              const maxRate = Math.max(...consultationAnalysis.postTest.byMethod.map(x => x.rate))
              const isBest = m.rate === maxRate && m.count >= 3
              return (
                <div key={m.method} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1.5">
                      {m.method === "전화" && <Phone className="h-3.5 w-3.5 text-blue-500" />}
                      {m.method === "문자" && <MessageSquare className="h-3.5 w-3.5 text-green-500" />}
                      {m.method === "대면" && <Users className="h-3.5 w-3.5 text-purple-500" />}
                      {m.method}
                      <span className="text-gray-400">({m.count}건)</span>
                      {isBest && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Best</Badge>}
                    </span>
                    <span className={`font-semibold ${m.rate >= 60 ? "text-green-600" : m.rate >= 40 ? "text-amber-600" : "text-red-500"}`}>
                      {m.rate}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isBest ? "bg-emerald-500" : "bg-emerald-300"}`}
                      style={{ width: `${Math.min(m.rate, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* 상세 테이블 */}
          <div className="border-t">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-left p-2 pl-4 font-medium">상담 유형</th>
                  <th className="text-left p-2 font-medium">방법</th>
                  <th className="text-center p-2 font-medium">건수</th>
                  <th className="text-center p-2 pr-4 font-medium">등록률</th>
                </tr>
              </thead>
              <tbody>
                {consultationAnalysis.postTest.data.map((item, idx) => (
                  <tr key={idx} className="border-t hover:bg-gray-50">
                    <td className="p-2 pl-4">
                      <span className="text-gray-700">{item.consultationType}</span>
                    </td>
                    <td className="p-2">
                      <span className="flex items-center gap-1">
                        {item.method === "전화" && <Phone className="h-3 w-3 text-blue-500" />}
                        {item.method === "문자" && <MessageSquare className="h-3 w-3 text-green-500" />}
                        {item.method === "대면" && <Users className="h-3 w-3 text-purple-500" />}
                        {item.method}
                      </span>
                    </td>
                    <td className="p-2 text-center text-gray-600">{item.count}</td>
                    <td className="p-2 pr-4 text-center">
                      <span className={`font-medium ${item.toEnrollRate >= 60 ? "text-green-600" : item.toEnrollRate >= 40 ? "text-amber-600" : "text-red-500"}`}>
                        {item.toEnrollRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}

// useConsultationAnalysis 타입 추론을 위한 더미 함수
function useConsultationAnalysis() {
  return {
    preTest: {
      data: [] as ConsultationEffect[],
      byMethod: [] as { method: string; count: number; rate: number }[],
    },
    postTest: {
      data: [] as ConsultationEffect[],
      byMethod: [] as { method: string; count: number; rate: number }[],
    },
    insights: [] as string[],
  }
}
