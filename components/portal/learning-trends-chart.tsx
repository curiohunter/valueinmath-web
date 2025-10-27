"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MonthlyAggregation } from "@/types/portal"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface LearningTrendsChartProps {
  monthly_aggregations: MonthlyAggregation[]
}

type PeriodType = "3" | "6"

export function LearningTrendsChart({ monthly_aggregations }: LearningTrendsChartProps) {
  const [period, setPeriod] = useState<PeriodType>("3")

  // Filter data by selected period
  const filteredData = monthly_aggregations
    .slice(0, period === "3" ? 3 : 6)
    .reverse() // Oldest to newest for chart

  // Transform data for Recharts
  const chartData = filteredData.map((item) => ({
    month: `${item.year}.${String(item.month).padStart(2, "0")}`,
    출석률: item.attendance_rate,
    과제수행률: item.homework_rate,
    평균점수: item.average_score,
  }))

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(1)}
              {entry.name === "평균점수" ? "점" : "%"}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg font-semibold">학습 트렌드</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={period === "3" ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod("3")}
            >
              3개월
            </Button>
            <Button
              variant={period === "6" ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod("6")}
            >
              6개월
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            데이터가 없습니다
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={chartData}
              margin={{
                top: 5,
                right: 10,
                left: 0,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
                tickLine={false}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                iconType="line"
              />
              <Line
                type="monotone"
                dataKey="출석률"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="과제수행률"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: "#10b981", r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="평균점수"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: "#f59e0b", r: 4 }}
                activeDot={{ r: 6 }}
                yAxisId={0}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* Mobile: Additional info */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center md:hidden">
          {chartData.length > 0 && (
            <>
              <div className="text-xs">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <div className="w-3 h-0.5 bg-blue-500"></div>
                  <span className="text-gray-600">출석률</span>
                </div>
                <p className="font-semibold text-blue-600">
                  {chartData[chartData.length - 1].출석률.toFixed(1)}%
                </p>
              </div>
              <div className="text-xs">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <div className="w-3 h-0.5 bg-green-500"></div>
                  <span className="text-gray-600">과제수행률</span>
                </div>
                <p className="font-semibold text-green-600">
                  {chartData[chartData.length - 1].과제수행률.toFixed(1)}%
                </p>
              </div>
              <div className="text-xs">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <div className="w-3 h-0.5 bg-orange-500"></div>
                  <span className="text-gray-600">평균점수</span>
                </div>
                <p className="font-semibold text-orange-600">
                  {chartData[chartData.length - 1].평균점수.toFixed(1)}점
                </p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
