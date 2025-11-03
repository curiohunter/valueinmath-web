'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Calendar, Phone, GraduationCap, TrendingUp, Users, Edit, Trash2, AlertCircle, Clock, CheckCircle2, CreditCard, CheckSquare, BarChart3 } from "lucide-react"
import DashboardCalendar from "@/components/dashboard/DashboardCalendar"
import { ConsultationTable } from "@/components/dashboard/ConsultationTable"
import { EntranceTestTable, type EntranceTestData as EntranceTestTableData } from "@/components/dashboard/EntranceTestTable"
import AtRiskStudentsCard, { type AtRiskStudent, type TeacherGroup } from "@/components/dashboard/AtRiskStudentsCard"
import StudentDetailModal from "@/components/dashboard/StudentDetailModal"
import { TestModal, type EntranceTestData } from "@/components/dashboard/TestModal"
import { StudentManagementTab } from "@/components/dashboard/student-management-tab"
// ConsultationModal removed - using StudentFormModal instead
import type { Database } from "@/types/database"

export type ConsultationData = Database['public']['Tables']['students']['Row'] & {
  entrance_tests?: any[]
}
import { StatsCards } from "@/components/dashboard/StatsCards"
import { StudentFormModal } from "@/components/students/student-form-modal"
import { ClassFormModal } from "@/components/students/classes/class-form-modal"
import { QuickAccessSection } from "@/components/dashboard/QuickAccessSection"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/providers/auth-provider"
import { calendarService } from "@/services/calendar"
import { atRiskSnapshotService } from "@/services/at-risk-snapshot-service"
import { getKoreanMonthRange, getKoreanDateString, getKoreanDateTimeString, parseKoreanDateTime } from "@/lib/utils"
import type { Database } from "@/types/database"
import { toast } from "sonner"

type Student = Database['public']['Tables']['students']['Row']

interface DashboardStats {
  activeStudents: number
  activeStudentsByDept: { [key: string]: number }
  activeStudentsChange: string
  consultationsThisMonth: number
  consultationsByDept: { [key: string]: number }
  consultationsYoY: string
  testsThisMonth: number
  testsByDept: { [key: string]: number }
  testConversionRate: string
  newEnrollmentsThisMonth: number
  newEnrollmentsByDept: { [key: string]: number }
  enrollmentConversionRate: string
  withdrawalsThisMonth: number
  withdrawalsByDept: { [key: string]: number }
  withdrawalsYoY: string
  // 새로운 통계 추가
  pendingMakeups: number // 보강 미정
  weeklyScheduledMakeups: number // 7일내 예정
  overdueScheduledMakeups: number // 기한 지난 미완료
  overdueTeachers: string[] // 기한 초과 담당 선생님들
  currentMonthPaidCount: number // 이번달 완납
  currentMonthUnpaidCount: number // 이번달 미납
  todosByAssignee: { [key: string]: number } // 담당자별 미완료 투두
  totalIncompleteTodos: number // 전체 미완료 투두 수
  consultationRequestsUnassigned: number // 미배정 상담요청
  consultationRequestsPending: number // 대기중 상담요청
  consultationRequestsCompleted: number // 완료 상담요청
}

