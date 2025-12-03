/**
 * PaysSam (결제선생) 비즈니스 서비스
 * 청구서 발송, 결제 상태 관리, 동기화 로직
 */

import { createClient } from '@/lib/supabase/client'
import {
  paysamRequest,
  generateHash,
  generateBillId,
  normalizePhone,
  getExpireDate,
  formatPrice,
  parseApprDt,
} from '@/lib/payssam-client'
import type {
  PaysSamSendResponse,
  PaysSamReadResponse,
  PaysSamBalanceResponse,
  PaysSamWebhookPayload,
  PaysSamApprState,
  PaysSamEventType,
} from '@/types/payssam'
import type { TuitionFee, PaysSamRequestStatus } from '@/types/tuition'

// ============================================
// 청구서 발송
// ============================================

interface SendInvoiceParams {
  tuitionFeeId: string
  studentName: string
  parentPhone: string
  amount: number
  productName: string
  message?: string
  expireYear?: number
  expireMonth?: number
}

export async function sendInvoice(params: SendInvoiceParams) {
  const {
    tuitionFeeId,
    studentName,
    parentPhone,
    amount,
    productName,
    message = '밸류인수학 학원비 청구서입니다.',
    expireYear,
    expireMonth,
  } = params

  const billId = generateBillId()
  const phone = normalizePhone(parentPhone)
  const price = formatPrice(amount)
  const hash = generateHash(billId, price, phone)
  const expireDt = getExpireDate(expireYear, expireMonth)
  const callbackURL = `${process.env.NEXT_PUBLIC_SITE_URL}/api/payssam/webhook`

  const result = await paysamRequest<PaysSamSendResponse>('/if/bill/send', {
    bill: {
      bill_id: billId,
      product_nm: productName,
      message,
      member_nm: studentName,
      phone,
      price,
      hash,
      expire_dt: expireDt,
      callbackURL,
    },
  })

  if (result.success) {
    // DB 업데이트
    const supabase = createClient()
    const now = new Date().toISOString()

    await supabase.from('tuition_fees').update({
      payssam_bill_id: billId,
      payssam_request_status: 'sent',
      payssam_sent_at: now,
      payssam_short_url: result.data?.shortURL || null,
      payssam_last_sync_at: now,
    }).eq('id', tuitionFeeId)

    // 이벤트 로그
    await logPaysamEvent(tuitionFeeId, 'invoice_sent', {
      bill_id: billId,
      amount,
      phone,
      shortURL: result.data?.shortURL,
      expire_dt: expireDt,
    })
  }

  return {
    ...result,
    billId,
  }
}

// ============================================
// 일괄 청구서 발송
// ============================================

interface BulkSendResult {
  success: number
  failed: number
  results: Array<{
    tuitionFeeId: string
    studentName: string
    success: boolean
    billId?: string
    error?: string
  }>
}

