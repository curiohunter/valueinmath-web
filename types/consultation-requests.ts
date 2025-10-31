// 상담 요청 및 알림 시스템 타입 정의

export type ConsultationMethod = '대면' | '전화'
export type ConsultationType = '학습관련' | '운영관련' | '기타'
export type ConsultationRequestStatus = '대기중' | '처리중' | '완료'

// 학부모 상담 요청
export interface ConsultationRequest {
  id: string
  student_id: string
  requester_id: string
  method: ConsultationMethod
  type: ConsultationType
  content: string
  counselor_id: string | null
  status: ConsultationRequestStatus
  created_at: string
  updated_at: string

  // 조인된 데이터 (선택적)
  student_name?: string
  requester_name?: string
  requester_role?: 'parent' | 'student'
  counselor_name?: string | null
}

// 상담 요청 폼 데이터
export interface ConsultationRequestFormData {
  student_id: string
  method: ConsultationMethod
  type: ConsultationType
  content: string
}

// 알림 타입
export type NotificationType = 'consultation_request' | 'new_comment' | 'comment_reply'

// 직원 알림
export interface Notification {
  id: string
  employee_id: string
  type: NotificationType
  title: string
  content: string
  related_id: string | null // consultation_request_id, comment_id 등
  is_read: boolean
  created_at: string
}

// 알림 카운트 (읽지 않은 알림)
export interface NotificationCount {
  total: number
  by_type: {
    consultation_request: number
    new_comment: number
    comment_reply: number
  }
}

// 상담 요청 목록 필터
export interface ConsultationRequestFilter {
  status?: ConsultationRequestStatus
  type?: ConsultationType
  method?: ConsultationMethod
  date_from?: string
  date_to?: string
}

// 상담 요청 통계
export interface ConsultationRequestStats {
  total: number
  by_status: Record<ConsultationRequestStatus, number>
  by_type: Record<ConsultationType, number>
  by_method: Record<ConsultationMethod, number>
  average_response_time_hours: number // 평균 응답 시간 (시간)
}
