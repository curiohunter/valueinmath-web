"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { 
  Filter,
  Calendar as CalendarIcon,
  X,
  Star,
  Tag
} from "lucide-react"
import { CLAUDE_ANALYSIS_TYPES, claudeUtils } from "@/types/claude"
import type { ClaudeSearchFilters, ClaudeAnalysisType } from "@/types/claude"

interface InsightFiltersProps {
  filters: ClaudeSearchFilters
  onFiltersChange: (filters: ClaudeSearchFilters) => void
  availableTags: Array<{ tag: string; count: number }>
}

export function InsightFilters({ filters, onFiltersChange, availableTags }: InsightFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [confidenceRange, setConfidenceRange] = useState([0, 100])

  const handleAnalysisTypeChange = (type: ClaudeAnalysisType) => {
    const currentTypes = filters.analysis_type || []
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type]
    
    onFiltersChange({
      ...filters,
      analysis_type: newTypes.length > 0 ? newTypes : undefined
    })
  }

  const handleStatusChange = (status: 'active' | 'archived') => {
    const currentStatuses = filters.status || []
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status]
    
    onFiltersChange({
      ...filters,
      status: newStatuses.length > 0 ? newStatuses : undefined
    })
  }

  const handleTagChange = (tag: string) => {
    const currentTags = filters.tags || []
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag]
    
    onFiltersChange({
      ...filters,
      tags: newTags.length > 0 ? newTags : undefined
    })
  }

  const handleDateRangeApply = () => {
    if (startDate || endDate) {
      onFiltersChange({
        ...filters,
        date_range: {
          start: startDate?.toISOString() || '',
          end: endDate?.toISOString() || ''
        }
      })
    } else {
      const newFilters = { ...filters }
      delete newFilters.date_range
      onFiltersChange(newFilters)
    }
  }

  const handleConfidenceRangeApply = () => {
    if (confidenceRange[0] > 0 || confidenceRange[1] < 100) {
      onFiltersChange({
        ...filters,
        confidence_range: {
          min: confidenceRange[0] / 100,
          max: confidenceRange[1] / 100
        }
      })
    } else {
      const newFilters = { ...filters }
      delete newFilters.confidence_range
      onFiltersChange(newFilters)
    }
  }

  const clearAllFilters = () => {
    onFiltersChange({})
    setStartDate(undefined)
    setEndDate(undefined)
    setConfidenceRange([0, 100])
  }

  const activeFilterCount = Object.keys(filters).filter(key => {
    const value = filters[key as keyof ClaudeSearchFilters]
    return value !== undefined && 
           (Array.isArray(value) ? value.length > 0 : true)
  }).length

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="relative"
        >
          <Filter className="h-4 w-4 mr-2" />
          필터
          {activeFilterCount > 0 && (
            <Badge className="ml-2 h-5 w-5 p-0 text-xs rounded-full bg-blue-500">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-red-600 hover:text-red-700"
          >
            <X className="h-4 w-4 mr-1" />
            전체 해제
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
          {/* 분석 타입 필터 */}
          <div>
            <label className="text-sm font-medium mb-2 block">분석 타입</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(CLAUDE_ANALYSIS_TYPES).map(([key, info]) => (
                <Button
                  key={key}
                  variant={filters.analysis_type?.includes(key as ClaudeAnalysisType) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleAnalysisTypeChange(key as ClaudeAnalysisType)}
                  className="h-8"
                >
                  <span className="mr-1">{info.icon}</span>
                  {info.name}
                </Button>
              ))}
            </div>
          </div>

          {/* 상태 필터 */}
          <div>
            <label className="text-sm font-medium mb-2 block">상태</label>
            <div className="flex gap-2">
              <Button
                variant={filters.status?.includes('active') ? "default" : "outline"}
                size="sm"
                onClick={() => handleStatusChange('active')}
                className="h-8"
              >
                활성
              </Button>
              <Button
                variant={filters.status?.includes('archived') ? "default" : "outline"}
                size="sm"
                onClick={() => handleStatusChange('archived')}
                className="h-8"
              >
                보관됨
              </Button>
            </div>
          </div>

          {/* 날짜 범위 필터 */}
          <div>
            <label className="text-sm font-medium mb-2 block">날짜 범위</label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {startDate ? startDate.toLocaleDateString('ko-KR') : '시작일'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {endDate ? endDate.toLocaleDateString('ko-KR') : '종료일'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Button onClick={handleDateRangeApply} size="sm" className="h-8">
                적용
              </Button>
            </div>
          </div>

          {/* 신뢰도 범위 필터 */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              신뢰도 범위: {confidenceRange[0]}% - {confidenceRange[1]}%
            </label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Slider
                  value={confidenceRange}
                  onValueChange={setConfidenceRange}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
              <Button onClick={handleConfidenceRangeApply} size="sm" className="h-8">
                적용
              </Button>
            </div>
          </div>

          {/* 태그 필터 */}
          {availableTags.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block">인기 태그</label>
              <div className="flex flex-wrap gap-2">
                {availableTags.slice(0, 10).map(({ tag, count }) => (
                  <Button
                    key={tag}
                    variant={filters.tags?.includes(tag) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTagChange(tag)}
                    className="h-8"
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                    <Badge variant="secondary" className="ml-1 h-4 text-xs">
                      {count}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 활성 필터 표시 */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1">
          {filters.analysis_type?.map(type => (
            <Badge key={type} variant="secondary" className="text-xs">
              {CLAUDE_ANALYSIS_TYPES[type].name}
              <button
                onClick={() => handleAnalysisTypeChange(type)}
                className="ml-1 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          
          {filters.status?.map(status => (
            <Badge key={status} variant="secondary" className="text-xs">
              {status === 'active' ? '활성' : '보관됨'}
              <button
                onClick={() => handleStatusChange(status)}
                className="ml-1 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          
          {filters.tags?.map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
              <button
                onClick={() => handleTagChange(tag)}
                className="ml-1 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          
          {filters.date_range && (
            <Badge variant="secondary" className="text-xs">
              날짜 범위 설정됨
              <button
                onClick={() => {
                  const newFilters = { ...filters }
                  delete newFilters.date_range
                  onFiltersChange(newFilters)
                  setStartDate(undefined)
                  setEndDate(undefined)
                }}
                className="ml-1 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {filters.confidence_range && (
            <Badge variant="secondary" className="text-xs">
              신뢰도 범위 설정됨
              <button
                onClick={() => {
                  const newFilters = { ...filters }
                  delete newFilters.confidence_range
                  onFiltersChange(newFilters)
                  setConfidenceRange([0, 100])
                }}
                className="ml-1 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}