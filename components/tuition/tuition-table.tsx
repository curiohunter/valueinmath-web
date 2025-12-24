"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowDown, FileText, Trash2, RotateCcw, ChevronLeft, ChevronRight, Search, ChevronDown, FileSpreadsheet, ChevronsLeftRight, ChevronsRightLeft, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { TuitionRow as TuitionTableRow } from "./tuition-row"
import type { TuitionRow } from "@/types/tuition"

interface TuitionTableProps {
  rows: TuitionRow[]
  originalRows?: TuitionRow[]
  totalFilteredCount?: number // 전체 필터된 데이터 건수 (페이지네이션 전)
  onRowChange?: (index: number, field: keyof TuitionRow, value: any) => void
  onRowDelete?: (index: number) => void
  onRowSave?: (index: number) => void // 개별 저장 핸들러
  onBulkApply?: (field: string) => void
  onBulkDelete?: () => void
  onDeleteAll?: () => void
  onSave?: () => void
  isSaving?: boolean
  selectedRows?: number[]
  totalSelectedCount?: number // 전체 선택된 건수 (페이지네이션 무관)
  onRowSelect?: (index: number, selected: boolean) => void
  onSelectAll?: (selected: boolean) => void
  onSelectAllFiltered?: () => void // 필터된 전체 데이터 선택
  searchTerm?: string
  onSearchChange?: (value: string) => void
  paymentStatusFilter?: string
  onPaymentStatusFilterChange?: (value: string) => void
  classTypeFilter?: string
  onClassTypeFilterChange?: (value: string) => void
  isReadOnly?: boolean
  showSearchAndFilter?: boolean
  isHistoryMode?: boolean // 이력 모드 여부
  // 월범위 모드용 편집/삭제 핸들러
  onEdit?: (row: TuitionRow) => void
  onDeleteRow?: (row: TuitionRow) => void
  // 이력 모드용 날짜 필터
  dateRange?: { from: string; to: string }
  onDateRangeChange?: (range: { from: string; to: string }) => void
  onResetFilters?: () => void
  // 사이드바 토글 관련
  isSidebarOpen?: boolean
  onToggleSidebar?: () => void
  // 반별 중복선택 관련
  classOptions?: Array<{ id: string; name: string; teacher_id?: string | null }>
  selectedClasses?: string[]
  onClassSelectionChange?: (classes: string[]) => void
  // 학생 중복선택 관련
  studentOptions?: Array<{ id: string; name: string }>
  selectedStudents?: string[]
  onStudentSelectionChange?: (students: string[]) => void
  // 선생님 정보
  teachers?: Array<{ id: string; name: string }>
  // 검색 실행 핸들러
  onSearch?: () => void
  // 엑셀 내보내기 핸들러
  onExport?: () => void
  // 데이터 새로고침 핸들러 (PaysSam 액션 후)
  onRefresh?: () => void
  // 할인 알림 정보
  pendingRewardsByStudent?: Record<string, any[]>  // studentId -> rewards[]
  siblingCandidates?: Record<string, string[]>  // studentId -> [siblingStudentIds]
  // 이벤트 적용 콜백 (creation mode: participantId와 금액, history mode: index와 participantId)
  onApplyEvent?: (arg1: any, arg2: any) => void
  // 할인 정책 목록 (학생별로 적용 가능한 정책)
  policiesByStudent?: Record<string, any[]>  // studentId -> policies[]
  // 정책 적용 콜백 (creation mode: policy와 금액, history mode: index와 policyId)
  onApplyPolicy?: (arg1: any, arg2: any) => void
  // 할인 취소 콜백
  onCancelDiscount?: (index: number, discountId: string) => void
}

