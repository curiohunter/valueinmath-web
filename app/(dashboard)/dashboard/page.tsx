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
import { Plus, Calendar, Phone, GraduationCap, TrendingUp, Users, Edit, Trash2 } from "lucide-react"
import DashboardCalendar from "@/components/dashboard/DashboardCalendar"
import ConsultationCard from "@/components/dashboard/ConsultationCard"
import EntranceTestCard from "@/components/dashboard/EntranceTestCard"
import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { calendarService } from "@/services/calendar"
import { getKoreanMonthRange, getKoreanDateString, getKoreanDateTimeString, parseKoreanDateTime } from "@/lib/utils"
import type { Database } from "@/types/database"

type Student = Database['public']['Tables']['students']['Row']
type EntranceTest = Database['public']['Tables']['entrance_tests']['Row']

interface ConsultationData extends Student {
  // students 테이블에서 status가 '신규상담' 관련인 것들
}

interface EntranceTestData extends EntranceTest {
  student_name?: string
}

interface DashboardStats {
  activeStudents: number
  activeStudentsChange: string
  consultationsThisMonth: number
  consultationsByDept: { [key: string]: number }
  testsThisMonth: number
  testConversionRate: string
  newEnrollmentsThisMonth: number
  enrollmentConversionRate: string
  withdrawalsThisMonth: number
}

