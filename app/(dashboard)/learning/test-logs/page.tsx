"use client";

import React, { useState, useEffect, Fragment, useRef } from "react";
import LearningTabs from "@/components/LearningTabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import type { Database } from "@/types/database";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Calendar, Users, Search, RotateCcw, FileText, Plus, Trash2, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { ClassAccordion } from "@/components/ui/class-accordion";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// 한국 시간대(KST) 기준으로 오늘 날짜 가져오기
const getKoreanDate = () => {
  const now = new Date();
  const koreanTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  return koreanTime.toISOString().slice(0, 10);
};

// 점수 색상 스타일 함수 (노션 스타일)
const scoreColor = (score: number) => {
  switch (score) {
    case 100: return "bg-green-100 text-green-700 border-green-200";
    case 90: case 95: return "bg-blue-100 text-blue-600 border-blue-200";
    case 80: case 85: return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case 70: case 75: return "bg-orange-100 text-orange-600 border-orange-200";
    default: return "bg-red-100 text-red-600 border-red-200";
  }
};

export default function TestLogsPage() {
  const supabase = getSupabaseBrowserClient();
  const { user, loading: authLoading } = useAuth();
  const [date, setDate] = useState(() => getKoreanDate());
  const [rows, setRows] = useState<Array<{
    id?: string;
    classId: string;
    studentId: string;
    name: string;
    date: string;
    testType: string;
    test: string;
    testScore: number | null;
    note: string;
    createdBy?: string;
    createdByName?: string;
    lastModifiedBy?: string;
    lastModifiedByName?: string;
    updatedAt?: string;
  }>>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [openClassIds, setOpenClassIds] = useState<string[]>([]);
  const [filterClassId, setFilterClassId] = useState<string>("all");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalRows, setOriginalRows] = useState<typeof rows>([]);
  const [deletedRowIds, setDeletedRowIds] = useState<string[]>([]); // 삭제된 행의 ID 추적
  
  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRowIdx, setModalRowIdx] = useState<number | null>(null);
  const [modalField, setModalField] = useState<"note" | null>(null);
  const [modalValue, setModalValue] = useState("");
  const modalInputRef = useRef<HTMLInputElement>(null);

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
  ];

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: classData } = await supabase.from("classes").select("id, name, teacher_id");
      const { data: classStudentData } = await supabase.from("class_students").select("class_id, student_id");
      const { data: studentData } = await supabase.from("students").select("id, name, status");
      const { data: teacherData } = await supabase.from("employees").select("id, name");
      setClasses(classData || []);
      setClassStudents(classStudentData || []);
      setStudents(studentData || []);
      setTeachers(teacherData || []);
      if (classData && classData.length > 0) setSelectedClassId(classData[0].id);
      
      await fetchTestLogsByDate();
    } catch (e) {
      setError("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTestLogsByDate = async () => {
    setDeletedRowIds([]); // 새로 불러올 때 삭제 목록 초기화
    try {
      // 현재 선택된 날짜 사용 (오늘이 아닌 date state 사용)
      const { data: todayLogs, error } = await supabase
        .from("test_logs")
        .select(`
          *,
          student:students!left(name, status),
          created_employee:employees!left(name),
          modified_employee:employees!left(name)
        `)
        .eq("date", date);
      
      if (error) throw error;
      
      if (todayLogs && todayLogs.length > 0) {
        const employeeIds = [...new Set([
          ...todayLogs.map(log => log.created_by).filter(Boolean),
          ...todayLogs.map(log => log.last_modified_by).filter(Boolean)
        ])];
          
        const { data: employeesData } = await supabase
          .from("employees")
          .select("id, name")
          .in("id", employeeIds.filter(id => id !== null));
          
        const employeeMap = new Map(employeesData?.map(e => [e.id, e.name]) || []);
        
        const mappedLogs = todayLogs.map((log: any) => {
          const studentStatus = log.student?.status || '';
          const isRetired = studentStatus && !studentStatus.includes('재원');
          const studentName = log.student?.name || "(알 수 없음)";
          
          return {
            id: log.id,
            classId: log.class_id || "",
            studentId: log.student_id || "",
            name: isRetired ? `${studentName} (퇴원)` : studentName,
            date: log.date,
            testType: log.test_type || "",
            test: log.test || "",
            testScore: log.test_score,
            note: log.note || "",
            createdBy: log.created_by,
            createdByName: log.created_employee?.name || "",
            lastModifiedBy: log.last_modified_by,
            lastModifiedByName: log.modified_employee?.name || "",
            updatedAt: log.updated_at
          };
        });
        setRows(mappedLogs);
        setOriginalRows(mappedLogs);
      }
    } catch (error) {
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 날짜가 변경될 때 해당 날짜의 데이터 불러오기
  useEffect(() => {
    if (date) {
      fetchTestLogsByDate();
    }
  }, [date]);

  useEffect(() => {
    // 모든 날짜의 test_logs 변경사항 구독 (여러 날짜를 동시에 편집할 수 있으므로)
    const channel = supabase
      .channel('all-test-logs')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'test_logs'
        }, 
        (payload: any) => {
          // 현재 편집 중인 날짜들의 데이터만 다시 불러오기
          const uniqueDates = [...new Set(rows.map(r => r.date))];
          if (uniqueDates.includes((payload.new as any)?.date || (payload.old as any)?.date)) {
            fetchTestLogsByDate();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rows]);

  // 데이터 변경 감지
  useEffect(() => {
    const hasChanges = JSON.stringify(rows) !== JSON.stringify(originalRows);
    setHasUnsavedChanges(hasChanges);
  }, [rows, originalRows]);

  // 자정 감지 및 자동 저장
  useEffect(() => {
    const checkDateChange = () => {
      const currentDate = getKoreanDate();
      
      if (currentDate !== date && rows.length > 0) {
        
        handleSave().then(() => {
          setDate(currentDate);
          setRows([]);
          fetchData();
        });
      }
    };

    const interval = setInterval(checkDateChange, 60000);
    return () => clearInterval(interval);
  }, [date, rows.length]);

  const getClassStudents = (classId: string) => {
    const studentIds = classStudents.filter(cs => cs.class_id === classId).map(cs => cs.student_id);
    return students
      .filter(s => studentIds.includes(s.id) && s.status?.trim().includes("재원"))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  };

  const handleAddAll = (classId: string) => {
    const classStudentList = getClassStudents(classId);
    setRows(prev => [
      ...prev,
      ...classStudentList
        .map(s => ({
          classId,
          studentId: s.id,
          name: s.name,
          date,
          test: "",
          testType: "",
          testScore: null,
          note: "",
        })),
    ]);
  };

  const handleAddStudent = (classId: string, student: { id: string; name: string }) => {
    // 중복 체크 없이 바로 추가 - 같은 학생이 여러 시험을 볼 수 있도록
    setRows(prev => [
      ...prev,
      {
        classId,
        studentId: student.id,
        name: student.name,
        date,
        test: "",
        testType: "",
        testScore: null,
        note: "",
      },
    ]);
  };

  const handleApplyAllDate = () => {
    setRows(prev => prev.map(r => ({ ...r, date })));
  };

  const handleChange = (idx: number, key: keyof (typeof rows)[number], value: any) => {
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  };

  const handleBulkApply = (key: "test" | "testType" | "testScore") => {
    const currentFilteredRows = rows
      .filter(row => filterClassId === "all" || row.classId === filterClassId)
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
    
    if (key !== "testScore" && (!firstValue || (typeof firstValue === 'string' && firstValue.trim() === ""))) {
      alert("첫 번째 학생의 해당 항목이 비어있습니다.");
      return;
    }
    
    setRows(prev => {
      return prev.map(r => {
        if (filterClassId === "all" || r.classId === filterClassId) {
          return { ...r, [key]: firstValue };
        }
        return r;
      });
    });
  };

  const handleSave = async () => {
    if (rows.length === 0 && deletedRowIds.length === 0) {
      alert("저장할 데이터가 없습니다.");
      return;
    }
    
    // 유효한 데이터만 필터링 (최소한 학생과 날짜가 있어야 함)
    const validRows = rows.filter(r => r.studentId && r.date);
    const invalidRowCount = rows.length - validRows.length;
    
    if (validRows.length === 0 && deletedRowIds.length === 0) {
      alert("저장할 수 있는 유효한 데이터가 없습니다. 최소한 학생과 날짜 정보가 필요합니다.");
      return;
    }
    
    if (invalidRowCount > 0) {
      if (!confirm(`${invalidRowCount}개의 불완전한 행이 있습니다. 이 행들은 저장되지 않습니다. 계속하시겠습니까?`)) {
        return;
      }
    }
    
    try {
      // 먼저 삭제된 항목들을 DB에서 삭제
      if (deletedRowIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("test_logs")
          .delete()
          .in("id", deletedRowIds);
        
        if (deleteError) {
          throw deleteError;
        }
      }
      // useAuth hook에서 가져온 user 사용 (세션 만료 방지)
      if (!user) {
        alert("로그인 세션이 만료되었습니다. 페이지를 새로고침해주세요.");
        window.location.reload();
        return;
      }
      
      const { data: currentEmployee, error: employeeError } = await supabase
        .from("employees")
        .select("id")
        .eq("auth_id", user.id)
        .single();
      
      if (employeeError) {
        console.error("직원 정보 조회 오류:", employeeError);
        // 직원 정보가 없어도 저장은 계속 진행 (last_modified_by만 null로 설정됨)
      }

      // 반별 담당 선생님 정보 가져오기
      const classIds = [...new Set(validRows.map(r => r.classId).filter(Boolean))];
      const { data: classData } = await supabase
        .from("classes")
        .select("id, teacher_id")
        .in("id", classIds);
      
      const classTeacherMap = new Map(classData?.map(c => [c.id, c.teacher_id]) || []);

      // 기존 레코드와 새 레코드 분리
      const existingRows = validRows.filter(r => r.id);
      const newRows = validRows.filter(r => !r.id);
      
      let error = null;
      
      // 기존 레코드 업데이트
      if (existingRows.length > 0) {
        const updateData = existingRows.map(r => ({
          id: r.id,
          class_id: r.classId || null,
          student_id: r.studentId,
          date: r.date,
          test: r.test && r.test.trim() ? r.test : null,  // 빈 값은 null로 처리
          test_type: r.testType || null,  // null로 처리
          test_score: typeof r.testScore === 'string' && r.testScore !== '' ? Number(r.testScore) : r.testScore,
          note: r.note || null,
          last_modified_by: currentEmployee?.id || null
        }));
        
        // @ts-ignore - complex type issue
        const { error: updateError } = await supabase
          .from("test_logs")
          .upsert(updateData, { onConflict: "id" });
        
        if (updateError) error = updateError;
      }
      
      // 새 레코드 삽입
      if (!error && newRows.length > 0) {
        // 학생과 반 이름 조회 (스냅샷용)
        const studentIds = [...new Set(newRows.map(r => r.studentId).filter(Boolean))]
        const classIds = [...new Set(newRows.map(r => r.classId).filter(Boolean))]
        
        const { data: studentsData } = await supabase
          .from("students")
          .select("id, name")
          .in("id", studentIds)
        
        const { data: classesData } = await supabase
          .from("classes")
          .select("id, name")
          .in("id", classIds)
        
        const studentNameMap = new Map(studentsData?.map(s => [s.id, s.name]) || [])
        const classNameMap = new Map(classesData?.map(c => [c.id, c.name]) || [])
        
        const insertData = newRows.map((r, index) => {
          const teacherId = r.classId ? classTeacherMap.get(r.classId) : null;
          return {
            class_id: r.classId || null,
            student_id: r.studentId,
            date: r.date,
            test: r.test && r.test.trim() ? r.test : null,  // 빈 값은 null로 처리
            test_type: r.testType || null,  // null로 처리
            test_score: typeof r.testScore === 'string' && r.testScore !== '' ? Number(r.testScore) : r.testScore,
            note: r.note || null,
            created_by: teacherId || null,
            student_name_snapshot: studentNameMap.get(r.studentId) || null,
            class_name_snapshot: r.classId ? classNameMap.get(r.classId) || null : null,
          };
        });
        
        // @ts-ignore - complex type issue
        const { error: insertError } = await supabase
          .from("test_logs")
          .insert(insertData);
        
        if (insertError) error = insertError;
      }
      if (error) throw error;
      
      alert("저장되었습니다.");
      
      await fetchTestLogsByDate();
      setHasUnsavedChanges(false);
      setDeletedRowIds([]); // 삭제 목록 초기화
    } catch (e: any) {
      console.error("저장 오류:", e);
      alert(`저장 중 오류가 발생했습니다: ${e.message || '알 수 없는 오류'}`);
    }
  };

  const toggleClassAccordion = (classId: string) => {
    setOpenClassIds(prev =>
      prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
    );
  };
  
  // 모달 열기
  const openModal = (rowIdx: number, field: "note", value: string) => {
    setModalRowIdx(rowIdx);
    setModalField(field);
    setModalValue(value);
    setModalOpen(true);
    setTimeout(() => modalInputRef.current?.focus(), 100);
  };
  
  // 모달 저장
  const handleModalSave = () => {
    if (modalRowIdx !== null && modalField) {
      handleChange(modalRowIdx, modalField, modalValue);
    }
    setModalOpen(false);
  };

  if (authLoading || loading) return (
    <div className="p-8 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <div className="text-gray-400">로딩 중...</div>
    </div>
  );
  
  if (!user) return (
    <div className="p-8 text-center">
      <div className="text-red-400 text-4xl mb-4">🔒</div>
      <div className="text-red-500">로그인이 필요합니다</div>
    </div>
  );
  
  if (error) return (
    <div className="p-8 text-center">
      <div className="text-red-400 text-4xl mb-4">⚠️</div>
      <div className="text-red-500">{error}</div>
    </div>
  );

  const filteredAndSortedRows = rows
    .filter(row => filterClassId === "all" || row.classId === filterClassId)
    .sort((a, b) => {
      const classA = classes.find(c => c.id === a.classId)?.name || "";
      const classB = classes.find(c => c.id === b.classId)?.name || "";
      if (classA !== classB) return classA.localeCompare(classB, "ko");
      return a.name.localeCompare(b.name, "ko");
    });

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <LearningTabs />
        
        {/* 메인 컨텐츠 */}
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
                    {/* 담당 선생님별로 반 그룹화 */}
                    {(() => {
                      // 담당 선생님별로 반 그룹화
                      const groupedClasses = classes.reduce((acc: { [key: string]: any[] }, cls) => {
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
                          <div key={teacherId} className="space-y-2">
                            {/* 담당 선생님 헤더 */}
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
                            
                            {/* 해당 선생님의 반 목록 */}
                            <div className="space-y-2 ml-2">
                              {teacherClasses.map(cls => {
                                const classStudentList = getClassStudents(cls.id);
                                const addedStudentIds = rows.filter(r => r.classId === cls.id).map(r => r.studentId);
                                const isOpen = openClassIds.includes(cls.id);
                                return (
                  <div key={cls.id}>
                    {/* 반 헤더 - 카드형 디자인 */}
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
                    
                    {/* 학생 목록 - 아코디언 */}
                    {isOpen && (
                      <div className="mt-2 ml-4 space-y-2">
                        {classStudentList
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
                          
                        {classStudentList.length === 0 && (
                          <div className="text-center py-4 text-gray-400 text-sm">
                            학생이 없습니다
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* 사이드바 토글 버튼 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsSidebarOpen(!isSidebarOpen)}
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
                        onChange={(e) => setFilterClassId(e.target.value)}
                      >
                        <option value="all">전체</option>
                        {classes.map(cls => (
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
                            onClick={() => handleBulkApply("test")}
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
                            onClick={() => handleBulkApply("testType")}
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
                            onClick={() => handleBulkApply("testScore")}
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
                          const originalIdx = rows.indexOf(row);
                          return (
                          <tr key={originalIdx} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
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
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={row.test}
                                onChange={e => handleChange(originalIdx, "test", e.target.value)}
                                placeholder="테스트명"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <select
                                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={row.testType}
                                onChange={e => handleChange(originalIdx, "testType", e.target.value)}
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
                                onChange={e => handleChange(originalIdx, "testScore", e.target.value ? Number(e.target.value) : null)}
                                placeholder="점수"
                                min="0"
                                max="100"
                              />
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
                                onClick={() => {
                                  const rowToDelete = rows[originalIdx];
                                  if (rowToDelete.id) {
                                    // 기존 DB에 있는 행이면 삭제 목록에 추가
                                    setDeletedRowIds(prev => [...prev, rowToDelete.id!]);
                                  }
                                  setRows(rows => rows.filter((_, i) => i !== originalIdx));
                                }}
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
                </div>
              </div>
            </Card>
          </div>
        </div>
        
        {/* 모달: 특이사항 입력 */}
        {modalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 w-[400px] max-w-full">
              <div className="mb-4 font-semibold text-lg">특이사항 입력</div>
              <input
                ref={modalInputRef}
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={modalValue}
                onChange={e => setModalValue(e.target.value)}
                placeholder="특이사항을 입력하세요"
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setModalOpen(false)}>취소</Button>
                <Button variant="default" onClick={handleModalSave}>저장</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}