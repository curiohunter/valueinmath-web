"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Receipt } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface DiscountDetail {
  type: string
  amount: number
  amount_type: string
  description: string
}

interface TuitionFeeHistory {
  id: string
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
  note: string | null
  period_start_date: string | null
  period_end_date: string | null
  created_at: string
  bill_status: string | null
}

export function TuitionHistorySubTab({ studentId }: { studentId: string }) {
  const [history, setHistory] = useState<TuitionFeeHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const supabase = createClient()

        const { data, error } = await supabase
          .from("tuition_fees")
          .select(`
            *,
            payssam_bills (
              id, request_status
            )
          `)
          .eq("student_id", studentId)
          .order("year", { ascending: false })
          .order("month", { ascending: false })

        if (error) throw error

        setHistory(
          (data || []).map((row: any) => {
            const activeBill = (row.payssam_bills || []).find(
              (b: any) => !["destroyed", "cancelled", "failed"].includes(b.request_status)
            )
            return {
              id: row.id,
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
              note: row.note,
              period_start_date: row.period_start_date,
              period_end_date: row.period_end_date,
              created_at: row.created_at,
              bill_status: activeBill?.request_status || null,
            }
          })
        )
      } catch (error) {
        console.error("Failed to load tuition history:", error)
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

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <Receipt className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">학원비 이력이 없습니다</p>
      </div>
    )
  }

  // Summary stats
  const totalAmount = history.reduce((sum, h) => sum + (h.final_amount ?? h.amount ?? 0), 0)
  const totalDiscount = history.reduce((sum, h) => sum + (h.total_discount || 0), 0)
  const paidCount = history.filter((h) => h.payment_status === "납부").length
  const unpaidCount = history.filter((h) => h.payment_status === "미납").length

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-2">
        <Card>
          <CardContent className="pt-2 pb-2 text-center">
            <p className="text-[10px] text-muted-foreground">총 수업료</p>
            <p className="text-sm font-semibold">{totalAmount.toLocaleString()}원</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-2 pb-2 text-center">
            <p className="text-[10px] text-muted-foreground">총 할인</p>
            <p className="text-sm font-semibold text-blue-600">{totalDiscount > 0 ? `-${totalDiscount.toLocaleString()}` : "0"}원</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-2 pb-2 text-center">
            <p className="text-[10px] text-muted-foreground">납부</p>
            <p className="text-sm font-semibold text-green-600">{paidCount}건</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-2 pb-2 text-center">
            <p className="text-[10px] text-muted-foreground">미납</p>
            <p className="text-sm font-semibold text-orange-600">{unpaidCount}건</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">기간</TableHead>
              <TableHead className="text-xs">반/유형</TableHead>
              <TableHead className="text-xs text-right">금액</TableHead>
              <TableHead className="text-xs text-right">할인</TableHead>
              <TableHead className="text-xs text-center">납부상태</TableHead>
              <TableHead className="text-xs text-center">청구상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="text-xs">
                  {item.year}.{String(item.month).padStart(2, "0")}
                </TableCell>
                <TableCell className="text-xs">
                  <div>{item.class_name_snapshot || "-"}</div>
                  <div className="text-muted-foreground">{item.class_type}</div>
                </TableCell>
                <TableCell className="text-xs text-right">
                  {item.total_discount > 0 ? (
                    <div>
                      <span className="line-through text-muted-foreground">{item.base_amount?.toLocaleString()}</span>
                      <div className="font-medium">{(item.final_amount ?? item.amount)?.toLocaleString()}원</div>
                    </div>
                  ) : (
                    <span className="font-medium">{item.amount?.toLocaleString()}원</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-right">
                  {item.total_discount > 0 ? (
                    <div>
                      <span className="text-blue-600">-{item.total_discount.toLocaleString()}</span>
                      {item.discount_details.map((d, i) => (
                        <div key={i} className="text-[10px] text-muted-foreground truncate max-w-[120px]">{d.description}</div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant="outline"
                    className={
                      item.payment_status === "납부"
                        ? "bg-green-50 text-green-700 border-green-200 text-[10px]"
                        : "bg-orange-50 text-orange-700 border-orange-200 text-[10px]"
                    }
                  >
                    {item.payment_status}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {item.bill_status ? (
                    <Badge variant="outline" className="text-[10px]">
                      {item.bill_status}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
