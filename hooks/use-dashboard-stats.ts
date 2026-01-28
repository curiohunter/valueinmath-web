'use client'

import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { getKoreanMonthRange, getKoreanDateString } from '@/lib/utils'
import { toast } from 'sonner'
import type { DashboardStats, CohortMonthData } from '@/types/dashboard'

interface UseDashboardStatsReturn {
  stats: DashboardStats
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

// 부서 정렬 함수
const sortDepartments = (deptData: { [key: string]: number }) => {
  const order = ['영재관', '중등관', '고등관']
  const sorted: { [key: string]: number } = {}

  // 정해진 순서대로 먼저 추가
  order.forEach(dept => {
    if (deptData[dept]) {
      sorted[dept] = deptData[dept]
    }
  })

  // 나머지 부서들 추가 (미분류 등)
  Object.keys(deptData).forEach(dept => {
    if (!order.includes(dept)) {
      sorted[dept] = deptData[dept]
    }
  })

  return sorted
}

// 부서별로 항목을 그룹핑하고 정렬된 카운트를 반환하는 헬퍼 함수
function groupByDepartment<T extends { department?: string | null }>(
  items: T[] | null,
  defaultDept = '미분류'
): { [key: string]: number } {
  const deptRaw: { [key: string]: number } = {}
  items?.forEach(item => {
    const dept = item.department || defaultDept
    deptRaw[dept] = (deptRaw[dept] || 0) + 1
  })
  return sortDepartments(deptRaw)
}

// 초기 상태
const initialStats: DashboardStats = {
  activeStudents: 0,
  activeStudentsByDept: {},
  activeStudentsChange: "+0%",
  consultationsThisMonth: 0,
  consultationsByDept: {},
  consultationsYoY: "+0%",
  testsThisMonth: 0,
  testsByDept: {},
  testConversionRate: "0%",
  newEnrollmentsThisMonth: 0,
  newEnrollmentsByDept: {},
  newEnrollmentStudents: [],
  enrollmentConversionRate: "0%",
  withdrawalsThisMonth: 0,
  withdrawalsByDept: {},
  withdrawalStudents: [],
  withdrawalsYoY: "+0%",
  pendingMakeups: 0,
  weeklyScheduledMakeups: 0,
  overdueScheduledMakeups: 0,
  overdueTeachers: [],
  currentMonthPaidCount: 0,
  currentMonthUnpaidCount: 0,
  todosByAssignee: {},
  totalIncompleteTodos: 0,
  consultationRequestsUnassigned: 0,
  consultationRequestsPending: 0,
  consultationRequestsCompleted: 0,
  cohortData: []
}

// SWR fetcher 함수
async function fetchDashboardStats(): Promise<DashboardStats> {
  const supabase = createClient()

  try {
      // 한국시간 기준 월간 범위 계산
      const { start: monthStart, end: monthEnd } = getKoreanMonthRange()

      // 작년 동월 범위 계산
      const lastYearDate = new Date()
      lastYearDate.setFullYear(lastYearDate.getFullYear() - 1)
      const lastYearMonth = lastYearDate.getMonth()
      const lastYearYear = lastYearDate.getFullYear()
      const lastYearMonthStart = new Date(lastYearYear, lastYearMonth, 1, 0, 0, 0).toISOString()
      const lastYearMonthEnd = new Date(lastYearYear, lastYearMonth + 1, 0, 23, 59, 59).toISOString()

      // 보강/학원비 통계용 날짜 계산
      const today = getKoreanDateString()
      const weekFromNow = new Date(today)
      weekFromNow.setDate(weekFromNow.getDate() + 7)
      const weekFromNowStr = weekFromNow.toISOString().split('T')[0]
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const currentMonth = currentDate.getMonth() + 1

      // 코호트 분석용 날짜
      const twentyFourMonthsAgo = new Date()
      twentyFourMonthsAgo.setMonth(twentyFourMonthsAgo.getMonth() - 24)
      const cohortStartDate = `${twentyFourMonthsAgo.getFullYear()}-${String(twentyFourMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`

      // 모든 쿼리를 병렬로 실행 (성능 최적화)
      const [
        activeStudentsRes,
        consultationsRes,
        lastYearConsultationsRes,
        testsRes,
        newEnrollmentsRes,
        withdrawalsRes,
        lastYearWithdrawalsRes,
        makeupRes,
        tuitionRes,
        todosRes,
        consultationRequestsRes,
        cohortRes
      ] = await Promise.all([
        // 재원생 수 (is_active = true인 학생만)
        supabase.from('students').select('*').eq('status', '재원').eq('is_active', true),
        // 이번달 신규상담
        supabase.from('students').select('*').eq('is_active', true).gte('first_contact_date', monthStart).lt('first_contact_date', monthEnd),
        // 작년 동월 신규상담
        supabase.from('students').select('*').eq('is_active', true).gte('first_contact_date', lastYearMonthStart).lt('first_contact_date', lastYearMonthEnd),
        // 이번달 입학테스트
        supabase.from('entrance_tests').select(`*, students!student_id (department)`).gte('test_date', monthStart).lt('test_date', monthEnd),
        // 이번달 신규등원
        supabase.from('students').select('*').eq('is_active', true).gte('start_date', monthStart).lt('start_date', monthEnd).eq('status', '재원'),
        // 이번달 퇴원
        supabase.from('students').select('*').eq('is_active', true).gte('end_date', monthStart).lt('end_date', monthEnd).eq('status', '퇴원'),
        // 작년 동월 퇴원
        supabase.from('students').select('*').eq('is_active', true).gte('end_date', lastYearMonthStart).lt('end_date', lastYearMonthEnd).eq('status', '퇴원'),
        // 보강 데이터
        supabase.from('makeup_classes').select(`*, classes!inner (id, name, teacher_id, employees!teacher_id (id, name))`).eq('status', 'scheduled'),
        // 학원비 납부 통계
        supabase.from('tuition_fees').select('*').eq('year', currentYear).eq('month', currentMonth),
        // 투두 통계
        supabase.from('todos').select('*').neq('status', 'completed').not('assigned_to', 'is', null),
        // 상담요청 통계
        supabase.from('consultation_requests').select('status, counselor_id'),
        // 코호트 분석
        supabase.rpc("get_cohort_funnel_analysis", { p_lead_source: undefined, p_start_date: cohortStartDate })
      ])

      // 결과 추출
      const activeStudents = activeStudentsRes.data
      const consultationsData = consultationsRes.data
      const lastYearConsultationsData = lastYearConsultationsRes.data
      const testsData = testsRes.data
      const newEnrollments = newEnrollmentsRes.data
      const withdrawals = withdrawalsRes.data
      const lastYearWithdrawalsData = lastYearWithdrawalsRes.data
      const makeupData = makeupRes.data
      const tuitionData = tuitionRes.data
      const todosData = todosRes.data
      const consultationRequestsData = consultationRequestsRes.data
      const cohortRawData = cohortRes.data

      // 에러 처리 (일관된 패턴: console.error + toast.error)
      const errors: string[] = []
      if (activeStudentsRes.error) {
        console.error('재원생 조회 오류:', activeStudentsRes.error)
        errors.push('재원생')
      }
      if (consultationsRes.error) {
        console.error('신규상담 조회 오류:', consultationsRes.error)
        errors.push('신규상담')
      }
      if (testsRes.error) {
        console.error('입학테스트 조회 오류:', testsRes.error)
        errors.push('입학테스트')
      }
      if (newEnrollmentsRes.error) {
        console.error('신규등원 조회 오류:', newEnrollmentsRes.error)
        errors.push('신규등원')
      }
      if (withdrawalsRes.error) {
        console.error('퇴원 조회 오류:', withdrawalsRes.error)
        errors.push('퇴원')
      }
      if (errors.length > 0) {
        toast.error(`데이터 로딩 실패: ${errors.join(', ')}`)
      }

      // 부서별 분류 (헬퍼 함수 사용)
      const activeStudentsByDept = groupByDepartment(activeStudents)
      const consultationsByDept = groupByDepartment(consultationsData)
      const newEnrollmentsByDept = groupByDepartment(newEnrollments)
      const withdrawalsByDept = groupByDepartment(withdrawals)

      // 입학테스트는 조인된 students에서 department를 가져옴
      const testsByDeptRaw: { [key: string]: number } = {}
      testsData?.forEach(test => {
        const student = test.students as { department?: string | null } | null
        const dept = student?.department || '미분류'
        testsByDeptRaw[dept] = (testsByDeptRaw[dept] || 0) + 1
      })
      const testsByDept = sortDepartments(testsByDeptRaw)

      // YoY 계산 (신규상담)
      let consultationsYoY = "0%"
      if (lastYearConsultationsData && lastYearConsultationsData.length > 0) {
        const yoyChange = ((consultationsData?.length || 0) - lastYearConsultationsData.length) / lastYearConsultationsData.length * 100
        consultationsYoY = yoyChange >= 0 ? `+${yoyChange.toFixed(0)}%` : `${yoyChange.toFixed(0)}%`
      } else if (consultationsData && consultationsData.length > 0) {
        consultationsYoY = "+100%"
      }

      // YoY 계산 (퇴원)
      let withdrawalsYoY = "0%"
      if (lastYearWithdrawalsData && lastYearWithdrawalsData.length > 0) {
        const yoyChange = ((withdrawals?.length || 0) - lastYearWithdrawalsData.length) / lastYearWithdrawalsData.length * 100
        withdrawalsYoY = yoyChange >= 0 ? `+${yoyChange.toFixed(0)}%` : `${yoyChange.toFixed(0)}%`
      } else if (withdrawals && withdrawals.length > 0) {
        withdrawalsYoY = "+100%"
      }

      // 보강 관련 통계 처리
      let pendingMakeups = 0
      let weeklyScheduledMakeups = 0
      let overdueScheduledMakeups = 0
      const overdueTeacherSet = new Set<string>()

      makeupData?.forEach(makeup => {
        if (!makeup.makeup_date) {
          pendingMakeups++
        } else {
          if (makeup.makeup_date < today) {
            overdueScheduledMakeups++
            const teacherName = (makeup.classes as any)?.employees?.name
            if (teacherName) {
              overdueTeacherSet.add(teacherName)
            }
          } else if (makeup.makeup_date <= weekFromNowStr) {
            weeklyScheduledMakeups++
          }
        }
      })

      const overdueTeachers = Array.from(overdueTeacherSet)

      // 학원비 납부 통계 처리
      const currentMonthPaidCount = tuitionData?.filter(t => t.payment_status === '완납').length || 0
      const currentMonthUnpaidCount = tuitionData?.filter(t => t.payment_status !== '완납').length || 0

      // 담당자별 미완료 건수 계산
      const todosByAssignee: Record<string, number> = {}
      let totalIncompleteTodos = 0

      if (todosData && todosData.length > 0) {
        const assigneeIds = [...new Set(todosData.map(t => t.assigned_to).filter(Boolean))]

        const { data: employeesData } = await supabase
          .from('employees')
          .select('auth_id, name')
          .in('auth_id', assigneeIds)
          .eq('status', '재직')

        const employeeMap: Record<string, string> = {}
        employeesData?.forEach(emp => {
          if (emp.auth_id) {
            employeeMap[emp.auth_id] = emp.name
          }
        })

        todosData.forEach(todo => {
          if (todo.assigned_to) {
            const assigneeName = employeeMap[todo.assigned_to] || '알 수 없음'
            todosByAssignee[assigneeName] = (todosByAssignee[assigneeName] || 0) + 1
            totalIncompleteTodos++
          }
        })
      }

      // 상담요청 통계 처리
      const consultationRequestsUnassigned = consultationRequestsData?.filter(
        r => r.status === '대기중' && r.counselor_id === null
      ).length || 0

      const consultationRequestsPending = consultationRequestsData?.filter(
        r => r.status === '대기중'
      ).length || 0

      const consultationRequestsCompleted = consultationRequestsData?.filter(
        r => r.status === '완료'
      ).length || 0

      // 코호트 기반 전환율 데이터 처리
      let cohortData: CohortMonthData[] = []

      if (!cohortRes.error && cohortRawData) {
        const monthMap = new Map<string, { consultations: number; enrollments: number; conversionRate: number }>()

        cohortRawData.forEach((row: any) => {
          const month = row.cohort_month
          if (!monthMap.has(month)) {
            monthMap.set(month, { consultations: 0, enrollments: 0, conversionRate: 0 })
          }
          const agg = monthMap.get(month)!
          agg.consultations += row.total_students || 0
          agg.enrollments += row.enroll_total || 0
        })

        monthMap.forEach((data, month) => {
          data.conversionRate = data.consultations > 0
            ? Math.round((data.enrollments / data.consultations) * 1000) / 10
            : 0
        })

        const sortedMonths = Array.from(monthMap.keys()).sort().reverse()
        const recentMonths = sortedMonths.slice(0, 3)

        cohortData = recentMonths.map(monthKey => {
          const data = monthMap.get(monthKey)!

          const [year, month] = monthKey.split('-')
          const prevYearMonth = `${parseInt(year) - 1}-${month}`
          const prevYearData = monthMap.get(prevYearMonth)

          let yoyChange = ""
          if (prevYearData && prevYearData.conversionRate > 0) {
            const change = Math.round((data.conversionRate - prevYearData.conversionRate) * 10) / 10
            yoyChange = change >= 0 ? `+${change}%` : `${change}%`
          }

          return {
            month: monthKey,
            consultations: data.consultations,
            enrollments: data.enrollments,
            conversionRate: data.conversionRate,
            yoyChange
          }
        })
      }

      return {
        activeStudents: activeStudents?.length || 0,
        activeStudentsByDept,
        activeStudentsChange: "", // TODO: 재원생 변화율 계산 구현 필요
        consultationsThisMonth: consultationsData?.length || 0,
        consultationsByDept,
        consultationsYoY,
        testsThisMonth: testsData?.length || 0,
        testsByDept,
        testConversionRate: "",
        newEnrollmentsThisMonth: newEnrollments?.length || 0,
        newEnrollmentsByDept,
        newEnrollmentStudents: (newEnrollments || []).map(s => ({
          name: s.name,
          school_type: s.school_type,
          grade: s.grade,
          department: s.department
        })),
        enrollmentConversionRate: "",
        withdrawalsThisMonth: withdrawals?.length || 0,
        withdrawalsByDept,
        withdrawalStudents: (withdrawals || []).map(s => ({
          name: s.name,
          school_type: s.school_type,
          grade: s.grade,
          department: s.department
        })),
        withdrawalsYoY,
        pendingMakeups,
        weeklyScheduledMakeups,
        overdueScheduledMakeups,
        overdueTeachers,
        currentMonthPaidCount,
        currentMonthUnpaidCount,
        todosByAssignee,
        totalIncompleteTodos,
        consultationRequestsUnassigned,
        consultationRequestsPending,
        consultationRequestsCompleted,
        cohortData
      }

    } catch (err) {
      console.error('통계 데이터 로딩 오류:', err)
      toast.error('통계 데이터 로딩 중 오류가 발생했습니다.')
      throw err
    }
}

/**
 * 대시보드 통계 데이터를 로드하는 커스텀 훅
 * SWR을 사용하여 캐싱 및 중복 요청 방지
 */
export function useDashboardStats(): UseDashboardStatsReturn {
  const { data, error, isLoading, mutate } = useSWR<DashboardStats>(
    'dashboard-stats',
    fetchDashboardStats,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1분간 중복 요청 방지
      errorRetryCount: 2
    }
  )

  return {
    stats: data || initialStats,
    isLoading,
    error: error || null,
    refresh: async () => { await mutate() }
  }
}
