"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Trash2, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"

interface TestLogRow {
  id?: string
  classId: string
  studentId: string
  name: string
  date: string
  testType: string
  test: string
  testScore: number | null
  note: string
  createdBy?: string
  createdByName?: string
  lastModifiedBy?: string
  lastModifiedByName?: string
  updatedAt?: string
}

interface TestLogsMainTableProps {
  rows: TestLogRow[]
  classes: any[]
  students: any[]
  date: string
  filterClassId: string
  isSidebarOpen: boolean
  hasUnsavedChanges: boolean
  deletedRowIds: string[]
  onSidebarToggle: () => void
  onFilterChange: (classId: string) => void
  onRowChange: (idx: number, key: keyof TestLogRow, value: any) => void
  onBulkApply: (key: "test" | "testType" | "testScore") => void
  onDeleteRow: (originalIdx: number) => void
  onClearAll: () => void
  onSave: () => void
  onOpenModal: (rowIdx: number, field: "note", value: string) => void
}

const TEST_TYPE_OPTIONS = [
  { value: "과정총괄테스트", color: "bg-blue-100 text-blue-700" },
  { value: "내용암기테스트", color: "bg-yellow-100 text-yellow-700" },
  { value: "단원테스트", color: "bg-green-100 text-green-700" },
  { value: "모의고사", color: "bg-purple-100 text-purple-700" },
  { value: "서술형평가", color: "bg-pink-100 text-pink-700" },
  { value: "수학경시대회", color: "bg-orange-100 text-orange-700" },
  { value: "오답테스트", color: "bg-red-100 text-red-700" },
  { value: "내신기출유사", color: "bg-gray-100 text-gray-700" },
  { value: "내신기출", color: "bg-black text-white" },
  { value: "학교시험점수", color: "bg-cyan-100 text-cyan-700" },
]

