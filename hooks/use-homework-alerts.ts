'use client'

import useSWR from 'swr'

export interface HomeworkAlertStudent {
  id: string
  mathflat_student_id: string
  name: string
  grade: number | null
  school_type: string | null
  class_name: string | null
  class_id: string | null
  avg_completion_rate: number
  total_homework_count: number
  completed_homework_count: number
  zero_completion_count: number
  alert_level: 'critical' | 'warning'
}

interface HomeworkAlertStats {
  total: number
  critical: number
  warning: number
}

interface HomeworkAlertsResponse {
  students: HomeworkAlertStudent[]
  stats: HomeworkAlertStats
  last_calculated_at: string | null
}

interface UseHomeworkAlertsReturn {
  students: HomeworkAlertStudent[]
  stats: HomeworkAlertStats
  lastCalculatedAt: string | null
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

const fetcher = async (url: string): Promise<HomeworkAlertsResponse> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch homework alerts')
  }
  return response.json()
}

export function useHomeworkAlerts(): UseHomeworkAlertsReturn {
  const { data, error, isLoading, mutate } = useSWR<HomeworkAlertsResponse>(
    '/api/homework-alerts',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
      errorRetryCount: 2,
    }
  )

  return {
    students: data?.students || [],
    stats: data?.stats || { total: 0, critical: 0, warning: 0 },
    lastCalculatedAt: data?.last_calculated_at ?? null,
    isLoading,
    error: error || null,
    refresh: async () => { await mutate() },
  }
}
