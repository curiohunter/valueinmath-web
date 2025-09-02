'use server'

import { createServerClient } from "@/lib/auth/server"

export async function saveMonthlySnapshot() {
  const supabase = await createServerClient()
  
  // 현재 날짜 가져오기
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const day = now.getDate()
  
  // 월말이 아니면 스킵 (27일 이후부터 저장 가능)
  if (day < 27) {
    return { success: false, message: '월말이 아닙니다 (27일 이후 저장 가능)' }
  }
  
  try {
    // 재적 학생 조회
    const { data: activeStudents } = await supabase
      .from('students')
      .select('id, name, department_id, departments!inner(name)')
      .eq('status', '재적')
    
    // 상담 조회 (이번 달)
    const startDate = new Date(year, month - 1, 1).toISOString()
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString()
    
    const { data: consultations } = await supabase
      .from('students')
      .select('id, name, department_id, departments!inner(name), first_contact_date')
      .gte('first_contact_date', startDate)
      .lte('first_contact_date', endDate)
      .eq('status', '신규상담')
    
    // 입학테스트 조회
    const { data: entranceTests } = await supabase
      .from('entrance_tests')
      .select(`
        id,
        consultation_id,
        test_date,
        students!inner(
          id, 
          name, 
          department_id,
          departments!inner(name)
        )
      `)
      .gte('test_date', startDate)
      .lte('test_date', endDate)
    
    // 신규 등록 조회 (이번 달 등록한 학생)
    const { data: newEnrollments } = await supabase
      .from('students')
      .select('id, name, department_id, departments!inner(name), enrollment_date')
      .gte('enrollment_date', startDate)
      .lte('enrollment_date', endDate)
      .in('status', ['재적', '휴원'])
    
    // 퇴원 조회
    const { data: withdrawals } = await supabase
      .from('students')
      .select('id, name, department_id, departments!inner(name), withdrawal_date')
      .gte('withdrawal_date', startDate)
      .lte('withdrawal_date', endDate)
      .eq('status', '퇴원')
    
    // 부서별 집계
    const activeByDept: Record<string, number> = {}
    const consultByDept: Record<string, number> = {}
    const testByDept: Record<string, number> = {}
    const enrollByDept: Record<string, number> = {}
    const withdrawByDept: Record<string, number> = {}
    
    // 재적 학생 부서별 집계
    activeStudents?.forEach(student => {
      const deptName = student.departments?.name || '미지정'
      activeByDept[deptName] = (activeByDept[deptName] || 0) + 1
    })
    
    // 상담 부서별 집계
    consultations?.forEach(student => {
      const deptName = student.departments?.name || '미지정'
      consultByDept[deptName] = (consultByDept[deptName] || 0) + 1
    })
    
    // 입학테스트 부서별 집계
    entranceTests?.forEach(test => {
      // @ts-ignore
      const deptName = test.students?.departments?.name || '미지정'
      testByDept[deptName] = (testByDept[deptName] || 0) + 1
    })
    
    // 신규등록 부서별 집계
    newEnrollments?.forEach(student => {
      const deptName = student.departments?.name || '미지정'
      enrollByDept[deptName] = (enrollByDept[deptName] || 0) + 1
    })
    
    // 퇴원 부서별 집계
    withdrawals?.forEach(student => {
      const deptName = student.departments?.name || '미지정'
      withdrawByDept[deptName] = (withdrawByDept[deptName] || 0) + 1
    })
    
    // 지난달 데이터로 MoM 계산
    const lastMonth = month === 1 ? 12 : month - 1
    const lastMonthYear = month === 1 ? year - 1 : year
    const { data: lastMonthData } = await supabase
      .from('academy_monthly_stats')
      .select('active_students_total')
      .eq('year', lastMonthYear)
      .eq('month', lastMonth)
      .single()
    
    const momChange = lastMonthData?.active_students_total 
      ? ((activeStudents?.length || 0) - lastMonthData.active_students_total) / lastMonthData.active_students_total * 100
      : 0
    
    // 작년 같은 달 데이터로 YoY 계산
    const lastYearData = await supabase
      .from('academy_monthly_stats')
      .select('consultations_total, withdrawals_total')
      .eq('year', year - 1)
      .eq('month', month)
      .single()
    
    const consultYoyChange = lastYearData?.data?.consultations_total
      ? ((consultations?.length || 0) - lastYearData.data.consultations_total) / lastYearData.data.consultations_total * 100
      : 0
      
    const withdrawYoyChange = lastYearData?.data?.withdrawals_total
      ? ((withdrawals?.length || 0) - lastYearData.data.withdrawals_total) / lastYearData.data.withdrawals_total * 100
      : 0
    
    // 데이터 저장 (upsert: 있으면 업데이트, 없으면 삽입)
    const { error } = await supabase
      .from('academy_monthly_stats')
      .upsert({
        year,
        month,
        active_students_total: activeStudents?.length || 0,
        active_students_by_dept: activeByDept,
        active_students_mom_change: momChange,
        consultations_total: consultations?.length || 0,
        consultations_by_dept: consultByDept,
        consultations_yoy_change: consultYoyChange,
        entrance_tests_total: entranceTests?.length || 0,
        entrance_tests_by_dept: testByDept,
        test_conversion_rate: consultations?.length 
          ? (entranceTests?.length || 0) / consultations.length * 100 
          : 0,
        new_enrollments_total: newEnrollments?.length || 0,
        new_enrollments_by_dept: enrollByDept,
        enrollment_conversion_rate: consultations?.length 
          ? (newEnrollments?.length || 0) / consultations.length * 100 
          : 0,
        withdrawals_total: withdrawals?.length || 0,
        withdrawals_by_dept: withdrawByDept,
        withdrawals_yoy_change: withdrawYoyChange,
        collected_at: now.toISOString()
      }, {
        onConflict: 'year,month'  // year, month 조합이 같으면 업데이트
      })
    
    if (error) {
      console.error('월말 스냅샷 저장 실패:', error)
      return { success: false, message: error.message }
    }
    
    return { success: true, message: `${year}년 ${month}월 데이터가 저장되었습니다` }
    
  } catch (error) {
    console.error('월말 스냅샷 처리 중 오류:', error)
    return { success: false, message: '처리 중 오류가 발생했습니다' }
  }
}

