"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MonthlyAggregation, MonthlyMathflatStats } from "@/types/portal"
import { MetricTrend, AlertLevel } from "@/types/learning"
import {
  getAlertLevel,
  calculateTrend,
  calculateAttendanceRate,
} from "@/lib/alert-thresholds"
import {
  CalendarCheck,
  BookCheck,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface LearningDashboardProps {
  monthly_aggregations: MonthlyAggregation[]
  monthly_mathflat_stats: MonthlyMathflatStats[]
}

// 점수 라벨 (StudyLogTable.tsx 참고)
const attendanceLabels: Record<number, string> = {
  5: "출석",
  4: "지각",
  3: "조퇴",
  2: "보강",
  1: "결석",
}

// 점수 색상 함수
const scoreColor = (score: number) => {
  if (score >= 4.5) return "text-green-600"
  if (score >= 3.5) return "text-blue-600"
  if (score >= 2.5) return "text-yellow-600"
  if (score >= 1.5) return "text-orange-600"
  return "text-red-600"
}

// 알림 레벨별 스타일
const alertStyles: Record<AlertLevel, { badge: string; border: string }> = {
  normal: { badge: "", border: "" },
  warning: {
    badge: "bg-yellow-100 text-yellow-800 border-yellow-300",
    border: "border-yellow-400",
  },
  critical: {
    badge: "bg-red-100 text-red-800 border-red-300",
    border: "border-red-400",
  },
}

// 트렌드 아이콘 컴포넌트
function TrendIndicator({
  trend,
  showValue = true,
  isPercentage = false,
}: {
  trend: MetricTrend
  showValue?: boolean
  isPercentage?: boolean
}) {
  if (trend.direction === "neutral" && trend.value === 0) {
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Minus className="h-3 w-3" />
        {showValue && "비교 불가"}
      </span>
    )
  }

  const isUp = trend.direction === "up"
  const Icon = isUp ? TrendingUp : trend.direction === "down" ? TrendingDown : Minus
  const colorClass = isUp ? "text-green-600" : trend.direction === "down" ? "text-red-600" : "text-muted-foreground"

  return (
    <span className={cn("text-xs flex items-center gap-1", colorClass)}>
      <Icon className="h-3 w-3" />
      {showValue && (
        <span>
          {isUp ? "+" : trend.direction === "down" ? "-" : ""}
          {isPercentage
            ? `${trend.value.toFixed(1)}%p`
            : trend.value.toFixed(1)}
        </span>
      )}
    </span>
  )
}

// 알림 배지 컴포넌트
function AlertBadge({ level }: { level: AlertLevel }) {
  if (level === "normal") return null

  return (
    <Badge
      variant="outline"
      className={cn("text-xs px-1.5 py-0", alertStyles[level].badge)}
    >
      <AlertTriangle className="h-3 w-3 mr-1" />
      {level === "warning" ? "주의" : "조치 필요"}
    </Badge>
  )
}

