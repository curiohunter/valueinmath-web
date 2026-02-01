import { type NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAuthForAPI } from '@/lib/auth/get-user'

/**
 * GET /api/schools
 * 학교 검색 API
 *
 * Query params:
 * - q: 검색어 (학교명)
 * - province: 시도명
 * - district: 시군구명
 * - type: 학교 유형 (초등학교, 중학교, 고등학교)
 * - limit: 결과 개수 (기본 50)
 */
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const authResult = await requireAuthForAPI()
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const province = searchParams.get('province') || ''
    const district = searchParams.get('district') || ''
    const schoolType = searchParams.get('type') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    const supabase = getSupabaseAdmin()

    let queryBuilder = supabase
      .from('schools')
      .select('id, code, name, name_en, school_type, province, district, address, phone, website, coed_type, foundation_type, high_school_type')
      .eq('is_active', true)

    // 검색어 필터 (학교명)
    if (query) {
      queryBuilder = queryBuilder.ilike('name', `%${query}%`)
    }

    // 시도 필터
    if (province) {
      queryBuilder = queryBuilder.eq('province', province)
    }

    // 시군구 필터
    if (district) {
      queryBuilder = queryBuilder.eq('district', district)
    }

    // 학교 유형 필터
    if (schoolType) {
      queryBuilder = queryBuilder.eq('school_type', schoolType)
    }

    const { data, error } = await queryBuilder
      .order('name')
      .limit(limit)

    if (error) {
      console.error('학교 검색 오류:', error)
      return NextResponse.json({ error: '학교 검색 중 오류가 발생했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ schools: data })
  } catch (error) {
    console.error('학교 API 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
