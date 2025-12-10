// 학습 대시보드 관련 타입 정의

/**
 * 전월 대비 트렌드 정보
 */
export type MetricTrend = {
  direction: "up" | "down" | "neutral"
  value: number // 절대값 차이
  percentage?: number // 퍼센트 차이 (선택)
}

/**
 * 알림 수준 (임계값 기반)
 */
export type AlertLevel = "normal" | "warning" | "critical"
