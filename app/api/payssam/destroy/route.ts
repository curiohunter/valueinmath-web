/**
 * 청구서 파기 API
 * POST /api/payssam/destroy
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'
import { destroyInvoice, getActiveBill } from '@/services/payssam-service'
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

    // 파기 가능 여부 확인 (payssam_bills 테이블)
    const activeBill = await getActiveBill(body.tuitionFeeId)

    if (!activeBill) {
      return NextResponse.json(
        { success: false, error: '발송된 청구서가 없습니다.' },
        { status: 400 }
      )
    }

    if (activeBill.request_status === 'paid') {
      return NextResponse.json(
        { success: false, error: '결제 완료 건은 파기할 수 없습니다. 취소를 진행해주세요.' },
        { status: 400 }
      )
    }

    if (activeBill.request_status === 'destroyed') {
      return NextResponse.json(
        { success: false, error: '이미 파기된 청구서입니다.' },
        { status: 400 }
      )
    }

    const result = await destroyInvoice(body.tuitionFeeId)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: '청구서가 파기되었습니다.',
      })
    }

    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 }
    )
  } catch (error) {
    console.error('PaysSam Destroy Error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
