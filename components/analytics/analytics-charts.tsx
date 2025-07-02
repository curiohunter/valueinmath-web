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

      {/* 교재 진도 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            교재별 진도 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookProgresses.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {bookProgresses.map((book, index) => (
                <div key={index} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm">{book.bookName}</h4>
                    <span className="text-xs text-muted-foreground">
                      {book.lastUpdated ? new Date(book.lastUpdated).toLocaleDateString('ko-KR') : ''}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>현재 진도:</span>
                      <span className="font-medium text-foreground">{book.currentChapter || '시작 전'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>완료 챕터:</span>
                      <span className="font-medium text-foreground">{book.completedChapters}개</span>
                    </div>
                    {book.chapters.length > 0 && (
                      <div className="mt-2">
                        <details className="cursor-pointer">
                          <summary className="text-xs text-muted-foreground hover:text-foreground">
                            진도 상세보기
                          </summary>
                          <div className="mt-1 pl-4 text-xs text-muted-foreground">
                            {book.chapters.map((chapter, idx) => (
                              <div key={idx}>{chapter}</div>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
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