"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import type { SchoolExamFilters } from "@/types/school-exam"

interface SchoolExamFiltersProps {
  filters: SchoolExamFilters
  onFiltersChange: (filters: SchoolExamFilters) => void
  examYears: number[]
}

export function SchoolExamFiltersComponent({ filters, onFiltersChange, examYears }: SchoolExamFiltersProps) {
  const handleChange = (key: keyof SchoolExamFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const handleReset = () => {
    onFiltersChange({
      search: "",
      school_type: "all",
      grade: "all",
      semester: "all",
      exam_type: "all",
      exam_year: "all",
      is_collected: "all",
      is_uploaded_to_mathflat: "all",
    })
  }

  const hasActiveFilters =
    filters.search !== "" ||
    filters.school_type !== "all" ||
    filters.grade !== "all" ||
    filters.semester !== "all" ||
    filters.exam_type !== "all" ||
    filters.exam_year !== "all" ||
    filters.is_collected !== "all" ||
    filters.is_uploaded_to_mathflat !== "all"

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
      {/* 검색어 */}
      <div className="space-y-2">
        <Label htmlFor="search">학교명 검색</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="search"
            value={filters.search}
            onChange={(e) => handleChange("search", e.target.value)}
            placeholder="학교명으로 검색..."
            className="pl-9"
          />
        </div>
      </div>

      {/* 필터 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 학교 타입 */}
        <div className="space-y-2">
          <Label htmlFor="school_type">학교 타입</Label>
          <Select
            value={filters.school_type}
            onValueChange={(value) => handleChange("school_type", value)}
          >
            <SelectTrigger id="school_type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="중학교">중학교</SelectItem>
              <SelectItem value="고등학교">고등학교</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 학년 */}
        <div className="space-y-2">
          <Label htmlFor="grade">학년</Label>
          <Select
            value={filters.grade.toString()}
            onValueChange={(value) => handleChange("grade", value === "all" ? "all" : parseInt(value))}
          >
            <SelectTrigger id="grade">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="1">1학년</SelectItem>
              <SelectItem value="2">2학년</SelectItem>
              <SelectItem value="3">3학년</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 학기 */}
        <div className="space-y-2">
          <Label htmlFor="semester">학기</Label>
          <Select
            value={filters.semester.toString()}
            onValueChange={(value) => handleChange("semester", value === "all" ? "all" : parseInt(value))}
          >
            <SelectTrigger id="semester">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="1">1학기</SelectItem>
              <SelectItem value="2">2학기</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 시험 유형 */}
        <div className="space-y-2">
          <Label htmlFor="exam_type">시험 유형</Label>
          <Select
            value={filters.exam_type}
            onValueChange={(value) => handleChange("exam_type", value)}
          >
            <SelectTrigger id="exam_type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="중간고사">중간고사</SelectItem>
              <SelectItem value="기말고사">기말고사</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 출제연도 */}
        <div className="space-y-2">
          <Label htmlFor="exam_year">출제연도</Label>
          <Select
            value={filters.exam_year.toString()}
            onValueChange={(value) => handleChange("exam_year", value === "all" ? "all" : parseInt(value))}
          >
            <SelectTrigger id="exam_year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {examYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 수집 여부 */}
        <div className="space-y-2">
          <Label htmlFor="is_collected">수집 상태</Label>
          <Select
            value={filters.is_collected.toString()}
            onValueChange={(value) =>
              handleChange("is_collected", value === "all" ? "all" : value === "true")
            }
          >
            <SelectTrigger id="is_collected">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="true">수집 완료</SelectItem>
              <SelectItem value="false">미수집</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 매쓰플랫 업로드 여부 */}
        <div className="space-y-2">
          <Label htmlFor="is_uploaded_to_mathflat">매쓰플랫 상태</Label>
          <Select
            value={filters.is_uploaded_to_mathflat.toString()}
            onValueChange={(value) =>
              handleChange("is_uploaded_to_mathflat", value === "all" ? "all" : value === "true")
            }
          >
            <SelectTrigger id="is_uploaded_to_mathflat">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="true">업로드 완료</SelectItem>
              <SelectItem value="false">미업로드</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 리셋 버튼 */}
        <div className="space-y-2">
          <Label>&nbsp;</Label>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasActiveFilters}
            className="w-full"
          >
            <X className="w-4 h-4 mr-2" />
            필터 초기화
          </Button>
        </div>
      </div>
    </div>
  )
}
