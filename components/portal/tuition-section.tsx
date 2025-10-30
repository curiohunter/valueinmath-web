"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TuitionFeeItem } from "@/types/portal"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Download, AlertCircle, CheckCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface TuitionSectionProps {
  tuition_fees: TuitionFeeItem[]
  studentName?: string
}

const ITEMS_PER_PAGE = 6

export function TuitionSection({ tuition_fees, studentName }: TuitionSectionProps) {
  const [currentPage, setCurrentPage] = useState(1)

  // Get current month data
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const currentTuition = tuition_fees.find(
    (fee) => fee.year === currentYear && fee.month === currentMonth
  )

  // Get unpaid items
  const unpaidItems = tuition_fees.filter((fee) => fee.payment_status === "미납")
  const unpaidTotal = unpaidItems.reduce((sum, fee) => sum + fee.amount, 0)

  // Pagination
  const totalPages = Math.ceil(tuition_fees.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentItems = tuition_fees.slice(startIndex, endIndex)

  // Status badge helper
  const getStatusBadge = (status: string | null) => {
    if (status === "완납") {
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
          <CheckCircle className="h-3 w-3 mr-1" />
          완납
        </Badge>
      )
    }
    if (status === "일부납부") {
      return (
        <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
          <Clock className="h-3 w-3 mr-1" />
          일부납부
        </Badge>
      )
    }
    return (
      <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
        <AlertCircle className="h-3 w-3 mr-1" />
        미납
      </Badge>
    )
  }

  // Download Excel (placeholder function)
  const handleDownloadExcel = () => {
    // TODO: Implement Excel download
    alert("Excel 다운로드 기능은 추후 구현 예정입니다.")
  }

  return (
    <div id="tuition-section" className="space-y-6">
      {/* Current Status Card */}
      <Card
        className={cn(
          "border-2",
          currentTuition?.payment_status === "완납"
            ? "border-green-200 bg-green-50"
            : currentTuition?.payment_status === "일부납부"
            ? "border-yellow-200 bg-yellow-50"
            : "border-red-200 bg-red-50"
        )}
      >
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {currentTuition?.payment_status === "완납" ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : currentTuition?.payment_status === "일부납부" ? (
              <Clock className="h-5 w-5 text-yellow-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            이번 달 원비 납부 상태
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-baseline gap-3">
              <span className="text-sm text-gray-600">상태:</span>
              <span
                className={cn(
                  "text-3xl font-bold",
                  currentTuition?.payment_status === "완납"
                    ? "text-green-600"
                    : currentTuition?.payment_status === "일부납부"
                    ? "text-yellow-600"
                    : "text-red-600"
                )}
              >
                {currentTuition?.payment_status || "정보 없음"}
              </span>
            </div>
            {currentTuition && (
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">년월:</span>
                  <span className="font-semibold">
                    {currentTuition.year}.{String(currentTuition.month).padStart(2, "0")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">금액:</span>
                  <span className="font-semibold">
                    {currentTuition.amount.toLocaleString()}원
                  </span>
                </div>
                {currentTuition.class_name && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">반명:</span>
                    <span>{currentTuition.class_name}</span>
                  </div>
                )}
                {(currentTuition.period_start_date || currentTuition.period_end_date) && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">기간:</span>
                    <span>
                      {currentTuition.period_start_date || "-"} ~ {currentTuition.period_end_date || "-"}
                    </span>
                  </div>
                )}
                {currentTuition.is_sibling && (
                  <Badge variant="secondary" className="text-xs">
                    형제할인 적용
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Unpaid Items Alert */}
      {unpaidItems.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              미납 내역 ({unpaidItems.length}건)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Unpaid Items List */}
              <div className="space-y-3">
                {unpaidItems.map((fee) => (
                  <div
                    key={fee.id}
                    className="border-l-4 border-red-400 bg-white p-3 rounded"
                  >
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">년월:</span>{" "}
                        <span className="font-semibold">
                          {fee.year}.{String(fee.month).padStart(2, "0")}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">금액:</span>{" "}
                        <span className="font-semibold text-red-600">
                          {fee.amount.toLocaleString()}원
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">반명:</span>{" "}
                        <span>{fee.class_name || "-"}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-600">기간:</span>{" "}
                        <span>
                          {fee.period_start_date || "-"} ~ {fee.period_end_date || "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Unpaid Amount */}
              <div className="pt-3 border-t border-red-200">
                <p className="text-sm text-red-800 font-medium">총 미납 금액</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {unpaidTotal.toLocaleString()}원
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg">납부 내역</CardTitle>
            <Button variant="outline" size="sm" onClick={handleDownloadExcel}>
              <Download className="h-4 w-4 mr-2" />
              Excel 다운로드
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tuition_fees.length === 0 ? (
            <div className="text-center py-8 text-gray-500">납부 내역이 없습니다</div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>년월</TableHead>
                      <TableHead>금액</TableHead>
                      <TableHead>반명</TableHead>
                      <TableHead>기간</TableHead>
                      <TableHead className="text-center">형제할인</TableHead>
                      <TableHead className="text-center">납부상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.map((fee) => (
                      <TableRow key={fee.id}>
                        <TableCell className="font-medium">
                          {fee.year}.{String(fee.month).padStart(2, "0")}
                        </TableCell>
                        <TableCell>{fee.amount.toLocaleString()}원</TableCell>
                        <TableCell>{fee.class_name || "-"}</TableCell>
                        <TableCell className="text-sm">
                          {fee.period_start_date || "-"} ~ {fee.period_end_date || "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {fee.is_sibling ? (
                            <Badge variant="secondary" className="text-xs">
                              적용
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(fee.payment_status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {currentItems.map((fee) => (
                  <Card key={fee.id} className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">
                          {fee.year}.{String(fee.month).padStart(2, "0")}
                        </span>
                        {getStatusBadge(fee.payment_status)}
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {fee.amount.toLocaleString()}원
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center justify-between">
                          <span>{fee.class_name || "반 정보 없음"}</span>
                          {fee.is_sibling && (
                            <Badge variant="secondary" className="text-xs">
                              형제할인
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs">
                          기간: {fee.period_start_date || "-"} ~ {fee.period_end_date || "-"}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    이전
                  </Button>
                  <span className="text-sm text-gray-600">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    다음
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
