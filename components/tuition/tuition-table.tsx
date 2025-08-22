"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowDown, FileText, Trash2, RotateCcw, ChevronLeft, ChevronRight, Search, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { TuitionRow as TuitionTableRow } from "./tuition-row"
import type { TuitionRow } from "@/types/tuition"

interface TuitionTableProps {
  rows: TuitionRow[]
  originalRows?: TuitionRow[]
  onRowChange?: (index: number, field: keyof TuitionRow, value: any) => void
  onRowDelete?: (index: number) => void
  onRowSave?: (index: number) => void // 개별 저장 핸들러
  onBulkApply?: (field: string) => void
  onBulkDelete?: () => void
  onDeleteAll?: () => void
  onSave?: () => void
  isSaving?: boolean
  selectedRows?: number[]
  onRowSelect?: (index: number, selected: boolean) => void
  onSelectAll?: (selected: boolean) => void
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
}

export function TuitionTable({
  rows,
  originalRows = [],
  onRowChange,
  onRowDelete,
  onRowSave,
  onBulkApply,
  onBulkDelete,
  onDeleteAll,
  onSave,
  isSaving = false,
  selectedRows = [],
  onRowSelect,
  onSelectAll,
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
  onSearch
}: TuitionTableProps) {
  const allSelected = rows.length > 0 && selectedRows.length === rows.length
  const someSelected = selectedRows.length > 0 && selectedRows.length < rows.length
  const [studentSearchTerm, setStudentSearchTerm] = useState("")

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
            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-3">
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
                <Input
                  type="month"
                  value={dateRange?.from ? dateRange.from.substring(0, 7) : ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                      onDateRangeChange?.({ ...dateRange!, from: value + "-01" });
                    } else {
                      onDateRangeChange?.({ ...dateRange!, from: "" });
                    }
                  }}
                  placeholder="시작 연월"
                  className="text-sm"
                />
              </div>
              <div>
                <Input
                  type="month"
                  value={dateRange?.to ? dateRange.to.substring(0, 7) : ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                      const [year, month] = value.split('-').map(Number);
                      const lastDay = new Date(year, month, 0).getDate();
                      onDateRangeChange?.({ ...dateRange!, to: `${value}-${lastDay.toString().padStart(2, '0')}` });
                    } else {
                      onDateRangeChange?.({ ...dateRange!, to: "" });
                    }
                  }}
                  placeholder="종료 연월"
                  className="text-sm"
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
                  <option value="부분납">부분납</option>
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
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected
                        }}
                        onChange={(e) => onSelectAll?.(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                  )}
                  <th className="px-3 py-4 text-left font-semibold text-slate-700">
                    반명
                  </th>
                  <th className="px-3 py-4 text-left font-semibold text-slate-700">
                    학생명
                  </th>
                  <th className="px-3 py-4 text-left font-semibold text-slate-700">
                    <div className="flex items-center gap-2">
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
                  <th className="px-3 py-4 text-center font-semibold text-slate-700">
                    형제할인
                  </th>
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
                    비고
                  </th>
                  {!isReadOnly && (
                    <th className="px-3 py-4 text-center font-semibold text-slate-700">
                      {isHistoryMode ? "관리" : "삭제"}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, index) => (
                  <TuitionTableRow
                    key={`${row.classId}-${row.studentId}-${index}`}
                    row={row}
                    index={index}
                    isSelected={selectedRows.includes(index)}
                    onChange={onRowChange}
                    onDelete={onRowDelete}
                    onSelect={onRowSelect}
                    onSave={onRowSave}
                    isReadOnly={isReadOnly}
                    isHistoryMode={isHistoryMode}
                  />
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-6 py-16 text-center">
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
                      총 금액: <span className="font-bold text-lg text-blue-600">{rows.reduce((sum, row) => sum + row.amount, 0).toLocaleString()}원</span>
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
                {selectedRows.length > 0 && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    {selectedRows.length}개 선택됨
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