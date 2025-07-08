"use client"

import { useState, useCallback, useEffect } from "react"
import { Calendar, RefreshCw, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useMonthlyReports } from "@/hooks/use-monthly-reports"
import { ReportsTable } from "@/components/reports/reports-table"
import { ReportsFilters } from "@/components/reports/reports-filters"
import { ReportPreviewModal } from "@/components/reports/report-preview-modal"
import { BulkGenerateDialog } from "@/components/reports/bulk-generate-dialog"
import type { ReportTableRow, ReportFilters } from "@/types/reports"
import Link from "next/link"

export function ReportsPageClient() {
  // 현재 날짜 기준으로 초기값 설정 - 전월로 설정
  const currentDate = new Date()
  const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
  const [selectedYear, setSelectedYear] = useState(prevMonth.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(prevMonth.getMonth() + 1)

  // 연도 옵션 생성 (현재 연도 기준 ±2년)
  const yearOptions = []
  for (let i = -2; i <= 2; i++) {
    yearOptions.push(currentDate.getFullYear() + i)
  }

  // 필터 상태
  const [filters, setFilters] = useState<ReportFilters>({
    classIds: [],
    searchTerm: "",
    schoolType: "all",
    grade: "all",
    year: prevMonth.getFullYear(),
    month: prevMonth.getMonth() + 1
  })

  // 모달 상태
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<ReportTableRow | null>(null)
  const [bulkGenerateOpen, setBulkGenerateOpen] = useState(false)

  // 연도/월 변경 시 필터 업데이트
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      year: selectedYear,
      month: selectedMonth
    }))
  }, [selectedYear, selectedMonth])

  // 보고서 데이터 훅 사용
  const { 
    reports, 
    isLoading, 
    refresh, 
    updateReportStatus 
  } = useMonthlyReports(selectedYear, selectedMonth, filters)

  // 보고서 보기 핸들러
  const handleViewReport = useCallback((report: ReportTableRow) => {
    setSelectedReport(report)
    setPreviewModalOpen(true)
  }, [])

  // 보고서 생성 핸들러
  const handleGenerateReport = useCallback(async (studentId: string) => {
    try {
      updateReportStatus(studentId, "generating")
      
      // TODO: 실제 API 호출
      const response = await fetch(`/api/reports/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          year: selectedYear,
          month: selectedMonth
        })
      })

      if (!response.ok) throw new Error("보고서 생성 실패")

      const data = await response.json()
      updateReportStatus(studentId, "generated", data.reportId)
      return { reportId: data.reportId }
    } catch (error) {
      console.error("보고서 생성 오류:", error)
      throw error
    }
  }, [selectedYear, selectedMonth, updateReportStatus])

  // 보고서 삭제 핸들러
  const handleDeleteReport = useCallback(async (reportId: string) => {
    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: "DELETE",
        credentials: 'same-origin'
      })

      if (!response.ok) throw new Error("보고서 삭제 실패")

      refresh() // 데이터 새로고침
    } catch (error) {
      console.error("보고서 삭제 오류:", error)
      throw error
    }
  }, [refresh])

  // 보고서 저장 핸들러
  const handleSaveReport = useCallback(async (reportId: string, content: string) => {
    const response = await fetch(`/api/reports/${reportId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        reportContent: content
      })
    })

    if (!response.ok) throw new Error("보고서 저장 실패")

    // 상태 업데이트
    if (selectedReport) {
      updateReportStatus(selectedReport.studentId, "modified", reportId)
    }
  }, [selectedReport, updateReportStatus])

  return (
    <div className="space-y-6">
      {/* 탭 네비게이션 */}
      <div className="flex items-center gap-2 border-b">
        <Link href="/analytics">
          <Button variant="ghost" className="rounded-none border-b-2 border-transparent hover:border-gray-300">
            전체 현황
          </Button>
        </Link>
        <Link href="/analytics/reports">
          <Button variant="ghost" className="rounded-none border-b-2 border-primary">
            월간 보고서
          </Button>
        </Link>
      </div>

      {/* 날짜 선택 영역 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            보고서 기간 선택
          </CardTitle>
          <CardDescription>
            보고서를 생성할 연도와 월을 선택하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}년
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedMonth.toString()}
              onValueChange={(value) => setSelectedMonth(parseInt(value))}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <SelectItem key={month} value={month.toString()}>
                    {month}월
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              variant="outline"
              onClick={() => {
                toast.info(`${selectedYear}년 ${selectedMonth}월 보고서를 표시합니다`)
              }}
            >
              조회
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 필터 영역 */}
      <ReportsFilters
        filters={filters}
        onFiltersChange={setFilters}
        isLoading={isLoading}
      />

      {/* 보고서 테이블 영역 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>학생별 보고서 현황</CardTitle>
              <CardDescription>
                필터를 사용하여 원하는 학생들의 보고서를 관리하세요
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkGenerateOpen(true)}
                disabled={isLoading}
              >
                <FileText className="h-4 w-4 mr-2" />
                전체 생성
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                새로고침
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ReportsTable
            reports={reports}
            isLoading={isLoading}
            onViewReport={handleViewReport}
            onGenerateReport={handleGenerateReport}
            onDeleteReport={handleDeleteReport}
            onRefresh={refresh}
          />
        </CardContent>
      </Card>

      {/* 보고서 미리보기 모달 */}
      <ReportPreviewModal
        open={previewModalOpen}
        onOpenChange={setPreviewModalOpen}
        report={selectedReport}
        onSave={handleSaveReport}
      />

      {/* 보고서 일괄 생성 다이얼로그 */}
      <BulkGenerateDialog
        open={bulkGenerateOpen}
        onOpenChange={setBulkGenerateOpen}
        students={reports}
        onGenerate={handleGenerateReport}
        onComplete={() => {
          refresh()
          toast.success("보고서 일괄 생성이 완료되었습니다.")
        }}
      />
    </div>
  )
}