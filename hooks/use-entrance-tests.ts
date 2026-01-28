'use client'

import { useCallback } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { calendarService } from '@/services/calendar'
import { cleanObj } from '@/lib/utils'
import { toast } from 'sonner'
import type { EntranceTestData } from '@/components/dashboard/TestModal'
import type { ConsultationData } from '@/types/dashboard'

interface UseEntranceTestsReturn {
  entranceTests: EntranceTestData[]
  isLoading: boolean
  error: Error | null
  createTest: (consultationId: string, consultations: ConsultationData[]) => EntranceTestData | null
  saveTest: (testData: Partial<EntranceTestData>, editingTest: EntranceTestData | null) => Promise<boolean>
  deleteTest: (id: number) => Promise<boolean>
  refresh: () => Promise<void>
}

// SWR fetcher
async function fetchEntranceTests(): Promise<EntranceTestData[]> {
  const supabase = createClient()

  // 먼저 신규상담 학생들의 ID를 가져옴
  const { data: consultationStudents } = await supabase
    .from('students')
    .select('id')
    .eq('is_active', true)
    .eq('status', '신규상담')

  const studentIds = consultationStudents?.map(s => s.id) || []

  if (studentIds.length === 0) {
    return []
  }

  // 해당 학생들의 입학테스트만 가져옴 (calendar_event_id 포함)
  const { data, error } = await supabase
    .from('entrance_tests')
    .select(`
      *,
      calendar_event_id,
      students!student_id (
        name,
        status
      )
    `)
    .in('student_id', studentIds)
    .order('test_date', { ascending: true, nullsFirst: true })
    .limit(20)

  if (error) throw error

  // 학생 이름 추가
  return data?.map(test => ({
    ...test,
    student_name: (test.students as any)?.name || '이름 없음'
  })) || []
}

/**
 * 입학테스트 데이터를 관리하는 커스텀 훅
 * SWR을 사용하여 캐싱 및 중복 요청 방지
 */
export function useEntranceTests(): UseEntranceTestsReturn {
  const supabase = createClient()
  const { data, error, isLoading, mutate } = useSWR<EntranceTestData[]>(
    'entrance-tests',
    fetchEntranceTests,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000, // 30초간 중복 요청 방지
      errorRetryCount: 2
    }
  )

  // 입학테스트 생성 (모달 열기용 초기 데이터 반환)
  const createTest = useCallback((
    consultationId: string,
    consultations: ConsultationData[]
  ): EntranceTestData | null => {
    const consultation = consultations.find(c => c.id === consultationId)
    if (!consultation) {
      toast.error('상담 정보를 찾을 수 없습니다.')
      return null
    }

    const newTest: Partial<EntranceTestData> = {
      student_id: consultationId,
      student_name: consultation.name,
      status: '테스트예정',
      test_date: new Date().toISOString(),
      test1_level: '',
      test2_level: '',
      test1_score: null,
      test2_score: null,
      test_result: null,
      recommended_class: '',
      notes: ''
    }

    return newTest as EntranceTestData
  }, [])

  // 입학테스트 저장
  const saveTest = useCallback(async (
    testData: Partial<EntranceTestData>,
    editingTest: EntranceTestData | null
  ): Promise<boolean> => {
    try {
      // test_result가 빈 문자열이면 null로 변환
      const cleanedTestData: any = {
        ...testData,
        test_result: (testData as any).test_result === '' ? null : (testData as any).test_result
      }

      // 신규 테스트 생성 시 editingTest에서 student_id 가져오기
      if (!editingTest?.id && editingTest) {
        cleanedTestData.student_id = editingTest.student_id
        delete cleanedTestData.student_name
      }

      // id가 undefined인 경우 제거
      if (cleanedTestData.id === undefined) {
        delete cleanedTestData.id
      }

      const cleanData = cleanObj(cleanedTestData)

      if (editingTest?.id) {
        // 기존 테스트 수정
        const { error: updateError } = await supabase
          .from('entrance_tests')
          .update(cleanData)
          .eq('id', editingTest.id)
          .select()

        if (updateError) {
          console.error('Supabase 에러 상세:', updateError)
          throw updateError
        }

        // 캘린더 이벤트가 있으면 업데이트
        if (editingTest.google_calendar_id && cleanData.test_date) {
          const studentName = editingTest.student_name || '학생'
          const testDate = new Date(cleanData.test_date as string)
          const startTime = testDate.toISOString()
          const endTime = new Date(testDate.getTime() + 2 * 60 * 60 * 1000).toISOString()

          const updateData = {
            title: `${studentName} 입학테스트`,
            start_time: startTime,
            end_time: endTime,
            description: `입학테스트 - ${studentName}`
          }

          await calendarService.updateEvent(editingTest.google_calendar_id, updateData)
        }

        toast.success('입학테스트가 수정되었습니다.')
      } else {
        // 신규 테스트 생성
        let calendarEventId = null

        // 테스트 날짜가 있으면 캘린더 이벤트 먼저 생성
        if (cleanData.test_date) {
          try {
            const { data: studentData } = await supabase
              .from('students')
              .select('name')
              .eq('id', cleanData.student_id)
              .single()

            const studentName = studentData?.name || '학생'
            const testDate = new Date(cleanData.test_date as string)
            const startTime = testDate.toISOString()
            const endTime = new Date(testDate.getTime() + 2 * 60 * 60 * 1000).toISOString()

            const calendarEvent = await calendarService.createEvent({
              title: `${studentName} 입학테스트`,
              start_time: startTime,
              end_time: endTime,
              event_type: 'entrance_test',
              description: `입학테스트 - ${studentName}`,
              location: null
            })

            calendarEventId = calendarEvent.id
          } catch (calendarError) {
            console.error('캘린더 이벤트 생성 실패:', calendarError)
          }
        }

        const insertData = {
          ...cleanData,
          calendar_event_id: calendarEventId
        }

        const { error: insertError } = await supabase
          .from('entrance_tests')
          .insert(insertData)
          .select()

        if (insertError) throw insertError
        toast.success('입학테스트가 등록되었습니다.')
      }

      return true
    } catch (err: any) {
      console.error('입학테스트 저장 오류:', err)
      toast.error(`저장 중 오류가 발생했습니다: ${err.message || '알 수 없는 오류'}`)
      return false
    }
  }, [supabase])

  // 입학테스트 삭제 (확인은 호출하는 컴포넌트에서 처리)
  const deleteTest = useCallback(async (id: number): Promise<boolean> => {
    try {
      // 먼저 입학테스트 정보를 가져와서 calendar_event_id 확인
      const { data: testData, error: fetchError } = await supabase
        .from('entrance_tests')
        .select('calendar_event_id')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      // 캘린더 이벤트가 있으면 먼저 삭제
      if (testData?.calendar_event_id) {
        try {
          await calendarService.deleteEvent(testData.calendar_event_id)
        } catch (calendarError) {
          console.error('캘린더 이벤트 삭제 실패:', calendarError)
        }
      }

      // 입학테스트 삭제
      const { error: deleteError } = await supabase
        .from('entrance_tests')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      toast.success('입학테스트가 삭제되었습니다.')
      return true
    } catch (err) {
      console.error('입학테스트 삭제 오류:', err)
      toast.error('입학테스트 삭제 중 오류가 발생했습니다.')
      return false
    }
  }, [supabase])

  return {
    entranceTests: data || [],
    isLoading,
    error: error || null,
    createTest,
    saveTest,
    deleteTest,
    refresh: async () => { await mutate() }
  }
}
