"use client"

import { useState, useEffect } from "react"
import AnalyticsTabs from "@/components/analytics/AnalyticsTabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Loader2,
  AlertTriangle,
  AlertCircle,
  Calendar,
  Users,
  TrendingUp,
  Brain,
  Plus,
  Edit,
  Trash2,
  Bell,
  Info,
  Search,
  Filter,
} from "lucide-react"
import { toast } from "sonner"
import { AI_TAG_LABELS, AI_TAG_COLORS } from "@/services/consultation-ai-service"

// 타입 정의
interface ChurnRiskStudent {
  id: string
  name: string
  grade: number | null
  school_type: string | null
  start_date: string | null
  tenure_months: number
  ai_churn_risk: string | null
  ai_hurdle: string | null
  ai_sentiment: string | null
  last_consultation_date: string | null
  last_analyzed_at: string | null
  risk_score: number
  risk_level: 'critical' | 'high' | 'medium' | 'low'
  risk_factors: string[]
}

interface SeasonalAlert {
  id: string
  month: number
  title: string
  description: string | null
  target_grades: string[] | null
  target_school_types: string[] | null
  alert_type: 'reminder' | 'warning' | 'action_required'
  is_active: boolean
  created_at: string
  updated_at: string
}

interface ChurnStats {
  total: number
  critical: number
  high: number
  medium: number
  low: number
  analyzed: number
  not_analyzed: number
}

const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

