"use client";

import React, { useState, useEffect } from "react";
import LearningTabs from "@/components/learning/LearningTabs";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DateSelector } from "@/components/learning/test-logs/DateSelector";
import { ClassList } from "@/components/learning/test-logs/ClassList";
import { TestLogsMainTable } from "@/components/learning/test-logs/TestLogsMainTable";
import { NoteModal } from "@/components/learning/test-logs/NoteModal";

// 한국 시간대(KST) 기준으로 오늘 날짜 가져오기
const getKoreanDate = () => {
  const now = new Date();
  const koreanTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  return koreanTime.toISOString().slice(0, 10);
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
  
  // 필드별 변경 추적을 위한 state (부분 업데이트용)
  const [dirtyFields, setDirtyFields] = useState<Map<string, Set<string>>>(new Map());
  
  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRowIdx, setModalRowIdx] = useState<number | null>(null);
  const [modalField, setModalField] = useState<"note" | null>(null);
  const [modalValue, setModalValue] = useState("");


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
      // 현재 선택된 날짜 사용 (오늘이 아닌 date state 사용) - 간단한 쿼리로 변경
      const { data: todayLogs, error } = await supabase
        .from("test_logs")
        .select("*")
        .eq("date", date);
      
      if (error) {
        console.error("Supabase query error:", error);
        throw error;
      }
      
      if (todayLogs && todayLogs.length > 0) {
        // 학생 정보 별도로 가져오기
        const studentIds = [...new Set(todayLogs.map(log => log.student_id).filter(Boolean))];
        const { data: studentsData } = await supabase
          .from("students")
          .select("id, name, status")
          .in("id", studentIds);
        const studentMap = new Map(studentsData?.map(s => [s.id, s]) || []);
        
        // 직원 정보 가져오기
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
          const student = studentMap.get(log.student_id);
          const studentStatus = student?.status || '';
          const isRetired = studentStatus && !studentStatus.includes('재원');
          const studentName = student?.name || log.student_name_snapshot || "(알 수 없음)";
          
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
            createdByName: employeeMap.get(log.created_by) || "",
            lastModifiedBy: log.last_modified_by,
            lastModifiedByName: employeeMap.get(log.last_modified_by) || "",
            updatedAt: log.updated_at
          };
        });
        setRows(mappedLogs);
        setOriginalRows(mappedLogs);
      } else {
        // 데이터가 없을 때도 rows를 빈 배열로 설정
        setRows([]);
        setOriginalRows([]);
      }
    } catch (error) {
      console.error("Error fetching test logs:", error);
      // 에러가 발생해도 빈 배열로 설정하여 테이블은 표시
      setRows([]);
      setOriginalRows([]);
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

  // 실시간 동기화 구현
  useEffect(() => {
    if (!date) return;
    
    // Supabase Realtime 구독
    const channel = supabase
      .channel('test_logs_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'test_logs',
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
                id: updatedRow.id,
                classId: updatedRow.class_id,
                studentId: updatedRow.student_id,
                name: updatedRow.student_name || "",
                date: updatedRow.date,
                testType: updatedRow.test_type || "",
                test: updatedRow.test || "",
                testScore: updatedRow.test_score,
                note: updatedRow.note || "",
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
                  if (!localDirtyFields.has('test')) {
                    updatedFields.test = updatedRow.test || "";
                  }
                  if (!localDirtyFields.has('testType')) {
                    updatedFields.testType = updatedRow.test_type || "";
                  }
                  if (!localDirtyFields.has('testScore')) {
                    updatedFields.testScore = updatedRow.test_score;
                  }
                  if (!localDirtyFields.has('note')) {
                    updatedFields.note = updatedRow.note || "";
                  }
                  if (!localDirtyFields.has('date')) {
                    updatedFields.date = updatedRow.date;
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
                  if (!localDirtyFields.has('test')) {
                    updatedOriginal.test = updatedRow.test || "";
                  }
                  if (!localDirtyFields.has('testType')) {
                    updatedOriginal.testType = updatedRow.test_type || "";
                  }
                  if (!localDirtyFields.has('testScore')) {
                    updatedOriginal.testScore = updatedRow.test_score;
                  }
                  if (!localDirtyFields.has('note')) {
                    updatedOriginal.note = updatedRow.note || "";
                  }
                  if (!localDirtyFields.has('date')) {
                    updatedOriginal.date = updatedRow.date;
                  }
                  
                  return updatedOriginal;
                }
                return r;
              }));
            }
          } else if (payload.eventType === 'INSERT') {
            // 새로운 행이 추가된 경우
            const newRow = payload.new;
            setRows(prev => {
              // 이미 존재하는지 확인 (중복 방지)
              if (prev.some(r => r.id === newRow.id)) {
                return prev;
              }
              return [...prev, {
                id: newRow.id,
                classId: newRow.class_id,
                studentId: newRow.student_id,
                name: newRow.student_name || "",
                date: newRow.date,
                testType: newRow.test_type || "",
                test: newRow.test || "",
                testScore: newRow.test_score,
                note: newRow.note || "",
                createdBy: newRow.created_by,
                lastModifiedBy: newRow.last_modified_by,
                updatedAt: newRow.updated_at
              }];
            });
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
    // 인덱스 유효성 검사
    if (idx < 0 || idx >= rows.length) {
      console.error(`Invalid index: ${idx}, rows length: ${rows.length}`);
      return;
    }
    
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
      
      // 기존 레코드 업데이트 - 부분 업데이트 적용
      if (existingRows.length > 0) {
        // 저장 전에 최신 DB 데이터를 가져와서 다른 사용자의 변경사항과 병합
        const { data: latestDbData } = await supabase
          .from("test_logs")
          .select("*")
          .in("id", existingRows.map(r => r.id));
        
        const latestDbMap = new Map(latestDbData?.map(d => [d.id, d]) || []);
        
        // 부분 업데이트: 변경된 필드만 업데이트
        for (const row of existingRows) {
          const rowKey = String(row.id);
          const changedFields = dirtyFields.get(rowKey);
          const latestData = latestDbMap.get(row.id);
          
          // 변경된 필드가 있는 경우만 업데이트
          if (changedFields && changedFields.size > 0) {
            const updateData: any = {
              last_modified_by: currentEmployee?.id || null
            };
            
            // 중요: DB의 최신 데이터로 시작하여 다른 사용자의 변경사항 보존
            if (latestData) {
              // 모든 필드를 DB 값으로 초기화
              updateData.class_id = latestData.class_id;
              updateData.student_id = latestData.student_id;
              updateData.date = latestData.date;
              updateData.test = latestData.test;
              updateData.test_type = latestData.test_type;
              updateData.test_score = latestData.test_score;
              updateData.note = latestData.note;
            }
            
            // 그 다음 현재 사용자가 변경한 필드만 덮어쓰기
            changedFields.forEach(field => {
              switch(field) {
                case 'classId':
                  updateData.class_id = row.classId || null;
                  break;
                case 'studentId':
                  updateData.student_id = row.studentId;
                  break;
                case 'date':
                  updateData.date = row.date;
                  break;
                case 'test':
                  updateData.test = row.test && row.test.trim() ? row.test : null;
                  break;
                case 'testType':
                  updateData.test_type = row.testType || null;
                  break;
                case 'testScore':
                  updateData.test_score = typeof row.testScore === 'string' && row.testScore !== '' ? Number(row.testScore) : row.testScore;
                  break;
                case 'note':
                  updateData.note = row.note || null;
                  break;
              }
            });
            
            // 개별 행 업데이트
            const { error: updateError } = await supabase
              .from("test_logs")
              .update(updateData)
              .eq('id', row.id);
            
            if (updateError) {
              console.error("Failed to update row", row.id, ":", updateError);
              error = updateError;
              break;
            }
          }
        }
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
      setDirtyFields(new Map()); // dirtyFields 초기화
    } catch (e: any) {
      console.error("저장 오류:", e);
      alert(`저장 중 오류가 발생했습니다: ${e.message || '알 수 없는 오류'}`);
    }
  };

  
  // 모달 열기
  const openModal = (rowIdx: number, field: "note", value: string) => {
    setModalRowIdx(rowIdx);
    setModalField(field);
    setModalValue(value);
    setModalOpen(true);
  };
  
  // 모달 닫기
  const closeModal = () => {
    setModalOpen(false);
    setModalRowIdx(null);
    setModalField(null);
    setModalValue("");
  };
  
  const handleDeleteRow = (originalIdx: number) => {
    const rowToDelete = rows[originalIdx];
    if (rowToDelete.id) {
      // 기존 DB에 있는 행이면 삭제 목록에 추가
      setDeletedRowIds(prev => [...prev, rowToDelete.id!]);
    }
    setRows(rows => rows.filter((_, i) => i !== originalIdx));
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
              <DateSelector date={date} onDateChange={setDate} />
              
              {/* 반별 학생 목록 */}
              <ClassList
                classes={classes}
                students={students}
                teachers={teachers}
                classStudents={classStudents}
                onAddAll={handleAddAll}
                onAddStudent={handleAddStudent}
              />
            </div>
          </div>
          
          {/* 오른쪽 테이블 */}
          <div className="flex-1">
            <TestLogsMainTable
              rows={rows}
              classes={classes}
              students={students}
              date={date}
              filterClassId={filterClassId}
              isSidebarOpen={isSidebarOpen}
              hasUnsavedChanges={hasUnsavedChanges}
              deletedRowIds={deletedRowIds}
              onSidebarToggle={() => setIsSidebarOpen(!isSidebarOpen)}
              onFilterChange={setFilterClassId}
              onRowChange={handleChange}
              onBulkApply={handleBulkApply}
              onDeleteRow={handleDeleteRow}
              onClearAll={() => setRows([])}
              onSave={handleSave}
              onOpenModal={openModal}
            />
          </div>
        </div>
        
        {/* 모달: 특이사항 입력 - NoteModal 컴포넌트 사용 */}
        <NoteModal
          isOpen={modalOpen}
          value={modalValue}
          onValueChange={setModalValue}
          onSave={() => {
            if (modalRowIdx !== null && modalField !== null) {
              handleChange(modalRowIdx, modalField, modalValue);
            }
            closeModal();
          }}
          onClose={closeModal}
        />
      </div>
    </TooltipProvider>
  );
}