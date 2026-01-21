import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 한국시간(UTC+9) 기준으로 YYYY-MM-DD 형식의 날짜 문자열을 반환합니다.
 * 브라우저의 시간대에 관계없이 항상 한국시간 기준으로 계산됩니다.
 * 
 * @param date 변환할 Date 객체 (기본값: 현재 시간)
 * @returns YYYY-MM-DD 형식의 문자열
 */
export function getKoreanDateString(date?: Date): string {
  const targetDate = date || new Date()
  // UTC 시간을 구한 후 한국시간(+9시간) 추가
  const utc = targetDate.getTime() + (targetDate.getTimezoneOffset() * 60000)
  const koreanTime = new Date(utc + (9 * 60 * 60 * 1000))
  
  // 안전한 날짜 문자열 생성
  const year = koreanTime.getFullYear()
  const month = String(koreanTime.getMonth() + 1).padStart(2, '0')
  const day = String(koreanTime.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

/**
 * 한국시간 기준 특정 월의 시작일과 다음 월 시작일을 반환합니다.
 * 대시보드 월간 통계 쿼리에 사용됩니다.
 * 
 * @param year 연도 (기본값: 현재 연도)
 * @param month 월 (1-12, 기본값: 현재 월)
 * @returns { start: "YYYY-MM-01", end: "YYYY-MM-01" }
 */
export function getKoreanMonthRange(year?: number, month?: number): { start: string; end: string } {
  const now = new Date()
  const targetYear = year || now.getFullYear()
  const targetMonth = month || (now.getMonth() + 1)
  
  const monthStart = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-01`
  const nextMonth = targetMonth === 12 ? 1 : targetMonth + 1
  const nextYear = targetMonth === 12 ? targetYear + 1 : targetYear
  const monthEnd = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`
  
  return { start: monthStart, end: monthEnd }
}

/**
 * 한국시간(UTC+9) 기준으로 YYYY-MM-DDTHH:mm 형식의 datetime 문자열을 반환합니다.
 * HTML datetime-local input과 호환되는 형식으로 출력됩니다.
 * 
 * @param date 변환할 Date 객체 (기본값: 현재 시간)
 * @returns YYYY-MM-DDTHH:mm 형식의 문자열
 */
export function getKoreanDateTimeString(date?: Date): string {
  const targetDate = date || new Date()
  
  // UTC 시간에 9시간을 더해서 한국시간으로 변환
  const koreanTime = new Date(targetDate.getTime() + (9 * 60 * 60 * 1000))
  
  // YYYY-MM-DDTHH:mm 형식으로 반환 (datetime-local 호환)
  return koreanTime.toISOString().slice(0, 16)
}

/**
 * YYYY-MM-DDTHH:mm 형식의 datetime 문자열을 한국시간으로 해석하여 UTC Date 객체로 변환합니다.
 * HTML datetime-local input에서 받은 값을 올바른 UTC 시간으로 변환할 때 사용합니다.
 * 
 * @param dateTimeString YYYY-MM-DDTHH:mm 형식의 문자열 (한국시간으로 해석됨)
 * @returns UTC 기준 Date 객체
 */
export function parseKoreanDateTime(dateTimeString: string): Date {
  // 입력값을 한국시간으로 해석하여 UTC Date로 변환
  const koreanDate = new Date(dateTimeString + ':00+09:00') // 한국시간 타임존 명시

  return koreanDate
}

/**
 * UTC로 저장된 datetime을 한국시간으로 변환하여 표시용 문자열로 반환합니다.
 *
 * @param utcDateString UTC 형식의 날짜 문자열
 * @returns 한국 로케일 형식의 날짜/시간 문자열 (예: "2024. 1. 15. 오후 3:30:00")
 */
export function formatKoreanDateTime(utcDateString: string): string {
  const utcDate = new Date(utcDateString)
  return utcDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
}

/**
 * UTC로 저장된 datetime을 datetime-local input 형식(YYYY-MM-DDTHH:mm)으로 변환합니다.
 *
 * @param utcDateString UTC 형식의 날짜 문자열 또는 null
 * @returns YYYY-MM-DDTHH:mm 형식의 문자열 (input datetime-local 호환)
 */
export function formatKoreanDateTimeForInput(utcDateString: string | null): string {
  if (!utcDateString) return ''
  const utcDate = new Date(utcDateString)
  const koreanTime = new Date(utcDate.getTime() + (9 * 60 * 60 * 1000))
  return koreanTime.toISOString().slice(0, 16)
}