export default function DashboardPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [consultations, setConsultations] = useState<ConsultationData[]>([])
  const [entranceTests, setEntranceTests] = useState<EntranceTestData[]>([])
  const [atRiskStudents, setAtRiskStudents] = useState<TeacherGroup[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
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
    enrollmentConversionRate: "0%",
    withdrawalsThisMonth: 0,
    withdrawalsByDept: {},
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
    consultationRequestsCompleted: 0
  })
  const [loading, setLoading] = useState(true)
  const [editingConsultation, setEditingConsultation] = useState<ConsultationData | null>(null)
  const [editingTest, setEditingTest] = useState<EntranceTestData | null>(null)
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false)
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  // 테이블로 변경되어 더 이상 필요하지 않음
  // const [expandedConsultations, setExpandedConsultations] = useState<Set<string>>(new Set())
  // const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set())
  const [selectedStudent, setSelectedStudent] = useState<AtRiskStudent | null>(null)
  const [isStudentDetailModalOpen, setIsStudentDetailModalOpen] = useState(false)
  
  // 학생 정보 모달 관련 상태
  const [isStudentFormModalOpen, setIsStudentFormModalOpen] = useState(false)
  const [editingStudentForTest, setEditingStudentForTest] = useState<Student | null>(null)
  const [currentTestId, setCurrentTestId] = useState<number | null>(null)
  
  // 반 등록 모달 관련 상태
  const [isClassFormModalOpen, setIsClassFormModalOpen] = useState(false)
  const [newlyEnrolledStudent, setNewlyEnrolledStudent] = useState<Student | null>(null)
  const [teachers, setTeachers] = useState<any[]>([])
  const [allStudents, setAllStudents] = useState<Student[]>([])

  // UTC로 저장된 datetime을 한국시간으로 정확히 변환하여 표시하는 헬퍼 함수
  const formatKoreanDateTime = (utcDateString: string): string => {
    const utcDate = new Date(utcDateString)
    // timeZone 옵션을 사용하여 올바른 한국시간 표시
    return utcDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
  }

  // UTC로 저장된 datetime을 datetime-local input 형식으로 변환하는 헬퍼 함수
  const formatKoreanDateTimeForInput = (utcDateString: string | null): string => {
    if (!utcDateString) return ''
    const utcDate = new Date(utcDateString)
    const koreanTime = new Date(utcDate.getTime() + (9 * 60 * 60 * 1000))
    return koreanTime.toISOString().slice(0, 16)
  }

  // 통계 데이터 로딩
  const loadStats = async () => {
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


      // 재원생 수
      const { data: activeStudents, error: activeError } = await supabase
        .from('students')
        .select('*')
        .eq('status', '재원')
      
      if (activeError) {
        console.error('재원생 조회 오류:', activeError)
        toast.error(`데이터 로딩 실패: ${activeError.message}`)
      }

      // 이번달 신규상담 (first_contact_date 기준) - 상태 무관하게 수정
      const { data: consultationsData } = await supabase
        .from('students')
        .select('*')
        .gte('first_contact_date', monthStart)
        .lt('first_contact_date', monthEnd)
      
      // 작년 동월 신규상담 (YoY 계산용)
      const { data: lastYearConsultationsData } = await supabase
        .from('students')
        .select('*')
        .gte('first_contact_date', lastYearMonthStart)
        .lt('first_contact_date', lastYearMonthEnd)


      // 이번달 입학테스트 (test_date 기준) - 학생 정보와 함께 조회
      const { data: testsData } = await supabase
        .from('entrance_tests')
        .select(`
          *,
          students!consultation_id (
            department
          )
        `)
        .gte('test_date', monthStart)
        .lt('test_date', monthEnd)


      // 이번달 신규등원 (start_date 기준)
      const { data: newEnrollments } = await supabase
        .from('students')
        .select('*')
        .gte('start_date', monthStart)
        .lt('start_date', monthEnd)
        .eq('status', '재원')

      // 이번달 퇴원 (end_date 기준) - 한국시간 범위 적용
      const { data: withdrawals, error: withdrawalError } = await supabase
        .from('students')
        .select('*')
        .gte('end_date', monthStart)
        .lt('end_date', monthEnd)
        .eq('status', '퇴원')
      
      // 작년 동월 퇴원 (YoY 계산용)
      const { data: lastYearWithdrawalsData } = await supabase
        .from('students')
        .select('*')
        .gte('end_date', lastYearMonthStart)
        .lt('end_date', lastYearMonthEnd)
        .eq('status', '퇴원')

      if (withdrawalError) {
        console.error('퇴원 쿼리 에러:', withdrawalError)
      }

      // 퇴원 학생들의 상세 정보 로그
      if (withdrawals && withdrawals.length > 0) {
        // 퇴원 학생 데이터 처리 (로그 제거됨)
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

      // 부서별 재원생 분류
      const activeStudentsByDeptRaw: { [key: string]: number } = {}
      activeStudents?.forEach(student => {
        const dept = student.department || '미분류'
        activeStudentsByDeptRaw[dept] = (activeStudentsByDeptRaw[dept] || 0) + 1
      })
      const activeStudentsByDept = sortDepartments(activeStudentsByDeptRaw)

      // 부서별 상담 분류
      const consultationsByDeptRaw: { [key: string]: number } = {}
      consultationsData?.forEach(consultation => {
        const dept = consultation.department || '미분류'
        consultationsByDeptRaw[dept] = (consultationsByDeptRaw[dept] || 0) + 1
      })
      const consultationsByDept = sortDepartments(consultationsByDeptRaw)

      // 부서별 입학테스트 분류
      const testsByDeptRaw: { [key: string]: number } = {}
      testsData?.forEach(test => {
        const student = test.students as any
        const dept = student?.department || '미분류'
        testsByDeptRaw[dept] = (testsByDeptRaw[dept] || 0) + 1
      })
      const testsByDept = sortDepartments(testsByDeptRaw)

      // 부서별 신규등원 분류
      const newEnrollmentsByDeptRaw: { [key: string]: number } = {}
      newEnrollments?.forEach(enrollment => {
        const dept = enrollment.department || '미분류'
        newEnrollmentsByDeptRaw[dept] = (newEnrollmentsByDeptRaw[dept] || 0) + 1
      })
      const newEnrollmentsByDept = sortDepartments(newEnrollmentsByDeptRaw)

      // 부서별 퇴원 분류
      const withdrawalsByDeptRaw: { [key: string]: number } = {}
      withdrawals?.forEach(withdrawal => {
        const dept = withdrawal.department || '미분류'
        withdrawalsByDeptRaw[dept] = (withdrawalsByDeptRaw[dept] || 0) + 1
      })
      const withdrawalsByDept = sortDepartments(withdrawalsByDeptRaw)

      // 전환율 계산
      const testConversionRate = consultationsData && consultationsData.length > 0
        ? ((testsData?.length || 0) / consultationsData.length * 100).toFixed(1)
        : "0"

      const enrollmentConversionRate = consultationsData && consultationsData.length > 0
        ? ((newEnrollments?.length || 0) / consultationsData.length * 100).toFixed(1)
        : "0"
      
      // YoY 계산 (신규상담)
      let consultationsYoY = "0%"
      if (lastYearConsultationsData && lastYearConsultationsData.length > 0) {
        const yoyChange = ((consultationsData?.length || 0) - lastYearConsultationsData.length) / lastYearConsultationsData.length * 100
        consultationsYoY = yoyChange >= 0 ? `+${yoyChange.toFixed(0)}%` : `${yoyChange.toFixed(0)}%`
      } else if (consultationsData && consultationsData.length > 0) {
        consultationsYoY = "+100%" // 작년에 데이터가 없고 올해는 있는 경우
      }
      
      // YoY 계산 (퇴원) - 퇴원은 감소가 좋은 것
      let withdrawalsYoY = "0%"
      if (lastYearWithdrawalsData && lastYearWithdrawalsData.length > 0) {
        const yoyChange = ((withdrawals?.length || 0) - lastYearWithdrawalsData.length) / lastYearWithdrawalsData.length * 100
        withdrawalsYoY = yoyChange >= 0 ? `+${yoyChange.toFixed(0)}%` : `${yoyChange.toFixed(0)}%`
      } else if (withdrawals && withdrawals.length > 0) {
        withdrawalsYoY = "+100%" // 작년에 데이터가 없고 올해는 있는 경우
      }

      // 보강 관련 통계 - 한국시간 기준
      const today = getKoreanDateString()
      const weekFromNow = new Date(today)
      weekFromNow.setDate(weekFromNow.getDate() + 7)
      const weekFromNowStr = weekFromNow.toISOString().split('T')[0]
      
      // 보강 데이터와 관련 정보 조회
      const { data: makeupData } = await supabase
        .from('makeup_classes')
        .select(`
          *,
          classes!inner (
            id,
            name,
            teacher_id,
            employees!teacher_id (
              id,
              name
            )
          )
        `)
        .eq('status', 'scheduled')
      
      let pendingMakeups = 0
      let weeklyScheduledMakeups = 0
      let overdueScheduledMakeups = 0
      const overdueTeacherSet = new Set<string>()
      
      makeupData?.forEach(makeup => {
        if (!makeup.makeup_date) {
          // 날짜 미정
          pendingMakeups++
        } else {
          // 날짜가 있는 경우
          if (makeup.makeup_date < today) {
            // 기한 지났는데 아직 예정 상태
            overdueScheduledMakeups++
            // 선생님 이름 추가
            const teacherName = (makeup.classes as any)?.employees?.name
            if (teacherName) {
              overdueTeacherSet.add(teacherName)
            }
          } else if (makeup.makeup_date <= weekFromNowStr) {
            // 7일 내 예정
            weeklyScheduledMakeups++
          }
        }
      })
      
      const overdueTeachers = Array.from(overdueTeacherSet)
      
      // 학원비 납부 통계 - 이번달
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const currentMonth = currentDate.getMonth() + 1
      
      const { data: tuitionData } = await supabase
        .from('tuition_fees')
        .select('*')
        .eq('year', currentYear)
        .eq('month', currentMonth)
      
      const currentMonthPaidCount = tuitionData?.filter(t => t.payment_status === '완납').length || 0
      const currentMonthUnpaidCount = tuitionData?.filter(t => t.payment_status !== '완납').length || 0

      // 투두 통계 로드
      const { data: todosData } = await supabase
        .from('todos')
        .select('*')
        .neq('status', 'completed')
        .not('assigned_to', 'is', null)

      // 담당자별 미완료 건수 계산
      const todosByAssignee: Record<string, number> = {}
      let totalIncompleteTodos = 0

      if (todosData && todosData.length > 0) {
        // 먼저 모든 고유한 assigned_to ID 수집
        const assigneeIds = [...new Set(todosData.map(t => t.assigned_to).filter(Boolean))]

        // 직원 이름 가져오기
        const { data: employeesData } = await supabase
          .from('employees')
          .select('auth_id, name')
          .in('auth_id', assigneeIds)
          .eq('status', '재직')

        const employeeMap: Record<string, string> = {}
        employeesData?.forEach(emp => {
          employeeMap[emp.auth_id] = emp.name
        })

        // 담당자별 카운트
        todosData.forEach(todo => {
          if (todo.assigned_to) {
            const assigneeName = employeeMap[todo.assigned_to] || '알 수 없음'
            todosByAssignee[assigneeName] = (todosByAssignee[assigneeName] || 0) + 1
            totalIncompleteTodos++
          }
        })
      }

      // 상담요청 통계
      const { data: consultationRequestsData } = await supabase
        .from('consultation_requests')
        .select('status, counselor_id')

      const consultationRequestsUnassigned = consultationRequestsData?.filter(
        r => r.status === '대기중' && r.counselor_id === null
      ).length || 0

      const consultationRequestsPending = consultationRequestsData?.filter(
        r => r.status === '대기중'
      ).length || 0

      const consultationRequestsCompleted = consultationRequestsData?.filter(
        r => r.status === '완료'
      ).length || 0

      setStats({
        activeStudents: activeStudents?.length || 0,
        activeStudentsByDept,
        activeStudentsChange: "+2%", // 이건 별도 계산 필요
        consultationsThisMonth: consultationsData?.length || 0,
        consultationsByDept,
        consultationsYoY,
        testsThisMonth: testsData?.length || 0,
        testsByDept,
        testConversionRate: `${testConversionRate}%`,
        newEnrollmentsThisMonth: newEnrollments?.length || 0,
        newEnrollmentsByDept,
        enrollmentConversionRate: `${enrollmentConversionRate}%`,
        withdrawalsThisMonth: withdrawals?.length || 0,
        withdrawalsByDept,
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
        consultationRequestsCompleted
      })

    } catch (error) {
      console.error('통계 데이터 로딩 오류:', error)
    }
  }

  // 신규상담 데이터 로딩
  const loadConsultations = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('status', '신규상담')
        .order('first_contact_date', { ascending: false })
        .limit(20)  // 더 많이 가져오기

      if (error) throw error
      setConsultations(data || [])
    } catch (error) {
      console.error('신규상담 데이터 로딩 오류:', error)
    }
  }

  // 입학테스트 데이터 로딩 - 신규상담 상태인 학생만
  const loadEntranceTests = async () => {
    try {
      // 먼저 신규상담 학생들의 ID를 가져옴
      const { data: consultationStudents } = await supabase
        .from('students')
        .select('id')
        .eq('status', '신규상담')
      
      const studentIds = consultationStudents?.map(s => s.id) || []
      
      if (studentIds.length === 0) {
        setEntranceTests([])
        return
      }
      
      // 해당 학생들의 입학테스트만 가져옴 (calendar_event_id 포함)
      const { data, error } = await supabase
        .from('entrance_tests')
        .select(`
          *,
          calendar_event_id,
          students!consultation_id (
            name,
            status
          )
        `)
        .in('consultation_id', studentIds)
        .order('test_date', { ascending: true, nullsFirst: true })
        .limit(20)

      if (error) throw error
      
      // 학생 이름 추가
      const testsWithNames = data?.map(test => ({
        ...test,
        student_name: (test.students as any)?.name || '이름 없음'
      })) || []

      setEntranceTests(testsWithNames)
    } catch (error) {
      console.error('입학테스트 데이터 로딩 오류:', error)
    }
  }

  // 입학테스트 생성 (모달 열기)
  const handleCreateTest = async (consultationId: string) => {
    // consultation 정보를 가져와서 학생 정보로 사용
    const consultation = consultations.find(c => c.id === consultationId)
    if (!consultation) {
      toast.error('상담 정보를 찾을 수 없습니다.')
      return
    }
    
    // 새로운 테스트를 위한 기본 데이터 설정
    const newTest: Partial<EntranceTestData> = {
      consultation_id: consultationId,
      student_name: consultation.name,  // student_id 필드 제거 (DB에 없음)
      status: '테스트예정',
      test_date: new Date().toISOString(),
      test1_level: '',
      test2_level: '',
      test1_score: null,
      test2_score: null,
      test_result: null,
      recommended_class: '',
      notes: ''
    }
    
    // 모달 열기 전에 editingTest 초기화하고 새 데이터 설정
    setEditingTest(null)
    
    // 약간의 딜레이 후 새 테스트 데이터 설정 (React 렌더링 사이클 대응)
    setTimeout(() => {
      setEditingTest(newTest as EntranceTestData)
      setIsTestModalOpen(true)
    }, 50)
  }

  function cleanObj<T extends object>(obj: T): T {
    // undefined 속성 제거 및 빈 문자열을 null로 변환
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, v === '' ? null : v])
    ) as T
  }

  const handleConsultationSave = async (consultationData: Partial<ConsultationData>) => {
    try {

      // name 등 필수 필드 보장
      const cleanData: any = {
        ...cleanObj(consultationData),
        name: consultationData.name ?? '',
        parent_phone: consultationData.parent_phone ?? '',
        school: consultationData.school ?? '',
        grade: consultationData.grade ?? 1,
        department: consultationData.department ?? '',
        status: consultationData.status ?? '신규상담',
        notes: consultationData.notes ?? '',
        first_contact_date: consultationData.first_contact_date ?? new Date().toISOString().split('T')[0]
      }
      
      // lead_source는 값이 있을 때만 포함
      if (consultationData.lead_source && consultationData.lead_source.trim() !== '') {
        cleanData.lead_source = consultationData.lead_source
      }
      
      const originalStatus = editingConsultation?.status
      const newStatus = cleanData.status
      
      if (editingConsultation) {
        const { data, error } = await supabase
          .from('students')
          .update(cleanData)
          .eq('id', editingConsultation.id)
          .select()
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('students')
          .insert(cleanData)
          .select()
        if (error) {
          console.error('Insert error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          throw error
        }
      }
      
      // 상담 저장 후 필요한 데이터만 새로고침
      await loadStats() // 통계만 업데이트
      await loadConsultations() // 상담 목록 업데이트
      
      // 상태가 신규상담에서 다른 상태로 변경된 경우에만 입학테스트 목록 업데이트
      if (originalStatus === '신규상담' && newStatus !== '신규상담') {
        await loadEntranceTests()
      }
      
      setIsConsultationModalOpen(false)
      setEditingConsultation(null)
      
      // 상태 변경 알림 (신규상담 -> 다른 상태로 변경 시)
      if (originalStatus === '신규상담' && newStatus !== '신규상담') {
        toast.success(`${cleanData.name}님의 상태가 ${newStatus}으로 변경되었습니다.`)
      } else if (editingConsultation) {
        toast.success('상담 정보가 수정되었습니다.')
      } else {
        toast.success('신규 상담이 등록되었습니다.')
      }
    } catch (error: any) {
      console.error('신규상담 저장 오류:', error)
      toast.error(`저장 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`)
    }
  }

  const handleConsultationDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id)
      if (error) throw error
      await loadStats() // 통계 업데이트
      await loadConsultations() // 상담 목록 업데이트
    } catch (error) {
      console.error('신규상담 삭제 오류:', error)
    }
  }

  const handleTestDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    try {
      // 먼저 입학테스트 정보를 가져와서 calendar_event_id 확인
      const { data: testData, error: fetchError } = await supabase
        .from('entrance_tests')
        .select('calendar_event_id')
        .eq('id', id)
        .single()
      
      if (fetchError) throw fetchError
      
      // 캘린더 이벤트가 있으면 먼저 삭제
      if (testData?.calendar_event_id) {
        try {
          await calendarService.deleteEvent(testData.calendar_event_id)
        } catch (calendarError) {
          console.error('캘린더 이벤트 삭제 실패:', calendarError)
          // 캘린더 삭제 실패해도 DB는 계속 진행
        }
      }
      
      // 입학테스트 삭제
      const { error } = await supabase
        .from('entrance_tests')
        .delete()
        .eq('id', id)
      if (error) throw error
      
      toast.success('입학테스트가 삭제되었습니다.')
      await loadStats() // 통계 업데이트
      await loadEntranceTests() // 테스트 목록 업데이트
    } catch (error) {
      console.error('입학테스트 삭제 오류:', error)
      toast.error('입학테스트 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleTestSave = async (testData: Partial<EntranceTestData>) => {
    try {
      console.log('받은 testData:', testData)
      console.log('editingTest:', editingTest)
      
      // test_result가 빈 문자열이면 null로 변환
      const cleanedTestData: any = {
        ...testData,
        // @ts-ignore - test_result 타입 이슈 임시 해결
        test_result: (testData as any).test_result === '' ? null : (testData as any).test_result
      }
      
      // 신규 테스트 생성 시 editingTest에서 consultation_id 가져오기
      if (!editingTest?.id && editingTest) {
        cleanedTestData.consultation_id = editingTest.consultation_id
        // student_id, student_name은 데이터베이스에 없는 필드이므로 제거
        delete cleanedTestData.student_id
        delete cleanedTestData.student_name
      }
      
      // id가 undefined인 경우 제거
      if (cleanedTestData.id === undefined) {
        delete cleanedTestData.id
      }
      
      console.log('정리된 cleanedTestData:', cleanedTestData)
      
      const cleanData = cleanObj(cleanedTestData)
      
      console.log('최종 cleanData:', cleanData)
      
      if (editingTest?.id) {
        // 기존 테스트 수정 (id가 있는 경우)
        const { data, error } = await supabase
          .from('entrance_tests')
          .update(cleanData)
          .eq('id', editingTest.id)
          .select()
        
        
        if (error) {
          console.error('Supabase 에러 상세:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          throw error
        }
        
        // 캘린더 이벤트가 있으면 업데이트
        if (editingTest.google_calendar_id && cleanData.test_date) {
          const studentName = editingTest.student_name || '학생'
          const testDate = new Date(cleanData.test_date as string)
          const startTime = testDate.toISOString()
          const endTime = new Date(testDate.getTime() + 2 * 60 * 60 * 1000).toISOString() // 2시간 후
          
          const updateData = {
            title: `${studentName} 입학테스트`,
            start_time: startTime,
            end_time: endTime,
            description: `입학테스트 - ${studentName}`
          }
          
          await calendarService.updateEvent(editingTest.google_calendar_id, updateData)
        }
        
        await loadStats() // 통계만 업데이트
        await loadEntranceTests() // 테스트 목록 업데이트
        setIsTestModalOpen(false)
        setEditingTest(null)
        toast.success('입학테스트가 수정되었습니다.')
      } else {
        // 신규 테스트 생성
        let calendarEventId = null
        
        // 테스트 날짜가 있으면 캘린더 이벤트 먼저 생성
        if (cleanData.test_date) {
          try {
            // consultation_id로 학생 정보 조회
            const { data: studentData } = await supabase
              .from('students')
              .select('name')
              .eq('id', cleanData.consultation_id)
              .single()
            
            const studentName = studentData?.name || '학생'
            const testDate = new Date(cleanData.test_date as string)
            const startTime = testDate.toISOString()
            const endTime = new Date(testDate.getTime() + 2 * 60 * 60 * 1000).toISOString() // 2시간 후
            
            // 캘린더 이벤트 생성
            const calendarEvent = await calendarService.createEvent({
              title: `${studentName} 입학테스트`,
              start_time: startTime,
              end_time: endTime,
              event_type: 'entrance_test',
              description: `입학테스트 - ${studentName}`,
              location: null
            })
            
            calendarEventId = calendarEvent.id
          } catch (calendarError) {
            console.error('캘린더 이벤트 생성 실패:', calendarError)
            // 캘린더 이벤트 생성 실패해도 테스트는 계속 저장
          }
        }
        
        // 캘린더 이벤트 ID와 함께 입학테스트 저장
        const insertData = {
          ...cleanData,
          calendar_event_id: calendarEventId  // 로컬 calendar_events 테이블 ID 저장
        }
        
        const { data, error } = await supabase
          .from('entrance_tests')
          .insert(insertData)
          .select()
        
        if (error) throw error
        
        await loadStats() // 통계만 업데이트
        await loadEntranceTests() // 테스트 목록 업데이트
        setIsTestModalOpen(false)
        toast.success('입학테스트가 등록되었습니다.')
      }
    } catch (error: any) {
      console.error('입학테스트 저장 오류:', error)
      toast.error(`저장 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`)
    }
  }

  // 캘린더 일정 등록
  const handleCreateCalendarEvent = async (test: EntranceTestData) => {
    
    if (!test.test_date) {
      alert('테스트 정보가 없습니다.')
      return
    }
    
    try {
      // 1. calendar_event_id가 있는지 먼저 확인 (양방향 동기화)
      if (test.calendar_event_id) {
        // 기존 일정 업데이트
        const updateConfirm = confirm('이미 등록된 일정이 있습니다. 기존 일정을 업데이트하시겠습니까?')
        if (!updateConfirm) {
          return
        }
        
        // 업데이트할 이벤트 데이터 준비
        const studentName = test.student_name || '학생'
        const subjects = []
        if (test.test1_level) subjects.push(test.test1_level)
        if (test.test2_level) subjects.push(test.test2_level)
        
        const title = `${studentName} ${subjects.join(', ')}`
        
        // 시간 형식을 통일하여 처리 (한국시간으로 저장)
        let startTime = test.test_date
        if (startTime.includes('+')) {
          startTime = test.test_date
        } else {
          startTime = test.test_date.slice(0, 19)
        }
        
        // 2시간 후 종료시간 계산
        const startDate = new Date(startTime)
        const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000))
        const endTime = endDate.toISOString().slice(0, 19)
        
        const updateData = {
          title,
          start_time: startTime,
          end_time: endTime,
          description: `입학테스트 - ${studentName}`
        }
        
        // calendarService를 사용하여 이벤트 업데이트
        await calendarService.updateEvent(test.calendar_event_id, updateData)
        
        alert('캘린더 일정이 업데이트되었습니다.')
        
        // 통계만 업데이트 (일정 업데이트 후)
        await loadStats()
        window.dispatchEvent(new CustomEvent('refreshCalendar'))
        
        return
      }
      
      // 2. Google Calendar ID가 있는 경우 (이전 방식 호환성)
      if (test.google_calendar_id) {
        // 먼저 기존 calendar_events에서 해당 Google Calendar ID를 가진 이벤트 찾기
        const { data: existingCalendarEvent } = await supabase
          .from('calendar_events')
          .select('id')
          .eq('google_calendar_id', test.google_calendar_id)
          .single()
        
        if (existingCalendarEvent) {
          // calendar_event_id를 entrance_tests에 저장하여 이후 양방향 동기화 가능하게 함
          await supabase
            .from('entrance_tests')
            .update({ calendar_event_id: existingCalendarEvent.id })
            .eq('id', test.id)
          
          // 업데이트 로직 실행
          const studentName = test.student_name || '학생'
          const subjects = []
          if (test.test1_level) subjects.push(test.test1_level)
          if (test.test2_level) subjects.push(test.test2_level)
          
          const title = `${studentName} ${subjects.join(', ')}`
          
          let startTime = test.test_date
          if (startTime.includes('+')) {
            startTime = test.test_date
          } else {
            startTime = test.test_date.slice(0, 19)
          }
          
          const startDate = new Date(startTime)
          const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000))
          const endTime = endDate.toISOString().slice(0, 19)
          
          const updateData = {
            title,
            start_time: startTime,
            end_time: endTime,
            description: `입학테스트 - ${studentName}`
          }
          
          await calendarService.updateEvent(existingCalendarEvent.id, updateData)
          
          alert('캘린더 일정이 업데이트되었습니다.')
          await loadStats()
          window.dispatchEvent(new CustomEvent('refreshCalendar'))
          
          return
        }
      }
      
      // 3. 새로운 일정 생성
      const studentName = test.student_name || '학생'
      const subjects = []
      if (test.test1_level) subjects.push(test.test1_level)
      if (test.test2_level) subjects.push(test.test2_level)
      
      const title = `${studentName} ${subjects.join(', ')}`
      
      // 시간 형식을 통일하여 처리 (한국시간으로 저장)
      let startTime = test.test_date
      if (startTime.includes('+')) {
        startTime = test.test_date
      } else {
        startTime = test.test_date.slice(0, 19)
      }
      
      // 2시간 후 종료시간 계산
      const startDate = new Date(startTime)
      const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000))
      const endTime = endDate.toISOString().slice(0, 19)
      
      const eventData = {
        title,
        start_time: startTime,
        end_time: endTime,
        event_type: 'entrance_test' as any,
        description: `입학테스트 - ${studentName}`
      }
      
      // calendarService를 사용하여 이벤트 생성
      const response = await calendarService.createEvent(eventData)
      
      // calendar_event_id를 entrance_tests 테이블에 저장 (양방향 동기화)
      if (response.id) {
        const { error: updateError } = await supabase
          .from('entrance_tests')
          .update({ 
            calendar_event_id: response.id,
            google_calendar_id: response.google_calendar_id // 호환성을 위해 유지
          })
          .eq('id', test.id)
        
        if (updateError) {
          console.error('entrance_tests 테이블 업데이트 실패:', updateError)
        }
      }
      
      alert('캘린더에 일정이 등록되었습니다.')
      
      // 통계만 업데이트 (캘린더 일정 등록 후)
      await loadStats()
      
      // 캘린더 컴포넌트에 새로고침 이벤트 전송
      window.dispatchEvent(new CustomEvent('refreshCalendar'))
      
    } catch (error) {
      console.error('캘린더 등록 오류:', error)
      alert('캘린더 등록 중 오류가 발생했습니다.')
    }
  }
  
  // 등록 결정 - 학생 정보 모달 열기
  const handleEnrollmentDecision = async (testId: number) => {
    try {
      // 입학테스트에서 consultation_id 찾기
      const { data: testData, error: testError } = await supabase
        .from('entrance_tests')
        .select('consultation_id')
        .eq('id', testId)
        .single()
      
      if (testError || !testData?.consultation_id) {
        toast.error('학생 정보를 찾을 수 없습니다.')
        return
      }
      
      // 학생 정보 가져오기
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', testData.consultation_id)
        .single()
      
      if (studentError || !studentData) {
        toast.error('학생 정보를 불러올 수 없습니다.')
        return
      }
      
      // 학생 정보 모달 열기
      setEditingStudentForTest(studentData)
      setCurrentTestId(testId)
      setIsStudentFormModalOpen(true)
      
    } catch (error) {
      console.error('학생 정보 로드 오류:', error)
      toast.error('학생 정보를 불러오는 중 오류가 발생했습니다.')
    }
  }
  
  // 학생 정보 저장 성공 시 처리
  const handleStudentFormSuccess = async () => {
    if (!editingStudentForTest) return
    
    // 학생 정보를 다시 로드하여 최신 상태 확인
    const { data: updatedStudent } = await supabase
      .from('students')
      .select('*')
      .eq('id', editingStudentForTest.id)
      .single()
    
    if (updatedStudent?.status === '재원') {
      // 재원으로 변경된 경우 반 등록 여부 확인
      const confirmClassRegistration = confirm('학생이 재원으로 등록되었습니다.\n이어서 반 등록도 진행하시겠습니까?')
      
      if (confirmClassRegistration) {
        // 선생님 목록 로드
        const { data: teachersData } = await supabase
          .from('employees')
          .select('id, name')
          .order('name')
        
        // 모든 학생 목록 로드
        const { data: studentsData } = await supabase
          .from('students')
          .select('*')
          .eq('status', '재원')
          .order('name')
        
        setTeachers(teachersData || [])
        setAllStudents(studentsData || [])
        setNewlyEnrolledStudent(updatedStudent)
        setIsClassFormModalOpen(true)
      }
    }
    
    // 데이터 새로고침
    await loadStats()
    await loadConsultations()
    await loadEntranceTests()
    
    // 모달 닫기
    setIsStudentFormModalOpen(false)
    setEditingStudentForTest(null)
    setCurrentTestId(null)
  }

  // 데이터 로딩만 수행 (인증은 미들웨어에서 처리)
  useEffect(() => {
    // 미들웨어에서 이미 인증을 확인했으므로 여기서는 데이터만 로드
  }, [])

  // Load current employee ID
  useEffect(() => {
    const loadEmployeeId = async () => {
      if (!user) return

      try {
        const { data: employee } = await supabase
          .from("employees")
          .select("id")
          .eq("auth_id", user.id)
          .eq("status", "재직")
          .single()

        if (employee) {
          setEmployeeId(employee.id)
        }
      } catch (error) {
        console.error("Failed to load employee ID:", error)
      }
    }

    loadEmployeeId()
  }, [user])

  // 위험 학생 데이터 로딩 - 상담 페이지와 동일한 서비스 사용
  const loadAtRiskStudents = async () => {
    try {
      // atRiskSnapshotService를 사용하여 동일한 기준 적용
      const groups = await atRiskSnapshotService.calculateAtRiskStudents();
      setAtRiskStudents(groups);
    } catch (error) {
      console.error('위험 학생 데이터 로딩 오류:', error);
    }
  };

  // 모든 데이터 새로고침 함수
  const refreshAllData = async () => {
    await Promise.all([
      loadStats(),
      loadConsultations(),
      loadEntranceTests(),
      loadAtRiskStudents()
    ])
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await refreshAllData()
      setLoading(false)
    }
    
    loadData()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "테스트고민": case "prospect": return "bg-amber-100 text-amber-800"
      case "테스트예정": return "bg-sky-100 text-sky-800"
      case "테스트완료": case "결과상담대기": return "bg-amber-100 text-amber-800"
      case "결과상담완료": return "bg-emerald-100 text-emerald-800"
      case "상담대기": case "상담중": return "bg-violet-100 text-violet-800"
      case "상담후고민": return "bg-purple-100 text-purple-800"
      case "재원결정": case "재원": return "bg-emerald-100 text-emerald-800"
      case "미등록결정": case "퇴원": return "bg-gray-100 text-gray-800"
      case "휴원": return "bg-amber-100 text-amber-800"
      case "미등록": return "bg-slate-100 text-slate-800"
      case "신규상담": return "bg-violet-100 text-violet-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">대시보드</h1>
          <p className="text-muted-foreground">데이터를 로딩하고 있습니다...</p>
        </div>
      </div>
    )
  }


  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            운영현황
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            학생관리
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* 통계 카드 */}
          <StatsCards stats={stats} atRiskStudents={atRiskStudents} />

          {/* 바로가기 섹션 */}
          <QuickAccessSection />

      {/* 중간 영역: 신규상담 + 입학테스트 관리 */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* 왼쪽: 신규상담 목록 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">신규상담 관리</CardTitle>
                <CardDescription className="text-xs">상담 진행 중인 학생들을 관리합니다</CardDescription>
              </div>
              <Button
                onClick={() => {
                  setEditingConsultation(null)
                  setIsConsultationModalOpen(true)
                }}
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-4 w-4 mr-1" />
                신규 등록
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            <ConsultationTable
              consultations={consultations}
              onEdit={(consultation) => {
                setEditingConsultation(consultation)
                setIsConsultationModalOpen(true)
              }}
              onDelete={handleConsultationDelete}
              onCreateTest={handleCreateTest}
            />
          </CardContent>
        </Card>

        {/* 오른쪽: 입학테스트 상세정보 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">입학테스트 관리</CardTitle>
                <CardDescription className="text-xs">입학테스트 일정 및 결과를 관리합니다</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            <EntranceTestTable
              entranceTests={entranceTests}
              onEdit={(test) => {
                setEditingTest(test)
                setIsTestModalOpen(true)
              }}
              onDelete={handleTestDelete}
              onEnrollmentDecision={handleEnrollmentDecision}
            />
          </CardContent>
        </Card>
      </div>

      {/* 하단: 학원 일정 캘린더 및 위험 학생 관리 */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* 왼쪽: 캘린더 */}
        <DashboardCalendar />
        
        {/* 오른쪽: 위험 학생 관리 */}
        <AtRiskStudentsCard 
          teacherGroups={atRiskStudents}
          loading={loading}
          onStudentClick={(student) => {
            setSelectedStudent(student);
            setIsStudentDetailModalOpen(true);
          }}
        />
      </div>

      {/* 신규상담 편집 모달 - StudentFormModal 사용 */}
      <StudentFormModal
        open={isConsultationModalOpen}
        onOpenChange={(open) => {
          setIsConsultationModalOpen(open)
          // 모달이 닫힐 때 editingConsultation 초기화
          if (!open) {
            setEditingConsultation(null)
          }
        }}
        student={editingConsultation}
        onSuccess={async () => {
          await loadConsultations()
          await loadStats()
          setIsConsultationModalOpen(false)
          setEditingConsultation(null)
        }}
        isConsultationMode={true}
      />

      {/* 입학테스트 편집 모달 */}
      <TestModal
        open={isTestModalOpen}
        onOpenChange={(open) => {
          setIsTestModalOpen(open)
          // 모달이 닫힐 때 editingTest 초기화
          if (!open) {
            setEditingTest(null)
          }
        }}
        test={editingTest}
        onSave={handleTestSave}
        onStatusChange={() => {
          loadConsultations()
          loadStats()
        }}
      />

      {/* 학생 상세 정보 모달 */}
      <StudentDetailModal
        isOpen={isStudentDetailModalOpen}
        onClose={() => {
          setIsStudentDetailModalOpen(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
      />
      
      {/* 학생 정보 수정 모달 (등록 결정 시) */}
      <StudentFormModal
        open={isStudentFormModalOpen}
        onOpenChange={setIsStudentFormModalOpen}
        student={editingStudentForTest}
        onSuccess={handleStudentFormSuccess}
      />
      
      {/* 반 등록 모달 */}
      <ClassFormModal
        open={isClassFormModalOpen}
        onClose={() => {
          setIsClassFormModalOpen(false)
          setNewlyEnrolledStudent(null)
        }}
        teachers={teachers}
        students={allStudents}
        mode="create"
        initialData={newlyEnrolledStudent ? {
          name: '',
          subject: '',
          teacher_id: '',
          selectedStudentIds: [newlyEnrolledStudent.id]
        } : undefined}
      />
        </TabsContent>

        <TabsContent value="students" className="mt-6">
          <StudentManagementTab employeeId={employeeId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
