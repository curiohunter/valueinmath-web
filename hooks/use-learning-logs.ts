'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { StudyLogRow, ClassStudent, StudentInfo } from '@/types/learning'

// 텍스트 → 숫자 변환 매핑 (레거시 지원용)
const attendanceMap: Record<string, number> = { "출석": 5, "지각": 4, "조퇴": 3, "보강": 2, "결석": 1 }
const homeworkMap: Record<string, number> = { "100% 마무리": 5, "90% 이상": 4, "추가 추적 필요": 3, "보강필요": 2, "결석": 1 }
const focusMap: Record<string, number> = { "매우 열의있음": 5, "대체로 잘참여": 4, "보통": 3, "조치필요": 2, "결석": 1 }

interface UseLearningLogsProps {
  date: string
  classStudents: ClassStudent[]
  students: StudentInfo[]
}

interface UseLearningLogsReturn {
  rows: StudyLogRow[]
  originalRows: StudyLogRow[]
  dirtyFields: Map<string, Set<string>>
  deletedRowIds: string[]
  hasUnsavedChanges: boolean
  isLoading: boolean
  fetchLogsForDate: (targetDate: string) => Promise<void>
  handleChange: (idx: number, key: keyof StudyLogRow, value: any) => void
  handleAddAll: (classId: string, date: string) => void
  handleAddStudent: (classId: string, student: { id: string; name: string }, date: string) => void
  handleDeleteRow: (idx: number) => void
  handleBulkDelete: () => void
  handleSave: () => Promise<boolean>
  resetDirtyState: () => void
  setRows: React.Dispatch<React.SetStateAction<StudyLogRow[]>>
}

