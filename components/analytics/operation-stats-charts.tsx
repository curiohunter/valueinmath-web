"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend 
} from "recharts"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  TrendingUp, TrendingDown, Users, GraduationCap, 
  UserPlus, LogOut, Download, Calendar, Save,
  Star, AlertCircle, XCircle, Target
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { saveMonthlySnapshot, collectMonthlySnapshot } from "@/app/actions/analytics-snapshot"

interface MonthlyStats {
  id: string
  year: number
  month: number
  active_students_total: number
  active_students_by_dept: Record<string, number>
  active_students_mom_change: number
  consultations_total: number
  consultations_by_dept: Record<string, number>
  consultations_yoy_change: number
  entrance_tests_total: number
  entrance_tests_by_dept: Record<string, number>
  test_conversion_rate: number
  new_enrollments_total: number
  new_enrollments_by_dept: Record<string, number>
  enrollment_conversion_rate: number
  withdrawals_total: number
  withdrawals_by_dept: Record<string, number>
  withdrawals_yoy_change: number
  collected_at: string
}

const DEPT_COLORS = {
  "영재관": "#8b5cf6", // purple
  "중등관": "#3b82f6", // blue
  "고등관": "#ef4444", // red
  "미분류": "#6b7280"  // gray
}

export function OperationStatsCharts() {
  const supabase = createClient()
  const [stats, setStats] = useState<MonthlyStats[]>([])
  const [currentMonthStats, setCurrentMonthStats] = useState<MonthlyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("1year") // 3months, 6months, 1year, all

  // 데이터 로드
  useEffect(() => {
    loadStats()
  }, [period])

  // 현재월 실시간 계산
  const calculateCurrentMonth = async () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    
    try {
      // 현재 재원생
      const { data: activeStudents, error: activeError } = await supabase
        .from('students')
        .select('*')
        .eq('status', '재원')
      
      if (activeError) {
        console.error('재원생 조회 오류:', activeError)
      }
      
      
      const activeByDept: Record<string, number> = {}
      activeStudents?.forEach(s => {
        const dept = s.department || '미분류'
        activeByDept[dept] = (activeByDept[dept] || 0) + 1
      })
      
      // 이번달 날짜 범위 (마지막 날 정확히 계산)
      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate() // 해당 월의 마지막 날
      const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      
      // 이번달 신규상담 (first_contact_date가 이번달인 학생)
      const { data: allStudentsWithContact, error: consultError } = await supabase
        .from('students')
        .select('*')
        .not('first_contact_date', 'is', null)
      
      if (consultError) {
        console.error('신규상담 조회 오류:', consultError)
      }
      
      // JavaScript에서 날짜 필터링
      const consultations = allStudentsWithContact?.filter(s => {
        if (!s.first_contact_date) return false
        return s.first_contact_date >= monthStart && s.first_contact_date <= monthEnd
      })
      
      const consultByDept: Record<string, number> = {}
      consultations?.forEach(s => {
        const dept = s.department || '미분류'
        consultByDept[dept] = (consultByDept[dept] || 0) + 1
      })
      
      // 이번달 신규등원 (start_date가 이번달인 재원생)
      const { data: allActiveStudents, error: enrollError } = await supabase
        .from('students')
        .select('*')
        .eq('status', '재원')
        .not('start_date', 'is', null)
      
      if (enrollError) {
        console.error('신규등원 조회 오류:', enrollError)
      }
      
      // JavaScript에서 날짜 필터링
      const newEnrollments = allActiveStudents?.filter(s => {
        if (!s.start_date) return false
        return s.start_date >= monthStart && s.start_date <= monthEnd
      })
      
      const enrollByDept: Record<string, number> = {}
      newEnrollments?.forEach(s => {
        const dept = s.department || '미분류'
        enrollByDept[dept] = (enrollByDept[dept] || 0) + 1
      })
      
      // 이번달 퇴원 (end_date가 이번달인 퇴원생)
      const { data: withdrawals, error: withdrawError } = await supabase
        .from('students')
        .select('*')
        .filter('end_date', 'gte', monthStart)
        .filter('end_date', 'lte', monthEnd)
        .eq('status', '퇴원')
      
      if (withdrawError) {
        console.error('퇴원 조회 오류:', withdrawError)
      }
      
      const withdrawByDept: Record<string, number> = {}
      withdrawals?.forEach(s => {
        const dept = s.department || '미분류'
        withdrawByDept[dept] = (withdrawByDept[dept] || 0) + 1
      })
      
      // 이번달 입학테스트 (entrance_tests 테이블에서 조회)
      const { data: tests, error: testError } = await supabase
        .from('entrance_tests')
        .select('*, student:students!consultation_id(department)')
        .gte('test_date', monthStart)
        .lte('test_date', monthEnd)
      
      if (testError) {
        console.error('입학테스트 조회 오류:', testError)
      }
      
      const testByDept: Record<string, number> = {}
      tests?.forEach(t => {
        const dept = (t.student as any)?.department || '미분류'
        testByDept[dept] = (testByDept[dept] || 0) + 1
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
      
      
      setCurrentMonthStats({
        id: 'current',
        year,
        month,
        active_students_total: activeStudents?.length || 0,
        active_students_by_dept: activeByDept,
        active_students_mom_change: momChange,
        consultations_total: consultations?.length || 0,
        consultations_by_dept: consultByDept,
        consultations_yoy_change: 0,
        entrance_tests_total: tests?.length || 0,
        entrance_tests_by_dept: testByDept,
        test_conversion_rate: consultations?.length ? (tests?.length || 0) / consultations.length * 100 : 0,
        new_enrollments_total: newEnrollments?.length || 0,
        new_enrollments_by_dept: enrollByDept,
        enrollment_conversion_rate: consultations?.length ? (newEnrollments?.length || 0) / consultations.length * 100 : 0,
        withdrawals_total: withdrawals?.length || 0,
        withdrawals_by_dept: withdrawByDept,
        withdrawals_yoy_change: 0,
        collected_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('현재월 계산 실패:', error)
    }
  }

  const loadStats = async () => {
    setLoading(true)
    try {
      // 기간에 따른 쿼리 구성
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1
      
      let startYear = currentYear
      let startMonth = currentMonth
      
      switch(period) {
        case "3months":
          // 3개월 전부터
          startMonth = currentMonth - 2
          if (startMonth <= 0) {
            startMonth += 12
            startYear -= 1
          }
          break
        case "6months":
          // 6개월 전부터
          startMonth = currentMonth - 5
          if (startMonth <= 0) {
            startMonth += 12
            startYear -= 1
          }
          break
        case "1year":
          // 1년 전부터
          startYear = currentYear - 1
          startMonth = currentMonth
          break
        case "all":
          // 전체 데이터
          startYear = 2025
          startMonth = 1
          break
      }

      // 시작일부터 현재까지의 데이터 조회
      const { data, error } = await supabase
        .from('academy_monthly_stats')
        .select('*')
        .or(`year.gt.${startYear},and(year.eq.${startYear},month.gte.${startMonth})`)
        .order('year', { ascending: true })
        .order('month', { ascending: true })

      if (error) throw error

      
      setStats(data || [])
      
      // 현재월 실시간 계산
      await calculateCurrentMonth()
    } catch (error) {
      console.error('통계 데이터 로드 실패:', error)
      toast.error('통계 데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 데이터 변환 함수들 - 현재월 포함
  const getAllStats = () => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    
    // 현재월 데이터가 이미 저장되어 있는지 확인
    const hasCurrentMonth = stats.some(s => s.year === currentYear && s.month === currentMonth)
    
    if (!hasCurrentMonth && currentMonthStats) {
      return [...stats, currentMonthStats]
    }
    return stats
  }
  
  const getActiveStudentsTrend = () => {
    return getAllStats().map(stat => ({
      name: `${stat.year}.${String(stat.month).padStart(2, '0')}`,
      재원생: stat.active_students_total,
      변화율: stat.active_students_mom_change
    }))
  }

  const getDeptDistribution = () => {
    const allStats = getAllStats()
    if (allStats.length === 0) return []
    
    const latestStat = allStats[allStats.length - 1]
    
    return Object.entries(latestStat.active_students_by_dept).map(([dept, count]) => {
      const percentage = latestStat.active_students_total > 0 
        ? ((count / latestStat.active_students_total) * 100).toFixed(1)
        : '0.0'
      
      return {
        name: dept,
        value: count,
        percentage: percentage
      }
    })
  }

  // Lead Source별 전환율 계산
  const getLeadSourceConversion = async () => {
    try {
      // 선택된 기간 계산
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1
      
      let startYear = currentYear
      let startMonth = currentMonth
      
      switch(period) {
        case "3months":
          startMonth = currentMonth - 2
          if (startMonth <= 0) {
            startMonth += 12
            startYear -= 1
          }
          break
        case "6months":
          startMonth = currentMonth - 5
          if (startMonth <= 0) {
            startMonth += 12
            startYear -= 1
          }
          break
        case "1year":
          startYear = currentYear - 1
          startMonth = currentMonth
          break
        case "all":
          startYear = 2025
          startMonth = 1
          break
      }
      
      const startDate = `${startYear}-${String(startMonth).padStart(2, '0')}-01`
      
      // students 테이블에서 lead_source 정보 가져오기
      const { data: students, error } = await supabase
        .from('students')
        .select('lead_source, status, first_contact_date, start_date')
        .gte('first_contact_date', startDate)
        .not('lead_source', 'is', null)
      
      if (error) throw error
      
      // lead_source별 통계 계산
      const leadStats: Record<string, { total: number, enrolled: number, rate: number }> = {}
      
      students?.forEach(student => {
        const source = student.lead_source || '미분류'
        
        if (!leadStats[source]) {
          leadStats[source] = { total: 0, enrolled: 0, rate: 0 }
        }
        
        leadStats[source].total++
        
        // 재원 상태인 경우 등록된 것으로 카운트
        if (student.status === '재원' && student.start_date) {
          leadStats[source].enrolled++
        }
      })
      
      // 전환율 계산
      Object.keys(leadStats).forEach(source => {
        leadStats[source].rate = leadStats[source].total > 0 
          ? (leadStats[source].enrolled / leadStats[source].total) * 100
          : 0
      })
      
      // 차트 데이터로 변환
      return Object.entries(leadStats)
        .sort((a, b) => b[1].rate - a[1].rate) // 전환율 높은 순으로 정렬
        .map(([source, stats]) => ({
          name: source,
          상담수: stats.total,
          등록수: stats.enrolled,
          전환율: Number(stats.rate.toFixed(1))
        }))
    } catch (error) {
      console.error('Lead Source 통계 조회 실패:', error)
      return []
    }
  }
  
  // Lead Source 월별 추이
  const [leadSourceData, setLeadSourceData] = useState<any[]>([])
  const [leadSourceMonthly, setLeadSourceMonthly] = useState<any[]>([])
  const [leadSourceMetrics, setLeadSourceMetrics] = useState<any>({})
  
  useEffect(() => {
    const loadLeadSourceData = async () => {
      const data = await getLeadSourceConversion()
      console.log('Lead Source Data loaded:', data)
      setLeadSourceData(data)
      
      // 핵심 지표 계산
      calculateLeadSourceMetrics(data)
    }
    loadLeadSourceData()
  }, [period])
  
  // 월별 추이는 별도로 로드 (첫 로드 시에만)
  useEffect(() => {
    console.log('Calling loadLeadSourceMonthlyTrend on component mount')
    loadLeadSourceMonthlyTrend()
  }, []) // 빈 dependency로 한 번만 실행
  
  const loadLeadSourceMonthlyTrend = async () => {
    try {
      const now = new Date()
      
      // 1. 먼저 전체 기간의 TOP 3 유입경로 결정
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      const startDate = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`
      
      const { data: allStudents, error: allError } = await supabase
        .from('students')
        .select('lead_source')
        .gte('first_contact_date', startDate)
        .not('lead_source', 'is', null)
      
      if (allError) {
        console.error('Failed to fetch all students:', allError)
        throw allError
      }
      
      console.log('All students for TOP 3:', allStudents?.length, 'records')
      
      // 상담 수 기준으로 TOP 3 선정
      const sourceCount: Record<string, number> = {}
      allStudents?.forEach(student => {
        const source = student.lead_source || '미분류'
        sourceCount[source] = (sourceCount[source] || 0) + 1
      })
      
      const top3Sources = Object.entries(sourceCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([source]) => source)
      
      console.log('TOP 3 Sources determined:', top3Sources)
      
      // 빈 데이터일 경우 처리
      if (top3Sources.length === 0) {
        console.log('No lead sources found in data')
        setLeadSourceMonthly([])
        return
      }
      
      // 2. TOP 3 유입경로의 월별 전환율 계산
      const months = []
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        months.push({
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          label: `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`
        })
      }
      
      const monthlyData = []
      
      for (const month of months) {
        const monthStart = `${month.year}-${String(month.month).padStart(2, '0')}-01`
        const monthEnd = new Date(month.year, month.month, 0)
        const monthEndStr = `${month.year}-${String(month.month).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`
        
        const { data: students, error } = await supabase
          .from('students')
          .select('lead_source, status, start_date, first_contact_date')
          .gte('first_contact_date', monthStart)
          .lte('first_contact_date', monthEndStr)
          .in('lead_source', top3Sources)
        
        if (error) {
          console.error(`Failed to fetch month ${month.label}:`, error)
          throw error
        }
        
        console.log(`Month ${month.label}: ${students?.length} students found`)
        
        // TOP 3 유입경로별 전환율 계산
        const sourceStats: Record<string, {total: number, converted: number}> = {}
        
        // 초기화 - TOP3 모든 소스에 대해 기본값 설정
        top3Sources.forEach(source => {
          sourceStats[source] = {total: 0, converted: 0}
        })
        
        students?.forEach(student => {
          const source = student.lead_source
          if (source && sourceStats[source] !== undefined) {
            sourceStats[source].total++
            // 재원 상태이거나 등록일이 있는 경우 전환으로 간주
            if ((student.status === '재원' || student.status === '퇴원') && student.start_date) {
              sourceStats[source].converted++
            }
          }
        })
        
        // 전환율 계산
        const rates: Record<string, number> = {}
        top3Sources.forEach(source => {
          const stats = sourceStats[source]
          if (stats && stats.total > 0) {
            rates[source] = Math.round((stats.converted / stats.total) * 100)
          } else {
            rates[source] = 0
          }
        })
        
        console.log(`Month ${month.label} rates:`, rates)
        
        monthlyData.push({
          month: month.label,
          ...rates
        })
      }
      
      console.log('Final TOP 3 Sources:', top3Sources)
      console.log('Final Monthly Data:', monthlyData)
      setLeadSourceMonthly(monthlyData)
    } catch (error) {
      console.error('Lead Source 월별 추이 조회 실패:', error)
      setLeadSourceMonthly([])
    }
  }
  
  const calculateLeadSourceMetrics = (data: any[]) => {
    if (!data || data.length === 0) return
    
    // 최고 전환율
    const bestConversion = data[0] // 이미 전환율 순으로 정렬됨
    
    // 최다 상담
    const mostConsultations = [...data].sort((a, b) => b.상담수 - a.상담수)[0]
    
    // 이달 최우수 (전월 대비 가장 개선된 채널)
    // TODO: 실제 전월 데이터와 비교 필요
    const thisMonthBest = data.find(d => d.등록수 > 0) || data[0]
    
    // 개선 필요 (상담은 있는데 전환율이 낮은 채널)
    const needsImprovement = [...data]
      .filter(d => d.상담수 >= 2) // 최소 2건 이상
      .sort((a, b) => a.전환율 - b.전환율)[0]
    
    setLeadSourceMetrics({
      bestConversion,
      mostConsultations,
      thisMonthBest,
      needsImprovement
    })
  }

  const getConversionRateTrend = () => {
    return getAllStats().map(stat => ({
      name: `${stat.year}.${String(stat.month).padStart(2, '0')}`,
      테스트전환율: stat.test_conversion_rate,
      등원전환율: stat.enrollment_conversion_rate
    }))
  }

  const getWithdrawalsTrend = () => {
    return getAllStats().map(stat => ({
      name: `${stat.year}.${String(stat.month).padStart(2, '0')}`,
      퇴원수: stat.withdrawals_total,
      YoY변화: stat.withdrawals_yoy_change
    }))
  }

  const getDeptPerformance = () => {
    const allStats = getAllStats()
    if (allStats.length === 0) return []
    
    const latestStat = allStats[allStats.length - 1]
    const depts = ['영재관', '중등관', '고등관']
    
    return depts.map(dept => ({
      department: dept,
      재원생: latestStat.active_students_by_dept[dept] || 0,
      신규상담: latestStat.consultations_by_dept[dept] || 0,
      입학테스트: latestStat.entrance_tests_by_dept[dept] || 0,
      신규등원: latestStat.new_enrollments_by_dept[dept] || 0,
      퇴원: latestStat.withdrawals_by_dept[dept] || 0
    }))
  }

  // CSV 다운로드 함수
  const downloadCSV = () => {
    const headers = [
      '연도', '월', '총재원생', '신규상담', '입학테스트', 
      '테스트전환율', '신규등원', '등원전환율', '퇴원수'
    ]
    
    const rows = getAllStats().map(stat => [
      stat.year,
      stat.month,
      stat.active_students_total,
      stat.consultations_total,
      stat.entrance_tests_total,
      stat.test_conversion_rate.toFixed(1),
      stat.new_enrollments_total,
      stat.enrollment_conversion_rate.toFixed(1),
      stat.withdrawals_total
    ])
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `학원운영통계_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 필터 및 액션 바 */}
      <div className="flex justify-between items-center">
        <div className="flex gap-4 items-center">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="기간 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">최근 3개월</SelectItem>
              <SelectItem value="6months">최근 6개월</SelectItem>
              <SelectItem value="1year">최근 1년</SelectItem>
              <SelectItem value="all">전체</SelectItem>
            </SelectContent>
          </Select>
          
          {getAllStats().length > 0 && (
            <span className="text-sm text-muted-foreground">
              {getAllStats()[0].year}년 {getAllStats()[0].month}월 ~ {getAllStats()[getAllStats().length - 1].year}년 {getAllStats()[getAllStats().length - 1].month}월 ({getAllStats().length}개월)
            </span>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={async () => {
              const result = await saveMonthlySnapshot()
              if (result.success) {
                toast.success(result.message)
                loadStats() // 데이터 새로고침
              } else {
                toast.error(result.message)
              }
            }}
          >
            <Save className="w-4 h-4 mr-2" />
            이번달 저장
          </Button>
          
          <Button variant="outline" onClick={downloadCSV}>
            <Download className="w-4 h-4 mr-2" />
            CSV 다운로드
          </Button>
        </div>
      </div>

      {/* 핵심 지표 카드 */}
      {getAllStats().length > 0 && (() => {
        const latestStat = getAllStats()[getAllStats().length - 1]
        return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">총 재원생</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latestStat.active_students_total}명
              </div>
              <div className="flex items-center mt-2">
                {latestStat.active_students_mom_change >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm ${
                  latestStat.active_students_mom_change >= 0 
                    ? 'text-green-500' 
                    : 'text-red-500'
                }`}>
                  {latestStat.active_students_mom_change.toFixed(1)}% MoM
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">이번달 신규상담</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latestStat.consultations_total}건
              </div>
              <div className="flex items-center mt-2">
                {latestStat.consultations_yoy_change >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm ${
                  latestStat.consultations_yoy_change >= 0 
                    ? 'text-green-500' 
                    : 'text-red-500'
                }`}>
                  {latestStat.consultations_yoy_change.toFixed(1)}% YoY
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">테스트 전환율</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latestStat.test_conversion_rate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                {latestStat.entrance_tests_total} / {latestStat.consultations_total}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">등원 전환율</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latestStat.enrollment_conversion_rate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                {latestStat.new_enrollments_total} / {latestStat.consultations_total}
              </div>
            </CardContent>
          </Card>
        </div>
        )
      })()}

      {/* 차트 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 재원생 추이 */}
        <Card>
          <CardHeader>
            <CardTitle>재원생 추이</CardTitle>
            <CardDescription>월별 재원생 수 변화</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={getActiveStudentsTrend()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="재원생" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 관별 재원생 분포 */}
        <Card>
          <CardHeader>
            <CardTitle>관별 재원생 분포</CardTitle>
            <CardDescription>현재 재원생 비율</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={getDeptDistribution()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {getDeptDistribution().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={DEPT_COLORS[entry.name] || '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>


        {/* 전환율 및 퇴원 추이 - 한 행에 배치 */}
        <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 전환율 추이 (1/2 크기) */}
          <Card>
            <CardHeader>
              <CardTitle>전환율 추이</CardTitle>
              <CardDescription>테스트 및 등원 전환율 변화</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getConversionRateTrend()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="테스트전환율" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="등원전환율" 
                    stroke="#10b981" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 퇴원 추이 (1/2 크기) */}
          <Card>
            <CardHeader>
              <CardTitle>퇴원 추이</CardTitle>
              <CardDescription>월별 퇴원 수</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getWithdrawalsTrend()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="퇴원수" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* 관별 성과 테이블 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>관별 성과 대시보드</CardTitle>
            <CardDescription>최근 월 기준</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">담당관</th>
                    <th className="text-center py-2">재원생</th>
                    <th className="text-center py-2">신규상담</th>
                    <th className="text-center py-2">입학테스트</th>
                    <th className="text-center py-2">신규등원</th>
                    <th className="text-center py-2">퇴원</th>
                  </tr>
                </thead>
                <tbody>
                  {getDeptPerformance().map(dept => (
                    <tr key={dept.department} className="border-b">
                      <td className="py-2 font-medium">{dept.department}</td>
                      <td className="text-center py-2">
                        <Badge variant="outline">{dept.재원생}</Badge>
                      </td>
                      <td className="text-center py-2">{dept.신규상담}</td>
                      <td className="text-center py-2">{dept.입학테스트}</td>
                      <td className="text-center py-2">
                        <Badge className="bg-green-500">{dept.신규등원}</Badge>
                      </td>
                      <td className="text-center py-2">
                        <Badge variant="destructive">{dept.퇴원}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 마케팅 분석 섹션 */}
      <div className="mt-8 space-y-6 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <h2 className="text-2xl font-bold">🎯 마케팅 분석</h2>
        
        {/* 핵심 지표 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {leadSourceMetrics.bestConversion && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Star className="w-4 h-4 mr-2 text-yellow-500" />
                  최고 전환율
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">{leadSourceMetrics.bestConversion.name}</div>
                <div className="text-2xl font-bold text-green-600">{leadSourceMetrics.bestConversion.전환율}%</div>
                <div className="text-xs text-muted-foreground">
                  {leadSourceMetrics.bestConversion.등록수}/{leadSourceMetrics.bestConversion.상담수}건
                </div>
              </CardContent>
            </Card>
          )}

          {leadSourceMetrics.mostConsultations && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Target className="w-4 h-4 mr-2 text-blue-500" />
                  최다 상담
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">{leadSourceMetrics.mostConsultations.name}</div>
                <div className="text-2xl font-bold text-blue-600">{leadSourceMetrics.mostConsultations.상담수}건</div>
                <div className="text-xs text-muted-foreground">
                  전환율 {leadSourceMetrics.mostConsultations.전환율}%
                </div>
              </CardContent>
            </Card>
          )}

          {leadSourceMetrics.thisMonthBest && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2 text-purple-500" />
                  이달 최우수
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">{leadSourceMetrics.thisMonthBest.name}</div>
                <div className="text-2xl font-bold text-purple-600">+{leadSourceMetrics.thisMonthBest.등록수}명</div>
                <div className="text-xs text-muted-foreground">
                  신규 등록
                </div>
              </CardContent>
            </Card>
          )}

          {leadSourceMetrics.needsImprovement && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
                  개선 필요
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">{leadSourceMetrics.needsImprovement.name}</div>
                <div className="text-2xl font-bold text-red-600">{leadSourceMetrics.needsImprovement.전환율}%</div>
                <div className="text-xs text-muted-foreground">
                  {leadSourceMetrics.needsImprovement.상담수}건 중 {leadSourceMetrics.needsImprovement.등록수}건
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 유입경로 성과 테이블 */}
        <Card>
          <CardHeader>
            <CardTitle>유입경로 성과 현황</CardTitle>
            <CardDescription>최근 {period === "3months" ? "3개월" : period === "6months" ? "6개월" : period === "1year" ? "1년" : "전체"} 데이터</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>유입경로</TableHead>
                  <TableHead className="text-center">상담</TableHead>
                  <TableHead className="text-center">등록</TableHead>
                  <TableHead className="text-center">전환율</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leadSourceData.map((source) => {
                  const getActionBadge = (rate: number, consultations: number) => {
                    if (consultations < 2) return { text: "데이터부족", color: "bg-gray-100 text-gray-600" }
                    if (rate >= 40) return { text: "⭐ 유지강화", color: "bg-green-100 text-green-700" }
                    if (rate >= 20) return { text: "⚠️ 전환개선", color: "bg-yellow-100 text-yellow-700" }
                    return { text: "🔴 재검토", color: "bg-red-100 text-red-700" }
                  }
                  const action = getActionBadge(source.전환율, source.상담수)
                  
                  return (
                    <TableRow key={source.name}>
                      <TableCell className="font-medium">{source.name}</TableCell>
                      <TableCell className="text-center">{source.상담수}</TableCell>
                      <TableCell className="text-center">{source.등록수}</TableCell>
                      <TableCell className="text-center">
                        <span className={`font-bold ${
                          source.전환율 >= 40 ? 'text-green-600' : 
                          source.전환율 >= 20 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {source.전환율}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={action.color}>
                          {action.text}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* TOP 3 전환율 추이 */}
        <Card>
          <CardHeader>
            <CardTitle>TOP 3 유입경로 전환율 추이</CardTitle>
            <CardDescription>최근 6개월 상담수 기준 상위 3개 채널</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              // 테스트용 샘플 데이터
              const testData = [
                { month: '2024.07', '인터넷': 35, '지인소개': 42, '블로그': 28 },
                { month: '2024.08', '인터넷': 38, '지인소개': 45, '블로그': 30 },
                { month: '2024.09', '인터넷': 40, '지인소개': 43, '블로그': 32 },
                { month: '2024.10', '인터넷': 42, '지인소개': 48, '블로그': 35 },
                { month: '2024.11', '인터넷': 45, '지인소개': 50, '블로그': 38 },
                { month: '2024.12', '인터넷': 43, '지인소개': 52, '블로그': 40 },
              ]
              
              // 실제 데이터가 있으면 사용하고, 없으면 테스트 데이터 사용
              const chartData = leadSourceMonthly.length > 0 ? leadSourceMonthly : testData
              console.log('Using chart data:', chartData)
              
              return (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis 
                      label={{ value: '전환율 (%)', angle: -90, position: 'insideLeft' }} 
                      domain={[0, 100]}
                    />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                    {/* 첫 번째 데이터 포인트의 키를 기준으로 라인 생성 */}
                    {chartData.length > 0 && chartData[0] && 
                      Object.keys(chartData[0])
                        .filter(key => key !== 'month')
                        .map((source, index) => {
                          const colors = ['#8b5cf6', '#3b82f6', '#10b981']
                          return (
                            <Line
                              key={source}
                              type="monotone"
                              dataKey={source}
                              name={source}
                              stroke={colors[index % colors.length]}
                              strokeWidth={2}
                              connectNulls={true}
                              dot={{ r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          )
                        })
                    }
                  </LineChart>
                </ResponsiveContainer>
              )
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}