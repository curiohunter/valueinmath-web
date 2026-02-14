'use client'

import { useCallback } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { cleanObj } from '@/lib/utils'
import { toast } from 'sonner'
import type { ConsultationData } from '@/types/dashboard'

interface UseConsultationsReturn {
  consultations: ConsultationData[]
  isLoading: boolean
  error: Error | null
  saveConsultation: (data: Partial<ConsultationData>, editingConsultation: ConsultationData | null) => Promise<{ success: boolean; statusChanged: boolean }>
  deleteConsultation: (id: string) => Promise<boolean>
  refresh: () => Promise<void>
}

// SWR fetcher - students + student_schools 조회
async function fetchConsultations(): Promise<ConsultationData[]> {
  const supabase = createClient()

  const { data: students, error } = await supabase
    .from('students')
    .select('*')
    .eq('is_active', true)
    .eq('status', '신규상담')
    .order('first_contact_date', { ascending: false })
    .limit(20)

  if (error) throw error
  if (!students || students.length === 0) return []

  // student_schools + schools에서 현재 학교/학년 정보 가져오기
  const studentIds = students.map(s => s.id)
  const { data: studentSchools } = await supabase
    .from('student_schools')
    .select('student_id, grade, school:schools(name, school_type)')
    .in('student_id', studentIds)
    .eq('is_current', true)

  const schoolMap = new Map<string, { school: string | null; school_type: string | null; grade: number | null }>()
  studentSchools?.forEach((ss: any) => {
    schoolMap.set(ss.student_id, {
      school: ss.school?.name || null,
      school_type: ss.school?.school_type || null,
      grade: ss.grade || null,
    })
  })

  // 학생 데이터에 학교/학년 정보 병합
  return students.map(student => ({
    ...student,
    school: schoolMap.get(student.id)?.school || null,
    school_type: schoolMap.get(student.id)?.school_type || null,
    grade: schoolMap.get(student.id)?.grade || null,
  }))
}

/**
 * 신규상담 데이터를 관리하는 커스텀 훅
 * SWR을 사용하여 캐싱 및 중복 요청 방지
 */
export function useConsultations(): UseConsultationsReturn {
  const supabase = createClient()
  const { data, error, isLoading, mutate } = useSWR<ConsultationData[]>(
    'consultations',
    fetchConsultations,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000, // 30초간 중복 요청 방지
      errorRetryCount: 2
    }
  )

  // 상담 저장 (생성/수정)
  const saveConsultation = useCallback(async (
    consultationData: Partial<ConsultationData>,
    editingConsultation: ConsultationData | null
  ): Promise<{ success: boolean; statusChanged: boolean }> => {
    try {
      const cleanData: any = {
        ...cleanObj(consultationData),
        name: consultationData.name ?? '',
        parent_phone: consultationData.parent_phone ?? '',
        department: consultationData.department ?? '',
        status: consultationData.status ?? '신규상담',
        notes: consultationData.notes ?? '',
        first_contact_date: consultationData.first_contact_date ?? new Date().toISOString().split('T')[0]
      }
      // students 테이블에 없는 필드 제거 (school/grade는 student_schools 테이블에 저장)
      delete cleanData.school
      delete cleanData.school_type
      delete cleanData.grade
      delete cleanData.school_display_name
      delete cleanData.current_school_id
      delete cleanData.entrance_tests

      // lead_source는 값이 있을 때만 포함
      if (consultationData.lead_source && consultationData.lead_source.trim() !== '') {
        cleanData.lead_source = consultationData.lead_source
      }

      const originalStatus = editingConsultation?.status
      const newStatus = cleanData.status
      const statusChanged = originalStatus === '신규상담' && newStatus !== '신규상담'

      if (editingConsultation) {
        const { error: updateError } = await supabase
          .from('students')
          .update(cleanData)
          .eq('id', editingConsultation.id)
          .select()
        if (updateError) throw updateError

        // 상태 변경 알림
        if (statusChanged) {
          toast.success(`${cleanData.name}님의 상태가 ${newStatus}으로 변경되었습니다.`)
        } else {
          toast.success('상담 정보가 수정되었습니다.')
        }
      } else {
        const { error: insertError } = await supabase
          .from('students')
          .insert(cleanData)
          .select()

        if (insertError) {
          console.error('Insert error details:', {
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            code: insertError.code
          })
          throw insertError
        }
        toast.success('신규 상담이 등록되었습니다.')
      }

      return { success: true, statusChanged }
    } catch (err: any) {
      console.error('신규상담 저장 오류:', err)
      toast.error(`저장 중 오류가 발생했습니다: ${err.message || '알 수 없는 오류'}`)
      return { success: false, statusChanged: false }
    }
  }, [supabase])

  // 상담 삭제 (확인은 호출하는 컴포넌트에서 처리)
  const deleteConsultation = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('students')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      return true
    } catch (err) {
      console.error('신규상담 삭제 오류:', err)
      return false
    }
  }, [supabase])

  return {
    consultations: data || [],
    isLoading,
    error: error || null,
    saveConsultation,
    deleteConsultation,
    refresh: async () => { await mutate() }
  }
}
