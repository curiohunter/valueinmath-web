'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createBrowserClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

export async function getPublicTeachers() {
    const supabase = await createClient()

    const { data: teachers } = await supabase
        .from('employees')
        .select('*')
        .eq('is_public', true)
        .eq('status', '재직')
        .order('name')

    return teachers || []
}

export async function submitConsultationInquiry(data: {
    name: string
    parent_phone: string
    school_type?: string
    grade?: number
    notes?: string
}) {
    // 홈페이지 상담신청은 anon 클라이언트 사용 (로그인 세션 무시)
    const supabase = createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // 전화번호에서 하이픈 제거 (숫자만 남김)
    const cleanedPhone = data.parent_phone.replace(/[^0-9]/g, '')

    // 전화번호 형식 검증 (11자리 숫자)
    const phoneRegex = /^01[0-9]{9}$/
    if (!phoneRegex.test(cleanedPhone)) {
        throw new Error('올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)')
    }

    // 오늘 날짜 (KST)
    const today = new Date()
    const kstDate = new Date(today.getTime() + (9 * 60 * 60 * 1000))
        .toISOString()
        .split('T')[0]

    const insertData = {
        name: data.name,
        parent_phone: cleanedPhone,  // 하이픈 제거된 전화번호 저장
        school_type: data.school_type || null,
        grade: data.grade || null,
        notes: data.notes || null,
        status: '신규상담',
        lead_source: '홈페이지',
        created_by_type: 'self_service',
        first_contact_date: kstDate,
    }

    console.log('상담 신청 데이터:', insertData)

    const { data: student, error } = await supabase
        .from('students')
        .insert(insertData)
        .select()
        .single()

    if (error) {
        console.error('상담 신청 오류 상세:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        })
        throw new Error(`상담 신청 실패: ${error.message}`)
    }

    return { success: true, student }
}
