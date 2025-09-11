"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, TrendingUp, Activity, Brain, BookOpen, TestTube, Users, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { format, subMonths } from "date-fns"
import { TimelineFilters } from "@/components/analytics/student-timeline/timeline-filters"
import { TimelineDisplay } from "@/components/analytics/student-timeline/timeline-display"
import { TimelineLegend } from "@/components/analytics/student-timeline/timeline-legend"

interface TimelineData {
  date: string
  type: 'mathflat' | 'study_log' | 'test_log' | 'makeup' | 'consultation'
  title: string
  description?: string
  fullDescription?: string
  value?: number
  color: string
  icon: any
}

interface Student {
  id: string
  name: string
  status: string
  school_type: string
  grade: number
}

export default function StudentTimelinePage() {
  const [selectedStudent, setSelectedStudent] = useState<string>("")
  const [students, setStudents] = useState<Student[]>([])
  const [timelineData, setTimelineData] = useState<TimelineData[]>([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'month' | 'quarter' | 'semester'>('month')
  
  // 필터 상태
  const [statusFilter, setStatusFilter] = useState<string>('재원')
  const [gradeFilter, setGradeFilter] = useState<string>('전체')
  const [searchQuery, setSearchQuery] = useState<string>('')
  
  const supabase = createClient()

  // 색상 및 아이콘 매핑
  const dataTypeConfig = {
    mathflat: { color: 'bg-blue-500', lightColor: 'bg-blue-100', icon: Brain, label: '매쓰플랫' },
    study_log: { color: 'bg-green-500', lightColor: 'bg-green-100', icon: BookOpen, label: '학습일지' },
    test_log: { color: 'bg-purple-500', lightColor: 'bg-purple-100', icon: TestTube, label: '시험기록' },
    makeup: { color: 'bg-orange-500', lightColor: 'bg-orange-100', icon: Users, label: '보강수업' },
    consultation: { color: 'bg-red-500', lightColor: 'bg-red-100', icon: AlertCircle, label: '상담기록' }
  }

  // 학생 목록 로드 - 상태 필터에 따라
  useEffect(() => {
    loadStudents()
  }, [statusFilter])

  // 학생 선택 시 데이터 로드
  useEffect(() => {
    if (selectedStudent) {
      loadTimelineData()
    } else {
      setTimelineData([])
    }
  }, [selectedStudent, viewMode])

  const loadStudents = async () => {
    let query = supabase
      .from('students')
      .select('id, name, status, school_type, grade')
      .order('name')
    
    // 상태 필터 적용
    if (statusFilter && statusFilter !== '전체') {
      query = query.eq('status', statusFilter)
    }
    
    const { data } = await query
    
    if (data) {
      setStudents(data as Student[])
    }
  }
  
  // 학년 옵션 동적 생성
  const gradeOptions = useMemo(() => {
    const grades = ['전체']
    const gradeSet = new Set<string>()
    
    students.forEach(student => {
      if (student.school_type && student.grade) {
        // 학교 타입을 줄임말로 변환
        const schoolTypeShort = student.school_type.replace('등학교', '').substring(0, 1)
        const gradeLabel = `${schoolTypeShort}${student.grade}`
        gradeSet.add(gradeLabel)
      }
    })
    
    // 학년별 정렬 (초등학교 -> 중학교 -> 고등학교, 각각 학년 순)
    const sortedGrades = Array.from(gradeSet).sort((a, b) => {
      const schoolOrder: { [key: string]: number } = { '초': 0, '중': 1, '고': 2 }
      
      // 학교 타입 추출 (첫 글자)
      const aType = a[0]
      const bType = b[0]
      
      // 학년 추출 (숫자 부분)
      const aGrade = parseInt(a.substring(1))
      const bGrade = parseInt(b.substring(1))
      
      // 먼저 학교 타입으로 정렬
      const aSchoolOrder = schoolOrder[aType] ?? 999
      const bSchoolOrder = schoolOrder[bType] ?? 999
      
      if (aSchoolOrder !== bSchoolOrder) {
        return aSchoolOrder - bSchoolOrder
      }
      
      // 같은 학교 타입이면 학년으로 정렬
      return aGrade - bGrade
    })
    
    return [...grades, ...sortedGrades]
  }, [students])
  
  // 필터링된 학생 목록
  const filteredStudents = useMemo(() => {
    let filtered = [...students]
    
    // 학년 필터
    if (gradeFilter && gradeFilter !== '전체') {
      filtered = filtered.filter(student => {
        if (!student.school_type || !student.grade) return false
        const schoolTypeShort = student.school_type.replace('등학교', '').substring(0, 1)
        return `${schoolTypeShort}${student.grade}` === gradeFilter
      })
    }
    
    // 검색 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(student => 
        student.name.toLowerCase().includes(query)
      )
    }
    
    return filtered
  }, [students, gradeFilter, searchQuery])

  // 검색 결과가 1명일 때 자동 선택
  useEffect(() => {
    if (searchQuery && filteredStudents.length === 1) {
      // 현재 선택된 학생과 다른 경우에만 자동 선택
      if (selectedStudent !== filteredStudents[0].id) {
        setSelectedStudent(filteredStudents[0].id)
      }
    }
  }, [searchQuery, filteredStudents])

  const loadTimelineData = async () => {
    setLoading(true)
    
    // 날짜 범위 계산 (최근 기간)
    const today = new Date()
    let startDate
    const endDate = today
    
    if (viewMode === 'month') {
      startDate = subMonths(today, 1) // 최근 1개월
    } else if (viewMode === 'quarter') {
      startDate = subMonths(today, 3) // 최근 3개월
    } else {
      startDate = subMonths(today, 6) // 최근 6개월
    }
    
    // 모든 데이터 소스에서 데이터 가져오기
    const [mathflatData, studyLogs, testLogs, makeupClasses, consultations] = await Promise.all([
      // MathFlat 기록
      supabase
        .from('mathflat_records')
        .select('*')
        .eq('student_id', selectedStudent)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd')),
      
      // 학습 일지
      supabase
        .from('study_logs')
        .select('*')
        .eq('student_id', selectedStudent)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd')),
      
      // 시험 기록
      supabase
        .from('test_logs')
        .select('*')
        .eq('student_id', selectedStudent)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd')),
      
      // 보강 수업
      supabase
        .from('makeup_classes')
        .select('*')
        .eq('student_id', selectedStudent)
        .gte('makeup_date', format(startDate, 'yyyy-MM-dd'))
        .lte('makeup_date', format(endDate, 'yyyy-MM-dd')),
      
      // 상담 기록
      supabase
        .from('consultations')
        .select('*')
        .eq('student_id', selectedStudent)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
    ])

    // 데이터 통합 및 변환
    const allData: TimelineData[] = []
    
    // 보강 완료된 날짜를 추적하기 위한 Map (날짜별로 학습일지 정보 저장)
    const makeupStudyLogs = new Map<string, any>()
    
    // 먼저 학습일지에서 보강(attendance_status === 2)인 날짜 찾기
    studyLogs.data?.forEach(item => {
      if (item.attendance_status === 2) { // 보강
        makeupStudyLogs.set(item.date, item)
      }
    })
    
    // MathFlat 데이터 추가
    mathflatData.data?.forEach(item => {
      allData.push({
        date: item.date,
        type: 'mathflat',
        title: `${item.category} ${item.problems_solved}문제`,
        description: `정답률 ${item.accuracy_rate}%`,
        value: item.accuracy_rate,
        color: dataTypeConfig.mathflat.color,
        icon: dataTypeConfig.mathflat.icon
      })
    })

    // 학습 일지 추가 (보강이 아닌 것만)
    studyLogs.data?.forEach(item => {
      if (item.attendance_status === 2) return // 보강은 별도 처리
      
      // 교재와 진도 정보 조합
      const bookInfo = []
      if (item.book1 && item.book1log) {
        bookInfo.push(`${item.book1}: ${item.book1log}`)
      } else if (item.book1) {
        bookInfo.push(item.book1)
      }
      if (item.book2 && item.book2log) {
        bookInfo.push(`${item.book2}: ${item.book2log}`)
      } else if (item.book2) {
        bookInfo.push(item.book2)
      }
      const title = bookInfo.length > 0 ? bookInfo.join(' / ') : '학습일지'
      
      // 출석 상태 텍스트 변환
      const getAttendanceText = (status: number) => {
        switch(status) {
          case 1: return '결석'
          case 2: return '보강'
          case 3: return '조퇴'
          case 4: return '지각'
          case 5: return '출석'
          default: return '미정'
        }
      }
      
      // 평균 점수 계산 (출석, 숙제, 집중도 모두 포함)
      const avgScore = Math.round((item.attendance_status + item.homework + item.focus) / 3)
      
      allData.push({
        date: item.date,
        type: 'study_log',
        title: title,
        description: item.note || `${getAttendanceText(item.attendance_status)} | 출석(${item.attendance_status}) 숙제(${item.homework}) 집중(${item.focus})`,
        value: avgScore * 20, // 1-5점을 0-100%로 변환
        color: dataTypeConfig.study_log.color,
        icon: dataTypeConfig.study_log.icon
      })
    })

    // 시험 기록 추가
    testLogs.data?.forEach(item => {
      allData.push({
        date: item.date,
        type: 'test_log',
        title: `${item.test_type || '시험'} - ${item.test || ''}`,
        description: `점수: ${item.test_score || 0}점`,
        value: item.test_score,
        color: dataTypeConfig.test_log.color,
        icon: dataTypeConfig.test_log.icon
      })
    })

    // 보강 수업 추가 (학습일지 정보 통합)
    makeupClasses.data?.forEach(item => {
      if (item.makeup_date) {  // 보강 날짜가 있는 경우만 표시
        const studyLog = makeupStudyLogs.get(item.makeup_date)
        
        // 보강수업과 연결된 학습일지가 있으면 통합
        if (studyLog) {
          const bookInfo = []
          if (studyLog.book1 && studyLog.book1log) {
            bookInfo.push(`${studyLog.book1}: ${studyLog.book1log}`)
          } else if (studyLog.book1) {
            bookInfo.push(studyLog.book1)
          }
          if (studyLog.book2 && studyLog.book2log) {
            bookInfo.push(`${studyLog.book2}: ${studyLog.book2log}`)
          } else if (studyLog.book2) {
            bookInfo.push(studyLog.book2)
          }
          
          const avgScore = Math.round((studyLog.attendance_status + studyLog.homework + studyLog.focus) / 3)
          
          allData.push({
            date: item.makeup_date,
            type: 'makeup',
            title: `보강수업: ${bookInfo.length > 0 ? bookInfo.join(' / ') : '보강 완료'}`,
            description: `${item.absence_reason ? `결석사유: ${item.absence_reason} | ` : ''}숙제(${studyLog.homework}) 집중(${studyLog.focus})${studyLog.note ? ` | ${studyLog.note}` : ''}`,
            value: avgScore * 20,
            color: dataTypeConfig.makeup.color,
            icon: dataTypeConfig.makeup.icon
          })
        } else {
          // 학습일지가 없는 보강 (아직 완료 안 됨)
          allData.push({
            date: item.makeup_date,
            type: 'makeup',
            title: `보강수업 예정`,
            description: item.absence_reason ? `결석사유: ${item.absence_reason}` : item.content || '',
            color: dataTypeConfig.makeup.color,
            icon: dataTypeConfig.makeup.icon
          })
        }
      }
    })

    // 상담 기록 추가
    consultations.data?.forEach(item => {
      const fullContent = item.content || item.next_action || ''
      allData.push({
        date: format(new Date(item.date), 'yyyy-MM-dd'),
        type: 'consultation',
        title: `상담 (${item.type || '일반'})`,
        description: fullContent.length > 100 ? fullContent.substring(0, 100) + '...' : fullContent,
        fullDescription: fullContent,  // 전체 내용 저장
        color: dataTypeConfig.consultation.color,
        icon: dataTypeConfig.consultation.icon
      })
    })

    // 날짜별로 정렬
    allData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    setTimelineData(allData)
    setLoading(false)
  }

  const handleReset = () => {
    setStatusFilter('재원')
    setGradeFilter('전체')
    setSearchQuery('')
    setSelectedStudent('')
  }

  return (
    <div className="space-y-6">
      {/* 탭 네비게이션 */}
      <div className="flex items-center gap-2 border-b">
        <Link href="/analytics">
          <Button variant="ghost" className="rounded-none border-b-2 border-transparent hover:border-gray-300">
            <TrendingUp className="w-4 h-4 mr-2" />
            운영 통계
          </Button>
        </Link>
        <Link href="/analytics/mathflat">
          <Button variant="ghost" className="rounded-none border-b-2 border-transparent hover:border-gray-300">
            <Activity className="w-4 h-4 mr-2" />
            매쓰플랫
          </Button>
        </Link>
        <Button 
          variant="ghost" 
          className="rounded-none border-b-2 border-primary"
        >
          <Calendar className="w-4 h-4 mr-2" />
          학생 타임라인
        </Button>
      </div>

      {/* 헤더 */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">학생 학습 타임라인</h1>
        
        {/* 필터 섹션 */}
        <TimelineFilters
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          gradeFilter={gradeFilter}
          setGradeFilter={setGradeFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedStudent={selectedStudent}
          setSelectedStudent={setSelectedStudent}
          viewMode={viewMode}
          setViewMode={setViewMode}
          gradeOptions={gradeOptions}
          filteredStudents={filteredStudents}
          onReset={handleReset}
        />
      </div>

      {/* 범례 */}
      <TimelineLegend />

      {/* 타임라인 */}
      {selectedStudent ? (
        <TimelineDisplay
          timelineData={timelineData}
          loading={loading}
        />
      ) : (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            학생을 선택하여 타임라인을 확인하세요
          </div>
        </Card>
      )}
    </div>
  )
}