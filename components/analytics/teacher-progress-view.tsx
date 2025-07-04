"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Calendar, User } from "lucide-react"
import type { Database } from "@/types/database"

interface TeacherProgressViewProps {
  year: number
  month: number
  teacherId?: string | "all"
}

interface TeacherProgress {
  teacherId: string
  teacherName: string
  dailyLogs: Record<string, any[]>
}

export function TeacherProgressView({ year, month, teacherId = "all" }: TeacherProgressViewProps) {
  const supabase = createClientComponentClient<Database>()
  const [selectedTeacher, setSelectedTeacher] = useState("all")
  const [progressData, setProgressData] = useState<Record<string, TeacherProgress>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTeacherProgress()
  }, [year, month, teacherId])

  // 초기 선택된 선생님 설정
  useEffect(() => {
    if (teacherId && teacherId !== "all") {
      setSelectedTeacher(teacherId)
    }
  }, [teacherId])

  const fetchTeacherProgress = async () => {
    setLoading(true)
    try {
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0)

      let query = supabase
        .from("study_logs")
        .select(`
          *,
          students:student_id(name),
          classes:class_id(name),
          created_by_employee:employees!study_logs_created_by_fkey(name)
        `)
        .gte("date", startDate.toISOString().split("T")[0])
        .lte("date", endDate.toISOString().split("T")[0])
        .order("date")

      // teacherId 필터 적용
      if (teacherId && teacherId !== "all") {
        query = query.eq("created_by", teacherId)
      }

      const { data, error } = await query

      if (error) throw error

      // 선생님별로 그룹화
      const groupedByTeacher = (data || []).reduce((acc, log) => {
        const teacherId = log.created_by || "unknown"
        const teacherName = log.created_by_employee?.name || "미지정"

        if (!acc[teacherId]) {
          acc[teacherId] = {
            teacherId,
            teacherName,
            dailyLogs: {}
          }
        }

        const dateKey = log.date
        if (!acc[teacherId].dailyLogs[dateKey]) {
          acc[teacherId].dailyLogs[dateKey] = []
        }

        acc[teacherId].dailyLogs[dateKey].push({
          ...log,
          studentName: log.students?.name || "학생 미지정",
          className: log.classes?.name || "반 미지정"
        })

        return acc
      }, {} as Record<string, TeacherProgress>)

      setProgressData(groupedByTeacher)
    } catch (error) {
      console.error("Error fetching teacher progress:", error)
    } finally {
      setLoading(false)
    }
  }

  const teacherList = Object.values(progressData)

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 선생님 필터 */}
      <div className="flex items-center gap-4">
        <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="선생님 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 선생님</SelectItem>
            {teacherList.map((teacher) => (
              <SelectItem key={teacher.teacherId} value={teacher.teacherId}>
                {teacher.teacherName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary">
          {year}년 {month}월
        </Badge>
      </div>

      {/* 선생님별 일일 진도 리스트 */}
      <div className="space-y-6">
        {teacherList
          .filter((t) => selectedTeacher === "all" || t.teacherId === selectedTeacher)
          .map((teacher) => (
            <Card key={teacher.teacherId}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {teacher.teacherName} 선생님
                  <Badge variant="outline" className="ml-2">
                    {Object.keys(teacher.dailyLogs).length}일 수업
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(teacher.dailyLogs)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([date, logs]) => (
                      <div key={date} className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <h4 className="font-medium">
                            {new Date(date).toLocaleDateString("ko-KR", {
                              month: "long",
                              day: "numeric",
                              weekday: "short"
                            })}
                          </h4>
                          <Badge variant="secondary" className="ml-auto">
                            {logs.length}명 수업
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {logs.map((log) => (
                            <div
                              key={log.id}
                              className="flex flex-wrap items-center gap-3 text-sm border-l-2 border-muted pl-3"
                            >
                              <span className="font-medium min-w-[80px]">
                                {log.studentName}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {log.className}
                              </Badge>
                              {log.book1 && (
                                <div className="flex items-center gap-1">
                                  <BookOpen className="h-3 w-3" />
                                  <span className="text-muted-foreground">
                                    {log.book1}: {log.book1log || "진도 없음"}
                                  </span>
                                </div>
                              )}
                              {log.book2 && (
                                <div className="flex items-center gap-1">
                                  <BookOpen className="h-3 w-3" />
                                  <span className="text-muted-foreground">
                                    {log.book2}: {log.book2log || "진도 없음"}
                                  </span>
                                </div>
                              )}
                              {log.note && (
                                <span className="text-xs text-muted-foreground italic">
                                  {log.note}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* 데이터가 없을 때 */}
      {teacherList.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">해당 기간에 진도 데이터가 없습니다.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}