"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2, ChevronDown, ChevronLeft, ChevronRight, Users, Filter, X, Download } from "lucide-react"
import { SOURCE_TYPE_LABELS, SOURCE_TYPE_COLORS } from "@/types/test-log-import"
import type { SourceType } from "@/types/test-log-import"

export interface TestLogV2Row {
  id?: string
  classId: string
  classNameSnapshot?: string
  studentId: string
  name: string
  date: string
  testType: string
  test: string
  testScore: number | null
  note: string
  sourceType?: SourceType
  sourceId?: string
  createdBy?: string
  createdByName?: string
  lastModifiedBy?: string
  lastModifiedByName?: string
  updatedAt?: string
}

interface TestLogsV2MainTableProps {
  rows: TestLogV2Row[]
  classes: any[]
  filteredClasses: any[]
  students: any[]
  teachers: any[]
  teachersWithClasses: any[]
  date: string
  selectedTeacherIds: string[]
  selectedClassIds: string[]
  isSidebarOpen: boolean
  hasUnsavedChanges: boolean
  deletedRowIds: string[]
  onSidebarToggle: () => void
  onTeacherFilterChange: React.Dispatch<React.SetStateAction<string[]>>
  onClassFilterChange: React.Dispatch<React.SetStateAction<string[]>>
  onRowChange: (idx: number, key: keyof TestLogV2Row, value: any) => void
  onBulkApply: (key: "test" | "testType" | "testScore") => void
  onDeleteRow: (originalIdx: number) => void
  onClearAll: () => void
  onSave: () => void
  onOpenModal: (rowIdx: number, field: "note", value: string) => void
  onOpenImport: () => void
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

export function TestLogsV2MainTable({
  rows,
  classes,
  filteredClasses,
  students,
  teachers,
  teachersWithClasses,
  date,
  selectedTeacherIds,
  selectedClassIds,
  isSidebarOpen,
  hasUnsavedChanges,
  deletedRowIds,
  onSidebarToggle,
  onTeacherFilterChange,
  onClassFilterChange,
  onRowChange,
  onBulkApply,
  onDeleteRow,
  onClearAll,
  onSave,
  onOpenModal,
  onOpenImport,
}: TestLogsV2MainTableProps) {
  const filteredAndSortedRows = rows
    .filter(row => {
      if (selectedClassIds.length > 0) {
        return selectedClassIds.includes(row.classId)
      }
      if (selectedTeacherIds.length > 0) {
        const rowClass = classes.find(c => c.id === row.classId)
        return rowClass?.teacher_id && selectedTeacherIds.includes(rowClass.teacher_id)
      }
      return true
    })
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
              {/* 선생님 필터 */}
              <span className="text-sm font-medium text-gray-600">선생님:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start h-8 px-3 text-sm font-normal">
                    <Users className="w-4 h-4 mr-2" />
                    {selectedTeacherIds.length === 0 ? "전체" : selectedTeacherIds.length + "명 선택"}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-0" align="start">
                  <div className="p-2 border-b">
                    <h4 className="font-medium text-sm text-gray-700 mb-2">선생님 선택</h4>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => onTeacherFilterChange(teachersWithClasses.map(t => t.id))} className="h-7 px-2 text-xs">전체 선택</Button>
                      <Button variant="ghost" size="sm" onClick={() => { onTeacherFilterChange([]); onClassFilterChange([]); }} className="h-7 px-2 text-xs">전체 해제</Button>
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {teachersWithClasses.map(teacher => (
                      <div key={teacher.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50">
                        <Checkbox
                          id={`teacher-v2-${teacher.id}`}
                          checked={selectedTeacherIds.includes(teacher.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              onTeacherFilterChange(prev => [...prev, teacher.id])
                            } else {
                              onTeacherFilterChange(prev => prev.filter(id => id !== teacher.id))
                              const teacherClassIds = classes.filter(c => c.teacher_id === teacher.id).map(c => c.id)
                              onClassFilterChange(prev => prev.filter(id => !teacherClassIds.includes(id)))
                            }
                          }}
                        />
                        <label htmlFor={`teacher-v2-${teacher.id}`} className="text-sm font-medium cursor-pointer flex-1">{teacher.name}</label>
                        <span className="text-xs text-gray-400">{classes.filter(c => c.teacher_id === teacher.id).length}반</span>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* 반 필터 */}
              <span className="text-sm font-medium text-gray-600">반:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start h-8 px-3 text-sm font-normal">
                    <Filter className="w-4 h-4 mr-2" />
                    {selectedClassIds.length === 0 ? "전체 반" : selectedClassIds.length + "개 반 선택"}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="start">
                  <div className="p-2 border-b">
                    <h4 className="font-medium text-sm text-gray-700 mb-2">반 선택</h4>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => onClassFilterChange(filteredClasses.map(c => c.id))} className="h-7 px-2 text-xs">전체 선택</Button>
                      <Button variant="ghost" size="sm" onClick={() => onClassFilterChange([])} className="h-7 px-2 text-xs">전체 해제</Button>
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredClasses.map(cls => {
                      const teacher = teachers.find(t => t.id === cls.teacher_id)
                      return (
                        <div key={cls.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50">
                          <Checkbox
                            id={`class-v2-${cls.id}`}
                            checked={selectedClassIds.includes(cls.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                onClassFilterChange(prev => [...prev, cls.id])
                              } else {
                                onClassFilterChange(prev => prev.filter(id => id !== cls.id))
                              }
                            }}
                          />
                          <label htmlFor={`class-v2-${cls.id}`} className="text-sm font-medium cursor-pointer flex-1">{cls.name}</label>
                          {teacher && <span className="text-xs text-gray-400">{teacher.name}</span>}
                        </div>
                      )
                    })}
                  </div>
                </PopoverContent>
              </Popover>
              {(selectedClassIds.length > 0 || selectedTeacherIds.length > 0) && (
                <Badge variant="secondary">{filteredAndSortedRows.length}명</Badge>
              )}
            </div>
          </div>

