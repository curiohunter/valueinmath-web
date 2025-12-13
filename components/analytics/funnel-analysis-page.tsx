"use client"

import { useState, useEffect } from "react"
import AnalyticsTabs from "@/components/analytics/AnalyticsTabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Phone, MessageSquare, Users, Clock, TrendingUp, CheckCircle2, AlertTriangle, XCircle } from "lucide-react"
import { toast } from "sonner"

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
  firstContacts: number      // 첫 상담 수
  tests: number              // 테스트 완료 수
  enrollments: number        // 등록 완료 수
  conversionRate: number     // 최종 전환율 (첫상담→등록)
  testRate: number           // 테스트 전환율 (첫상담→테스트)
  avgDaysToEnroll: number | null   // 첫상담→등록 평균 소요일
  avgConsultations: number | null  // 등록까지 평균 상담 횟수
}

export function FunnelAnalysisPageClient() {
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([])
  const [bottleneckDetails, setBottleneckDetails] = useState<BottleneckDetail[]>([])
  const [successPattern, setSuccessPattern] = useState<BottleneckDetail | null>(null)
  const [leadSourceMetrics, setLeadSourceMetrics] = useState<LeadSourceMetrics[]>([])
  const [leadSourceSummary, setLeadSourceSummary] = useState<LeadSourceMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [bottlenecksRes, leadSourceRes] = await Promise.all([
        fetch("/api/funnel/bottlenecks"),
        fetch("/api/funnel/by-source"),
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
    } catch (error) {
      console.error("Failed to load funnel data:", error)
      toast.error("퍼널 데이터를 불러오는데 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  // 병목 단계에 해당하는 상세 데이터 찾기
  const getDetailForStage = (stageName: string): BottleneckDetail | null => {
    // 병목 단계명을 상세 데이터의 stage와 매칭
    // 서비스에서 "첫 상담 → 입학테스트" (띄어쓰기 있음) 형태로 옴
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

  // 방치 상태 판단
  const getContactStatus = (days: number | null) => {
    if (days === null) return null
    if (days > 30) return { status: "abandoned", color: "text-red-600", bg: "bg-red-50", label: "방치" }
    if (days > 14) return { status: "warning", color: "text-amber-600", bg: "bg-amber-50", label: "주의" }
    return { status: "ok", color: "text-green-600", bg: "bg-green-50", label: "정상" }
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 병목 구간 분석 - Full Width */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>병목 구간 상세 분석</CardTitle>
                <CardDescription>
                  이탈 구간별 상담 패턴과 등록 성공 패턴을 비교하여 액션 포인트를 도출합니다. (2025년 9월 이후)
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

                {/* 병목 단계별 상세 분석 */}
                {bottlenecks.length > 0 ? (
                  <div className="space-y-4">
                    {bottlenecks.map((bottleneck, index) => {
                      const detail = getDetailForStage(bottleneck.stage)
                      const consultStatus = detail && successPattern
                        ? getConsultationStatus(detail.avgConsultations, successPattern.avgConsultations)
                        : null
                      const contactStatus = detail ? getContactStatus(detail.avgDaysSinceLastContact) : null
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
                              {/* 핵심 지표 비교 */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {/* 상담 횟수 */}
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

                                {/* 전화 상담 */}
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

                                {/* 문자 상담 */}
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

                                {/* 대면 상담 */}
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

                              {/* 마지막 연락 경과 */}
                              {contactStatus && (
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${contactStatus.bg}`}>
                                  <Clock className={`h-4 w-4 ${contactStatus.color}`} />
                                  <span className={contactStatus.color}>
                                    마지막 연락 후 평균 <strong>{Math.round(detail.avgDaysSinceLastContact!)}일</strong> 경과
                                  </span>
                                  {contactStatus.status === "abandoned" && (
                                    <Badge variant="destructive" className="ml-2">방치 상태</Badge>
                                  )}
                                </div>
                              )}

                              {/* 액션 포인트 */}
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

                          {/* 상세 데이터 없을 때 */}
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

            {/* 리드 소스별 분석 */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>리드 소스별 전환율</CardTitle>
                <CardDescription>유입 채널별 등록 전환 성과 및 리소스 (2025년 9월 이후)</CardDescription>
              </CardHeader>
              <CardContent>
                {leadSourceMetrics.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left p-2">소스</th>
                          <th className="text-center p-2">첫상담</th>
                          <th className="text-center p-2">테스트</th>
                          <th className="text-center p-2">등록</th>
                          <th className="text-center p-2">전환율</th>
                          <th className="text-center p-2">소요일</th>
                          <th className="text-center p-2">상담횟수</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leadSourceMetrics.map((source) => (
                          <tr key={source.source} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">{source.source}</td>
                            <td className="p-2 text-center">{source.firstContacts}</td>
                            <td className="p-2 text-center">
                              {source.tests}
                              <span className="text-xs text-muted-foreground ml-1">
                                ({source.testRate}%)
                              </span>
                            </td>
                            <td className="p-2 text-center font-bold text-green-600">
                              {source.enrollments}
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
                          </tr>
                        ))}
                        {/* 합계 행 */}
                        {leadSourceSummary && (
                          <tr className="border-t-2 bg-muted/50 font-semibold">
                            <td className="p-2">{leadSourceSummary.source}</td>
                            <td className="p-2 text-center">{leadSourceSummary.firstContacts}</td>
                            <td className="p-2 text-center">
                              {leadSourceSummary.tests}
                              <span className="text-xs text-muted-foreground ml-1">
                                ({leadSourceSummary.testRate}%)
                              </span>
                            </td>
                            <td className="p-2 text-center text-green-600">
                              {leadSourceSummary.enrollments}
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
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
