"use client";
import React, { useState, useEffect, useRef, Fragment } from "react";
import LearningTabs from "@/components/LearningTabs";
import { BulkDatePicker } from "@/components/ui/bulk-date-picker";
import { ClassAccordion } from "@/components/ui/class-accordion";
import { ScoreDropdown } from "@/components/ui/score-dropdown";
import { ScoreLegendBox } from "@/components/ui/score-legend-box";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/types/database";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { HelpCircle, Trash2, ChevronLeft, ChevronRight, Plus, Calendar, Users, ChevronDown, Filter, X } from "lucide-react";
import { ClassFormModal } from "@/app/(dashboard)/students/classes/class-form-modal";

const today = new Date().toISOString().slice(0, 10);

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

// 출결/숙제/집중도 string→숫자 매핑
const attendanceMap: Record<string, number> = {
  "결석": 1,
  "조퇴": 2,
  "30분내 등원": 3,
  "15분내 등원": 4,
  "수업시작전 등원": 5,
};
const homeworkMap: Record<string, number> = {
  "결석": 1,
  "보강필요": 2,
  "추가 추적 필요": 3,
  "90% 이상": 4,
  "100% 마무리": 5,
};
const focusMap: Record<string, number> = {
  "결석": 1,
  "조치필요": 2,
  "산만하나 진행가능": 3,
  "대체로 잘참여": 4,
  "매우 열의있음": 5,
};

