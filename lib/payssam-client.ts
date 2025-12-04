/**
 * PaysSam (결제선생) API 클라이언트
 * API 규격서 v1.2.4 기준
 */

import crypto from 'crypto'
import type { PaysSamApiResponse } from '@/types/payssam'

// ============================================
// 환경 설정
// ============================================

const getConfig = () => ({
  apiUrl: process.env.PAYSSAM_API_URL || 'https://stg.paymint.co.kr/partner',
  apiKey: process.env.PAYSSAM_API_KEY || '',
  member: process.env.PAYSSAM_MEMBER || '',
  merchant: process.env.PAYSSAM_MERCHANT || '',
  callbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payssam/webhook`,
})

// ============================================
// Hash 생성 함수
// ============================================

/**
 * SHA-256 해시 생성
 * @param billId - 청구서 ID
 * @param price - 금액
 * @param phone - 전화번호 (선택)
 * @returns SHA-256 해시 문자열
 *
 * 규칙:
 * - phone 있을 때: SHA256(bill_id,phone,price)
 * - phone 없을 때: SHA256(bill_id,price)
 */
export function generateHash(billId: string, price: string, phone?: string): string {
  const data = phone
    ? `${billId},${phone},${price}`
    : `${billId},${price}`
  return crypto.createHash('sha256').update(data).digest('hex')
}

// ============================================
// Bill ID 생성
// ============================================

/**
 * 청구서 ID 생성 (20자리)
 * 형식: VIM + timestamp(base36) + random
 * 예: VIM1A2B3C4D5E6F7G890
 */
export function generateBillId(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 10).toUpperCase()
  const billId = `VIM${timestamp}${random}`
  return billId.substring(0, 20).padEnd(20, '0')
}

// ============================================
// API 요청 함수
// ============================================

/**
 * PaysSam API 공통 요청 함수
 *
 * API 규격서 v1.2.4 기준:
 * - 대부분의 API: apikey + member + merchant 필요
 * - /if/read/remain_count (쌤포인트 잔액조회): apikey만 필요
 * - /if/read/merchant (가맹점 정보 조회): apikey만 필요
 */
export async function paysamRequest<T = any>(
  endpoint: string,
  body: Record<string, any>
): Promise<{ success: boolean; data?: T; error?: string; code?: string }> {
  const config = getConfig()

  // API별로 필요한 파라미터가 다름
  // /if/read/remain_count, /if/read/merchant는 apikey만 필요
  const apiKeyOnlyEndpoints = ['/if/read/remain_count', '/if/read/merchant']
  const needsMemberMerchant = !apiKeyOnlyEndpoints.includes(endpoint)

  const requestBody = needsMemberMerchant
    ? {
        apikey: config.apiKey,
        member: config.member,
        merchant: config.merchant,
        ...body,
      }
    : {
        apikey: config.apiKey,
        ...body,
      }

  // 디버깅용 로그 (민감 정보 마스킹)
  console.log('[PaysSam API Request]', {
    endpoint,
    url: `${config.apiUrl}${endpoint}`,
    apikey: config.apiKey ? `${config.apiKey.substring(0, 8)}...` : '(empty)',
    member: config.member || '(empty)',
    merchant: config.merchant || '(empty)',
    bodyKeys: Object.keys(body),
  })

  try {
    const response = await fetch(`${config.apiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    // 응답 텍스트를 먼저 읽기 (파싱 실패 대비)
    const responseText = await response.text()
    console.log('[PaysSam API Response]', {
      endpoint,
      status: response.status,
      statusText: response.statusText,
      body: responseText.substring(0, 500), // 처음 500자만 로그
    })

    if (!response.ok) {
      console.error('[PaysSam API Error] HTTP Error:', {
        endpoint,
        status: response.status,
        body: responseText,
      })
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText} - ${responseText}`,
        code: response.status.toString(),
      }
    }

    // JSON 파싱
    let data: PaysSamApiResponse<T>
    try {
      data = JSON.parse(responseText) as PaysSamApiResponse<T>
    } catch (parseError) {
      console.error('[PaysSam API Error] JSON Parse Error:', responseText)
      return {
        success: false,
        error: `JSON 파싱 실패: ${responseText}`,
        code: 'PARSE_ERROR',
      }
    }

    if (data.code === '0000') {
      console.log('[PaysSam API Success]', { endpoint, code: data.code })
      return { success: true, data: data as T, code: data.code }
    }

    console.error('[PaysSam API Error] Business Error:', {
      endpoint,
      code: data.code,
      msg: data.msg,
    })
    return {
      success: false,
      error: data.msg || '알 수 없는 오류',
      code: data.code,
    }
  } catch (error) {
    console.error('[PaysSam API Error] Network/Exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '네트워크 오류',
      code: 'NETWORK_ERROR',
    }
  }
}

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 전화번호 정규화 (하이픈 제거)
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/-/g, '').replace(/\s/g, '')
}

/**
 * 만료일 계산 (해당 월 말일)
 * @param year - 연도
 * @param month - 월
 * @returns YYYY-MM-DD 형식 (API 규격서 v1.2.4 기준)
 */
export function getExpireDate(year?: number, month?: number): string {
  const now = new Date()
  const targetYear = year || now.getFullYear()
  const targetMonth = month || now.getMonth() + 1

  // 해당 월의 마지막 날
  const lastDay = new Date(targetYear, targetMonth, 0).getDate()

  const yyyy = targetYear.toString()
  const mm = targetMonth.toString().padStart(2, '0')
  const dd = lastDay.toString().padStart(2, '0')

  return `${yyyy}-${mm}-${dd}`
}

/**
 * 승인일시 파싱 (YYYYMMDDHHMMSS → ISO string)
 */
export function parseApprDt(apprDt: string): string {
  if (!apprDt || apprDt.length < 14) return new Date().toISOString()

  const year = apprDt.substring(0, 4)
  const month = apprDt.substring(4, 6)
  const day = apprDt.substring(6, 8)
  const hour = apprDt.substring(8, 10)
  const min = apprDt.substring(10, 12)
  const sec = apprDt.substring(12, 14)

  // KST 타임존 (+09:00)
  return new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}+09:00`).toISOString()
}

/**
 * 금액 포맷팅 (숫자 → 문자열)
 */
export function formatPrice(amount: number): string {
  return Math.floor(amount).toString()
}

// ============================================
// 설정 확인
// ============================================

/**
 * PaysSam 설정이 올바른지 확인
 */
export function validateConfig(): { valid: boolean; missing: string[] } {
  const config = getConfig()
  const missing: string[] = []

  if (!config.apiKey) missing.push('PAYSSAM_API_KEY')
  if (!config.member) missing.push('PAYSSAM_MEMBER')
  if (!config.merchant) missing.push('PAYSSAM_MERCHANT')
  if (!config.callbackUrl || config.callbackUrl === '/api/payssam/webhook') {
    missing.push('NEXT_PUBLIC_SITE_URL')
  }

  return {
    valid: missing.length === 0,
    missing,
  }
}

/**
 * 현재 설정 정보 반환 (디버깅용, 민감정보 마스킹)
 */
export function getConfigInfo() {
  const config = getConfig()
  return {
    apiUrl: config.apiUrl,
    apiKey: config.apiKey ? `${config.apiKey.substring(0, 8)}...` : '(not set)',
    member: config.member || '(not set)',
    merchant: config.merchant || '(not set)',
    callbackUrl: config.callbackUrl,
    isProduction: !config.apiUrl.includes('stg'),
  }
}
