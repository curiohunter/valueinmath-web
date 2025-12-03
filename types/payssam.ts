/**
 * PaysSam (결제선생) API 연동 타입 정의
 * API 규격서 v1.2.4 기준
 */

// ============================================
// API 공통 타입
// ============================================

export interface PaysSamApiResponse<T = any> {
  code: string      // "0000" = 성공
  msg: string       // 응답 메시지
  data?: T
}

// API 에러 코드
export const PAYSSAM_ERROR_CODES = {
  '0000': '성공',
  '9999': '필수값 누락',
  '9980': '청구서를 찾을 수 없음',
  '9901': 'API KEY 오류',
  '9902': '회원 정보 오류',
  '9903': '머천트 정보 오류',
  '9904': 'HASH 검증 실패',
  '9905': '금액 불일치',
  '9906': '이미 처리된 청구서',
} as const

// ============================================
// 청구서 발송 (2.1 발송요청)
// ============================================

export interface PaysSamSendRequest {
  apikey: string
  member: string
  merchant: string
  bill: {
    bill_id: string           // 청구서 ID (20자리)
    product_nm: string        // 상품명
    message?: string          // 안내 메시지
    member_nm: string         // 수취인명
    phone: string             // 전화번호 (하이픈 제외)
    price: string             // 청구금액
    hash: string              // SHA-256 해시
    expire_dt?: string        // 만료일 YYYYMMDD
    callbackURL: string       // 승인동기화 수신 URL
  }
}

export interface PaysSamSendResponse {
  code: string
  msg: string
  shortURL?: string           // 청구서 단축 URL
  bill_id?: string
}

// ============================================
// 승인동기화 Webhook (2.2)
// ============================================

export interface PaysSamWebhookPayload {
  apikey: string
  bill_id: string
  appr_pay_type: PaysSamPayType
  appr_dt: string             // YYYYMMDDHHMMSS
  appr_price: string
  appr_issuer: string         // 카드사명
  appr_num: string            // 승인번호
  appr_state: PaysSamApprState
  appr_monthly: string        // 할부개월수
  // 추가 필드 (규격서 참조)
  member?: string
  merchant?: string
  appr_card_num?: string      // 마스킹된 카드번호
  appr_install_type?: string  // 할부유형
  appr_cash_type?: string     // 현금영수증 유형
}

// 결제 상태
export type PaysSamApprState = 'F' | 'W' | 'C' | 'D'

export const PAYSSAM_APPR_STATE_MAP = {
  F: { label: '결제완료', paymentStatus: '완납', requestStatus: 'paid' },
  W: { label: '미결제', paymentStatus: '미납', requestStatus: 'sent' },
  C: { label: '취소', paymentStatus: '미납', requestStatus: 'cancelled' },
  D: { label: '파기', paymentStatus: '미납', requestStatus: 'destroyed' },
} as const

// 결제수단
export type PaysSamPayType =
  | 'CARD_VAN'      // 신용카드 - VAN
  | 'CARD_RP'       // 신용카드 - 자동결제
  | 'KEYIN'         // KeyIN
  | 'OFFLINE_CARD'  // 현장결제 - 카드
  | 'OFFLINE_CASH'  // 현금영수증

export const PAYSSAM_PAY_TYPE_LABELS: Record<PaysSamPayType, string> = {
  CARD_VAN: '신용카드',
  CARD_RP: '자동결제',
  KEYIN: 'KeyIN',
  OFFLINE_CARD: '현장카드',
  OFFLINE_CASH: '현금영수증',
}

// ============================================
// 결제 취소 (2.3)
// ============================================

export interface PaysSamCancelRequest {
  apikey: string
  member: string
  merchant: string
  bill_id: string
  price: string
  hash: string                // SHA-256(bill_id,price)
}

// ============================================
// 청구서 파기 (2.4)
// ============================================

export interface PaysSamDestroyRequest {
  apikey: string
  member: string
  merchant: string
  bill_id: string
  price: string
  hash: string                // SHA-256(bill_id,price)
}

// ============================================
// 결제 상태 조회 (2.5)
// ============================================

export interface PaysSamReadRequest {
  apikey: string
  member: string
  merchant: string
  bill_id: string
}

export interface PaysSamReadResponse {
  code: string
  msg: string
  bill_id?: string
  appr_state?: PaysSamApprState
  appr_dt?: string
  appr_price?: string
  appr_pay_type?: PaysSamPayType
  appr_num?: string
}

// ============================================
// 쌤포인트 잔액 조회 (2.7)
// ============================================

export interface PaysSamBalanceResponse {
  code: string
  msg: string
  remain_count?: string       // 잔여 포인트
}

// ============================================
// 재발송 요청 (2.9)
// ============================================

export interface PaysSamResendRequest {
  apikey: string
  member: string
  merchant: string
  bill_id: string
}

// ============================================
// 이벤트 로그
// ============================================

export type PaysSamEventType =
  | 'invoice_sent'
  | 'payment_completed'
  | 'cancelled'
  | 'destroyed'
  | 'failed'
  | 'status_changed'
  | 'resent'

export interface PaysSamLog {
  id: string
  tuition_fee_id: string
  event_type: PaysSamEventType
  event_data: Record<string, any>
  created_at: string
}

// ============================================
// 환경 설정
// ============================================

export interface PaysSamConfig {
  apiUrl: string
  apiKey: string
  member: string
  merchant: string
  callbackUrl: string
}

// 개발/운영 환경 구분
export const PAYSSAM_ENV = {
  development: {
    apiUrl: 'https://stg.paymint.co.kr/partner',
    // 테스트 계정은 환경변수에서 로드
  },
  production: {
    apiUrl: 'https://api.paymint.co.kr/partner', // 운영 URL (확인 필요)
  }
} as const
