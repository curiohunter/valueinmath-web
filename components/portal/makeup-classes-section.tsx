import { MakeupClassItem } from "@/types/portal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

interface MakeupClassesSectionProps {
  classes: MakeupClassItem[]
}

const statusColors = {
  scheduled: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
}

const statusLabels = {
  scheduled: "예정",
  completed: "완료",
  cancelled: "취소",
}

export function MakeupClassesSection({ classes }: MakeupClassesSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>보강 수업</CardTitle>
      </CardHeader>
      <CardContent>
        {classes.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">보강 수업 기록이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {classes.slice(0, 10).map((cls) => (
              <div key={cls.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold">{cls.class_name || "수업"}</h3>
                    <div className="text-sm text-muted-foreground mt-1 space-y-1">
                      {cls.absence_date && (
                        <div>
                          <span className="font-medium">결석일:</span>{" "}
                          {format(new Date(cls.absence_date), "M월 d일", { locale: ko })}
                          {cls.absence_reason && (
                            <span className="ml-2">({cls.absence_reason})</span>
                          )}
                        </div>
                      )}
                      {cls.makeup_date && (
                        <div>
                          <span className="font-medium">보강일:</span>{" "}
                          {format(new Date(cls.makeup_date), "M월 d일", { locale: ko })}
                        </div>
                      )}
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      statusColors[cls.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {statusLabels[cls.status as keyof typeof statusLabels] || cls.status}
                  </span>
                </div>

                {cls.content && (
                  <div className="text-sm bg-muted p-2 rounded mb-2">
                    <span className="font-medium">내용:</span> {cls.content}
                  </div>
                )}

                {cls.notes && (
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">비고:</span> {cls.notes}
                  </div>
                )}
              </div>
            ))}

            {classes.length > 10 && (
              <p className="text-center text-sm text-muted-foreground">
                외 {classes.length - 10}개의 보강 수업 기록
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
