/**
 * 쌤포인트 잔액 조회 API
 * GET /api/payssam/balance
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'
import { getPointBalance } from '@/services/payssam-service'
import { validateConfig, getConfigInfo } from '@/lib/payssam-client'

export async function GET(request: NextRequest) {
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

    const result = await getPointBalance()

    if (result.success) {
      const configInfo = getConfigInfo()
      // 운영: info.remain_count, 테스트: remain_count
      const balance = result.data?.info?.remain_count || result.data?.remain_count || '0'
      return NextResponse.json({
        success: true,
        data: {
          balance: String(balance),
          config: {
            environment: configInfo.isProduction ? '운영' : '개발',
            member: configInfo.member,
            merchant: configInfo.merchant,
          },
        },
      })
    }

    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 }
    )
  } catch (error) {
    console.error('PaysSam Balance Error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
