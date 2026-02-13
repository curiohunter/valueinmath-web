"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, BookOpen, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface DailyWorkRecord {
  id: string
  mathflat_student_id: string
  work_date: string
  title: string | null
  subtitle: string | null
  chapter: string | null
  page: string | null
  assigned_count: number
  correct_count: number
  wrong_count: number
  correct_rate: number | null
  work_type: string | null
  created_at: string
}

export function DailyWorkSubTab({ studentId }: { studentId: string }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [records, setRecords] = useState<DailyWorkRecord[]>([])
  const [mathflatStudentId, setMathflatStudentId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadMathflatId = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("students")
          .select("mathflat_student_id")
          .eq("id", studentId)
          .single()

        if (error) throw error
        setMathflatStudentId(data?.mathflat_student_id || null)
      } catch (error) {
        console.error("Failed to get mathflat_student_id:", error)
        setMathflatStudentId(null)
      }
    }
    loadMathflatId()
  }, [studentId])

  useEffect(() => {
    if (!mathflatStudentId) {
      setRecords([])
      setIsLoading(false)
      return
    }

    const load = async () => {
      setIsLoading(true)
      try {
        const supabase = createClient()
        const startDate = `${year}-${String(month).padStart(2, "0")}-01`
        const endMonth = month === 12 ? 1 : month + 1
        const endYear = month === 12 ? year + 1 : year
        const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`

        const { data, error } = await supabase
          .from("mathflat_daily_work")
          .select("*")
          .eq("mathflat_student_id", mathflatStudentId)
          .gte("work_date", startDate)
          .lt("work_date", endDate)
          .order("work_date", { ascending: false })

        if (error) throw error
        setRecords(data || [])
      } catch (error) {
        console.error("Failed to load daily work:", error)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [mathflatStudentId, year, month])

  const stats = useMemo(() => {
    const totalProblems = records.reduce((sum, r) => sum + (r.assigned_count || 0), 0)
    const totalCorrect = records.reduce((sum, r) => sum + (r.correct_count || 0), 0)
    const avgAccuracy = totalProblems > 0 ? Math.round((totalCorrect / totalProblems) * 100) : 0
    return { days: records.length, totalProblems, totalCorrect, avgAccuracy }
  }, [records])

  const handlePrevMonth = () => {
    if (month === 1) { setYear(year - 1); setMonth(12) }
    else { setMonth(month - 1) }
  }

  const handleNextMonth = () => {
    if (month === 12) { setYear(year + 1); setMonth(1) }
    else { setMonth(month + 1) }
  }

  if (!mathflatStudentId && !isLoading) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">학습 데이터 연동 정보가 없습니다</p>
      </div>
    )
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
            <p className="text-[10px] text-muted-foreground">학습일</p>
            <p className="text-sm font-semibold">{stats.days}일</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-2 pb-2 text-center">
            <p className="text-[10px] text-muted-foreground">총 문항</p>
            <p className="text-sm font-semibold">{stats.totalProblems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-2 pb-2 text-center">
            <p className="text-[10px] text-muted-foreground">정답</p>
            <p className="text-sm font-semibold text-green-600">{stats.totalCorrect}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-2 pb-2 text-center">
            <p className="text-[10px] text-muted-foreground">정답률</p>
            <p className="text-sm font-semibold">{stats.avgAccuracy}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">이 달의 학습 기록이 없습니다</p>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">날짜</TableHead>
                <TableHead className="text-xs">교재/단원</TableHead>
                <TableHead className="text-xs text-center">문항</TableHead>
                <TableHead className="text-xs text-center">정답</TableHead>
                <TableHead className="text-xs text-center">오답</TableHead>
                <TableHead className="text-xs text-center">정답률</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="text-xs">{record.work_date}</TableCell>
                  <TableCell className="text-xs truncate max-w-[150px]">
                    <div>{record.title || "-"}</div>
                    {record.page && (
                      <div className="text-muted-foreground text-[10px]">p.{record.page}</div>
                    )}
                    {record.chapter && (
                      <div className="text-muted-foreground text-[10px]">{record.chapter}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-center">{record.assigned_count}</TableCell>
                  <TableCell className="text-xs text-center text-green-600">{record.correct_count}</TableCell>
                  <TableCell className="text-xs text-center text-red-600">{record.wrong_count}</TableCell>
                  <TableCell className="text-xs text-center">
                    {record.correct_rate !== null
                      ? `${record.correct_rate}%`
                      : record.assigned_count > 0
                        ? `${Math.round((record.correct_count / record.assigned_count) * 100)}%`
                        : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
