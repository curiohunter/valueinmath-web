import { TestLogItem } from "@/types/portal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

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
  return (
    <Card>
      <CardHeader>
        <CardTitle>테스트 기록</CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">테스트 기록이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {logs.slice(0, 15).map((log) => (
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
                      {log.date ? format(new Date(log.date), "M월 d일", { locale: ko }) : "날짜 미정"}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl ${getScoreColor(log.test_score)}`}>
                      {log.test_score !== null ? `${log.test_score}점` : "-"}
                    </div>
                  </div>
                </div>

                {log.note && (
                  <div className="text-sm bg-muted p-2 rounded mt-2">
                    {log.note}
                  </div>
                )}
              </div>
            ))}

            {logs.length > 15 && (
              <p className="text-center text-sm text-muted-foreground">
                외 {logs.length - 15}개의 테스트 기록
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