// 수동으로 특정 월 데이터 수집
export async function collectMonthlySnapshot(targetYear: number, targetMonth: number) {
  const supabase = await createServerClient()
  
  try {
    // 해당 월의 시작일과 종료일
    const startDate = new Date(targetYear, targetMonth - 1, 1).toISOString()
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59).toISOString()
    
    // 재적 학생 조회 (해당 월 말 기준)
    const { data: activeStudents } = await supabase
      .from('students')
      .select('id, name, department_id, departments!inner(name), enrollment_date')
      .lte('enrollment_date', endDate)
      .or(`withdrawal_date.is.null,withdrawal_date.gt.${endDate}`)
      .in('status', ['재적', '휴원'])
    
    // 상담 조회
    const { data: consultations } = await supabase
      .from('students')
      .select('id, name, department_id, departments!inner(name), first_contact_date')
      .gte('first_contact_date', startDate)
      .lte('first_contact_date', endDate)
    
    // 입학테스트 조회
    const { data: entranceTests } = await supabase
      .from('entrance_tests')
      .select(`
        id,
        consultation_id,
        test_date,
        students!inner(
          id, 
          name, 
          department_id,
          departments!inner(name)
        )
      `)
      .gte('test_date', startDate)
      .lte('test_date', endDate)
    
    // 신규 등록 조회
    const { data: newEnrollments } = await supabase
      .from('students')
      .select('id, name, department_id, departments!inner(name), enrollment_date')
      .gte('enrollment_date', startDate)
      .lte('enrollment_date', endDate)
    
    // 퇴원 조회
    const { data: withdrawals } = await supabase
      .from('students')
      .select('id, name, department_id, departments!inner(name), withdrawal_date')
      .gte('withdrawal_date', startDate)
      .lte('withdrawal_date', endDate)
    
    // 부서별 집계
    const activeByDept: Record<string, number> = {}
    const consultByDept: Record<string, number> = {}
    const testByDept: Record<string, number> = {}
    const enrollByDept: Record<string, number> = {}
    const withdrawByDept: Record<string, number> = {}
    
    // 집계 로직 (위와 동일)
    activeStudents?.forEach(student => {
      const deptName = student.departments?.name || '미지정'
      activeByDept[deptName] = (activeByDept[deptName] || 0) + 1
    })
    
    consultations?.forEach(student => {
      const deptName = student.departments?.name || '미지정'
      consultByDept[deptName] = (consultByDept[deptName] || 0) + 1
    })
    
    entranceTests?.forEach(test => {
      // @ts-ignore
      const deptName = test.students?.departments?.name || '미지정'
      testByDept[deptName] = (testByDept[deptName] || 0) + 1
    })
    
    newEnrollments?.forEach(student => {
      const deptName = student.departments?.name || '미지정'
      enrollByDept[deptName] = (enrollByDept[deptName] || 0) + 1
    })
    
    withdrawals?.forEach(student => {
      const deptName = student.departments?.name || '미지정'
      withdrawByDept[deptName] = (withdrawByDept[deptName] || 0) + 1
    })
    
    // MoM 및 YoY 계산
    const lastMonth = targetMonth === 1 ? 12 : targetMonth - 1
    const lastMonthYear = targetMonth === 1 ? targetYear - 1 : targetYear
    const { data: lastMonthData } = await supabase
      .from('academy_monthly_stats')
      .select('active_students_total')
      .eq('year', lastMonthYear)
      .eq('month', lastMonth)
      .single()
    
    const momChange = lastMonthData?.active_students_total 
      ? ((activeStudents?.length || 0) - lastMonthData.active_students_total) / lastMonthData.active_students_total * 100
      : 0
    
    const lastYearData = await supabase
      .from('academy_monthly_stats')
      .select('consultations_total, withdrawals_total')
      .eq('year', targetYear - 1)
      .eq('month', targetMonth)
      .single()
    
    const consultYoyChange = lastYearData?.data?.consultations_total
      ? ((consultations?.length || 0) - lastYearData.data.consultations_total) / lastYearData.data.consultations_total * 100
      : 0
      
    const withdrawYoyChange = lastYearData?.data?.withdrawals_total
      ? ((withdrawals?.length || 0) - lastYearData.data.withdrawals_total) / lastYearData.data.withdrawals_total * 100
      : 0
    
    // 데이터 저장 (upsert: 있으면 업데이트, 없으면 삽입)
    const { error } = await supabase
      .from('academy_monthly_stats')
      .upsert({
        year: targetYear,
        month: targetMonth,
        active_students_total: activeStudents?.length || 0,
        active_students_by_dept: activeByDept,
        active_students_mom_change: momChange,
        consultations_total: consultations?.length || 0,
        consultations_by_dept: consultByDept,
        consultations_yoy_change: consultYoyChange,
        entrance_tests_total: entranceTests?.length || 0,
        entrance_tests_by_dept: testByDept,
        test_conversion_rate: consultations?.length 
          ? (entranceTests?.length || 0) / consultations.length * 100 
          : 0,
        new_enrollments_total: newEnrollments?.length || 0,
        new_enrollments_by_dept: enrollByDept,
        enrollment_conversion_rate: consultations?.length 
          ? (newEnrollments?.length || 0) / consultations.length * 100 
          : 0,
        withdrawals_total: withdrawals?.length || 0,
        withdrawals_by_dept: withdrawByDept,
        withdrawals_yoy_change: withdrawYoyChange,
        collected_at: new Date(targetYear, targetMonth, 0).toISOString() // 해당 월 마지막 날
      }, {
        onConflict: 'year,month'  // year, month 조합이 같으면 업데이트
      })
    
    if (error) {
      console.error('스냅샷 저장 실패:', error)
      return { success: false, message: error.message }
    }
    
    return { success: true, message: `${targetYear}년 ${targetMonth}월 데이터가 저장되었습니다` }
    
  } catch (error) {
    console.error('스냅샷 처리 중 오류:', error)
    return { success: false, message: '처리 중 오류가 발생했습니다' }
  }
}