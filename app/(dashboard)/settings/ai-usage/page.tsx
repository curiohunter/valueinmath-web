"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Zap,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import SettingsTabs from "@/components/settings/SettingsTabs"
import { RATE_LIMITS } from "@/lib/ai-rate-limiter"

interface UserUsage {
  user_id: string
  date: string
  hourly_count: number
  daily_count: number
  daily_cost_usd: number
  last_request_at: string
  profiles?: { name: string; email: string } | null
  employees?: { name: string } | null
}

interface GlobalUsage {
  date: string
  total_requests: number
  total_cost_usd: number
}

export default function AIUsagePage() {
  const supabase = createClient()
  const [userUsages, setUserUsages] = useState<UserUsage[]>([])
  const [globalUsage, setGlobalUsage] = useState<GlobalUsage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const today = new Date().toISOString().split("T")[0]

  useEffect(() => {
    fetchUsageData()
  }, [])

  const fetchUsageData = async () => {
    setIsLoading(true)
    try {
      // 오늘 사용자별 사용량
      // @ts-ignore - Supabase type inference issue
      const { data: userDataRaw, error: userError } = await supabase
        .from("ai_rate_limits")
        .select("*")
        .eq("date", today)
        .order("daily_count", { ascending: false })

      if (userError) throw userError

      // 사용자 ID(employees.id)로 이름 조회
      const userIds = (userDataRaw || []).map((u: any) => u.user_id)
      let employeeMap: Record<string, string> = {}

      if (userIds.length > 0) {
        const { data: employeesData } = await supabase
          .from("employees")
          .select("id, name")
          .in("id", userIds)

        employeeMap = (employeesData || []).reduce((acc: Record<string, string>, emp: any) => {
          if (emp.id) acc[emp.id] = emp.name
          return acc
        }, {} as Record<string, string>)
      }

      const userData = (userDataRaw || []).map((u: any) => ({
        ...u,
        employees: { name: employeeMap[u.user_id] || "알 수 없음" }
      }))

      setUserUsages(userData as UserUsage[])

      // 오늘 글로벌 사용량
      // @ts-ignore - Supabase type inference issue
      const { data: globalData, error: globalError } = await supabase
        .from("ai_global_limits")
        .select("*")
        .eq("date", today)
        .single()

      if (globalError && globalError.code !== "PGRST116") throw globalError
      setGlobalUsage((globalData || { date: today, total_requests: 0, total_cost_usd: 0 }) as GlobalUsage)

    } catch (error) {
      console.error("Failed to fetch usage:", error)
      toast.error("사용량 데이터를 불러오는데 실패했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "-"
    const date = new Date(dateStr)
    return date.toLocaleString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // 글로벌 사용량 퍼센트 계산
  const globalRequestPercent = globalUsage
    ? (globalUsage.total_requests / RATE_LIMITS.GLOBAL_DAILY_REQUESTS) * 100
    : 0
  const globalCostPercent = globalUsage
    ? (globalUsage.total_cost_usd / RATE_LIMITS.GLOBAL_DAILY_COST_USD) * 100
    : 0

  return (
    <div className="container mx-auto p-6">
      <SettingsTabs />

      {/* 설정값 정보 */}
      <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
        <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          Rate Limit 설정값
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">시간당 요청:</span>
            <span className="ml-2 font-medium">{RATE_LIMITS.HOURLY_REQUESTS}회</span>
          </div>
          <div>
            <span className="text-muted-foreground">일일 요청:</span>
            <span className="ml-2 font-medium">{RATE_LIMITS.DAILY_REQUESTS}회</span>
          </div>
          <div>
            <span className="text-muted-foreground">일일 비용:</span>
            <span className="ml-2 font-medium">${RATE_LIMITS.DAILY_COST_USD}</span>
          </div>
          <div>
            <span className="text-muted-foreground">글로벌 요청:</span>
            <span className="ml-2 font-medium">{RATE_LIMITS.GLOBAL_DAILY_REQUESTS}회</span>
          </div>
          <div>
            <span className="text-muted-foreground">글로벌 비용:</span>
            <span className="ml-2 font-medium">${RATE_LIMITS.GLOBAL_DAILY_COST_USD}</span>
          </div>
        </div>
      </div>

      {/* 글로벌 사용량 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              오늘 전체 요청량
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl font-bold">
                      {globalUsage?.total_requests || 0}
                    </span>
                    <span className="text-muted-foreground">
                      / {RATE_LIMITS.GLOBAL_DAILY_REQUESTS}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(globalRequestPercent, 100)}
                    className={globalRequestPercent > 80 ? "[&>div]:bg-red-500" : "[&>div]:bg-blue-500"}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {globalRequestPercent.toFixed(1)}% 사용
                  </p>
                </div>
                {globalRequestPercent > 80 && (
                  <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                    <AlertTriangle className="h-4 w-4" />
                    일일 한도의 80%를 초과했습니다.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 leading-relaxed">
              <DollarSign className="h-5 w-5 text-green-500" />
              오늘 전체 비용
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl font-bold">
                      ${(globalUsage?.total_cost_usd || 0).toFixed(4)}
                    </span>
                    <span className="text-muted-foreground">
                      / ${RATE_LIMITS.GLOBAL_DAILY_COST_USD}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(globalCostPercent, 100)}
                    className={globalCostPercent > 80 ? "[&>div]:bg-red-500" : "[&>div]:bg-green-500"}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {globalCostPercent.toFixed(1)}% 사용
                  </p>
                </div>
                {globalCostPercent > 80 && (
                  <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                    <AlertTriangle className="h-4 w-4" />
                    비용 한도의 80%를 초과했습니다.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 사용자별 사용량 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                사용자별 사용량 (오늘)
              </CardTitle>
              <CardDescription>
                오늘 AI 코멘트 기능을 사용한 선생님별 현황입니다.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchUsageData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              새로고침
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>로딩 중...</span>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>선생님</TableHead>
                    <TableHead className="text-center">시간당 요청</TableHead>
                    <TableHead className="text-center">일일 요청</TableHead>
                    <TableHead className="text-center">일일 비용</TableHead>
                    <TableHead className="text-center">마지막 요청</TableHead>
                    <TableHead className="text-center">상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userUsages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        오늘 사용 기록이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    userUsages.map((usage) => {
                      const hourlyPercent = (usage.hourly_count / RATE_LIMITS.HOURLY_REQUESTS) * 100
                      const dailyPercent = (usage.daily_count / RATE_LIMITS.DAILY_REQUESTS) * 100
                      const costPercent = (usage.daily_cost_usd / RATE_LIMITS.DAILY_COST_USD) * 100
                      const isLimited = hourlyPercent >= 100 || dailyPercent >= 100 || costPercent >= 100

                      return (
                        <TableRow key={usage.user_id}>
                          <TableCell className="font-medium">
                            {usage.employees?.name || "알 수 없음"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-sm">
                                {usage.hourly_count} / {RATE_LIMITS.HOURLY_REQUESTS}
                              </span>
                              <Progress
                                value={Math.min(hourlyPercent, 100)}
                                className="w-20 h-1.5"
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-sm">
                                {usage.daily_count} / {RATE_LIMITS.DAILY_REQUESTS}
                              </span>
                              <Progress
                                value={Math.min(dailyPercent, 100)}
                                className="w-20 h-1.5"
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-sm">
                                ${usage.daily_cost_usd?.toFixed(4) || "0.0000"}
                              </span>
                              <Progress
                                value={Math.min(costPercent, 100)}
                                className="w-20 h-1.5"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {formatTime(usage.last_request_at)}
                          </TableCell>
                          <TableCell className="text-center">
                            {isLimited ? (
                              <Badge variant="destructive" className="text-xs">
                                제한됨
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                정상
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
