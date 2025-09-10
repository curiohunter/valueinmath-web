"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronLeft, ChevronRight, Calendar, BookOpen, TestTube, Users, Brain, AlertCircle, TrendingUp, Activity, Search, ChevronDown, ChevronUp } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from "date-fns"
import { ko } from "date-fns/locale"

interface TimelineData {
  date: string
  type: 'mathflat' | 'study_log' | 'test_log' | 'makeup' | 'consultation'
  title: string
  description?: string
  fullDescription?: string  // 전체 내용 저장용
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
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())  // 확장된 아이템 관리
  
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

  const loadTimelineData = async () => {
    setLoading(true)
    
    // 날짜 범위 계산 (최근 기간)
    const today = new Date()
    let startDate, endDate
    endDate = today
    
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


  // 날짜별로 그룹화
  const groupedData = timelineData.reduce((acc, item) => {
    const date = item.date
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(item)
    return acc
  }, {} as Record<string, TimelineData[]>)

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
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            {/* 1. 상태 필터 */}
            <div className="space-y-2">
              <Label htmlFor="status-filter" className="text-sm font-medium">상태</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="재원">재원</SelectItem>
                  <SelectItem value="퇴원">퇴원</SelectItem>
                  <SelectItem value="전체">전체</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 2. 학년 필터 */}
            <div className="space-y-2">
              <Label htmlFor="grade-filter" className="text-sm font-medium">학년</Label>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger id="grade-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {gradeOptions.map(grade => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. 학생 선택 드롭다운 */}
            <div className="space-y-2">
              <Label htmlFor="student-select" className="text-sm font-medium">
                학생 ({filteredStudents.length}명)
              </Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger id="student-select">
                  <SelectValue placeholder="학생 선택" />
                </SelectTrigger>
                <SelectContent>
                  {filteredStudents.map(student => {
                    const schoolTypeShort = student.school_type ? 
                      student.school_type.replace('등학교', '').substring(0, 1) : ''
                    return (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name}
                        {student.school_type && student.grade && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({schoolTypeShort}{student.grade})
                          </span>
                        )}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* 4. 학생 검색 */}
            <div className="space-y-2">
              <Label htmlFor="student-search" className="text-sm font-medium">검색</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="student-search"
                  type="text"
                  placeholder="이름으로 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* 5. 기간 선택 */}
            <div className="space-y-2">
              <Label htmlFor="period-select" className="text-sm font-medium">기간</Label>
              <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                <SelectTrigger id="period-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">최근 1개월</SelectItem>
                  <SelectItem value="quarter">최근 3개월</SelectItem>
                  <SelectItem value="semester">최근 6개월</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 필터 초기화 버튼 */}
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter('재원')
                  setGradeFilter('전체')
                  setSearchQuery('')
                  setSelectedStudent('')
                }}
                className="w-full"
              >
                초기화
              </Button>
            </div>
          </div>

          {/* 검색 결과 안내 */}
          {searchQuery && (
            <div className="mt-3 text-sm text-muted-foreground">
              "{searchQuery}" 검색 결과: {filteredStudents.length}명
            </div>
          )}
        </Card>
      </div>

      {/* 범례 */}
      <Card className="p-4">
        <div className="flex items-center gap-6">
          <span className="text-sm font-medium text-muted-foreground">데이터 유형:</span>
          {Object.entries(dataTypeConfig).map(([key, config]) => (
            <div key={key} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${config.color}`} />
              <span className="text-sm">{config.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* 타임라인 */}
      {selectedStudent ? (
        <Card className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">데이터 로딩 중...</div>
            </div>
          ) : (
            <div className="relative">
              {/* 타임라인 라인 */}
              <div className="absolute left-12 top-0 bottom-0 w-0.5 bg-gray-200" />
              
              {/* 타임라인 아이템 */}
              <div className="space-y-8">
                {Object.entries(groupedData).map(([date, items]) => (
                  <div key={date} className="relative">
                    {/* 날짜 마커 */}
                    <div className="absolute left-0 w-24 text-right pr-4">
                      <div className="text-sm font-medium">
                        {format(new Date(date), 'MM/dd')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(date), 'EEE', { locale: ko })}
                      </div>
                    </div>
                    
                    {/* 데이터 포인트 */}
                    <div className="ml-32 space-y-3">
                      {items.map((item, idx) => {
                        const config = dataTypeConfig[item.type]
                        const Icon = config.icon
                        const itemKey = `${date}-${idx}`
                        const isExpanded = expandedItems.has(itemKey)
                        const hasLongContent = item.type === 'consultation' && item.fullDescription && item.fullDescription.length > 100
                        
                        return (
                          <div
                            key={idx}
                            className={`relative p-4 rounded-lg border ${config.lightColor} border-l-4`}
                            style={{ borderLeftColor: config.color.replace('bg-', '') }}
                          >
                            {/* 아이콘 */}
                            <div className={`absolute -left-[52px] w-8 h-8 rounded-full ${config.color} flex items-center justify-center text-white`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            
                            {/* 내용 */}
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium">{item.title}</h4>
                                {item.description && (
                                  <div className="mt-1">
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                      {isExpanded && item.fullDescription ? item.fullDescription : item.description}
                                    </p>
                                    {/* 더보기/접기 버튼 - 상담이고 내용이 긴 경우에만 표시 */}
                                    {hasLongContent && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="mt-2 p-0 h-auto text-xs text-blue-600 hover:text-blue-800"
                                        onClick={() => {
                                          const newExpanded = new Set(expandedItems)
                                          if (isExpanded) {
                                            newExpanded.delete(itemKey)
                                          } else {
                                            newExpanded.add(itemKey)
                                          }
                                          setExpandedItems(newExpanded)
                                        }}
                                      >
                                        {isExpanded ? (
                                          <>
                                            <ChevronUp className="h-3 w-3 mr-1" />
                                            접기
                                          </>
                                        ) : (
                                          <>
                                            <ChevronDown className="h-3 w-3 mr-1" />
                                            더보기
                                          </>
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              {/* 값 표시 (점수, 정답률, 평점 등) */}
                              {item.value !== undefined && (
                                <div className="ml-4 flex-shrink-0">
                                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    item.type === 'study_log' ? (
                                      // 학습일지는 1-5점 기준 (20점 단위)
                                      item.value >= 80 ? 'bg-green-100 text-green-700 border border-green-200' :
                                      item.value >= 60 ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                      item.value >= 40 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                      item.value >= 20 ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                                      'bg-red-100 text-red-700 border border-red-200'
                                    ) : (
                                      // 다른 항목들은 기존 로직 유지
                                      item.value >= 80 ? 'bg-green-100 text-green-700' :
                                      item.value >= 60 ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-red-100 text-red-700'
                                    )
                                  }`}>
                                    {item.type === 'study_log' ? 
                                      `평균 ${Math.round(item.value / 20)}` : // 평균 점수
                                      item.type === 'test_log' ?
                                      `${item.value}점` :
                                      `${Math.round(item.value)}%`
                                    }
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
                
                {Object.keys(groupedData).length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    선택한 기간에 데이터가 없습니다
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
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