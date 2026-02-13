"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Loader2, FileBarChart, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HomeworkRecord {
  id: string
  mathflat_student_id: string
  homework_date: string
  book_type: string
  title: string | null
  page: string | null
  total_problems: number | null
  progress_id_list: number[] | null
  completed: boolean
  score: number | null
}

interface DailyWorkRecord {
  id: string
  correct_count: number
  wrong_count: number
}

interface HwMapping {
  daily_work_id: string
  homework_id: string
  matched_progress_ids: number[] | null
}

interface HomeworkWithProgress {
  id: string
  homework_date: string
  book_type: string
  title: string
  page: string | null
  total: number
  solved: number
  correct: number
  wrong: number
  completionRate: number
  correctRate: number
}

export function HomeworkAnalysisSubTab({ studentId }: { studentId: string }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [homeworks, setHomeworks] = useState<HomeworkWithProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [mathflatStudentId, setMathflatStudentId] = useState<string | null>(null)

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
      setHomeworks([])
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

        // 1. 숙제 목록 조회
        const { data: hwData, error: hwError } = await supabase
          .from("mathflat_homework")
          .select("id, homework_date, book_type, title, page, total_problems, progress_id_list, completed, score")
          .eq("mathflat_student_id", mathflatStudentId)
          .gte("homework_date", startDate)
          .lt("homework_date", endDate)
          .order("homework_date", { ascending: false })

        if (hwError) throw hwError
        if (!hwData || hwData.length === 0) {
          setHomeworks([])
          setIsLoading(false)
          return
        }

        // 2. 숙제-풀이 매핑 조회
        const hwIds = hwData.map((hw) => hw.id)
        let allMappings: HwMapping[] = []

        const batchSize = 200
        for (let i = 0; i < hwIds.length; i += batchSize) {
          const batch = hwIds.slice(i, i + batchSize)
          const { data: mappings } = await supabase
            .from("mathflat_daily_work_homework")
            .select("daily_work_id, homework_id, matched_progress_ids")
            .in("homework_id", batch)
          if (mappings) allMappings = [...allMappings, ...mappings]
        }

        // 3. 매핑된 daily_work 풀이 기록 조회
        const dwIds = [...new Set(allMappings.map((m) => m.daily_work_id))]
        const dwMap = new Map<string, DailyWorkRecord>()

        if (dwIds.length > 0) {
          for (let i = 0; i < dwIds.length; i += batchSize) {
            const batch = dwIds.slice(i, i + batchSize)
            const { data: dwData } = await supabase
              .from("mathflat_daily_work")
              .select("id, correct_count, wrong_count")
              .in("id", batch)
            if (dwData) {
              dwData.forEach((dw) => dwMap.set(dw.id, dw))
            }
          }
        }

        // 4. 숙제별 진행률 계산
        const results: HomeworkWithProgress[] = hwData.map((hw) => {
          const hwMappings = allMappings.filter((m) => m.homework_id === hw.id)
          const mappedDws = hwMappings
            .map((m) => dwMap.get(m.daily_work_id))
            .filter(Boolean) as DailyWorkRecord[]

          const correct = mappedDws.reduce((sum, dw) => sum + (dw.correct_count || 0), 0)
          const wrong = mappedDws.reduce((sum, dw) => sum + (dw.wrong_count || 0), 0)

          let total: number
          let solved: number

          if (hw.book_type === "WORKSHEET") {
            // WORKSHEET: total = 총 문항수, solved = 실제 풀이 수 (정답 + 오답)
            total = hw.total_problems || 0
            solved = correct + wrong
          } else {
            // WORKBOOK: total = progress_id 개수, solved = 매칭된 고유 progress_id 수
            total = hw.progress_id_list?.length || 0
            const allMatchedIds = hwMappings.flatMap((m) => m.matched_progress_ids || [])
            solved = [...new Set(allMatchedIds)].length
          }

          const completionRate = total > 0 ? Math.round((solved / total) * 100) : 0
          const answered = correct + wrong
          const correctRate = answered > 0 ? Math.round((correct / answered) * 100) : 0

          return {
            id: hw.id,
            homework_date: hw.homework_date,
            book_type: hw.book_type,
            title: hw.title || "(제목 없음)",
            page: hw.page || null,
            total,
            solved,
            correct,
            wrong,
            completionRate: Math.min(completionRate, 100),
            correctRate,
          }
        })

        setHomeworks(results)
      } catch (error) {
        console.error("Failed to load homework progress:", error)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [mathflatStudentId, year, month])

  const stats = useMemo(() => {
    const totalHw = homeworks.length
    const completedCount = homeworks.filter((h) => h.completionRate >= 100).length
    const avgCompletion = totalHw > 0
      ? Math.round(homeworks.reduce((sum, h) => sum + h.completionRate, 0) / totalHw)
      : 0
    const totalCorrect = homeworks.reduce((sum, h) => sum + h.correct, 0)
    const totalAnswered = homeworks.reduce((sum, h) => sum + h.correct + h.wrong, 0)
    const avgCorrectRate = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0
    return { totalHw, completedCount, avgCompletion, avgCorrectRate }
  }, [homeworks])

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
        <FileBarChart className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
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
            <p className="text-[10px] text-muted-foreground">총 숙제</p>
            <p className="text-sm font-semibold">{stats.totalHw}건</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-2 pb-2 text-center">
            <p className="text-[10px] text-muted-foreground">완료</p>
            <p className="text-sm font-semibold text-green-600">{stats.completedCount}건</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-2 pb-2 text-center">
            <p className="text-[10px] text-muted-foreground">평균 진행률</p>
            <p className="text-sm font-semibold">{stats.avgCompletion}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-2 pb-2 text-center">
            <p className="text-[10px] text-muted-foreground">정답률</p>
            <p className="text-sm font-semibold">{stats.avgCorrectRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Homework list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : homeworks.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">이 달의 숙제 기록이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {homeworks.map((hw) => (
            <Card key={hw.id}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium truncate">{hw.title}</span>
                      <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
                        {hw.book_type === "WORKSHEET" ? "학습지" : "교재"}
                      </Badge>
                    </div>
                    {hw.page && (
                      <p className="text-[10px] text-muted-foreground">p.{hw.page}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                    {hw.homework_date}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Progress value={hw.completionRate} className="h-2 flex-1" />
                    <span className={`text-xs font-semibold min-w-[40px] text-right ${
                      hw.completionRate >= 100 ? "text-green-600" : hw.completionRate > 0 ? "text-blue-600" : "text-muted-foreground"
                    }`}>
                      {hw.completionRate}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    {hw.book_type === "WORKSHEET" ? (
                      <span>풀이: {hw.solved}/{hw.total}문항</span>
                    ) : (
                      <span>진도: {hw.solved}/{hw.total}</span>
                    )}
                    {(hw.correct + hw.wrong) > 0 && (
                      <>
                        <span className="text-green-600">정답 {hw.correct}</span>
                        <span className="text-red-600">오답 {hw.wrong}</span>
                        <span>정답률 {hw.correctRate}%</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
