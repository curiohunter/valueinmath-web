"use client"

import { useState } from "react"
import { ConsultationItem } from "@/types/portal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ConsultationsSectionProps {
  consultations: ConsultationItem[]
}

const statusColors = {
  예정: "bg-blue-100 text-blue-800",
  완료: "bg-green-100 text-green-800",
  취소: "bg-red-100 text-red-800",
}

export function ConsultationsSection({ consultations }: ConsultationsSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <Card>
      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronDown className="h-5 w-5 -rotate-90" />}
          </Button>
          <CardTitle>상담 기록</CardTitle>
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent>
        {consultations.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">상담 기록이 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {consultations.slice(0, 10).map((consult) => (
              <div key={consult.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{consult.type}</h3>
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {consult.method}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          statusColors[consult.status as keyof typeof statusColors] ||
                          "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {consult.status}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(consult.date), "yyyy년 M월 d일", { locale: ko })}
                      {consult.counselor_name && ` • ${consult.counselor_name}`}
                    </div>
                  </div>
                </div>

                {consult.content && (
                  <div className="text-sm bg-muted p-3 rounded mb-2">
                    <div className="font-medium mb-1">상담 내용</div>
                    <div className="whitespace-pre-wrap">{consult.content}</div>
                  </div>
                )}

                {consult.next_action && (
                  <div className="text-sm border-l-2 border-primary pl-3 py-1">
                    <div className="font-medium text-primary">다음 조치</div>
                    <div className="text-muted-foreground">{consult.next_action}</div>
                    {consult.next_date && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(consult.next_date), "M월 d일 예정", { locale: ko })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {consultations.length > 10 && (
              <p className="text-center text-sm text-muted-foreground">
                외 {consultations.length - 10}개의 상담 기록
              </p>
            )}
          </div>
        )}
        </CardContent>
      )}
    </Card>
  )
}