export function TuitionTable({
  rows,
  originalRows = [],
  totalFilteredCount,
  onRowChange,
  onRowDelete,
  onRowSave,
  onBulkApply,
  onBulkDelete,
  onDeleteAll,
  onSave,
  isSaving = false,
  selectedRows = [],
  totalSelectedCount,
  onRowSelect,
  onSelectAll,
  onSelectAllFiltered,
  searchTerm = "",
  onSearchChange,
  paymentStatusFilter = "all",
  onPaymentStatusFilterChange,
  classTypeFilter = "all",
  onClassTypeFilterChange,
  isReadOnly = false,
  showSearchAndFilter = true,
  isHistoryMode = false,
  onEdit,
  onDeleteRow,
  dateRange,
  onDateRangeChange,
  onResetFilters,
  isSidebarOpen = true,
  onToggleSidebar,
  classOptions = [],
  selectedClasses = [],
  onClassSelectionChange,
  studentOptions = [],
  selectedStudents = [],
  onStudentSelectionChange,
  teachers = [],
  onSearch,
  onExport,
  onRefresh,
  pendingRewardsByStudent = {},
  siblingCandidates = {},
  onApplyEvent,
  policiesByStudent = {},
  onApplyPolicy,
  onCancelDiscount
}: TuitionTableProps) {
  const allSelected = rows.length > 0 && selectedRows.length === rows.length
  const someSelected = selectedRows.length > 0 && selectedRows.length < rows.length
  const [studentSearchTerm, setStudentSearchTerm] = useState("")
  const [selectMenuOpen, setSelectMenuOpen] = useState(false)
  // 연월+기간 컬럼 접힘 상태 (기본: 접힘)
  const [isDateColumnsCollapsed, setIsDateColumnsCollapsed] = useState(true)
  // 사용자 지정 기간 모드
  const [isCustomRange, setIsCustomRange] = useState(false)
  // 사용자 지정 기간용 임시 상태
  const [customFrom, setCustomFrom] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 })
  const [customTo, setCustomTo] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 })

  // 전체 필터된 데이터 건수 (페이지네이션 전)
  const filteredCount = totalFilteredCount ?? originalRows.length

  return (
    <div className="flex-1">
      <div className="w-full">
        {/* 검색 및 필터링 바 */}
        <div className="bg-white rounded-t-xl shadow-sm border border-b-0 p-4">
          <div className="flex items-center gap-4 mb-3">
            {/* 사이드바 토글 버튼 */}
            {onToggleSidebar && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleSidebar}
                className="h-8 w-8 p-0 bg-white border shadow-sm hover:bg-gray-50"
              >
                {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            )}
            <h2 className="text-lg font-semibold text-gray-800">학원비 관리</h2>
          </div>
          {isHistoryMode ? (
            <div className="flex flex-col gap-3">
              {/* 월 네비게이션 바 */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* 이전달 버튼 */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // 현재 선택된 월에서 1개월 전으로 이동
                    const currentFrom = dateRange?.from ? new Date(dateRange.from) : new Date()
                    const prevMonth = new Date(currentFrom.getFullYear(), currentFrom.getMonth() - 1, 1)
                    const lastDay = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate()
                    const from = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`
                    const to = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-${lastDay}`
                    onDateRangeChange?.({ from, to })
                    setIsCustomRange(false)
                  }}
                  className="h-9 px-3"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  전달
                </Button>

                {/* 현재 월 표시 + 클릭 시 월 선택 팝오버 */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 px-4 min-w-[140px] font-medium bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      {dateRange?.from ? (() => {
                        const fromYear = parseInt(dateRange.from.substring(0, 4))
                        const fromMonth = parseInt(dateRange.from.substring(5, 7))
                        const toYear = dateRange.to ? parseInt(dateRange.to.substring(0, 4)) : fromYear
                        const toMonth = dateRange.to ? parseInt(dateRange.to.substring(5, 7)) : fromMonth

                        // 같은 월이면 단일 월 표시
                        if (fromYear === toYear && fromMonth === toMonth) {
                          return `${fromYear}년 ${fromMonth}월`
                        }
                        // 다른 월이면 범위 표시
                        return `${fromYear}.${fromMonth} ~ ${toYear}.${toMonth}`
                      })() : "월 선택"}
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-3" align="start">
                    <div className="space-y-3">
                      {/* 연도 선택 */}
                      <div className="flex items-center justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const currentYear = dateRange?.from ? parseInt(dateRange.from.substring(0, 4)) : new Date().getFullYear()
                            const currentMonth = dateRange?.from ? parseInt(dateRange.from.substring(5, 7)) : new Date().getMonth() + 1
                            const newYear = currentYear - 1
                            const lastDay = new Date(newYear, currentMonth, 0).getDate()
                            onDateRangeChange?.({
                              from: `${newYear}-${String(currentMonth).padStart(2, '0')}-01`,
                              to: `${newYear}-${String(currentMonth).padStart(2, '0')}-${lastDay}`
                            })
                          }}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="font-semibold text-lg">
                          {dateRange?.from ? dateRange.from.substring(0, 4) : new Date().getFullYear()}년
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const currentYear = dateRange?.from ? parseInt(dateRange.from.substring(0, 4)) : new Date().getFullYear()
                            const currentMonth = dateRange?.from ? parseInt(dateRange.from.substring(5, 7)) : new Date().getMonth() + 1
                            const newYear = currentYear + 1
                            const lastDay = new Date(newYear, currentMonth, 0).getDate()
                            onDateRangeChange?.({
                              from: `${newYear}-${String(currentMonth).padStart(2, '0')}-01`,
                              to: `${newYear}-${String(currentMonth).padStart(2, '0')}-${lastDay}`
                            })
                          }}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* 월 그리드 (3x4) */}
                      <div className="grid grid-cols-4 gap-1">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                          const currentYear = dateRange?.from ? parseInt(dateRange.from.substring(0, 4)) : new Date().getFullYear()
                          const selectedMonth = dateRange?.from ? parseInt(dateRange.from.substring(5, 7)) : 0
                          const isSelected = selectedMonth === month
                          const isCurrentMonth = new Date().getFullYear() === currentYear && new Date().getMonth() + 1 === month

                          return (
                            <Button
                              key={month}
                              variant={isSelected ? "default" : "ghost"}
                              size="sm"
                              className={cn(
                                "h-9",
                                isSelected && "bg-blue-600 text-white hover:bg-blue-700",
                                isCurrentMonth && !isSelected && "border border-blue-300 text-blue-600"
                              )}
                              onClick={() => {
                                const lastDay = new Date(currentYear, month, 0).getDate()
                                onDateRangeChange?.({
                                  from: `${currentYear}-${String(month).padStart(2, '0')}-01`,
                                  to: `${currentYear}-${String(month).padStart(2, '0')}-${lastDay}`
                                })
                                setIsCustomRange(false)
                              }}
                            >
                              {month}월
                            </Button>
                          )
                        })}
                      </div>

                      {/* 빠른 선택 프리셋 */}
                      <div className="border-t pt-2 flex gap-1 flex-wrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => {
                            const today = new Date()
                            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
                            onDateRangeChange?.({
                              from: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`,
                              to: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${lastDay}`
                            })
                            setIsCustomRange(false)
                          }}
                        >
                          이번달
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => {
                            const today = new Date()
                            const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
                            const lastDay = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate()
                            onDateRangeChange?.({
                              from: `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`,
                              to: `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-${lastDay}`
                            })
                            setIsCustomRange(false)
                          }}
                        >
                          지난달
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => {
                            const today = new Date()
                            const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1)
                            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
                            onDateRangeChange?.({
                              from: `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`,
                              to: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${lastDay}`
                            })
                            setIsCustomRange(true) // 기간 범위이므로 true
                            setCustomFrom({ year: threeMonthsAgo.getFullYear(), month: threeMonthsAgo.getMonth() + 1 })
                            setCustomTo({ year: today.getFullYear(), month: today.getMonth() + 1 })
                          }}
                        >
                          최근 3개월
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* 다음달 버튼 */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // 현재 선택된 월에서 1개월 후로 이동
                    const currentTo = dateRange?.to ? new Date(dateRange.to) : new Date()
                    const nextMonth = new Date(currentTo.getFullYear(), currentTo.getMonth() + 1, 1)
                    const lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate()
                    const from = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`
                    const to = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-${lastDay}`
                    onDateRangeChange?.({ from, to })
                    setIsCustomRange(false)
                  }}
                  className="h-9 px-3"
                >
                  다음달
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>

                <span className="text-gray-300 mx-1">|</span>

                {/* 사용자 지정 기간 버튼 */}
                <Button
                  variant={isCustomRange ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    if (!isCustomRange) {
                      // 현재 dateRange로 초기화
                      if (dateRange?.from) {
                        setCustomFrom({
                          year: parseInt(dateRange.from.substring(0, 4)),
                          month: parseInt(dateRange.from.substring(5, 7))
                        })
                      }
                      if (dateRange?.to) {
                        setCustomTo({
                          year: parseInt(dateRange.to.substring(0, 4)),
                          month: parseInt(dateRange.to.substring(5, 7))
                        })
                      }
                    }
                    setIsCustomRange(!isCustomRange)
                  }}
                  className={cn(
                    "h-9 px-3",
                    isCustomRange && "bg-indigo-600 hover:bg-indigo-700"
                  )}
                >
                  <ChevronsLeftRight className="w-4 h-4 mr-1" />
                  기간 지정
                </Button>
              </div>

              {/* 사용자 지정 기간 선택 UI */}
              {isCustomRange && (
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-sm text-gray-600 font-medium">기간:</span>

                  {/* 시작 연월 */}
                  <div className="flex items-center gap-1">
                    <Select
                      value={String(customFrom.year)}
                      onValueChange={(year) => setCustomFrom(prev => ({ ...prev, year: parseInt(year) }))}
                    >
                      <SelectTrigger className="w-[85px] h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                          <SelectItem key={year} value={String(year)}>{year}년</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={String(customFrom.month)}
                      onValueChange={(month) => setCustomFrom(prev => ({ ...prev, month: parseInt(month) }))}
                    >
                      <SelectTrigger className="w-[70px] h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                          <SelectItem key={month} value={String(month)}>{month}월</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <span className="text-gray-400">~</span>

                  {/* 종료 연월 */}
                  <div className="flex items-center gap-1">
                    <Select
                      value={String(customTo.year)}
                      onValueChange={(year) => setCustomTo(prev => ({ ...prev, year: parseInt(year) }))}
                    >
                      <SelectTrigger className="w-[85px] h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                          <SelectItem key={year} value={String(year)}>{year}년</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={String(customTo.month)}
                      onValueChange={(month) => setCustomTo(prev => ({ ...prev, month: parseInt(month) }))}
                    >
                      <SelectTrigger className="w-[70px] h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                          <SelectItem key={month} value={String(month)}>{month}월</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 적용 버튼 */}
                  <Button
                    size="sm"
                    onClick={() => {
                      const fromLastDay = new Date(customFrom.year, customFrom.month, 0).getDate()
                      const toLastDay = new Date(customTo.year, customTo.month, 0).getDate()
                      onDateRangeChange?.({
                        from: `${customFrom.year}-${String(customFrom.month).padStart(2, '0')}-01`,
                        to: `${customTo.year}-${String(customTo.month).padStart(2, '0')}-${toLastDay}`
                      })
                    }}
                    className="h-8 px-4 bg-indigo-600 hover:bg-indigo-700"
                  >
                    적용
                  </Button>

                  {/* 닫기 버튼 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCustomRange(false)}
                    className="h-8 px-2 text-gray-500"
                  >
                    ✕
                  </Button>
                </div>
              )}

              {/* 필터 행 */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] gap-3 items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="학생명, 반명, 비고로 검색..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange?.(e.target.value)}
                    className="pl-10"
                  />
                </div>
              <div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between text-sm font-normal"
                    >
                      {selectedClasses.length === 0
                        ? "반 선택"
                        : selectedClasses.length === 1
                        ? classOptions.find(c => c.id === selectedClasses[0])?.name || "반 선택"
                        : `${selectedClasses.length}개 반 선택`
                      }
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-0">
                    <div className="max-h-64 overflow-y-auto">
                      <div className="p-2 border-b">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs"
                          onClick={() => {
                            if (selectedClasses.length === classOptions.length) {
                              onClassSelectionChange?.([]);
                            } else {
                              onClassSelectionChange?.(classOptions.map(c => c.id));
                            }
                          }}
                        >
                          {selectedClasses.length === classOptions.length ? "전체 해제" : "전체 선택"}
                        </Button>
                      </div>
                      <div className="p-2 space-y-3">
                        {/* 담당 선생님별로 그룹화 */}
                        {(() => {
                          // 담당 선생님별로 반 그룹화
                          const groupedClasses = classOptions.reduce((acc: { [key: string]: any[] }, cls) => {
                            const teacherId = cls.teacher_id || 'unassigned';
                            if (!acc[teacherId]) acc[teacherId] = [];
                            acc[teacherId].push(cls);
                            return acc;
                          }, {});
                          
                          // 각 그룹 내에서 반 이름으로 정렬
                          Object.values(groupedClasses).forEach(group => {
                            group.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
                          });
                          
                          // 선생님 ID 정렬 (미배정은 맨 아래)
                          const sortedTeacherIds = Object.keys(groupedClasses).sort((a, b) => {
                            if (a === 'unassigned') return 1;
                            if (b === 'unassigned') return -1;
                            const teacherA = teachers.find(t => t.id === a)?.name || a;
                            const teacherB = teachers.find(t => t.id === b)?.name || b;
                            return teacherA.localeCompare(teacherB, 'ko');
                          });
                          
                          return sortedTeacherIds.map(teacherId => {
                            const teacher = teachers.find(t => t.id === teacherId);
                            const teacherName = teacher?.name || (teacherId === 'unassigned' ? '미배정' : teacherId);
                            const teacherClasses = groupedClasses[teacherId];
                            
                            return (
                              <div key={teacherId}>
                                {/* 담당 선생님 헤더 */}
                                <div className="px-2 py-1 bg-gray-100 rounded text-xs font-semibold text-gray-600">
                                  {teacherName} 담당
                                </div>
                                {/* 해당 선생님의 반 목록 */}
                                <div className="ml-2 space-y-1 mt-1">
                                  {teacherClasses.map((classOption: any) => (
                                    <div
                                      key={classOption.id}
                                      className="flex items-center space-x-2 py-1.5 px-2 rounded hover:bg-gray-100"
                                    >
                                      <Checkbox
                                        id={`class-${classOption.id}`}
                                        checked={selectedClasses.includes(classOption.id)}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            onClassSelectionChange?.([...selectedClasses, classOption.id]);
                                          } else {
                                            onClassSelectionChange?.(selectedClasses.filter(id => id !== classOption.id));
                                          }
                                        }}
                                      />
                                      <label 
                                        htmlFor={`class-${classOption.id}`}
                                        className="text-sm cursor-pointer flex-1"
                                      >
                                        {classOption.name}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between text-sm font-normal"
                    >
                      {selectedStudents.length === 0
                        ? "학생 선택"
                        : selectedStudents.length === 1
                        ? studentOptions.find(s => s.id === selectedStudents[0])?.name || "학생 선택"
                        : `${selectedStudents.length}명 선택`
                      }
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-0">
                    <div className="max-h-64 overflow-y-auto">
                      <div className="p-2 border-b">
                        <Input
                          placeholder="학생 검색..."
                          value={studentSearchTerm}
                          onChange={(e) => setStudentSearchTerm(e.target.value)}
                          className="mb-2"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs"
                          onClick={() => {
                            if (selectedStudents.length === studentOptions.length) {
                              onStudentSelectionChange?.([]);
                            } else {
                              onStudentSelectionChange?.(studentOptions.map(s => s.id));
                            }
                          }}
                        >
                          {selectedStudents.length === studentOptions.length ? "전체 해제" : "전체 선택"}
                        </Button>
                      </div>
                      <div className="p-2 space-y-1">
                        {studentOptions
                          .filter(student => 
                            !studentSearchTerm || student.name.toLowerCase().includes(studentSearchTerm.toLowerCase())
                          )
                          .map((student) => (
                            <div
                              key={student.id}
                              className="flex items-center space-x-2 py-1.5 px-2 rounded hover:bg-gray-100"
                            >
                              <Checkbox
                                id={`student-${student.id}`}
                                checked={selectedStudents.includes(student.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    onStudentSelectionChange?.([...selectedStudents, student.id]);
                                  } else {
                                    onStudentSelectionChange?.(selectedStudents.filter(id => id !== student.id));
                                  }
                                }}
                              />
                              <label 
                                htmlFor={`student-${student.id}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                {student.name}
                              </label>
                            </div>
                          ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => onPaymentStatusFilterChange?.(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">전체 납부상태</option>
                  <option value="미납">미납</option>
                  <option value="완납">완납</option>
                  <option value="분할청구">분할청구</option>
                </select>
              </div>
              <div>
                <select
                  value={classTypeFilter}
                  onChange={(e) => onClassTypeFilterChange?.(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">전체 수업유형</option>
                  <option value="정규">정규</option>
                  <option value="특강">특강</option>
                  <option value="모의고사비">모의고사</option>
                  <option value="입학테스트비">입학테스트</option>
                </select>
              </div>
              <div className="flex gap-2">
                {onSearch && (
                  <Button
                    onClick={onSearch}
                    variant="default"
                    className="h-10 px-4"
                    title="검색"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    검색
                  </Button>
                )}
                {onExport && (
                  <Button
                    onClick={onExport}
                    variant="outline"
                    className="h-10 px-4 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                    title="엑셀 내보내기"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    엑셀
                  </Button>
                )}
                <Button
                  onClick={onResetFilters}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  title="필터 초기화"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            </div>
          ) : null}
          {(searchTerm || paymentStatusFilter !== "all" || (classTypeFilter && classTypeFilter !== "all")) && (
            <div className="mt-3">
              <Badge variant="secondary" className="text-xs">
                {rows.length} / {originalRows.length}건 표시
              </Badge>
            </div>
          )}
        </div>

        <div className="bg-white rounded-b-xl shadow-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 border-b border-slate-200">
                  {!isReadOnly && onRowSelect && (
                    <th className="w-12 px-3 py-4 text-center">
                      <Popover open={selectMenuOpen} onOpenChange={setSelectMenuOpen}>
                        <PopoverTrigger asChild>
                          <button
                            className="relative flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={allSelected || ((totalSelectedCount ?? selectedRows.length) > 0 && (totalSelectedCount ?? selectedRows.length) >= filteredCount)}
                              ref={(el) => {
                                if (el) {
                                  const totalSelected = totalSelectedCount ?? selectedRows.length;
                                  el.indeterminate = (someSelected && totalSelected < filteredCount) || (totalSelected > 0 && totalSelected < filteredCount && !allSelected);
                                }
                              }}
                              readOnly
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 pointer-events-none"
                            />
                            <ChevronDown className="absolute -right-2 -bottom-1 w-3 h-3 text-gray-400" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-1" align="start">
                          <div className="space-y-1">
                            {/* 이 페이지 선택/해제 */}
                            <button
                              onClick={() => {
                                if (allSelected) {
                                  onSelectAll?.(false)
                                } else {
                                  onSelectAll?.(true)
                                }
                                setSelectMenuOpen(false)
                              }}
                              className="w-full flex items-center justify-between px-3 py-2 text-sm rounded hover:bg-gray-100 transition-colors"
                            >
                              <span>{allSelected ? '이 페이지 해제' : '이 페이지 선택'}</span>
                              <Badge variant="secondary" className="text-xs">
                                {rows.length}건
                              </Badge>
                            </button>

                            {/* 전체 선택 (페이지네이션 전체) */}
                            {onSelectAllFiltered && filteredCount > rows.length && (
                              <button
                                onClick={() => {
                                  onSelectAllFiltered()
                                  setSelectMenuOpen(false)
                                }}
                                className="w-full flex items-center justify-between px-3 py-2 text-sm rounded hover:bg-blue-50 text-blue-600 transition-colors"
                              >
                                <span>전체 선택</span>
                                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                                  {filteredCount}건
                                </Badge>
                              </button>
                            )}

                            {/* 선택 해제 */}
                            {(totalSelectedCount ?? selectedRows.length) > 0 && (
                              <>
                                <div className="border-t my-1" />
                                <button
                                  onClick={() => {
                                    onSelectAll?.(false)
                                    setSelectMenuOpen(false)
                                  }}
                                  className="w-full flex items-center justify-between px-3 py-2 text-sm rounded hover:bg-red-50 text-red-600 transition-colors"
                                >
                                  <span>선택 해제</span>
                                  <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">
                                    {totalSelectedCount ?? selectedRows.length}건
                                  </Badge>
                                </button>
                              </>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </th>
                  )}
                  <th className="px-3 py-4 text-left font-semibold text-slate-700">
                    반명
                  </th>
                  <th className="px-3 py-4 text-left font-semibold text-slate-700">
                    학생명
                  </th>
                  <th className="px-2 py-4 text-left font-semibold text-slate-700">
                    할인
                  </th>
                  {/* 연월+기간 접힘 상태일 때 */}
                  {isDateColumnsCollapsed ? (
                    <th className="px-3 py-4 text-left font-semibold text-slate-700">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600"
                        onClick={() => setIsDateColumnsCollapsed(false)}
                        title="연월/기간 펼치기"
                      >
                        <ChevronsLeftRight className="w-3 h-3 mr-1" />
                        날짜
                      </Button>
                    </th>
                  ) : (
                    <>
                      <th className="px-3 py-4 text-left font-semibold text-slate-700">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0 hover:bg-slate-200 text-slate-500"
                            onClick={() => setIsDateColumnsCollapsed(true)}
                            title="연월/기간 접기"
                          >
                            <ChevronsRightLeft className="w-3 h-3" />
                          </Button>
                          연월
                          {!isReadOnly && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-6 h-6 p-0 hover:bg-blue-100 text-blue-600"
                              onClick={() => onBulkApply?.('yearMonth')}
                            >
                              <ArrowDown className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </th>
                    </>
                  )}
                  <th className="px-3 py-4 text-left font-semibold text-slate-700">
                    <div className="flex items-center gap-2">
                      수업유형
                      {!isReadOnly && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-6 h-6 p-0 hover:bg-blue-100 text-blue-600"
                          onClick={() => onBulkApply?.('classType')}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </th>
                  <th className="px-3 py-4 text-right font-semibold text-slate-700">
                    <div className="flex items-center justify-end gap-2">
                      원비
                      {!isReadOnly && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-6 h-6 p-0 hover:bg-blue-100 text-blue-600"
                          onClick={() => onBulkApply?.('amount')}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </th>
                  {/* 기간 컬럼 - 펼침 상태에서만 */}
                  {!isDateColumnsCollapsed && (
                    <th className="px-3 py-4 text-left font-semibold text-slate-700">
                      <div className="flex items-center gap-2">
                        수업 기간
                        {!isReadOnly && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-6 h-6 p-0 hover:bg-blue-100 text-blue-600"
                              onClick={() => {
                                onBulkApply?.('periodStartDate');
                                onBulkApply?.('periodEndDate');
                              }}
                              title="첫 번째 행의 날짜를 모든 행에 적용"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </th>
                  )}
                  <th className="px-3 py-4 text-left font-semibold text-slate-700">
                    <div className="flex items-center gap-2">
                      납부상태
                      {!isReadOnly && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-6 h-6 p-0 hover:bg-blue-100 text-blue-600"
                          onClick={() => onBulkApply?.('paymentStatus')}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </th>
                  <th className="px-3 py-4 text-left font-semibold text-slate-700">
                    <div className="flex items-center gap-2">
                      비고
                      <span className="text-[10px] text-slate-400 font-normal">(구분: /)</span>
                      {!isReadOnly && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-6 h-6 p-0 hover:bg-blue-100 text-blue-600"
                          onClick={() => onBulkApply?.('note')}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </th>
                  {isHistoryMode && (
                    <th className="px-3 py-4 text-left font-semibold text-slate-700">
                      청구 상태
                    </th>
                  )}
                  {!isReadOnly && (
                    <th className="px-3 py-4 text-center font-semibold text-slate-700">
                      {isHistoryMode ? "관리" : "삭제"}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, index) => {
                  const studentRewards = pendingRewardsByStudent[row.studentId] || []
                  const hasPendingRewards = studentRewards.length > 0
                  const hasSiblingCandidate = !!siblingCandidates[row.studentId]
                  const studentPolicies = policiesByStudent[row.studentId] || []

                  return (
                    <TuitionTableRow
                      key={`${row.classId}-${row.studentId}-${index}`}
                      row={row}
                      index={index}
                      isSelected={selectedRows.includes(index)}
                      onChange={onRowChange}
                      onDelete={onRowDelete}
                      onSelect={onRowSelect}
                      onSave={onRowSave}
                      onRefresh={onRefresh}
                      isReadOnly={isReadOnly}
                      isHistoryMode={isHistoryMode}
                      isDateColumnsCollapsed={isDateColumnsCollapsed}
                      hasPendingRewards={hasPendingRewards}
                      pendingRewardsCount={studentRewards.length}
                      hasSiblingCandidate={hasSiblingCandidate}
                      pendingEvents={studentRewards}
                      onApplyEvent={onApplyEvent}
                      availablePolicies={studentPolicies}
                      onApplyPolicy={onApplyPolicy}
                      onCancelDiscount={onCancelDiscount}
                    />
                  )
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-6 py-16 text-center">
                      <div className="text-slate-300 text-6xl mb-4">💰</div>
                      <div className="text-lg font-medium text-slate-500 mb-2">
                        학원비 데이터가 없습니다
                      </div>
                      <div className="text-sm text-slate-400">
                        왼쪽에서 반과 학생을 추가하거나 월별 자동 생성을 실행해 주세요
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 하단 액션 바 */}
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-t border-slate-200">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-6">
                <div className="text-sm text-slate-600">
                  총 <span className="font-semibold text-blue-600">{rows.length}</span>개의 학원비 기록
                </div>
                {rows.length > 0 && (
                  <>
                    <div className="text-sm text-slate-600 border-l pl-6 border-slate-300">
                      총 금액: <span className="font-bold text-lg text-blue-600">{rows.filter(r => r.paymentStatus !== '분할청구').reduce((sum, row) => sum + row.amount, 0).toLocaleString()}원</span>
                      {rows.filter(r => r.paymentStatus === '분할청구').length > 0 && (
                        <span className="ml-1 text-xs text-slate-400">(분할납부 제외)</span>
                      )}
                    </div>
                    <div className="text-sm text-slate-600 border-l pl-6 border-slate-300">
                      <span className="text-green-600">
                        완납: {rows.filter(r => r.paymentStatus === '완납').reduce((sum, r) => sum + r.amount, 0).toLocaleString()}원
                        ({rows.filter(r => r.paymentStatus === '완납').length}명)
                      </span>
                      {rows.filter(r => r.paymentStatus === '미납').length > 0 && (
                        <span className="ml-3 text-red-600">
                          미납: {rows.filter(r => r.paymentStatus === '미납').reduce((sum, r) => sum + r.amount, 0).toLocaleString()}원
                          ({rows.filter(r => r.paymentStatus === '미납').length}명)
                        </span>
                      )}
                    </div>
                  </>
                )}
                {(totalSelectedCount ?? selectedRows.length) > 0 && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    {totalSelectedCount ?? selectedRows.length}개 선택됨
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                {!isReadOnly && (
                  <>
                    {selectedRows.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onBulkDelete}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        선택 삭제
                      </Button>
                    )}
                    
                    {!isHistoryMode && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onDeleteAll}
                          className="border-slate-200 hover:bg-slate-50"
                        >
                          전체 삭제
                        </Button>
                        
                        <Button
                          onClick={onSave}
                          disabled={isSaving || rows.length === 0}
                          size="sm"
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium shadow-md transition-all duration-200 hover:shadow-lg"
                        >
                          {isSaving ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              저장 중...
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              저장
                            </div>
                          )}
                        </Button>
                      </>
                    )}
                  </>
                )}
                
                {/* 읽기 전용 모드 안내 */}
                {isReadOnly && (
                  <div className="text-sm text-gray-500 italic">
                    📖 읽기 전용 모드 - 데이터 조회만 가능합니다
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}