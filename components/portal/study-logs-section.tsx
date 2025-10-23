import { StudyLogItem } from "@/types/portal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

interface StudyLogsSectionProps {
  logs: StudyLogItem[]
}

const getStatusBadge = (status: number | null) => {
  if (status === null) return <span className="text-muted-foreground">-</span>
  const badges = ["❌", "⭕", "🔺", "⭐", "✨"]
  return <span className="text-lg">{badges[status - 1] || "❓"}</span>
}

export function StudyLogsSection({ logs }: StudyLogsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>학습 일지</CardTitle>
      </CardHeader>
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

                {/* Status badges */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">출석</span>
                    <div className="mt-1">{getStatusBadge(log.attendance_status)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">숙제</span>
                    <div className="mt-1">{getStatusBadge(log.homework)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">집중도</span>
                    <div className="mt-1">{getStatusBadge(log.focus)}</div>
                  </div>
                </div>

                {/* Books and progress */}
                {(log.book1 || log.book2) && (
                  <div className="space-y-2 text-sm">
                    {log.book1 && (
                      <div>
                        <span className="font-medium">교재1:</span>{" "}
                        <span>{log.book1}</span>
                        {log.book1log && <span className="text-muted-foreground"> - {log.book1log}</span>}
                      </div>
                    )}
                    {log.book2 && (
                      <div>
                        <span className="font-medium">교재2:</span>{" "}
                        <span>{log.book2}</span>
                        {log.book2log && <span className="text-muted-foreground"> - {log.book2log}</span>}
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
    </Card>
  )
}
