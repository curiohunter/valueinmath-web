// @ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import StudentClassTabs from "@/components/students/StudentClassTabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, RefreshCw, UserPlus, UserMinus, ArrowRightLeft, XCircle } from "lucide-react"

interface EnrollmentHistory {
  id: string
  student_id: string | null
  class_id: string | null
  action_type: "enrolled" | "withdrawn" | "transferred" | "class_closed"
  action_date: string
  from_class_id: string | null
  to_class_id: string | null
  student_name_snapshot: string
  class_name_snapshot: string | null
  from_class_name_snapshot: string | null
  to_class_name_snapshot: string | null
  reason: string | null
  notes: string | null
  created_by: string | null
  created_by_name_snapshot: string | null
  created_at: string
}

const ACTION_TYPE_CONFIG = {
  enrolled: {
    label: "수강 시작",
    icon: UserPlus,
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  withdrawn: {
    label: "수강 중단",
    icon: UserMinus,
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
  transferred: {
    label: "반 이동",
    icon: ArrowRightLeft,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
  class_closed: {
    label: "반 폐강",
    icon: XCircle,
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  },
}

export default function EnrollmentHistoryPage() {
  const [historyData, setHistoryData] = useState<EnrollmentHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 20

  const fetchHistory = async () => {
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from("class_enrollments_history")
      .select("*", { count: "exact" })
      .order("action_date", { ascending: false })

    // 검색어 필터
    if (searchTerm) {
      query = query.or(
        `student_name_snapshot.ilike.%${searchTerm}%,class_name_snapshot.ilike.%${searchTerm}%`
      )
    }

    // 액션 타입 필터
    if (actionFilter !== "all") {
      query = query.eq("action_type", actionFilter)
    }

    // 페이지네이션
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error("Error fetching enrollment history:", error)
    } else {
      setHistoryData(data || [])
      setTotalCount(count || 0)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchHistory()
  }, [page, actionFilter])

  const handleSearch = () => {
    setPage(1)
    fetchHistory()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="space-y-6">
      {/* 헤더 - 탭 */}
      <div>
        <StudentClassTabs />
      </div>

      {/* 메인 카드 */}
      <Card className="overflow-hidden">
        {/* 필터 영역 */}
        <div className="p-4 border-b bg-muted/30">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-1 gap-2">
              <Input
                placeholder="학생명 또는 반명 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="max-w-xs"
              />
              <Button variant="outline" size="icon" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2 items-center">
              <Select value={actionFilter} onValueChange={(value) => { setActionFilter(value); setPage(1); }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="액션 유형" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="enrolled">수강 시작</SelectItem>
                  <SelectItem value="withdrawn">수강 중단</SelectItem>
                  <SelectItem value="transferred">반 이동</SelectItem>
                  <SelectItem value="class_closed">반 폐강</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchHistory} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* 테이블 */}
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">일시</TableHead>
                <TableHead>학생</TableHead>
                <TableHead className="w-[100px]">액션</TableHead>
                <TableHead>반</TableHead>
                <TableHead>사유/메모</TableHead>
                <TableHead className="w-[80px]">처리자</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    로딩 중...
                  </TableCell>
                </TableRow>
              ) : historyData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    수강 이력이 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                historyData.map((history) => {
                  const config = ACTION_TYPE_CONFIG[history.action_type]
                  const Icon = config.icon
                  return (
                    <TableRow key={history.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(history.action_date)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {history.student_name_snapshot}
                      </TableCell>
                      <TableCell>
                        <Badge className={config.color} variant="secondary">
                          <Icon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {history.action_type === "transferred" ? (
                          <span className="text-sm">
                            {history.from_class_name_snapshot || "알 수 없음"}
                            <span className="mx-1 text-muted-foreground">→</span>
                            {history.to_class_name_snapshot || "알 수 없음"}
                          </span>
                        ) : (
                          <span className="text-sm">
                            {history.class_name_snapshot || "알 수 없음"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {history.reason || history.notes || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {history.created_by_name_snapshot || "-"}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                총 {totalCount}건 중 {(page - 1) * pageSize + 1}-
                {Math.min(page * pageSize, totalCount)}건
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  이전
                </Button>
                <span className="flex items-center px-3 text-sm">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  다음
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
