"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ComposedChart,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend
} from "recharts"
import {
  TrendingUp, TrendingDown, Download, Save, Target, BarChart3, Clock, Trophy
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { saveMonthlySnapshot } from "@/app/actions/analytics-snapshot"
import { useCohortData } from "@/components/analytics/funnel/hooks/use-cohort-data"

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

interface MonthlyRevenue {
  month: string
  total: number
  paid: number
  unpaid: number
  count: number
  regular: number    // 정규 수업 매출
  special: number    // 특강 매출
  testFee: number    // 입학테스트비
}

const DEPT_COLORS: Record<string, string> = {
  "영재관": "#8b5cf6",
  "중등관": "#3b82f6",
  "고등관": "#ef4444",
  "미분류": "#6b7280"
}

export function OperationStatsCharts() {
  const supabase = createClient()
  const [stats, setStats] = useState<MonthlyStats[]>([])
  const [currentMonthStats, setCurrentMonthStats] = useState<MonthlyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("1year")

  // 매출 데이터 상태
  const [revenueData, setRevenueData] = useState<MonthlyRevenue[]>([])
  const [revenueLoading, setRevenueLoading] = useState(true)

  // 코호트 데이터 훅
  const cohortHook = useCohortData()

  useEffect(() => {
    loadStats()
    loadRevenueData()
  }, [period])

  const calculateCurrentMonth = async () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    try {
      const { data: activeStudents, error: activeError } = await supabase
        .from('students')
        .select('*')
        .eq('is_active', true)
        .eq('status', '재원')

      if (activeError) {
        console.error('재원생 조회 오류:', activeError)
      }

      const activeByDept: Record<string, number> = {}
      activeStudents?.forEach(s => {
        const dept = s.department || '미분류'
        activeByDept[dept] = (activeByDept[dept] || 0) + 1
      })

      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

      const { data: allStudentsWithContact } = await supabase
        .from('students')
        .select('*')
        .eq('is_active', true)
        .not('first_contact_date', 'is', null)

      const consultations = allStudentsWithContact?.filter(s => {
        if (!s.first_contact_date) return false
        return s.first_contact_date >= monthStart && s.first_contact_date <= monthEnd
      })

      const consultByDept: Record<string, number> = {}
      consultations?.forEach(s => {
        const dept = s.department || '미분류'
        consultByDept[dept] = (consultByDept[dept] || 0) + 1
      })

      const { data: allActiveStudents } = await supabase
        .from('students')
        .select('*')
        .eq('is_active', true)
        .eq('status', '재원')
        .not('start_date', 'is', null)

      const newEnrollments = allActiveStudents?.filter(s => {
        if (!s.start_date) return false
        return s.start_date >= monthStart && s.start_date <= monthEnd
      })

      const enrollByDept: Record<string, number> = {}
      newEnrollments?.forEach(s => {
        const dept = s.department || '미분류'
        enrollByDept[dept] = (enrollByDept[dept] || 0) + 1
      })

      const { data: withdrawals } = await supabase
        .from('students')
        .select('*')
        .eq('is_active', true)
        .filter('end_date', 'gte', monthStart)
        .filter('end_date', 'lte', monthEnd)
        .eq('status', '퇴원')

      const withdrawByDept: Record<string, number> = {}
      withdrawals?.forEach(s => {
        const dept = s.department || '미분류'
        withdrawByDept[dept] = (withdrawByDept[dept] || 0) + 1
      })

      const { data: tests } = await supabase
        .from('entrance_tests')
        .select('*, student:students!student_id(department)')
        .gte('test_date', monthStart)
        .lte('test_date', monthEnd)

      const testByDept: Record<string, number> = {}
      tests?.forEach(t => {
        const dept = (t.student as { department?: string })?.department || '미분류'
        testByDept[dept] = (testByDept[dept] || 0) + 1
      })

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

      const { data, error } = await supabase
        .from('academy_monthly_stats')
        .select('*')
        .or(`year.gt.${startYear},and(year.eq.${startYear},month.gte.${startMonth})`)
        .order('year', { ascending: true })
        .order('month', { ascending: true })

      if (error) throw error

      setStats(data || [])
      await calculateCurrentMonth()
    } catch (error) {
      console.error('통계 데이터 로드 실패:', error)
      toast.error('통계 데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadRevenueData = async () => {
    setRevenueLoading(true)
    try {
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1

      let monthsBack = 12
      switch(period) {
        case "3months": monthsBack = 3; break
        case "6months": monthsBack = 6; break
        case "1year": monthsBack = 12; break
        case "all": monthsBack = 24; break
      }

      // 시작 년월 계산
      const startDate = new Date(currentYear, currentMonth - monthsBack, 1)
      const startYear = startDate.getFullYear()
      const startMonth = startDate.getMonth() + 1

      // year, month, class_type 필드로 필터링
      const { data: tuitionData, error } = await supabase
        .from('tuition_fees')
        .select('year, month, amount, payment_status, class_type')
        .gte('year', startYear)
        .order('year', { ascending: true })
        .order('month', { ascending: true })

      if (error) throw error

      // 클라이언트에서 정확한 시작월 필터링
      const filteredData = tuitionData?.filter(fee => {
        if (fee.year > startYear) return true
        if (fee.year === startYear && fee.month >= startMonth) return true
        return false
      })

      // 월별 집계 (정규/특강 구분)
      const monthlyMap: Record<string, MonthlyRevenue> = {}

      filteredData?.forEach(fee => {
        if (!fee.year || !fee.month) return
        const monthKey = `${fee.year}-${String(fee.month).padStart(2, '0')}`

        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = {
            month: monthKey,
            total: 0,
            paid: 0,
            unpaid: 0,
            count: 0,
            regular: 0,
            special: 0,
            testFee: 0
          }
        }

        // 분할청구는 원 청구건의 분할이므로 중복 방지를 위해 제외
        if (fee.payment_status === '분할청구') return

        const feeAmount = fee.amount || 0
        monthlyMap[monthKey].total += feeAmount
        monthlyMap[monthKey].count++

        // class_type별 집계
        const classType = fee.class_type?.trim()
        if (classType === '정규') {
          monthlyMap[monthKey].regular += feeAmount
        } else if (classType === '특강') {
          monthlyMap[monthKey].special += feeAmount
        } else if (classType === '입학테스트비') {
          monthlyMap[monthKey].testFee += feeAmount
        }

        if (fee.payment_status === '미납') {
          monthlyMap[monthKey].unpaid += feeAmount
        } else {
          monthlyMap[monthKey].paid += feeAmount
        }
      })

      const sortedRevenue = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month))
      setRevenueData(sortedRevenue)
    } catch (error) {
      console.error('매출 데이터 로드 실패:', error)
    } finally {
      setRevenueLoading(false)
    }
  }

  const getAllStats = () => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

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

  const getWithdrawalsTrend = () => {
    return getAllStats().map(stat => ({
      name: `${stat.year}.${String(stat.month).padStart(2, '0')}`,
      퇴원수: stat.withdrawals_total,
      YoY변화: stat.withdrawals_yoy_change
    }))
  }

  // 매출 요약 계산
  const revenueSummary = useMemo(() => {
    if (revenueData.length === 0) return null

    const currentMonth = revenueData[revenueData.length - 1]
    const prevMonth = revenueData.length > 1 ? revenueData[revenueData.length - 2] : null

    const collectionRate = currentMonth.total > 0
      ? Math.round((currentMonth.paid / currentMonth.total) * 100)
      : 0

    const momChange = prevMonth && prevMonth.total > 0
      ? Math.round(((currentMonth.total - prevMonth.total) / prevMonth.total) * 100)
      : 0

    return {
      currentTotal: currentMonth.total,
      currentPaid: currentMonth.paid,
      currentUnpaid: currentMonth.unpaid,
      collectionRate,
      momChange,
      currentMonthLabel: currentMonth.month
    }
  }, [revenueData])

  // 매출 차트 데이터 (정규/특강/입학테스트비 막대 + 미납 + 총액 라인)
  const revenueChartData = useMemo(() => {
    return revenueData.map(r => ({
      month: r.month.slice(2),
      정규: Math.round(r.regular / 10000),
      특강: Math.round(r.special / 10000),
      입학테스트비: Math.round(r.testFee / 10000),
      미납: Math.round(r.unpaid / 10000),
      총매출: Math.round(r.total / 10000),
      수금: Math.round(r.paid / 10000),
    }))
  }, [revenueData])

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
                loadStats()
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

      {/* 차트 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 재원생 추이 */}
        <Card className="border-slate-200/60 dark:border-slate-700/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">재원생 추이</CardTitle>
            <CardDescription className="text-xs">월별 재원생 수 변화</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={getActiveStudentsTrend()} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px -8px rgba(0,0,0,0.15)',
                    padding: '12px 16px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="재원생"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 관별 재원생 분포 */}
        <Card className="border-slate-200/60 dark:border-slate-700/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">관별 재원생 분포</CardTitle>
            <CardDescription className="text-xs">현재 재원생 비율</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={getDeptDistribution()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage, cx, cy, midAngle, innerRadius, outerRadius }) => {
                    const RADIAN = Math.PI / 180
                    const radius = outerRadius + 25
                    const x = cx + radius * Math.cos(-midAngle * RADIAN)
                    const y = cy + radius * Math.sin(-midAngle * RADIAN)
                    return (
                      <text
                        x={x}
                        y={y}
                        fill="hsl(var(--foreground))"
                        textAnchor={x > cx ? 'start' : 'end'}
                        dominantBaseline="central"
                        fontSize={12}
                        fontWeight={500}
                      >
                        {`${name} ${percentage}%`}
                      </text>
                    )
                  }}
                  outerRadius={85}
                  innerRadius={50}
                  fill="#8884d8"
                  dataKey="value"
                  paddingAngle={2}
                >
                  {getDeptDistribution().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={DEPT_COLORS[entry.name] || '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px -8px rgba(0,0,0,0.15)',
                    padding: '12px 16px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 퇴원 추이 - 전체 너비 */}
        <Card className="lg:col-span-2 border-slate-200/60 dark:border-slate-700/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">퇴원 추이</CardTitle>
            <CardDescription className="text-xs">월별 퇴원 수</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={getWithdrawalsTrend()} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px -8px rgba(0,0,0,0.15)',
                    padding: '12px 16px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="퇴원수"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#ef4444', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 매출 현황 섹션 */}
      <div className="space-y-5">
        {/* 섹션 헤더 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/10">
            <BarChart3 className="w-4.5 h-4.5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">매출 현황</h3>
            <p className="text-xs text-muted-foreground">
              {period === "3months" ? "최근 3개월" : period === "6months" ? "최근 6개월" : period === "1year" ? "최근 1년" : "전체"} 기준
            </p>
          </div>
        </div>

        {revenueLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : revenueSummary ? (
          <>
            {/* 매출 요약 카드 - 리디자인 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 이번달 매출 */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">이번달 매출</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {Math.round(revenueSummary.currentTotal / 10000).toLocaleString()}
                  </span>
                  <span className="text-sm font-medium text-slate-500">만원</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-500 dark:bg-slate-400 rounded-full transition-all duration-500"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2">{revenueSummary.currentMonthLabel}</p>
              </div>

              {/* 수금률 */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/50 dark:to-teal-950/30 border border-emerald-200/60 dark:border-emerald-800/40 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">수금률</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                    {revenueSummary.collectionRate}
                  </span>
                  <span className="text-lg font-semibold text-emerald-500">%</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-emerald-200/60 dark:bg-emerald-900/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${revenueSummary.collectionRate}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-2">
                  {Math.round(revenueSummary.currentPaid / 10000).toLocaleString()}만원 수금
                </p>
              </div>

              {/* 미납액 */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-50 to-orange-50/50 dark:from-red-950/50 dark:to-orange-950/30 border border-red-200/60 dark:border-red-800/40 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">미납액</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-red-700 dark:text-red-300 tabular-nums">
                    {Math.round(revenueSummary.currentUnpaid / 10000).toLocaleString()}
                  </span>
                  <span className="text-sm font-medium text-red-500">만원</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-red-200/60 dark:bg-red-900/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all duration-500"
                      style={{ width: `${100 - revenueSummary.collectionRate}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-2">
                  {100 - revenueSummary.collectionRate}% 미수금
                </p>
              </div>

              {/* 전월 대비 */}
              <div className={`relative overflow-hidden rounded-2xl p-5 border ${
                revenueSummary.momChange >= 0
                  ? 'bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/50 dark:to-indigo-950/30 border-blue-200/60 dark:border-blue-800/40'
                  : 'bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/50 dark:to-orange-950/30 border-amber-200/60 dark:border-amber-800/40'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2 h-2 rounded-full ${revenueSummary.momChange >= 0 ? 'bg-blue-500' : 'bg-amber-500'}`}></div>
                  <span className={`text-xs font-medium uppercase tracking-wide ${
                    revenueSummary.momChange >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'
                  }`}>전월 대비</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-3xl font-bold tabular-nums ${
                    revenueSummary.momChange >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-amber-700 dark:text-amber-300'
                  }`}>
                    {revenueSummary.momChange > 0 ? '+' : ''}{revenueSummary.momChange}
                  </span>
                  <span className={`text-lg font-semibold ${
                    revenueSummary.momChange >= 0 ? 'text-blue-500' : 'text-amber-500'
                  }`}>%</span>
                  {revenueSummary.momChange >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-blue-500 ml-1" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-amber-500 ml-1" />
                  )}
                </div>
                <p className={`text-xs mt-4 ${
                  revenueSummary.momChange >= 0 ? 'text-blue-600/70 dark:text-blue-400/70' : 'text-amber-600/70 dark:text-amber-400/70'
                }`}>
                  {revenueSummary.momChange >= 0 ? '매출 상승' : '매출 감소'} 추세
                </p>
              </div>
            </div>

            {/* 월별 매출 추이 차트 - 정규/특강/입학테스트비/미납 막대 + 총매출 라인 */}
            <Card className="border-slate-200/60 dark:border-slate-700/60">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">월별 매출 추이</CardTitle>
                    <CardDescription className="text-xs">유형별 매출 비교 (단위: 만원)</CardDescription>
                  </div>
                  <div className="flex items-center gap-3 text-xs flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-blue-500"></span>
                      <span className="text-muted-foreground">정규</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-violet-500"></span>
                      <span className="text-muted-foreground">특강</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-amber-500"></span>
                      <span className="text-muted-foreground">입학테스트비</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-red-400"></span>
                      <span className="text-muted-foreground">미납</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-6 h-0.5 rounded bg-emerald-500"></span>
                      <span className="text-muted-foreground">총매출</span>
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={revenueChartData} margin={{ top: 10, right: 10, bottom: 5, left: -10 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      tickFormatter={(v) => `${v}`}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        const data = payload[0]?.payload
                        if (!data) return null
                        return (
                          <div className="bg-background border border-border rounded-xl p-4 text-sm shadow-lg" style={{ boxShadow: '0 8px 32px -8px rgba(0,0,0,0.15)' }}>
                            <p className="font-semibold mb-3 text-foreground pb-2 border-b border-border">20{label}</p>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-6">
                                <span className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500"></span>
                                  <span className="text-muted-foreground">정규</span>
                                </span>
                                <span className="font-semibold text-blue-600 dark:text-blue-400 tabular-nums">{data.정규?.toLocaleString()}만원</span>
                              </div>
                              <div className="flex items-center justify-between gap-6">
                                <span className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-sm bg-violet-500"></span>
                                  <span className="text-muted-foreground">특강</span>
                                </span>
                                <span className="font-semibold text-violet-600 dark:text-violet-400 tabular-nums">{data.특강?.toLocaleString()}만원</span>
                              </div>
                              <div className="flex items-center justify-between gap-6">
                                <span className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span>
                                  <span className="text-muted-foreground">입학테스트비</span>
                                </span>
                                <span className="font-semibold text-amber-600 dark:text-amber-400 tabular-nums">{data.입학테스트비?.toLocaleString()}만원</span>
                              </div>
                              {data.미납 > 0 && (
                                <div className="flex items-center justify-between gap-6">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-sm bg-red-400"></span>
                                    <span className="text-muted-foreground">미납</span>
                                  </span>
                                  <span className="font-semibold text-red-500 dark:text-red-400 tabular-nums">{data.미납?.toLocaleString()}만원</span>
                                </div>
                              )}
                              <div className="flex items-center justify-between gap-6 pt-2 mt-2 border-t border-border">
                                <span className="flex items-center gap-2">
                                  <span className="w-4 h-0.5 rounded bg-emerald-500"></span>
                                  <span className="text-foreground font-medium">총매출</span>
                                </span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{data.총매출?.toLocaleString()}만원</span>
                              </div>
                            </div>
                          </div>
                        )
                      }}
                    />
                    {/* 정규/특강/입학테스트비/미납 막대 그래프 (개별) */}
                    <Bar yAxisId="left" dataKey="정규" fill="#3b82f6" name="정규" radius={[4, 4, 0, 0]} maxBarSize={24} />
                    <Bar yAxisId="left" dataKey="특강" fill="#8b5cf6" name="특강" radius={[4, 4, 0, 0]} maxBarSize={24} />
                    <Bar yAxisId="left" dataKey="입학테스트비" fill="#f59e0b" name="입학테스트비" radius={[4, 4, 0, 0]} maxBarSize={24} />
                    <Bar yAxisId="left" dataKey="미납" fill="#f87171" name="미납" radius={[4, 4, 0, 0]} maxBarSize={24} />
                    {/* 총매출 라인 그래프 */}
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="총매출"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            매출 데이터가 없습니다.
          </div>
        )}
      </div>

      {/* 코호트 분석 섹션 */}
      <div className="space-y-5">
        {/* 섹션 헤더 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-sky-500/10">
            <Target className="w-4.5 h-4.5 text-sky-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">코호트 분석</h3>
            <p className="text-xs text-muted-foreground">상담 → 등록 전환 추적</p>
          </div>
        </div>

        {cohortHook.loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
          </div>
        ) : cohortHook.cohortSummary ? (
          <>
            {/* 코호트 요약 카드 - 리디자인 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 최근 3개월 평균 전환율 */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50/50 dark:from-teal-950/50 dark:to-emerald-950/30 border border-teal-200/60 dark:border-teal-800/40 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                  <span className="text-xs font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wide">평균 전환율</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-teal-700 dark:text-teal-300 tabular-nums">
                    {cohortHook.cohortSummary.recent3Avg}
                  </span>
                  <span className="text-lg font-semibold text-teal-500">%</span>
                  {cohortHook.cohortSummary.conversionChange !== 0 && (
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium ${
                      cohortHook.cohortSummary.conversionChange > 0
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                    }`}>
                      {cohortHook.cohortSummary.conversionChange > 0 ? "+" : ""}{cohortHook.cohortSummary.conversionChange}%p
                    </span>
                  )}
                </div>
                <p className="text-xs text-teal-600/70 dark:text-teal-400/70 mt-3">최근 3개월 기준</p>
              </div>

              {/* 진행중 코호트 현황 */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50/50 dark:from-sky-950/50 dark:to-blue-950/30 border border-sky-200/60 dark:border-sky-800/40 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-sky-500"></div>
                  <span className="text-xs font-medium text-sky-600 dark:text-sky-400 uppercase tracking-wide">진행중 코호트</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-sky-700 dark:text-sky-300 tabular-nums">
                    {cohortHook.cohortSummary.convertedOngoing}
                  </span>
                  <span className="text-lg text-sky-400 font-light">/</span>
                  <span className="text-xl font-semibold text-sky-500 tabular-nums">{cohortHook.cohortSummary.totalOngoing}</span>
                  <span className="text-sm font-medium text-sky-500 ml-1">명</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-sky-200/60 dark:bg-sky-900/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full transition-all duration-500"
                      style={{ width: `${cohortHook.cohortSummary.ongoingConversionRate}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-sky-600 tabular-nums">{cohortHook.cohortSummary.ongoingConversionRate}%</span>
                </div>
              </div>

              {/* 평균 등록 소요일 */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50/50 dark:from-violet-950/50 dark:to-purple-950/30 border border-violet-200/60 dark:border-violet-800/40 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                  <span className="text-xs font-medium text-violet-600 dark:text-violet-400 uppercase tracking-wide">등록 소요</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-violet-700 dark:text-violet-300 tabular-nums">
                    {cohortHook.cohortSummary.avgDaysToEnroll !== null ? cohortHook.cohortSummary.avgDaysToEnroll : "-"}
                  </span>
                  {cohortHook.cohortSummary.avgDaysToEnroll !== null && (
                    <span className="text-sm font-medium text-violet-500">일</span>
                  )}
                </div>
                <p className="text-xs text-violet-600/70 dark:text-violet-400/70 mt-3">첫 상담 → 등록</p>
              </div>

              {/* Best/Worst 코호트 */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/50 dark:to-orange-950/30 border border-amber-200/60 dark:border-amber-800/40 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Best / Worst</span>
                </div>
                <div className="space-y-2">
                  {cohortHook.cohortSummary.bestCohort && (
                    <div className="flex items-center gap-2">
                      <span className="text-base">🏆</span>
                      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {cohortHook.cohortSummary.bestCohort.cohort_month.slice(5)}월
                      </span>
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-500">
                        {cohortHook.cohortSummary.bestCohort.final_conversion_rate}%
                      </span>
                      {cohortHook.cohortSummary.bestCohort.is_ongoing && (
                        <span className="text-[10px] text-sky-600 bg-sky-100 dark:bg-sky-900/50 px-1.5 py-0.5 rounded-full">진행중</span>
                      )}
                    </div>
                  )}
                  {cohortHook.cohortSummary.worstCohort && (
                    <div className="flex items-center gap-2">
                      <span className="text-base">📉</span>
                      <span className="text-sm font-bold text-red-700 dark:text-red-400 tabular-nums">
                        {cohortHook.cohortSummary.worstCohort.cohort_month.slice(5)}월
                      </span>
                      <span className="text-sm font-semibold text-red-600 dark:text-red-500">
                        {cohortHook.cohortSummary.worstCohort.final_conversion_rate}%
                      </span>
                      {cohortHook.cohortSummary.worstCohort.is_ongoing && (
                        <span className="text-[10px] text-sky-600 bg-sky-100 dark:bg-sky-900/50 px-1.5 py-0.5 rounded-full">진행중</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 코호트 차트 (YoY 비교) */}
            {cohortHook.chartData.length > 0 && (
              <Card className="border-slate-200/60 dark:border-slate-700/60">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">월별 코호트 현황</CardTitle>
                      <CardDescription className="text-xs">최근 12개월, YoY 비교</CardDescription>
                    </div>
                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#3b82f6' }}></span>
                        <span className="text-muted-foreground">올해 상담</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#93c5fd' }}></span>
                        <span className="text-muted-foreground">작년 상담</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#14b8a6' }}></span>
                        <span className="text-muted-foreground">올해 등록</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#5eead4' }}></span>
                        <span className="text-muted-foreground">작년 등록</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-0.5 rounded" style={{ backgroundColor: '#f97316' }}></span>
                        <span className="text-muted-foreground">전환율</span>
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={cohortHook.chartData} margin={{ top: 10, right: 10, bottom: 45, left: -10 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
                      <XAxis
                        dataKey="fullMonth"
                        height={60}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        tickLine={false}
                        tick={(props: { x: number; y: number; payload: { value: string } }) => {
                          const { x, y, payload } = props
                          const dataItem = cohortHook.chartData.find(d => d.fullMonth === payload.value)
                          const yoyChange = dataItem?.yoyChange
                          const hasYoY = yoyChange !== null && yoyChange !== undefined
                          const isPositive = yoyChange !== null && yoyChange >= 0
                          return (
                            <g transform={`translate(${x},${y})`}>
                              <text x={0} y={0} dy={12} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={11}>
                                {payload.value?.slice(2) || ''}
                              </text>
                              <text
                                x={0}
                                y={0}
                                dy={26}
                                textAnchor="middle"
                                fill={hasYoY ? (isPositive ? '#10b981' : '#ef4444') : 'hsl(var(--muted-foreground))'}
                                fontSize={10}
                                fontWeight={500}
                              >
                                {hasYoY ? `${isPositive ? '+' : ''}${yoyChange}%` : '-'}
                              </text>
                            </g>
                          )
                        }}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(value) => `${value}`}
                        domain={[0, 'auto']}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(value) => `${value}%`}
                        domain={[0, 'auto']}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          const data = payload[0]?.payload
                          if (!data) return null
                          const yoyChange = data.yoyChange
                          const hasYoY = yoyChange !== null
                          const isPositive = yoyChange > 0
                          return (
                            <div className="bg-background border border-border rounded-xl p-4 text-sm shadow-lg" style={{ boxShadow: '0 8px 32px -8px rgba(0,0,0,0.15)' }}>
                              <p className="font-semibold mb-2 text-foreground">{data.fullMonth}</p>
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-blue-600 dark:text-blue-400">올해 상담: {data.총원}명</span>
                                  {data.prevYear총원 !== null && (
                                    <span className="text-blue-400 dark:text-blue-300">(작년: {data.prevYear총원}명)</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-teal-600 dark:text-teal-400">올해 등록: {data.등록}명</span>
                                  {data.prevYear등록 !== null && (
                                    <span className="text-teal-400 dark:text-teal-300">(작년: {data.prevYear등록}명)</span>
                                  )}
                                </div>
                                <p className="text-orange-600 dark:text-orange-400">전환율: {data.전환율}%</p>
                              </div>
                              {hasYoY && (
                                <div className="mt-3 pt-3 border-t border-border">
                                  <p className={isPositive ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-red-600 dark:text-red-400 font-medium"}>
                                    YoY: {isPositive ? '+' : ''}{yoyChange}%p
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">전년 동월 전환율: {data.prevYearRate}%</p>
                                </div>
                              )}
                              {data.isOngoing && (
                                <p className="text-sky-500 text-xs mt-2 font-medium">● 진행중</p>
                              )}
                            </div>
                          )
                        }}
                      />
                      <Bar yAxisId="left" dataKey="총원" name="올해 상담" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={16} />
                      <Bar yAxisId="left" dataKey="prevYear총원" name="작년 상담" fill="#93c5fd" radius={[3, 3, 0, 0]} maxBarSize={16} />
                      <Bar yAxisId="left" dataKey="등록" name="올해 등록" fill="#14b8a6" radius={[3, 3, 0, 0]} maxBarSize={16} />
                      <Bar yAxisId="left" dataKey="prevYear등록" name="작년 등록" fill="#5eead4" radius={[3, 3, 0, 0]} maxBarSize={16} />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="전환율"
                        stroke="#f97316"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "#f97316", strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            코호트 데이터가 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}
