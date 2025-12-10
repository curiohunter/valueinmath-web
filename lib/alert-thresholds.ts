import { MetricTrend, AlertLevel } from "@/types/learning"

/**
 * 메트릭별 알림 임계값
 * - homework/focus: 5점 만점 기준
 * - attendance: 출석률 % 기준 (예: 10회 중 7회 미만 = 70% 미만)
 * - mathflat: 정답률 % 기준
 */
export const METRIC_THRESHOLDS = {
  homework: { critical: 1.5, warning: 2.5 }, // 5점 만점
  focus: { critical: 1.5, warning: 2.5 }, // 5점 만점
  attendance: { critical: 50, warning: 70 }, // 퍼센트 (50% 미만 critical, 70% 미만 warning)
  mathflat: { critical: 20, warning: 50 }, // 퍼센트 (20% 미만 critical, 50% 미만 warning)
} as const

export type MetricType = keyof typeof METRIC_THRESHOLDS

/**
 * 값에 따른 알림 레벨 결정
 * @param metric - 메트릭 종류
 * @param value - 현재 값
 * @returns 알림 레벨
 */
export function getAlertLevel(metric: MetricType, value: number): AlertLevel {
  const threshold = METRIC_THRESHOLDS[metric]
  if (value <= threshold.critical) return "critical"
  if (value <= threshold.warning) return "warning"
  return "normal"
}

/**
 * 전월 대비 트렌드 계산
 * @param current - 현재 월 값
 * @param previous - 전월 값 (null이면 비교 불가)
 * @returns 트렌드 정보
 */
export function calculateTrend(
  current: number,
  previous: number | null
): MetricTrend {
  // 1. 전월 데이터 없음 (신규 학생)
  if (previous === null) {
    return { direction: "neutral", value: 0 }
  }

  // 2. 둘 다 0일 때 (데이터 없음)
  if (current === 0 && previous === 0) {
    return { direction: "neutral", value: 0 }
  }

  const diff = current - previous
  return {
    direction: diff > 0 ? "up" : diff < 0 ? "down" : "neutral",
    value: Math.abs(diff),
    percentage: previous !== 0 ? (diff / previous) * 100 : undefined,
  }
}

/**
 * 출석 데이터로 출석률 계산
 * @param count5 - 출석 횟수
 * @param count4 - 지각 횟수
 * @param count3 - 조퇴 횟수
 * @param count2 - 보강 횟수
 * @param count1 - 결석 횟수
 * @returns 출석률 (%)
 */
export function calculateAttendanceRate(
  count5: number,
  count4: number,
  count3: number,
  count2: number,
  count1: number
): number {
  const total = count5 + count4 + count3 + count2 + count1
  if (total === 0) return 0

  // 출석(5) + 지각(4, 0.5 가중) + 조퇴(3, 0.5 가중) + 보강(2, 0.5 가중) = 출석률
  // 결석(1)은 0점
  const attended = count5 + count4 * 0.5 + count3 * 0.5 + count2 * 0.5
  return (attended / total) * 100
}
