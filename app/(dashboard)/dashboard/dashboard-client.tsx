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
import { createClient } from "@/lib/supabase/client"
import { calendarService } from "@/services/calendar"
import { getKoreanMonthRange, getKoreanDateString, getKoreanDateTimeString, parseKoreanDateTime } from "@/lib/utils"
import type { Database } from "@/types/database"
import { toast } from "sonner"

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

export default function DashboardClient() {
  const supabase = createClient()
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

  // 나머지 코드들...
  // (handleCreateTest, cleanObj, handleConsultationSave 등 모든 함수들을 그대로 복사)

  // 인증 상태 초기화 및 리스너 설정
  useEffect(() => {
    // 초기 세션 가져오기
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setCurrentUser(session.user)
          console.log('User authenticated:', session.user.email)
        } else {
          console.log('No session found')
        }
      } catch (error) {
        console.error('Session init error:', error)
      }
    }
    
    initSession()
    
    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event)
      if (session?.user) {
        setCurrentUser(session.user)
      } else {
        setCurrentUser(null)
      }
    })
    
    return () => subscription.unsubscribe()
  }, [supabase.auth])

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

  // 나머지 JSX 반환 부분도 그대로 복사...
  return (
    <div className="space-y-6">
      {/* 여기에 기존 대시보드 JSX 전체 복사 */}
    </div>
  )
}