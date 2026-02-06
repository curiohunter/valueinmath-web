"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw, FileText, BookOpen } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import LearningTabs from "@/components/learning/LearningTabs"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Pagination } from "@/components/ui/pagination"
import { SchoolExamModal } from "@/components/learning/school-exams/school-exam-modal"
import { SchoolExamFiltersComponent } from "@/components/learning/school-exams/school-exam-filters"
import { SchoolExamTable } from "@/components/learning/school-exams/school-exam-table"
import ExamRangeManagement from "@/components/learning/school-exams/exam-range-management"
import { getSchoolExams, getExamYears } from "@/lib/school-exam-client"
import type { SchoolExam, SchoolExamFilters } from "@/types/school-exam"

const PAGE_SIZE = 20

export default function SchoolExamsPage() {
  const searchParams = useSearchParams()
  const currentPage = parseInt(searchParams.get("page") || "1", 10)
  const initialTab = searchParams.get("tab") || "papers"

  const [activeTab, setActiveTab] = useState(initialTab)
  const [isLoading, setIsLoading] = useState(true)
  const [exams, setExams] = useState<SchoolExam[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [examYears, setExamYears] = useState<number[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [editingExam, setEditingExam] = useState<SchoolExam | null>(null)

  const [filters, setFilters] = useState<SchoolExamFilters>({
    search: "",
    school_type: "all",
    grade: "all",
    semester: "all",
    exam_type: "all",
    exam_year: "all",
    is_collected: "all",
    is_uploaded_to_mathflat: "all",
  })

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, count } = await getSchoolExams(currentPage, PAGE_SIZE, filters)
      setExams(data)
      setTotalCount(count)
    } catch (error) {
      console.error("Error loading school exams:", error)
      toast.error("시험지 목록을 불러오는데 실패했습니다")
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, filters])

  const loadExamYears = useCallback(async () => {
    try {
      const years = await getExamYears()
      setExamYears(years)
    } catch (error) {
      console.error("Error loading exam years:", error)
    }
  }, [])

  useEffect(() => {
    if (activeTab === "papers") {
      loadData()
    }
  }, [loadData, activeTab])

  useEffect(() => {
    loadExamYears()
  }, [loadExamYears])

  const handleCreate = () => {
    setEditingExam(null)
    setModalOpen(true)
  }

  const handleEdit = (exam: SchoolExam) => {
    setEditingExam(exam)
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setEditingExam(null)
  }

  const handleSuccess = () => {
    loadData()
    loadExamYears()
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <LearningTabs />

      {/* Sub Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start h-auto p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
          <TabsTrigger
            value="papers"
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
              "data-[state=active]:bg-slate-800 data-[state=active]:text-white data-[state=active]:shadow-md",
              "data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:bg-slate-50"
            )}
          >
            <FileText className="w-4 h-4" />
            시험지 관리
          </TabsTrigger>
          <TabsTrigger
            value="ranges"
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
              "data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md",
              "data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:bg-slate-50"
            )}
          >
            <BookOpen className="w-4 h-4" />
            시험 범위
            <span className="ml-1 px-1.5 py-0.5 text-xs rounded bg-indigo-100 text-indigo-700 data-[state=active]:bg-white/20 data-[state=active]:text-white">
              NEW
            </span>
          </TabsTrigger>
        </TabsList>

        {/* 시험지 관리 탭 */}
        <TabsContent value="papers" className="mt-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">시험지 관리</h1>
              <p className="text-slate-500 text-sm mt-1">
                학교별 시험지를 수집하고 관리합니다
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={loadData} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                새로고침
              </Button>
              <Button onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />
                시험지 등록
              </Button>
            </div>
          </div>

          {/* Filters */}
          <SchoolExamFiltersComponent
            filters={filters}
            onFiltersChange={setFilters}
            examYears={examYears}
          />

          {/* Summary */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              총 <span className="font-semibold text-foreground">{totalCount}</span>개의 시험지
            </div>
            <div>
              {currentPage} / {totalPages || 1} 페이지
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="border rounded-lg p-12 text-center">
              <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">로딩 중...</p>
            </div>
          ) : (
            <SchoolExamTable exams={exams} onEdit={handleEdit} onDelete={loadData} />
          )}

          {/* Pagination */}
          {totalPages > 1 && <Pagination totalPages={totalPages} currentPage={currentPage} />}

          {/* Modal */}
          <SchoolExamModal
            isOpen={modalOpen}
            onClose={handleModalClose}
            exam={editingExam}
            onSuccess={handleSuccess}
          />
        </TabsContent>

        {/* 시험 범위 탭 */}
        <TabsContent value="ranges" className="mt-6">
          <ExamRangeManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}