export function LearningDashboard({
  monthly_aggregations,
  monthly_mathflat_stats,
}: LearningDashboardProps) {
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0)

  // 현재 월 및 전월 데이터
  const currentMonth = monthly_aggregations[selectedMonthIndex]
  const previousMonth = monthly_aggregations[selectedMonthIndex + 1] || null

  // 매쓰플랫 통계
  const currentMathflat = useMemo(() => {
    return (
      monthly_mathflat_stats[selectedMonthIndex]?.stats || {
        textbook_accuracy: 0,
        textbook_problems: 0,
        worksheet_accuracy: 0,
        worksheet_problems: 0,
        challenge_accuracy: 0,
        challenge_problems: 0,
      }
    )
  }, [monthly_mathflat_stats, selectedMonthIndex])

  const previousMathflat = useMemo(() => {
    return monthly_mathflat_stats[selectedMonthIndex + 1]?.stats || null
  }, [monthly_mathflat_stats, selectedMonthIndex])

  // 트렌드 및 알림 계산
  const metrics = useMemo(() => {
    if (!currentMonth) return null

    // 출석률 계산
    const currentAttendanceRate = calculateAttendanceRate(
      currentMonth.attendance_count_5,
      currentMonth.attendance_count_4,
      currentMonth.attendance_count_3,
      currentMonth.attendance_count_2,
      currentMonth.attendance_count_1
    )
    const previousAttendanceRate = previousMonth
      ? calculateAttendanceRate(
          previousMonth.attendance_count_5,
          previousMonth.attendance_count_4,
          previousMonth.attendance_count_3,
          previousMonth.attendance_count_2,
          previousMonth.attendance_count_1
        )
      : null

    // 매쓰플랫 평균 정답률
    const currentMathflatAvg =
      currentMathflat.textbook_problems +
        currentMathflat.worksheet_problems +
        currentMathflat.challenge_problems >
      0
        ? (currentMathflat.textbook_accuracy +
            currentMathflat.worksheet_accuracy +
            currentMathflat.challenge_accuracy) /
          3
        : 0

    const previousMathflatAvg = previousMathflat
      ? previousMathflat.textbook_problems +
          previousMathflat.worksheet_problems +
          previousMathflat.challenge_problems >
        0
        ? (previousMathflat.textbook_accuracy +
            previousMathflat.worksheet_accuracy +
            previousMathflat.challenge_accuracy) /
          3
        : null
      : null

    // 출석 알림 메시지 생성
    const attendanceWarnings: string[] = []
    const attendancePraise: string[] = []

    if (currentMonth.attendance_count_1 >= 3) {
      attendanceWarnings.push("결석이 3회 이상입니다. 출석에 신경 써주세요.")
    }
    if (currentMonth.attendance_count_4 >= 3) {
      attendanceWarnings.push("지각이 3회 이상입니다. 출석에 신경 써주세요.")
    }

    // 결석(1)이 0이면 칭찬 (보강은 상관없음)
    if (currentMonth.attendance_count_1 === 0 && currentMonth.total_study_days > 0) {
      attendancePraise.push("이번 달 결석 없이 잘 출석했어요! 훌륭해요! 👏")
    }

    // 매쓰플랫 알림 메시지 생성
    const mathflatTips: string[] = []
    const textbookAccuracy = currentMathflat.textbook_accuracy
    const worksheetAccuracy = currentMathflat.worksheet_accuracy
    const challengeProblems = currentMathflat.challenge_problems

    // 교재 대비 학습지 정답률 15% 이상 차이
    if (
      currentMathflat.textbook_problems > 0 &&
      currentMathflat.worksheet_problems > 0 &&
      Math.abs(textbookAccuracy - worksheetAccuracy) >= 15
    ) {
      mathflatTips.push("교재와 학습지 정답률 차이가 큽니다. 챌린지 학습을 적극 활용해보세요.")
    }

    // 교재 정답률 55% 이하
    if (currentMathflat.textbook_problems > 0 && textbookAccuracy <= 55) {
      mathflatTips.push("교재 정답률이 낮습니다. 교재 난이도가 적절한지 확인해보세요.")
    }

    // 챌린지 문제 수 10문제 미만
    if (challengeProblems < 10) {
      mathflatTips.push("챌린지로 복습을 꾸준히 하면 좋습니다.")
    }

    return {
      homework: {
        value: currentMonth.homework_avg,
        trend: calculateTrend(
          currentMonth.homework_avg,
          previousMonth?.homework_avg ?? null
        ),
        alert: getAlertLevel("homework", currentMonth.homework_avg),
      },
      focus: {
        value: currentMonth.focus_avg,
        trend: calculateTrend(
          currentMonth.focus_avg,
          previousMonth?.focus_avg ?? null
        ),
        alert: getAlertLevel("focus", currentMonth.focus_avg),
      },
      attendance: {
        rate: currentAttendanceRate,
        alert: attendanceWarnings.length > 0 ? "warning" as AlertLevel : "normal" as AlertLevel,
        counts: {
          5: currentMonth.attendance_count_5,
          4: currentMonth.attendance_count_4,
          3: currentMonth.attendance_count_3,
          2: currentMonth.attendance_count_2,
          1: currentMonth.attendance_count_1,
        },
        totalDays: currentMonth.total_study_days,
        warnings: attendanceWarnings,
        praise: attendancePraise,
      },
      mathflat: {
        avgRate: currentMathflatAvg,
        totalProblems: currentMathflat.textbook_problems + currentMathflat.worksheet_problems + currentMathflat.challenge_problems,
        problemsTrend: calculateTrend(
          currentMathflat.textbook_problems + currentMathflat.worksheet_problems + currentMathflat.challenge_problems,
          previousMathflat
            ? previousMathflat.textbook_problems + previousMathflat.worksheet_problems + previousMathflat.challenge_problems
            : null
        ),
        alert: "normal" as AlertLevel,  // 배지 표시하지 않음
        details: currentMathflat,
        tips: mathflatTips,
      },
    }
  }, [currentMonth, previousMonth, currentMathflat, previousMathflat])

  if (monthly_aggregations.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        학습 데이터가 없습니다.
      </div>
    )
  }

  if (!currentMonth || !metrics) {
    return null
  }

  // 출석 횟수 목록 (0회 제외)
  const attendanceCounts = [5, 4, 3, 2, 1]
    .map((score) => ({
      score,
      label: attendanceLabels[score],
      count: metrics.attendance.counts[score as keyof typeof metrics.attendance.counts],
    }))
    .filter((item) => item.count > 0)

  return (
    <div className="w-full space-y-4">
      {/* 헤더: 월 선택 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg font-semibold">
          해당월 학습 현황 - {currentMonth.year}.
          {String(currentMonth.month).padStart(2, "0")}
        </h2>
        <div className="flex gap-2 flex-wrap">
          {monthly_aggregations.slice(0, 6).map((month, index) => (
            <Button
              key={`${month.year}-${month.month}`}
              variant={selectedMonthIndex === index ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedMonthIndex(index)}
            >
              {month.month}월
            </Button>
          ))}
        </div>
      </div>

      {/* 모바일: 2열 그리드 */}
      <div className="md:hidden grid grid-cols-2 gap-3">
        {/* 출석 카드 */}
        <Card
          className={cn(
            "bg-blue-50",
            metrics.attendance.alert !== "normal" &&
              alertStyles[metrics.attendance.alert].border
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
            <CardTitle className="text-xs font-medium">출석</CardTitle>
            <div className="flex items-center gap-1">
              <AlertBadge level={metrics.attendance.alert} />
              <div className="rounded-full p-1.5 bg-blue-100">
                <CalendarCheck className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-1">
              {attendanceCounts.length === 0 ? (
                <p className="text-xs text-muted-foreground">데이터 없음</p>
              ) : (
                attendanceCounts.map((item) => (
                  <div
                    key={item.score}
                    className="flex justify-between items-center text-xs"
                  >
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-semibold">{item.count}회</span>
                  </div>
                ))
              )}
            </div>
            {metrics.attendance.warnings.length > 0 && (
              <div className="mt-2 pt-2 border-t space-y-1">
                {metrics.attendance.warnings.map((warning, idx) => (
                  <p key={idx} className="text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
                    ⚠️ {warning}
                  </p>
                ))}
              </div>
            )}
            {metrics.attendance.praise.length > 0 && (
              <div className="mt-2 pt-2 border-t space-y-1">
                {metrics.attendance.praise.map((msg, idx) => (
                  <p key={idx} className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                    {msg}
                  </p>
                ))}
              </div>
            )}
            <div className="mt-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                총 {metrics.attendance.totalDays}일 학습
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 숙제 카드 */}
        <Card
          className={cn(
            "bg-green-50",
            metrics.homework.alert !== "normal" &&
              alertStyles[metrics.homework.alert].border
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
            <CardTitle className="text-xs font-medium">숙제</CardTitle>
            <div className="flex items-center gap-1">
              <AlertBadge level={metrics.homework.alert} />
              <div className="rounded-full p-1.5 bg-green-100">
                <BookCheck className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className={cn("text-2xl font-bold", scoreColor(metrics.homework.value))}>
              {metrics.homework.value.toFixed(1)}
              <span className="text-base ml-1">점</span>
            </div>
            <div className="mt-2 pt-2 border-t flex justify-between items-center">
              <p className={cn("text-xs", scoreColor(metrics.homework.value))}>
                {metrics.homework.value >= 4
                  ? "매우 양호"
                  : metrics.homework.value >= 3
                  ? "보통"
                  : metrics.homework.value >= 2
                  ? "보강 필요"
                  : "조치 필요"}
              </p>
              <TrendIndicator trend={metrics.homework.trend} />
            </div>
          </CardContent>
        </Card>

        {/* 집중도 카드 */}
        <Card
          className={cn(
            "bg-purple-50",
            metrics.focus.alert !== "normal" &&
              alertStyles[metrics.focus.alert].border
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
            <CardTitle className="text-xs font-medium">집중도</CardTitle>
            <div className="flex items-center gap-1">
              <AlertBadge level={metrics.focus.alert} />
              <div className="rounded-full p-1.5 bg-purple-100">
                <Target className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className={cn("text-2xl font-bold", scoreColor(metrics.focus.value))}>
              {metrics.focus.value.toFixed(1)}
              <span className="text-base ml-1">점</span>
            </div>
            <div className="mt-2 pt-2 border-t flex justify-between items-center">
              <p className={cn("text-xs", scoreColor(metrics.focus.value))}>
                {metrics.focus.value >= 4
                  ? "매우 양호"
                  : metrics.focus.value >= 3
                  ? "보통"
                  : metrics.focus.value >= 2
                  ? "조치 필요"
                  : "집중력 부족"}
              </p>
              <TrendIndicator trend={metrics.focus.trend} />
            </div>
          </CardContent>
        </Card>

        {/* 매쓰플랫 카드 */}
        <Card
          className={cn(
            "bg-orange-50",
            metrics.mathflat.alert !== "normal" &&
              alertStyles[metrics.mathflat.alert].border
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
            <CardTitle className="text-xs font-medium">매쓰플랫</CardTitle>
            <div className="flex items-center gap-1">
              <AlertBadge level={metrics.mathflat.alert} />
              <div className="rounded-full p-1.5 bg-orange-100">
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">교재</span>
                <span className="font-semibold text-orange-600">
                  {metrics.mathflat.details.textbook_accuracy.toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">학습지</span>
                <span className="font-semibold text-orange-600">
                  {metrics.mathflat.details.worksheet_accuracy.toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">챌린지</span>
                <span className="font-semibold text-orange-600">
                  {metrics.mathflat.details.challenge_accuracy.toFixed(0)}%
                </span>
              </div>
            </div>
            {metrics.mathflat.tips.length > 0 && (
              <div className="mt-2 pt-2 border-t space-y-1">
                {metrics.mathflat.tips.map((tip, idx) => (
                  <p key={idx} className="text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
                    💡 {tip}
                  </p>
                ))}
              </div>
            )}
            <div className="mt-2 pt-2 border-t flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                총 {metrics.mathflat.totalProblems}문제
              </p>
              <TrendIndicator trend={metrics.mathflat.problemsTrend} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 태블릿/데스크탑: 4열 그리드 */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 출석 카드 */}
        <Card
          className={cn(
            "bg-blue-50",
            metrics.attendance.alert !== "normal" &&
              alertStyles[metrics.attendance.alert].border
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">출석</CardTitle>
            <div className="flex items-center gap-2">
              <AlertBadge level={metrics.attendance.alert} />
              <div className="rounded-full p-2 bg-blue-100">
                <CalendarCheck className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {attendanceCounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">데이터 없음</p>
              ) : (
                attendanceCounts.map((item) => (
                  <div
                    key={item.score}
                    className="flex justify-between items-center text-sm"
                  >
                    <span className="text-muted-foreground">
                      {item.score}: {item.label}
                    </span>
                    <span className="font-semibold">{item.count}회</span>
                  </div>
                ))
              )}
            </div>
            {metrics.attendance.warnings.length > 0 && (
              <div className="mt-3 pt-3 border-t space-y-1.5">
                {metrics.attendance.warnings.map((warning, idx) => (
                  <p key={idx} className="text-xs text-yellow-700 bg-yellow-50 px-2 py-1.5 rounded">
                    ⚠️ {warning}
                  </p>
                ))}
              </div>
            )}
            {metrics.attendance.praise.length > 0 && (
              <div className="mt-3 pt-3 border-t space-y-1.5">
                {metrics.attendance.praise.map((msg, idx) => (
                  <p key={idx} className="text-xs text-green-700 bg-green-50 px-2 py-1.5 rounded">
                    {msg}
                  </p>
                ))}
              </div>
            )}
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground">
                총 {metrics.attendance.totalDays}일 학습
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 숙제 카드 */}
        <Card
          className={cn(
            "bg-green-50",
            metrics.homework.alert !== "normal" &&
              alertStyles[metrics.homework.alert].border
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">숙제</CardTitle>
            <div className="flex items-center gap-2">
              <AlertBadge level={metrics.homework.alert} />
              <div className="rounded-full p-2 bg-green-100">
                <BookCheck className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className={cn("text-3xl font-bold", scoreColor(metrics.homework.value))}>
                {metrics.homework.value.toFixed(1)}
                <span className="text-xl ml-1">점</span>
              </div>
              <TrendIndicator trend={metrics.homework.trend} />
            </div>
            <div className="mt-3 pt-3 border-t">
              <p className={cn("text-sm", scoreColor(metrics.homework.value))}>
                {metrics.homework.value >= 4
                  ? "매우 양호 (90% 이상 완수)"
                  : metrics.homework.value >= 3
                  ? "보통 (추가 추적 필요)"
                  : metrics.homework.value >= 2
                  ? "주의 필요 (보강 필요)"
                  : "조치 필요"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 집중도 카드 */}
        <Card
          className={cn(
            "bg-purple-50",
            metrics.focus.alert !== "normal" &&
              alertStyles[metrics.focus.alert].border
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">수업 집중도</CardTitle>
            <div className="flex items-center gap-2">
              <AlertBadge level={metrics.focus.alert} />
              <div className="rounded-full p-2 bg-purple-100">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className={cn("text-3xl font-bold", scoreColor(metrics.focus.value))}>
                {metrics.focus.value.toFixed(1)}
                <span className="text-xl ml-1">점</span>
              </div>
              <TrendIndicator trend={metrics.focus.trend} />
            </div>
            <div className="mt-3 pt-3 border-t">
              <p className={cn("text-sm", scoreColor(metrics.focus.value))}>
                {metrics.focus.value >= 4
                  ? "매우 양호 (열의 있고 잘 참여)"
                  : metrics.focus.value >= 3
                  ? "보통 (대체로 잘 참여)"
                  : metrics.focus.value >= 2
                  ? "주의 필요 (조치 필요)"
                  : "집중력 매우 부족"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 매쓰플랫 카드 */}
        <Card
          className={cn(
            "bg-orange-50",
            metrics.mathflat.alert !== "normal" &&
              alertStyles[metrics.mathflat.alert].border
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">매쓰플랫</CardTitle>
            <div className="flex items-center gap-2">
              <AlertBadge level={metrics.mathflat.alert} />
              <div className="rounded-full p-2 bg-orange-100">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">교재</span>
                <span className="font-semibold text-orange-600">
                  {metrics.mathflat.details.textbook_accuracy.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">학습지</span>
                <span className="font-semibold text-orange-600">
                  {metrics.mathflat.details.worksheet_accuracy.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">챌린지</span>
                <span className="font-semibold text-orange-600">
                  {metrics.mathflat.details.challenge_accuracy.toFixed(1)}%
                </span>
              </div>
            </div>
            {metrics.mathflat.tips.length > 0 && (
              <div className="mt-3 pt-3 border-t space-y-1.5">
                {metrics.mathflat.tips.map((tip, idx) => (
                  <p key={idx} className="text-xs text-yellow-700 bg-yellow-50 px-2 py-1.5 rounded">
                    💡 {tip}
                  </p>
                ))}
              </div>
            )}
            <div className="mt-3 pt-3 border-t flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                총 {metrics.mathflat.totalProblems}문제 풀이
              </p>
              <TrendIndicator trend={metrics.mathflat.problemsTrend} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
