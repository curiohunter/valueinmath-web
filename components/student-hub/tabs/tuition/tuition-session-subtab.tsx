"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Calculator } from "lucide-react"

interface TuitionSession {
  id: string
  tuition_fee_id: string
  session_number: number
  session_date: string
  status: string
  note: string | null
  created_at: string
}

interface DiscountDetail {
  type: string
  amount: number
  amount_type: string
  description: string
}

interface TuitionFeeWithSessions {
  id: string
  class_id: string | null
  year: number
  month: number
  amount: number
  base_amount: number | null
  total_discount: number
  final_amount: number | null
  discount_details: DiscountDetail[]
  class_type: string
  payment_status: string
  class_name_snapshot: string | null
  student_name_snapshot: string | null
  sessions: TuitionSession[]
}

export function TuitionSessionSubTab({ studentId }: { studentId: string }) {
  const [fees, setFees] = useState<TuitionFeeWithSessions[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const supabase = createClient()

        // Get tuition fees with sessions
        const { data, error } = await supabase
          .from("tuition_fees")
          .select(`
            *,
            tuition_sessions (
              id, session_number, session_date, status, note, created_at
            )
          `)
          .eq("student_id", studentId)
          .order("year", { ascending: false })
          .order("month", { ascending: false })
          .limit(12)

        if (error) throw error

        setFees(
          (data || []).map((row: any) => ({
            id: row.id,
            class_id: row.class_id,
            year: row.year,
            month: row.month,
            amount: row.amount,
            base_amount: row.base_amount,
            total_discount: row.total_discount || 0,
            final_amount: row.final_amount,
            discount_details: row.discount_details || [],
            class_type: row.class_type || "정규",
            payment_status: row.payment_status || "미납",
            class_name_snapshot: row.class_name_snapshot,
            student_name_snapshot: row.student_name_snapshot,
            sessions: (row.tuition_sessions || [])
              .sort((a: any, b: any) => a.session_number - b.session_number),
          }))
        )
      } catch (error) {
        console.error("Failed to load tuition sessions:", error)
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

  if (fees.length === 0) {
    return (
      <div className="text-center py-12">
        <Calculator className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">수업료 기록이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {fees.map((fee) => (
        <Card key={fee.id}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {fee.year}년 {fee.month}월
                </span>
                <Badge variant="outline" className="text-xs">
                  {fee.class_type}
                </Badge>
                {fee.class_name_snapshot && (
                  <span className="text-xs text-muted-foreground">
                    {fee.class_name_snapshot}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {(fee.final_amount ?? fee.amount)?.toLocaleString()}원
                </span>
                <Badge
                  variant="outline"
                  className={
                    fee.payment_status === "납부"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-orange-50 text-orange-700 border-orange-200"
                  }
                >
                  {fee.payment_status}
                </Badge>
              </div>
            </div>

            {/* Discount Info */}
            {fee.total_discount > 0 && (
              <div className="mb-3 p-2 bg-blue-50 rounded-md">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">기본 금액</span>
                  <span>{fee.base_amount?.toLocaleString()}원</span>
                </div>
                {fee.discount_details.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-blue-600">{d.description}</span>
                    <span className="text-blue-600">-{d.amount.toLocaleString()}원</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-xs font-semibold mt-1 pt-1 border-t border-blue-200">
                  <span>최종 금액</span>
                  <span>{(fee.final_amount ?? fee.amount)?.toLocaleString()}원</span>
                </div>
              </div>
            )}

            {/* Sessions */}
            {fee.sessions.length > 0 && (
              <div className="border rounded-md">
                <div className="grid grid-cols-3 gap-2 px-3 py-1.5 text-xs text-muted-foreground border-b bg-muted/30">
                  <span>회차</span>
                  <span>날짜</span>
                  <span>상태</span>
                </div>
                {fee.sessions.map((session) => (
                  <div key={session.id} className="grid grid-cols-3 gap-2 px-3 py-1.5 text-xs border-b last:border-b-0">
                    <span>{session.session_number}회</span>
                    <span>{session.session_date}</span>
                    <span>
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        {session.status}
                      </Badge>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {fee.sessions.length === 0 && (
              <p className="text-xs text-muted-foreground">세션 정보 없음</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
