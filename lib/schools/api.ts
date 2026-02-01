/**
 * 학교 조회 API 함수들
 */

import { createClient } from '@/lib/supabase/client'

export interface School {
  id: string
  code: string
  name: string
  name_en: string | null
  school_type: string
  province: string
  district: string | null
  address: string | null
  phone: string | null
  website: string | null
  coed_type: string | null
  foundation_type: string | null
  high_school_type: string | null
}

export interface SchoolSearchParams {
  query?: string
  province?: string
  district?: string
  schoolType?: string
  limit?: number
}

/**
 * 시/도 목록 조회
 */
export async function getProvinces(): Promise<string[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('schools')
    .select('province')
    .order('province')

  if (error) throw error

  // 중복 제거
  const provinces = [...new Set(data.map((d) => d.province))]
  return provinces
}

/**
 * 시/군/구 목록 조회 (시도 기준)
 */
export async function getDistricts(province: string): Promise<string[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('schools')
    .select('district')
    .eq('province', province)
    .not('district', 'is', null)
    .order('district')

  if (error) throw error

  // 중복 제거 및 null 필터링
  const districts = [...new Set(data.map((d) => d.district).filter(Boolean))] as string[]
  return districts
}

/**
 * 학교 검색
 */
export async function searchSchools(params: SchoolSearchParams): Promise<School[]> {
  const supabase = createClient()
  const { query, province, district, schoolType, limit = 50 } = params

  let queryBuilder = supabase
    .from('schools')
    .select('id, code, name, name_en, school_type, province, district, address, phone, website, coed_type, foundation_type, high_school_type')
    .eq('is_active', true)

  // 검색어 필터
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

  if (error) throw error

  return data as School[]
}

/**
 * 학교 ID로 조회
 */
export async function getSchoolById(id: string): Promise<School | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('schools')
    .select('id, code, name, name_en, school_type, province, district, address, phone, website, coed_type, foundation_type, high_school_type')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }

  return data as School
}

/**
 * 학교 유형 목록
 */
export const SCHOOL_TYPES = [
  '초등학교',
  '중학교',
  '고등학교',
  '특수학교',
] as const

/**
 * 주요 시도 목록 (자주 사용되는 순서)
 */
export const MAJOR_PROVINCES = [
  '서울특별시',
  '경기도',
  '인천광역시',
  '부산광역시',
  '대구광역시',
  '대전광역시',
  '광주광역시',
  '울산광역시',
  '세종특별자치시',
  '강원특별자치도',
  '충청북도',
  '충청남도',
  '전북특별자치도',
  '전라남도',
  '경상북도',
  '경상남도',
  '제주특별자치도',
] as const
