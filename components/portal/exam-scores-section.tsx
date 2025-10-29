"use client"

import { useState } from "react"
import { SchoolExamScoreItem } from "@/types/portal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ExamScoresSectionProps {
  scores: SchoolExamScoreItem[]
}

const getScoreColor = (score: number) => {
  if (score >= 90) return "text-green-600 font-bold"
  if (score >= 80) return "text-blue-600 font-semibold"
  if (score >= 70) return "text-orange-600"
  if (score >= 60) return "text-yellow-600"
  return "text-red-600"
}

const getScoreBgColor = (score: number) => {
  if (score >= 90) return "bg-green-50"
  if (score >= 80) return "bg-blue-50"
  if (score >= 70) return "bg-orange-50"
  if (score >= 60) return "bg-yellow-50"
  return "bg-red-50"
}

export function ExamScoresSection({ scores }: ExamScoresSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  // Group by exam (year, semester, type)
  const groupedScores = scores.reduce((acc, score) => {
    const key = `${score.exam_year}-${score.semester}-${score.exam_type}-${score.school_name || ""}`
    if (!acc[key]) {
      acc[key] = {
        exam_year: score.exam_year,
        semester: score.semester,
        exam_type: score.exam_type,
        school_name: score.school_name,
        grade: score.grade,
        scores: [],
      }
    }
    acc[key].scores.push(score)
    return acc
  }, {} as Record<string, any>)

  const exams = Object.values(groupedScores).sort((a: any, b: any) => {
    if (a.exam_year !== b.exam_year) return b.exam_year - a.exam_year
    return b.semester - a.semester
  })

  return (
    <Card>
      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronDown className="h-5 w-5 -rotate-90" />}
          </Button>
          <CardTitle>학교 시험 성적</CardTitle>
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent>
        {scores.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">학교 시험 성적이 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {exams.slice(0, 10).map((exam: any, idx: number) => (
              <div key={idx} className="border rounded-lg p-4">
                <div className="mb-3">
                  <h3 className="font-semibold">
                    {exam.school_name || ""} {exam.grade}학년 {exam.semester}학기 {exam.exam_type}
                  </h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {exam.scores.map((score: SchoolExamScoreItem) => (
                    <div
                      key={score.id}
                      className={`p-3 rounded-lg ${getScoreBgColor(score.score)}`}
                    >
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        {score.subject}
                      </div>
                      <div className={`text-xl ${getScoreColor(score.score)}`}>
                        {score.score}점
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {exams.length > 10 && (
              <p className="text-center text-sm text-muted-foreground">
                외 {exams.length - 10}개의 시험 기록
              </p>
            )}
          </div>
        )}
        </CardContent>
      )}
    </Card>
  )
}
