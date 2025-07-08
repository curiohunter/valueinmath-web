"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Filter, School, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/database"
import type { ReportFilters } from "@/types/reports"
import { useDebounce } from "@/hooks/use-debounce"

interface ReportsFiltersProps {
  filters: ReportFilters
  onFiltersChange: (filters: ReportFilters) => void
  isLoading?: boolean
}

interface ClassOption {
  id: string
  name: string
}

export function ReportsFilters({
  filters,
  onFiltersChange,
  isLoading = false
}: ReportsFiltersProps) {
  const supabase = createClientComponentClient<Database>()
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [classesLoading, setClassesLoading] = useState(true)
  const [searchInput, setSearchInput] = useState(filters.searchTerm)
  
  // Debounced search value
  const debouncedSearch = useDebounce(searchInput, 300)

  // 반 목록 가져오기
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const { data, error } = await supabase
          .from("classes")
          .select("id, name")
          .order("name")

        if (error) throw error
        setClasses(data || [])
      } catch (error) {
        console.error("반 목록 조회 오류:", error)
      } finally {
        setClassesLoading(false)
      }
    }

    fetchClasses()
  }, [supabase])

  // 검색어 디바운스 처리
  useEffect(() => {
    if (debouncedSearch !== filters.searchTerm) {
      onFiltersChange({
        ...filters,
        searchTerm: debouncedSearch
      })
    }
  }, [debouncedSearch, filters, onFiltersChange])

  // 학교 타입 옵션
  const schoolTypeOptions = [
    { value: "all", label: "전체 학교" },
    { value: "초등학교", label: "초등학교" },
    { value: "중학교", label: "중학교" },
    { value: "고등학교", label: "고등학교" },
  ]

  // 학년 옵션 (학교 타입에 따라 동적으로 변경)
  const getGradeOptions = () => {
    const baseOption = [{ value: "all", label: "전체 학년" }]
    
    switch (filters.schoolType) {
      case "초등학교":
        return [...baseOption, 
          { value: "1", label: "1학년" },
          { value: "2", label: "2학년" },
          { value: "3", label: "3학년" },
          { value: "4", label: "4학년" },
          { value: "5", label: "5학년" },
          { value: "6", label: "6학년" },
        ]
      case "중학교":
      case "고등학교":
        return [...baseOption,
          { value: "1", label: "1학년" },
          { value: "2", label: "2학년" },
          { value: "3", label: "3학년" },
        ]
      default:
        return [...baseOption,
          { value: "1", label: "1학년" },
          { value: "2", label: "2학년" },
          { value: "3", label: "3학년" },
          { value: "4", label: "4학년" },
          { value: "5", label: "5학년" },
          { value: "6", label: "6학년" },
        ]
    }
  }

  // 반 선택 토글
  const toggleClassSelection = (classId: string) => {
    const newClassIds = filters.classIds.includes(classId)
      ? filters.classIds.filter(id => id !== classId)
      : [...filters.classIds, classId]

    onFiltersChange({
      ...filters,
      classIds: newClassIds
    })
  }

  // 전체 반 선택/해제
  const toggleAllClasses = () => {
    const allSelected = filters.classIds.length === classes.length
    onFiltersChange({
      ...filters,
      classIds: allSelected ? [] : classes.map(c => c.id)
    })
  }

  // 필터 초기화
  const resetFilters = () => {
    setSearchInput("")
    onFiltersChange({
      ...filters,
      classIds: [],
      searchTerm: "",
      schoolType: "all",
      grade: "all"
    })
  }

  // 학교 타입 변경 시 학년 초기화
  const handleSchoolTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      schoolType: value as any,
      grade: "all" // 학교 타입 변경 시 학년을 초기화
    })
  }

  const selectedClassNames = classes
    .filter(c => filters.classIds.includes(c.id))
    .map(c => c.name)

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="h-5 w-5" />
          필터 옵션
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 반 선택 */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              반 선택
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  disabled={isLoading || classesLoading}
                >
                  <span className="truncate">
                    {filters.classIds.length === 0
                      ? "전체 반"
                      : filters.classIds.length === classes.length
                      ? "전체 반"
                      : `${filters.classIds.length}개 선택`}
                  </span>
                  <Badge variant="secondary" className="ml-2">
                    {filters.classIds.length}
                  </Badge>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <div className="p-4 border-b">
                  <div
                    className="flex items-center gap-2 w-full p-2 hover:bg-accent rounded-md cursor-pointer"
                    onClick={toggleAllClasses}
                  >
                    <Checkbox
                      checked={filters.classIds.length === classes.length}
                      onCheckedChange={() => {}} // 클릭은 상위 div에서 처리
                    />
                    <span className="text-sm">전체 선택</span>
                  </div>
                </div>
                <div className="max-h-[300px] overflow-y-auto p-2">
                  {classes.map((cls) => (
                    <div
                      key={cls.id}
                      className="flex items-center gap-2 w-full p-2 hover:bg-accent rounded-md cursor-pointer mb-1"
                      onClick={() => toggleClassSelection(cls.id)}
                    >
                      <Checkbox
                        checked={filters.classIds.includes(cls.id)}
                        onCheckedChange={() => {}} // 클릭은 상위 div에서 처리
                      />
                      <span className="text-sm">{cls.name}</span>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            {selectedClassNames.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedClassNames.slice(0, 3).map((name) => (
                  <Badge key={name} variant="secondary" className="text-xs">
                    {name}
                  </Badge>
                ))}
                {selectedClassNames.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{selectedClassNames.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* 학생 검색 */}
          <div className="space-y-2">
            <Label htmlFor="search" className="flex items-center gap-1">
              <Search className="h-4 w-4" />
              학생 검색
            </Label>
            <Input
              id="search"
              placeholder="이름으로 검색..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* 학교 타입 필터 */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <School className="h-4 w-4" />
              학교 구분
            </Label>
            <Select
              value={filters.schoolType}
              onValueChange={handleSchoolTypeChange}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="학교 선택" />
              </SelectTrigger>
              <SelectContent>
                {schoolTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 학년 필터 */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <School className="h-4 w-4" />
              학년
            </Label>
            <Select
              value={filters.grade.toString()}
              onValueChange={(value) => onFiltersChange({
                ...filters,
                grade: value as any
              })}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="학년 선택" />
              </SelectTrigger>
              <SelectContent>
                {getGradeOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 필터 초기화 버튼 */}
        {(filters.classIds.length > 0 || filters.searchTerm || filters.schoolType !== "all" || filters.grade !== "all") && (
          <div className="mt-4 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              disabled={isLoading}
            >
              필터 초기화
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}