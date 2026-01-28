'use client'

import useSWR from 'swr'
import type { ChurnRiskStudent } from '@/components/dashboard/ChurnRiskCard'

interface UseChurnRiskStudentsReturn {
  students: ChurnRiskStudent[]
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

// SWR fetcher
const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch churn risk data')
  }
  const data = await response.json()
  return data.students || []
}

/**
 * 이탈 위험 학생 데이터를 로드하는 커스텀 훅
 * SWR을 사용하여 캐싱 및 중복 요청 방지
 */
export function useChurnRiskStudents(): UseChurnRiskStudentsReturn {
  const { data, error, isLoading, mutate } = useSWR<ChurnRiskStudent[]>(
    '/api/churn-risk',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1분간 중복 요청 방지
      errorRetryCount: 2
    }
  )

  return {
    students: data || [],
    isLoading,
    error: error || null,
    refresh: async () => { await mutate() }
  }
}