          {/* 선택된 선생님/반 태그 표시 */}
          {(selectedTeacherIds.length > 0 || selectedClassIds.length > 0) && (
            <div className="flex items-center gap-2 flex-wrap mt-3">
              {selectedTeacherIds.length > 0 && (
                <>
                  <span className="text-sm text-gray-500">선생님:</span>
                  {selectedTeacherIds.map(teacherId => {
                    const teacherName = teachers.find(t => t.id === teacherId)?.name || teacherId
                    return (
                      <Badge key={teacherId} variant="outline" className="text-xs bg-blue-50 border-blue-200">
                        {teacherName}
                        <Button variant="ghost" size="sm" className="h-auto p-0 ml-1 hover:bg-transparent"
                          onClick={() => {
                            onTeacherFilterChange(prev => prev.filter(id => id !== teacherId))
                            const teacherClassIds = classes.filter(c => c.teacher_id === teacherId).map(c => c.id)
                            onClassFilterChange(prev => prev.filter(id => !teacherClassIds.includes(id)))
                          }}>
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    )
                  })}
                </>
              )}
              {selectedClassIds.length > 0 && (
                <>
                  <span className="text-sm text-gray-500 ml-2">반:</span>
                  {selectedClassIds.map(classId => {
                    const className = classes.find(c => c.id === classId)?.name || classId
                    return (
                      <Badge key={classId} variant="secondary" className="text-xs">
                        {className}
                        <Button variant="ghost" size="sm" className="h-auto p-0 ml-1 hover:bg-transparent"
                          onClick={() => onClassFilterChange(prev => prev.filter(id => id !== classId))}>
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    )
                  })}
                </>
              )}
            </div>
          )}
          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <span className="text-sm text-orange-600 font-medium animate-pulse">저장하지 않은 변경사항이 있습니다</span>
            )}
            {/* 스마트 가져오기 버튼 */}
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenImport}
              className="text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300 bg-blue-50 hover:bg-blue-100"
            >
              <Download className="h-4 w-4 mr-2" />
              스마트 가져오기
            </Button>
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
            <Badge variant="outline" className="text-sm font-medium">{date}</Badge>
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
                  <button onClick={() => onBulkApply("test")} className="text-gray-400 hover:text-gray-600" title="첫 번째 값으로 일괄 적용">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <span>유형</span>
                  <button onClick={() => onBulkApply("testType")} className="text-gray-400 hover:text-gray-600" title="첫 번째 값으로 일괄 적용">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </th>
              <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700">
                <div className="flex items-center justify-center gap-2">
                  <span>점수</span>
                  <button onClick={() => onBulkApply("testScore")} className="text-gray-400 hover:text-gray-600" title="첫 번째 값으로 일괄 적용">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 w-16">소스</th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 w-32">특이사항</th>
              <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700 w-20">삭제</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(
              filteredAndSortedRows.reduce((groups: { [className: string]: typeof filteredAndSortedRows }, row) => {
                const className = classes.find(c => c.id === row.classId)?.name || row.classNameSnapshot || row.classId
                if (!groups[className]) groups[className] = []
                groups[className].push(row)
                return groups
              }, {})
            )
            .sort(([a], [b]) => a.localeCompare(b, "ko"))
            .map(([className, classRows]) => (
              <React.Fragment key={className}>
                <tr className="bg-gradient-to-r from-green-50 to-emerald-50 border-t-2 border-green-200">
                  <td colSpan={9} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-semibold text-green-800">{className}</span>
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">{classRows.length}명</span>
                    </div>
                  </td>
                </tr>
                {classRows.map((row) => {
                  const originalIdx = rows.indexOf(row)
                  const sourceType = (row.sourceType || 'manual') as SourceType
                  return (
                    <tr key={originalIdx} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-600"></td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {row.name || students.find((s: any) => s.id === row.studentId)?.name || row.studentId}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input type="date"
                          className="w-full max-w-[135px] px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={row.date}
                          onChange={e => onRowChange(originalIdx, "date", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input type="text"
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
                            <option key={opt.value} value={opt.value}>{opt.value}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input type="number"
                          className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={row.testScore ?? ""}
                          onChange={e => onRowChange(originalIdx, "testScore", e.target.value ? Number(e.target.value) : null)}
                          placeholder="점수" min="0" max="100"
                        />
                      </td>
                      <td className="px-4 py-3">
                        {sourceType !== 'manual' && (
                          <Badge className={`text-xs ${SOURCE_TYPE_COLORS[sourceType]}`}>
                            {SOURCE_TYPE_LABELS[sourceType]}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-700 cursor-pointer hover:text-blue-600 hover:underline"
                          onClick={() => onOpenModal(originalIdx, "note", row.note)}
                          title={row.note}>
                          {row.note || <span className="text-gray-400">클릭하여 입력</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1"
                          onClick={() => onDeleteRow(originalIdx)}>
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
                <td colSpan={9} className="text-center text-gray-400 py-12">
                  <div className="text-4xl mb-4">📝</div>
                  <div className="text-lg mb-2">테스트 기록이 없습니다</div>
                  <div className="text-sm">왼쪽 사이드바에서 반과 학생을 추가하거나, 스마트 가져오기를 사용해 주세요</div>
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
              <Badge variant="secondary" className="text-xs">필터됨: {filteredAndSortedRows.length}개</Badge>
            )}
          </div>
          {hasUnsavedChanges && (
            <Button size="sm" onClick={onSave} className="bg-red-600 hover:bg-red-700 animate-pulse shadow-lg text-white font-medium">
              전체 저장
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
