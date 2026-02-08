/**
 * 청구서 생성 API (PaysSam API 호출)
 * POST /api/payssam/create
 *
 * 1단계 워크플로우:
 * - PaysSam /if/bill/send API 호출
 * - 결제선생 앱에 청구서 등록 + 카카오톡 발송
 * - 상태: pending → sent
 *
 * PaysSam에서 "발송"이 곧 "등록"입니다.
 * 발송 후 결제선생 앱에서 현장결제 가능.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'
import { createInvoice, createInvoicesBulk, getActiveBill } from '@/services/payssam-service'

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

    // 일괄 생성
    if (body.tuitionFeeIds && Array.isArray(body.tuitionFeeIds)) {
      const result = await createInvoicesBulk(body.tuitionFeeIds)
      return NextResponse.json({
        success: true,
        data: result,
        message: `${result.success}건 생성 완료, ${result.failed}건 실패`,
      })
    }

    // 단건 생성
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
          { success: false, error: '이미 청구서가 존재합니다.' },
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

      const result = await createInvoice({
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
          data: {
            billId: result.billId,
            shortURL: result.shortURL,
          },
          message: '청구서가 발송되었습니다. 결제선생 앱에서 현장결제 가능합니다.',
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
    console.error('PaysSam Create Error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
