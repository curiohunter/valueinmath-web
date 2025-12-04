/**
 * 현장결제 완료 처리 API (DB만 업데이트 - PaysSam API 호출 없음)
 * POST /api/payssam/offline-payment
 *
 * PaysSam 앱에서 카드 리더기로 결제를 받은 후,
 * 해당 청구서를 완납 처리하는 API입니다.
 * 실제 결제는 PaysSam 앱에서 이루어지며, 이 API는 DB 상태만 업데이트합니다.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // 직원 권한 확인
    const { data: employee } = await supabase
      .from('employees')
      .select('id, status')
      .eq('auth_id', user.id)
      .eq('status', '재직')
      .single()

    if (!employee) {
      return NextResponse.json(
        { success: false, error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { tuitionFeeIds } = body

    if (!tuitionFeeIds || !Array.isArray(tuitionFeeIds) || tuitionFeeIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'tuitionFeeIds가 필요합니다.' },
        { status: 400 }
      )
    }

    // 현장결제 처리 대상 조회 (created 또는 sent 상태만)
    const { data: fees, error: fetchError } = await supabase
      .from('tuition_fees')
      .select('id, payssam_bill_id, payssam_request_status, amount, student_name_snapshot')
      .in('id', tuitionFeeIds)
      .in('payssam_request_status', ['created', 'sent'])

    if (fetchError || !fees) {
      return NextResponse.json(
        { success: false, error: '청구서 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    if (fees.length === 0) {
      return NextResponse.json(
        { success: false, error: '현장결제 처리할 수 있는 청구서가 없습니다.' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    let successCount = 0
    let failedCount = 0
    const results: Array<{
      tuitionFeeId: string
      studentName: string
      success: boolean
      error?: string
    }> = []

    for (const fee of fees) {
      // DB 업데이트 (완납 처리)
      const { error: updateError } = await supabase
        .from('tuition_fees')
        .update({
          payment_status: '완납',
          payssam_request_status: 'paid',
          payssam_paid_at: now,
          payssam_payment_method: 'OFFLINE', // 현장결제 표시
          payssam_last_sync_at: now,
        })
        .eq('id', fee.id)

      if (updateError) {
        failedCount++
        results.push({
          tuitionFeeId: fee.id,
          studentName: fee.student_name_snapshot || '알 수 없음',
          success: false,
          error: 'DB 업데이트 실패',
        })
        continue
      }

      // 이벤트 로그 기록
      await supabase.from('payssam_logs').insert({
        tuition_fee_id: fee.id,
        event_type: 'payment_completed',
        event_data: {
          bill_id: fee.payssam_bill_id,
          amount: fee.amount,
          payment_method: 'OFFLINE',
          processed_by: employee.id,
          note: '현장결제 완료 (PaysSam 앱에서 결제)',
        },
      })

      successCount++
      results.push({
        tuitionFeeId: fee.id,
        studentName: fee.student_name_snapshot || '알 수 없음',
        success: true,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        success: successCount,
        failed: failedCount,
        results,
      },
      message: `${successCount}건 현장결제 완료 처리, ${failedCount}건 실패`,
    })
  } catch (error) {
    console.error('Offline Payment Error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
