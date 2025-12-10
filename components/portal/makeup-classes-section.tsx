"use client"

import { useState } from "react"
import { MakeupClassItem } from "@/types/portal"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { Button } from "@/components/ui/button"

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
  const [showCount, setShowCount] = useState(12)

  const displayedClasses = classes.slice(0, showCount)

  if (classes.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        보강 수업 기록이 없습니다.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {displayedClasses.map((cls) => (
        <div key={cls.id} className="border rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">{cls.class_name || "수업"}</h3>
                <span className="text-xs bg-violet-100 text-violet-800 px-2 py-1 rounded font-medium">
                  {cls.makeup_type === "결석보강" ? "결석보강" : "추가수업"}
                </span>
              </div>
              <div className="text-sm text-muted-foreground mt-1 space-y-1">
                {cls.absence_date && (
                  <div>
                    <span className="font-medium">결석일:</span>{" "}
                    {format(new Date(cls.absence_date), "M월 d일", {
                      locale: ko,
                    })}
                    {cls.absence_reason && (
                      <span className="ml-2">({cls.absence_reason})</span>
                    )}
                  </div>
                )}
                {cls.makeup_date && (
                  <div>
                    <span className="font-medium">보강일:</span>{" "}
                    {format(new Date(cls.makeup_date), "M월 d일", {
                      locale: ko,
                    })}
                  </div>
                )}
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                statusColors[cls.status as keyof typeof statusColors] ||
                "bg-gray-100 text-gray-800"
              }`}
            >
              {statusLabels[cls.status as keyof typeof statusLabels] ||
                cls.status}
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

      {classes.length > showCount && (
        <div className="text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCount((prev) => prev + 12)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            외 {classes.length - showCount}개의 보강 수업 기록 더보기
          </Button>
        </div>
      )}
      {showCount > 12 && showCount >= classes.length && (
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
