"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, History } from "lucide-react"

interface EnrollmentRecord {
  id: string
  student_id: string
  class_id: string | null
  action_type: string
  action_date: string
  class_name_snapshot: string | null
  from_class_name_snapshot: string | null
  to_class_name_snapshot: string | null
  reason: string | null
  notes: string | null
  created_by_name_snapshot: string | null
  created_at: string
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  enrolled: { label: "입반", color: "bg-green-50 text-green-700 border-green-200" },
  transferred: { label: "반이동", color: "bg-blue-50 text-blue-700 border-blue-200" },
  left: { label: "퇴반", color: "bg-red-50 text-red-700 border-red-200" },
  suspended: { label: "휴원", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
}

export function EnrollmentHistorySubTab({ studentId }: { studentId: string }) {
  const [records, setRecords] = useState<EnrollmentRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("class_enrollments_history")
          .select("*")
          .eq("student_id", studentId)
          .order("action_date", { ascending: false })

        if (error) throw error
        setRecords(data || [])
      } catch (error) {
        console.error("Failed to load enrollment history:", error)
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

  if (records.length === 0) {
    return (
      <div className="text-center py-12">
        <History className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">반 이력이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

      <div className="space-y-4">
        {records.map((record) => {
          const actionInfo = ACTION_LABELS[record.action_type] || {
            label: record.action_type,
            color: "bg-gray-50 text-gray-700 border-gray-200",
          }

          const displayName = record.action_type === "transferred"
            ? `${record.from_class_name_snapshot || "?"} → ${record.to_class_name_snapshot || "?"}`
            : record.class_name_snapshot || "알 수 없음"

          return (
            <div key={record.id} className="relative pl-10">
              {/* Timeline dot */}
              <div className="absolute left-[11px] top-2 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />

              <Card>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={actionInfo.color}>
                        {actionInfo.label}
                      </Badge>
                      <span className="text-sm font-medium">{displayName}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {record.action_date?.split("T")[0]}
                    </span>
                  </div>
                  {record.reason && (
                    <p className="text-xs text-muted-foreground mt-1">{record.reason}</p>
                  )}
                  {record.notes && (
                    <p className="text-xs text-muted-foreground mt-1 italic">{record.notes}</p>
                  )}
                  {record.created_by_name_snapshot && (
                    <p className="text-xs text-muted-foreground mt-1">
                      처리자: {record.created_by_name_snapshot}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}
