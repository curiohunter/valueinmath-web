/**
 * 승인동기화 Webhook API (핵심!)
 * POST /api/payssam/webhook
 *
 * 페이민트 서버에서 결제 완료/취소/파기 시 호출
 * 반드시 {"code": "0000", "msg": "성공하였습니다."} 형식으로 응답해야 함
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseApprDt } from '@/lib/payssam-client'
import type { PaysSamWebhookPayload, PaysSamApprState, PaysSamEventType } from '@/types/payssam'
import type { PaysSamRequestStatus } from '@/types/tuition'

// Webhook은 인증 없이 접근해야 하므로 서비스 롤 키 사용
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 상태 매핑
const STATUS_MAP: Record<PaysSamApprState, {
  paymentStatus: string
  requestStatus: PaysSamRequestStatus
}> = {
  F: { paymentStatus: '완납', requestStatus: 'paid' },
  W: { paymentStatus: '미납', requestStatus: 'sent' },
  C: { paymentStatus: '미납', requestStatus: 'cancelled' },
  D: { paymentStatus: '미납', requestStatus: 'destroyed' },
}

export async function POST(request: NextRequest) {
  console.log('🚨 [PaysSam Webhook] ===== WEBHOOK RECEIVED =====')
  console.log('[PaysSam Webhook] Request headers:', Object.fromEntries(request.headers))

  try {
    const body = await request.json() as PaysSamWebhookPayload

    console.log('[PaysSam Webhook] Payload:', JSON.stringify(body, null, 2))

    // 필수값 검증
    if (!body.bill_id || !body.appr_state) {
      console.error('[PaysSam Webhook] Missing required fields')
      return NextResponse.json({ code: '9999', msg: '필수값 누락' })
    }

    // bill_id로 payssam_bills 조회
    const { data: bill, error: fetchError } = await supabase
      .from('payssam_bills')
      .select('id, tuition_fee_id')
      .eq('bill_id', body.bill_id)
      .single()

    if (fetchError || !bill) {
      console.error('[PaysSam Webhook] Bill not found:', body.bill_id)
      return NextResponse.json({ code: '9980', msg: '청구서를 찾을 수 없습니다.' })
    }

    // 상태 매핑
    const status = STATUS_MAP[body.appr_state] || STATUS_MAP.W
    const now = new Date().toISOString()

    // payssam_bills 업데이트
    const billUpdate: Record<string, any> = {
      request_status: status.requestStatus,
      payment_method: body.appr_pay_type || null,
      transaction_id: body.appr_num || null,
      last_sync_at: now,
      raw_response: body,
    }

    if (body.appr_state === 'F') {
      billUpdate.paid_at = body.appr_dt ? parseApprDt(body.appr_dt) : now
    } else if (body.appr_state === 'C') {
      billUpdate.cancelled_at = now
    } else if (body.appr_state === 'D') {
      billUpdate.destroyed_at = now
    }

    const { error: billUpdateError } = await supabase
      .from('payssam_bills')
      .update(billUpdate)
      .eq('id', bill.id)

    if (billUpdateError) {
      console.error('[PaysSam Webhook] Bill update error:', billUpdateError)
      return NextResponse.json({ code: '9999', msg: 'DB 업데이트 실패' })
    }

    // tuition_fees payment_status 업데이트
    if (body.appr_state === 'F' || body.appr_state === 'C' || body.appr_state === 'D') {
      await supabase
        .from('tuition_fees')
        .update({ payment_status: status.paymentStatus })
        .eq('id', bill.tuition_fee_id)
    }

    // 이벤트 로그 기록
    const eventType: PaysSamEventType =
      body.appr_state === 'F' ? 'payment_completed' :
      body.appr_state === 'C' ? 'cancelled' :
      body.appr_state === 'D' ? 'destroyed' : 'status_changed'

    await supabase.from('payssam_logs').insert({
      tuition_fee_id: bill.tuition_fee_id,
      event_type: eventType,
      event_data: body,
      payssam_bill_id: bill.id,
    })

    console.log(`[PaysSam Webhook] Success: ${body.bill_id} -> ${body.appr_state}`)

    // ⚠️ 반드시 이 형식으로 응답!
    return NextResponse.json({ code: '0000', msg: '성공하였습니다.' })
  } catch (error) {
    console.error('[PaysSam Webhook] Error:', error)
    return NextResponse.json({ code: '9999', msg: '서버 오류' })
  }
}

// OPTIONS 요청 처리 (CORS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
