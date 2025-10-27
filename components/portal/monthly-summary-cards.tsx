"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MonthlyAggregation, TuitionFeeItem } from "@/types/portal"
import {
  CalendarCheck,
  BookCheck,
  TrendingUp,
  CreditCard,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface MonthlySummaryCardsProps {
  monthly_aggregations: MonthlyAggregation[]
  tuition_fees: TuitionFeeItem[]
  onCardClick?: (cardType: "attendance" | "homework" | "score" | "tuition") => void
}

interface CardData {
  id: "attendance" | "homework" | "score" | "tuition"
  title: string
  value: string
  unit: string
  change: number | null
  changeLabel: string
  icon: React.ReactNode
  color: string
  bgColor: string
}

export function MonthlySummaryCards({
  monthly_aggregations,
  tuition_fees,
  onCardClick,
}: MonthlySummaryCardsProps) {
  // Get current month and previous month data
  const currentMonth = monthly_aggregations[0]
  const previousMonth = monthly_aggregations[1]

  // Get current month tuition fee
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonthNum = now.getMonth() + 1
  const currentTuition = tuition_fees.find(
    (fee) => fee.year === currentYear && fee.month === currentMonthNum
  )

  // Calculate attendance rate and change
  const attendanceRate = currentMonth?.attendance_rate || 0
  const attendanceChange = currentMonth && previousMonth
    ? currentMonth.attendance_rate - previousMonth.attendance_rate
    : null

  // Calculate homework completion rate and change
  const homeworkRate = currentMonth?.homework_rate || 0
  const homeworkChange = currentMonth && previousMonth
    ? currentMonth.homework_rate - previousMonth.homework_rate
    : null

  // Calculate average score and change
  const averageScore = currentMonth?.average_score || 0
  const scoreChange = currentMonth && previousMonth
    ? currentMonth.average_score - previousMonth.average_score
    : null

  // Determine color for each metric
  const getColorClass = (value: number, type: "rate" | "score") => {
    if (type === "rate") {
      if (value >= 90) return { color: "text-green-600", bg: "bg-green-50" }
      if (value >= 70) return { color: "text-yellow-600", bg: "bg-yellow-50" }
      return { color: "text-red-600", bg: "bg-red-50" }
    } else {
      // score
      if (value >= 85) return { color: "text-green-600", bg: "bg-green-50" }
      if (value >= 70) return { color: "text-yellow-600", bg: "bg-yellow-50" }
      return { color: "text-red-600", bg: "bg-red-50" }
    }
  }

  const attendanceColor = getColorClass(attendanceRate, "rate")
  const homeworkColor = getColorClass(homeworkRate, "rate")
  const scoreColor = getColorClass(averageScore, "score")

  // Tuition status
  const tuitionStatus = currentTuition?.payment_status || "미납"
  const tuitionColor =
    tuitionStatus === "완납"
      ? { color: "text-green-600", bg: "bg-green-50" }
      : tuitionStatus === "일부납부"
      ? { color: "text-yellow-600", bg: "bg-yellow-50" }
      : { color: "text-red-600", bg: "bg-red-50" }

  const cards: CardData[] = [
    {
      id: "attendance",
      title: "출석률",
      value: attendanceRate.toFixed(1),
      unit: "%",
      change: attendanceChange,
      changeLabel: "전월 대비",
      icon: <CalendarCheck className="h-5 w-5" />,
      color: attendanceColor.color,
      bgColor: attendanceColor.bg,
    },
    {
      id: "homework",
      title: "과제 수행률",
      value: homeworkRate.toFixed(1),
      unit: "%",
      change: homeworkChange,
      changeLabel: "전월 대비",
      icon: <BookCheck className="h-5 w-5" />,
      color: homeworkColor.color,
      bgColor: homeworkColor.bg,
    },
    {
      id: "score",
      title: "평균 점수",
      value: averageScore.toFixed(1),
      unit: "점",
      change: scoreChange,
      changeLabel: "전월 대비",
      icon: <TrendingUp className="h-5 w-5" />,
      color: scoreColor.color,
      bgColor: scoreColor.bg,
    },
    {
      id: "tuition",
      title: "원비 납부",
      value: tuitionStatus,
      unit: "",
      change: null,
      changeLabel: currentTuition
        ? `${currentTuition.amount.toLocaleString()}원`
        : "정보 없음",
      icon: <CreditCard className="h-5 w-5" />,
      color: tuitionColor.color,
      bgColor: tuitionColor.bg,
    },
  ]

  const renderChangeIndicator = (change: number | null) => {
    if (change === null || change === 0) {
      return (
        <span className="flex items-center gap-0.5 text-xs text-gray-500">
          <Minus className="h-3 w-3" />
          <span>변동 없음</span>
        </span>
      )
    }

    if (change > 0) {
      return (
        <span className="flex items-center gap-0.5 text-xs text-green-600">
          <ArrowUp className="h-3 w-3" />
          <span>{Math.abs(change).toFixed(1)}</span>
        </span>
      )
    }

    return (
      <span className="flex items-center gap-0.5 text-xs text-red-600">
        <ArrowDown className="h-3 w-3" />
        <span>{Math.abs(change).toFixed(1)}</span>
      </span>
    )
  }

  return (
    <div className="w-full">
      {/* Mobile: Horizontal scroll with snap */}
      <div className="md:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide">
        {cards.map((card) => (
          <div
            key={card.id}
            className="snap-center shrink-0 w-[280px] first:ml-4 last:mr-4"
          >
            <Card
              className={cn(
                "cursor-pointer hover:shadow-md transition-shadow h-full",
                card.bgColor
              )}
              onClick={() => onCardClick?.(card.id)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className={cn("rounded-full p-2", card.bgColor)}>
                  {card.icon}
                </div>
              </CardHeader>
              <CardContent>
                <div className={cn("text-3xl font-bold", card.color)}>
                  {card.value}
                  {card.unit && <span className="text-xl ml-1">{card.unit}</span>}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {card.change !== null ? (
                    <>
                      {renderChangeIndicator(card.change)}
                      <span className="text-xs text-gray-500">{card.changeLabel}</span>
                    </>
                  ) : (
                    <span className="text-xs text-gray-600">{card.changeLabel}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Tablet/Desktop: Grid layout */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card
            key={card.id}
            className={cn(
              "cursor-pointer hover:shadow-md transition-shadow",
              card.bgColor
            )}
            onClick={() => onCardClick?.(card.id)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={cn("rounded-full p-2", card.bgColor)}>
                {card.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className={cn("text-3xl font-bold", card.color)}>
                {card.value}
                {card.unit && <span className="text-xl ml-1">{card.unit}</span>}
              </div>
              <div className="flex items-center gap-2 mt-2">
                {card.change !== null ? (
                  <>
                    {renderChangeIndicator(card.change)}
                    <span className="text-xs text-gray-500">{card.changeLabel}</span>
                  </>
                ) : (
                  <span className="text-xs text-gray-600">{card.changeLabel}</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Custom scrollbar hide for mobile */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