const ALERT_TYPE_CONFIG = {
  action_required: { label: '조치 필요', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  warning: { label: '주의', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
  reminder: { label: '알림', color: 'bg-blue-100 text-blue-700', icon: Bell },
}

const RISK_LEVEL_CONFIG = {
  critical: { label: 'Critical', color: 'bg-red-500 text-white', bgLight: 'bg-red-50' },
  high: { label: 'High', color: 'bg-orange-500 text-white', bgLight: 'bg-orange-50' },
  medium: { label: 'Medium', color: 'bg-amber-500 text-white', bgLight: 'bg-amber-50' },
  low: { label: 'Low', color: 'bg-green-500 text-white', bgLight: 'bg-green-50' },
}

export function RiskAnalysisPageClient() {
  // 이탈 위험 데이터
  const [students, setStudents] = useState<ChurnRiskStudent[]>([])
  const [stats, setStats] = useState<ChurnStats | null>(null)
  const [hurdleDistribution, setHurdleDistribution] = useState<Record<string, number>>({})
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)
  const [loading, setLoading] = useState(true)

  // 시즌 알림 데이터
  const [seasonalAlerts, setSeasonalAlerts] = useState<SeasonalAlert[]>([])
  const [alertsLoading, setAlertsLoading] = useState(true)

  // 필터
  const [searchTerm, setSearchTerm] = useState("")
  const [riskFilter, setRiskFilter] = useState<string>("all")
  const [gradeFilter, setGradeFilter] = useState<string>("all")

  // 모달
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false)
  const [editingAlert, setEditingAlert] = useState<SeasonalAlert | null>(null)
  const [alertForm, setAlertForm] = useState({
    month: currentMonth,
    title: "",
    description: "",
    target_grades: [] as string[],
    alert_type: "reminder" as 'reminder' | 'warning' | 'action_required',
  })

  useEffect(() => {
    loadChurnRiskData()
    loadSeasonalAlerts()
  }, [])

  const loadChurnRiskData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/churn-risk")
      if (res.ok) {
        const data = await res.json()
        setStudents(data.students || [])
        setStats(data.stats || null)
        setHurdleDistribution(data.hurdleDistribution || {})
        setCurrentMonth(data.currentMonth || new Date().getMonth() + 1)
      }
    } catch (error) {
      console.error("Failed to load churn risk data:", error)
      toast.error("이탈 위험 데이터를 불러오는데 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const loadSeasonalAlerts = async () => {
    setAlertsLoading(true)
    try {
      const res = await fetch("/api/seasonal-alerts")
      if (res.ok) {
        const data = await res.json()
        setSeasonalAlerts(data.alerts || [])
      }
    } catch (error) {
      console.error("Failed to load seasonal alerts:", error)
    } finally {
      setAlertsLoading(false)
    }
  }

  // 현재 월 알림
  const currentMonthAlerts = seasonalAlerts.filter(
    a => a.month === currentMonth && a.is_active
  )

  // 필터링된 학생 목록
  const filteredStudents = students.filter(student => {
    if (searchTerm && !student.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    if (riskFilter !== "all" && student.risk_level !== riskFilter) {
      return false
    }
    if (gradeFilter !== "all") {
      const gradeStr = getGradeString(student.grade, student.school_type)
      if (gradeStr !== gradeFilter) return false
    }
    return true
  })

  // 학년 문자열 변환
  function getGradeString(grade: number | null, schoolType: string | null): string {
    if (!grade || !schoolType) return '-'
    const prefix = schoolType === '초등학교' ? '초' : schoolType === '중학교' ? '중' : '고'
    return `${prefix}${grade}`
  }

  // 알림 저장
  const handleSaveAlert = async () => {
    if (!alertForm.title || !alertForm.month) {
      toast.error("제목과 월은 필수입니다.")
      return
    }

    try {
      const method = editingAlert ? 'PUT' : 'POST'
      const body = editingAlert
        ? { ...alertForm, id: editingAlert.id }
        : alertForm

      const res = await fetch("/api/seasonal-alerts", {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        toast.success(editingAlert ? "알림이 수정되었습니다." : "알림이 생성되었습니다.")
        loadSeasonalAlerts()
        setIsAlertModalOpen(false)
        resetAlertForm()
      } else {
        toast.error("저장에 실패했습니다.")
      }
    } catch (error) {
      console.error("Failed to save alert:", error)
      toast.error("저장 중 오류가 발생했습니다.")
    }
  }

  // 알림 삭제
  const handleDeleteAlert = async (id: string) => {
    if (!confirm("이 알림을 삭제하시겠습니까?")) return

    try {
      const res = await fetch(`/api/seasonal-alerts?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success("알림이 삭제되었습니다.")
        loadSeasonalAlerts()
      }
    } catch (error) {
      console.error("Failed to delete alert:", error)
      toast.error("삭제 중 오류가 발생했습니다.")
    }
  }

  // 알림 수정 모달 열기
  const openEditModal = (alert: SeasonalAlert) => {
    setEditingAlert(alert)
    setAlertForm({
      month: alert.month,
      title: alert.title,
      description: alert.description || "",
      target_grades: alert.target_grades || [],
      alert_type: alert.alert_type,
    })
    setIsAlertModalOpen(true)
  }

  // 폼 리셋
  const resetAlertForm = () => {
    setEditingAlert(null)
    setAlertForm({
      month: currentMonth,
      title: "",
      description: "",
      target_grades: [],
      alert_type: "reminder",
    })
  }

  // 고유 학년 목록 추출
  const uniqueGrades = Array.from(new Set(
    students
      .map(s => getGradeString(s.grade, s.school_type))
      .filter(g => g !== '-')
  )).sort()

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">통계 분석</h1>
      <AnalyticsTabs />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">이탈 위험 현황</TabsTrigger>
            <TabsTrigger value="students">학생별 분석</TabsTrigger>
            <TabsTrigger value="seasonal">시즌 알림 관리</TabsTrigger>
          </TabsList>

          {/* 탭 1: 이탈 위험 현황 */}
          <TabsContent value="overview" className="space-y-6">
            {/* 현재 월 시즌 알림 */}
            {currentMonthAlerts.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-amber-600" />
                    {MONTH_NAMES[currentMonth - 1]} 주요 알림
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {currentMonthAlerts.map(alert => {
                      const config = ALERT_TYPE_CONFIG[alert.alert_type]
                      const Icon = config.icon
                      return (
                        <div key={alert.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                          <Icon className="h-5 w-5 mt-0.5 text-amber-600" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{alert.title}</span>
                              <Badge className={config.color}>{config.label}</Badge>
                              {alert.target_grades && alert.target_grades.length > 0 && (
                                <Badge variant="outline">
                                  {alert.target_grades.map(g =>
                                    alert.target_school_types?.[0] === '초등학교' ? `초${g}` :
                                    alert.target_school_types?.[0] === '중학교' ? `중${g}` : `고${g}`
                                  ).join(', ')}
                                </Badge>
                              )}
                            </div>
                            {alert.description && (
                              <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 위험도 요약 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className={RISK_LEVEL_CONFIG.critical.bgLight}>
                <CardContent className="pt-6 text-center">
                  <p className="text-4xl font-bold text-red-600">{stats?.critical || 0}</p>
                  <p className="text-sm text-red-700 font-medium mt-1">Critical</p>
                  <p className="text-xs text-muted-foreground">즉시 개입 필요</p>
                </CardContent>
              </Card>
              <Card className={RISK_LEVEL_CONFIG.high.bgLight}>
                <CardContent className="pt-6 text-center">
                  <p className="text-4xl font-bold text-orange-600">{stats?.high || 0}</p>
                  <p className="text-sm text-orange-700 font-medium mt-1">High</p>
                  <p className="text-xs text-muted-foreground">주의 관찰</p>
                </CardContent>
              </Card>
              <Card className={RISK_LEVEL_CONFIG.medium.bgLight}>
                <CardContent className="pt-6 text-center">
                  <p className="text-4xl font-bold text-amber-600">{stats?.medium || 0}</p>
                  <p className="text-sm text-amber-700 font-medium mt-1">Medium</p>
                  <p className="text-xs text-muted-foreground">모니터링</p>
                </CardContent>
              </Card>
              <Card className={RISK_LEVEL_CONFIG.low.bgLight}>
                <CardContent className="pt-6 text-center">
                  <p className="text-4xl font-bold text-green-600">{stats?.low || 0}</p>
                  <p className="text-sm text-green-700 font-medium mt-1">Low</p>
                  <p className="text-xs text-muted-foreground">양호</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-4xl font-bold text-gray-600">{stats?.total || 0}</p>
                  <p className="text-sm text-gray-700 font-medium mt-1">전체</p>
                  <p className="text-xs text-muted-foreground">
                    AI분석 {stats?.analyzed || 0}명
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 주의 필요 학생 (Critical + High) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    주의 필요 학생
                  </CardTitle>
                  <CardDescription>Critical 및 High 위험 학생 목록</CardDescription>
                </CardHeader>
                <CardContent>
                  {students.filter(s => s.risk_level === 'critical' || s.risk_level === 'high').length > 0 ? (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {students
                        .filter(s => s.risk_level === 'critical' || s.risk_level === 'high')
                        .sort((a, b) => b.risk_score - a.risk_score)
                        .map(student => (
                          <div
                            key={student.id}
                            className={`p-4 rounded-lg border ${RISK_LEVEL_CONFIG[student.risk_level].bgLight}`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{student.name}</span>
                                  <Badge className={RISK_LEVEL_CONFIG[student.risk_level].color}>
                                    {student.risk_score}점
                                  </Badge>
                                  <Badge variant="outline">
                                    {getGradeString(student.grade, student.school_type)}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {student.risk_factors.map((factor, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {factor}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <div className="text-right text-xs text-muted-foreground">
                                <p>재원 {student.tenure_months}개월</p>
                                {student.last_consultation_date && (
                                  <p>마지막 상담: {new Date(student.last_consultation_date).toLocaleDateString('ko-KR')}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Users className="h-12 w-12 mb-3 opacity-50" />
                      <p>주의 필요 학생이 없습니다.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* AI 분석 통계 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-500" />
                    AI 분석 인사이트
                  </CardTitle>
                  <CardDescription>상담 내용 기반 우려사항 분포</CardDescription>
                </CardHeader>
                <CardContent>
                  {Object.keys(hurdleDistribution).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(hurdleDistribution)
                        .sort((a, b) => b[1] - a[1])
                        .map(([hurdle, count]) => {
                          const label = AI_TAG_LABELS.hurdle[hurdle as keyof typeof AI_TAG_LABELS.hurdle] || hurdle
                          const colorClass = AI_TAG_COLORS.hurdle[hurdle as keyof typeof AI_TAG_COLORS.hurdle] || 'bg-gray-100 text-gray-700'
                          const percentage = stats?.analyzed ? Math.round((count / stats.analyzed) * 100) : 0

                          return (
                            <div key={hurdle} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Badge className={colorClass}>{label}</Badge>
                                <span className="text-sm font-medium">{count}명 ({percentage}%)</span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-purple-500 rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Brain className="h-12 w-12 mb-3 opacity-50" />
                      <p>AI 분석 데이터가 없습니다.</p>
                      <p className="text-xs mt-1">상담 내용을 입력하면 자동 분석됩니다.</p>
                    </div>
                  )}

                  {/* 분석 현황 */}
                  <div className="mt-6 pt-4 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">AI 분석 완료</span>
                      <span className="font-medium">{stats?.analyzed || 0}명 / {stats?.total || 0}명</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${stats?.total ? (stats.analyzed / stats.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 시즌별 위험 안내 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-500" />
                  시즌별 이탈 위험 패턴
                </CardTitle>
                <CardDescription>AntiGravity 분석 기반 학원 이탈 패턴</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                    <h4 className="font-medium text-red-700 mb-2">11-12월 (겨울방학 전)</h4>
                    <ul className="text-sm text-red-600 space-y-1">
                      <li>• 초6: 예비중1 학원 쇼핑 시즌</li>
                      <li>• 중1: 겨울방학 전 환경 변화 욕구</li>
                      <li>• 중3: 고등 전환 준비</li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                    <h4 className="font-medium text-amber-700 mb-2">신규생 위험 구간</h4>
                    <ul className="text-sm text-amber-600 space-y-1">
                      <li>• 재원 3-6개월: 가장 높은 이탈률</li>
                      <li>• 시스템 적응 실패 케이스</li>
                      <li>• 집중 관리 필요</li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                    <h4 className="font-medium text-green-700 mb-2">자연 졸업 (제외)</h4>
                    <ul className="text-sm text-green-600 space-y-1">
                      <li>• 고3 11월 이후: 수능 후 자연 졸업</li>
                      <li>• 이탈로 분류하지 않음</li>
                      <li>• 별도 관리 불필요</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 탭 2: 학생별 분석 */}
          <TabsContent value="students" className="space-y-6">
            {/* 필터 */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="학생 이름 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={riskFilter} onValueChange={setRiskFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="위험도" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 위험도</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={gradeFilter} onValueChange={setGradeFilter}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="학년" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 학년</SelectItem>
                      {uniqueGrades.map(grade => (
                        <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* 학생 테이블 */}
            <Card>
              <CardHeader>
                <CardTitle>전체 학생 이탈 위험 분석</CardTitle>
                <CardDescription>
                  총 {filteredStudents.length}명 (필터 적용)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>학생</TableHead>
                        <TableHead className="text-center">학년</TableHead>
                        <TableHead className="text-center">재원 기간</TableHead>
                        <TableHead className="text-center">위험 점수</TableHead>
                        <TableHead className="text-center">AI 분석</TableHead>
                        <TableHead>위험 요인</TableHead>
                        <TableHead className="text-center">마지막 상담</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents
                        .sort((a, b) => b.risk_score - a.risk_score)
                        .map(student => (
                          <TableRow key={student.id} className={RISK_LEVEL_CONFIG[student.risk_level].bgLight}>
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell className="text-center">
                              {getGradeString(student.grade, student.school_type)}
                            </TableCell>
                            <TableCell className="text-center">
                              {student.tenure_months}개월
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={RISK_LEVEL_CONFIG[student.risk_level].color}>
                                {student.risk_score}점
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {student.ai_churn_risk ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge className={AI_TAG_COLORS.churn_risk[student.ai_churn_risk as keyof typeof AI_TAG_COLORS.churn_risk]}>
                                        {AI_TAG_LABELS.churn_risk[student.ai_churn_risk as keyof typeof AI_TAG_LABELS.churn_risk]}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>우려사항: {student.ai_hurdle ? AI_TAG_LABELS.hurdle[student.ai_hurdle as keyof typeof AI_TAG_LABELS.hurdle] : '없음'}</p>
                                      <p>분위기: {student.ai_sentiment ? AI_TAG_LABELS.sentiment[student.ai_sentiment as keyof typeof AI_TAG_LABELS.sentiment] : '-'}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <span className="text-xs text-muted-foreground">미분석</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {student.risk_factors.slice(0, 3).map((factor, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {factor}
                                  </Badge>
                                ))}
                                {student.risk_factors.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{student.risk_factors.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-xs text-muted-foreground">
                              {student.last_consultation_date
                                ? new Date(student.last_consultation_date).toLocaleDateString('ko-KR')
                                : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 탭 3: 시즌 알림 관리 */}
          <TabsContent value="seasonal" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>시즌 알림 관리</CardTitle>
                    <CardDescription>매년 반복되는 학원 주요 일정을 관리합니다.</CardDescription>
                  </div>
                  <Button onClick={() => { resetAlertForm(); setIsAlertModalOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    알림 추가
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {alertsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : seasonalAlerts.length > 0 ? (
                  <div className="space-y-4">
                    {MONTH_NAMES.map((monthName, index) => {
                      const monthAlerts = seasonalAlerts.filter(a => a.month === index + 1)
                      if (monthAlerts.length === 0) return null

                      return (
                        <div key={index}>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">
                            {monthName}
                          </h4>
                          <div className="space-y-2">
                            {monthAlerts.map(alert => {
                              const config = ALERT_TYPE_CONFIG[alert.alert_type]
                              return (
                                <div
                                  key={alert.id}
                                  className={`flex items-center justify-between p-3 rounded-lg border ${
                                    alert.is_active ? '' : 'opacity-50'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <Badge className={config.color}>{config.label}</Badge>
                                    <div>
                                      <p className="font-medium">{alert.title}</p>
                                      {alert.description && (
                                        <p className="text-sm text-muted-foreground">{alert.description}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {alert.target_grades && (
                                      <Badge variant="outline" className="text-xs">
                                        {alert.target_grades.join(', ')}학년
                                      </Badge>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => openEditModal(alert)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteAlert(alert.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mb-3 opacity-50" />
                    <p>등록된 시즌 알림이 없습니다.</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => { resetAlertForm(); setIsAlertModalOpen(true); }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      첫 알림 추가하기
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* 알림 생성/수정 모달 */}
      <Dialog open={isAlertModalOpen} onOpenChange={setIsAlertModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAlert ? '시즌 알림 수정' : '시즌 알림 추가'}
            </DialogTitle>
            <DialogDescription>
              매년 반복되는 학원 일정을 등록하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">월</label>
                <Select
                  value={alertForm.month.toString()}
                  onValueChange={(v) => setAlertForm(f => ({ ...f, month: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((name, i) => (
                      <SelectItem key={i} value={(i + 1).toString()}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">유형</label>
                <Select
                  value={alertForm.alert_type}
                  onValueChange={(v) => setAlertForm(f => ({ ...f, alert_type: v as typeof alertForm.alert_type }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="action_required">조치 필요</SelectItem>
                    <SelectItem value="warning">주의</SelectItem>
                    <SelectItem value="reminder">알림</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">제목</label>
              <Input
                value={alertForm.title}
                onChange={(e) => setAlertForm(f => ({ ...f, title: e.target.value }))}
                placeholder="예: 예비중1 비전 설명회"
              />
            </div>

            <div>
              <label className="text-sm font-medium">설명</label>
              <Textarea
                value={alertForm.description}
                onChange={(e) => setAlertForm(f => ({ ...f, description: e.target.value }))}
                placeholder="상세 설명..."
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium">대상 학년 (선택)</label>
              <Input
                value={alertForm.target_grades.join(', ')}
                onChange={(e) => setAlertForm(f => ({
                  ...f,
                  target_grades: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                }))}
                placeholder="예: 6, 1, 3 (쉼표로 구분)"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAlertModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveAlert}>
              {editingAlert ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
