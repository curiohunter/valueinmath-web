/**
 * 공통 SWR fetcher
 * - 모든 데이터 페칭에서 재사용
 * - 에러 핸들링 포함
 */
export const fetcher = async <T>(url: string): Promise<T> => {
  const response = await fetch(url)

  if (!response.ok) {
    const error = new Error("API 요청 실패")
    throw error
  }

  return response.json()
}

/**
 * API 응답 타입
 */
export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
}
