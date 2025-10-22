"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import type { SchoolExamScoreFilters } from "@/types/school-exam-score"

interface SchoolExamScoreFiltersProps {
  filters: SchoolExamScoreFilters
  onFiltersChange: (filters: SchoolExamScoreFilters) => void
  examYears: number[]
}

export function SchoolExamScoreFiltersComponent({
  filters,
  onFiltersChange,
  examYears,
}: SchoolExamScoreFiltersProps) {
  const handleChange = (key: keyof SchoolExamScoreFilters, value: any) => {
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
      school_name: "",
      subject: "",
    })
  }

  const hasActiveFilters =
    filters.search !== "" ||
    filters.school_type !== "all" ||
    filters.grade !== "all" ||
    filters.semester !== "all" ||
    filters.exam_type !== "all" ||
    filters.exam_year !== "all" ||
    filters.school_name !== "" ||
    filters.subject !== ""

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
      {/* 3열 레이아웃: 각 열마다 검색 1개 + 필터 2개 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1열: 학생명 검색 + (학교타입, 학년) */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">학생명 검색</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="search"
                value={filters.search}
                onChange={(e) => handleChange("search", e.target.value)}
                placeholder="학생명으로 검색..."
                className="pl-9"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="school_type">학교 타입</Label>
              <Select value={filters.school_type} onValueChange={(value) => handleChange("school_type", value)}>
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
            <div className="space-y-2">
              <Label htmlFor="grade">학년</Label>
              <Select
                value={filters.grade.toString()}
                onValueChange={(value) => handleChange("grade", value === "all" ? "all" : value)}
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
          </div>
        </div>

        {/* 2열: 학교명 검색 + (학기, 시험유형) */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="school_name">학교명 검색</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="school_name"
                value={filters.school_name}
                onChange={(e) => handleChange("school_name", e.target.value)}
                placeholder="학교명으로 검색..."
                className="pl-9"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="semester">학기</Label>
              <Select
                value={filters.semester.toString()}
                onValueChange={(value) => handleChange("semester", value === "all" ? "all" : value)}
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
            <div className="space-y-2">
              <Label htmlFor="exam_type">시험 유형</Label>
              <Select value={filters.exam_type} onValueChange={(value) => handleChange("exam_type", value)}>
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
          </div>
        </div>

        {/* 3열: 과목 검색 + (출제연도, 필터초기화) */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">과목 검색</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="subject"
                value={filters.subject}
                onChange={(e) => handleChange("subject", e.target.value)}
                placeholder="과목명으로 검색..."
                className="pl-9"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="exam_year">출제연도</Label>
              <Select
                value={filters.exam_year.toString()}
                onValueChange={(value) => handleChange("exam_year", value === "all" ? "all" : value)}
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
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button variant="outline" onClick={handleReset} disabled={!hasActiveFilters} className="w-full">
                <X className="w-4 h-4 mr-2" />
                초기화
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
