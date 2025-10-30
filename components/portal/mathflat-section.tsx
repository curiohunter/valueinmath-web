"use client"

import { useState } from "react"
import { MathflatRecordItem } from "@/types/portal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { Target, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MathflatSectionProps {
  records: MathflatRecordItem[]
}

const getAccuracyColor = (rate: number | null) => {
  if (rate === null) return "text-muted-foreground"
  if (rate >= 90) return "text-green-600 font-bold"
  if (rate >= 80) return "text-blue-600 font-semibold"
  if (rate >= 70) return "text-orange-600"
  return "text-red-600"
}

export function MathflatSection({ records }: MathflatSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  // Calculate totals
  const totalProblems = records.reduce((sum, r) => sum + (r.problem_solved || 0), 0)
  const totalCorrect = records.reduce((sum, r) => sum + (r.correct_count || 0), 0)
  const totalWrong = records.reduce((sum, r) => sum + (r.wrong_count || 0), 0)
  const overallAccuracy = totalProblems > 0 ? (totalCorrect / totalProblems) * 100 : 0

  return (
    <Card>
      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronDown className="h-5 w-5 -rotate-90" />}
          </Button>
          <Target className="w-5 h-5" />
          <CardTitle>매쓰플랫 학습</CardTitle>
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent>
        {records.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">매쓰플랫 학습 기록이 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {/* Overall Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">총 문제 수</div>
                <div className="text-2xl font-bold">{totalProblems}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">정답</div>
                <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
                  <CheckCircle className="w-5 h-5" />
                  {totalCorrect}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">오답</div>
                <div className="text-2xl font-bold text-red-600 flex items-center justify-center gap-1">
                  <XCircle className="w-5 h-5" />
                  {totalWrong}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">전체 정답률</div>
                <div className={`text-2xl font-bold ${getAccuracyColor(overallAccuracy)}`}>
                  {overallAccuracy.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Individual Records */}
            <div className="space-y-3">
              {records.slice(0, 15).map((record) => (
                <div key={record.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{record.book_title || "매쓰플랫"}</h3>
                        {record.mathflat_type && (
                          <span className="text-xs bg-muted px-2 py-1 rounded">
                            {record.mathflat_type}
                          </span>
                        )}
                      </div>
                      {record.event_date && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(new Date(record.event_date), "M월 d일", { locale: ko })}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`text-xl ${getAccuracyColor(record.correct_rate)}`}>
                        {record.correct_rate !== null ? `${record.correct_rate}%` : "-"}
                      </div>
                      <div className="text-xs text-muted-foreground">정답률</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">문제 수</span>
                      <div className="font-semibold mt-1">{record.problem_solved || 0}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">정답</span>
                      <div className="font-semibold text-green-600 mt-1">
                        {record.correct_count || 0}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">오답</span>
                      <div className="font-semibold text-red-600 mt-1">
                        {record.wrong_count || 0}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {records.length > 15 && (
                <p className="text-center text-sm text-muted-foreground">
                  외 {records.length - 15}개의 학습 기록
                </p>
              )}
            </div>
          </div>
        )}
        </CardContent>
      )}
    </Card>
  )
}
