"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, RefreshCw } from "lucide-react"

interface MakeupRecord {
  id: string
  student_id: string
  class_id: string | null
  makeup_type: string
  status: string
  makeup_date: string | null
  absence_date: string | null
  absence_reason: string | null
  start_time: string | null
  end_time: string | null
  student_name_snapshot: string | null
  class_name_snapshot: string | null
  content: string | null
  notes: string | null
  class_name: string | null
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  scheduled: { label: "예정", color: "bg-blue-50 text-blue-700 border-blue-200" },
  completed: { label: "완료", color: "bg-green-50 text-green-700 border-green-200" },
  cancelled: { label: "취소", color: "bg-gray-50 text-gray-500 border-gray-200" },
}

const TYPE_LABELS: Record<string, string> = {
  absence: "결석 보강",
  additional: "추가 보강",
}

export function MakeupClassSubTab({ studentId }: { studentId: string }) {
  const [records, setRecords] = useState<MakeupRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("makeup_classes")
          .select("*, classes(name)")
          .eq("student_id", studentId)
          .order("makeup_date", { ascending: false })
          .limit(30)

        if (error) throw error

        setRecords(
          (data || []).map((row: any) => ({
            id: row.id,
            student_id: row.student_id,
            class_id: row.class_id,
            makeup_type: row.makeup_type,
            status: row.status,
            makeup_date: row.makeup_date,
            absence_date: row.absence_date,
            absence_reason: row.absence_reason,
            start_time: row.start_time,
            end_time: row.end_time,
            student_name_snapshot: row.student_name_snapshot,
            class_name_snapshot: row.class_name_snapshot,
            content: row.content,
            notes: row.notes,
            class_name: row.classes?.name || row.class_name_snapshot || null,
          }))
        )
      } catch (error) {
        console.error("Failed to load makeup classes:", error)
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
        <RefreshCw className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">보강 이력이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {records.map((record) => {
        const statusInfo = STATUS_LABELS[record.status] || STATUS_LABELS.scheduled
        return (
          <Card key={record.id}>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={statusInfo.color}>
                    {statusInfo.label}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {TYPE_LABELS[record.makeup_type] || record.makeup_type}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {record.makeup_date || "미정"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {record.class_name && (
                  <div>
                    <span className="text-muted-foreground">반: </span>
                    {record.class_name}
                  </div>
                )}
                {record.absence_date && (
                  <div>
                    <span className="text-muted-foreground">결석일: </span>
                    {record.absence_date}
                  </div>
                )}
                {record.start_time && record.end_time && (
                  <div>
                    <span className="text-muted-foreground">시간: </span>
                    {record.start_time} - {record.end_time}
                  </div>
                )}
                {record.absence_reason && (
                  <div>
                    <span className="text-muted-foreground">사유: </span>
                    {record.absence_reason}
                  </div>
                )}
              </div>

              {record.content && (
                <p className="text-xs mt-2 text-muted-foreground">{record.content}</p>
              )}
              {record.notes && (
                <p className="text-xs mt-1 text-muted-foreground italic">{record.notes}</p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
