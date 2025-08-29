import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, Filter, ChevronDown, X, Trash2 } from "lucide-react";

// 점수 색상 스타일 함수 (노션 스타일)
const scoreColor = (score: number) => {
  switch (score) {
    case 1: return "bg-red-100 text-red-600 border-red-200";
    case 2: return "bg-orange-100 text-orange-600 border-orange-200";
    case 3: return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case 4: return "bg-blue-100 text-blue-600 border-blue-200";
    case 5: return "bg-green-100 text-green-700 border-green-200";
    default: return "bg-gray-100 text-gray-400 border-gray-200";
  }
};

// 출결 점수 → 텍스트 매핑
const attendanceLabels: Record<number, string> = {
  5: "출석",
  4: "지각",
  3: "조퇴",
  2: "보강",
  1: "결석"
};

// 숙제/집중도 점수 → 텍스트 매핑
const homeworkLabels: Record<number, string> = {
  5: "100% 마무리",
  4: "90% 이상",
  3: "추가 추적 필요",
  2: "보강필요",
  1: "결석"
};

const focusLabels: Record<number, string> = {
  5: "매우 열의있음",
  4: "대체로 잘참여",
  3: "산만하나 진행가능",
  2: "조치필요",
  1: "결석"
};

interface StudyLogTableProps {
  rows: any[];
  classes: any[];
  students: any[];
  date: string;
  hasUnsavedChanges: boolean;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  selectedClassIds: string[];
  setSelectedClassIds: (ids: string[]) => void;
  filteredAndSortedRows: any[];
  handleChange: (idx: number, key: string, value: any) => void;
  handleSave: () => void;
  handleBulkApply: (key: "book1" | "book1log" | "book2" | "book2log") => void;
  openModal: (idx: number, field: any, value: string | undefined) => void;
  handleDeleteAll: () => void;
  handleDeleteRow: (idx: number) => void;
}

