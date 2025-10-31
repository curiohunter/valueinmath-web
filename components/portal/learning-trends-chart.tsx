"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MonthlyAggregation } from "@/types/portal"
import {
  AreaChart,
  Area,
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

type PeriodType = "6" | "12" | "all"

export function LearningTrendsChart({ monthly_aggregations }: LearningTrendsChartProps) {
  const [period, setPeriod] = useState<PeriodType>("6")

  // Filter data by selected period
  const filteredData = [...(period === "all"
    ? monthly_aggregations
    : monthly_aggregations.slice(0, parseInt(period))
  )].reverse() // Oldest to newest for chart

  // Transform data for Recharts
  const chartData = filteredData.map((item) => {
    return {
      month: `${item.year}.${String(item.month).padStart(2, "0")}`,
      숙제평균: item.homework_avg,
      집중도평균: item.focus_avg,
    }
  })

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(1)}점
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
              variant={period === "6" ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod("6")}
            >
              6개월
            </Button>
            <Button
              variant={period === "12" ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod("12")}
            >
              1년
            </Button>
            <Button
              variant={period === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod("all")}
            >
              전체
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
            <AreaChart
              data={chartData}
              margin={{
                top: 5,
                right: 10,
                left: 0,
                bottom: 5,
              }}
            >
              <defs>
                <linearGradient id="colorHomework" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
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
                domain={[0, 5]}
                ticks={[0, 1, 2, 3, 4, 5]}
                label={{ value: "점", position: "insideLeft", style: { fontSize: 12 } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                iconType="line"
              />
              <Area
                type="monotone"
                dataKey="숙제평균"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#colorHomework)"
                dot={{ fill: "#10b981", r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Area
                type="monotone"
                dataKey="집중도평균"
                stroke="#a855f7"
                strokeWidth={2}
                fill="url(#colorFocus)"
                dot={{ fill: "#a855f7", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {/* Data values below chart */}
        {chartData.length > 0 && (
          <div className="mt-4 border-t pt-3">
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${chartData.length}, 1fr)` }}>
              {chartData.map((data, index) => (
                <div key={index} className="text-center">
                  <div className="text-xs text-gray-500 mb-1 font-medium">{data.month}</div>
                  <div className="text-xs">
                    <div className="text-green-600 font-semibold">
                      숙제 {data.숙제평균.toFixed(1)}
                    </div>
                    <div className="text-purple-600 font-semibold">
                      집중 {data.집중도평균.toFixed(1)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
