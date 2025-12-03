/**
 * 결제 상태 조회 API
 * POST /api/payssam/status
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'
import { getPaymentStatus, syncPaymentStatus } from '@/services/payssam-service'
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

    // bill_id로 직접 조회
    if (body.billId) {
      const result = await getPaymentStatus(body.billId)
      return NextResponse.json({
        success: result.success,
        data: result.data,
        error: result.error,
      })
    }

    // tuitionFeeId로 조회 및 DB 동기화
    if (body.tuitionFeeId) {
      const result = await syncPaymentStatus(body.tuitionFeeId)
      return NextResponse.json({
        success: result.success,
        data: result.data,
        error: result.error,
        message: result.success ? '동기화 완료' : undefined,
      })
    }

    // 일괄 동기화
    if (body.tuitionFeeIds && Array.isArray(body.tuitionFeeIds)) {
      const results = await Promise.all(
        body.tuitionFeeIds.map((id: string) => syncPaymentStatus(id))
      )

      const success = results.filter((r) => r.success).length
      const failed = results.filter((r) => !r.success).length

      return NextResponse.json({
        success: true,
        data: { success, failed },
        message: `${success}건 동기화 완료, ${failed}건 실패`,
      })
    }

    return NextResponse.json(
      { success: false, error: 'billId, tuitionFeeId 또는 tuitionFeeIds가 필요합니다.' },
      { status: 400 }
    )
  } catch (error) {
    console.error('PaysSam Status Error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
