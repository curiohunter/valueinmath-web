'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ClassInfo, StudentInfo, TeacherInfo, ClassStudent } from '@/types/learning'

interface UseLearningMasterDataReturn {
  classes: ClassInfo[]
  classStudents: ClassStudent[]
  students: StudentInfo[]
  teachers: TeacherInfo[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useLearningMasterData(): UseLearningMasterDataReturn {
  const supabase = createClient()
  
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [classStudents, setClassStudents] = useState<ClassStudent[]>([])
  const [students, setStudents] = useState<StudentInfo[]>([])
  const [teachers, setTeachers] = useState<TeacherInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const [classRes, classStudentRes, studentRes, teacherRes] = await Promise.all([
        supabase.from("classes").select("id, name, teacher_id").eq("is_active", true),
        supabase.from("class_students").select("class_id, student_id"),
        supabase.from("student_with_school_info").select("id, name, status, grade, school_type").eq("is_active", true),
        supabase.from("employees").select("id, name")
      ])

      const classData = classRes.data || []
      const teacherData = teacherRes.data || []

      // 선생님별로 정렬 (선생님 이름 → 반 이름)
      const sortedClasses = classData.sort((a, b) => {
        const teacherA = teacherData.find(t => t.id === a.teacher_id)?.name || 'ㅎ'
        const teacherB = teacherData.find(t => t.id === b.teacher_id)?.name || 'ㅎ'

        if (teacherA !== teacherB) {
          return teacherA.localeCompare(teacherB, 'ko')
        }

        return a.name.localeCompare(b.name, 'ko')
      })

      setClasses(sortedClasses)
      setClassStudents(classStudentRes.data || [])
      setStudents(studentRes.data || [])
      setTeachers(teacherData)
    } catch (e) {
      console.error("Error in fetchMasterData:", e)
      setError("데이터를 불러오는 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    classes,
    classStudents,
    students,
    teachers,
    isLoading,
    error,
    refresh
  }
}
