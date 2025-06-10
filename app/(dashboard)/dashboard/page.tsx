'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Calendar, Phone, GraduationCap, TrendingUp, Users, Edit, Trash2 } from "lucide-react"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
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
  const [consultations, setConsultations] = useState<ConsultationData[]>([])
  const [entranceTests, setEntranceTests] = useState<EntranceTestData[]>([])
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

  // 통계 데이터 로딩
  const loadStats = async () => {
    try {
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1
      const monthStart = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear
      const monthEnd = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`

      console.log('날짜 범위:', { monthStart, monthEnd })

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

      console.log('이번달 신규상담:', consultationsData)

      // 이번달 입학테스트 (test_date 기준) - 수정됨
      const { data: testsData } = await supabase
        .from('entrance_tests')
        .select('*')
        .gte('test_date', monthStart)
        .lt('test_date', monthEnd)

      console.log('이번달 입학테스트:', testsData)

      // 이번달 신규등원 (start_date 기준)
      const { data: newEnrollments } = await supabase
        .from('students')
        .select('*')
        .gte('start_date', monthStart)
        .lt('start_date', monthEnd)
        .eq('status', '재원')

      // 이번달 퇴원 (end_date 기준)
      const { data: withdrawals } = await supabase
        .from('students')
        .select('*')
        .gte('end_date', monthStart)
        .lt('end_date', monthEnd)
        .eq('status', '퇴원')

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
      console.log('신규상담 데이터:', data)
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

      console.log('입학테스트 데이터 (신규상담만):', testsWithNames)
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
      
      // 데이터 새로고침
      loadEntranceTests()
      loadStats()
      
      // 상담 상태는 그대로 두기 (신규상담 유지)
      loadConsultations()
    } catch (error) {
      console.error('입학테스트 생성 오류:', error)
    }
  }

  function cleanObj<T extends object>(obj: T): T {
    // undefined 속성 제거
    return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined)) as T
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
      
      // 모든 데이터 새로고침 (상태 변경 시 입학테스트 목록도 업데이트)
      await Promise.all([
        loadConsultations(),
        loadStats(),
        loadEntranceTests() // 입학테스트 목록도 새로고침
      ])
      
      setIsConsultationModalOpen(false)
      setEditingConsultation(null)
      
      // 상태 변경 알림 (신규상담 -> 다른 상태로 변경 시)
      if (originalStatus === '신규상담' && newStatus !== '신규상담') {
        console.log(`학생 상태 변경: ${originalStatus} -> ${newStatus}, 입학테스트 목록에서 제거됨`)
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
      loadConsultations()
      loadStats()
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
      loadEntranceTests()
      loadStats()
    } catch (error) {
      console.error('입학테스트 삭제 오류:', error)
    }
  }

  const handleTestSave = async (testData: Partial<EntranceTestData>) => {
    try {
      console.log('저장할 데이터:', testData)
      console.log('편집 중인 테스트:', editingTest)
      
      const cleanData = cleanObj(testData)
      console.log('정리된 데이터:', cleanData)
      
      if (editingTest) {
        const { data, error } = await supabase
          .from('entrance_tests')
          .update(cleanData)
          .eq('id', editingTest.id)
          .select()
        
        console.log('Supabase 응답:', { data, error })
        
        if (error) {
          console.error('Supabase 에러 상세:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          throw error
        }
        
        loadEntranceTests()
        loadStats()
        setIsTestModalOpen(false)
        setEditingTest(null)
      }
    } catch (error) {
      console.error('입학테스트 저장 오류:', error)
      alert('저장 중 오류가 발생했습니다: ' + (error as any)?.message || '알 수 없는 오류')
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        loadStats(),
        loadConsultations(),
        loadEntranceTests()
      ])
      setLoading(false)
    }
    
    loadData()
    
    // 실시간 데이터 동기화를 위한 인터벌 (30초마다)
    const interval = setInterval(() => {
      console.log('대시보드 데이터 자동 새로고침')
      Promise.all([
        loadStats(),
        loadConsultations(),
        loadEntranceTests()
      ])
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "테스트고민": case "prospect": return "bg-yellow-100 text-yellow-800"
      case "테스트예정": return "bg-blue-100 text-blue-800"
      case "테스트완료": case "결과상담대기": return "bg-green-100 text-green-800"
      case "상담대기": case "상담중": return "bg-orange-100 text-orange-800"
      case "상담후고민": return "bg-purple-100 text-purple-800"
      case "재원결정": case "재원": return "bg-green-100 text-green-800"
      case "미등록결정": case "퇴원": return "bg-red-100 text-red-800"
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
      <div className="grid gap-3 grid-cols-5">
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
      <div className="grid gap-4 grid-cols-2">
        {/* 왼쪽: 신규상담 목록 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>신규상담 관리</CardTitle>
                <CardDescription>상담 진행 중인 학생들을 관리합니다</CardDescription>
              </div>
              <Button
                onClick={() => {
                  setEditingConsultation(null)
                  setIsConsultationModalOpen(true)
                }}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                신규 학생 등록
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {consultations.map((consultation) => (
                <div key={consultation.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{consultation.name}</span>
                      <Badge className={getStatusColor(consultation.status)}>
                        {consultation.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      📞 {consultation.parent_phone}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      🏫 {consultation.school} · {consultation.grade}학년
                    </div>
                    {consultation.notes && (
                      <div className="text-sm text-blue-600">
                        💡 {consultation.notes}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingConsultation(consultation)
                        setIsConsultationModalOpen(true)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleConsultationDelete(consultation.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleCreateTest(consultation.id)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {consultations.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  신규상담 데이터가 없습니다
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 오른쪽: 입학테스트 상세정보 */}
        <Card>
          <CardHeader>
            <CardTitle>입학테스트 관리</CardTitle>
            <CardDescription>입학테스트 일정 및 결과를 관리합니다</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {entranceTests.map((test) => (
                <div key={test.id} className="p-3 border rounded-lg">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{test.student_name}</span>
                      <div className="flex gap-2">
                        <Badge className={getStatusColor(test.status || '')}>
                          {test.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingTest(test)
                            setIsTestModalOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleTestDelete(test.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {test.test_date && (
                      <div className="text-sm text-muted-foreground">
                        📅 {new Date(test.test_date).toLocaleString('ko-KR')}
                      </div>
                    )}
                    
                    {test.test1_level && (
                      <div className="text-sm text-muted-foreground">
                        📚 테스트 과목: {test.test1_level}
                        {test.test2_level && `, ${test.test2_level}`}
                      </div>
                    )}
                    
                    {(test.test1_score !== null || test.test2_score !== null) && (
                      <div className="text-sm text-muted-foreground">
                        📊 점수: 
                        {test.test1_score !== null && ` 1차: ${test.test1_score}점`}
                        {test.test2_score !== null && ` 2차: ${test.test2_score}점`}
                      </div>
                    )}
                    
                    {test.test_result && (
                      <div className="text-sm">
                        🎯 결과: <Badge variant={test.test_result === '합격' ? 'default' : 'destructive'}>
                          {test.test_result}
                        </Badge>
                      </div>
                    )}
                    
                    {test.recommended_class && (
                      <div className="text-sm text-blue-600">
                        💡 추천반: {test.recommended_class}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {entranceTests.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  신규상담에서 + 버튼을 눌러 입학테스트를 등록해주세요
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 하단: 구글 캘린더 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            학원 일정
          </CardTitle>
          <CardDescription>구글 캘린더 연동 - 일정 보기</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[600px] border rounded-lg overflow-hidden">
            <iframe
              src="https://calendar.google.com/calendar/embed?height=600&wkst=1&bgcolor=%23ffffff&ctz=Asia%2FSeoul&src=c_6edb93aebb85915e7af73ada65813638d47da235dc6a0a758ebb596357fb9a64%40group.calendar.google.com&color=%23039BE5&mode=AGENDA"
              width="100%"
              height="600"
              frameBorder="0"
              scrolling="no"
              className="rounded-lg"
            />
          </div>
        </CardContent>
      </Card>

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
    first_contact_date: new Date().toISOString().split('T')[0],
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
        first_contact_date: new Date().toISOString().split('T')[0],
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
  onSave
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  test: EntranceTestData | null
  onSave: (data: Partial<EntranceTestData>) => void
}) {
  const [formData, setFormData] = useState({
    test_date: '',
    test1_level: '',
    test2_level: '',
    test1_score: '',
    test2_score: '',
    status: '테스트예정',
    test_result: '',
    recommended_class: '',
    notes: ''
  })

  useEffect(() => {
    if (test) {
      console.log('편집할 테스트 데이터:', test)
      
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
      
      setFormData({
        test_date: test.test_date ? new Date(test.test_date).toISOString().slice(0, 16) : '',
        test1_level: test.test1_level || '',
        test2_level: test2LevelValue,
        test1_score: test.test1_score?.toString() || '',
        test2_score: test.test2_score?.toString() || '',
        status: test.status || '테스트예정',
        test_result: testResultValue,
        recommended_class: test.recommended_class || '',
        notes: test.notes || ''
      })
      
      console.log('설정된 formData:', {
        test_result: testResultValue,
        test2_level: test2LevelValue,
        original_test_result: test.test_result,
        original_test2_level: test.test2_level
      })
    }
  }, [test, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // test2_level과 test_result에서 특수 값 처리
    const processedTest2Level = formData.test2_level === 'none' ? null : formData.test2_level
    const processedTestResult = formData.test_result === 'pending' ? null : formData.test_result
    
    const submitData: any = {
      test_date: formData.test_date ? formData.test_date : null,
      test1_level: formData.test1_level || null,
      test2_level: processedTest2Level,
      test1_score: formData.test1_score ? parseInt(formData.test1_score) : null,
      test2_score: formData.test2_score ? parseInt(formData.test2_score) : null,
      status: formData.status,
      test_result: processedTestResult,
      recommended_class: formData.recommended_class || null,
      notes: formData.notes || null
    }
    
    console.log('폼에서 전달할 데이터:', submitData)
    onSave(submitData)
  }

  const testLevels = [
    '초3-1', '초3-2', '초4-1', '초4-2', '초5-1', '초5-2', 
    '초6-1', '초6-2', '중1-1', '중1-2', '중2-1', '중2-2', 
    '중3-1', '중3-2', '공통수학1', '공통수학2', '대수', '미적분', '확통'
  ]

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
            <div>
              <Label htmlFor="test_date">테스트 일시</Label>
              <Input
                id="test_date"
                type="datetime-local"
                value={formData.test_date}
                onChange={(e) => setFormData({ ...formData, test_date: e.target.value })}
              />
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
              <Input
                id="recommended_class"
                value={formData.recommended_class}
                onChange={(e) => setFormData({ ...formData, recommended_class: e.target.value })}
                placeholder="추천반 입력"
              />
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
