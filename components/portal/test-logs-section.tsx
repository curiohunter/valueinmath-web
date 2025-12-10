"use client"

import { useState } from "react"
import { TestLogItem } from "@/types/portal"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { Button } from "@/components/ui/button"

interface TestLogsSectionProps {
  logs: TestLogItem[]
}

const getScoreColor = (score: number | null) => {
  if (score === null) return "text-muted-foreground"
  if (score >= 90) return "text-green-600 font-bold"
  if (score >= 80) return "text-blue-600 font-semibold"
  if (score >= 70) return "text-orange-600"
  return "text-red-600"
}

export function TestLogsSection({ logs }: TestLogsSectionProps) {
  const [showCount, setShowCount] = useState(12)

  const displayedLogs = logs.slice(0, showCount)

  if (logs.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        테스트 기록이 없습니다.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {displayedLogs.map((log) => (
        <div key={log.id} className="border rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{log.test || "테스트"}</h3>
                {log.test_type && (
                  <span className="text-xs bg-muted px-2 py-1 rounded">
                    {log.test_type}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {log.class_name || "수업"} •{" "}
                {log.date
                  ? format(new Date(log.date), "M월 d일", { locale: ko })
                  : "날짜 미정"}
              </p>
            </div>
            <div className="text-right">
              <div className={`text-2xl ${getScoreColor(log.test_score)}`}>
                {log.test_score !== null ? `${log.test_score}점` : "-"}
              </div>
            </div>
          </div>

          {log.note && (
            <div className="text-sm bg-muted p-2 rounded mt-2">{log.note}</div>
          )}
        </div>
      ))}

      {logs.length > showCount && (
        <div className="text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCount((prev) => prev + 12)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            외 {logs.length - showCount}개의 테스트 기록 더보기
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
  )
}
