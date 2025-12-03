"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import {
  MoreHorizontal,
  Send,
  RefreshCw,
  XCircle,
  Trash2,
  ExternalLink,
  Loader2,
} from "lucide-react"
import type { PaysSamRequestStatus } from "@/types/tuition"

interface InvoiceActionsProps {
  tuitionFeeId: string
  paysSamStatus: PaysSamRequestStatus | null
  paysSamBillId: string | null
  shortUrl: string | null
  onActionComplete?: () => void
}

type ActionType = "send" | "resend" | "sync" | "cancel" | "destroy" | null

export function InvoiceActions({
  tuitionFeeId,
  paysSamStatus,
  paysSamBillId,
  shortUrl,
  onActionComplete,
}: InvoiceActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [confirmAction, setConfirmAction] = useState<ActionType>(null)

  // 상태별 가능한 액션 정의
  const canSend = !paysSamStatus || paysSamStatus === "pending" || paysSamStatus === "failed" || paysSamStatus === "destroyed"
  const canResend = paysSamStatus === "sent"
  const canSync = paysSamStatus === "sent" || paysSamStatus === "paid"
  const canCancel = paysSamStatus === "paid"
  const canDestroy = paysSamStatus === "sent"

  const handleAction = async (action: ActionType) => {
    if (!action) return

    setIsLoading(true)
    setConfirmAction(null)

    try {
      let endpoint = ""
      let method = "POST"
      let body: any = { tuitionFeeId }

      switch (action) {
        case "send":
        case "resend":
          endpoint = "/api/payssam/send"
          body = { tuitionFeeIds: [tuitionFeeId] }
          break
        case "sync":
          endpoint = "/api/payssam/status"
          break
        case "cancel":
          endpoint = "/api/payssam/cancel"
          break
        case "destroy":
          endpoint = "/api/payssam/destroy"
          break
      }

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (data.success) {
        const messages: Record<string, string> = {
          send: "청구서가 발송되었습니다.",
          resend: "청구서가 재발송되었습니다.",
          sync: "결제 상태가 동기화되었습니다.",
          cancel: "결제가 취소되었습니다.",
          destroy: "청구서가 파기되었습니다.",
        }
        toast.success(messages[action] || "처리되었습니다.")
        onActionComplete?.()
      } else {
        toast.error(data.error || "처리 중 오류가 발생했습니다.")
      }
    } catch (error) {
      console.error("Invoice action error:", error)
      toast.error("처리 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const getConfirmMessage = (action: ActionType) => {
    switch (action) {
      case "cancel":
        return "결제 취소 시 환불 처리가 진행됩니다. 계속하시겠습니까?"
      case "destroy":
        return "청구서를 파기하면 복구할 수 없습니다. 계속하시겠습니까?"
      default:
        return ""
    }
  }

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canSend && (
            <DropdownMenuItem onClick={() => handleAction("send")}>
              <Send className="w-4 h-4 mr-2" />
              청구서 발송
            </DropdownMenuItem>
          )}

          {canResend && (
            <DropdownMenuItem onClick={() => handleAction("resend")}>
              <RefreshCw className="w-4 h-4 mr-2" />
              재발송
            </DropdownMenuItem>
          )}

          {canSync && (
            <DropdownMenuItem onClick={() => handleAction("sync")}>
              <RefreshCw className="w-4 h-4 mr-2" />
              상태 동기화
            </DropdownMenuItem>
          )}

          {shortUrl && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href={shortUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  결제 링크 열기
                </a>
              </DropdownMenuItem>
            </>
          )}

          {(canCancel || canDestroy) && <DropdownMenuSeparator />}

          {canCancel && (
            <DropdownMenuItem
              onClick={() => setConfirmAction("cancel")}
              className="text-orange-600 focus:text-orange-600"
            >
              <XCircle className="w-4 h-4 mr-2" />
              결제 취소
            </DropdownMenuItem>
          )}

          {canDestroy && (
            <DropdownMenuItem
              onClick={() => setConfirmAction("destroy")}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              청구서 파기
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 확인 다이얼로그 */}
      <AlertDialog
        open={confirmAction === "cancel" || confirmAction === "destroy"}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "cancel" ? "결제 취소" : "청구서 파기"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {getConfirmMessage(confirmAction)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleAction(confirmAction)}
              className={
                confirmAction === "destroy"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-orange-600 hover:bg-orange-700"
              }
            >
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
