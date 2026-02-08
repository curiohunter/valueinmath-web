/**
 * 청구서 발송 API
 * POST /api/payssam/send
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'
import { sendInvoice, sendInvoicesBulk, getActiveBill } from '@/services/payssam-service'
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

    // 일괄 발송
    if (body.tuitionFeeIds && Array.isArray(body.tuitionFeeIds)) {
      const result = await sendInvoicesBulk(body.tuitionFeeIds)
      return NextResponse.json({
        success: true,
        data: result,
        message: `${result.success}건 발송 완료, ${result.failed}건 실패`,
      })
    }

    // 단건 발송
    if (body.tuitionFeeId) {
      // 청구 대상 조회
      const { data: fee, error: feeError } = await supabase
        .from('tuition_fees')
        .select(`
          id,
          amount,
          year,
          month,
          student_name_snapshot,
          class_name_snapshot,
          students!inner(
            id,
            name,
            payment_phone,
            parent_phone
          )
        `)
        .eq('id', body.tuitionFeeId)
        .single()

      if (feeError || !fee) {
        return NextResponse.json(
          { success: false, error: '청구 대상을 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      // 활성 청구서 존재 여부 확인 (payssam_bills 테이블)
      const activeBill = await getActiveBill(body.tuitionFeeId)
      if (activeBill) {
        return NextResponse.json(
          { success: false, error: '이미 청구서가 발송되었습니다.' },
          { status: 400 }
        )
      }

      const student = fee.students as any
      // payment_phone 우선, 없으면 parent_phone 사용
      const phone = student?.payment_phone || student?.parent_phone
      if (!phone) {
        return NextResponse.json(
          { success: false, error: '청구용 전화번호가 없습니다.' },
          { status: 400 }
        )
      }

      const result = await sendInvoice({
        tuitionFeeId: fee.id,
        studentName: fee.student_name_snapshot || student.name,
        parentPhone: phone,
        amount: fee.amount,
        productName: `${fee.class_name_snapshot || '수업료'} (${fee.year}년 ${fee.month}월)`,
        expireYear: fee.year,
        expireMonth: fee.month,
      })

      if (result.success) {
        return NextResponse.json({
          success: true,
          data: { billId: result.billId },
          message: '청구서가 발송되었습니다.',
        })
      }

      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'tuitionFeeId 또는 tuitionFeeIds가 필요합니다.' },
      { status: 400 }
    )
  } catch (error) {
    console.error('PaysSam Send Error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
