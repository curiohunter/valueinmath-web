"use client"

import { useState, useEffect } from "react"
import AnalyticsTabs from "@/components/analytics/AnalyticsTabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, AlertTriangle, TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { RISK_COLORS, type RiskLevel, type ScoreTrend } from "@/types/b2b-saas"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"

interface RiskScoreWithStudent {
  id: string
  student_id: string
  student_name: string
  class_name: string | null
  attendance_score: number
  achievement_score: number
  interaction_score: number
  sentiment_score: number
  total_risk_score: number
  risk_level: RiskLevel
  score_trend: ScoreTrend
  score_change: number | null
  last_calculated_at: string
}

interface RiskDistribution {
  level: RiskLevel
  label: string
  count: number
  color: string
}

export function RiskAnalysisPageClient() {
  const [scores, setScores] = useState<RiskScoreWithStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/risk/scores")
      if (res.ok) {
        const data = await res.json()
        setScores(data.data || [])
      }
    } catch (error) {
      console.error("Failed to load risk scores:", error)
      toast.error("위험 점수를 불러오는데 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const handleCalculate = async () => {
    setCalculating(true)
    try {
      const res = await fetch("/api/risk/calculate", { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        toast.success(data.message)
        await loadData()
      } else {
        const error = await res.json()
        toast.error(error.error || "계산 실패")
      }
    } catch (error) {
      console.error("Failed to calculate risk:", error)
      toast.error("위험 점수 계산에 실패했습니다.")
    } finally {
      setCalculating(false)
    }
  }

  // 위험 분포 계산
  const distribution: RiskDistribution[] = [
    { level: "critical", label: "Critical", count: scores.filter(s => s.risk_level === "critical").length, color: RISK_COLORS.critical.chart },
    { level: "high", label: "High", count: scores.filter(s => s.risk_level === "high").length, color: RISK_COLORS.high.chart },
    { level: "medium", label: "Medium", count: scores.filter(s => s.risk_level === "medium").length, color: RISK_COLORS.medium.chart },
    { level: "low", label: "Low", count: scores.filter(s => s.risk_level === "low").length, color: RISK_COLORS.low.chart },
    { level: "none", label: "None", count: scores.filter(s => s.risk_level === "none").length, color: RISK_COLORS.none.chart },
  ]

  const getTrendIcon = (trend: ScoreTrend) => {
    switch (trend) {
      case "improving":
        return <TrendingDown className="h-4 w-4 text-green-500" />
      case "declining":
      case "critical_decline":
        return <TrendingUp className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-400" />
    }
  }

  const getRiskBadge = (level: RiskLevel) => {
    const colors = RISK_COLORS[level]
    return (
      <Badge className={`${colors.bg} ${colors.text} border-0`}>
        {level.charAt(0).toUpperCase() + level.slice(1)}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">통계 분석</h1>
      <AnalyticsTabs />

      {/* 배치 계산 버튼 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          위험 점수는 1일 1회 자동 계산됩니다. 수동 실행도 가능합니다.
        </p>
        <Button onClick={handleCalculate} disabled={calculating}>
          {calculating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          위험 점수 재계산
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* 위험 분포 요약 (5열 그리드) */}
          <div className="grid grid-cols-5 gap-3">
            {distribution.map((d) => (
              <Card key={d.level} className={RISK_COLORS[d.level].bg}>
                <CardContent className="pt-4 text-center">
                  <p className={`text-3xl font-bold ${RISK_COLORS[d.level].text}`}>
                    {d.count}
                  </p>
                  <p className={`text-sm ${RISK_COLORS[d.level].text}`}>{d.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 위험 분포 차트 */}
            <Card>
              <CardHeader>
                <CardTitle>위험 분포</CardTitle>
                <CardDescription>재원 학생 위험 수준 분포</CardDescription>
              </CardHeader>
              <CardContent>
                {scores.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={distribution.filter(d => d.count > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="label"
                        label={({ label, count }) => `${label}: ${count}`}
                      >
                        {distribution.filter(d => d.count > 0).map((entry) => (
                          <Cell key={entry.level} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center py-20 text-muted-foreground">
                    데이터가 없습니다. 배치 계산을 실행해주세요.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 위험 학생 목록 (Critical + High) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  주의 필요 학생
                </CardTitle>
                <CardDescription>Critical 및 High 위험 학생</CardDescription>
              </CardHeader>
              <CardContent>
                {scores.filter(s => s.risk_level === "critical" || s.risk_level === "high").length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {scores
                      .filter(s => s.risk_level === "critical" || s.risk_level === "high")
                      .sort((a, b) => b.total_risk_score - a.total_risk_score)
                      .map((score) => (
                        <div
                          key={score.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            {getRiskBadge(score.risk_level)}
                            <div>
                              <p className="font-medium">{score.student_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {score.class_name || "반 미지정"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-bold">{score.total_risk_score}점</p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                {getTrendIcon(score.score_trend)}
                                {score.score_change !== null && (
                                  <span>
                                    {score.score_change > 0 ? "+" : ""}
                                    {score.score_change}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    주의 필요 학생이 없습니다.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 전체 학생 위험 점수 테이블 */}
          <Card>
            <CardHeader>
              <CardTitle>전체 학생 위험 점수</CardTitle>
              <CardDescription>
                모든 재원 학생의 4축 위험 점수 (출석, 성적, 참여도, 감정)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scores.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">학생</th>
                        <th className="text-left p-2">반</th>
                        <th className="text-center p-2">출석</th>
                        <th className="text-center p-2">성적</th>
                        <th className="text-center p-2">참여도</th>
                        <th className="text-center p-2">감정</th>
                        <th className="text-center p-2">종합</th>
                        <th className="text-center p-2">위험도</th>
                        <th className="text-center p-2">추세</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scores
                        .sort((a, b) => b.total_risk_score - a.total_risk_score)
                        .map((score) => (
                          <tr key={score.id} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">{score.student_name}</td>
                            <td className="p-2 text-muted-foreground">
                              {score.class_name || "-"}
                            </td>
                            <td className="p-2 text-center">{score.attendance_score}</td>
                            <td className="p-2 text-center">{score.achievement_score}</td>
                            <td className="p-2 text-center">{score.interaction_score}</td>
                            <td className="p-2 text-center">{score.sentiment_score}</td>
                            <td className="p-2 text-center font-bold">{score.total_risk_score}</td>
                            <td className="p-2 text-center">{getRiskBadge(score.risk_level)}</td>
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {getTrendIcon(score.score_trend)}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  위험 점수 데이터가 없습니다. 배치 계산을 실행해주세요.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
