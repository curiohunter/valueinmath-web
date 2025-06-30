"use client"

import { useMemo } from "react"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { TrendingUp, TrendingDown, BookOpen, Target } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  isLoading?: boolean
}

// 시험 점수 차트 설정
const testScoreChartConfig = {
  score: {
    label: "시험 점수",
    color: "hsl(var(--chart-1))"
  },
  average: {
    label: "평균",
    color: "hsl(var(--chart-2))"
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
  isLoading = false 
}: AnalyticsChartsProps) {
  
  // 시험 점수 차트 데이터 가공
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

  // 교재 진도 차트 데이터 가공
  const progressData = useMemo(() => {
    if (!bookProgresses?.length) return []
    
    return bookProgresses.map(book => ({
      bookName: book.bookName.length > 10 
        ? book.bookName.substring(0, 10) + "..." 
        : book.bookName,
      fullBookName: book.bookName,
      progress: book.progressPercentage,
      completed: book.completedChapters,
      total: book.totalChapters
    }))
  }, [bookProgresses])

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* 시험 점수 트렌드 차트 */}
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
                  stroke="var(--color-score)"
                  strokeWidth={3}
                  dot={{ fill: "var(--color-score)", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="average"
                  stroke="var(--color-average)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="평균"
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

      {/* 교재 진도 차트 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            교재별 진도율
          </CardTitle>
        </CardHeader>
        <CardContent>
          {progressData.length > 0 ? (
            <ChartContainer config={progressChartConfig} className="h-64">
              <BarChart data={progressData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="bookName" 
                  tick={{ fontSize: 12 }}
                  tickMargin={8}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  tickMargin={8}
                  label={{ value: '진도율 (%)', angle: -90, position: 'insideLeft' }}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  labelFormatter={(value, payload) => {
                    const data = payload?.[0]?.payload
                    return data?.fullBookName || value
                  }}
                  formatter={(value, name, props) => {
                    if (name === 'progress') {
                      const data = props.payload
                      return [
                        `${value}% (${data.completed}/${data.total} 챕터)`,
                        '진도율'
                      ]
                    }
                    return [value, name]
                  }}
                />
                <Bar
                  dataKey="progress"
                  fill="var(--color-progress)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={60}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>교재 진도 데이터가 없습니다</p>
                <p className="text-xs">수업이 진행되면 교재별 진도를 확인할 수 있습니다</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}