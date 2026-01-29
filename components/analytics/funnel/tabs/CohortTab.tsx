"use client"

import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Loader2, ChevronDown, ChevronRight } from "lucide-react"
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import type { CohortData, GradeBreakdown, EnrolledGradeBreakdown, PeriodFilter, ChartDataPoint } from "../types"

interface CohortSummary {
  recent3Avg: number
  conversionChange: number
  totalOngoing: number
  convertedOngoing: number
  ongoingConversionRate: number
  avgDaysToEnroll: number | null
  bestCohort: CohortData | null
  worstCohort: CohortData | null
}

interface CohortTabProps {
  // 데이터
  filteredCohortData: CohortData[]
  cohortLeadSources: string[]
  chartData: ChartDataPoint[]
  cohortSummary: CohortSummary | null
  cohortGradeData: Record<string, GradeBreakdown[]>
  cohortEnrolledGradeData: Record<string, EnrolledGradeBreakdown[]>
  loadingCohortDetails: Set<string>
  expandedCohorts: Set<string>

  // 필터 상태
  periodFilter: PeriodFilter
  selectedLeadSource: string
  isCohortTableExpanded: boolean

  // 핸들러
  setPeriodFilter: (value: PeriodFilter) => void
  setSelectedLeadSource: (value: string) => void
  setIsCohortTableExpanded: (value: boolean) => void
  toggleCohortExpand: (cohortKey: string, cohortMonth: string, leadSource: string | undefined) => void

  // 유틸리티
  getConversionColor: (rate: number, isOngoing: boolean) => string
  getConversionBadgeClass: (rate: number, isOngoing: boolean) => string
  getDaysBadge: (days: number | null) => { label: string; class: string } | null
}

export function CohortTab({
  filteredCohortData,
  cohortLeadSources,
  chartData,
  cohortSummary,
  cohortGradeData,
  cohortEnrolledGradeData,
  loadingCohortDetails,
  expandedCohorts,
  periodFilter,
  selectedLeadSource,
  isCohortTableExpanded,
  setPeriodFilter,
  setSelectedLeadSource,
  setIsCohortTableExpanded,
  toggleCohortExpand,
  getConversionColor,
  getConversionBadgeClass,
  getDaysBadge,
}: CohortTabProps) {
  return (
    <div className="space-y-6">
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

      {/* 간소화된 차트: 상담 + 등록 막대 + 전환율 라인 (YoY는 툴팁에서만) */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-muted-foreground">월별 코호트 현황 (최근 12개월)</h4>
            <div className="flex items-center gap-4 text-xs flex-wrap">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#3b82f6' }}></span>
                <span className="text-muted-foreground">신규 상담</span>
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
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 20, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="fullMonth"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => value?.slice(2) || ''}
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
                  const hasYoY = yoyChange !== null && yoyChange !== undefined
                  const isPositive = yoyChange > 0
                  return (
                    <div className="bg-white shadow-lg border rounded-lg p-3 text-sm">
                      <p className="font-semibold mb-2">{data.fullMonth}</p>
                      <div className="space-y-1">
                        <p style={{ color: '#3b82f6' }}>신규 상담: {data.총원}명</p>
                        <p style={{ color: '#14b8a6' }}>등록: {data.등록}명</p>
                        <p style={{ color: '#f97316' }}>전환율: {data.전환율}%</p>
                      </div>
                      {hasYoY && (
                        <div className="mt-2 pt-2 border-t">
                          <p className={isPositive ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                            YoY: {isPositive ? '+' : ''}{yoyChange}%p
                          </p>
                          <p className="text-xs text-muted-foreground">전년 동월: {data.prevYear총원}명 → {data.prevYear등록}명 ({data.prevYearRate}%)</p>
                        </div>
                      )}
                      {data.isOngoing && (
                        <p className="text-sky-500 text-xs mt-1">진행중</p>
                      )}
                    </div>
                  )
                }}
              />
              {/* 신규 상담 막대 (블루) */}
              <Bar yAxisId="left" dataKey="총원" name="신규 상담" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={24} />
              {/* 등록 막대 (틸) */}
              <Bar yAxisId="left" dataKey="등록" name="등록" fill="#14b8a6" radius={[3, 3, 0, 0]} maxBarSize={24} />
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

      {/* 코호트 리스트 (토글 가능) - 간소화된 2컬럼 */}
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

                // 학년별 구성 데이터
                const gradeData = cohortGradeData[cohortKey]

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

                    {/* 간소화된 확장 영역: 2컬럼만 표시 */}
                    <CollapsibleContent>
                      <div className="bg-muted/20 px-4 py-3 border-t">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {/* 컬럼 1: 등록 전환 추이 */}
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

                          {/* 컬럼 2: 미등록 현황 */}
                          <div>
                            <p className="text-xs text-muted-foreground mb-2 font-medium">미등록 현황</p>
                            {(() => {
                              const isLoading = loadingCohortDetails.has(cohortKey)
                              const testedButNotEnrolled = gradeData
                                ? gradeData.reduce((sum, g) => sum + g.with_test_count, 0)
                                : null
                              const notTestedNotEnrolled = gradeData
                                ? gradeData.reduce((sum, g) => sum + g.without_test_count, 0)
                                : null

                              if (isLoading) {
                                return (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span className="text-xs">로딩중...</span>
                                  </div>
                                )
                              }

                              return (
                                <div className="space-y-1.5 text-xs">
                                  <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">총 미등록</span>
                                    <span className="font-semibold text-amber-600">{notEnrolled}명</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">이탈률</span>
                                    <span className="font-semibold text-red-500">
                                      {cohort.total_students > 0 ? Math.round((notEnrolled / cohort.total_students) * 100) : 0}%
                                    </span>
                                  </div>
                                  {testedButNotEnrolled !== null && (
                                    <div className="flex justify-between items-center pt-1 border-t">
                                      <span className="text-muted-foreground">테스트 후 이탈</span>
                                      <span className="font-medium text-amber-500">{testedButNotEnrolled}명</span>
                                    </div>
                                  )}
                                  {notTestedNotEnrolled !== null && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-muted-foreground">테스트 없이 이탈</span>
                                      <span className="font-medium text-gray-500">{notTestedNotEnrolled}명</span>
                                    </div>
                                  )}
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
    </div>
  )
}
