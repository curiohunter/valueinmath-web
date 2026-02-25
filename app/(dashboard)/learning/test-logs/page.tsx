"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DateSelector } from "@/components/learning/test-logs/DateSelector";
import { ClassList } from "@/components/learning/test-logs/ClassList";
import { TestLogsV2MainTable } from "@/components/learning/test-logs-v2/TestLogsV2MainTable";
import type { TestLogV2Row } from "@/components/learning/test-logs-v2/TestLogsV2MainTable";
import { NoteModal } from "@/components/learning/test-logs/NoteModal";
import { SmartImportDialog } from "@/components/learning/test-logs-v2/import/SmartImportDialog";
import type { SourceType } from "@/types/test-log-import";

const getKoreanDate = () => {
  const now = new Date();
  const koreanTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  return koreanTime.toISOString().slice(0, 10);
};

export default function TestLogsPage() {
  const supabase = getSupabaseBrowserClient();
  const { user, loading: authLoading } = useAuth();
  const [date, setDate] = useState(() => getKoreanDate());
  const [rows, setRows] = useState<TestLogV2Row[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalRows, setOriginalRows] = useState<TestLogV2Row[]>([]);
  const [deletedRowIds, setDeletedRowIds] = useState<string[]>([]);
  const [dirtyFields, setDirtyFields] = useState<Map<string, Set<string>>>(new Map());

  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRowIdx, setModalRowIdx] = useState<number | null>(null);
  const [modalField, setModalField] = useState<"note" | null>(null);
  const [modalValue, setModalValue] = useState("");

  // 스마트 가져오기 다이얼로그 상태
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: classData } = await supabase.from("classes").select("id, name, teacher_id").eq("is_active", true);
      const { data: classStudentData } = await supabase.from("class_students").select("class_id, student_id");
      const { data: studentData } = await supabase.from("students").select("id, name, status").eq("is_active", true);
      const { data: teacherData } = await supabase.from("employees").select("id, name");

      const sortedClasses = (classData || []).sort((a: any, b: any) => {
        const teacherA = (teacherData || []).find(t => t.id === a.teacher_id)?.name || 'ㅎ';
        const teacherB = (teacherData || []).find(t => t.id === b.teacher_id)?.name || 'ㅎ';
        if (teacherA !== teacherB) return teacherA.localeCompare(teacherB, 'ko');
        return a.name.localeCompare(b.name, 'ko');
      });

      setClasses(sortedClasses);
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

  const fetchTestLogsByDate = useCallback(async () => {
    setDeletedRowIds([]);
    try {
      const { data: todayLogs, error } = await supabase
        .from("test_logs")
        .select("*")
        .eq("date", date);

      if (error) throw error;

      if (todayLogs && todayLogs.length > 0) {
        const studentIds = [...new Set(todayLogs.map(log => log.student_id).filter(Boolean))];
        const { data: studentsData } = await supabase
          .from("students")
          .select("id, name, status")
          .in("id", studentIds);
        const studentMap = new Map(studentsData?.map(s => [s.id, s]) || []);

        const employeeIds = [...new Set([
          ...todayLogs.map(log => log.created_by).filter(Boolean),
          ...todayLogs.map(log => log.last_modified_by).filter(Boolean)
        ])];
        const { data: employeesData } = await supabase
          .from("employees")
          .select("id, name")
          .in("id", employeeIds.filter(id => id !== null));
        const employeeMap = new Map(employeesData?.map(e => [e.id, e.name]) || []);

        const mappedLogs: TestLogV2Row[] = todayLogs.map((log: any) => {
          const student = studentMap.get(log.student_id);
          const studentStatus = student?.status || '';
          const isRetired = studentStatus && !studentStatus.includes('재원');
          const studentName = student?.name || log.student_name_snapshot || "(알 수 없음)";

          return {
            id: log.id,
            classId: log.class_id || "",
            classNameSnapshot: log.class_name_snapshot || undefined,
            studentId: log.student_id || "",
            name: isRetired ? `${studentName} (퇴원)` : studentName,
            date: log.date,
            testType: log.test_type || "",
            test: log.test || "",
            testScore: log.test_score,
            note: log.note || "",
            sourceType: (log.source_type || 'manual') as SourceType,
            sourceId: log.source_id || undefined,
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
        setRows([]);
        setOriginalRows([]);
      }
    } catch (error) {
      console.error("Error fetching test logs:", error);
      setRows([]);
      setOriginalRows([]);
    }
  }, [date, supabase]);

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (date) fetchTestLogsByDate(); }, [date]);
  useEffect(() => {
    const hasChanges = JSON.stringify(rows) !== JSON.stringify(originalRows);
    setHasUnsavedChanges(hasChanges);
  }, [rows, originalRows]);

  // 실시간 동기화
  useEffect(() => {
    if (!date) return;
    const channel = supabase
      .channel('test_logs_realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'test_logs',
        filter: "date=eq." + date
      }, async (payload) => {
        if (payload.eventType === 'UPDATE') {
          const updatedRow = payload.new;
          const rowKey = String(updatedRow.id);
          const localDirtyFields = dirtyFields.get(rowKey);

          if (!localDirtyFields || localDirtyFields.size === 0) {
            const updatedData: Partial<TestLogV2Row> = {
              id: updatedRow.id, classId: updatedRow.class_id, studentId: updatedRow.student_id,
              name: updatedRow.student_name || "", date: updatedRow.date,
              testType: updatedRow.test_type || "", test: updatedRow.test || "",
              testScore: updatedRow.test_score, note: updatedRow.note || "",
              sourceType: updatedRow.source_type || 'manual',
              lastModifiedBy: updatedRow.last_modified_by, updatedAt: updatedRow.updated_at
            };
            setRows(prev => prev.map(r => r.id === updatedRow.id ? { ...r, ...updatedData } : r));
            setOriginalRows(prev => prev.map(r => r.id === updatedRow.id ? { ...r, ...updatedData } : r));
          } else {
            setRows(prev => prev.map(r => {
              if (r.id !== updatedRow.id) return r;
              const updated: any = { ...r };
              if (!localDirtyFields.has('test')) updated.test = updatedRow.test || "";
              if (!localDirtyFields.has('testType')) updated.testType = updatedRow.test_type || "";
              if (!localDirtyFields.has('testScore')) updated.testScore = updatedRow.test_score;
              if (!localDirtyFields.has('note')) updated.note = updatedRow.note || "";
              if (!localDirtyFields.has('date')) updated.date = updatedRow.date;
              updated.lastModifiedBy = updatedRow.last_modified_by;
              updated.updatedAt = updatedRow.updated_at;
              return updated;
            }));
          }
        } else if (payload.eventType === 'INSERT') {
          const newRow = payload.new;
          setRows(prev => {
            if (prev.some(r => r.id === newRow.id)) return prev;
            return [...prev, {
              id: newRow.id, classId: newRow.class_id, studentId: newRow.student_id,
              name: newRow.student_name || "", date: newRow.date,
              testType: newRow.test_type || "", test: newRow.test || "",
              testScore: newRow.test_score, note: newRow.note || "",
              sourceType: newRow.source_type || 'manual',
              createdBy: newRow.created_by, lastModifiedBy: newRow.last_modified_by,
              updatedAt: newRow.updated_at
            }];
          });
        } else if (payload.eventType === 'DELETE') {
          setRows(prev => prev.filter(r => r.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [date, dirtyFields]);

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
      ...classStudentList.map(s => ({
        classId, studentId: s.id, name: s.name, date, test: "", testType: "", testScore: null, note: "",
      })),
    ]);
  };

  const handleAddStudent = (classId: string, student: { id: string; name: string }) => {
    setRows(prev => [
      ...prev,
      { classId, studentId: student.id, name: student.name, date, test: "", testType: "", testScore: null, note: "" },
    ]);
  };

  const handleChange = (idx: number, key: keyof TestLogV2Row, value: any) => {
    if (idx < 0 || idx >= rows.length) return;
    const row = rows[idx];
    const originalRow = row.id ? originalRows.find(or => or.id === row.id) : null;

    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));

    if (row.id && originalRow) {
      const rowKey = String(row.id);
      if (originalRow[key] !== value) {
        setDirtyFields(prev => {
          const newMap = new Map(prev);
          if (!newMap.has(rowKey)) newMap.set(rowKey, new Set());
          newMap.get(rowKey)!.add(key);
          return newMap;
        });
      } else {
        setDirtyFields(prev => {
          const newMap = new Map(prev);
          if (newMap.has(rowKey)) {
            newMap.get(rowKey)!.delete(key);
            if (newMap.get(rowKey)!.size === 0) newMap.delete(rowKey);
          }
          return newMap;
        });
      }
    }
  };

  const handleBulkApply = (key: "test" | "testType" | "testScore") => {
    const currentFilteredRows = rows
      .filter(row => {
        if (selectedClassIds.length > 0) return selectedClassIds.includes(row.classId);
        if (selectedTeacherIds.length > 0) {
          const rowClass = classes.find(c => c.id === row.classId);
          return rowClass?.teacher_id && selectedTeacherIds.includes(rowClass.teacher_id);
        }
        return true;
      })
      .sort((a, b) => {
        const classA = classes.find(c => c.id === a.classId)?.name || "";
        const classB = classes.find(c => c.id === b.classId)?.name || "";
        if (classA !== classB) return classA.localeCompare(classB, "ko");
        return a.name.localeCompare(b.name, "ko");
      });

    if (currentFilteredRows.length === 0) { alert("필터링된 학생이 없습니다."); return; }
    const firstValue = currentFilteredRows[0][key];
    if (key !== "testScore" && (!firstValue || (typeof firstValue === 'string' && firstValue.trim() === ""))) {
      alert("첫 번째 학생의 해당 항목이 비어있습니다."); return;
    }

    setRows(prev => prev.map(r => {
      let shouldApply = false;
      if (selectedClassIds.length > 0) shouldApply = selectedClassIds.includes(r.classId);
      else if (selectedTeacherIds.length > 0) {
        const rowClass = classes.find(c => c.id === r.classId);
        shouldApply = rowClass?.teacher_id ? selectedTeacherIds.includes(rowClass.teacher_id) : false;
      } else shouldApply = true;
      return shouldApply ? { ...r, [key]: firstValue } : r;
    }));

    setDirtyFields(prev => {
      const newMap = new Map(prev);
      rows.forEach(row => {
        let shouldApply = false;
        if (selectedClassIds.length > 0) shouldApply = selectedClassIds.includes(row.classId);
        else if (selectedTeacherIds.length > 0) {
          const rowClass = classes.find(c => c.id === row.classId);
          shouldApply = rowClass?.teacher_id ? selectedTeacherIds.includes(rowClass.teacher_id) : false;
        } else shouldApply = true;
        if (shouldApply && row.id) {
          const rowKey = String(row.id);
          const originalRow = originalRows.find(or => or.id === row.id);
          if (originalRow && originalRow[key] !== firstValue) {
            if (!newMap.has(rowKey)) newMap.set(rowKey, new Set());
            newMap.get(rowKey)!.add(key);
          }
        }
      });
      return newMap;
    });
  };

  const handleSave = async () => {
    if (rows.length === 0 && deletedRowIds.length === 0) { alert("저장할 데이터가 없습니다."); return; }
    const validRows = rows.filter(r => r.studentId && r.date);
    const invalidRowCount = rows.length - validRows.length;
    if (validRows.length === 0 && deletedRowIds.length === 0) {
      alert("저장할 수 있는 유효한 데이터가 없습니다."); return;
    }
    if (invalidRowCount > 0) {
      if (!confirm(`${invalidRowCount}개의 불완전한 행이 있습니다. 이 행들은 저장되지 않습니다. 계속하시겠습니까?`)) return;
    }

    try {
      if (deletedRowIds.length > 0) {
        const { error: deleteError } = await supabase.from("test_logs").delete().in("id", deletedRowIds);
        if (deleteError) throw deleteError;
      }

      if (!user) { alert("로그인 세션이 만료되었습니다."); window.location.reload(); return; }
      const { data: currentEmployee } = await supabase.from("employees").select("id").eq("auth_id", user.id).single();

      const classIds = [...new Set(validRows.map(r => r.classId).filter(Boolean))];
      const { data: classData } = await supabase.from("classes").select("id, teacher_id").in("id", classIds);
      const classTeacherMap = new Map(classData?.map(c => [c.id, c.teacher_id]) || []);

      const existingRows = validRows.filter(r => r.id);
      const newRows = validRows.filter(r => !r.id);
      let error = null;

      if (existingRows.length > 0) {
        const { data: latestDbData } = await supabase.from("test_logs").select("*").in("id", existingRows.map(r => r.id));
        const latestDbMap = new Map(latestDbData?.map(d => [d.id, d]) || []);

        for (const row of existingRows) {
          const rowKey = String(row.id);
          const changedFields = dirtyFields.get(rowKey);
          const latestData = latestDbMap.get(row.id);
          if (changedFields && changedFields.size > 0) {
            const updateData: any = { last_modified_by: currentEmployee?.id || null };
            if (latestData) {
              updateData.class_id = latestData.class_id;
              updateData.student_id = latestData.student_id;
              updateData.date = latestData.date;
              updateData.test = latestData.test;
              updateData.test_type = latestData.test_type;
              updateData.test_score = latestData.test_score;
              updateData.note = latestData.note;
            }
            changedFields.forEach(field => {
              switch (field) {
                case 'classId': updateData.class_id = row.classId || null; break;
                case 'studentId': updateData.student_id = row.studentId; break;
                case 'date': updateData.date = row.date; break;
                case 'test': updateData.test = row.test && row.test.trim() ? row.test : null; break;
                case 'testType': updateData.test_type = row.testType || null; break;
                case 'testScore': updateData.test_score = typeof row.testScore === 'string' && row.testScore !== '' ? Number(row.testScore) : row.testScore; break;
                case 'note': updateData.note = row.note || null; break;
              }
            });
            const { error: updateError } = await supabase.from("test_logs").update(updateData).eq('id', row.id);
            if (updateError) { error = updateError; break; }
          }
        }
      }

      if (!error && newRows.length > 0) {
        const studentIds = [...new Set(newRows.map(r => r.studentId).filter(Boolean))];
        const newClassIds = [...new Set(newRows.map(r => r.classId).filter(Boolean))];
        const { data: studentsData } = await supabase.from("students").select("id, name").in("id", studentIds);
        const { data: classesData } = await supabase.from("classes").select("id, name").in("id", newClassIds);
        const studentNameMap = new Map(studentsData?.map(s => [s.id, s.name]) || []);
        const classNameMap = new Map(classesData?.map(c => [c.id, c.name]) || []);

        const insertData = newRows.map(r => {
          const teacherId = r.classId ? classTeacherMap.get(r.classId) : null;
          return {
            class_id: r.classId || null,
            student_id: r.studentId,
            date: r.date,
            test: r.test && r.test.trim() ? r.test : null,
            test_type: r.testType || null,
            test_score: typeof r.testScore === 'string' && r.testScore !== '' ? Number(r.testScore) : r.testScore,
            note: r.note || null,
            created_by: teacherId || null,
            student_name_snapshot: studentNameMap.get(r.studentId) || null,
            class_name_snapshot: r.classId ? classNameMap.get(r.classId) || null : null,
            source_type: r.sourceType || 'manual',
            source_id: r.sourceId || null,
          };
        });
        // @ts-ignore
        const { error: insertError } = await supabase.from("test_logs").insert(insertData);
        if (insertError) error = insertError;
      }
      if (error) throw error;

      alert("저장되었습니다.");
      await fetchTestLogsByDate();
      setHasUnsavedChanges(false);
      setDeletedRowIds([]);
      setDirtyFields(new Map());
    } catch (e: any) {
      console.error("저장 오류:", e);
      alert(`저장 중 오류가 발생했습니다: ${e.message || '알 수 없는 오류'}`);
    }
  };

  const openModal = (rowIdx: number, field: "note", value: string) => {
    setModalRowIdx(rowIdx);
    setModalField(field);
    setModalValue(value);
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setModalRowIdx(null); setModalField(null); setModalValue(""); };

  const handleDeleteRow = (originalIdx: number) => {
    const rowToDelete = rows[originalIdx];
    if (rowToDelete.id) setDeletedRowIds(prev => [...prev, rowToDelete.id!]);
    setRows(rows => rows.filter((_, i) => i !== originalIdx));
  };

  const handleImportComplete = () => {
    fetchTestLogsByDate();
  };

  if (authLoading || loading) return (
    <div className="p-8 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <div className="text-gray-400">로딩 중...</div>
    </div>
  );

  if (!user) return (
    <div className="p-8 text-center">
      <div className="text-red-500">로그인이 필요합니다</div>
    </div>
  );

  if (error) return (
    <div className="p-8 text-center">
      <div className="text-red-500">{error}</div>
    </div>
  );

  const teachersWithClasses = teachers
    .filter(t => classes.some(c => c.teacher_id === t.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  const filteredClasses = selectedTeacherIds.length === 0
    ? classes
    : classes.filter(c => c.teacher_id && selectedTeacherIds.includes(c.teacher_id));

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex gap-6 relative">
          <div className={`transition-all duration-300 ${isSidebarOpen ? 'w-72' : 'w-0 overflow-hidden'}`}>
            <div className="w-72 flex-shrink-0 space-y-4">
              <DateSelector date={date} onDateChange={setDate} />
              <ClassList
                classes={classes} students={students} teachers={teachers}
                classStudents={classStudents}
                onAddAll={handleAddAll} onAddStudent={handleAddStudent}
              />
            </div>
          </div>

          <div className="flex-1">
            <TestLogsV2MainTable
              rows={rows} classes={classes} filteredClasses={filteredClasses}
              students={students} teachers={teachers} teachersWithClasses={teachersWithClasses}
              date={date}
              selectedTeacherIds={selectedTeacherIds} selectedClassIds={selectedClassIds}
              isSidebarOpen={isSidebarOpen} hasUnsavedChanges={hasUnsavedChanges}
              deletedRowIds={deletedRowIds}
              onSidebarToggle={() => setIsSidebarOpen(!isSidebarOpen)}
              onTeacherFilterChange={setSelectedTeacherIds} onClassFilterChange={setSelectedClassIds}
              onRowChange={handleChange} onBulkApply={handleBulkApply}
              onDeleteRow={handleDeleteRow}
              onClearAll={() => setRows([])} onSave={handleSave} onOpenModal={openModal}
              onOpenImport={() => setImportDialogOpen(true)}
            />
          </div>
        </div>

        <NoteModal
          isOpen={modalOpen} value={modalValue} onValueChange={setModalValue}
          onSave={() => {
            if (modalRowIdx !== null && modalField !== null) handleChange(modalRowIdx, modalField, modalValue);
            closeModal();
          }}
          onClose={closeModal}
        />

        <SmartImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          classes={classes}
          teachers={teachers}
          onImportComplete={handleImportComplete}
        />
      </div>
    </TooltipProvider>
  );
}