export default function LearningPage() {
  const supabase = createClientComponentClient<Database>();
  
  // 입력 상태
  const [date, setDate] = useState(today);
  const [rows, setRows] = useState<
    Array<{
      id?: string;
      classId: string;
      studentId: string;
      name: string;
      date: string;
      attendance: number;
      homework: number;
      focus: number;
      note: string;
      book1: string;
      book1log: string;
      book2: string;
      book2log: string;
      createdBy?: string;
      createdByName?: string;
      lastModifiedBy?: string;
      lastModifiedByName?: string;
      updatedAt?: string;
    }>
  >([]);
  
  const [classes, setClasses] = useState<any[]>([]);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [openClassIds, setOpenClassIds] = useState<string[]>([]);
  
  // 다중선택 반 필터 상태
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalRows, setOriginalRows] = useState<typeof rows>([]);
  
  // 교재/진도 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRowIdx, setModalRowIdx] = useState<number | null>(null);
  const [modalField, setModalField] = useState<"book1" | "book1log" | "book2" | "book2log" | "note" | null>(null);
  const [modalValue, setModalValue] = useState("");
  const modalInputRef = useRef<HTMLInputElement>(null);
  
  // 반만들기 모달 상태
  const [classModalOpen, setClassModalOpen] = useState(false);
  
  // 사이드바 열림/닫힘 상태
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // 필터링 및 정렬된 데이터
  const filteredAndSortedRows = rows
    .filter(row => selectedClassIds.length === 0 || selectedClassIds.includes(row.classId))
    .sort((a, b) => {
      const classA = classes.find(c => c.id === a.classId)?.name || "";
      const classB = classes.find(c => c.id === b.classId)?.name || "";
      if (classA !== classB) return classA.localeCompare(classB, "ko");
      return a.name.localeCompare(b.name, "ko");
    });

  // 반만들기 완료 후 데이터 새로고침
  const handleClassModalClose = () => {
    setClassModalOpen(false);
    fetchData();
  };
  
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: classData } = await supabase.from("classes").select("id, name");
      const { data: classStudentData } = await supabase.from("class_students").select("class_id, student_id");
      const { data: studentData } = await supabase.from("students").select("id, name, status, grade, school_type");
      const { data: teacherData } = await supabase.from("employees").select("id, name");
      
      setClasses(classData || []);
      setClassStudents(classStudentData || []);
      setStudents(studentData || []);
      setTeachers(teacherData || []);
      
      if (classData && classData.length > 0) setSelectedClassId(classData[0].id);
      
      await fetchLogsForDate(date);
    } catch (e) {
      setError("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 특정 날짜의 학습 기록 불러오기
  const fetchLogsForDate = async (targetDate: string) => {
    try {
      const { data: logs, error } = await supabase
        .from("study_logs")
        .select(`
          *,
          student:students!student_id(name),
          created_employee:employees!created_by(name),
          modified_employee:employees!last_modified_by(name)
        `)
        .eq("date", targetDate);
      
      if (error) throw error;
      
      if (logs && logs.length > 0) {
        const mappedRows = logs.map((log: any) => ({
          id: log.id,
          classId: log.class_id || "",
          studentId: log.student_id || "",
          name: log.student?.name || "",
          date: log.date,
          attendance: log.attendance_status || 5,
          homework: log.homework || 5,
          focus: log.focus || 5,
          note: log.note || "",
          book1: log.book1 || "",
          book1log: log.book1log || "",
          book2: log.book2 || "",
          book2log: log.book2log || "",
          createdBy: log.created_by,
          createdByName: log.created_employee?.name || "",
          lastModifiedBy: log.last_modified_by,
          lastModifiedByName: log.modified_employee?.name || "",
          updatedAt: log.updated_at
        }));
        
        setRows(mappedRows);
        setOriginalRows(mappedRows);
      } else {
        setRows([]);
        setOriginalRows([]);
      }
    } catch (error) {
      console.error("날짜별 데이터 불러오기 실패:", error);
    }
  };

  // 오늘 날짜의 학습 기록 불러오기
  const fetchTodayLogs = async () => {
    try {
      const { data: todayLogs, error } = await supabase
        .from("today_study_logs")
        .select("*");
      
      if (error) throw error;
      
      if (todayLogs && todayLogs.length > 0) {
        const mappedRows = todayLogs.map((log: any) => ({
          id: log.id,
          classId: log.class_id || "",
          studentId: log.student_id || "",
          name: log.student_name || "",
          date: log.date,
          attendance: log.attendance_status || 5,
          homework: log.homework || 5,
          focus: log.focus || 5,
          note: log.note || "",
          book1: log.book1 || "",
          book1log: log.book1log || "",
          book2: log.book2 || "",
          book2log: log.book2log || "",
          createdBy: log.created_by,
          createdByName: log.created_by_name,
          lastModifiedBy: log.last_modified_by,
          lastModifiedByName: log.last_modified_by_name,
          updatedAt: log.updated_at
        }));
        
        setRows(mappedRows);
        setOriginalRows(mappedRows);
      }
    } catch (error) {
      console.error("오늘 날짜 데이터 불러오기 실패:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
  }, [date, hasUnsavedChanges]);

  useEffect(() => {
    if (modalOpen && modalInputRef.current) {
      modalInputRef.current.focus();
    }
  }, [modalOpen]);

  // 반별 학생 목록 생성 함수
  const getClassStudents = (classId: string) => {
    const studentIds = classStudents.filter(cs => cs.class_id === classId).map(cs => cs.student_id);
    return students
      .filter(s => studentIds.includes(s.id) && s.status?.trim().includes("재원"))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  };

  // 데이터 변경 감지
  useEffect(() => {
    const hasChanges = JSON.stringify(rows) !== JSON.stringify(originalRows);
    setHasUnsavedChanges(hasChanges);
  }, [rows, originalRows]);

  // 반별 전체추가
  const handleAddAll = (classId: string) => {
    const classStudentList = getClassStudents(classId);
    setRows(prev => [
      ...prev,
      ...classStudentList
        .filter(s => !prev.some(r => r.studentId === s.id && r.classId === classId))
        .map(s => ({
          classId,
          studentId: s.id,
          name: s.name,
          date,
          attendance: 5,
          homework: 5,
          focus: 5,
          note: "",
          book1: "",
          book1log: "",
          book2: "",
          book2log: "",
        })),
    ]);
  };

  // 학생별 추가
  const handleAddStudent = (classId: string, student: { id: string; name: string }) => {
    setRows(prev => {
      const existingRow = prev.find(r => r.studentId === student.id && r.date === date);
      if (existingRow) {
        return prev;
      } else {
        return [
          ...prev,
          {
            classId,
            studentId: student.id,
            name: student.name,
            date,
            attendance: 5,
            homework: 5,
            focus: 5,
            note: "",
            book1: "",
            book1log: "",
            book2: "",
            book2log: "",
          },
        ];
      }
    });
  };

  // 표 입력 변경
  const handleChange = (idx: number, key: keyof (typeof rows)[number], value: any) => {
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  };

  // 저장 버튼 클릭
  const handleSave = async () => {
    if (rows.length === 0) {
      alert("저장할 데이터가 없습니다.");
      return;
    }
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error("User fetch error:", userError);
        alert("사용자 정보를 가져올 수 없습니다. 다시 로그인해주세요.");
        return;
      }
      
      const { data: currentEmployee } = await supabase
        .from("employees")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      const classIds = [...new Set(rows.map(r => r.classId).filter(Boolean))];
      const { data: classData } = await supabase
        .from("classes")
        .select("id, teacher_id")
        .in("id", classIds);
      
      const classTeacherMap = new Map(classData?.map(c => [c.id, c.teacher_id]) || []);

      const existingRows = rows.filter(r => r.id);
      const newRows = rows.filter(r => !r.id);
      
      let error = null;
      
      if (existingRows.length > 0) {
        const updateData = existingRows.map(r => ({
          id: r.id,
          class_id: r.classId || null,
          student_id: r.studentId,
          date: r.date,
          attendance_status: typeof r.attendance === "number" ? r.attendance : attendanceMap[r.attendance],
          homework: typeof r.homework === "number" ? r.homework : homeworkMap[r.homework],
          focus: typeof r.focus === "number" ? r.focus : focusMap[r.focus],
          book1: r.book1,
          book1log: r.book1log,
          book2: r.book2,
          book2log: r.book2log,
          note: r.note,
          last_modified_by: currentEmployee?.id,
        }));
        
        const { error: updateError } = await supabase
          .from("study_logs")
          .upsert(updateData, { onConflict: "id" });
        
        if (updateError) error = updateError;
      }
      
      if (!error && newRows.length > 0) {
        const insertData = newRows.map(r => {
          const teacherId = r.classId ? classTeacherMap.get(r.classId) : null;
          return {
            class_id: r.classId || null,
            student_id: r.studentId,
            date: r.date,
            attendance_status: typeof r.attendance === "number" ? r.attendance : attendanceMap[r.attendance],
            homework: typeof r.homework === "number" ? r.homework : homeworkMap[r.homework],
            focus: typeof r.focus === "number" ? r.focus : focusMap[r.focus],
            book1: r.book1,
            book1log: r.book1log,
            book2: r.book2,
            book2log: r.book2log,
            note: r.note,
            created_by: teacherId,
          };
        });
        
        const { error: insertError } = await supabase
          .from("study_logs")
          .insert(insertData);
        
        if (insertError) error = insertError;
      }
      
      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }
      
      alert("저장되었습니다.");
      await fetchTodayLogs();
      setHasUnsavedChanges(false);
    } catch (e) {
      console.error("저장 오류:", e);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  const toggleClassAccordion = (classId: string) => {
    setOpenClassIds(prev =>
      prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
    );
  };

  // 교재/진도 일괄 적용 함수
  const handleBulkApply = (key: "book1" | "book1log" | "book2" | "book2log") => {
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
    
    setRows(prev => {
      return prev.map(r => {
        if (selectedClassIds.length === 0 || selectedClassIds.includes(r.classId)) {
          return { ...r, [key]: firstValue };
        }
        return r;
      });
    });
  };

  const openModal = (idx: number, field: "book1" | "book1log" | "book2" | "book2log" | "note", value: string | undefined) => {
    setModalOpen(true);
    setModalRowIdx(idx);
    setModalField(field);
    setModalValue(value || "");
  };

  const handleModalSave = () => {
    if (modalRowIdx !== null && modalField) {
      setRows(prev => prev.map((r, i) =>
        i === modalRowIdx ? { ...r, [modalField]: modalValue } : r
      ));
    }
    setModalOpen(false);
  };

  if (loading) return (
    <div className="p-8 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <div className="text-gray-400">로딩 중...</div>
    </div>
  );

  if (error) return (
    <div className="p-8 text-center">
      <div className="text-red-400 text-4xl mb-4">⚠️</div>
      <div className="text-red-500">{error}</div>
    </div>
  );

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <LearningTabs />
        
        {/* 메인 콘텐츠 */}
        <div className="flex gap-6 relative">
          
          {/* 왼쪽 사이드바 */}
          <div className={`transition-all duration-300 ${
            isSidebarOpen ? 'w-72' : 'w-0 overflow-hidden'
          }`}>
            <div className="w-72 max-h-[800px] flex-shrink-0 space-y-4 overflow-y-auto">
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
                    onClick={() => setClassModalOpen(true)}
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
                  
                  <div className="space-y-3">
                    {classes.map(cls => {
                      const classStudentList = getClassStudents(cls.id);
                      const addedStudentIds = rows.filter(r => r.classId === cls.id).map(r => r.studentId);
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
                                    <div className="text-xs text-gray-500 mb-1">
                                      {classStudentList.length}명
                                    </div>
                                  </div>
                                </div>
                                
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddAll(cls.id);
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
                              {classStudentList
                                .filter(s => !addedStudentIds.includes(s.id))
                                .map(s => (
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
                                          onClick={() => handleAddStudent(cls.id, s)}
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
                              
                              {classStudentList.filter(s => !addedStudentIds.includes(s.id)).length === 0 && (
                                <div className="text-center py-4 text-gray-400 text-sm">
                                  이미 모든 학생이 추가됨
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                                : `${selectedClassIds.length}개 반 선택`}
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
                        onClick={() => setRows([])}
                        className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        일괄 삭제
                      </Button>
                      <Button 
                        size="sm"
                        onClick={handleSave}
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
                                  className={`inline-flex items-center justify-center w-8 h-8 text-xs font-bold rounded-full border-2 cursor-pointer ${scoreColor(row.attendance)}`}
                                  onClick={() => {
                                    const nextValue = row.attendance === 5 ? 1 : row.attendance + 1;
                                    handleChange(originalIdx, "attendance", nextValue);
                                  }}
                                >
                                  {row.attendance}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span 
                                  className={`inline-flex items-center justify-center w-8 h-8 text-xs font-bold rounded-full border-2 cursor-pointer ${scoreColor(row.homework)}`}
                                  onClick={() => {
                                    const nextValue = row.homework === 5 ? 1 : row.homework + 1;
                                    handleChange(originalIdx, "homework", nextValue);
                                  }}
                                >
                                  {row.homework}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span 
                                  className={`inline-flex items-center justify-center w-8 h-8 text-xs font-bold rounded-full border-2 cursor-pointer ${scoreColor(row.focus)}`}
                                  onClick={() => {
                                    const nextValue = row.focus === 5 ? 1 : row.focus + 1;
                                    handleChange(originalIdx, "focus", nextValue);
                                  }}
                                >
                                  {row.focus}
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
                                  onClick={() => setRows(rows => rows.filter((_, i) => i !== originalIdx))}
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
          </div>
        </div>
        
        {/* 모달: 교재/진도 입력 확대 */}
        {modalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 w-[400px] max-w-full">
              <div className="mb-4 font-semibold text-lg">
                {modalField === "note" ? "특이사항 입력" : "교재/진도 입력"}
              </div>
              <input
                ref={modalInputRef}
                className="input input-bordered w-full text-lg h-12 px-4 py-3"
                value={modalValue}
                onChange={e => setModalValue(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setModalOpen(false)}>취소</Button>
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