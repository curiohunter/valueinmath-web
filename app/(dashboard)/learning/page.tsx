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
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { HelpCircle, Trash2, ChevronLeft, ChevronRight, Plus, Calendar, Users, ChevronDown, Filter, X } from "lucide-react";
import { ClassFormModal } from "@/app/(dashboard)/students/classes/class-form-modal";

// 한국 시간대(KST) 기준으로 오늘 날짜 가져오기
const getKoreanDate = () => {
  const now = new Date();
  // UTC+9 (한국 시간)
  const koreanTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  return koreanTime.toISOString().slice(0, 10);
};

const today = getKoreanDate();

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
  const supabase = createClient();
  
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
  const [deletedRowIds, setDeletedRowIds] = useState<string[]>([]); // 삭제된 행의 ID 추적
  
  // 필드별 변경 추적을 위한 state (부분 업데이트용)
  const [dirtyFields, setDirtyFields] = useState<Map<string, Set<string>>>(new Map());
  
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
      const { data: classData } = await supabase.from("classes").select("id, name, teacher_id");
      const { data: classStudentData } = await supabase.from("class_students").select("class_id, student_id");
      const { data: studentData } = await supabase.from("students").select("id, name, status, grade, school_type");
      const { data: teacherData } = await supabase.from("employees").select("id, name");
      
      setClasses(classData || []);
      setClassStudents(classStudentData || []);
      setStudents(studentData || []);
      setTeachers(teacherData || []);
      
      if (classData && classData.length > 0) setSelectedClassId(classData[0].id);
      
      // 현재 날짜 확인
      const currentDate = date || getKoreanDate();
      await fetchLogsForDate(currentDate);
    } catch (e) {
      console.error("Error in fetchData:", e);
      setError("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 특정 날짜의 학습 기록 불러오기
  const fetchLogsForDate = async (targetDate: string) => {
    setDeletedRowIds([]); // 날짜 변경 시 삭제 목록 초기화
    try {
      const { data: logs, error } = await supabase
        .from("study_logs")
        .select("*, students (name, status)")
        .eq("date", targetDate);
      
      if (error) {
        console.error("Supabase error details:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          full: JSON.stringify(error, null, 2)
        });
        throw error;
      }
      
      if (logs && logs.length > 0) {
        // Fetch employees data separately to get names
        const employeeIds = new Set<string>();
        logs.forEach((log: any) => {
          if (log.created_by) employeeIds.add(log.created_by);
          if (log.last_modified_by) employeeIds.add(log.last_modified_by);
        });
        
        let employeeMap = new Map<string, string>();
        if (employeeIds.size > 0) {
          const { data: employees } = await supabase
            .from("employees")
            .select("id, name")
            .in("id", Array.from(employeeIds));
          
          employeeMap = new Map(employees?.map(e => [e.id, e.name]) || []);
        }
        
        const mappedRows = logs.map((log: any) => {
          const studentStatus = log.students?.status || '';
          const isRetired = studentStatus && !studentStatus.includes('재원');
          const studentName = log.students?.name || "(알 수 없음)";
          
          return {
            id: log.id,
            classId: log.class_id || "",
            studentId: log.student_id || "",
            name: isRetired ? studentName + " (퇴원)" : studentName,
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
            createdByName: employeeMap.get(log.created_by) || "",
            lastModifiedBy: log.last_modified_by,
            lastModifiedByName: employeeMap.get(log.last_modified_by) || "",
            updatedAt: log.updated_at
          };
        });
        
        setRows(mappedRows);
        setOriginalRows(mappedRows);
      } else {
        setRows([]);
        setOriginalRows([]);
      }
    } catch (error) {
      console.error("Error fetching logs for date:", targetDate, error);
      setError("학습 기록을 불러오는 중 오류가 발생했습니다.");
    }
  };


  useEffect(() => {
    fetchData();
  }, []);
  
  // 실시간 동기화 구현
  useEffect(() => {
    if (!date) return;
    
    // Supabase Realtime 구독
    const channel = supabase
      .channel('study_logs_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'study_logs',
          filter: "date=eq." + date
        },
        async (payload) => {
          // 다른 사용자의 변경사항 처리
          if (payload.eventType === 'UPDATE') {
            const updatedRow = payload.new;
            
            // 현재 편집 중인 필드는 건드리지 않음
            const rowKey = String(updatedRow.id);
            const localDirtyFields = dirtyFields.get(rowKey);
            
            if (!localDirtyFields || localDirtyFields.size === 0) {
              // 로컬 변경사항이 없으면 서버 데이터로 완전 업데이트
              const updatedData = {
                attendance: updatedRow.attendance_status || 5,
                homework: updatedRow.homework || 5,
                focus: updatedRow.focus || 5,
                note: updatedRow.note || "",
                book1: updatedRow.book1 || "",
                book1log: updatedRow.book1log || "",
                book2: updatedRow.book2 || "",
                book2log: updatedRow.book2log || "",
                lastModifiedBy: updatedRow.last_modified_by,
                updatedAt: updatedRow.updated_at
              };
              
              setRows(prev => prev.map(r => {
                if (r.id === updatedRow.id) {
                  return { ...r, ...updatedData };
                }
                return r;
              }));
              
              // originalRows도 업데이트하여 새로운 기준점으로 설정
              setOriginalRows(prev => prev.map(r => {
                if (r.id === updatedRow.id) {
                  return { ...r, ...updatedData };
                }
                return r;
              }));
            } else {
              // 로컬 변경사항이 있으면 변경하지 않은 필드만 업데이트
              setRows(prev => prev.map(r => {
                if (r.id === updatedRow.id) {
                  const updatedFields: any = { ...r };
                  
                  // 변경하지 않은 필드만 서버 값으로 업데이트
                  if (!localDirtyFields.has('attendance')) {
                    updatedFields.attendance = updatedRow.attendance_status || 5;
                  }
                  if (!localDirtyFields.has('homework')) {
                    updatedFields.homework = updatedRow.homework || 5;
                  }
                  if (!localDirtyFields.has('focus')) {
                    updatedFields.focus = updatedRow.focus || 5;
                  }
                  if (!localDirtyFields.has('note')) {
                    updatedFields.note = updatedRow.note || "";
                  }
                  if (!localDirtyFields.has('book1')) {
                    updatedFields.book1 = updatedRow.book1 || "";
                  }
                  if (!localDirtyFields.has('book1log')) {
                    updatedFields.book1log = updatedRow.book1log || "";
                  }
                  if (!localDirtyFields.has('book2')) {
                    updatedFields.book2 = updatedRow.book2 || "";
                  }
                  if (!localDirtyFields.has('book2log')) {
                    updatedFields.book2log = updatedRow.book2log || "";
                  }
                  
                  // 메타 정보는 항상 업데이트
                  updatedFields.lastModifiedBy = updatedRow.last_modified_by;
                  updatedFields.updatedAt = updatedRow.updated_at;
                  
                  return updatedFields;
                }
                return r;
              }));
              
              // originalRows도 업데이트 (변경하지 않은 필드만)
              setOriginalRows(prev => prev.map(r => {
                if (r.id === updatedRow.id) {
                  const updatedOriginal: any = { ...r };
                  
                  // 로컬에서 변경하지 않은 필드만 업데이트
                  if (!localDirtyFields.has('attendance')) {
                    updatedOriginal.attendance = updatedRow.attendance_status || 5;
                  }
                  if (!localDirtyFields.has('homework')) {
                    updatedOriginal.homework = updatedRow.homework || 5;
                  }
                  if (!localDirtyFields.has('focus')) {
                    updatedOriginal.focus = updatedRow.focus || 5;
                  }
                  if (!localDirtyFields.has('note')) {
                    updatedOriginal.note = updatedRow.note || "";
                  }
                  if (!localDirtyFields.has('book1')) {
                    updatedOriginal.book1 = updatedRow.book1 || "";
                  }
                  if (!localDirtyFields.has('book1log')) {
                    updatedOriginal.book1log = updatedRow.book1log || "";
                  }
                  if (!localDirtyFields.has('book2')) {
                    updatedOriginal.book2 = updatedRow.book2 || "";
                  }
                  if (!localDirtyFields.has('book2log')) {
                    updatedOriginal.book2log = updatedRow.book2log || "";
                  }
                  
                  return updatedOriginal;
                }
                return r;
              }));
            }
          } else if (payload.eventType === 'INSERT') {
            // 새로운 행이 추가된 경우
            await fetchLogsForDate(date);
          } else if (payload.eventType === 'DELETE') {
            // 행이 삭제된 경우
            setRows(prev => prev.filter(r => r.id !== payload.old.id));
          }
        }
      )
      .subscribe();
    
    return () => {
      channel.unsubscribe();
    };
  }, [date, dirtyFields]);

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
      // 같은 반, 같은 학생, 같은 날짜인 경우만 중복 체크
      const existingRow = prev.find(r => 
        r.classId === classId && 
        r.studentId === student.id && 
        r.date === date
      );
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

  // 표 입력 변경 (부분 업데이트를 위한 변경 추적 포함)
  const handleChange = (idx: number, key: keyof (typeof rows)[number], value: any) => {
    const row = rows[idx];
    
    // originalRows에서 id로 매칭 (id가 있는 경우)
    const originalRow = row.id ? originalRows.find(or => or.id === row.id) : null;
    
    // 행 데이터 업데이트
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
    
    // 기존 데이터가 있는 경우만 변경 추적 (새로 추가된 행은 제외)
    if (row.id && originalRow) {
      const rowKey = String(row.id);
      
      // 원본과 비교하여 변경 여부 확인
      if (originalRow[key] !== value) {
        setDirtyFields(prev => {
          const newMap = new Map(prev);
          if (!newMap.has(rowKey)) {
            newMap.set(rowKey, new Set());
          }
          newMap.get(rowKey)!.add(key);
          return newMap;
        });
      } else {
        // 원본과 같으면 dirty 제거
        setDirtyFields(prev => {
          const newMap = new Map(prev);
          if (newMap.has(rowKey)) {
            newMap.get(rowKey)!.delete(key);
            if (newMap.get(rowKey)!.size === 0) {
              newMap.delete(rowKey);
            }
          }
          return newMap;
        });
      }
    }
  };

  // 저장 버튼 클릭
  const handleSave = async () => {
    
    if (rows.length === 0 && deletedRowIds.length === 0) {
      alert("저장할 데이터가 없습니다.");
      return;
    }
    
    try {
      // 먼저 삭제된 항목들을 DB에서 삭제
      if (deletedRowIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("study_logs")
          .delete()
          .in("id", deletedRowIds);
        
        if (deleteError) {
          throw deleteError;
        }
        
        // 삭제만 하고 저장할 새 데이터가 없으면 여기서 성공 처리
        if (rows.length === 0) {
          alert("삭제되었습니다.");
          await fetchLogsForDate(date);
          setHasUnsavedChanges(false);
          setDeletedRowIds([]);
          setDirtyFields(new Map());
          return;
        }
      }
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
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

      // ID가 있는 행과 없는 행 분리
      const existingRows = rows.filter(r => r.id);
      const newRows = rows.filter(r => !r.id);
      
      
      // 중복 체크: 같은 학생, 같은 반, 같은 날짜가 이미 DB에 있는지 확인
      const potentiallyDuplicateRows: typeof rows = [];
      const trulyNewRows: typeof rows = [];
      const duplicateRowsOriginalData = new Map<string, any>(); // 중복 행의 원본 DB 데이터 저장
      
      if (newRows.length > 0) {
        // 해당 날짜의 모든 기존 데이터 조회 (전체 필드 포함)
        const { data: existingData } = await supabase
          .from("study_logs")
          .select("*")
          .eq("date", date);
        
        for (const row of newRows) {
          const exists = existingData?.find(
            existing => 
              existing.student_id === row.studentId && 
              existing.class_id === row.classId &&
              existing.date === row.date
          );
          
          if (exists) {
            // 이미 존재하는 행이면 업데이트 대상으로 변경
            const rowWithId = { ...row, id: exists.id };
            potentiallyDuplicateRows.push(rowWithId);
            // 원본 DB 데이터 저장 (나중에 병합용)
            duplicateRowsOriginalData.set(exists.id, exists);
          } else {
            // 진짜 새로운 행
            trulyNewRows.push(row);
          }
        }
        
        // 중복된 행들을 기존 행 목록에 추가
        existingRows.push(...potentiallyDuplicateRows);
      }
      
      let error = null;
      
      // 기존 행 업데이트 - 부분 업데이트 적용
      if (existingRows.length > 0) {
        
        // 저장 전에 최신 DB 데이터를 가져와서 다른 사용자의 변경사항과 병합
        const { data: latestDbData } = await supabase
          .from("study_logs")
          .select("*")
          .in("id", existingRows.map(r => r.id));
        
        const latestDbMap = new Map(latestDbData?.map(d => [d.id, d]) || []);
        
        // 부분 업데이트: 변경된 필드만 업데이트
        for (const row of existingRows) {
          const rowKey = String(row.id);
          const changedFields = dirtyFields.get(rowKey);
          const latestData = latestDbMap.get(row.id);
          
          // potentiallyDuplicateRows에서 온 행인지 확인
          const isDuplicateRow = potentiallyDuplicateRows.some(r => r.id === row.id);
          
          // 중복 행이거나 변경된 필드가 있는 경우 업데이트
          
          if (isDuplicateRow || (changedFields && changedFields.size > 0)) {
            const updateData: any = {
              last_modified_by: currentEmployee?.id
              // updated_at은 DB 트리거가 자동으로 처리
            };
            
            // 중복 행인 경우 모든 필드 업데이트, 아니면 변경된 필드만 업데이트
            if (isDuplicateRow) {
              // 중복 행은 기존 DB 값과 병합하여 업데이트
              const originalData = duplicateRowsOriginalData.get(row.id!);
              
              // 로컬 값이 초기값(5)과 다르면 로컬 값 사용, 같으면 기존 DB 값 사용
              // 숫자 필드: 로컬에서 변경했으면 그 값 사용, 안 했으면 DB 값 유지
              updateData.attendance_status = row.attendance !== 5 ? 
                (typeof row.attendance === "number" ? row.attendance : attendanceMap[row.attendance]) :
                (originalData?.attendance_status || 5);
              
              updateData.homework = row.homework !== 5 ?
                (typeof row.homework === "number" ? row.homework : homeworkMap[row.homework]) :
                (originalData?.homework || 5);
              
              updateData.focus = row.focus !== 5 ?
                (typeof row.focus === "number" ? row.focus : focusMap[row.focus]) :
                (originalData?.focus || 5);
              
              // 텍스트 필드: 빈 문자열이 아니면 로컬 값 사용, 빈 문자열이면 DB 값 유지
              updateData.book1 = row.book1 !== "" ? row.book1 : (originalData?.book1 || "");
              updateData.book1log = row.book1log !== "" ? row.book1log : (originalData?.book1log || "");
              updateData.book2 = row.book2 !== "" ? row.book2 : (originalData?.book2 || "");
              updateData.book2log = row.book2log !== "" ? row.book2log : (originalData?.book2log || "");
              updateData.note = row.note !== "" ? row.note : (originalData?.note || "");
              updateData.date = row.date;
            } else if (changedFields && changedFields.size > 0) {
              // 일반 행은 변경된 필드만 업데이트
              
              // 중요: DB의 최신 데이터로 시작하여 다른 사용자의 변경사항 보존
              if (latestData) {
                // 모든 필드를 DB 값으로 초기화
                updateData.attendance_status = latestData.attendance_status || 5;
                updateData.homework = latestData.homework || 5;
                updateData.focus = latestData.focus || 5;
                updateData.book1 = latestData.book1 || "";
                updateData.book1log = latestData.book1log || "";
                updateData.book2 = latestData.book2 || "";
                updateData.book2log = latestData.book2log || "";
                updateData.note = latestData.note || "";
                updateData.date = latestData.date || row.date;
              }
              
              // 그 다음 현재 사용자가 변경한 필드만 덮어쓰기
              changedFields.forEach(field => {
                switch(field) {
                  case 'attendance':
                    updateData.attendance_status = typeof row.attendance === "number" ? 
                      row.attendance : attendanceMap[row.attendance];
                    break;
                  case 'homework':
                    updateData.homework = typeof row.homework === "number" ? 
                      row.homework : homeworkMap[row.homework];
                    break;
                  case 'focus':
                    updateData.focus = typeof row.focus === "number" ? 
                      row.focus : focusMap[row.focus];
                    break;
                  case 'book1':
                    updateData.book1 = row.book1;
                    break;
                  case 'book1log':
                    updateData.book1log = row.book1log;
                    break;
                  case 'book2':
                    updateData.book2 = row.book2;
                    break;
                  case 'book2log':
                    updateData.book2log = row.book2log;
                    break;
                  case 'note':
                    updateData.note = row.note;
                    break;
                  case 'date':
                    updateData.date = row.date;
                    break;
                }
              });
            }
            
            
            // 개별 행 업데이트
            const { data: updateResult, error: updateError } = await supabase
              .from("study_logs")
              .update(updateData)
              .eq('id', row.id)
              .select();
            
            if (updateError) {
              console.error("Failed to update row", row.id, ":", {
                error: updateError,
                message: updateError.message,
                details: updateError.details,
                hint: updateError.hint,
                code: updateError.code
              });
              error = updateError;
              break;
            } else {
            }
          }
        }
      }
      
      // 진짜 새로운 행만 삽입
      if (!error && trulyNewRows.length > 0) {
        // 학생과 반 이름 조회 (스냅샷용)
        const studentIds = [...new Set(trulyNewRows.map(r => r.studentId).filter(Boolean))]
        const classIds = [...new Set(trulyNewRows.map(r => r.classId).filter(Boolean))]
        
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
        
        const insertData = trulyNewRows.map(r => {
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
            student_name_snapshot: studentNameMap.get(r.studentId) || null,
            class_name_snapshot: r.classId ? classNameMap.get(r.classId) || null : null,
          };
        });
        
        const { error: insertError } = await supabase
          .from("study_logs")
          .insert(insertData);
        
        if (insertError) error = insertError;
      }
      
      if (error) {
        throw error;
      }
      
      alert("저장되었습니다.");
      // 현재 선택된 날짜의 데이터를 다시 불러오기 (과거 날짜 편집 후에도 해당 날짜 유지)
      await fetchLogsForDate(date);
      setHasUnsavedChanges(false);
      setDeletedRowIds([]); // 삭제 목록 초기화
      setDirtyFields(new Map()); // 변경 추적 초기화
    } catch (e) {
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
    
    // handleChange를 사용하여 각 행별로 변경 추적
    rows.forEach((r, idx) => {
      if (selectedClassIds.length === 0 || selectedClassIds.includes(r.classId)) {
        handleChange(idx, key, firstValue);
      }
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
      // handleChange를 사용하여 dirtyFields 추적
      handleChange(modalRowIdx, modalField, modalValue);
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
          <div className={"transition-all duration-300 " + (isSidebarOpen ? 'w-72' : 'w-0 overflow-hidden')}>
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
                        onClick={() => {
                          // ID가 있는 행들(DB에 저장된 행들)을 deletedRowIds에 추가
                          const existingIds = rows.filter(r => r.id).map(r => r.id!);
                          if (existingIds.length > 0) {
                            setDeletedRowIds(prev => [...prev, ...existingIds]);
                          }
                          // 화면에서 모든 행 제거
                          setRows([]);
                        }}
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
                                  className={"inline-flex items-center justify-center w-8 h-8 text-xs font-bold rounded-full border-2 cursor-pointer " + scoreColor(row.attendance)}
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
                                  className={"inline-flex items-center justify-center w-8 h-8 text-xs font-bold rounded-full border-2 cursor-pointer " + scoreColor(row.homework)}
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
                                  className={"inline-flex items-center justify-center w-8 h-8 text-xs font-bold rounded-full border-2 cursor-pointer " + scoreColor(row.focus)}
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