export function useLearningLogs({
  date,
  classStudents,
  students
}: UseLearningLogsProps): UseLearningLogsReturn {
  const supabase = createClient()

  const [rows, setRows] = useState<StudyLogRow[]>([])
  const [originalRows, setOriginalRows] = useState<StudyLogRow[]>([])
  const [dirtyFields, setDirtyFields] = useState<Map<string, Set<string>>>(new Map())
  const [deletedRowIds, setDeletedRowIds] = useState<string[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const dirtyFieldsRef = useRef(dirtyFields)
  dirtyFieldsRef.current = dirtyFields

  // 반별 학생 목록 생성 함수
  const getClassStudents = useCallback((classId: string) => {
    const studentIds = classStudents.filter(cs => cs.class_id === classId).map(cs => cs.student_id)
    return students
      .filter(s => studentIds.includes(s.id) && s.status?.trim().includes("재원"))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"))
  }, [classStudents, students])

  // 특정 날짜의 학습 기록 불러오기
  const fetchLogsForDate = useCallback(async (targetDate: string) => {
    setIsLoading(true)
    setDeletedRowIds([])
    setDirtyFields(new Map())

    try {
      const { data: logs, error } = await supabase
        .from("study_logs")
        .select("*, students (name, status)")
        .eq("date", targetDate)

      if (error) {
        console.error("Supabase error details:", error)
        throw error
      }

      if (logs && logs.length > 0) {
        const employeeIds = new Set<string>()
        logs.forEach((log: any) => {
          if (log.created_by) employeeIds.add(log.created_by)
          if (log.last_modified_by) employeeIds.add(log.last_modified_by)
        })

        let employeeMap = new Map<string, string>()
        if (employeeIds.size > 0) {
          const { data: employees } = await supabase
            .from("employees")
            .select("id, name")
            .in("id", Array.from(employeeIds))

          employeeMap = new Map(employees?.map(e => [e.id, e.name]) || [])
        }

        const mappedRows: StudyLogRow[] = logs.map((log: any) => {
          const studentStatus = log.students?.status || ''
          const isRetired = studentStatus && !studentStatus.includes('재원')
          const studentName = log.students?.name || "(알 수 없음)"

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
          }
        })

        setRows(mappedRows)
        setOriginalRows(mappedRows)
      } else {
        setRows([])
        setOriginalRows([])
      }
    } catch (error) {
      console.error("Error fetching logs for date:", targetDate, error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  // 실시간 동기화 구현
  useEffect(() => {
    if (!date) return

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
          if (payload.eventType === 'UPDATE') {
            const updatedRow = payload.new as any
            const rowKey = String(updatedRow.id)
            const localDirtyFields = dirtyFieldsRef.current.get(rowKey)

            if (!localDirtyFields || localDirtyFields.size === 0) {
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
              }

              setRows(prev => prev.map(r => r.id === updatedRow.id ? { ...r, ...updatedData } : r))
              setOriginalRows(prev => prev.map(r => r.id === updatedRow.id ? { ...r, ...updatedData } : r))
            } else {
              setRows(prev => prev.map(r => {
                if (r.id === updatedRow.id) {
                  const updatedFields: any = { ...r }

                  if (!localDirtyFields.has('attendance')) updatedFields.attendance = updatedRow.attendance_status || 5
                  if (!localDirtyFields.has('homework')) updatedFields.homework = updatedRow.homework || 5
                  if (!localDirtyFields.has('focus')) updatedFields.focus = updatedRow.focus || 5
                  if (!localDirtyFields.has('note')) updatedFields.note = updatedRow.note || ""
                  if (!localDirtyFields.has('book1')) updatedFields.book1 = updatedRow.book1 || ""
                  if (!localDirtyFields.has('book1log')) updatedFields.book1log = updatedRow.book1log || ""
                  if (!localDirtyFields.has('book2')) updatedFields.book2 = updatedRow.book2 || ""
                  if (!localDirtyFields.has('book2log')) updatedFields.book2log = updatedRow.book2log || ""

                  updatedFields.lastModifiedBy = updatedRow.last_modified_by
                  updatedFields.updatedAt = updatedRow.updated_at

                  return updatedFields
                }
                return r
              }))

              setOriginalRows(prev => prev.map(r => {
                if (r.id === updatedRow.id) {
                  const updatedOriginal: any = { ...r }

                  if (!localDirtyFields.has('attendance')) updatedOriginal.attendance = updatedRow.attendance_status || 5
                  if (!localDirtyFields.has('homework')) updatedOriginal.homework = updatedRow.homework || 5
                  if (!localDirtyFields.has('focus')) updatedOriginal.focus = updatedRow.focus || 5
                  if (!localDirtyFields.has('note')) updatedOriginal.note = updatedRow.note || ""
                  if (!localDirtyFields.has('book1')) updatedOriginal.book1 = updatedRow.book1 || ""
                  if (!localDirtyFields.has('book1log')) updatedOriginal.book1log = updatedRow.book1log || ""
                  if (!localDirtyFields.has('book2')) updatedOriginal.book2 = updatedRow.book2 || ""
                  if (!localDirtyFields.has('book2log')) updatedOriginal.book2log = updatedRow.book2log || ""

                  return updatedOriginal
                }
                return r
              }))
            }
          } else if (payload.eventType === 'INSERT') {
            await fetchLogsForDate(date)
          } else if (payload.eventType === 'DELETE') {
            setRows(prev => prev.filter(r => r.id !== (payload.old as any).id))
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [date, supabase, fetchLogsForDate])

  // 데이터 변경 감지
  useEffect(() => {
    const hasChanges = JSON.stringify(rows) !== JSON.stringify(originalRows) || deletedRowIds.length > 0
    setHasUnsavedChanges(hasChanges)
  }, [rows, originalRows, deletedRowIds])

  // 표 입력 변경
  const handleChange = useCallback((idx: number, key: keyof StudyLogRow, value: any) => {
    setRows(prev => {
      if (idx < 0 || idx >= prev.length) {
        console.error(`Invalid index: ${idx}, rows length: ${prev.length}`)
        return prev
      }

      const row = prev[idx]
      const newRows = prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r))

      if (row.id) {
        const rowKey = String(row.id)

        setDirtyFields(prevDirty => {
          const newMap = new Map(prevDirty)
          if (!newMap.has(rowKey)) {
            newMap.set(rowKey, new Set())
          }
          newMap.get(rowKey)!.add(key)
          return newMap
        })
      }

      return newRows
    })
  }, [])

  // 반별 전체추가
  const handleAddAll = useCallback((classId: string, currentDate: string) => {
    const classStudentList = getClassStudents(classId)
    setRows(prev => [
      ...prev,
      ...classStudentList
        .filter(s => !prev.some(r => r.studentId === s.id && r.classId === classId))
        .map(s => ({
          classId,
          studentId: s.id,
          name: s.name,
          date: currentDate,
          attendance: 5,
          homework: 5,
          focus: 5,
          note: "",
          book1: "",
          book1log: "",
          book2: "",
          book2log: "",
        })),
    ])
  }, [getClassStudents])

  // 학생별 추가
  const handleAddStudent = useCallback((classId: string, student: { id: string; name: string }, currentDate: string) => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setRows(prev => [
      ...prev,
      {
        tempId,
        classId,
        studentId: student.id,
        name: student.name,
        date: currentDate,
        attendance: 5,
        homework: 5,
        focus: 5,
        note: "",
        book1: "",
        book1log: "",
        book2: "",
        book2log: "",
      },
    ])
  }, [])

  // 행 삭제
  const handleDeleteRow = useCallback((idx: number) => {
    setRows(prev => {
      const rowToDelete = prev[idx]
      if (rowToDelete?.id) {
        setDeletedRowIds(ids => [...ids, rowToDelete.id!])
      }
      return prev.filter((_, i) => i !== idx)
    })
  }, [])

  // 일괄 삭제
  const handleBulkDelete = useCallback(() => {
    const existingIds = rows.filter(r => r.id).map(r => r.id!)
    if (existingIds.length > 0) {
      setDeletedRowIds(prev => [...prev, ...existingIds])
    }
    setRows([])
  }, [rows])

  // 저장
  const handleSave = useCallback(async (): Promise<boolean> => {
    if (rows.length === 0 && deletedRowIds.length === 0) {
      alert("저장할 데이터가 없습니다.")
      return false
    }

    try {
      if (deletedRowIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("study_logs")
          .delete()
          .in("id", deletedRowIds)

        if (deleteError) throw deleteError

        if (rows.length === 0) {
          alert("삭제되었습니다.")
          setDeletedRowIds([])
          setDirtyFields(new Map())
          return true
        }
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        alert("사용자 정보를 가져올 수 없습니다. 다시 로그인해주세요.")
        return false
      }

      const { data: currentEmployee } = await supabase
        .from("employees")
        .select("id")
        .eq("auth_id", user.id)
        .single()

      const classIds = [...new Set(rows.map(r => r.classId).filter(Boolean))]
      const { data: classData } = await supabase
        .from("classes")
        .select("id, teacher_id")
        .in("id", classIds)

      const classTeacherMap = new Map(classData?.map(c => [c.id, c.teacher_id]) || [])

      const existingRows = rows.filter(r => r.id)
      const newRows = rows.filter(r => !r.id)

      let error = null

      if (existingRows.length > 0) {
        // 변경된 행만 필터링
        const rowsToUpdate = existingRows.filter(row => {
          const rowKey = String(row.id)
          const changedFields = dirtyFields.get(rowKey)
          return changedFields && changedFields.size > 0
        })

        if (rowsToUpdate.length > 0) {
          // 병렬로 모든 update 실행
          const updatePromises = rowsToUpdate.map(row => {
            const rowKey = String(row.id)
            const changedFields = dirtyFields.get(rowKey)!

            const updateData: any = {
              last_modified_by: currentEmployee?.id
            }

            changedFields.forEach(field => {
              switch(field) {
                case 'attendance':
                  updateData.attendance_status = typeof row.attendance === "number" ?
                    row.attendance : attendanceMap[row.attendance as unknown as string]
                  break
                case 'homework':
                  updateData.homework = typeof row.homework === "number" ?
                    row.homework : homeworkMap[row.homework as unknown as string]
                  break
                case 'focus':
                  updateData.focus = typeof row.focus === "number" ?
                    row.focus : focusMap[row.focus as unknown as string]
                  break
                case 'book1':
                  updateData.book1 = row.book1
                  break
                case 'book1log':
                  updateData.book1log = row.book1log
                  break
                case 'book2':
                  updateData.book2 = row.book2
                  break
                case 'book2log':
                  updateData.book2log = row.book2log
                  break
                case 'note':
                  updateData.note = row.note
                  break
                case 'date':
                  updateData.date = row.date
                  break
              }
            })

            return supabase
              .from("study_logs")
              .update(updateData)
              .eq('id', row.id)
          })

          const results = await Promise.all(updatePromises)
          const updateError = results.find(r => r.error)?.error
          if (updateError) {
            console.error("Failed to update rows:", updateError)
            error = updateError
          }
        }
      }

      if (!error && newRows.length > 0) {
        const studentIds = [...new Set(newRows.map(r => r.studentId).filter(Boolean))]
        const classIdList = [...new Set(newRows.map(r => r.classId).filter(Boolean))]

        const { data: studentsData } = await supabase
          .from("students")
          .select("id, name")
          .in("id", studentIds)

        const { data: classesData } = await supabase
          .from("classes")
          .select("id, name")
          .in("id", classIdList)

        const studentNameMap = new Map(studentsData?.map(s => [s.id, s.name]) || [])
        const classNameMap = new Map(classesData?.map(c => [c.id, c.name]) || [])

        const insertData = newRows.map(r => {
          const teacherId = r.classId ? classTeacherMap.get(r.classId) : null
          return {
            class_id: r.classId || null,
            student_id: r.studentId,
            date: r.date,
            attendance_status: typeof r.attendance === "number" ? r.attendance : attendanceMap[r.attendance as unknown as string],
            homework: typeof r.homework === "number" ? r.homework : homeworkMap[r.homework as unknown as string],
            focus: typeof r.focus === "number" ? r.focus : focusMap[r.focus as unknown as string],
            book1: r.book1,
            book1log: r.book1log,
            book2: r.book2,
            book2log: r.book2log,
            note: r.note,
            created_by: teacherId,
            student_name_snapshot: studentNameMap.get(r.studentId) || null,
            class_name_snapshot: r.classId ? classNameMap.get(r.classId) || null : null,
          }
        })

        const { error: insertError } = await supabase
          .from("study_logs")
          .insert(insertData)

        if (insertError) error = insertError
      }

      if (error) throw error

      alert("저장되었습니다.")
      setDeletedRowIds([])
      setDirtyFields(new Map())

      // 저장 후 DB에서 최신 데이터를 다시 가져와서 UI 갱신 (중복 저장 방지)
      await fetchLogsForDate(date)

      return true
    } catch (e) {
      alert("저장 중 오류가 발생했습니다.")
      console.error(e)
      return false
    }
  }, [rows, deletedRowIds, dirtyFields, supabase, date, fetchLogsForDate])

  const resetDirtyState = useCallback(() => {
    setDirtyFields(new Map())
    setDeletedRowIds([])
    setHasUnsavedChanges(false)
  }, [])

  return {
    rows,
    originalRows,
    dirtyFields,
    deletedRowIds,
    hasUnsavedChanges,
    isLoading,
    fetchLogsForDate,
    handleChange,
    handleAddAll,
    handleAddStudent,
    handleDeleteRow,
    handleBulkDelete,
    handleSave,
    resetDirtyState,
    setRows
  }
}
