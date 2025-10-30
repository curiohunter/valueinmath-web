"use client"

import { useState } from "react"
import { StudyLogItem } from "@/types/portal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { ChevronDown, ChevronUp, BookOpen, FileText } from "lucide-react"
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
  const [isOpen, setIsOpen] = useState(true)

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
            {logs.slice(0, 10).map((log) => (
              <div key={log.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{log.class_name || "수업"}</h3>
                    <p className="text-sm text-muted-foreground">
                      {log.date ? format(new Date(log.date), "yyyy년 M월 d일 (E)", { locale: ko }) : "날짜 미정"}
                    </p>
                  </div>
                </div>

                {/* Status badges - 한 줄로 표시 */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* 출석 */}
                  {log.attendance_status && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">출석</span>
                      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border-2 ${scoreColor(log.attendance_status)}`}>
                        {attendanceLabels[log.attendance_status]}
                      </span>
                    </div>
                  )}

                  {/* 숙제 */}
                  {log.homework && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">숙제</span>
                      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border-2 ${scoreColor(log.homework)}`}>
                        {homeworkLabels[log.homework]}
                      </span>
                    </div>
                  )}

                  {/* 집중도 */}
                  {log.focus && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">집중도</span>
                      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border-2 ${scoreColor(log.focus)}`}>
                        {focusLabels[log.focus]}
                      </span>
                    </div>
                  )}
                </div>

                {/* 수업/숙제 교재 정보 */}
                {(log.book1 || log.book2) && (
                  <div className="space-y-2 pt-2 border-t">
                    {log.book1 && (
                      <div className="flex items-start gap-2 text-sm">
                        <BookOpen className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
                        <div>
                          <span className="font-semibold text-blue-700">수업:</span>{" "}
                          <span>{log.book1}</span>
                          {log.book1log && <span className="text-muted-foreground"> - {log.book1log}</span>}
                        </div>
                      </div>
                    )}
                    {log.book2 && (
                      <div className="flex items-start gap-2 text-sm">
                        <FileText className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                        <div>
                          <span className="font-semibold text-green-700">숙제:</span>{" "}
                          <span>{log.book2}</span>
                          {log.book2log && <span className="text-muted-foreground"> - {log.book2log}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Note */}
                {log.note && (
                  <div className="text-sm bg-muted p-3 rounded">
                    <span className="font-medium">특이사항:</span> {log.note}
                  </div>
                )}
              </div>
            ))}

            {logs.length > 10 && (
              <p className="text-center text-sm text-muted-foreground">
                외 {logs.length - 10}개의 학습 일지
              </p>
            )}
          </div>
        )}
        </CardContent>
      )}
    </Card>
  )
}
