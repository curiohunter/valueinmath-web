"use client"

import { useState, useEffect } from "react"
import AnalyticsTabs from "@/components/analytics/AnalyticsTabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Bell, CheckCircle, XCircle, Eye } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import type { RiskAlertSeverity, RiskAlertStatus, RiskAlertType } from "@/types/b2b-saas"

interface RiskAlertWithStudent {
  id: string
  student_id: string
  student_name: string
  class_name: string | null
  alert_type: RiskAlertType
  severity: RiskAlertSeverity
  title: string
  message: string
  status: RiskAlertStatus
  acknowledged_at: string | null
  resolved_at: string | null
  resolution_note: string | null
  created_at: string
}

const SEVERITY_COLORS = {
  critical: { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" },
  high: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
  medium: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
}

const STATUS_LABELS: Record<RiskAlertStatus, string> = {
  active: "활성",
  acknowledged: "확인됨",
  resolved: "해결됨",
  dismissed: "무시됨",
}

const ALERT_TYPE_LABELS: Record<RiskAlertType, string> = {
  score_threshold_crossed: "위험 임계값 초과",
  rapid_decline: "급격한 하락",
  attendance_pattern: "출석 패턴 이상",
  performance_drop: "성적 하락",
  engagement_drop: "참여도 하락",
}

export function RiskAlertsPageClient() {
  const [alerts, setAlerts] = useState<RiskAlertWithStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<RiskAlertStatus | "all">("active")
  const [selectedAlert, setSelectedAlert] = useState<RiskAlertWithStudent | null>(null)
  const [actionType, setActionType] = useState<"acknowledge" | "resolve" | "dismiss" | null>(null)
  const [resolutionNote, setResolutionNote] = useState("")
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadAlerts()
  }, [statusFilter])

  const loadAlerts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") {
        params.set("status", statusFilter)
      }
      const res = await fetch(`/api/risk-alerts?${params}`)
      if (res.ok) {
        const data = await res.json()
        setAlerts(data.data || [])
      }
    } catch (error) {
      console.error("Failed to load alerts:", error)
      toast.error("알림을 불러오는데 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async () => {
    if (!selectedAlert || !actionType) return

    setProcessing(true)
    try {
      const res = await fetch(`/api/risk-alerts/${selectedAlert.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          note: resolutionNote || undefined,
        }),
      })

      if (res.ok) {
        toast.success(
          actionType === "acknowledge"
            ? "알림이 확인되었습니다."
            : actionType === "resolve"
            ? "알림이 해결되었습니다."
            : "알림이 무시되었습니다."
        )
        setSelectedAlert(null)
        setActionType(null)
        setResolutionNote("")
        await loadAlerts()
      } else {
        const error = await res.json()
        toast.error(error.error || "처리 실패")
      }
    } catch (error) {
      console.error("Failed to update alert:", error)
      toast.error("알림 처리에 실패했습니다.")
    } finally {
      setProcessing(false)
    }
  }

  const getSeverityBadge = (severity: RiskAlertSeverity) => {
    const colors = SEVERITY_COLORS[severity]
    return (
      <Badge className={`${colors.bg} ${colors.text} border ${colors.border}`}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </Badge>
    )
  }

  const getStatusBadge = (status: RiskAlertStatus) => {
    switch (status) {
      case "active":
        return <Badge variant="destructive">{STATUS_LABELS[status]}</Badge>
      case "acknowledged":
        return <Badge variant="secondary">{STATUS_LABELS[status]}</Badge>
      case "resolved":
        return <Badge className="bg-green-100 text-green-700">{STATUS_LABELS[status]}</Badge>
      case "dismissed":
        return <Badge variant="outline">{STATUS_LABELS[status]}</Badge>
    }
  }

  const activeCount = alerts.filter(a => a.status === "active").length

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">통계 분석</h1>
      <AnalyticsTabs />

      {/* 요약 및 필터 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">활성 알림:</span>
            <Badge variant="destructive">{activeCount}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {(["all", "active", "acknowledged", "resolved", "dismissed"] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status === "all" ? "전체" : STATUS_LABELS[status as RiskAlertStatus]}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>위험 알림 목록</CardTitle>
            <CardDescription>
              {statusFilter === "all"
                ? "모든 알림"
                : statusFilter === "active"
                ? "확인이 필요한 활성 알림"
                : `${STATUS_LABELS[statusFilter as RiskAlertStatus]} 상태의 알림`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-start justify-between p-4 rounded-lg border ${
                      alert.status === "active"
                        ? SEVERITY_COLORS[alert.severity].border + " " + SEVERITY_COLORS[alert.severity].bg
                        : "bg-muted/30"
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getSeverityBadge(alert.severity)}
                        {getStatusBadge(alert.status)}
                        <span className="text-xs text-muted-foreground">
                          {ALERT_TYPE_LABELS[alert.alert_type]}
                        </span>
                      </div>
                      <h4 className="font-medium">{alert.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>
                          학생: <span className="font-medium">{alert.student_name}</span>
                        </span>
                        {alert.class_name && (
                          <span>
                            반: <span className="font-medium">{alert.class_name}</span>
                          </span>
                        )}
                        <span>
                          생성:{" "}
                          {format(new Date(alert.created_at), "yyyy-MM-dd HH:mm", { locale: ko })}
                        </span>
                      </div>
                      {alert.resolution_note && (
                        <p className="text-sm mt-2 p-2 bg-white rounded border">
                          해결 노트: {alert.resolution_note}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      {alert.status === "active" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedAlert(alert)
                              setActionType("acknowledge")
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            확인
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              setSelectedAlert(alert)
                              setActionType("resolve")
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            해결
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedAlert(alert)
                              setActionType("dismiss")
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            무시
                          </Button>
                        </>
                      )}
                      {alert.status === "acknowledged" && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => {
                            setSelectedAlert(alert)
                            setActionType("resolve")
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          해결
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                {statusFilter === "active"
                  ? "활성 알림이 없습니다."
                  : "해당 상태의 알림이 없습니다."}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 액션 다이얼로그 */}
      <Dialog
        open={!!selectedAlert && !!actionType}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAlert(null)
            setActionType(null)
            setResolutionNote("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "acknowledge"
                ? "알림 확인"
                : actionType === "resolve"
                ? "알림 해결"
                : "알림 무시"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "acknowledge"
                ? "이 알림을 확인 처리합니다."
                : actionType === "resolve"
                ? "이 알림을 해결 처리합니다. 해결 내용을 기록해주세요."
                : "이 알림을 무시합니다."}
            </DialogDescription>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedAlert.title}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  학생: {selectedAlert.student_name}
                </p>
              </div>
              {(actionType === "resolve" || actionType === "dismiss") && (
                <div>
                  <label className="text-sm font-medium">메모 (선택)</label>
                  <Textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="해결 방법이나 추가 내용을 기록하세요..."
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedAlert(null)
                setActionType(null)
                setResolutionNote("")
              }}
            >
              취소
            </Button>
            <Button onClick={handleAction} disabled={processing}>
              {processing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {actionType === "acknowledge"
                ? "확인"
                : actionType === "resolve"
                ? "해결"
                : "무시"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
