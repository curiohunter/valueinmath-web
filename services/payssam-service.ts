/**
 * PaysSam (결제선생) 비즈니스 서비스
 * 청구서 발송, 결제 상태 관리, 동기화 로직
 *
 * payssam_bills 테이블 기반 (1:N 관계)
 */

import { createServerClient } from '@/lib/auth/server'
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
  PaysSamBill,
} from '@/types/payssam'
import type { PaysSamRequestStatus } from '@/types/tuition'

// ============================================
// 활성 청구서 헬퍼
// ============================================

/**
 * tuition_fee_id에 대한 활성 청구서 조회
 * 활성 = destroyed, cancelled, failed가 아닌 상태
 */
export async function getActiveBill(tuitionFeeId: string): Promise<PaysSamBill | null> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('payssam_bills')
    .select('*')
    .eq('tuition_fee_id', tuitionFeeId)
    .not('request_status', 'in', '("destroyed","cancelled","failed")')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

// ============================================
// 청구서 생성 (API 호출 - 결제선생에 등록 + 카카오톡 발송)
// ============================================

interface CreateInvoiceParams {
  tuitionFeeId: string
  studentName: string
  parentPhone: string
  amount: number
  productName: string
  message?: string
  expireYear?: number
  expireMonth?: number
  classType?: string
  className?: string
  periodStartDate?: string | null
  periodEndDate?: string | null
  note?: string | null
}

/**
 * 청구서 메시지 생성 (수업 타입별 템플릿)
 */
function buildInvoiceMessage(params: {
  classType?: string
  className?: string
  periodStartDate?: string | null
  periodEndDate?: string | null
  amount: number
  note?: string | null
}): string {
  const { classType, className, periodStartDate, periodEndDate, amount, note } = params

  const lines: string[] = []

  if (classType === '입학테스트비') {
    // 입학테스트비는 반 정보 표시 안함
  } else if (className) {
    lines.push(`■ 수업: ${className}`)
  }

  if (periodStartDate && periodEndDate) {
    const formatDate = (d: string) => d.replace(/-/g, '.')
    lines.push(`■ 기간: ${formatDate(periodStartDate)} ~ ${formatDate(periodEndDate)}`)
  }

  lines.push(`■ 금액: ${amount.toLocaleString()}원`)

  if (note && note.trim()) {
    lines.push('')
    lines.push(`[안내] ${note.trim()}`)
  }

  return lines.join('\n')
}

/**
 * 청구서 생성
 * - PaysSam /if/bill/send API 호출
 * - payssam_bills에 INSERT
 */
export async function createInvoice(params: CreateInvoiceParams) {
  const {
    tuitionFeeId,
    studentName,
    parentPhone,
    amount,
    productName,
    message,
    expireYear,
    expireMonth,
    classType,
    className,
    periodStartDate,
    periodEndDate,
    note,
  } = params

  const finalMessage = message || buildInvoiceMessage({
    classType,
    className,
    periodStartDate,
    periodEndDate,
    amount,
    note,
  }) || '밸류인수학 학원비 청구서입니다.'

  const billId = generateBillId()
  const phone = normalizePhone(parentPhone)
  const price = formatPrice(amount)
  const hash = generateHash(billId, price, phone)
  const expireDt = getExpireDate(expireYear, expireMonth)
  const callbackURL = `${process.env.NEXT_PUBLIC_SITE_URL}/api/payssam/webhook`

  console.log('[createInvoice] callbackURL:', {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    callbackURL,
    billId,
    phone,
    price,
    expireDt,
  })

  // PaysSam API 호출
  const result = await paysamRequest<PaysSamSendResponse>('/if/bill/send', {
    bill: {
      bill_id: billId,
      product_nm: productName,
      message: finalMessage,
      member_nm: studentName,
      phone,
      price,
      hash,
      expire_dt: expireDt,
      callbackURL,
    },
  })

  console.log('[createInvoice] PaysSam API 결과:', {
    success: result.success,
    error: result.error,
    billId,
    tuitionFeeId,
  })

  if (result.success) {
    const supabase = await createServerClient()
    const now = new Date().toISOString()

    // payssam_bills에 INSERT
    const { data: billData, error: billError } = await supabase.from('payssam_bills').insert({
      tuition_fee_id: tuitionFeeId,
      bill_id: billId,
      request_status: 'sent',
      sent_at: now,
      short_url: result.data?.shortURL || null,
      last_sync_at: now,
    }).select('id').single()

    console.log('[createInvoice] payssam_bills INSERT:', {
      billData,
      billError: billError?.message,
    })

    // 이벤트 로그
    await logPaysamEvent(tuitionFeeId, 'invoice_sent', {
      bill_id: billId,
      amount,
      phone,
      shortURL: result.data?.shortURL,
      expire_dt: expireDt,
      student_name: studentName,
    }, billData?.id)

    return {
      success: true,
      billId,
      shortURL: result.data?.shortURL,
      data: {
        billId,
        phone,
        price,
        expireDt,
        productName,
        studentName,
        shortURL: result.data?.shortURL,
      },
    }
  }

  return {
    success: false,
    error: result.error || 'API 호출 실패',
    billId: null,
  }
}

