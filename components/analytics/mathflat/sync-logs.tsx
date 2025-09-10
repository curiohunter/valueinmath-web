"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock,
  ChevronRight,
  RefreshCw
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useState } from "react"

interface SyncLog {
  id: string
  sync_type: 'manual' | 'scheduled'
  status: 'running' | 'success' | 'failed' | 'partial'
  students_total: number
  students_synced: number
  students_failed: number
  error_details?: any
  started_at: string
  completed_at?: string
  duration_seconds?: number
}

interface SyncLogsProps {
  logs: SyncLog[]
}

export function SyncLogs({ logs }: SyncLogsProps) {
  const [expandedLogs, setExpandedLogs] = useState<string[]>([])

  const toggleExpanded = (logId: string) => {
    setExpandedLogs(prev =>
      prev.includes(logId)
        ? prev.filter(id => id !== logId)
        : [...prev, logId]
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500">성공</Badge>
      case 'running':
        return <Badge className="bg-blue-500">진행중</Badge>
      case 'failed':
        return <Badge variant="destructive">실패</Badge>
      case 'partial':
        return <Badge className="bg-yellow-500">부분성공</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getSyncTypeBadge = (type: string) => {
    return type === 'scheduled' ? (
      <Badge variant="outline">자동</Badge>
    ) : (
      <Badge variant="secondary">수동</Badge>
    )
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}분 ${remainingSeconds}초`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>동기화 로그</CardTitle>
        <CardDescription>
          최근 동기화 작업 내역입니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            동기화 로그가 없습니다.
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <Collapsible
                key={log.id}
                open={expandedLogs.includes(log.id)}
                onOpenChange={() => toggleExpanded(log.id)}
              >
                <div className="border rounded-lg">
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <div className="flex items-center gap-4">
                        {getStatusIcon(log.status)}
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            {getSyncTypeBadge(log.sync_type)}
                            {getStatusBadge(log.status)}
                            <span className="text-sm font-medium">
                              {new Date(log.started_at).toLocaleDateString('ko-KR')} {' '}
                              {new Date(log.started_at).toLocaleTimeString('ko-KR')}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {log.students_synced}/{log.students_total}명 완료
                            {log.students_failed > 0 && (
                              <span className="text-red-500 ml-2">
                                ({log.students_failed}명 실패)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className={`h-4 w-4 transition-transform ${
                        expandedLogs.includes(log.id) ? 'rotate-90' : ''
                      }`} />
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">시작 시간:</span>
                          <p className="font-medium">
                            {new Date(log.started_at).toLocaleString('ko-KR')}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">종료 시간:</span>
                          <p className="font-medium">
                            {log.completed_at 
                              ? new Date(log.completed_at).toLocaleString('ko-KR')
                              : '진행중'
                            }
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">소요 시간:</span>
                          <p className="font-medium">
                            {formatDuration(log.duration_seconds)}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">처리 현황:</span>
                          <p className="font-medium">
                            성공: {log.students_synced}명 / 실패: {log.students_failed}명
                          </p>
                        </div>
                      </div>
                      
                      {log.error_details && (
                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-950 rounded-md">
                          <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                            오류 상세
                          </p>
                          <pre className="text-xs text-red-600 dark:text-red-400 overflow-x-auto">
                            {JSON.stringify(log.error_details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}