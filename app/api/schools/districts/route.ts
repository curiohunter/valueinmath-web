import { type NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAuthForAPI } from '@/lib/auth/get-user'

/**
 * GET /api/schools/districts
 * 시도 및 시군구 목록 조회 API
 *
 * Query params:
 * - province: 시도명 (없으면 시도 목록 반환, 있으면 해당 시도의 시군구 목록 반환)
 */
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const authResult = await requireAuthForAPI()
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const searchParams = request.nextUrl.searchParams
    const province = searchParams.get('province')

    const supabase = getSupabaseAdmin()

    if (!province) {
      // 시도 목록 반환
      const { data, error } = await supabase
        .from('schools')
        .select('province')
        .eq('is_active', true)

      if (error) {
        console.error('시도 목록 조회 오류:', error)
        return NextResponse.json({ error: '시도 목록 조회 중 오류가 발생했습니다.' }, { status: 500 })
      }

      // 중복 제거 및 정렬
      const provinces = [...new Set(data.map((d) => d.province))].sort()

      // 주요 시도를 앞으로 정렬
      const majorProvinces = [
        '서울특별시',
        '경기도',
        '인천광역시',
        '부산광역시',
        '대구광역시',
        '대전광역시',
        '광주광역시',
        '울산광역시',
        '세종특별자치시',
      ]

      const sortedProvinces = [
        ...majorProvinces.filter((p) => provinces.includes(p)),
        ...provinces.filter((p) => !majorProvinces.includes(p)),
      ]

      return NextResponse.json({ provinces: sortedProvinces })
    }

    // 시군구 목록 반환
    const { data, error } = await supabase
      .from('schools')
      .select('district')
      .eq('province', province)
      .eq('is_active', true)
      .not('district', 'is', null)

    if (error) {
      console.error('시군구 목록 조회 오류:', error)
      return NextResponse.json({ error: '시군구 목록 조회 중 오류가 발생했습니다.' }, { status: 500 })
    }

    // 중복 제거 및 정렬
    const districts = [...new Set(data.map((d) => d.district).filter(Boolean))].sort() as string[]

    return NextResponse.json({ districts })
  } catch (error) {
    console.error('지역 API 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
