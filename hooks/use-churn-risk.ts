'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ChurnRiskStudent } from '@/components/dashboard/ChurnRiskCard'

interface UseChurnRiskStudentsReturn {
  students: ChurnRiskStudent[]
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

/**
 * 이탈 위험 학생 데이터를 로드하는 커스텀 훅
 * /api/churn-risk API를 호출하여 데이터를 가져옵니다.
 */
export function useChurnRiskStudents(): UseChurnRiskStudentsReturn {
  const [students, setStudents] = useState<ChurnRiskStudent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchStudents = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/churn-risk')
      if (!response.ok) {
        throw new Error('Failed to fetch churn risk data')
      }
      const data = await response.json()
      setStudents(data.students || [])
    } catch (err) {
      console.error('이탈 위험 학생 데이터 로딩 오류:', err)
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  return {
    students,
    isLoading,
    error,
    refresh: fetchStudents
  }
}
