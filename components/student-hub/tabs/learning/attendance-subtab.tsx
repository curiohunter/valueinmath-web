"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, CalendarCheck, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface AttendanceRecord {
  id: string
  student_id: string
  class_id: string | null
  attendance_date: string
  status: string
  check_in_at: string | null
  check_out_at: string | null
  absence_reason: string | null
  is_makeup: boolean
  class_name: string | null
  created_at: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  present: { label: "출석", color: "bg-green-50 text-green-700 border-green-200" },
  late: { label: "지각", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  absent: { label: "결석", color: "bg-red-50 text-red-700 border-red-200" },
  early_leave: { label: "조퇴", color: "bg-orange-50 text-orange-700 border-orange-200" },
  pending: { label: "대기", color: "bg-gray-50 text-gray-500 border-gray-200" },
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "-"
  const d = new Date(dateStr)
  return d.toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" })
}

export function AttendanceSubTab({ studentId }: { studentId: string }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const supabase = createClient()
        const startDate = `${year}-${String(month).padStart(2, "0")}-01`
        const endMonth = month === 12 ? 1 : month + 1
        const endYear = month === 12 ? year + 1 : year
        const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`

        const { data, error } = await supabase
          .from("attendances")
          .select("*, classes(name)")
          .eq("student_id", studentId)
          .gte("attendance_date", startDate)
          .lt("attendance_date", endDate)
          .order("attendance_date", { ascending: false })

        if (error) throw error

        setRecords(
          (data || []).map((row: any) => ({
            id: row.id,
            student_id: row.student_id,
            class_id: row.class_id,
            attendance_date: row.attendance_date,
            status: row.status,
            check_in_at: row.check_in_at,
            check_out_at: row.check_out_at,
            absence_reason: row.absence_reason,
            is_makeup: row.is_makeup || false,
            class_name: row.classes?.name || null,
            created_at: row.created_at,
          }))
        )
      } catch (error) {
        console.error("Failed to load attendance:", error)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [studentId, year, month])

  const stats = useMemo(() => {
    const present = records.filter((r) => r.status === "present").length
    const late = records.filter((r) => r.status === "late").length
    const absent = records.filter((r) => r.status === "absent").length
    return { total: records.length, present, late, absent }
  }, [records])

  const handlePrevMonth = () => {
    if (month === 1) {
      setYear(year - 1)
      setMonth(12)
    } else {
      setMonth(month - 1)
    }
  }

  const handleNextMonth = () => {
    if (month === 12) {
      setYear(year + 1)
      setMonth(1)
    } else {
      setMonth(month + 1)
    }
  }

  return (
    <div className="space-y-4">
      {/* Month selector */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">{year}년 {month}월</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card>
          <CardContent className="pt-2 pb-2 text-center">
            <p className="text-[10px] text-muted-foreground">전체</p>
            <p className="text-sm font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-2 pb-2 text-center">
            <p className="text-[10px] text-muted-foreground">출석</p>
            <p className="text-sm font-semibold text-green-600">{stats.present}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-2 pb-2 text-center">
            <p className="text-[10px] text-muted-foreground">지각</p>
            <p className="text-sm font-semibold text-yellow-600">{stats.late}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-2 pb-2 text-center">
            <p className="text-[10px] text-muted-foreground">결석</p>
            <p className="text-sm font-semibold text-red-600">{stats.absent}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-12">
          <CalendarCheck className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">이 달의 출석 기록이 없습니다</p>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">날짜</TableHead>
                <TableHead className="text-xs">반</TableHead>
                <TableHead className="text-xs text-center">상태</TableHead>
                <TableHead className="text-xs">등원</TableHead>
                <TableHead className="text-xs">하원</TableHead>
                <TableHead className="text-xs">비고</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => {
                const statusInfo = STATUS_LABELS[record.status] || STATUS_LABELS.pending
                return (
                  <TableRow key={record.id}>
                    <TableCell className="text-xs">{record.attendance_date}</TableCell>
                    <TableCell className="text-xs">
                      {record.class_name || "-"}
                      {record.is_makeup && (
                        <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">보강</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`text-[10px] ${statusInfo.color}`}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{formatTime(record.check_in_at)}</TableCell>
                    <TableCell className="text-xs">{formatTime(record.check_out_at)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {record.absence_reason || "-"}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
