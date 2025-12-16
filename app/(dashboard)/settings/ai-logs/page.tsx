"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  MessageSquare,
  Bot,
  Activity,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import SettingsTabs from "@/components/settings/SettingsTabs"
import { AI_TAG_LABELS } from "@/services/consultation-ai-service"

interface CommentLLMLog {
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

interface AIUsageLog {
  id: string
  employee_id: string | null
  employee_name_snapshot: string | null
  feature: string
  target_type: string | null
  target_id: string | null
  target_name_snapshot: string | null
  provider: string
  model: string
  tokens_input: number
  tokens_output: number
  duration_ms: number | null
  price_input_per_million: number | null
  price_output_per_million: number | null
  estimated_cost_usd: number
  success: boolean
  error_message: string | null
  metadata: Record<string, any> | null
  created_at: string
}

type TabType = "comment" | "consultation" | "all"

export default function AILogsPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<TabType>("all")

  // Comment logs state
  const [commentLogs, setCommentLogs] = useState<CommentLLMLog[]>([])
  const [commentLoading, setCommentLoading] = useState(true)
  const [commentPage, setCommentPage] = useState(1)
  const [commentTotalCount, setCommentTotalCount] = useState(0)

  // AI usage logs state (consultation analysis etc.)
  const [usageLogs, setUsageLogs] = useState<AIUsageLog[]>([])
  const [usageLoading, setUsageLoading] = useState(true)
  const [usagePage, setUsagePage] = useState(1)
  const [usageTotalCount, setUsageTotalCount] = useState(0)

  // Combined stats
  const [totalStats, setTotalStats] = useState({
    totalRequests: 0,
    totalCost: 0,
    commentCount: 0,
    analysisCount: 0,
  })

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error">("all")
  const pageSize = 20

  useEffect(() => {
    if (activeTab === "comment" || activeTab === "all") {
      fetchCommentLogs()
    }
  }, [commentPage, statusFilter, activeTab])

  useEffect(() => {
    if (activeTab === "consultation" || activeTab === "all") {
      fetchUsageLogs()
    }
  }, [usagePage, statusFilter, activeTab])

  useEffect(() => {
    fetchTotalStats()
  }, [])

  const fetchTotalStats = async () => {
    try {
      // Comment logs 통계
      const { count: commentCount } = await supabase
        .from("comment_llm_logs")
        .select("*", { count: "exact", head: true })

      // AI usage logs 통계
      const { count: usageCount } = await supabase
        .from("ai_usage_logs")
        .select("*", { count: "exact", head: true })

      // 비용 합산
      const { data: commentCosts } = await supabase
        .from("comment_llm_logs")
        .select("estimated_cost_usd")

      const { data: usageCosts } = await supabase
        .from("ai_usage_logs")
        .select("estimated_cost_usd")

      const commentCostTotal = (commentCosts || []).reduce((sum, l) => sum + (l.estimated_cost_usd || 0), 0)
      const usageCostTotal = (usageCosts || []).reduce((sum, l) => sum + (l.estimated_cost_usd || 0), 0)

      setTotalStats({
        totalRequests: (commentCount || 0) + (usageCount || 0),
        totalCost: commentCostTotal + usageCostTotal,
        commentCount: commentCount || 0,
        analysisCount: usageCount || 0,
      })
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }

  const fetchCommentLogs = async () => {
    setCommentLoading(true)
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
        .range((commentPage - 1) * pageSize, commentPage * pageSize - 1)

      if (statusFilter === "success") {
        // @ts-ignore
        query = query.eq("success", true)
      } else if (statusFilter === "error") {
        // @ts-ignore
        query = query.eq("success", false)
      }

      const { data, error, count } = await query

      if (error) throw error

      setCommentLogs((data || []) as CommentLLMLog[])
      setCommentTotalCount(count || 0)
    } catch (error) {
      console.error("Failed to fetch comment logs:", error)
      toast.error("코멘트 로그를 불러오는데 실패했습니다.")
    } finally {
      setCommentLoading(false)
    }
  }