export function StudyLogTable({
  rows,
  classes,
  students,
  date,
  hasUnsavedChanges,
  isSidebarOpen,
  setIsSidebarOpen,
  selectedClassIds,
  setSelectedClassIds,
  filteredAndSortedRows,
  handleChange,
  handleSave,
  handleBulkApply,
  openModal,
  handleDeleteAll,
  handleDeleteRow,
}: StudyLogTableProps) {
  return (
    <Card className="bg-white rounded-xl shadow border overflow-hidden">
      {/* 헤더 섹션 */}
      <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-gray-100">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="h-8 w-8 p-0 bg-white border shadow-sm hover:bg-gray-50"
              >
                {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
              
              <h2 className="text-lg font-semibold text-gray-800">학습 관리</h2>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">반 필터:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start h-8 px-3 text-sm font-normal"
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      {selectedClassIds.length === 0
                        ? "전체 반"
                        : selectedClassIds.length + "개 반 선택"}
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="start">
                    <div className="p-2 border-b">
                      <h4 className="font-medium text-sm text-gray-700 mb-2">반 선택</h4>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedClassIds(classes.map(c => c.id))}
                          className="h-7 px-2 text-xs"
                        >
                          전체 선택
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedClassIds([])}
                          className="h-7 px-2 text-xs"
                        >
                          전체 해제
                        </Button>
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {classes.map(cls => (
                        <div key={cls.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50">
                          <Checkbox
                            id={cls.id}
                            checked={selectedClassIds.includes(cls.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedClassIds([...selectedClassIds, cls.id]);
                              } else {
                                setSelectedClassIds(selectedClassIds.filter(id => id !== cls.id));
                              }
                            }}
                          />
                          <label
                            htmlFor={cls.id}
                            className="text-sm font-medium cursor-pointer flex-1"
                          >
                            {cls.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                {selectedClassIds.length > 0 && (
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
                onClick={handleDeleteAll}
                className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                일괄 삭제
              </Button>
              <Button 
                size="sm"
                onClick={handleSave}
                className={(hasUnsavedChanges 
                    ? "bg-red-600 hover:bg-red-700 animate-pulse shadow-lg" 
                    : "bg-blue-600 hover:bg-blue-700") + " text-white font-medium"}
              >
                {hasUnsavedChanges ? "저장 필요!" : "저장"}
              </Button>
              <Badge variant="outline" className="text-sm font-medium">
                {date}
              </Badge>
            </div>
          </div>

          {/* 선택된 반들을 태그로 표시 */}
          {selectedClassIds.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-500">선택된 반:</span>
              {selectedClassIds.map(classId => {
                const className = classes.find(c => c.id === classId)?.name || classId;
                return (
                  <Badge key={classId} variant="secondary" className="text-xs">
                    {className}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-1 hover:bg-transparent"
                      onClick={() => setSelectedClassIds(selectedClassIds.filter(id => id !== classId))}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                );
              })}
            </div>
          )}
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
              <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700 w-16">출결</th>
              <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700 w-16">숙제</th>
              <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700 w-16">집중도</th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <span>교재1</span>
                  <button
                    onClick={() => handleBulkApply("book1")}
                    className="text-gray-400 hover:text-gray-600"
                    title="첫 번째 값으로 일괄 적용"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <span>진도1</span>
                  <button
                    onClick={() => handleBulkApply("book1log")}
                    className="text-gray-400 hover:text-gray-600"
                    title="첫 번째 값으로 일괄 적용"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <span>교재2</span>
                  <button
                    onClick={() => handleBulkApply("book2")}
                    className="text-gray-400 hover:text-gray-600"
                    title="첫 번째 값으로 일괄 적용"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <span>진도2</span>
                  <button
                    onClick={() => handleBulkApply("book2log")}
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
                const className = classes.find(c => c.id === row.classId)?.name || row.classId;
                if (!groups[className]) {
                  groups[className] = [];
                }
                groups[className].push(row);
                return groups;
              }, {})
            )
            .sort(([a], [b]) => a.localeCompare(b, "ko"))
            .map(([className, classRows]) => (
              <React.Fragment key={className}>
                {/* 반별 그룹 헤더 */}
                <tr className="bg-gradient-to-r from-green-50 to-emerald-50 border-t-2 border-green-200">
                  <td colSpan={12} className="px-4 py-3">
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
                  const originalIdx = rows.findIndex(r => r.studentId === row.studentId && r.classId === row.classId);
                  return (
                    <tr key={row.classId + row.studentId} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {/* 반 이름은 그룹 헤더에 있으므로 비우기 */}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {row.name || students.find(s => s.id === row.studentId)?.name || row.studentId}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="date"
                          className="w-full max-w-[135px] px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={row.date}
                          onChange={e => handleChange(originalIdx, "date", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span 
                          className={"inline-flex items-center justify-center px-2 py-1 text-xs font-bold rounded-full border-2 cursor-pointer whitespace-nowrap " + scoreColor(row.attendance)}
                          onClick={() => {
                            const nextValue = row.attendance === 5 ? 1 : row.attendance + 1;
                            handleChange(originalIdx, "attendance", nextValue);
                          }}
                          title={`클릭하여 변경 (현재: ${attendanceLabels[row.attendance]})`}
                        >
                          {attendanceLabels[row.attendance] || row.attendance}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span 
                          className={"inline-flex items-center justify-center px-2 py-1 text-xs font-bold rounded-full border-2 cursor-pointer whitespace-nowrap " + scoreColor(row.homework)}
                          onClick={() => {
                            const nextValue = row.homework === 5 ? 1 : row.homework + 1;
                            handleChange(originalIdx, "homework", nextValue);
                          }}
                          title={`클릭하여 변경 (현재: ${homeworkLabels[row.homework]})`}
                        >
                          {homeworkLabels[row.homework] || row.homework}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span 
                          className={"inline-flex items-center justify-center px-2 py-1 text-xs font-bold rounded-full border-2 cursor-pointer whitespace-nowrap " + scoreColor(row.focus)}
                          onClick={() => {
                            const nextValue = row.focus === 5 ? 1 : row.focus + 1;
                            handleChange(originalIdx, "focus", nextValue);
                          }}
                          title={`클릭하여 변경 (현재: ${focusLabels[row.focus]})`}
                        >
                          {focusLabels[row.focus] || row.focus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div 
                          className="text-sm text-gray-700 cursor-pointer hover:text-blue-600 hover:underline"
                          onClick={() => openModal(originalIdx, "book1", row.book1)}
                          title={row.book1}
                        >
                          {row.book1 || <span className="text-gray-400">클릭하여 입력</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div 
                          className="text-sm text-gray-700 cursor-pointer hover:text-blue-600 hover:underline"
                          onClick={() => openModal(originalIdx, "book1log", row.book1log)}
                          title={row.book1log}
                        >
                          {row.book1log || <span className="text-gray-400">클릭하여 입력</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div 
                          className="text-sm text-gray-700 cursor-pointer hover:text-blue-600 hover:underline"
                          onClick={() => openModal(originalIdx, "book2", row.book2)}
                          title={row.book2}
                        >
                          {row.book2 || <span className="text-gray-400">클릭하여 입력</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div 
                          className="text-sm text-gray-700 cursor-pointer hover:text-blue-600 hover:underline"
                          onClick={() => openModal(originalIdx, "book2log", row.book2log)}
                          title={row.book2log}
                        >
                          {row.book2log || <span className="text-gray-400">클릭하여 입력</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div 
                          className="text-sm text-gray-700 cursor-pointer hover:text-blue-600 hover:underline"
                          onClick={() => openModal(originalIdx, "note", row.note)}
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
                          onClick={() => handleDeleteRow(originalIdx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
            
            {filteredAndSortedRows.length === 0 && (
              <tr>
                <td colSpan={12} className="text-center text-gray-400 py-12">
                  <div className="text-4xl mb-4">📝</div>
                  <div className="text-lg mb-2">
                    {selectedClassIds.length > 0 ? "선택한 반에 학습 기록이 없습니다" : "학습 기록이 없습니다"}
                  </div>
                  <div className="text-sm">
                    {selectedClassIds.length > 0 ? "다른 반을 선택하거나 학생을 추가해 주세요" : "왼쪽 사이드바에서 반과 학생을 추가해 주세요"}
                  </div>
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
              총 <span className="font-semibold text-gray-900">{rows.length}</span>개의 학습 기록
              {selectedClassIds.length > 0 && (
                <span className="ml-2 text-blue-600">
                  (필터됨: <span className="font-semibold">{filteredAndSortedRows.length}</span>개)
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}