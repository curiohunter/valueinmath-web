"use client"

import { useMemo } from "react"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { TrendingUp, TrendingDown, BookOpen, Target, Calendar, User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig 
} from "@/components/ui/chart"
import type { MonthlyReportData, BookProgress } from "@/types/analytics"

interface AnalyticsChartsProps {
  monthlyData: MonthlyReportData | null
  bookProgresses: BookProgress[]
  teachers?: { id: string; name: string }[]
  isLoading?: boolean
}

// 시험 점수 차트 설정
const testScoreChartConfig = {
  score: {
    label: "시험 점수",
    color: "#3b82f6" // blue-500
  },
  average: {
    label: "평균",
    color: "#ef4444" // red-500
  }
} satisfies ChartConfig

// 진도 차트 설정
const progressChartConfig = {
  progress: {
    label: "진도율",
    color: "hsl(var(--chart-3))"
  },
  completed: {
    label: "완료",
    color: "hsl(var(--chart-4))"
  }
} satisfies ChartConfig

export function AnalyticsCharts({ 
  monthlyData, 
  bookProgresses, 
  teachers = [],
  isLoading = false 
}: AnalyticsChartsProps) {
  
  // 담당자별로 시험 점수 데이터 그룹화
  const testScoresByTeacher = useMemo(() => {
    if (!monthlyData?.testLogs) return {}
    
    // created_by로 그룹화
    const grouped = monthlyData.testLogs.reduce((acc, log) => {
      if (log.test_score === null) return acc
      
      const teacherId = log.created_by || 'unknown'
      const teacherName = log.created_by_name || '미지정'
      
      if (!acc[teacherId]) {
        acc[teacherId] = {
          teacherId,
          teacherName,
          data: []
        }
      }
      
      acc[teacherId].data.push({
        date: new Date(log.date).toLocaleDateString('ko-KR', { 
          month: 'short', 
          day: 'numeric' 
        }),
        score: log.test_score,
        testName: log.test || "시험",
        fullDate: log.date
      })
      
      return acc
    }, {} as Record<string, { teacherId: string; teacherName: string; data: any[] }>)
    
    // 각 그룹의 데이터 정렬 및 평균 추가
    Object.values(grouped).forEach(group => {
      group.data.sort((a, b) => a.fullDate.localeCompare(b.fullDate))
      
      const avgScore = group.data.length > 0 
        ? group.data.reduce((sum, item) => sum + item.score, 0) / group.data.length 
        : 0
        
      group.data = group.data.map(item => ({
        ...item,
        average: Number(avgScore.toFixed(1))
      }))
    })
    
    return grouped
  }, [monthlyData, teachers])
  
  // 전체 시험 점수 데이터 (기존 로직 유지)
  const testScoreData = useMemo(() => {
    if (!monthlyData?.testLogs) return []
    
    const scores = monthlyData.testLogs
      .filter(log => log.test_score !== null)
      .map(log => ({
        date: new Date(log.date).toLocaleDateString('ko-KR', { 
          month: 'short', 
          day: 'numeric' 
        }),
        score: log.test_score!,
        testName: log.test || "시험",
        fullDate: log.date
      }))
      .sort((a, b) => a.fullDate.localeCompare(b.fullDate))

    // 평균선 추가
    const avgScore = scores.length > 0 
      ? scores.reduce((sum, item) => sum + item.score, 0) / scores.length 
      : 0

    return scores.map(item => ({
      ...item,
      average: Number(avgScore.toFixed(1))
    }))
  }, [monthlyData])


  // 차트 트렌드 계산
  const testTrend = useMemo(() => {
    if (testScoreData.length < 2) return null
    
    const first = testScoreData[0].score
    const last = testScoreData[testScoreData.length - 1].score
    const difference = last - first
    
    return {
      direction: difference > 0 ? 'up' : difference < 0 ? 'down' : 'stable',
      value: Math.abs(difference)
    }
  }, [testScoreData])

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 담당자별 시험 점수 추이 차트 */}
      {Object.keys(testScoresByTeacher).length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.values(testScoresByTeacher).map(({ teacherId, teacherName, data }) => {
            // 각 선생님별 트렌드 계산
            const teacherTrend = data.length >= 2 ? {
              direction: data[data.length - 1].score > data[0].score ? 'up' : 
                        data[data.length - 1].score < data[0].score ? 'down' : 'stable',
              value: Math.abs(data[data.length - 1].score - data[0].score)
            } : null

            return (
              <Card key={teacherId}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      <span>시험 점수 추이</span>
                      <span className="text-sm font-normal text-muted-foreground">
                        ({teacherName} 선생님)
                      </span>
                    </div>
                    {teacherTrend && (
                      <div className="flex items-center gap-1 text-sm">
                        {teacherTrend.direction === 'up' ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : teacherTrend.direction === 'down' ? (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        ) : null}
                        <span className={`${
                          teacherTrend.direction === 'up' 
                            ? 'text-green-600 dark:text-green-400' 
                            : teacherTrend.direction === 'down' 
                            ? 'text-red-600 dark:text-red-400' 
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {teacherTrend.direction === 'up' ? '+' : teacherTrend.direction === 'down' ? '-' : ''}
                          {teacherTrend.value}점
                        </span>
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={testScoreChartConfig} className="h-64">
                    <LineChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        tickMargin={8}
                      />
                      <YAxis 
                        domain={['dataMin - 10', 'dataMax + 10']}
                        tick={{ fontSize: 12 }}
                        tickMargin={8}
                      />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        labelFormatter={(value, payload) => {
                          const data = payload?.[0]?.payload
                          return data?.testName ? `${data.testName} (${value})` : value
                        }}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={{ fill: "#3b82f6", strokeWidth: 2, r: 5 }}
                        activeDot={{ r: 7, fill: "#2563eb" }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="average"
                        stroke="#ef4444"
                        strokeWidth={2}
                        strokeDasharray="8 4"
                        dot={false}
                        name="평균"
                        opacity={0.7}
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* 전체 시험 점수 추이 차트 (담당자별 차트가 없을 때만 표시) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.keys(testScoresByTeacher).length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  시험 점수 추이
                </div>
                {testTrend && (
                  <div className="flex items-center gap-1 text-sm">
                    {testTrend.direction === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : testTrend.direction === 'down' ? (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    ) : null}
                    <span className={`${
                      testTrend.direction === 'up' 
                        ? 'text-green-600 dark:text-green-400' 
                        : testTrend.direction === 'down' 
                        ? 'text-red-600 dark:text-red-400' 
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {testTrend.direction === 'up' ? '+' : testTrend.direction === 'down' ? '-' : ''}
                      {testTrend.value}점
                    </span>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {testScoreData.length > 0 ? (
                <ChartContainer config={testScoreChartConfig} className="h-64">
                  <LineChart data={testScoreData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickMargin={8}
                    />
                    <YAxis 
                      domain={['dataMin - 10', 'dataMax + 10']}
                      tick={{ fontSize: 12 }}
                      tickMargin={8}
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      labelFormatter={(value, payload) => {
                        const data = payload?.[0]?.payload
                        return data?.testName ? `${data.testName} (${value})` : value
                      }}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ fill: "#3b82f6", strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7, fill: "#2563eb" }}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="average"
                      stroke="#ef4444"
                      strokeWidth={2}
                      strokeDasharray="8 4"
                      dot={false}
                      name="평균"
                      opacity={0.7}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>시험 데이터가 없습니다</p>
                    <p className="text-xs">시험을 치르면 점수 추이를 확인할 수 있습니다</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 날짜별/선생님별 진도 현황 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              날짜별 진도 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DailyProgressList monthlyData={monthlyData} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// 날짜별/선생님별 진도 리스트 컴포넌트
function DailyProgressList({ monthlyData }: { monthlyData: MonthlyReportData | null }) {
  const dailyProgress = useMemo(() => {
    if (!monthlyData?.studyLogs) return []
    
    // 날짜별로 그룹화
    const grouped = monthlyData.studyLogs.reduce((acc, log) => {
      const date = log.date
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(log)
      return acc
    }, {} as Record<string, typeof monthlyData.studyLogs>)
    
    // 날짜별로 정렬하여 배열로 변환
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b)) // 오래된 날짜부터 (오름차순)
      .map(([date, logs]) => ({
        date,
        logs: logs.sort((a, b) => (a.created_by_name || '').localeCompare(b.created_by_name || ''))
      }))
  }, [monthlyData])

  if (dailyProgress.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>진도 데이터가 없습니다</p>
          <p className="text-xs">수업이 진행되면 진도를 확인할 수 있습니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      {dailyProgress.map(({ date, logs }) => (
        <div key={date} className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium">
              {new Date(date).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short'
              })}
            </h4>
            <Badge variant="secondary" className="ml-auto">
              {logs.length}건
            </Badge>
          </div>
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 text-sm border-l-2 border-muted pl-3">
                <div className="flex items-center gap-2 min-w-[100px]">
                  <User className="h-3 w-3" />
                  <span className="font-medium">{log.created_by_name || '미지정'}</span>
                </div>
                <div className="flex-1 space-y-1">
                  {log.book1 && (
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      <span className="text-muted-foreground">{log.book1}:</span>
                      <span>{log.book1log || '진도 없음'}</span>
                    </div>
                  )}
                  {log.book2 && (
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      <span className="text-muted-foreground">{log.book2}:</span>
                      <span>{log.book2log || '진도 없음'}</span>
                    </div>
                  )}
                  {log.note && (
                    <div className="text-xs text-muted-foreground italic">{log.note}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}