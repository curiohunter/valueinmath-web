"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FileText,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  DollarSign,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import SettingsTabs from "@/components/settings/SettingsTabs"

interface LLMLog {
  id: string
  student_id: string
  teacher_id: string
  year: number
  month: number
  provider: string
  model: string
  tokens_input: number
  tokens_output: number
  duration_ms: number | null
  estimated_cost_usd: number
  success: boolean
  error_code: string | null
  reason: string
  regeneration_count: number
  created_at: string
  students?: { name: string } | null
  employees?: { name: string } | null
}

export default function AILogsPage() {
  const supabase = createClient()
  const [logs, setLogs] = useState<LLMLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error">("all")
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 20

  useEffect(() => {
    fetchLogs()
  }, [page, statusFilter])

  const fetchLogs = async () => {
    setIsLoading(true)
    try {
      // @ts-ignore - Supabase type inference issue with joins
      let query = supabase
        .from("comment_llm_logs")
        .select(`
          *,
          students:student_id (name),
          employees:teacher_id (name)
        `, { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

      if (statusFilter === "success") {
        // @ts-ignore
        query = query.eq("success", true)
      } else if (statusFilter === "error") {
        // @ts-ignore
        query = query.eq("success", false)
      }

      const { data, error, count } = await query

      if (error) throw error

      setLogs((data || []) as LLMLog[])
      setTotalCount(count || 0)
    } catch (error) {
      console.error("Failed to fetch logs:", error)
      toast.error("로그를 불러오는데 실패했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true
    const studentName = log.students?.name || ""
    const teacherName = log.employees?.name || ""
    return (
      studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.model.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const totalPages = Math.ceil(totalCount / pageSize)

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case "first_draft": return "첫 생성"
      case "regenerate": return "재생성"
      case "section_regenerate": return "부분 재생성"
      case "tone_adjust": return "톤 조절"
      default: return reason
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // 통계 계산
  const stats = {
    totalRequests: totalCount,
    successRate: logs.length > 0
      ? ((logs.filter(l => l.success).length / logs.length) * 100).toFixed(1)
      : "0.0",
    totalCost: logs.reduce((sum, l) => sum + (l.estimated_cost_usd || 0), 0).toFixed(4),
    avgTokens: logs.length > 0
      ? Math.round(logs.reduce((sum, l) => sum + l.tokens_input + l.tokens_output, 0) / logs.length)
      : 0,
  }

  return (
    <div className="container mx-auto p-6">
      <SettingsTabs />

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">총 요청</p>
                <p className="text-2xl font-bold">{stats.totalRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">성공률</p>
                <p className="text-2xl font-bold">{stats.successRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">총 비용 (USD)</p>
                <p className="text-2xl font-bold">${stats.totalCost}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">평균 토큰</p>
                <p className="text-2xl font-bold">{stats.avgTokens}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 로그 테이블 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                AI 코멘트 생성 로그
              </CardTitle>
              <CardDescription>
                AI 코멘트 생성 API 호출 기록입니다.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="학생, 선생님, 모델 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="success">성공</SelectItem>
                  <SelectItem value="error">실패</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>로딩 중...</span>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>시간</TableHead>
                      <TableHead>학생</TableHead>
                      <TableHead>선생님</TableHead>
                      <TableHead>모델</TableHead>
                      <TableHead className="text-center">토큰</TableHead>
                      <TableHead className="text-center">비용</TableHead>
                      <TableHead className="text-center">유형</TableHead>
                      <TableHead className="text-center">상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          로그가 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {formatDate(log.created_at)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 text-muted-foreground" />
                              {log.students?.name || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.employees?.name || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {log.model}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm">
                              {log.tokens_input + log.tokens_output}
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">
                              ({log.tokens_input}/{log.tokens_output})
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            ${log.estimated_cost_usd?.toFixed(6) || "0.000000"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="text-xs">
                              {getReasonLabel(log.reason)}
                              {log.regeneration_count > 0 && ` (${log.regeneration_count}회)`}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {log.success ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500 mx-auto" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    총 {totalCount}개 중 {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCount)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
