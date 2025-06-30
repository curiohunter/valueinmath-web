// @ts-nocheck
"use client"

import { useMemo } from "react"
import { TrendingUp, TrendingDown, User, BookOpen, ClipboardCheck, BarChart3 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { MonthlyReportData, MonthlyStats } from "@/types/analytics"

interface AnalyticsStatsCardsProps {
  monthlyData: MonthlyReportData | null
  isLoading?: boolean
}

interface StatCardData {
  title: string
  value: string
  description: string
  trend?: number
  icon: React.ReactNode
  color: string
  bgGradient: string
}

export function AnalyticsStatsCards({ 
  monthlyData, 
  isLoading = false 
}: AnalyticsStatsCardsProps) {
  
  const statsCards = useMemo(() => {
    if (!monthlyData) {
      return [
        {
          title: "출석률",
          value: "-%",
          description: "데이터 없음",
          icon: <User className="h-5 w-5" />,
          color: "text-blue-600 dark:text-blue-400",
          bgGradient: "from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20"
        },
        {
          title: "집중도",
          value: "-점",
          description: "데이터 없음",
          icon: <BookOpen className="h-5 w-5" />,
          color: "text-green-600 dark:text-green-400",
          bgGradient: "from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20"
        },
        {
          title: "과제수행도",
          value: "-%",
          description: "데이터 없음",
          icon: <ClipboardCheck className="h-5 w-5" />,
          color: "text-purple-600 dark:text-purple-400",
          bgGradient: "from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20"
        },
        {
          title: "시험평균",
          value: "-점",
          description: "데이터 없음",
          icon: <BarChart3 className="h-5 w-5" />,
          color: "text-orange-600 dark:text-orange-400",
          bgGradient: "from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20"
        }
      ]
    }

    const stats = monthlyData.monthlyStats

    return [
      {
        title: "출석률",
        value: `${(stats.attendanceRate || 0)}%`,
        description: `총 ${(stats.totalClasses || 0)}일 중 ${Math.round((stats.totalClasses || 0) * (stats.attendanceRate || 0) / 100)}일 출석`,
        trend: (stats.attendanceRate || 0) >= 90 ? 1 : (stats.attendanceRate || 0) >= 70 ? 0 : -1,
        icon: <User className="h-5 w-5" />,
        color: "text-blue-600 dark:text-blue-400",
        bgGradient: "from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20"
      },
      {
        title: "집중도",
        value: `${(stats.avgFocus || 0).toFixed(1)}점`,
        description: `5점 만점 기준 평균 집중도`,
        trend: (stats.avgFocus || 0) >= 4 ? 1 : (stats.avgFocus || 0) >= 3 ? 0 : -1,
        icon: <BookOpen className="h-5 w-5" />,
        color: "text-green-600 dark:text-green-400",
        bgGradient: "from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20"
      },
      {
        title: "과제수행도",
        value: `${(stats.avgHomework || 0).toFixed(1)}점`,
        description: `5점 만점 기준 평균 과제수행도`,
        trend: (stats.avgHomework || 0) >= 4 ? 1 : (stats.avgHomework || 0) >= 3 ? 0 : -1,
        icon: <ClipboardCheck className="h-5 w-5" />,
        color: "text-purple-600 dark:text-purple-400",
        bgGradient: "from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20"
      },
      {
        title: "시험평균",
        value: `${(stats.avgTestScore || 0).toFixed(1)}점`,
        description: `총 ${(stats.totalTests || 0)}회 시험 평균`,
        trend: (stats.avgTestScore || 0) >= 80 ? 1 : (stats.avgTestScore || 0) >= 60 ? 0 : -1,
        icon: <BarChart3 className="h-5 w-5" />,
        color: "text-orange-600 dark:text-orange-400",
        bgGradient: "from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20"
      }
    ]
  }, [monthlyData])

  const renderTrendIcon = (trend?: number) => {
    if (trend === undefined) return null
    
    if (trend > 0) {
      return <TrendingUp className="h-4 w-4 text-green-500" />
    } else if (trend < 0) {
      return <TrendingDown className="h-4 w-4 text-red-500" />
    }
    return null
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
              </CardTitle>
              <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statsCards.map((card, index) => (
        <Card 
          key={index} 
          className={`relative overflow-hidden bg-gradient-to-br ${card.bgGradient} border-0 shadow-sm hover:shadow-md transition-all duration-200`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {card.title}
            </CardTitle>
            <div className={`${card.color} p-2 rounded-lg bg-white/50 dark:bg-black/20`}>
              {card.icon}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {card.value}
              </div>
              {renderTrendIcon(card.trend)}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {card.description}
            </p>
            
            {/* 성과 레벨 표시 */}
            {card.trend !== undefined && (
              <div className="mt-3 flex items-center gap-1">
                <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      card.trend > 0 
                        ? 'bg-green-500 w-full' 
                        : card.trend === 0 
                        ? 'bg-yellow-500 w-2/3' 
                        : 'bg-red-500 w-1/3'
                    }`}
                  />
                </div>
                <span className={`text-xs font-medium ${
                  card.trend > 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : card.trend === 0 
                    ? 'text-yellow-600 dark:text-yellow-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {card.trend > 0 ? '우수' : card.trend === 0 ? '보통' : '개선필요'}
                </span>
              </div>
            )}
          </CardContent>
          
          {/* 백그라운드 패턴 */}
          <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-10">
            <div className={`${card.color} text-6xl transform rotate-12`}>
              {card.icon}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}