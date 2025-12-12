"use client"

import { useState, useEffect } from "react"
import AnalyticsTabs from "@/components/analytics/AnalyticsTabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, TrendingUp, TrendingDown, Users, Calendar, Target } from "lucide-react"
import { toast } from "sonner"
import { FUNNEL_COLORS } from "@/types/b2b-saas"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

interface FunnelMetrics {
  period: string
  consultations: number
  tests: number
  enrollments: number
  consultationToTestRate: number
  testToEnrollmentRate: number
  avgDaysToTest: number
  avgDaysToEnroll: number
}

interface Bottleneck {
  stage: string
  dropOffRate: number
  avgDaysStuck: number
}

export function FunnelAnalysisPageClient() {
  const [period, setPeriod] = useState<string>("3months")
  const [metrics, setMetrics] = useState<FunnelMetrics | null>(null)
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [period])

  const loadData = async () => {
    setLoading(true)
    try {
      const [metricsRes, bottlenecksRes] = await Promise.all([
        fetch(`/api/funnel/metrics?period=${period}`),
        fetch("/api/funnel/bottlenecks"),
      ])

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json()
        setMetrics(metricsData.data)
      }

      if (bottlenecksRes.ok) {
        const bottlenecksData = await bottlenecksRes.json()
        setBottlenecks(bottlenecksData.data)
      }
    } catch (error) {
      console.error("Failed to load funnel data:", error)
      toast.error("퍼널 데이터를 불러오는데 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  // 퍼널 차트 데이터
  const funnelChartData = metrics
    ? [
        { stage: "상담", count: metrics.consultations, fill: FUNNEL_COLORS.consultation },
        { stage: "테스트", count: metrics.tests, fill: FUNNEL_COLORS.test },
        { stage: "등록", count: metrics.enrollments, fill: FUNNEL_COLORS.enrolled },
      ]
    : []

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">통계 분석</h1>
      <AnalyticsTabs />

      {/* 기간 선택 */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">분석 기간:</span>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1month">최근 1개월</SelectItem>
            <SelectItem value="3months">최근 3개월</SelectItem>
            <SelectItem value="6months">최근 6개월</SelectItem>
            <SelectItem value="1year">최근 1년</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* 전환율 요약 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  상담 수
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.consultations || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  상담→테스트
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.consultationToTestRate.toFixed(1) || 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  평균 {metrics?.avgDaysToTest || 0}일 소요
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  테스트→등록
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.testToEnrollmentRate.toFixed(1) || 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  평균 {metrics?.avgDaysToEnroll || 0}일 소요
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  신규 등록
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.enrollments || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* 퍼널 차트 */}
          <Card>
            <CardHeader>
              <CardTitle>리드 퍼널</CardTitle>
              <CardDescription>
                {period === "1month"
                  ? "최근 1개월"
                  : period === "3months"
                  ? "최근 3개월"
                  : period === "6months"
                  ? "최근 6개월"
                  : "최근 1년"}{" "}
                기준
              </CardDescription>
            </CardHeader>
            <CardContent>
              {funnelChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={funnelChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="stage" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {funnelChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center py-20 text-muted-foreground">
                  데이터가 없습니다.
                </div>
              )}
            </CardContent>
          </Card>

          {/* 병목 구간 분석 */}
          <Card>
            <CardHeader>
              <CardTitle>병목 구간 분석</CardTitle>
              <CardDescription>이탈률이 높은 단계부터 정렬됩니다.</CardDescription>
            </CardHeader>
            <CardContent>
              {bottlenecks.length > 0 ? (
                <div className="space-y-4">
                  {bottlenecks.map((bottleneck, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            bottleneck.dropOffRate > 50
                              ? "destructive"
                              : bottleneck.dropOffRate > 30
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {index + 1}
                        </Badge>
                        <div>
                          <p className="font-medium">{bottleneck.stage}</p>
                          <p className="text-sm text-muted-foreground">
                            평균 체류: {bottleneck.avgDaysStuck}일
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-lg font-bold ${
                            bottleneck.dropOffRate > 50
                              ? "text-red-500"
                              : bottleneck.dropOffRate > 30
                              ? "text-amber-500"
                              : "text-green-500"
                          }`}
                        >
                          {bottleneck.dropOffRate}%
                        </div>
                        <p className="text-xs text-muted-foreground">이탈률</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  병목 분석 데이터가 없습니다.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
