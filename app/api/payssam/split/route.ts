/**
 * 분할 청구 API
 * POST /api/payssam/split
 *
 * 원본 청구서를 파기하고 분할된 금액으로 새 청구서들을 생성
 *
 * 요청:
 * {
 *   tuitionFeeId: string,  // 원본 학원비 ID
 *   amounts: number[]      // 분할 금액 배열 (예: [200000, 300000])
 * }
 *
 * 처리:
 * 1. 원본 청구서가 'sent' 상태면 PaysSam API로 파기
 * 2. 원본 tuition_fee는 유지 (parent)
 * 3. 분할 건들은 새로 생성 (child, parent_id 연결)
 * 4. 분할 건들은 'pending' 상태로 생성 (발송 전)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'
import { destroyInvoice, getActiveBill } from '@/services/payssam-service'

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
    const { tuitionFeeId, amounts } = body

    // 입력 검증
    if (!tuitionFeeId) {
      return NextResponse.json(
        { success: false, error: 'tuitionFeeId가 필요합니다.' },
        { status: 400 }
      )
    }

    if (!amounts || !Array.isArray(amounts) || amounts.length < 2) {
      return NextResponse.json(
        { success: false, error: '분할 금액은 최소 2개 이상이어야 합니다.' },
        { status: 400 }
      )
    }

    if (amounts.some(a => typeof a !== 'number' || a < 10000)) {
      return NextResponse.json(
        { success: false, error: '각 분할 금액은 최소 10,000원 이상이어야 합니다.' },
        { status: 400 }
      )
    }

    // 원본 청구서 조회
    const { data: originalFee, error: feeError } = await supabase
      .from('tuition_fees')
      .select('*')
      .eq('id', tuitionFeeId)
      .single()

    if (feeError || !originalFee) {
      return NextResponse.json(
        { success: false, error: '원본 청구서를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 금액 검증
    const totalSplitAmount = amounts.reduce((sum, a) => sum + a, 0)
    if (totalSplitAmount !== originalFee.amount) {
      return NextResponse.json(
        { success: false, error: `분할 금액 합계(${totalSplitAmount})가 원금(${originalFee.amount})과 일치하지 않습니다.` },
        { status: 400 }
      )
    }

    // 이미 완납된 경우
    if (originalFee.payment_status === '완납') {
      return NextResponse.json(
        { success: false, error: '이미 완납된 청구서는 분할할 수 없습니다.' },
        { status: 400 }
      )
    }

    // 이미 분할된 청구서인 경우
    if (originalFee.is_split_child) {
      return NextResponse.json(
        { success: false, error: '이미 분할된 청구서입니다.' },
        { status: 400 }
      )
    }

    // 활성 청구서가 있으면 먼저 파기
    const activeBill = await getActiveBill(tuitionFeeId)
    if (activeBill && activeBill.request_status === 'sent') {
      const destroyResult = await destroyInvoice(tuitionFeeId)
      if (!destroyResult.success) {
        return NextResponse.json(
          { success: false, error: `원본 청구서 파기 실패: ${destroyResult.error}` },
          { status: 400 }
        )
      }
    }

    // 원본 청구서 상태 업데이트 (분할 부모로 표시)
    const now = new Date().toISOString()
    await supabase
      .from('tuition_fees')
      .update({
        payment_status: '분할청구',
        note: `분할 청구됨 (${amounts.length}건): ${originalFee.note || ''}`.trim(),
        updated_at: now,
      })
      .eq('id', tuitionFeeId)

    // 분할 청구서 생성
    const splitFees = amounts.map((amount, index) => ({
      // 원본에서 복사
      student_id: originalFee.student_id,
      class_id: originalFee.class_id,
      year: originalFee.year,
      month: originalFee.month,
      class_type: originalFee.class_type,
      is_sibling: originalFee.is_sibling,
      period_start_date: originalFee.period_start_date,
      period_end_date: originalFee.period_end_date,
      student_name_snapshot: originalFee.student_name_snapshot,
      class_name_snapshot: originalFee.class_name_snapshot,
      // 분할 전용
      amount,
      payment_status: '미납',
      note: `분할 ${index + 1}/${amounts.length} (원본: ${originalFee.amount.toLocaleString()}원)`,
      parent_tuition_fee_id: tuitionFeeId,
      is_split_child: true,
      created_at: now,
      updated_at: now,
    }))

    const { data: createdFees, error: createError } = await supabase
      .from('tuition_fees')
      .insert(splitFees)
      .select('id, amount')

    if (createError) {
      console.error('분할 청구서 생성 오류:', createError)
      return NextResponse.json(
        { success: false, error: '분할 청구서 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        originalId: tuitionFeeId,
        splitCount: amounts.length,
        splitFees: createdFees,
      },
      message: `${amounts.length}건의 분할 청구서가 생성되었습니다.`,
    })
  } catch (error) {
    console.error('분할 청구 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