export default function DashboardPage() {
  const supabase = createClientComponentClient<Database>()
  const [consultations, setConsultations] = useState<ConsultationData[]>([])
  const [entranceTests, setEntranceTests] = useState<EntranceTestData[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [stats, setStats] = useState<DashboardStats>({
    activeStudents: 0,
    activeStudentsChange: "+0%",
    consultationsThisMonth: 0,
    consultationsByDept: {},
    testsThisMonth: 0,
    testConversionRate: "0%",
    newEnrollmentsThisMonth: 0,
    enrollmentConversionRate: "0%",
    withdrawalsThisMonth: 0
  })
  const [loading, setLoading] = useState(true)
  const [editingConsultation, setEditingConsultation] = useState<ConsultationData | null>(null)
  const [editingTest, setEditingTest] = useState<EntranceTestData | null>(null)
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false)
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const [expandedConsultations, setExpandedConsultations] = useState<Set<string>>(new Set())
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set())

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


      // 재원생 수
      const { data: activeStudents } = await supabase
        .from('students')
        .select('*')
        .eq('status', '재원')

      // 이번달 신규상담 (first_contact_date 기준) - 상태 무관하게 수정
      const { data: consultationsData } = await supabase
        .from('students')
        .select('*')
        .gte('first_contact_date', monthStart)
        .lt('first_contact_date', monthEnd)


      // 이번달 입학테스트 (test_date 기준) - 수정됨
      const { data: testsData } = await supabase
        .from('entrance_tests')
        .select('*')
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

      if (withdrawalError) {
        console.error('퇴원 쿼리 에러:', withdrawalError)
      }

      // 퇴원 학생들의 상세 정보 로그
      if (withdrawals && withdrawals.length > 0) {
        // 퇴원 학생 데이터 처리 (로그 제거됨)
      }

      // 부서별 상담 분류
      const consultationsByDept: { [key: string]: number } = {}
      consultationsData?.forEach(consultation => {
        const dept = consultation.department || '미분류'
        consultationsByDept[dept] = (consultationsByDept[dept] || 0) + 1
      })

      // 전환율 계산
      const testConversionRate = consultationsData && consultationsData.length > 0
        ? ((testsData?.length || 0) / consultationsData.length * 100).toFixed(1)
        : "0"

      const enrollmentConversionRate = consultationsData && consultationsData.length > 0
        ? ((newEnrollments?.length || 0) / consultationsData.length * 100).toFixed(1)
        : "0"

      setStats({
        activeStudents: activeStudents?.length || 0,
        activeStudentsChange: "+2%", // 이건 별도 계산 필요
        consultationsThisMonth: consultationsData?.length || 0,
        consultationsByDept,
        testsThisMonth: testsData?.length || 0,
        testConversionRate: `${testConversionRate}%`,
        newEnrollmentsThisMonth: newEnrollments?.length || 0,
        enrollmentConversionRate: `${enrollmentConversionRate}%`,
        withdrawalsThisMonth: withdrawals?.length || 0
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
        .limit(10)

      if (error) throw error
      setConsultations(data || [])
    } catch (error) {
      console.error('신규상담 데이터 로딩 오류:', error)
    }
  }

  // 입학테스트 데이터 로딩 - 신규상담 상태인 학생만
  const loadEntranceTests = async () => {
    try {
      const { data, error } = await supabase
        .from('entrance_tests')
        .select(`
          *,
          students!consultation_id (
            name,
            status
          )
        `)
        .order('test_date', { ascending: true })
        .limit(20) // 좌더 많이 가져와서 필터링

      if (error) throw error
      
      // 신규상담 상태인 학생의 테스트만 필터링
      const testsWithNames = data?.filter(test => {
        const student = test.students as any
        return student && student.status === '신규상담'
      }).map(test => ({
        ...test,
        student_name: (test.students as any)?.name || '이름 없음'
      })).slice(0, 10) || [] // 최대 10개만 표시

      setEntranceTests(testsWithNames)
    } catch (error) {
      console.error('입학테스트 데이터 로딩 오류:', error)
    }
  }

  // 입학테스트 생성
  const handleCreateTest = async (consultationId: string) => {
    try {
      const { data, error } = await supabase
        .from('entrance_tests')
        .insert({
          consultation_id: consultationId,
          status: '테스트예정'
        })
        .select()

      if (error) throw error
      
      // 입학테스트 생성 후 필요한 데이터만 새로고침
      await loadStats() // 통계 업데이트
      await loadEntranceTests() // 테스트 목록 업데이트
    } catch (error) {
      console.error('입학테스트 생성 오류:', error)
    }
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
      const cleanData = {
        ...cleanObj(consultationData),
        name: consultationData.name ?? '',
        parent_phone: consultationData.parent_phone ?? '',
        school: consultationData.school ?? '',
        grade: consultationData.grade ?? 1,
        department: consultationData.department ?? '',
        lead_source: consultationData.lead_source ?? '',
        status: consultationData.status ?? '신규상담',
        notes: consultationData.notes ?? '',
        first_contact_date: consultationData.first_contact_date ?? new Date().toISOString().split('T')[0]
      }
      
      const originalStatus = editingConsultation?.status
      const newStatus = cleanData.status
      
      if (editingConsultation) {
        const { error } = await supabase
          .from('students')
          .update(cleanData)
          .eq('id', editingConsultation.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('students')
          .insert(cleanData)
        if (error) throw error
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
      }
    } catch (error) {
      console.error('신규상담 저장 오류:', error)
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
      const { error } = await supabase
        .from('entrance_tests')
        .delete()
        .eq('id', id)
      if (error) throw error
      await loadStats() // 통계 업데이트
      await loadEntranceTests() // 테스트 목록 업데이트
    } catch (error) {
      console.error('입학테스트 삭제 오류:', error)
    }
  }

  const handleTestSave = async (testData: Partial<EntranceTestData>) => {
    try {
      
      // test_result가 빈 문자열이면 null로 변환
      const cleanedTestData = {
        ...testData,
        // @ts-ignore - test_result 타입 이슈 임시 해결
        test_result: (testData as any).test_result === '' ? null : (testData as any).test_result
      }
      
      const cleanData = cleanObj(cleanedTestData)
      
      if (editingTest) {
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
        
        await loadStats() // 통계만 업데이트
        await loadEntranceTests() // 테스트 목록 업데이트
        setIsTestModalOpen(false)
        setEditingTest(null)
      }
    } catch (error) {
      console.error('입학테스트 저장 오류:', error)
      alert('저장 중 오류가 발생했습니다: ' + (error as any)?.message || '알 수 없는 오류')
    }
  }

  // 캘린더 일정 등록
  const handleCreateCalendarEvent = async (test: EntranceTestData) => {
    
    if (!test.test_date) {
      alert('테스트 정보가 없습니다.')
      return
    }
    
    try {
      // 기존 Google Calendar 일정이 있는지 확인
      if (test.google_calendar_id) {
        // 기존 일정 업데이트
        const updateConfirm = confirm('이미 등록된 일정이 있습니다. 기존 일정을 업데이트하시겠습니까?')
        if (!updateConfirm) {
          return
        }
        
        // 먼저 기존 calendar_events에서 해당 Google Calendar ID를 가진 이벤트 찾기
        const { data: existingCalendarEvent } = await supabase
          .from('calendar_events')
          .select('id')
          .eq('google_calendar_id', test.google_calendar_id)
          .single()
        
        if (existingCalendarEvent) {
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
          await calendarService.updateEvent(existingCalendarEvent.id, updateData)
          
          alert('캘린더 일정이 업데이트되었습니다.')
          
          // 통계만 업데이트 (일정 업데이트 후)
          await loadStats()
          window.dispatchEvent(new CustomEvent('refreshCalendar'))
          
          return
        }
      }
      
      // 중복 등록 방지 - 이미 등록된 일정이 있는지 확인 (Google Calendar ID가 없는 경우)
      const { data: existingEvents } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('event_type', 'entrance_test')
        .ilike('description', `%${test.student_name || '학생'}%`)
        .gte('start_time', test.test_date.slice(0, 10)) // 같은 날짜
        .lt('start_time', test.test_date.slice(0, 10) + 'T23:59:59')
      
      if (existingEvents && existingEvents.length > 0) {
        alert('해당 학생의 입학테스트 일정이 이미 등록되어 있습니다.')
        return
      }

      const studentName = test.student_name || '학생'
      const subjects = []
      if (test.test1_level) subjects.push(test.test1_level)
      if (test.test2_level) subjects.push(test.test2_level)
      
      const title = `${studentName} ${subjects.join(', ')}`
      
      // 시간 형식을 통일하여 처리 (한국시간으로 저장)
      let startTime = test.test_date
      if (startTime.includes('+')) {
        // 이미 시간대가 있는 경우 그대로 사용
        startTime = test.test_date
      } else {
        // 시간대가 없는 경우 한국시간으로 처리
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
        event_type: 'entrance_test',
        description: `입학테스트 - ${studentName}`
      }
      
      
      // calendarService를 사용하여 Google Calendar 연동 포함한 이벤트 생성
      const response = await calendarService.createEvent(eventData)
      
      
      // Google Calendar ID가 있으면 entrance_tests 테이블에도 저장
      if (response.google_calendar_id) {
        try {
          const { error: updateError } = await supabase
            .from('entrance_tests')
            .update({ google_calendar_id: response.google_calendar_id })
            .eq('id', test.id)
          
          if (updateError) {
            console.error('entrance_tests 테이블 Google Calendar ID 업데이트 실패:', updateError)
          } else {
          }
        } catch (error) {
          console.error('entrance_tests 테이블 업데이트 중 오류:', error)
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
  
  // 등록 결정
  const handleEnrollmentDecision = async (testId: number, status: '재원' | '미등록') => {
    try {
      // 입학테스트에서 consultation_id 찾기
      const { data: testData, error: testError } = await supabase
        .from('entrance_tests')
        .select('consultation_id')
        .eq('id', testId)
        .single()
      
      if (testError || !testData?.consultation_id) {
        alert('학생 정보를 찾을 수 없습니다.')
        return
      }
      
      const { error } = await supabase
        .from('students')
        .update({ status })
        .eq('id', testData.consultation_id)
      
      if (error) throw error
      
      alert(`학생 상태가 '${status}'로 변경되었습니다.`)
      await loadStats() // 통계 업데이트
      await loadConsultations() // 상담 목록 업데이트
    } catch (error) {
      console.error('상태 변경 오류:', error)
      alert('상태 변경 중 오류가 발생했습니다.')
    }
  }

  // 사용자 인증 상태 초기화
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setCurrentUser(session.user)
        } else {
        }
      } catch (error) {
        console.error('인증 초기화 오류:', error)
      }
    }
    
    initAuth()
    
    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setCurrentUser(session.user)
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null)
      }
    })
    
    return () => subscription.unsubscribe()
  }, [])

  // 모든 데이터 새로고침 함수
  const refreshAllData = async () => {
    await Promise.all([
      loadStats(),
      loadConsultations(),
      loadEntranceTests()
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
      {/* 상단 5개 카드 - 수정된 그리드 */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {/* 재원생 */}
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">재원생</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeStudents}명</div>
          </CardContent>
        </Card>

        {/* 이번달 신규상담 */}
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번달 신규상담</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.consultationsThisMonth}건</div>
            <div className="text-xs text-muted-foreground space-y-1">
              {Object.entries(stats.consultationsByDept).map(([dept, count]) => (
                <div key={dept}>{dept}: {count}건</div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 이번달 입학테스트 */}
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번달 입학테스트</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.testsThisMonth}건</div>
            <p className="text-xs text-muted-foreground">전환율: {stats.testConversionRate}</p>
          </CardContent>
        </Card>

        {/* 이번달 신규등원 */}
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번달 신규등원</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newEnrollmentsThisMonth}명</div>
            <p className="text-xs text-muted-foreground">전환율: {stats.enrollmentConversionRate}</p>
          </CardContent>
        </Card>

        {/* 이번달 퇴원 */}
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번달 퇴원</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground rotate-180" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withdrawalsThisMonth}명</div>
          </CardContent>
        </Card>
      </div>

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
            <div className="space-y-2">
              {consultations.map((consultation) => (
                <ConsultationCard
                  key={consultation.id}
                  student={consultation}
                  isExpanded={expandedConsultations.has(consultation.id)}
                  onToggle={() => {
                    const newExpanded = new Set(expandedConsultations)
                    if (newExpanded.has(consultation.id)) {
                      newExpanded.delete(consultation.id)
                    } else {
                      newExpanded.add(consultation.id)
                    }
                    setExpandedConsultations(newExpanded)
                  }}
                  onEdit={() => {
                    setEditingConsultation(consultation)
                    setIsConsultationModalOpen(true)
                  }}
                  onDelete={() => handleConsultationDelete(consultation.id)}
                  onCreateTest={handleCreateTest}
                />
              ))}
              
              {consultations.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  신규상담 데이터가 없습니다
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 오른쪽: 입학테스트 상세정보 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">입학테스트 관리</CardTitle>
            <CardDescription className="text-xs">입학테스트 일정 및 결과를 관리합니다</CardDescription>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="space-y-2">
              {entranceTests.map((test) => (
                <EntranceTestCard
                  key={test.id}
                  entranceTest={test}
                  isExpanded={expandedTests.has(test.id.toString())}
                  onToggle={() => {
                    const newExpanded = new Set(expandedTests)
                    const testId = test.id.toString()
                    if (newExpanded.has(testId)) {
                      newExpanded.delete(testId)
                    } else {
                      newExpanded.add(testId)
                    }
                    setExpandedTests(newExpanded)
                  }}
                  onEdit={() => {
                    setEditingTest(test)
                    setIsTestModalOpen(true)
                  }}
                  onDelete={() => handleTestDelete(test.id)}
                  onCreateCalendarEvent={handleCreateCalendarEvent}
                  onEnrollmentDecision={handleEnrollmentDecision}
                />
              ))}
              
              {entranceTests.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  신규상담에서 + 버튼을 눌러 입학테스트를 등록해주세요
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 하단: 학원 일정 캘린더 */}
      <DashboardCalendar />

      {/* 신규상담 편집 모달 */}
      <ConsultationModal
        open={isConsultationModalOpen}
        onOpenChange={setIsConsultationModalOpen}
        consultation={editingConsultation}
        onSave={handleConsultationSave}
      />

      {/* 입학테스트 편집 모달 */}
      <TestModal
        open={isTestModalOpen}
        onOpenChange={setIsTestModalOpen}
        test={editingTest}
        onSave={handleTestSave}
        onStatusChange={() => {
          loadConsultations()
          loadStats()
        }}
      />
    </div>
  )
}

// 신규상담 편집 모달 컴포넌트
function ConsultationModal({
  open,
  onOpenChange,
  consultation,
  onSave
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  consultation: ConsultationData | null
  onSave: (data: Partial<ConsultationData>) => void
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [endDateError, setEndDateError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    student_phone: '',
    parent_phone: '',
    school: '',
    school_type: '',
    grade: 1,
    department: '',
    lead_source: '',
    status: '신규상담',
    has_sibling: false,
    start_date: '',
    end_date: '',
    first_contact_date: getKoreanDateString(),
    notes: ''
  })

  useEffect(() => {
    if (consultation) {
      setFormData({
        name: consultation.name || '',
        student_phone: consultation.student_phone || '',
        parent_phone: consultation.parent_phone || '',
        school: consultation.school || '',
        school_type: consultation.school_type || '',
        grade: consultation.grade || 1,
        department: consultation.department || '',
        lead_source: consultation.lead_source || '',
        status: consultation.status || '신규상담',
        has_sibling: consultation.has_sibling || false,
        start_date: consultation.start_date?.split('T')[0] || '',
        end_date: consultation.end_date?.split('T')[0] || '',
        first_contact_date: consultation.first_contact_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        notes: consultation.notes || ''
      })
      setEndDateError(null)
    } else {
      setFormData({
        name: '',
        student_phone: '',
        parent_phone: '',
        school: '',
        school_type: '',
        grade: 1,
        department: '',
        lead_source: '',
        status: '신규상담',
        has_sibling: false,
        start_date: '',
        end_date: '',
        first_contact_date: getKoreanDateString(),
        notes: ''
      })
      setEndDateError(null)
    }
  }, [consultation, open])

  // 상태가 변경될 때 종료일 에러 초기화
  useEffect(() => {
    if (formData.status !== "퇴원") {
      setEndDateError(null)
    }
  }, [formData.status])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 퇴원 상태일 때 종료일 필수 검증
    if (formData.status === "퇴원" && !formData.end_date) {
      setEndDateError("퇴원 상태인 경우 종료일을 입력해야 합니다")
      return
    }

    setIsSubmitting(true)
    try {
      // 퇴원 처리 시 날짜 저장 로그 추가
      if (formData.status === '퇴원' && formData.end_date) {
        // 퇴원 처리 로직 (로그 제거됨)
      }

      // 데이터 처리
      const submitData = {
        name: formData.name,
        student_phone: formData.student_phone || null,
        parent_phone: formData.parent_phone || null,
        school: formData.school || null,
        school_type: formData.school_type || null,
        grade: formData.grade,
        department: formData.department || null,
        lead_source: formData.lead_source || null,
        status: formData.status,
        has_sibling: formData.has_sibling,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        first_contact_date: formData.first_contact_date || null,
        notes: formData.notes || null
      }
      
      await onSave(submitData)
    } catch (error) {
      console.error('신규상담 저장 오류:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{consultation ? '신규상담 수정' : '신규상담 추가'}</DialogTitle>
          <DialogDescription>
            {consultation ? '학생의 신규상담 정보를 수정하세요.' : '새로운 학생을 등록하세요. 모든 필수 정보를 입력해주세요.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 기본 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">기본 정보</h3>
              
              <div>
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  placeholder="홍길동"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="student_phone">학생 연락처</Label>
                <Input
                  id="student_phone"
                  placeholder="01012345678"
                  value={formData.student_phone}
                  onChange={(e) => setFormData({ ...formData, student_phone: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="parent_phone">학부모 연락처</Label>
                <Input
                  id="parent_phone"
                  placeholder="01012345678"
                  value={formData.parent_phone}
                  onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="status">상태 *</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="상태 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="재원">재원</SelectItem>
                    <SelectItem value="퇴원">퇴원</SelectItem>
                    <SelectItem value="휴원">휴원</SelectItem>
                    <SelectItem value="미등록">미등록</SelectItem>
                    <SelectItem value="신규상담">신규상담</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="department">담당관</Label>
                <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="담당관 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="고등관">고등관</SelectItem>
                    <SelectItem value="중등관">중등관</SelectItem>
                    <SelectItem value="영재관">영재관</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="has_sibling"
                  checked={formData.has_sibling}
                  onChange={(e) => setFormData({ ...formData, has_sibling: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="has_sibling">형제자매 여부</Label>
              </div>
            </div>

            {/* 학교 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">학교 정보</h3>
              
              <div>
                <Label htmlFor="school">학교</Label>
                <Input
                  id="school"
                  placeholder="OO중"
                  value={formData.school}
                  onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="school_type">학교 유형</Label>
                <Select value={formData.school_type} onValueChange={(value) => setFormData({ ...formData, school_type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="학교 유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="초등학교">초등학교</SelectItem>
                    <SelectItem value="중학교">중학교</SelectItem>
                    <SelectItem value="고등학교">고등학교</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="grade">학년</Label>
                <Select value={formData.grade.toString()} onValueChange={(value) => setFormData({ ...formData, grade: parseInt(value) })}>
                  <SelectTrigger>
                    <SelectValue placeholder="학년 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1학년</SelectItem>
                    <SelectItem value="2">2학년</SelectItem>
                    <SelectItem value="3">3학년</SelectItem>
                    <SelectItem value="4">4학년</SelectItem>
                    <SelectItem value="5">5학년</SelectItem>
                    <SelectItem value="6">6학년</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="lead_source">유입경로</Label>
                <Select value={formData.lead_source} onValueChange={(value) => setFormData({ ...formData, lead_source: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="유입경로 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="블로그">블로그</SelectItem>
                    <SelectItem value="입소문">입소문</SelectItem>
                    <SelectItem value="전화상담">전화상담</SelectItem>
                    <SelectItem value="원외학부모추천">원외학부모추천</SelectItem>
                    <SelectItem value="원내학부모추천">원내학부모추천</SelectItem>
                    <SelectItem value="원내친구추천">원내친구추천</SelectItem>
                    <SelectItem value="원외친구추천">원외친구추천</SelectItem>
                    <SelectItem value="오프라인">오프라인</SelectItem>
                    <SelectItem value="형제">형제</SelectItem>
                    <SelectItem value="문자메세지">문자메세지</SelectItem>
                    <SelectItem value="부원장">부원장</SelectItem>
                    <SelectItem value="맘까페">맘까페</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 날짜 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">날짜 정보</h3>
              
              <div>
                <Label htmlFor="start_date">시작일</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="end_date">종료일 {formData.status === "퇴원" && <span className="text-red-500">*</span>}</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => {
                    setFormData({ ...formData, end_date: e.target.value })
                    if (formData.status === "퇴원") {
                      setEndDateError(null)
                    }
                  }}
                  className={endDateError ? "border-red-500" : ""}
                />
                {endDateError && (
                  <p className="text-sm text-red-500 mt-1">{endDateError}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="first_contact_date">최초상담일</Label>
                <Input
                  id="first_contact_date"
                  type="date"
                  value={formData.first_contact_date}
                  onChange={(e) => setFormData({ ...formData, first_contact_date: e.target.value })}
                />
              </div>
            </div>

            {/* 메모 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">추가 정보</h3>
              
              <div>
                <Label htmlFor="notes">메모</Label>
                <Textarea
                  id="notes"
                  placeholder="학생에 대한 추가 정보를 입력하세요."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="min-h-[120px]"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '처리 중...' : consultation ? '수정' : '등록'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// 입학테스트 편집 모달 컴포넌트
function TestModal({
  open,
  onOpenChange,
  test,
  onSave,
  onStatusChange
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  test: EntranceTestData | null
  onSave: (data: Partial<EntranceTestData>) => void
  onStatusChange?: () => void
}) {
  const supabase = createClientComponentClient<Database>()
  const [formData, setFormData] = useState({
    test_date: '',
    test_hour: '14',
    test_minute: '00',
    test1_level: '',
    test2_level: '',
    test1_score: '',
    test2_score: '',
    status: '테스트예정',
    test_result: '',
    recommended_class: '',
    notes: ''
  })
  
  const [classes, setClasses] = useState<{id: string, name: string}[]>([])
  
  // 시간 옵션 생성
  const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
  const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'))
  
  // 클래스 목록 가져오기
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('id, name')
          .order('name')
        
        if (error) throw error
        setClasses(data || [])
      } catch (error) {
        console.error('클래스 목록 로딩 오류:', error)
      }
    }
    
    if (open) {
      loadClasses()
    }
  }, [open])

  useEffect(() => {
    if (test) {
      
      // test_result 값 매칭 로직 수정
      let testResultValue = 'pending' // 기본값
      if (test.test_result === '합격') {
      testResultValue = '합격'
      } else if (test.test_result === '불합격') {
      testResultValue = '불합격'
      } else if (test.test_result === null || test.test_result === undefined) {
      testResultValue = 'pending'
    }
      
      // test2_level 값 매칭 로직 수정
      let test2LevelValue = 'none' // 기본값
      if (test.test2_level && test.test2_level.trim() !== '') {
        test2LevelValue = test.test2_level
      }
      
      // 날짜와 시간 분리
      let testDate = ''
      let testHour = '14'
      let testMinute = '00'
      
      if (test.test_date) {
        // 한국시간으로 직접 파싱
        const dateStr = test.test_date.slice(0, 19) // YYYY-MM-DDTHH:mm:ss 부분만
        testDate = dateStr.slice(0, 10) // YYYY-MM-DD
        testHour = dateStr.slice(11, 13) // HH
        testMinute = dateStr.slice(14, 16) // mm
        
        // 5분 단위로 반올림
        const roundedMinute = Math.round(parseInt(testMinute) / 5) * 5
        testMinute = roundedMinute.toString().padStart(2, '0')
        if (testMinute === '60') {
          testMinute = '00'
          testHour = (parseInt(testHour) + 1).toString().padStart(2, '0')
        }
      }
      
      setFormData({
        test_date: testDate,
        test_hour: testHour,
        test_minute: testMinute,
        test1_level: test.test1_level || '',
        test2_level: test2LevelValue,
        test1_score: test.test1_score !== null ? test.test1_score.toString() : '',
        test2_score: test.test2_score !== null ? test.test2_score.toString() : '',
        status: test.status || '테스트예정',
        test_result: testResultValue,
        recommended_class: test.recommended_class || '',
        notes: test.notes || ''
      })
    } else if (open && !test) {
      // 새 테스트 생성 시 기본값 설정
      const today = new Date()
      const defaultDate = today.toISOString().slice(0, 10)
      
      setFormData({
        test_date: defaultDate,
        test_hour: '14',
        test_minute: '00',
        test1_level: '',
        test2_level: '',
        test1_score: '',
        test2_score: '',
        status: '테스트예정',
        test_result: '',
        recommended_class: '',
        notes: ''
      })
    }
  }, [test, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // test2_level과 test_result에서 특수 값 처리
    const processedTest2Level = formData.test2_level === 'none' ? null : formData.test2_level
    const processedTestResult = formData.test_result === 'pending' || formData.test_result === '' ? null : formData.test_result
    
    const submitData: any = {
      test_date: formData.test_date ? `${formData.test_date}T${formData.test_hour}:${formData.test_minute}:00` : null,
      test1_level: formData.test1_level || null,
      test2_level: processedTest2Level,
      test1_score: formData.test1_score ? parseInt(formData.test1_score) : null,
      test2_score: formData.test2_score ? parseInt(formData.test2_score) : null,
      status: formData.status,
      test_result: processedTestResult,
      recommended_class: formData.recommended_class || null,
      notes: formData.notes || null
    }
    
    onSave(submitData)
  }

  const testLevels = [
    '초3-1', '초3-2', '초4-1', '초4-2', '초5-1', '초5-2', 
    '초6-1', '초6-2', '중1-1', '중1-2', '중2-1', '중2-2', 
    '중3-1', '중3-2', '공통수학1', '공통수학2', '대수', '미적분', '확통'
  ]
  
  // 캘린더 일정 등록
  const handleCreateCalendarEvent = async () => {
    if (!test || !formData.test_date) {
      alert('테스트 정보가 없습니다.')
      return
    }
    
    try {
      const studentName = test.student_name || '학생'
      const subjects = []
      if (formData.test1_level) subjects.push(formData.test1_level)
      if (formData.test2_level && formData.test2_level !== 'none') subjects.push(formData.test2_level)
      
      const title = `${studentName} ${subjects.join(', ')}`
      const startTime = `${formData.test_date}T${formData.test_hour}:${formData.test_minute}:00`
      
      // 2시간 후 종료시간 계산
      const endHour = (parseInt(formData.test_hour) + 2).toString().padStart(2, '0')
      const endTime = `${formData.test_date}T${endHour}:${formData.test_minute}:00`
      
      // 현재 사용자 정보 가져오기
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from('calendar_events')
        .insert({
          title,
          start_time: startTime,
          end_time: endTime,
          event_type: 'entrance_test',
          description: `입학테스트 - ${studentName}`,
          created_by: user?.id
        })
      
      if (error) throw error
      
      alert('캘린더에 일정이 등록되었습니다.')
    } catch (error) {
      console.error('캘린더 등록 오류:', error)
      alert('캘린더 등록 중 오류가 발생했습니다.')
    }
  }
  
  // 등록 결정
  const handleEnrollmentDecision = async (status: '재원' | '미등록') => {
    if (!test?.consultation_id) {
      alert('학생 정보가 없습니다.')
      return
    }
    
    try {
      const { error } = await supabase
        .from('students')
        .update({ status })
        .eq('id', test.consultation_id)
      
      if (error) throw error
      
      alert(`학생 상태가 '${status}'로 변경되었습니다.`)
      // 상담 목록 새로고침을 위해 부모 컴포넌트에 알림
      onOpenChange(false)
      if (onStatusChange) {
        onStatusChange()
      }
    } catch (error) {
      console.error('상태 변경 오류:', error)
      alert('상태 변경 중 오류가 발생했습니다.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>입학테스트 수정</DialogTitle>
          <DialogDescription>
            입학테스트 정보를 수정해주세요.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>테스트 일시</Label>
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-2">
                  <Input
                    type="date"
                    value={formData.test_date}
                    onChange={(e) => setFormData({ ...formData, test_date: e.target.value })}
                  />
                </div>
                <div>
                  <Select value={formData.test_hour} onValueChange={(value) => setFormData({ ...formData, test_hour: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOUR_OPTIONS.map((hour) => (
                        <SelectItem key={hour} value={hour}>
                          {hour}시
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select value={formData.test_minute} onValueChange={(value) => setFormData({ ...formData, test_minute: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MINUTE_OPTIONS.map((minute) => (
                        <SelectItem key={minute} value={minute}>
                          {minute}분
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="status">테스트 상태</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="테스트예정">테스트예정</SelectItem>
                  <SelectItem value="결과상담대기">결과상담대기</SelectItem>
                  <SelectItem value="결과상담완료">결과상담완료</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="test1_level">1차 테스트 레벨</Label>
              <Select value={formData.test1_level} onValueChange={(value) => setFormData({ ...formData, test1_level: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="레벨 선택" />
                </SelectTrigger>
                <SelectContent>
                  {testLevels.map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="test2_level">2차 테스트 레벨</Label>
              <Select value={formData.test2_level} onValueChange={(value) => setFormData({ ...formData, test2_level: value === "none" ? "" : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="레벨 선택 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">없음</SelectItem>
                  {testLevels.map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="test1_score">1차 점수</Label>
              <Input
                id="test1_score"
                type="number"
                min="0"
                max="100"
                value={formData.test1_score}
                onChange={(e) => setFormData({ ...formData, test1_score: e.target.value })}
                placeholder="점수 입력"
              />
            </div>
            <div>
              <Label htmlFor="test2_score">2차 점수</Label>
              <Input
                id="test2_score"
                type="number"
                min="0"
                max="100"
                value={formData.test2_score}
                onChange={(e) => setFormData({ ...formData, test2_score: e.target.value })}
                placeholder="점수 입력 (선택사항)"
              />
            </div>
            <div>
              <Label htmlFor="test_result">테스트 결과</Label>
              <Select value={formData.test_result} onValueChange={(value) => setFormData({ ...formData, test_result: value === "pending" ? "" : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="결과 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">미정</SelectItem>
                  <SelectItem value="합격">합격</SelectItem>
                  <SelectItem value="불합격">불합격</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="recommended_class">추천반</Label>
              <Select value={formData.recommended_class || 'none'} onValueChange={(value) => setFormData({ ...formData, recommended_class: value === 'none' ? '' : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="추천반 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">없음</SelectItem>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.name}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="notes">메모</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="테스트 관련 메모"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit">
              수정
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
