'use client'

import { useState, useCallback } from 'react'
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

/**
 * 신규상담 데이터를 관리하는 커스텀 훅
 * 상담 데이터의 CRUD 작업을 처리합니다.
 */
export function useConsultations(): UseConsultationsReturn {
  const supabase = createClient()
  const [consultations, setConsultations] = useState<ConsultationData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 신규상담 데이터 로딩
  const loadConsultations = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: queryError } = await supabase
        .from('students')
        .select('*')
        .eq('is_active', true)
        .eq('status', '신규상담')
        .order('first_contact_date', { ascending: false })
        .limit(20)

      if (queryError) throw queryError
      setConsultations(data || [])
    } catch (err) {
      console.error('신규상담 데이터 로딩 오류:', err)
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

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
        school: consultationData.school ?? '',
        grade: consultationData.grade ?? 1,
        department: consultationData.department ?? '',
        status: consultationData.status ?? '신규상담',
        notes: consultationData.notes ?? '',
        first_contact_date: consultationData.first_contact_date ?? new Date().toISOString().split('T')[0]
      }

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
    consultations,
    isLoading,
    error,
    saveConsultation,
    deleteConsultation,
    refresh: loadConsultations
  }
}
