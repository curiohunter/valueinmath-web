"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowDownCircle, ArrowUpCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getInventoryLogs } from "@/services/textbook-service"
import { INVENTORY_REASON_LABELS, type InventoryLog, type InventoryReason } from "@/types/textbook"

interface InventoryLogSectionProps {
  textbookId: string
  refreshKey?: number
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function InventoryLogSection({ textbookId, refreshKey }: InventoryLogSectionProps) {
  const supabase = createClient()
  const [logs, setLogs] = useState<InventoryLog[]>([])
  const [loading, setLoading] = useState(true)

  const loadLogs = async () => {
    setLoading(true)
    try {
      const result = await getInventoryLogs(supabase, textbookId, { limit: 20 })
      if (result.success && result.data) {
        setLogs(result.data)
      }
    } catch (error) {
      console.error("입출고 이력 로드 오류:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [textbookId, refreshKey])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        입출고 이력이 없습니다
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div
          key={log.id}
          className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 text-sm"
        >
          <div className="flex items-center gap-2">
            {log.log_type === "in" ? (
              <ArrowDownCircle className="w-4 h-4 text-blue-500" />
            ) : (
              <ArrowUpCircle className="w-4 h-4 text-orange-500" />
            )}
            <Badge
              variant="outline"
              className={
                log.log_type === "in"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-orange-50 text-orange-700 border-orange-200"
              }
            >
              {log.log_type === "in" ? "입고" : "출고"}
            </Badge>
            <span className="font-medium">
              {INVENTORY_REASON_LABELS[log.reason as InventoryReason] || log.reason}
            </span>
            {log.note && (
              <span className="text-muted-foreground text-xs">({log.note})</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`font-bold ${
                log.log_type === "in" ? "text-blue-600" : "text-orange-600"
              }`}
            >
              {log.log_type === "in" ? "+" : "-"}{log.quantity}
            </span>
            <span className="text-xs text-muted-foreground">{formatDate(log.created_at)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
