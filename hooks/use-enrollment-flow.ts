'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Student } from '@/types/dashboard'

interface UseEnrollmentFlowReturn {
  // 학생 정보 모달 관련 상태
  editingStudentForTest: Student | null
  currentTestId: number | null
  isStudentFormModalOpen: boolean
  setIsStudentFormModalOpen: (open: boolean) => void

  // 반 등록 모달 관련 상태
  isClassFormModalOpen: boolean
  setIsClassFormModalOpen: (open: boolean) => void
  newlyEnrolledStudent: Student | null
  teachers: any[]
  allStudents: Student[]

  // 핸들러
  handleEnrollmentDecision: (testId: number) => Promise<void>
  handleStudentFormSuccess: (onRefresh: () => Promise<void>) => Promise<void>
  resetEnrollmentState: () => void
}

/**
 * 등록 결정 플로우를 관리하는 커스텀 훅
 * 입학테스트 후 학생 정보 수정 → 반 등록까지의 플로우를 처리합니다.
 */
export function useEnrollmentFlow(): UseEnrollmentFlowReturn {
  const supabase = createClient()

  // 학생 정보 모달 관련 상태
  const [isStudentFormModalOpen, setIsStudentFormModalOpen] = useState(false)
  const [editingStudentForTest, setEditingStudentForTest] = useState<Student | null>(null)
  const [currentTestId, setCurrentTestId] = useState<number | null>(null)

  // 반 등록 모달 관련 상태
  const [isClassFormModalOpen, setIsClassFormModalOpen] = useState(false)
  const [newlyEnrolledStudent, setNewlyEnrolledStudent] = useState<Student | null>(null)
  const [teachers, setTeachers] = useState<any[]>([])
  const [allStudents, setAllStudents] = useState<Student[]>([])

  // 등록 결정 - 학생 정보 모달 열기
  const handleEnrollmentDecision = useCallback(async (testId: number) => {
    try {
      // 입학테스트에서 student_id 찾기
      const { data: testData, error: testError } = await supabase
        .from('entrance_tests')
        .select('student_id')
        .eq('id', testId)
        .single()

      if (testError || !testData?.student_id) {
        toast.error('학생 정보를 찾을 수 없습니다.')
        return
      }

      // 학생 정보 가져오기
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', testData.student_id)
        .single()

      if (studentError || !studentData) {
        toast.error('학생 정보를 불러올 수 없습니다.')
        return
      }

      // 학생 정보 모달 열기
      setEditingStudentForTest(studentData)
      setCurrentTestId(testId)
      setIsStudentFormModalOpen(true)
    } catch (error) {
      console.error('학생 정보 로드 오류:', error)
      toast.error('학생 정보를 불러오는 중 오류가 발생했습니다.')
    }
  }, [supabase])

  // 학생 정보 저장 성공 시 처리
  const handleStudentFormSuccess = useCallback(async (onRefresh: () => Promise<void>) => {
    if (!editingStudentForTest) return

    // 학생 정보를 다시 로드하여 최신 상태 확인
    const { data: updatedStudent } = await supabase
      .from('students')
      .select('*')
      .eq('id', editingStudentForTest.id)
      .single()

    if (updatedStudent?.status === '재원') {
      // 재원으로 변경된 경우 반 등록 여부 확인
      const confirmClassRegistration = confirm('학생이 재원으로 등록되었습니다.\n이어서 반 등록도 진행하시겠습니까?')

      if (confirmClassRegistration) {
        // 선생님 목록 로드
        const { data: teachersData } = await supabase
          .from('employees')
          .select('id, name')
          .order('name')

        // 모든 학생 목록 로드
        const { data: studentsData } = await supabase
          .from('students')
          .select('*')
          .eq('is_active', true)
          .eq('status', '재원')
          .order('name')

        setTeachers(teachersData || [])
        setAllStudents(studentsData || [])
        setNewlyEnrolledStudent(updatedStudent)
        setIsClassFormModalOpen(true)
      }
    }

    // 데이터 새로고침
    await onRefresh()

    // 모달 닫기
    setIsStudentFormModalOpen(false)
    setEditingStudentForTest(null)
    setCurrentTestId(null)
  }, [supabase, editingStudentForTest])

  // 상태 초기화
  const resetEnrollmentState = useCallback(() => {
    setIsStudentFormModalOpen(false)
    setEditingStudentForTest(null)
    setCurrentTestId(null)
    setIsClassFormModalOpen(false)
    setNewlyEnrolledStudent(null)
  }, [])

  return {
    editingStudentForTest,
    currentTestId,
    isStudentFormModalOpen,
    setIsStudentFormModalOpen,
    isClassFormModalOpen,
    setIsClassFormModalOpen,
    newlyEnrolledStudent,
    teachers,
    allStudents,
    handleEnrollmentDecision,
    handleStudentFormSuccess,
    resetEnrollmentState
  }
}
