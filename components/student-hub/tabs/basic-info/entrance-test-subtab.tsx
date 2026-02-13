"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, ClipboardList } from "lucide-react"

interface EntranceTest {
  id: number
  student_id: string
  test_date: string | null
  test1_score: number | null
  test2_score: number | null
  test1_level: string | null
  test2_level: string | null
  test_result: string | null
  status: string
  recommended_class: string | null
  notes: string | null
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  "대기": "bg-yellow-50 text-yellow-700 border-yellow-200",
  "완료": "bg-green-50 text-green-700 border-green-200",
  "불합격": "bg-red-50 text-red-700 border-red-200",
  "합격": "bg-green-50 text-green-700 border-green-200",
}

export function EntranceTestSubTab({ studentId }: { studentId: string }) {
  const [tests, setTests] = useState<EntranceTest[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("entrance_tests")
          .select("*")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false })

        if (error) throw error
        setTests(data || [])
      } catch (error) {
        console.error("Failed to load entrance tests:", error)
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

  if (tests.length === 0) {
    return (
      <div className="text-center py-12">
        <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">입학테스트 기록이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {tests.map((test) => (
        <Card key={test.id}>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between mb-2">
              <Badge
                variant="outline"
                className={STATUS_COLORS[test.status] || ""}
              >
                {test.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {test.test_date?.split("T")[0] || test.created_at?.split("T")[0]}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {test.test1_score !== null && (
                <div>
                  <span className="text-muted-foreground">테스트1 점수: </span>
                  <span className="font-medium">{test.test1_score}점</span>
                </div>
              )}
              {test.test1_level && (
                <div>
                  <span className="text-muted-foreground">테스트1 레벨: </span>
                  <span className="font-medium">{test.test1_level}</span>
                </div>
              )}
              {test.test2_score !== null && (
                <div>
                  <span className="text-muted-foreground">테스트2 점수: </span>
                  <span className="font-medium">{test.test2_score}점</span>
                </div>
              )}
              {test.test2_level && (
                <div>
                  <span className="text-muted-foreground">테스트2 레벨: </span>
                  <span className="font-medium">{test.test2_level}</span>
                </div>
              )}
              {test.test_result && (
                <div>
                  <span className="text-muted-foreground">결과: </span>
                  <span className="font-medium">{test.test_result}</span>
                </div>
              )}
              {test.recommended_class && (
                <div>
                  <span className="text-muted-foreground">추천반: </span>
                  <span className="font-medium">{test.recommended_class}</span>
                </div>
              )}
            </div>
            {test.notes && (
              <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{test.notes}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