export async function sendInvoicesBulk(
  tuitionFeeIds: string[]
): Promise<BulkSendResult> {
  const supabase = createClient()

  // 청구 대상 조회 (학생 정보 포함)
  const { data: fees, error } = await supabase
    .from('tuition_fees')
    .select(`
      id,
      amount,
      year,
      month,
      class_type,
      student_name_snapshot,
      class_name_snapshot,
      students!inner(
        id,
        name,
        parent_phone
      )
    `)
    .in('id', tuitionFeeIds)
    .is('payssam_bill_id', null)

  if (error || !fees) {
    return { success: 0, failed: tuitionFeeIds.length, results: [] }
  }

  const results: BulkSendResult['results'] = []
  let success = 0
  let failed = 0

  for (const fee of fees) {
    const student = fee.students as any
    const studentName = fee.student_name_snapshot || student?.name || '학생'
    const parentPhone = student?.parent_phone

    if (!parentPhone) {
      results.push({
        tuitionFeeId: fee.id,
        studentName,
        success: false,
        error: '학부모 전화번호 없음',
      })
      failed++
      continue
    }

    const productName = `${fee.class_name_snapshot || '수업료'} (${fee.year}년 ${fee.month}월)`

    const result = await sendInvoice({
      tuitionFeeId: fee.id,
      studentName,
      parentPhone,
      amount: fee.amount,
      productName,
      expireYear: fee.year,
      expireMonth: fee.month,
    })

    if (result.success) {
      success++
      results.push({
        tuitionFeeId: fee.id,
        studentName,
        success: true,
        billId: result.billId,
      })
    } else {
      failed++
      results.push({
        tuitionFeeId: fee.id,
        studentName,
        success: false,
        error: result.error,
      })
    }

    // Rate limiting: 100ms 간격
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  return { success, failed, results }
}

// ============================================
// 결제 상태 조회
// ============================================

export async function getPaymentStatus(billId: string) {
  return paysamRequest<PaysSamReadResponse>('/if/bill/read', {
    bill_id: billId,
  })
}

/**
 * 특정 청구서의 결제 상태 동기화
 */
export async function syncPaymentStatus(tuitionFeeId: string) {
  const supabase = createClient()

  const { data: fee, error } = await supabase
    .from('tuition_fees')
    .select('payssam_bill_id')
    .eq('id', tuitionFeeId)
    .single()

  if (error || !fee?.payssam_bill_id) {
    return { success: false, error: '청구서 정보 없음' }
  }

  const result = await getPaymentStatus(fee.payssam_bill_id)

  if (result.success && result.data) {
    const response = result.data as PaysSamReadResponse
    await processWebhookPayload({
      apikey: '',
      bill_id: fee.payssam_bill_id,
      appr_state: response.appr_state || 'W',
      appr_dt: response.appr_dt || '',
      appr_price: response.appr_price || '',
      appr_pay_type: response.appr_pay_type || 'CARD_VAN',
      appr_num: response.appr_num || '',
      appr_issuer: '',
      appr_monthly: '',
    })
  }

  return result
}

// ============================================
// 결제 취소
// ============================================

export async function cancelPayment(tuitionFeeId: string) {
  const supabase = createClient()

  const { data: fee, error } = await supabase
    .from('tuition_fees')
    .select('payssam_bill_id, amount')
    .eq('id', tuitionFeeId)
    .single()

  if (error || !fee?.payssam_bill_id) {
    return { success: false, error: '청구서 정보 없음' }
  }

  const price = formatPrice(fee.amount)
  const hash = generateHash(fee.payssam_bill_id, price)

  const result = await paysamRequest('/if/bill/cancel', {
    bill_id: fee.payssam_bill_id,
    price,
    hash,
  })

  if (result.success) {
    const now = new Date().toISOString()

    await supabase.from('tuition_fees').update({
      payment_status: '미납',
      payssam_request_status: 'cancelled',
      payssam_cancelled_at: now,
      payssam_last_sync_at: now,
    }).eq('id', tuitionFeeId)

    await logPaysamEvent(tuitionFeeId, 'cancelled', {
      bill_id: fee.payssam_bill_id,
      amount: fee.amount,
    })
  }

  return result
}

// ============================================
// 청구서 파기
// ============================================

export async function destroyInvoice(tuitionFeeId: string) {
  const supabase = createClient()

  const { data: fee, error } = await supabase
    .from('tuition_fees')
    .select('payssam_bill_id, amount')
    .eq('id', tuitionFeeId)
    .single()

  if (error || !fee?.payssam_bill_id) {
    return { success: false, error: '청구서 정보 없음' }
  }

  const price = formatPrice(fee.amount)
  const hash = generateHash(fee.payssam_bill_id, price)

  const result = await paysamRequest('/if/bill/destroy', {
    bill_id: fee.payssam_bill_id,
    price,
    hash,
  })

  if (result.success) {
    const now = new Date().toISOString()

    await supabase.from('tuition_fees').update({
      payssam_request_status: 'destroyed',
      payssam_destroyed_at: now,
      payssam_last_sync_at: now,
    }).eq('id', tuitionFeeId)

    await logPaysamEvent(tuitionFeeId, 'destroyed', {
      bill_id: fee.payssam_bill_id,
      amount: fee.amount,
    })
  }

  return result
}

// ============================================
// 청구서 재발송
// ============================================

export async function resendInvoice(tuitionFeeId: string) {
  const supabase = createClient()

  const { data: fee, error } = await supabase
    .from('tuition_fees')
    .select('payssam_bill_id')
    .eq('id', tuitionFeeId)
    .single()

  if (error || !fee?.payssam_bill_id) {
    return { success: false, error: '청구서 정보 없음' }
  }

  const result = await paysamRequest('/if/bill/resend', {
    bill_id: fee.payssam_bill_id,
  })

  if (result.success) {
    await logPaysamEvent(tuitionFeeId, 'resent', {
      bill_id: fee.payssam_bill_id,
    })
  }

  return result
}

// ============================================
// 쌤포인트 잔액 조회
// ============================================

export async function getPointBalance() {
  return paysamRequest<PaysSamBalanceResponse>('/if/read/remain_count', {})
}

// ============================================
// Webhook 처리
// ============================================

/**
 * appr_state → 내부 상태 매핑
 */
const STATUS_MAP: Record<PaysSamApprState, {
  paymentStatus: string
  requestStatus: PaysSamRequestStatus
}> = {
  F: { paymentStatus: '완납', requestStatus: 'paid' },
  W: { paymentStatus: '미납', requestStatus: 'sent' },
  C: { paymentStatus: '미납', requestStatus: 'cancelled' },
  D: { paymentStatus: '미납', requestStatus: 'destroyed' },
}

export async function processWebhookPayload(payload: PaysSamWebhookPayload) {
  const supabase = createClient()

  // bill_id로 tuition_fee 조회
  const { data: fee, error } = await supabase
    .from('tuition_fees')
    .select('id')
    .eq('payssam_bill_id', payload.bill_id)
    .single()

  if (error || !fee) {
    return { success: false, error: '청구서를 찾을 수 없습니다.', code: '9980' }
  }

  const status = STATUS_MAP[payload.appr_state] || STATUS_MAP.W
  const now = new Date().toISOString()

  // DB 업데이트
  const updateData: Record<string, any> = {
    payment_status: status.paymentStatus,
    payssam_request_status: status.requestStatus,
    payssam_payment_method: payload.appr_pay_type,
    payssam_transaction_id: payload.appr_num,
    payssam_last_sync_at: now,
    payssam_raw_response: payload,
  }

  // 상태별 타임스탬프
  if (payload.appr_state === 'F') {
    updateData.payssam_paid_at = payload.appr_dt
      ? parseApprDt(payload.appr_dt)
      : now
  } else if (payload.appr_state === 'C') {
    updateData.payssam_cancelled_at = now
  } else if (payload.appr_state === 'D') {
    updateData.payssam_destroyed_at = now
  }

  await supabase.from('tuition_fees').update(updateData).eq('id', fee.id)

  // 이벤트 로그
  const eventType: PaysSamEventType =
    payload.appr_state === 'F'
      ? 'payment_completed'
      : payload.appr_state === 'C'
        ? 'cancelled'
        : payload.appr_state === 'D'
          ? 'destroyed'
          : 'status_changed'

  await logPaysamEvent(fee.id, eventType, payload)

  return { success: true, tuitionFeeId: fee.id }
}

// ============================================
// 이벤트 로깅
// ============================================

export async function logPaysamEvent(
  tuitionFeeId: string,
  eventType: PaysSamEventType,
  eventData: Record<string, any>
) {
  const supabase = createClient()

  await supabase.from('payssam_logs').insert({
    tuition_fee_id: tuitionFeeId,
    event_type: eventType,
    event_data: eventData,
  })
}

// ============================================
// 유틸리티
// ============================================

/**
 * 청구 가능 여부 확인
 */
export function canSendInvoice(fee: Partial<TuitionFee>): {
  canSend: boolean
  reason?: string
} {
  if (fee.payssam_bill_id) {
    return { canSend: false, reason: '이미 청구서가 발송되었습니다.' }
  }
  if (fee.payment_status === '완납') {
    return { canSend: false, reason: '이미 완납된 건입니다.' }
  }
  if (!fee.amount || fee.amount <= 0) {
    return { canSend: false, reason: '금액이 유효하지 않습니다.' }
  }
  return { canSend: true }
}

/**
 * 취소 가능 여부 확인
 */
export function canCancelPayment(fee: Partial<TuitionFee>): {
  canCancel: boolean
  reason?: string
} {
  if (!fee.payssam_bill_id) {
    return { canCancel: false, reason: '발송된 청구서가 없습니다.' }
  }
  if (fee.payssam_request_status !== 'paid') {
    return { canCancel: false, reason: '결제 완료 건만 취소할 수 있습니다.' }
  }
  return { canCancel: true }
}

/**
 * 파기 가능 여부 확인
 */
export function canDestroyInvoice(fee: Partial<TuitionFee>): {
  canDestroy: boolean
  reason?: string
} {
  if (!fee.payssam_bill_id) {
    return { canDestroy: false, reason: '발송된 청구서가 없습니다.' }
  }
  if (fee.payssam_request_status === 'paid') {
    return { canDestroy: false, reason: '결제 완료 건은 파기할 수 없습니다.' }
  }
  if (fee.payssam_request_status === 'destroyed') {
    return { canDestroy: false, reason: '이미 파기된 청구서입니다.' }
  }
  return { canDestroy: true }
}