// ============================================
// 일괄 청구서 생성
// ============================================

interface BulkCreateResult {
  success: number
  failed: number
  results: Array<{
    tuitionFeeId: string
    studentName: string
    success: boolean
    billId?: string
    shortURL?: string
    error?: string
  }>
}

export async function createInvoicesBulk(
  tuitionFeeIds: string[]
): Promise<BulkCreateResult> {
  console.log('[createInvoicesBulk] 시작:', { count: tuitionFeeIds.length })

  const supabase = await createServerClient()

  // 청구 대상 조회
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
      period_start_date,
      period_end_date,
      note,
      students!inner(
        id,
        name,
        payment_phone,
        parent_phone
      )
    `)
    .in('id', tuitionFeeIds)

  if (error || !fees) {
    console.error('[createInvoicesBulk] 조회 실패:', error)
    return { success: 0, failed: tuitionFeeIds.length, results: [] }
  }

  // 활성 청구서 일괄 조회
  const { data: activeBills } = await supabase
    .from('payssam_bills')
    .select('tuition_fee_id')
    .in('tuition_fee_id', tuitionFeeIds)
    .not('request_status', 'in', '("destroyed","cancelled","failed")')

  const activeBillFeeIds = new Set((activeBills || []).map(b => b.tuition_fee_id))

  const results: BulkCreateResult['results'] = []
  let successCount = 0
  let failedCount = 0

  for (const fee of fees) {
    const student = fee.students as any
    const studentName = fee.student_name_snapshot || student?.name || '학생'

    // 활성 청구서가 있는 경우 스킵
    if (activeBillFeeIds.has(fee.id)) {
      results.push({
        tuitionFeeId: fee.id,
        studentName,
        success: false,
        error: '이미 청구서가 존재합니다',
      })
      failedCount++
      continue
    }

    const parentPhone = student?.payment_phone || student?.parent_phone

    if (!parentPhone) {
      results.push({
        tuitionFeeId: fee.id,
        studentName,
        success: false,
        error: '청구용 전화번호 없음',
      })
      failedCount++
      continue
    }

    const productName = `밸류인수학 ${fee.year}년 ${fee.month}월 학원비`

    const result = await createInvoice({
      tuitionFeeId: fee.id,
      studentName,
      parentPhone,
      amount: fee.amount,
      productName,
      expireYear: fee.year,
      expireMonth: fee.month,
      classType: fee.class_type || undefined,
      className: fee.class_name_snapshot || undefined,
      periodStartDate: fee.period_start_date,
      periodEndDate: fee.period_end_date,
      note: fee.note,
    })

    if (result.success) {
      successCount++
      results.push({
        tuitionFeeId: fee.id,
        studentName,
        success: true,
        billId: result.billId!,
        shortURL: result.shortURL,
      })
    } else {
      failedCount++
      results.push({
        tuitionFeeId: fee.id,
        studentName,
        success: false,
        error: result.error,
      })
    }

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  return { success: successCount, failed: failedCount, results }
}

// ============================================
// 청구서 발송 (레거시 - createInvoice로 통합됨)
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
  classType?: string
  className?: string
  periodStartDate?: string | null
  periodEndDate?: string | null
  note?: string | null
}

/**
 * 청구서 발송 (레거시 함수)
 * @deprecated createInvoice()를 사용하세요.
 */
export async function sendInvoice(params: SendInvoiceParams & { existingBillId?: string }) {
  const {
    tuitionFeeId,
    studentName,
    parentPhone,
    amount,
    productName,
    message,
    expireYear,
    expireMonth,
    existingBillId,
    classType,
    className,
    periodStartDate,
    periodEndDate,
    note,
  } = params

  const finalMessage = message || buildInvoiceMessage({
    classType,
    className,
    periodStartDate,
    periodEndDate,
    amount,
    note,
  }) || '밸류인수학 학원비 청구서입니다.'

  const billId = existingBillId || generateBillId()
  const phone = normalizePhone(parentPhone)
  const price = formatPrice(amount)
  const hash = generateHash(billId, price, phone)
  const expireDt = getExpireDate(expireYear, expireMonth)
  const callbackURL = `${process.env.NEXT_PUBLIC_SITE_URL}/api/payssam/webhook`

  const result = await paysamRequest<PaysSamSendResponse>('/if/bill/send', {
    bill: {
      bill_id: billId,
      product_nm: productName,
      message: finalMessage,
      member_nm: studentName,
      phone,
      price,
      hash,
      expire_dt: expireDt,
      callbackURL,
    },
  })

  if (result.success) {
    const supabase = await createServerClient()
    const now = new Date().toISOString()

    // payssam_bills에 INSERT
    const { data: billData } = await supabase.from('payssam_bills').insert({
      tuition_fee_id: tuitionFeeId,
      bill_id: billId,
      request_status: 'sent',
      sent_at: now,
      short_url: result.data?.shortURL || null,
      last_sync_at: now,
    }).select('id').single()

    await logPaysamEvent(tuitionFeeId, 'invoice_sent', {
      bill_id: billId,
      amount,
      phone,
      shortURL: result.data?.shortURL,
      expire_dt: expireDt,
    }, billData?.id)
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
  const supabase = await createServerClient()

  // 청구 대상 조회 (pending/created/null 상태만)
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
      period_start_date,
      period_end_date,
      note,
      students!inner(
        id,
        name,
        payment_phone,
        parent_phone
      )
    `)
    .in('id', tuitionFeeIds)

  if (error || !fees) {
    return { success: 0, failed: tuitionFeeIds.length, results: [] }
  }

  // 활성 청구서 없는 건만 필터 (기존 created/pending 체크 대체)
  const { data: activeBills } = await supabase
    .from('payssam_bills')
    .select('tuition_fee_id, bill_id, request_status')
    .in('tuition_fee_id', tuitionFeeIds)
    .not('request_status', 'in', '("destroyed","cancelled","failed")')

  const activeBillMap = new Map((activeBills || []).map(b => [b.tuition_fee_id, b]))

  const filteredFees = fees.filter(fee => {
    const activeBill = activeBillMap.get(fee.id)
    // 활성 bill이 없거나, created 상태인 경우만 발송 가능
    return !activeBill || activeBill.request_status === 'created'
  })

  if (filteredFees.length === 0) {
    return { success: 0, failed: tuitionFeeIds.length, results: [] }
  }

  const results: BulkSendResult['results'] = []
  let successCount = 0
  let failedCount = 0

  for (const fee of filteredFees) {
    const student = fee.students as any
    const studentName = fee.student_name_snapshot || student?.name || '학생'
    const parentPhone = student?.payment_phone || student?.parent_phone

    if (!parentPhone) {
      results.push({
        tuitionFeeId: fee.id,
        studentName,
        success: false,
        error: '청구용 전화번호 없음',
      })
      failedCount++
      continue
    }

    const productName = `밸류인수학 ${fee.year}년 ${fee.month}월 학원비`
    const activeBill = activeBillMap.get(fee.id)

    const result = await sendInvoice({
      tuitionFeeId: fee.id,
      studentName,
      parentPhone,
      amount: fee.amount,
      productName,
      expireYear: fee.year,
      expireMonth: fee.month,
      existingBillId: activeBill?.request_status === 'created' ? activeBill.bill_id : undefined,
      classType: fee.class_type || undefined,
      className: fee.class_name_snapshot || undefined,
      periodStartDate: fee.period_start_date,
      periodEndDate: fee.period_end_date,
      note: fee.note,
    })

    if (result.success) {
      successCount++
      results.push({
        tuitionFeeId: fee.id,
        studentName,
        success: true,
        billId: result.billId,
      })
    } else {
      failedCount++
      results.push({
        tuitionFeeId: fee.id,
        studentName,
        success: false,
        error: result.error,
      })
    }

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  return { success: successCount, failed: failedCount, results }
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
  const activeBill = await getActiveBill(tuitionFeeId)

  if (!activeBill) {
    return { success: false, error: '청구서 정보 없음' }
  }

  const result = await getPaymentStatus(activeBill.bill_id)

  if (result.success && result.data) {
    const response = result.data as PaysSamReadResponse
    await processWebhookPayload({
      apikey: '',
      bill_id: activeBill.bill_id,
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
  const activeBill = await getActiveBill(tuitionFeeId)

  if (!activeBill) {
    return { success: false, error: '청구서 정보 없음' }
  }

  const supabase = await createServerClient()

  // 금액 조회
  const { data: fee } = await supabase
    .from('tuition_fees')
    .select('amount')
    .eq('id', tuitionFeeId)
    .single()

  if (!fee) {
    return { success: false, error: '학원비 정보 없음' }
  }

  const price = formatPrice(fee.amount)
  const hash = generateHash(activeBill.bill_id, price)

  const result = await paysamRequest('/if/bill/cancel', {
    bill_id: activeBill.bill_id,
    price,
    hash,
  })

  if (result.success) {
    const now = new Date().toISOString()

    // payssam_bills 업데이트
    await supabase.from('payssam_bills').update({
      request_status: 'cancelled',
      cancelled_at: now,
      last_sync_at: now,
    }).eq('id', activeBill.id)

    // tuition_fees payment_status 업데이트
    await supabase.from('tuition_fees').update({
      payment_status: '미납',
    }).eq('id', tuitionFeeId)

    await logPaysamEvent(tuitionFeeId, 'cancelled', {
      bill_id: activeBill.bill_id,
      amount: fee.amount,
    }, activeBill.id)
  }

  return result
}

// ============================================
// 청구서 파기
// ============================================

export async function destroyInvoice(tuitionFeeId: string) {
  const activeBill = await getActiveBill(tuitionFeeId)

  if (!activeBill) {
    return { success: false, error: '청구서 정보 없음' }
  }

  const supabase = await createServerClient()

  // 금액 조회
  const { data: fee } = await supabase
    .from('tuition_fees')
    .select('amount')
    .eq('id', tuitionFeeId)
    .single()

  if (!fee) {
    return { success: false, error: '학원비 정보 없음' }
  }

  const price = formatPrice(fee.amount)
  const hash = generateHash(activeBill.bill_id, price)

  const result = await paysamRequest('/if/bill/destroy', {
    bill_id: activeBill.bill_id,
    price,
    hash,
  })

  // PaysSam에서 성공했거나, 이미 존재하지 않는 청구서(9980)인 경우 DB도 파기 처리
  if (result.success || result.code === '9980') {
    const now = new Date().toISOString()

    // payssam_bills 업데이트
    await supabase.from('payssam_bills').update({
      request_status: 'destroyed',
      destroyed_at: now,
      last_sync_at: now,
    }).eq('id', activeBill.id)

    await logPaysamEvent(tuitionFeeId, 'destroyed', {
      bill_id: activeBill.bill_id,
      amount: fee.amount,
      note: result.code === '9980' ? 'PaysSam에 청구서 없음 (자동 파기)' : undefined,
    }, activeBill.id)

    return { success: true }
  }

  return result
}

// ============================================
// 청구서 재발송
// ============================================

export async function resendInvoice(tuitionFeeId: string) {
  const activeBill = await getActiveBill(tuitionFeeId)

  if (!activeBill) {
    return { success: false, error: '청구서 정보 없음' }
  }

  const result = await paysamRequest('/if/bill/resend', {
    bill_id: activeBill.bill_id,
  })

  if (result.success) {
    await logPaysamEvent(tuitionFeeId, 'resent', {
      bill_id: activeBill.bill_id,
    }, activeBill.id)
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
  const supabase = await createServerClient()

  // bill_id로 payssam_bills 조회
  const { data: bill, error } = await supabase
    .from('payssam_bills')
    .select('id, tuition_fee_id')
    .eq('bill_id', payload.bill_id)
    .single()

  if (error || !bill) {
    return { success: false, error: '청구서를 찾을 수 없습니다.', code: '9980' }
  }

  const status = STATUS_MAP[payload.appr_state] || STATUS_MAP.W
  const now = new Date().toISOString()

  // payssam_bills 업데이트
  const billUpdate: Record<string, any> = {
    request_status: status.requestStatus,
    payment_method: payload.appr_pay_type,
    transaction_id: payload.appr_num,
    last_sync_at: now,
    raw_response: payload,
  }

  if (payload.appr_state === 'F') {
    billUpdate.paid_at = payload.appr_dt ? parseApprDt(payload.appr_dt) : now
  } else if (payload.appr_state === 'C') {
    billUpdate.cancelled_at = now
  } else if (payload.appr_state === 'D') {
    billUpdate.destroyed_at = now
  }

  await supabase.from('payssam_bills').update(billUpdate).eq('id', bill.id)

  // tuition_fees payment_status 업데이트
  const feeUpdate: Record<string, any> = {}
  if (payload.appr_state === 'F') {
    feeUpdate.payment_status = '완납'
  } else if (payload.appr_state === 'C') {
    feeUpdate.payment_status = '미납'
  } else if (payload.appr_state === 'D') {
    feeUpdate.payment_status = '미납'
  }

  if (Object.keys(feeUpdate).length > 0) {
    await supabase.from('tuition_fees').update(feeUpdate).eq('id', bill.tuition_fee_id)
  }

  // 이벤트 로그
  const eventType: PaysSamEventType =
    payload.appr_state === 'F'
      ? 'payment_completed'
      : payload.appr_state === 'C'
        ? 'cancelled'
        : payload.appr_state === 'D'
          ? 'destroyed'
          : 'status_changed'

  await logPaysamEvent(bill.tuition_fee_id, eventType, payload, bill.id)

  return { success: true, tuitionFeeId: bill.tuition_fee_id }
}

// ============================================
// 이벤트 로깅
// ============================================

export async function logPaysamEvent(
  tuitionFeeId: string,
  eventType: PaysSamEventType,
  eventData: Record<string, any>,
  paysSamBillId?: string
) {
  const supabase = await createServerClient()

  await supabase.from('payssam_logs').insert({
    tuition_fee_id: tuitionFeeId,
    event_type: eventType,
    event_data: eventData,
    payssam_bill_id: paysSamBillId || null,
  })
}

// ============================================
// 유틸리티
// ============================================

/**
 * 청구 가능 여부 확인
 */
export function canSendInvoice(fee: { payment_status?: string; amount?: number }, activeBill: PaysSamBill | null): {
  canSend: boolean
  reason?: string
} {
  if (activeBill) {
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
export function canCancelPayment(activeBill: PaysSamBill | null): {
  canCancel: boolean
  reason?: string
} {
  if (!activeBill) {
    return { canCancel: false, reason: '발송된 청구서가 없습니다.' }
  }
  if (activeBill.request_status !== 'paid') {
    return { canCancel: false, reason: '결제 완료 건만 취소할 수 있습니다.' }
  }
  return { canCancel: true }
}

/**
 * 파기 가능 여부 확인
 */
export function canDestroyInvoice(activeBill: PaysSamBill | null): {
  canDestroy: boolean
  reason?: string
} {
  if (!activeBill) {
    return { canDestroy: false, reason: '발송된 청구서가 없습니다.' }
  }
  if (activeBill.request_status === 'paid') {
    return { canDestroy: false, reason: '결제 완료 건은 파기할 수 없습니다.' }
  }
  if (activeBill.request_status === 'destroyed') {
    return { canDestroy: false, reason: '이미 파기된 청구서입니다.' }
  }
  return { canDestroy: true }
}
