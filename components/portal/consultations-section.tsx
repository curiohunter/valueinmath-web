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
  const [isOpen, setIsOpen] = useState(false)
  const [showCount, setShowCount] = useState(12)

  // 완료된 정기상담만 필터링
  const filteredConsultations = consultations.filter(
    (consult) => consult.status === "완료" && consult.type === "정기상담"
  )

  const displayedConsultations = filteredConsultations.slice(0, showCount)

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
        {filteredConsultations.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">상담 기록이 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {displayedConsultations.map((consult) => (
              <div key={consult.id} className="border rounded-lg p-4">
                <div className="mb-3">
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(consult.date), "yyyy년 M월 d일", { locale: ko })}
                    {consult.counselor_name && ` • ${consult.counselor_name}`}
                  </div>
                </div>

                {consult.content && (
                  <div className="text-sm bg-muted p-3 rounded">
                    <div className="whitespace-pre-wrap">{consult.content}</div>
                  </div>
                )}
              </div>
            ))}

            {filteredConsultations.length > showCount && (
              <div className="text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCount(prev => prev + 12)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  외 {filteredConsultations.length - showCount}개의 상담 기록 더보기
                </Button>
              </div>
            )}
            {showCount > 12 && showCount >= filteredConsultations.length && (
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
