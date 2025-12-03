/**
 * 결제 취소 API
 * POST /api/payssam/cancel
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'
import { cancelPayment } from '@/services/payssam-service'
import { validateConfig } from '@/lib/payssam-client'

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

    // PaysSam 설정 확인
    const config = validateConfig()
    if (!config.valid) {
      return NextResponse.json(
        { success: false, error: `PaysSam 설정 오류: ${config.missing.join(', ')}` },
        { status: 500 }
      )
    }

    const body = await request.json()

    if (!body.tuitionFeeId) {
      return NextResponse.json(
        { success: false, error: 'tuitionFeeId가 필요합니다.' },
        { status: 400 }
      )
    }

    // 취소 가능 여부 확인
    const { data: fee } = await supabase
      .from('tuition_fees')
      .select('payssam_bill_id, payssam_request_status')
      .eq('id', body.tuitionFeeId)
      .single()

    if (!fee?.payssam_bill_id) {
      return NextResponse.json(
        { success: false, error: '발송된 청구서가 없습니다.' },
        { status: 400 }
      )
    }

    if (fee.payssam_request_status !== 'paid') {
      return NextResponse.json(
        { success: false, error: '결제 완료 건만 취소할 수 있습니다.' },
        { status: 400 }
      )
    }

    const result = await cancelPayment(body.tuitionFeeId)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: '결제가 취소되었습니다.',
      })
    }

    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 }
    )
  } catch (error) {
    console.error('PaysSam Cancel Error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
