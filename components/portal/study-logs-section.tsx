"use client"

import { useState } from "react"
import { StudyLogItem } from "@/types/portal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { ChevronDown, ChevronUp, BookOpen, FileText, UserCheck, ClipboardCheck, Target } from "lucide-react"
import { Button } from "@/components/ui/button"

interface StudyLogsSectionProps {
  logs: StudyLogItem[]
}

// 출결 점수 → 텍스트 매핑
const attendanceLabels: Record<number, string> = {
  5: "출석",
  4: "지각",
  3: "조퇴",
  2: "보강",
  1: "결석"
}

// 숙제 점수 → 텍스트 매핑
const homeworkLabels: Record<number, string> = {
  5: "100% 마무리",
  4: "90% 이상",
  3: "추가 추적 필요",
  2: "보강필요",
  1: "결석"
}

// 집중도 점수 → 텍스트 매핑
const focusLabels: Record<number, string> = {
  5: "매우 열의있음",
  4: "대체로 잘참여",
  3: "산만하나 진행가능",
  2: "조치필요",
  1: "결석"
}

// 점수별 색상 매핑 (learning 페이지와 동일)
const scoreColor = (score: number) => {
  switch (score) {
    case 1: return "bg-red-100 text-red-600 border-red-200";
    case 2: return "bg-orange-100 text-orange-600 border-orange-200";
    case 3: return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case 4: return "bg-blue-100 text-blue-600 border-blue-200";
    case 5: return "bg-green-100 text-green-700 border-green-200";
    default: return "bg-gray-100 text-gray-400 border-gray-200";
  }
};

export function StudyLogsSection({ logs }: StudyLogsSectionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showCount, setShowCount] = useState(12)

  const displayedLogs = logs.slice(0, showCount)

  return (
    <Card>
      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronDown className="h-5 w-5 -rotate-90" />}
          </Button>
          <CardTitle>학습 일지</CardTitle>
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent>
        {logs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">학습 일지가 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {displayedLogs.map((log) => (
              <div key={log.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{log.class_name || "수업"}</h3>
                    <p className="text-sm text-muted-foreground">
                      {log.date ? format(new Date(log.date), "yyyy년 M월 d일 (E)", { locale: ko }) : "날짜 미정"}
                    </p>
                  </div>
                </div>

                {/* 테이블 형태 레이아웃 */}
                <div className="grid grid-cols-5 gap-3 text-sm">
                  {/* 출석 컬럼 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-xs font-medium text-green-600">
                      <UserCheck className="w-3 h-3" />
                      <span>출석</span>
                    </div>
                    {log.attendance_status ? (
                      <span className={`inline-flex items-center justify-center w-full px-2 py-1.5 text-xs font-semibold rounded-full border-2 ${scoreColor(log.attendance_status)}`}>
                        {attendanceLabels[log.attendance_status]}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>

                  {/* 숙제 컬럼 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-xs font-medium text-purple-600">
                      <ClipboardCheck className="w-3 h-3" />
                      <span>숙제</span>
                    </div>
                    {log.homework ? (
                      <span className={`inline-flex items-center justify-center w-full px-2 py-1.5 text-xs font-semibold rounded-full border-2 ${scoreColor(log.homework)}`}>
                        {homeworkLabels[log.homework]}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>

                  {/* 집중도 컬럼 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-xs font-medium text-indigo-600">
                      <Target className="w-3 h-3" />
                      <span>집중도</span>
                    </div>
                    {log.focus ? (
                      <span className={`inline-flex items-center justify-center w-full px-2 py-1.5 text-xs font-semibold rounded-full border-2 ${scoreColor(log.focus)}`}>
                        {focusLabels[log.focus]}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>

                  {/* 수업 컬럼 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-xs font-medium text-blue-600">
                      <BookOpen className="w-3 h-3" />
                      <span>수업</span>
                    </div>
                    {log.book1 ? (
                      <div className="text-xs">
                        <div className="font-medium">{log.book1}</div>
                        {log.book1log && <div className="text-muted-foreground mt-0.5">{log.book1log}</div>}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>

                  {/* 숙제 컬럼 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-xs font-medium text-orange-600">
                      <FileText className="w-3 h-3" />
                      <span>숙제</span>
                    </div>
                    {log.book2 ? (
                      <div className="text-xs">
                        <div className="font-medium">{log.book2}</div>
                        {log.book2log && <div className="text-muted-foreground mt-0.5">{log.book2log}</div>}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                </div>

                {/* Note */}
                {log.note && (
                  <div className="text-sm bg-muted p-3 rounded">
                    <span className="font-medium">특이사항:</span> {log.note}
                  </div>
                )}
              </div>
            ))}

            {logs.length > showCount && (
              <div className="text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCount(prev => prev + 12)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  외 {logs.length - showCount}개의 학습 일지 더보기
                </Button>
              </div>
            )}
            {showCount > 12 && showCount >= logs.length && (
              <div className="text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCount(12)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  접기
                </Button>
              </div>
            )}
          </div>
        )}
        </CardContent>
      )}
    </Card>
  )
}
