"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MonthlyAggregation, MonthlyMathflatStats } from "@/types/portal"
import {
  CalendarCheck,
  BookCheck,
  Target,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface MonthlySummaryCardsProps {
  monthly_aggregations: MonthlyAggregation[]
  monthly_mathflat_stats: MonthlyMathflatStats[]
}

// 점수 라벨 (StudyLogTable.tsx 참고)
const attendanceLabels: Record<number, string> = {
  5: "출석",
  4: "지각",
  3: "조퇴",
  2: "보강",
  1: "결석"
}

// 점수 범위별 설명 (모든 범위 표시)
const getScoreRangeDescriptions = (type: "homework" | "focus") => {
  if (type === "homework") {
    return [
      { range: "4-5점", description: "매우 양호 (90% 이상 완수)", minScore: 4 },
      { range: "3-4점", description: "보통 (추가 추적 필요)", minScore: 3 },
      { range: "2-3점", description: "주의 필요 (보강 필요)", minScore: 2 },
      { range: "1-2점", description: "조치 필요", minScore: 1 },
    ]
  } else {
    return [
      { range: "4-5점", description: "매우 양호 (열의 있고 잘 참여)", minScore: 4 },
      { range: "3-4점", description: "보통 (대체로 잘 참여)", minScore: 3 },
      { range: "2-3점", description: "주의 필요 (조치 필요)", minScore: 2 },
      { range: "1-2점", description: "집중력 매우 부족", minScore: 1 },
    ]
  }
}

// 현재 점수가 해당 범위에 속하는지 확인
const isInRange = (score: number, minScore: number) => {
  if (minScore === 4) return score >= 4
  if (minScore === 3) return score >= 3 && score < 4
  if (minScore === 2) return score >= 2 && score < 3
  return score >= 1 && score < 2
}

// 점수 색상 함수
const scoreColor = (score: number) => {
  if (score >= 4.5) return "text-green-600"
  if (score >= 3.5) return "text-blue-600"
  if (score >= 2.5) return "text-yellow-600"
  if (score >= 1.5) return "text-orange-600"
  return "text-red-600"
}

export function MonthlySummaryCards({
  monthly_aggregations,
  monthly_mathflat_stats,
}: MonthlySummaryCardsProps) {
  // State for selected month index (0 = current month)
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0)

  if (monthly_aggregations.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        학습 데이터가 없습니다.
      </div>
    )
  }

  // Get selected month data
  const currentMonth = monthly_aggregations[selectedMonthIndex]
  const currentMathflatStats = monthly_mathflat_stats[selectedMonthIndex]?.stats || {
    textbook_accuracy: 0,
    textbook_problems: 0,
    worksheet_accuracy: 0,
    worksheet_problems: 0,
    challenge_accuracy: 0,
    challenge_problems: 0,
  }

  // 출석 횟수
  const attendanceCounts = [
    { score: 5, label: attendanceLabels[5], count: currentMonth.attendance_count_5 },
    { score: 4, label: attendanceLabels[4], count: currentMonth.attendance_count_4 },
    { score: 3, label: attendanceLabels[3], count: currentMonth.attendance_count_3 },
    { score: 2, label: attendanceLabels[2], count: currentMonth.attendance_count_2 },
    { score: 1, label: attendanceLabels[1], count: currentMonth.attendance_count_1 },
  ].filter(item => item.count > 0) // 0회는 제외

  // 숙제 평균
  const homeworkAvg = currentMonth.homework_avg

  // 집중도 평균
  const focusAvg = currentMonth.focus_avg

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg font-semibold">
          해당월 학습 현황 - {currentMonth.year}.{String(currentMonth.month).padStart(2, "0")}
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

      {/* Mobile: Vertical stack (2 columns) */}
      <div className="md:hidden grid grid-cols-2 gap-3">
        {/* 1. 출석 카드 */}
        <Card className="bg-blue-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
            <CardTitle className="text-xs font-medium">출석</CardTitle>
            <div className="rounded-full p-1.5 bg-blue-100">
              <CalendarCheck className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-1">
              {attendanceCounts.length === 0 ? (
                <p className="text-xs text-muted-foreground">데이터 없음</p>
              ) : (
                attendanceCounts.map((item) => (
                  <div key={item.score} className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-semibold">{item.count}회</span>
                  </div>
                ))
              )}
            </div>
            <div className="mt-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                총 {currentMonth.total_study_days}일 학습
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 2. 숙제 카드 */}
        <Card className="bg-green-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
            <CardTitle className="text-xs font-medium">숙제</CardTitle>
            <div className="rounded-full p-1.5 bg-green-100">
              <BookCheck className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className={cn("text-2xl font-bold", scoreColor(homeworkAvg))}>
              {homeworkAvg.toFixed(1)}
              <span className="text-base ml-1">점</span>
            </div>
            <div className="mt-2 pt-2 border-t">
              <p className={cn("text-xs", scoreColor(homeworkAvg))}>
                {homeworkAvg >= 4 ? "매우 양호" : homeworkAvg >= 3 ? "추가 추적 필요" : homeworkAvg >= 2 ? "보강 필요" : "조치 필요"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 3. 집중도 카드 */}
        <Card className="bg-purple-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
            <CardTitle className="text-xs font-medium">집중도</CardTitle>
            <div className="rounded-full p-1.5 bg-purple-100">
              <Target className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className={cn("text-2xl font-bold", scoreColor(focusAvg))}>
              {focusAvg.toFixed(1)}
              <span className="text-base ml-1">점</span>
            </div>
            <div className="mt-2 pt-2 border-t">
              <p className={cn("text-xs", scoreColor(focusAvg))}>
                {focusAvg >= 4 ? "매우 양호" : focusAvg >= 3 ? "보통" : focusAvg >= 2 ? "조치 필요" : "집중력 부족"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 4. 매쓰플랫 카드 */}
        <Card className="bg-orange-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
            <CardTitle className="text-xs font-medium">매쓰플랫</CardTitle>
            <div className="rounded-full p-1.5 bg-orange-100">
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">교재</span>
                <span className="font-semibold text-orange-600">
                  {currentMathflatStats.textbook_accuracy.toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">학습지</span>
                <span className="font-semibold text-orange-600">
                  {currentMathflatStats.worksheet_accuracy.toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">챌린지</span>
                <span className="font-semibold text-orange-600">
                  {currentMathflatStats.challenge_accuracy.toFixed(0)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tablet/Desktop: Grid layout */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. 출석 카드 */}
        <Card className="bg-blue-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">출석</CardTitle>
            <div className="rounded-full p-2 bg-blue-100">
              <CalendarCheck className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {attendanceCounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">데이터 없음</p>
              ) : (
                attendanceCounts.map((item) => (
                  <div key={item.score} className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                      {item.score}: {item.label}
                    </span>
                    <span className="font-semibold">{item.count}회</span>
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground">
                총 {currentMonth.total_study_days}일 학습
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 2. 숙제 카드 */}
        <Card className="bg-green-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">숙제</CardTitle>
            <div className="rounded-full p-2 bg-green-100">
              <BookCheck className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-bold", scoreColor(homeworkAvg))}>
              {homeworkAvg.toFixed(1)}
              <span className="text-xl ml-1">점</span>
            </div>
            <div className="mt-3 pt-3 border-t space-y-1">
              {getScoreRangeDescriptions("homework").map((item) => (
                <p
                  key={item.range}
                  className={cn(
                    "text-xs",
                    isInRange(homeworkAvg, item.minScore)
                      ? "font-semibold text-green-700"
                      : "text-muted-foreground"
                  )}
                >
                  {item.range}: {item.description}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 3. 집중도 카드 */}
        <Card className="bg-purple-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">수업 집중도</CardTitle>
            <div className="rounded-full p-2 bg-purple-100">
              <Target className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-bold", scoreColor(focusAvg))}>
              {focusAvg.toFixed(1)}
              <span className="text-xl ml-1">점</span>
            </div>
            <div className="mt-3 pt-3 border-t space-y-1">
              {getScoreRangeDescriptions("focus").map((item) => (
                <p
                  key={item.range}
                  className={cn(
                    "text-xs",
                    isInRange(focusAvg, item.minScore)
                      ? "font-semibold text-purple-700"
                      : "text-muted-foreground"
                  )}
                >
                  {item.range}: {item.description}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 4. 매쓰플랫 카드 */}
        <Card className="bg-orange-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">매쓰플랫</CardTitle>
            <div className="rounded-full p-2 bg-orange-100">
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">교재</span>
                <span className="font-semibold text-orange-600">
                  {currentMathflatStats.textbook_accuracy.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">학습지</span>
                <span className="font-semibold text-orange-600">
                  {currentMathflatStats.worksheet_accuracy.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">챌린지</span>
                <span className="font-semibold text-orange-600">
                  {currentMathflatStats.challenge_accuracy.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground">
                총 {currentMathflatStats.textbook_problems + currentMathflatStats.worksheet_problems + currentMathflatStats.challenge_problems}문제 풀이 (이번 달)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