export function TestLogsMainTable({
  rows,
  classes,
  students,
  date,
  filterClassId,
  isSidebarOpen,
  hasUnsavedChanges,
  deletedRowIds,
  onSidebarToggle,
  onFilterChange,
  onRowChange,
  onBulkApply,
  onDeleteRow,
  onClearAll,
  onSave,
  onOpenModal
}: TestLogsMainTableProps) {
  const filteredAndSortedRows = rows
    .filter(row => filterClassId === "all" || row.classId === filterClassId)
    .sort((a, b) => {
      const classA = classes.find(c => c.id === a.classId)?.name || ""
      const classB = classes.find(c => c.id === b.classId)?.name || ""
      if (classA !== classB) return classA.localeCompare(classB, "ko")
      return a.name.localeCompare(b.name, "ko")
    })

  return (
    <Card className="bg-white rounded-xl shadow border overflow-hidden">
      {/* 헤더 섹션 */}
      <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* 사이드바 토글 버튼 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onSidebarToggle}
              className="h-8 w-8 p-0 bg-white border shadow-sm hover:bg-gray-50"
            >
              {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
            
            <h2 className="text-lg font-semibold text-gray-800">테스트 관리</h2>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">반 필터:</span>
              <select
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterClassId}
                onChange={(e) => onFilterChange(e.target.value)}
              >
                <option value="all">전체</option>
                {classes.map((cls: any) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
              {filterClassId !== "all" && (
                <Badge variant="secondary">
                  {filteredAndSortedRows.length}명
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <span className="text-sm text-orange-600 font-medium animate-pulse">
                저장하지 않은 변경사항이 있습니다
              </span>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={onClearAll}
              className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              일괄 삭제
            </Button>
            <Button 
              size="sm"
              onClick={onSave}
              className={`${
                hasUnsavedChanges 
                  ? "bg-red-600 hover:bg-red-700 animate-pulse shadow-lg" 
                  : "bg-blue-600 hover:bg-blue-700"
              } text-white font-medium`}
            >
              {hasUnsavedChanges ? "저장 필요!" : "저장"}
            </Button>
            <Badge variant="outline" className="text-sm font-medium">
              {date}
            </Badge>
          </div>
        </div>
      </div>
      
      {/* 테이블 섹션 */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 w-8"></th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 w-24">학생</th>
              <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700 w-36">날짜</th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <span>테스트</span>
                  <button
                    onClick={() => onBulkApply("test")}
                    className="text-gray-400 hover:text-gray-600"
                    title="첫 번째 값으로 일괄 적용"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <span>유형</span>
                  <button
                    onClick={() => onBulkApply("testType")}
                    className="text-gray-400 hover:text-gray-600"
                    title="첫 번째 값으로 일괄 적용"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </th>
              <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700">
                <div className="flex items-center justify-center gap-2">
                  <span>점수</span>
                  <button
                    onClick={() => onBulkApply("testScore")}
                    className="text-gray-400 hover:text-gray-600"
                    title="첫 번째 값으로 일괄 적용"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 w-32">특이사항</th>
              <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700 w-20">삭제</th>
            </tr>
          </thead>
          <tbody>
            {/* 반별로 그룹화 */}
            {Object.entries(
              filteredAndSortedRows.reduce((groups: { [className: string]: typeof filteredAndSortedRows }, row) => {
                const className = classes.find(c => c.id === row.classId)?.name || row.classId
                if (!groups[className]) {
                  groups[className] = []
                }
                groups[className].push(row)
                return groups
              }, {})
            )
            .sort(([a], [b]) => a.localeCompare(b, "ko"))
            .map(([className, classRows]) => (
              <React.Fragment key={className}>
                {/* 반별 그룹 헤더 */}
                <tr className="bg-gradient-to-r from-green-50 to-emerald-50 border-t-2 border-green-200">
                  <td colSpan={8} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-semibold text-green-800">
                        {className}
                      </span>
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                        {classRows.length}명
                      </span>
                    </div>
                  </td>
                </tr>
                {/* 그룹 내 학생들 */}
                {classRows.map((row, idx) => {
                  const originalIdx = rows.indexOf(row)
                  return (
                    <tr key={originalIdx} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {/* 반 이름은 그룹 헤더에 있으므로 비우기 */}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {row.name || students.find((s: any) => s.id === row.studentId)?.name || row.studentId}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="date"
                          className="w-full max-w-[135px] px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={row.date}
                          onChange={e => onRowChange(originalIdx, "date", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={row.test}
                          onChange={e => onRowChange(originalIdx, "test", e.target.value)}
                          placeholder="테스트명"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={row.testType}
                          onChange={e => onRowChange(originalIdx, "testType", e.target.value)}
                        >
                          <option value="">유형 선택</option>
                          {TEST_TYPE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.value}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={row.testScore ?? ""}
                          onChange={e => onRowChange(originalIdx, "testScore", e.target.value ? Number(e.target.value) : null)}
                          placeholder="점수"
                          min="0"
                          max="100"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div 
                          className="text-sm text-gray-700 cursor-pointer hover:text-blue-600 hover:underline"
                          onClick={() => onOpenModal(originalIdx, "note", row.note)}
                          title={row.note}
                        >
                          {row.note || <span className="text-gray-400">클릭하여 입력</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1"
                          onClick={() => onDeleteRow(originalIdx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </React.Fragment>
            ))}
            {filteredAndSortedRows.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-gray-400 py-12">
                  <div className="text-4xl mb-4">📝</div>
                  <div className="text-lg mb-2">테스트 기록이 없습니다</div>
                  <div className="text-sm">왼쪽 사이드바에서 반과 학생을 추가해 주세요</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* 하단 요약 바 */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              총 <span className="font-semibold text-gray-900">{rows.length}</span>개의 테스트 기록
            </span>
            {filteredAndSortedRows.length !== rows.length && (
              <Badge variant="secondary" className="text-xs">
                필터됨: {filteredAndSortedRows.length}개
              </Badge>
            )}
          </div>
          {/* 하단 저장 버튼 추가 */}
          {hasUnsavedChanges && (
            <Button 
              size="sm"
              onClick={onSave}
              className="bg-red-600 hover:bg-red-700 animate-pulse shadow-lg text-white font-medium"
            >
              전체 저장
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}