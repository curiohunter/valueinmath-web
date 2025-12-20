"use client"

import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Loader2, ChevronDown, ChevronRight, Trophy, Clock, Target, BarChart3 } from "lucide-react"
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

      {/* 전환율 추이 + 상담/등록 건수 + YoY 통합 차트 (올해 vs 작년 비교) */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-muted-foreground">월별 코호트 현황 (최근 12개월, YoY 비교)</h4>
            <div className="flex items-center gap-4 text-xs flex-wrap">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#3b82f6' }}></span>
                <span className="text-muted-foreground">올해 상담</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#93c5fd' }}></span>
                <span className="text-muted-foreground">작년 상담</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#14b8a6' }}></span>
                <span className="text-muted-foreground">올해 등록</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#5eead4' }}></span>
                <span className="text-muted-foreground">작년 등록</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 rounded" style={{ backgroundColor: '#f97316' }}></span>
                <span className="text-muted-foreground">전환율</span>
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 45, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="fullMonth"
                height={60}
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
                        fill={hasYoY ? (isPositive ? '#10b981' : '#ef4444') : '#9ca3af'}
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
                        <div className="flex items-center gap-2">
                          <span style={{ color: '#3b82f6' }}>올해 상담: {data.총원}명</span>
                          {data.prevYear총원 !== null && (
                            <span style={{ color: '#93c5fd' }}>(작년: {data.prevYear총원}명)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span style={{ color: '#14b8a6' }}>올해 등록: {data.등록}명</span>
                          {data.prevYear등록 !== null && (
                            <span style={{ color: '#5eead4' }}>(작년: {data.prevYear등록}명)</span>
                          )}
                        </div>
                        <p style={{ color: '#f97316' }}>전환율: {data.전환율}%</p>
                      </div>
                      {hasYoY && (
                        <div className="mt-2 pt-2 border-t">
                          <p className={isPositive ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                            YoY: {isPositive ? '+' : ''}{yoyChange}%p
                          </p>
                          <p className="text-xs text-muted-foreground">전년 동월 전환율: {data.prevYearRate}%</p>
                        </div>
                      )}
                      {data.isOngoing && (
                        <p className="text-sky-500 text-xs mt-1">진행중</p>
                      )}
                    </div>
                  )
                }}
              />
              {/* 올해 신규 상담 막대 (블루) */}
              <Bar yAxisId="left" dataKey="총원" name="올해 상담" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={16} />
              {/* 작년 신규 상담 막대 (연한 블루) */}
              <Bar yAxisId="left" dataKey="prevYear총원" name="작년 상담" fill="#93c5fd" radius={[3, 3, 0, 0]} maxBarSize={16} />
              {/* 올해 등록 막대 (진한 틸) */}
              <Bar yAxisId="left" dataKey="등록" name="올해 등록" fill="#14b8a6" radius={[3, 3, 0, 0]} maxBarSize={16} />
              {/* 작년 등록 막대 (연한 틸) */}
              <Bar yAxisId="left" dataKey="prevYear등록" name="작년 등록" fill="#5eead4" radius={[3, 3, 0, 0]} maxBarSize={16} />
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

                // 학년별 구성 데이터에서 정확한 테스트 현황 계산
                const gradeData = cohortGradeData[cohortKey]
                const testedButNotEnrolled = gradeData
                  ? gradeData.reduce((sum, g) => sum + g.with_test_count, 0)
                  : null  // 데이터 없으면 null로 표시
                const notTestedNotEnrolled = gradeData
                  ? gradeData.reduce((sum, g) => sum + g.without_test_count, 0)
                  : null

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
                                <span className="font-medium text-amber-600">
                                  {testedButNotEnrolled !== null ? `${testedButNotEnrolled}명` : '-'}
                                </span>
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
                                <span className="font-medium text-gray-500">
                                  {notTestedNotEnrolled !== null ? `${notTestedNotEnrolled}명` : '-'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 미등록 학년별 구성 */}
                          <div>
                            <p className="text-xs text-muted-foreground mb-1 font-medium">미등록 학년별 구성</p>
                            <p className="text-[10px] text-muted-foreground/70 mb-2">(테스트O/테스트X)</p>
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
                            <p className="text-xs text-muted-foreground mb-1 font-medium">등록 학년별 구성</p>
                            <p className="text-[10px] text-muted-foreground/70 mb-2">(즉시/지연)</p>
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
    </div>
  )
}
