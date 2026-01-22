"use client";

import React, { useEffect, useRef, useMemo, useCallback } from "react";
import LearningTabs from "@/components/learning/LearningTabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, ChevronLeft, ChevronRight, Plus, Calendar, Users, ChevronDown, Filter, X } from "lucide-react";
import { ClassFormModal } from "@/components/students/classes/class-form-modal";

// 커스텀 훅
import { useLearningMasterData } from "@/hooks/use-learning-master-data";
import { useLearningLogs } from "@/hooks/use-learning-logs";
import { useLearningUI } from "@/hooks/use-learning-ui";

// 타입 및 유틸
import {
  ATTENDANCE_LABELS,
  HOMEWORK_LABELS,
  FOCUS_LABELS,
  getScoreColor
} from "@/types/learning";

export default function LearningPage() {
  // UI 상태 훅
  const {
    date,
    setDate,
    selectedClassIds,
    setSelectedClassIds,
    isSidebarOpen,
    toggleSidebar,
    openClassIds,
    toggleClassAccordion,
    modalState,
    openModal,
    closeModal,
    setModalValue,
    modalInputRef,
    classModalOpen,
    openClassModal,
    closeClassModal
  } = useLearningUI();

  // 마스터 데이터 훅
  const {
    classes,
    classStudents,
    students,
    teachers,
    isLoading: masterLoading,
    error: masterError,
    refresh: refreshMasterData
  } = useLearningMasterData();

  // 학습 기록 훅
  const {
    rows,
    hasUnsavedChanges,
    isLoading: logsLoading,
    fetchLogsForDate,
    handleChange,
    handleAddAll,
    handleAddStudent,
    handleDeleteRow,
    handleBulkDelete,
    handleSave,
    setRows
  } = useLearningLogs({
    date,
    classStudents,
    students
  });

  // 날짜 변경 감지
  const prevDateRef = useRef(date);

  useEffect(() => {
    if (date && date !== prevDateRef.current) {
      if (hasUnsavedChanges) {
        const confirmChange = confirm("저장하지 않은 변경사항이 있습니다. 날짜를 변경하시겠습니까?");
        if (!confirmChange) {
          setDate(prevDateRef.current);
          return;
        }
      }

      prevDateRef.current = date;
      fetchLogsForDate(date);
    }
  }, [date, hasUnsavedChanges, setDate, fetchLogsForDate]);

  // 마스터 데이터 로드 완료 후 학습 기록 로드
  useEffect(() => {
    if (!masterLoading && classes.length > 0) {
      fetchLogsForDate(date);
    }
  }, [masterLoading, classes.length, date, fetchLogsForDate]);

  // 반별 학생 목록 생성 함수
  const getClassStudents = useCallback((classId: string) => {
    const studentIds = classStudents.filter(cs => cs.class_id === classId).map(cs => cs.student_id);
    return students
      .filter(s => studentIds.includes(s.id) && s.status?.trim().includes("재원"))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [classStudents, students]);

  // 필터링 및 정렬된 데이터
  const filteredAndSortedRows = useMemo(() => {
    return rows
      .filter(row => selectedClassIds.length === 0 || selectedClassIds.includes(row.classId))
      .sort((a, b) => {
        const classA = classes.find(c => c.id === a.classId);
        const classB = classes.find(c => c.id === b.classId);

        const teacherA = teachers.find(t => t.id === classA?.teacher_id)?.name || 'ㅎ';
        const teacherB = teachers.find(t => t.id === classB?.teacher_id)?.name || 'ㅎ';

        if (teacherA !== teacherB) {
          return teacherA.localeCompare(teacherB, 'ko');
        }

        const classNameA = classA?.name || "";
        const classNameB = classB?.name || "";
        if (classNameA !== classNameB) {
          return classNameA.localeCompare(classNameB, "ko");
        }

        return a.name.localeCompare(b.name, "ko");
      });
  }, [rows, selectedClassIds, classes, teachers]);

  // 교재/진도 일괄 적용 함수
  const handleBulkApply = useCallback((key: "book1" | "book1log" | "book2" | "book2log") => {
    const currentFilteredRows = rows
      .filter(row => selectedClassIds.length === 0 || selectedClassIds.includes(row.classId))
      .sort((a, b) => {
        const classA = classes.find(c => c.id === a.classId)?.name || "";
        const classB = classes.find(c => c.id === b.classId)?.name || "";
        if (classA !== classB) return classA.localeCompare(classB, "ko");
        return a.name.localeCompare(b.name, "ko");
      });

    if (currentFilteredRows.length === 0) {
      alert("필터링된 학생이 없습니다.");
      return;
    }

    const firstValue = currentFilteredRows[0][key];

    if (!firstValue || firstValue.trim() === "") {
      alert("첫 번째 학생의 해당 항목이 비어있습니다.");
      return;
    }

    rows.forEach((r, idx) => {
      if (selectedClassIds.length === 0 || selectedClassIds.includes(r.classId)) {
        handleChange(idx, key, firstValue);
      }
    });
  }, [rows, selectedClassIds, classes, handleChange]);

  // 모달 저장 핸들러
  const handleModalSave = useCallback(() => {
    if (modalState.rowIdx !== null && modalState.field) {
      handleChange(modalState.rowIdx, modalState.field, modalState.value);
    }
    closeModal();
  }, [modalState, handleChange, closeModal]);

  // 반만들기 완료 후 데이터 새로고침
  const handleClassModalClose = useCallback(() => {
    closeClassModal();
    refreshMasterData();
  }, [closeClassModal, refreshMasterData]);

  // 로딩 상태
  if (masterLoading) return (
    <div className="p-8 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <div className="text-gray-400">로딩 중...</div>
    </div>
  );

  // 에러 상태
  if (masterError) return (
    <div className="p-8 text-center">
      <div className="text-red-400 text-4xl mb-4">⚠️</div>
      <div className="text-red-500">{masterError}</div>
    </div>
  );

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <LearningTabs />

        {/* 메인 콘텐츠 */}
        <div className="flex gap-6 relative">

          {/* 왼쪽 사이드바 */}
          <div className={"transition-all duration-300 " + (isSidebarOpen ? 'w-72' : 'w-0 overflow-hidden')}>
            <div className="w-72 flex-shrink-0 space-y-4">
              {/* 날짜 선택 카드 */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-gray-700">날짜 선택</span>
                  </div>
                  <input
                    type="date"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                  />
                  <div className="mt-2 text-xs text-blue-600 font-medium">
                    {new Date(date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
              </Card>

              {/* 반 만들기 버튼 카드 */}
              <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-emerald-50">
                <div className="p-4">
                  <Button
                    onClick={openClassModal}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium py-2.5 rounded-lg shadow-md transition-all duration-200 hover:shadow-lg"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    반 만들기
                  </Button>
                  <div className="mt-2 text-xs text-green-600 text-center">
                    새로운 반을 생성합니다
                  </div>
                </div>
              </Card>

              {/* 반별 학생 목록 */}
              <Card className="border-0 shadow-md">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-4 h-4 text-gray-600" />
                    <span className="font-semibold text-gray-700">반별 추가</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {classes?.length || 0}개 반
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    {(() => {
                      const groupedClasses = classes.reduce((acc: { [key: string]: typeof classes }, cls) => {
                        const teacherId = cls.teacher_id || 'unassigned';
                        if (!acc[teacherId]) acc[teacherId] = [];
                        acc[teacherId].push(cls);
                        return acc;
                      }, {});

                      Object.values(groupedClasses).forEach(group => {
                        group.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
                      });

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
                          <div key={teacherId} className="space-y-2">
                            <div className="px-2 py-1 bg-gray-100 rounded-md">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-sm font-semibold text-gray-700">
                                  {teacherName} 담당
                                </span>
                                <Badge variant="secondary" className="ml-auto text-xs">
                                  {teacherClasses.length}개 반
                                </Badge>
                              </div>
                            </div>

                            <div className="space-y-2 ml-2">
                              {teacherClasses.map(cls => {
                                const classStudentList = getClassStudents(cls.id);
                                const isOpen = openClassIds.includes(cls.id);
                                return (
                                  <div key={cls.id}>
                                    <Card className="border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 cursor-pointer hover:shadow-md">
                                      <div className="p-3">
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex items-start gap-2 flex-1 min-w-0">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleClassAccordion(cls.id);
                                              }}
                                              className="p-1 rounded-md hover:bg-white/50 transition-colors flex-shrink-0 mt-0.5"
                                            >
                                              {isOpen ? (
                                                <ChevronDown className="w-4 h-4 text-gray-500" />
                                              ) : (
                                                <ChevronRight className="w-4 h-4 text-gray-500" />
                                              )}
                                            </button>
                                            <div className="flex-1 min-w-0">
                                              <div className="font-semibold text-sm text-gray-800 truncate">
                                                {cls.name}
                                              </div>
                                              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                                <span>{classStudentList.length}명</span>
                                                {teacherId !== 'unassigned' && (
                                                  <>
                                                    <span>•</span>
                                                    <span className="text-blue-600">{teacherName}</span>
                                                  </>
                                                )}
                                              </div>
                                            </div>
                                          </div>

                                          <Button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleAddAll(cls.id, date);
                                            }}
                                            size="sm"
                                            variant="ghost"
                                            className="w-8 h-8 p-0 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 shadow-sm transition-all duration-200 hover:shadow-md flex-shrink-0"
                                          >
                                            <Plus className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </Card>

                                    {isOpen && (
                                      <div className="mt-2 ml-4 space-y-2">
                                        {classStudentList.map(s => (
                                          <Card
                                            key={s.id}
                                            className="border border-gray-100 hover:border-gray-200 transition-colors"
                                          >
                                            <div className="p-2">
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                                                  <span className="text-sm font-medium text-gray-700">
                                                    {s.name}
                                                  </span>
                                                </div>
                                                <Button
                                                  onClick={() => handleAddStudent(cls.id, s, date)}
                                                  size="sm"
                                                  variant="ghost"
                                                  className="w-6 h-6 p-0 rounded-full hover:bg-blue-100 text-blue-600"
                                                >
                                                  <Plus className="w-3 h-3" />
                                                </Button>
                                              </div>
                                            </div>
                                          </Card>
                                        ))}

                                        {classStudentList.length === 0 && (
                                          <div className="text-center py-4 text-gray-400 text-sm">
                                            등록된 학생이 없습니다
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {(!classes || classes.length === 0) && (
                    <div className="text-center py-8 text-gray-400">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <div className="text-sm">등록된 반이 없습니다</div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* 오른쪽 테이블 */}
          <div className="flex-1">
            <Card className="bg-white rounded-xl shadow border overflow-hidden">
              {/* 헤더 섹션 */}
              <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-gray-100">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleSidebar}
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
                                        setSelectedClassIds(prev => [...prev, cls.id]);
                                      } else {
                                        setSelectedClassIds(prev => prev.filter(id => id !== cls.id));
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
                        onClick={handleBulkDelete}
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
                              onClick={() => setSelectedClassIds(prev => prev.filter(id => id !== classId))}
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
                      <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 w-32">학생</th>
                      <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700 w-36">날짜</th>
                      <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700 w-16">출결</th>
                      <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700 w-16">숙제</th>
                      <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700 w-16">집중도</th>
                      <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 w-24">
                        <div className="flex items-center gap-1">
                          <span>교재</span>
                          <button
                            onClick={() => handleBulkApply("book1")}
                            className="text-gray-400 hover:text-gray-600"
                            title="첫 번째 값으로 일괄 적용"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      </th>
                      <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 w-24">
                        <div className="flex items-center gap-1">
                          <span>진도</span>
                          <button
                            onClick={() => handleBulkApply("book1log")}
                            className="text-gray-400 hover:text-gray-600"
                            title="첫 번째 값으로 일괄 적용"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      </th>
                      <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 w-24">
                        <div className="flex items-center gap-1">
                          <span className="text-xs">숙제교재</span>
                          <button
                            onClick={() => handleBulkApply("book2")}
                            className="text-gray-400 hover:text-gray-600"
                            title="첫 번째 값으로 일괄 적용"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      </th>
                      <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 w-24">
                        <div className="flex items-center gap-1">
                          <span className="text-xs">숙제진도</span>
                          <button
                            onClick={() => handleBulkApply("book2log")}
                            className="text-gray-400 hover:text-gray-600"
                            title="첫 번째 값으로 일괄 적용"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      </th>
                      <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 w-24">특이사항</th>
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
                          {classRows.map((row, rowIndex) => {
                            const originalIdx = rows.findIndex(r => {
                              if (row.id && r.id === row.id) return true;
                              if (row.tempId && r.tempId === row.tempId) return true;
                              return r === row;
                            });
                            return (
                              <tr key={row.tempId || row.id || `${row.classId}-${row.studentId}-${rowIndex}`} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                                <td className="px-4 py-3 text-sm text-gray-600"></td>
                                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
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
                                    className={"inline-flex items-center justify-center px-2 py-1 text-xs font-bold rounded-full border-2 cursor-pointer whitespace-nowrap " + getScoreColor(row.attendance)}
                                    onClick={() => {
                                      const nextValue = row.attendance === 5 ? 1 : row.attendance + 1;
                                      handleChange(originalIdx, "attendance", nextValue);
                                    }}
                                    title={`클릭하여 변경 (현재: ${ATTENDANCE_LABELS[row.attendance]})`}
                                  >
                                    {ATTENDANCE_LABELS[row.attendance] || row.attendance}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span
                                    className={"inline-flex items-center justify-center px-2 py-1 text-xs font-bold rounded-full border-2 cursor-pointer whitespace-nowrap " + getScoreColor(row.homework)}
                                    onClick={() => {
                                      const nextValue = row.homework === 5 ? 1 : row.homework + 1;
                                      handleChange(originalIdx, "homework", nextValue);
                                    }}
                                    title={`클릭하여 변경 (현재: ${HOMEWORK_LABELS[row.homework]})`}
                                  >
                                    {HOMEWORK_LABELS[row.homework] || row.homework}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span
                                    className={"inline-flex items-center justify-center px-2 py-1 text-xs font-bold rounded-full border-2 cursor-pointer whitespace-nowrap " + getScoreColor(row.focus)}
                                    onClick={() => {
                                      const nextValue = row.focus === 5 ? 1 : row.focus + 1;
                                      handleChange(originalIdx, "focus", nextValue);
                                    }}
                                    title={`클릭하여 변경 (현재: ${FOCUS_LABELS[row.focus]})`}
                                  >
                                    {FOCUS_LABELS[row.focus] || row.focus}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div
                                    className="text-sm text-gray-700 cursor-pointer hover:text-blue-600 hover:underline truncate max-w-[80px]"
                                    onClick={() => openModal(originalIdx, "book1", row.book1)}
                                    title={row.book1}
                                  >
                                    {row.book1 || <span className="text-gray-400">클릭하여 입력</span>}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div
                                    className="text-sm text-gray-700 cursor-pointer hover:text-blue-600 hover:underline truncate max-w-[80px]"
                                    onClick={() => openModal(originalIdx, "book1log", row.book1log)}
                                    title={row.book1log}
                                  >
                                    {row.book1log || <span className="text-gray-400">클릭하여 입력</span>}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div
                                    className="text-sm text-gray-700 cursor-pointer hover:text-blue-600 hover:underline truncate max-w-[80px]"
                                    onClick={() => openModal(originalIdx, "book2", row.book2)}
                                    title={row.book2}
                                  >
                                    {row.book2 || <span className="text-gray-400">클릭하여 입력</span>}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div
                                    className="text-sm text-gray-700 cursor-pointer hover:text-blue-600 hover:underline truncate max-w-[80px]"
                                    onClick={() => openModal(originalIdx, "book2log", row.book2log)}
                                    title={row.book2log}
                                  >
                                    {row.book2log || <span className="text-gray-400">클릭하여 입력</span>}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div
                                    className="text-sm text-gray-700 cursor-pointer hover:text-blue-600 hover:underline truncate max-w-[80px]"
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
                  {hasUnsavedChanges && (
                    <Button
                      size="sm"
                      onClick={handleSave}
                      className="bg-red-600 hover:bg-red-700 animate-pulse shadow-lg text-white font-medium"
                    >
                      전체 저장
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* 모달: 교재/진도 입력 확대 */}
        {modalState.open && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 w-[400px] max-w-full">
              <div className="mb-4 font-semibold text-lg">
                {modalState.field === "note" ? "특이사항 입력" : "교재/진도 입력"}
              </div>
              <input
                ref={modalInputRef}
                className="input input-bordered w-full text-lg h-12 px-4 py-3"
                value={modalState.value}
                onChange={e => setModalValue(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={closeModal}>취소</Button>
                <Button variant="default" onClick={handleModalSave}>저장</Button>
              </div>
            </div>
          </div>
        )}

        {/* 반만들기 모달 */}
        <ClassFormModal
          open={classModalOpen}
          onClose={handleClassModalClose}
          teachers={teachers}
          students={students}
          mode="create"
        />
      </div>
    </TooltipProvider>
  );
}
