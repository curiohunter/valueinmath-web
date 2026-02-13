"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, MessageSquare } from "lucide-react"

interface Consultation {
  id: string
  student_id: string
  type: string | null
  method: string | null
  date: string | null
  status: string | null
  content: string | null
  next_action: string | null
  next_date: string | null
  student_name_snapshot: string | null
  counselor_name_snapshot: string | null
  outcome: string | null
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  "상담중": "bg-blue-50 text-blue-700 border-blue-200",
  "완료": "bg-green-50 text-green-700 border-green-200",
  "보류": "bg-yellow-50 text-yellow-700 border-yellow-200",
  "취소": "bg-gray-50 text-gray-500 border-gray-200",
}

export function ConsultationHistorySubTab({ studentId }: { studentId: string }) {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("consultations")
          .select("*")
          .eq("student_id", studentId)
          .order("date", { ascending: false })

        if (error) throw error
        setConsultations(data || [])
      } catch (error) {
        console.error("Failed to load consultations:", error)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [studentId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (consultations.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">상담 이력이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {consultations.map((consultation) => (
        <Card key={consultation.id}>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {consultation.status && (
                  <Badge variant="outline" className={`text-xs ${STATUS_COLORS[consultation.status] || ""}`}>
                    {consultation.status}
                  </Badge>
                )}
                {consultation.type && (
                  <Badge variant="secondary" className="text-xs">
                    {consultation.type}
                  </Badge>
                )}
                {consultation.method && (
                  <Badge variant="outline" className="text-xs">
                    {consultation.method}
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {consultation.date?.split("T")[0] || consultation.created_at?.split("T")[0]}
              </span>
            </div>
            {consultation.content && (
              <p className="text-sm whitespace-pre-wrap">{consultation.content}</p>
            )}
            {consultation.outcome && (
              <div className="mt-2 text-xs">
                <span className="text-muted-foreground">결과: </span>
                <span>{consultation.outcome}</span>
              </div>
            )}
            {consultation.next_action && (
              <div className="mt-1 text-xs">
                <span className="text-muted-foreground">다음 조치: </span>
                <span>{consultation.next_action}</span>
                {consultation.next_date && (
                  <span className="text-muted-foreground ml-1">
                    ({consultation.next_date.split("T")[0]})
                  </span>
                )}
              </div>
            )}
            {consultation.counselor_name_snapshot && (
              <div className="mt-2 text-xs text-muted-foreground">
                상담자: {consultation.counselor_name_snapshot}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
