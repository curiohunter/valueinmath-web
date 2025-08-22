import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/auth/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // 권한 확인 (admin만 실행 가능하도록)
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: "Admin permission required" },
        { status: 403 }
      )
    }

    // 백필할 기간 설정 (과거 12개월)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 12)

    const results = []
    let currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1

      // 이미 해당 월 데이터가 있는지 확인
      const { data: existingStats } = await supabase
        .from('academy_monthly_stats')
        .select('*')
        .eq('year', year)
        .eq('month', month)
        .single()

      if (existingStats) {
        results.push({
          year,
          month,
          status: 'skipped',
          message: '이미 데이터가 존재합니다'
        })
        currentDate.setMonth(currentDate.getMonth() + 1)
        continue
      }

      // 월간 범위 계산
      const monthStart = new Date(year, month - 1, 1, -9, 0, 0).toISOString()
      const monthEnd = new Date(year, month, 0, 14, 59, 59).toISOString()
      
      // 작년 동월 범위 (YoY용)
      const lastYear = year - 1
      const lastYearMonthStart = new Date(lastYear, month - 1, 1, -9, 0, 0).toISOString()
      const lastYearMonthEnd = new Date(lastYear, month, 0, 14, 59, 59).toISOString()

      // 1. 재원생 통계
      // 재원생 = 해당월에 활동한 모든 학생
      // (현재 재원 OR 퇴원했지만 해당월 이후 퇴원)
      const currentDate = new Date()
      const isCurrentMonth = year === currentDate.getFullYear() && 
                            month === currentDate.getMonth() + 1
      
      let activeStudents
      if (isCurrentMonth) {
        // 현재월은 status = '재원'인 학생만
        const { data } = await supabase
          .from('students')
          .select('*')
          .eq('status', '재원')
        activeStudents = data
      } else {
        // 과거월은 해당월에 활동한 모든 학생
        const { data: currentActive } = await supabase
          .from('students')
          .select('*')
          .eq('status', '재원')
          .lte('start_date', monthEnd)
        
        const { data: withdrawnAfter } = await supabase
          .from('students')
          .select('*')
          .eq('status', '퇴원')
          .lte('start_date', monthEnd)
          .gte('end_date', monthStart)
        
        activeStudents = [...(currentActive || []), ...(withdrawnAfter || [])]
      }

      // 부서별 재원생 분류
      const activeStudentsByDept: Record<string, number> = {}
      let activeStudentsTotal = 0
      
      activeStudents?.forEach(student => {
        const dept = student.department || '미분류'
        activeStudentsByDept[dept] = (activeStudentsByDept[dept] || 0) + 1
        activeStudentsTotal++
      })

      // 2. 신규상담 통계
      const { data: consultations } = await supabase
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

      // 작년 동월 신규상담 (YoY)
      const { data: lastYearConsultations } = await supabase
        .from('students')
        .select('*')
        .gte('first_contact_date', lastYearMonthStart)
        .lt('first_contact_date', lastYearMonthEnd)

      const consultationsYoY = lastYearConsultations && lastYearConsultations.length > 0
        ? ((consultationsTotal - lastYearConsultations.length) / lastYearConsultations.length * 100)
        : 0

      // 3. 입학테스트 통계
      const { data: entranceTests } = await supabase
        .from('entrance_tests')
        .select(`
          *,
          students!consultation_id (
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

      const testConversionRate = consultationsTotal > 0
        ? (testsTotal / consultationsTotal * 100)
        : 0

      // 4. 신규등원 통계
      const { data: newEnrollments } = await supabase
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

      const enrollmentConversionRate = consultationsTotal > 0
        ? (enrollmentsTotal / consultationsTotal * 100)
        : 0

      // 5. 퇴원 통계
      const { data: withdrawals } = await supabase
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

      // 작년 동월 퇴원 (YoY)
      const { data: lastYearWithdrawals } = await supabase
        .from('students')
        .select('*')
        .gte('end_date', lastYearMonthStart)
        .lt('end_date', lastYearMonthEnd)
        .eq('status', '퇴원')

      const withdrawalsYoY = lastYearWithdrawals && lastYearWithdrawals.length > 0
        ? ((withdrawalsTotal - lastYearWithdrawals.length) / lastYearWithdrawals.length * 100)
        : 0

      // 지난달 재원생 수 조회 (MoM)
      const lastMonth = month === 1 ? 12 : month - 1
      const lastMonthYear = month === 1 ? year - 1 : year
      
      const { data: lastMonthStats } = await supabase
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

      const { error: insertError } = await supabase
        .from('academy_monthly_stats')
        .insert(statsData)

      if (insertError) {
        results.push({
          year,
          month,
          status: 'error',
          message: insertError.message
        })
      } else {
        results.push({
          year,
          month,
          status: 'success',
          data: statsData
        })
      }

      // 다음 달로 이동
      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    return NextResponse.json({
      message: '백필 작업 완료',
      results
    })

  } catch (error) {
    console.error('백필 작업 실패:', error)
    return NextResponse.json(
      { error: '백필 작업 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}