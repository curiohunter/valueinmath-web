"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import LearningTabs from "@/components/learning/LearningTabs"
import { Pagination } from "@/components/ui/pagination"
import { SchoolExamScoreModal } from "@/components/learning/school-exam-scores/school-exam-score-modal"
import { SchoolExamScoreFiltersComponent } from "@/components/learning/school-exam-scores/school-exam-score-filters"
import { SchoolExamScoreTable } from "@/components/learning/school-exam-scores/school-exam-score-table"
import { getSchoolExamScores, getScoreExamYears } from "@/lib/school-exam-score-client"
import type { SchoolExamScore, SchoolExamScoreFilters } from "@/types/school-exam-score"

const PAGE_SIZE = 20

export default function SchoolExamScoresPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const currentPage = parseInt(searchParams.get("page") || "1", 10)

  const [isLoading, setIsLoading] = useState(true)
  const [scores, setScores] = useState<SchoolExamScore[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [examYears, setExamYears] = useState<number[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [editingScore, setEditingScore] = useState<SchoolExamScore | null>(null)

  const [filters, setFilters] = useState<SchoolExamScoreFilters>({
    search: "",
    school_type: "all",
    grade: "all",
    semester: "all",
    exam_type: "all",
    exam_year: "all",
    school_name: "",
    subject: "",
  })

  // 필터 변경 시 페이지를 1로 리셋
  const handleFiltersChange = useCallback((newFilters: SchoolExamScoreFilters) => {
    setFilters(newFilters)
    // 페이지가 1이 아니면 1로 리셋
    if (currentPage !== 1) {
      router.push("/learning/school-exam-scores?page=1")
    }
  }, [currentPage, router])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, count } = await getSchoolExamScores(currentPage, PAGE_SIZE, filters)
      setScores(data)
      setTotalCount(count)
    } catch (error: any) {
      toast.error(error?.message || "성적 목록을 불러오는데 실패했습니다")
      setScores([])
      setTotalCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, filters])

  const loadExamYears = useCallback(async () => {
    try {
      const years = await getScoreExamYears()
      setExamYears(years)
    } catch {
      // silently fail - exam years are optional for filtering
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    loadExamYears()
  }, [loadExamYears])

  const handleCreate = () => {
    setEditingScore(null)
    setModalOpen(true)
  }

  const handleEdit = (score: SchoolExamScore) => {
    setEditingScore(score)
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setEditingScore(null)
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">학교 시험 성적 관리</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            새로고침
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            성적 등록
          </Button>
        </div>
      </div>

      {/* Filters */}
      <SchoolExamScoreFiltersComponent
        filters={filters}
        onFiltersChange={handleFiltersChange}
        examYears={examYears}
      />

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          총 <span className="font-semibold text-foreground">{totalCount}</span>개의 성적
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
        <SchoolExamScoreTable scores={scores} onDelete={loadData} onEdit={handleEdit} />
      )}

      {/* Pagination */}
      {totalPages > 1 && <Pagination totalPages={totalPages} currentPage={currentPage} />}

      {/* Modal */}
      <SchoolExamScoreModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSuccess={handleSuccess}
        editingScore={editingScore}
      />
    </div>
  )
}
