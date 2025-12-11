"use client"

import React, { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  ChevronDown,
  BookOpen,
  Users,
  ClipboardCheck,
  Brain,
  Calendar,
  FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { StudentLearningData, StudyLogDetail, TestLogDetail } from "@/types/comment-assistant"

interface StudentMetricsCardProps {
  learningData: StudentLearningData | null
  isLoading?: boolean
}

// 출석/숙제/집중 점수에 따른 색상
function getScoreColor(score: number): string {
  if (score >= 5) return "text-green-600 bg-green-50"
  if (score >= 4) return "text-blue-600 bg-blue-50"
  if (score >= 3) return "text-yellow-600 bg-yellow-50"
  if (score >= 2) return "text-orange-600 bg-orange-50"
  return "text-red-600 bg-red-50"
}

// 테스트 점수에 따른 색상
function getTestScoreColor(score: number): string {
  if (score >= 90) return "text-green-600"
  if (score >= 80) return "text-blue-600"
  if (score >= 70) return "text-yellow-600"
  if (score >= 60) return "text-orange-600"
  return "text-red-600"
}

// 학습일지 한 줄 표시
function StudyLogRow({ log }: { log: StudyLogDetail }) {
  return (
    <div className="flex items-center gap-2 text-xs py-1.5 border-b last:border-b-0">
      <span className="text-muted-foreground w-12 shrink-0">{log.date}</span>
      <Badge variant="outline" className={cn("text-[10px] px-1.5", getScoreColor(log.attendance))}>
        {log.attendanceLabel}
      </Badge>
      <Badge variant="outline" className={cn("text-[10px] px-1.5", getScoreColor(log.homework))}>
        숙제 {log.homework}
      </Badge>
      <Badge variant="outline" className={cn("text-[10px] px-1.5", getScoreColor(log.focus))}>
        집중 {log.focus}
      </Badge>
      {log.classContent && (
        <span className="text-muted-foreground truncate flex-1" title={log.classContent}>
          {log.classContent}
        </span>
      )}
    </div>
  )
}

// 테스트 한 줄 표시
function TestLogRow({ log }: { log: TestLogDetail }) {
  return (
    <div className="flex items-center gap-2 text-xs py-1.5 border-b last:border-b-0">
      <span className="text-muted-foreground w-12 shrink-0">{log.date}</span>
      <Badge variant="outline" className="text-[10px] px-1.5">
        {log.testType}
      </Badge>
      <span className="truncate flex-1">{log.testName}</span>
      <span className={cn("font-medium", getTestScoreColor(log.score))}>
        {log.score}점
      </span>
    </div>
  )
}

// 요약 통계 계산
function calculateSummary(data: StudentLearningData) {
  const { currentMonth, prevMonth } = data
  const logs = currentMonth.studyLogs
  const tests = currentMonth.testLogs

  // 출석률
  const validAttendance = logs.filter(l => l.attendance > 0)
  const attendedDays = validAttendance.filter(l => [5, 4, 2].includes(l.attendance)).length
  const attendanceRate = validAttendance.length > 0
    ? Math.round((attendedDays / validAttendance.length) * 100)
    : 0

  // 숙제 평균
  const validHomework = logs.filter(l => l.homework > 0)
  const homeworkAvg = validHomework.length > 0
    ? (validHomework.reduce((sum, l) => sum + l.homework, 0) / validHomework.length).toFixed(1)
    : "-"

  // 집중도 평균
  const validFocus = logs.filter(l => l.focus > 0)
  const focusAvg = validFocus.length > 0
    ? (validFocus.reduce((sum, l) => sum + l.focus, 0) / validFocus.length).toFixed(1)
    : "-"

  // 테스트 평균
  const validTests = tests.filter(t => t.score > 0)
  const testAvg = validTests.length > 0
    ? Math.round(validTests.reduce((sum, t) => sum + t.score, 0) / validTests.length)
    : 0

  return {
    totalDays: logs.length,
    attendanceRate,
    homeworkAvg,
    focusAvg,
    testCount: tests.length,
    testAvg,
    prevMonth,
  }
}

export function StudentMetricsCard({ learningData, isLoading }: StudentMetricsCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
            학습 데이터 로딩 중...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!learningData || learningData.currentMonth.studyLogs.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">
            학습 데이터가 없습니다
          </p>
        </CardContent>
      </Card>
    )
  }

  const summary = calculateSummary(learningData)
  const { currentMonth, prevMonth } = learningData

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardContent className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
            {/* 요약 헤더 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{summary.totalDays}일</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{summary.attendanceRate}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{summary.homeworkAvg}/5</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Brain className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{summary.focusAvg}/5</span>
                </div>
                {summary.testCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{summary.testAvg}점 ({summary.testCount}회)</span>
                  </div>
                )}
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  isOpen && "rotate-180"
                )}
              />
            </div>

            {/* 이전 달 비교 */}
            {prevMonth && (
              <div className="mt-2 text-xs text-muted-foreground">
                지난달: 출석 {prevMonth.attendanceRate}%, 숙제 {prevMonth.homeworkAvg}/5, 집중 {prevMonth.focusAvg}/5
                {prevMonth.testCount > 0 && `, 테스트 ${prevMonth.testAvgScore}점 (${prevMonth.testCount}회)`}
              </div>
            )}
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 space-y-4">
            {/* 학습일지 상세 */}
            <div>
              <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                학습일지 ({currentMonth.studyLogs.length}건)
              </div>
              <div className="max-h-40 overflow-y-auto rounded border bg-muted/30 px-2">
                {currentMonth.studyLogs.map((log, idx) => (
                  <StudyLogRow key={idx} log={log} />
                ))}
              </div>
            </div>

            {/* 테스트 상세 */}
            {currentMonth.testLogs.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5" />
                  테스트 ({currentMonth.testLogs.length}건)
                </div>
                <div className="max-h-32 overflow-y-auto rounded border bg-muted/30 px-2">
                  {currentMonth.testLogs.map((log, idx) => (
                    <TestLogRow key={idx} log={log} />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