  const fetchUsageLogs = async () => {
    setUsageLoading(true)
    try {
      let query = supabase
        .from("ai_usage_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((usagePage - 1) * pageSize, usagePage * pageSize - 1)

      if (statusFilter === "success") {
        query = query.eq("success", true)
      } else if (statusFilter === "error") {
        query = query.eq("success", false)
      }

      const { data, error, count } = await query

      if (error) throw error

      setUsageLogs((data || []) as AIUsageLog[])
      setUsageTotalCount(count || 0)
    } catch (error) {
      console.error("Failed to fetch usage logs:", error)
      toast.error("AI 사용 로그를 불러오는데 실패했습니다.")
    } finally {
      setUsageLoading(false)
    }
  }

  const filteredCommentLogs = commentLogs.filter(log => {
    if (!searchTerm) return true
    const studentName = log.students?.name || ""
    const teacherName = log.employees?.name || ""
    return (
      studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.model.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const filteredUsageLogs = usageLogs.filter(log => {
    if (!searchTerm) return true
    const employeeName = log.employee_name_snapshot || ""
    const targetName = log.target_name_snapshot || ""
    return (
      employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      targetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.feature.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const commentTotalPages = Math.ceil(commentTotalCount / pageSize)
  const usageTotalPages = Math.ceil(usageTotalCount / pageSize)

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case "first_draft": return "첫 생성"
      case "regenerate": return "재생성"
      case "section_regenerate": return "부분 재생성"
      case "tone_adjust": return "톤 조절"
      default: return reason
    }
  }

  const getFeatureLabel = (feature: string) => {
    switch (feature) {
      case "comment": return "AI 코멘트"
      case "consultation_analysis": return "상담 분석"
      case "risk_analysis": return "위험도 분석"
      case "funnel_suggestion": return "퍼널 제안"
      default: return feature
    }
  }

  const getFeatureBadgeColor = (feature: string) => {
    switch (feature) {
      case "comment": return "bg-blue-100 text-blue-700"
      case "consultation_analysis": return "bg-purple-100 text-purple-700"
      case "risk_analysis": return "bg-orange-100 text-orange-700"
      case "funnel_suggestion": return "bg-amber-100 text-amber-700"
      default: return "bg-gray-100 text-gray-700"
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

  const renderAnalysisResult = (metadata: Record<string, any> | null) => {
    if (!metadata?.analysis) return null
    const analysis = metadata.analysis
    return (
      <div className="flex flex-wrap gap-1">
        {analysis.hurdle && analysis.hurdle !== 'none' && (
          <Badge variant="outline" className="text-[10px] bg-orange-50">
            {AI_TAG_LABELS.hurdle[analysis.hurdle as keyof typeof AI_TAG_LABELS.hurdle] || analysis.hurdle}
          </Badge>
        )}
        {analysis.readiness && (
          <Badge variant="outline" className="text-[10px] bg-green-50">
            {AI_TAG_LABELS.readiness[analysis.readiness as keyof typeof AI_TAG_LABELS.readiness] || analysis.readiness}
          </Badge>
        )}
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <SettingsTabs />

      {/* 통합 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">총 AI 요청</p>
                <p className="text-2xl font-bold">{totalStats.totalRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <MessageSquare className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">AI 코멘트</p>
                <p className="text-2xl font-bold">{totalStats.commentCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Bot className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">상담 분석</p>
                <p className="text-2xl font-bold">{totalStats.analysisCount}</p>
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
                <p className="text-2xl font-bold">${totalStats.totalCost.toFixed(4)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 탭 구조 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                AI 사용 로그
              </CardTitle>
              <CardDescription>
                AI 기능 사용 기록을 확인합니다.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="검색..."
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
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
            <TabsList className="mb-4">
              <TabsTrigger value="all" className="flex items-center gap-1">
                <Activity className="h-4 w-4" />
                전체
              </TabsTrigger>
              <TabsTrigger value="comment" className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                AI 코멘트
              </TabsTrigger>
              <TabsTrigger value="consultation" className="flex items-center gap-1">
                <Bot className="h-4 w-4" />
                상담 분석
              </TabsTrigger>
            </TabsList>

            {/* AI 코멘트 로그 탭 */}
            <TabsContent value="comment">
              {commentLoading ? (
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
                        {filteredCommentLogs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                              로그가 없습니다.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredCommentLogs.map((log) => (
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
                  {commentTotalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        총 {commentTotalCount}개 중 {(commentPage - 1) * pageSize + 1}-{Math.min(commentPage * pageSize, commentTotalCount)}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCommentPage(p => Math.max(1, p - 1))}
                          disabled={commentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">
                          {commentPage} / {commentTotalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCommentPage(p => Math.min(commentTotalPages, p + 1))}
                          disabled={commentPage === commentTotalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* 상담 분석 로그 탭 */}
            <TabsContent value="consultation">
              {usageLoading ? (
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
                          <TableHead>기능</TableHead>
                          <TableHead>담당자</TableHead>
                          <TableHead>대상</TableHead>
                          <TableHead>모델</TableHead>
                          <TableHead className="text-center">토큰</TableHead>
                          <TableHead className="text-center">비용</TableHead>
                          <TableHead>분석 결과</TableHead>
                          <TableHead className="text-center">상태</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsageLogs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                              로그가 없습니다.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUsageLogs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell className="text-sm">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-muted-foreground" />
                                  {formatDate(log.created_at)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={`text-xs ${getFeatureBadgeColor(log.feature)}`}>
                                  {getFeatureLabel(log.feature)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  {log.employee_name_snapshot || "-"}
                                </div>
                              </TableCell>
                              <TableCell>
                                {log.target_name_snapshot || "-"}
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
                              <TableCell>
                                {renderAnalysisResult(log.metadata)}
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
                  {usageTotalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        총 {usageTotalCount}개 중 {(usagePage - 1) * pageSize + 1}-{Math.min(usagePage * pageSize, usageTotalCount)}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUsagePage(p => Math.max(1, p - 1))}
                          disabled={usagePage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">
                          {usagePage} / {usageTotalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUsagePage(p => Math.min(usageTotalPages, p + 1))}
                          disabled={usagePage === usageTotalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* 전체 탭 (통합 뷰) */}
            <TabsContent value="all">
              <div className="space-y-6">
                {/* AI 코멘트 섹션 */}
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-green-600" />
                    AI 코멘트 (최근 5건)
                  </h3>
                  {commentLoading ? (
                    <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
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
                            <TableHead className="text-center">상태</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {commentLogs.slice(0, 5).map((log) => (
                            <TableRow key={log.id}>
                              <TableCell className="text-sm">{formatDate(log.created_at)}</TableCell>
                              <TableCell>{log.students?.name || "-"}</TableCell>
                              <TableCell>{log.employees?.name || "-"}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{log.model}</Badge>
                              </TableCell>
                              <TableCell className="text-center text-sm">
                                {log.tokens_input + log.tokens_output}
                              </TableCell>
                              <TableCell className="text-center">
                                ${log.estimated_cost_usd?.toFixed(6) || "0"}
                              </TableCell>
                              <TableCell className="text-center">
                                {log.success ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {commentTotalCount > 5 && (
                    <Button
                      variant="link"
                      className="mt-2 p-0 h-auto"
                      onClick={() => setActiveTab("comment")}
                    >
                      모두 보기 ({commentTotalCount}건) →
                    </Button>
                  )}
                </div>

                {/* 상담 분석 섹션 */}
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Bot className="h-4 w-4 text-purple-600" />
                    상담 분석 (최근 5건)
                  </h3>
                  {usageLoading ? (
                    <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>시간</TableHead>
                            <TableHead>담당자</TableHead>
                            <TableHead>대상</TableHead>
                            <TableHead>모델</TableHead>
                            <TableHead className="text-center">토큰</TableHead>
                            <TableHead className="text-center">비용</TableHead>
                            <TableHead>분석 결과</TableHead>
                            <TableHead className="text-center">상태</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {usageLogs.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                                아직 상담 분석 로그가 없습니다.
                              </TableCell>
                            </TableRow>
                          ) : (
                            usageLogs.slice(0, 5).map((log) => (
                              <TableRow key={log.id}>
                                <TableCell className="text-sm">{formatDate(log.created_at)}</TableCell>
                                <TableCell>{log.employee_name_snapshot || "-"}</TableCell>
                                <TableCell>{log.target_name_snapshot || "-"}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">{log.model}</Badge>
                                </TableCell>
                                <TableCell className="text-center text-sm">
                                  {log.tokens_input + log.tokens_output}
                                </TableCell>
                                <TableCell className="text-center">
                                  ${log.estimated_cost_usd?.toFixed(6) || "0"}
                                </TableCell>
                                <TableCell>
                                  {renderAnalysisResult(log.metadata)}
                                </TableCell>
                                <TableCell className="text-center">
                                  {log.success ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {usageTotalCount > 5 && (
                    <Button
                      variant="link"
                      className="mt-2 p-0 h-auto"
                      onClick={() => setActiveTab("consultation")}
                    >
                      모두 보기 ({usageTotalCount}건) →
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
