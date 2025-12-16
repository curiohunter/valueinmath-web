import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Supabase 클라이언트 초기화
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 현재 날짜 (한국 시간 기준)
    const now = new Date()
    const koreanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000))
    const year = koreanTime.getFullYear()
    const month = koreanTime.getMonth() + 1

    // 이미 이번 달 데이터가 수집되었는지 확인
    const { data: existingStats } = await supabaseClient
      .from('academy_monthly_stats')
      .select('*')
      .eq('year', year)
      .eq('month', month)
      .single()

    if (existingStats) {
      return new Response(
        JSON.stringify({ message: '이번 달 통계가 이미 수집되었습니다.', data: existingStats }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // 월간 범위 계산 (한국시간 기준)
    const monthStart = new Date(year, month - 1, 1, -9, 0, 0).toISOString()
    const monthEnd = new Date(year, month, 0, 14, 59, 59).toISOString()
    
    // 작년 동월 범위 계산 (YoY 비교용)
    const lastYear = year - 1
    const lastYearMonthStart = new Date(lastYear, month - 1, 1, -9, 0, 0).toISOString()
    const lastYearMonthEnd = new Date(lastYear, month, 0, 14, 59, 59).toISOString()
    
    // 지난달 범위 계산 (MoM 비교용)
    const lastMonth = month === 1 ? 12 : month - 1
    const lastMonthYear = month === 1 ? year - 1 : year

    // 1. 재원생 통계
    const { data: activeStudents } = await supabaseClient
      .from('students')
      .select('*')
      .eq('status', '재원')

    // 부서별 재원생 분류
    const activeStudentsByDept: Record<string, number> = {}
    let activeStudentsTotal = 0
    
    activeStudents?.forEach(student => {
      const dept = student.department || '미분류'
      activeStudentsByDept[dept] = (activeStudentsByDept[dept] || 0) + 1
      activeStudentsTotal++
    })

    // 2. 신규상담 통계
    const { data: consultations } = await supabaseClient
      .from('students')
      .select('*')
      .gte('first_contact_date', monthStart)
      .lt('first_contact_date', monthEnd)

    const consultationsByDept: Record<string, number> = {}
    let consultationsTotal = 0
    
    consultations?.forEach(consultation => {
      const dept = consultation.department || '미분류'
      consultationsByDept[dept] = (consultationsByDept[dept] || 0) + 1
      consultationsTotal++
    })

    // 작년 동월 신규상담 (YoY 계산)
    const { data: lastYearConsultations } = await supabaseClient
      .from('students')
      .select('*')
      .gte('first_contact_date', lastYearMonthStart)
      .lt('first_contact_date', lastYearMonthEnd)

    const consultationsYoY = lastYearConsultations && lastYearConsultations.length > 0
      ? ((consultationsTotal - lastYearConsultations.length) / lastYearConsultations.length * 100)
      : 0

    // 3. 입학테스트 통계
    const { data: entranceTests } = await supabaseClient
      .from('entrance_tests')
      .select(`
        *,
        students!student_id (
          department
        )
      `)
      .gte('test_date', monthStart)
      .lt('test_date', monthEnd)

    const testsByDept: Record<string, number> = {}
    let testsTotal = 0
    
    entranceTests?.forEach(test => {
      const student = test.students as any
      const dept = student?.department || '미분류'
      testsByDept[dept] = (testsByDept[dept] || 0) + 1
      testsTotal++
    })

    // 테스트 전환율 계산
    const testConversionRate = consultationsTotal > 0
      ? (testsTotal / consultationsTotal * 100)
      : 0

    // 4. 신규등원 통계
    const { data: newEnrollments } = await supabaseClient
      .from('students')
      .select('*')
      .gte('start_date', monthStart)
      .lt('start_date', monthEnd)
      .eq('status', '재원')

    const enrollmentsByDept: Record<string, number> = {}
    let enrollmentsTotal = 0
    
    newEnrollments?.forEach(enrollment => {
      const dept = enrollment.department || '미분류'
      enrollmentsByDept[dept] = (enrollmentsByDept[dept] || 0) + 1
      enrollmentsTotal++
    })

    // 등원 전환율 계산
    const enrollmentConversionRate = consultationsTotal > 0
      ? (enrollmentsTotal / consultationsTotal * 100)
      : 0

    // 5. 퇴원 통계
    const { data: withdrawals } = await supabaseClient
      .from('students')
      .select('*')
      .gte('end_date', monthStart)
      .lt('end_date', monthEnd)
      .eq('status', '퇴원')

    const withdrawalsByDept: Record<string, number> = {}
    let withdrawalsTotal = 0
    
    withdrawals?.forEach(withdrawal => {
      const dept = withdrawal.department || '미분류'
      withdrawalsByDept[dept] = (withdrawalsByDept[dept] || 0) + 1
      withdrawalsTotal++
    })

    // 작년 동월 퇴원 (YoY 계산)
    const { data: lastYearWithdrawals } = await supabaseClient
      .from('students')
      .select('*')
      .gte('end_date', lastYearMonthStart)
      .lt('end_date', lastYearMonthEnd)
      .eq('status', '퇴원')

    const withdrawalsYoY = lastYearWithdrawals && lastYearWithdrawals.length > 0
      ? ((withdrawalsTotal - lastYearWithdrawals.length) / lastYearWithdrawals.length * 100)
      : 0

    // 지난달 재원생 수 조회 (MoM 계산)
    const { data: lastMonthStats } = await supabaseClient
      .from('academy_monthly_stats')
      .select('active_students_total')
      .eq('year', lastMonthYear)
      .eq('month', lastMonth)
      .single()

    const activeStudentsMoM = lastMonthStats?.active_students_total
      ? ((activeStudentsTotal - lastMonthStats.active_students_total) / lastMonthStats.active_students_total * 100)
      : 0

    // 통계 저장
    const statsData = {
      year,
      month,
      active_students_total: activeStudentsTotal,
      active_students_by_dept: activeStudentsByDept,
      active_students_mom_change: activeStudentsMoM,
      consultations_total: consultationsTotal,
      consultations_by_dept: consultationsByDept,
      consultations_yoy_change: consultationsYoY,
      entrance_tests_total: testsTotal,
      entrance_tests_by_dept: testsByDept,
      test_conversion_rate: testConversionRate,
      new_enrollments_total: enrollmentsTotal,
      new_enrollments_by_dept: enrollmentsByDept,
      enrollment_conversion_rate: enrollmentConversionRate,
      withdrawals_total: withdrawalsTotal,
      withdrawals_by_dept: withdrawalsByDept,
      withdrawals_yoy_change: withdrawalsYoY,
      collected_at: new Date().toISOString()
    }

    const { data: insertedStats, error } = await supabaseClient
      .from('academy_monthly_stats')
      .insert(statsData)
      .select()
      .single()

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ 
        message: '월별 통계가 성공적으로 수집되었습니다.',
        data: insertedStats 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})