"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { Send, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import type { TuitionRow } from "@/types/tuition"

interface SendInvoiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedFees: TuitionRow[]
  onSuccess?: () => void
}

interface SendResult {
  tuitionFeeId: string
  studentName: string
  success: boolean
  error?: string
  shortUrl?: string
}

export function SendInvoiceModal({
  open,
  onOpenChange,
  selectedFees,
  onSuccess,
}: SendInvoiceModalProps) {
  const [isSending, setIsSending] = useState(false)
  const [results, setResults] = useState<SendResult[]>([])
  const [confirmSend, setConfirmSend] = useState(false)

  // 발송 가능한 항목만 필터링 (미납 상태이고, 활성 청구서가 없는 것)
  // paysSamBillId와 paysSamRequestStatus는 활성 bill 기준으로 매핑됨
  const eligibleFees = selectedFees.filter(
    (fee) =>
      fee.paymentStatus === "미납" &&
      !fee.paysSamBillId
  )

  const ineligibleFees = selectedFees.filter(
    (fee) => !eligibleFees.includes(fee)
  )

  const handleSend = async () => {
    if (!confirmSend) {
      toast.error("발송 전 확인 체크를 해주세요.")
      return
    }

    if (eligibleFees.length === 0) {
      toast.error("발송 가능한 항목이 없습니다.")
      return
    }

    setIsSending(true)
    setResults([])

    try {
      // /api/payssam/create 사용 - PaysSam에 청구서 등록 + 카카오톡 발송
      // (PaysSam에서 "발송"이 곧 "등록"임)
      const response = await fetch("/api/payssam/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tuitionFeeIds: eligibleFees.map((fee) => fee.id),
        }),
      })

      const data = await response.json()

      if (data.success) {
        const successCount = data.data?.results?.filter(
          (r: any) => r.success
        ).length || 0
        const failCount = data.data?.results?.filter(
          (r: any) => !r.success
        ).length || 0

        // 결과 저장
        setResults(
          data.data?.results?.map((r: any) => ({
            tuitionFeeId: r.tuitionFeeId,
            studentName:
              eligibleFees.find((f) => f.id === r.tuitionFeeId)?.studentName ||
              "알 수 없음",
            success: r.success,
            error: r.error,
            shortUrl: r.shortUrl,
          })) || []
        )

        if (successCount > 0) {
          toast.success(`${successCount}건의 청구서가 발송되었습니다.`)
        }
        if (failCount > 0) {
          toast.error(`${failCount}건 발송 실패`)
        }

        onSuccess?.()
      } else {
        toast.error(data.error || "청구서 발송에 실패했습니다.")
      }
    } catch (error) {
      console.error("Send invoice error:", error)
      toast.error("청구서 발송 중 오류가 발생했습니다.")
    } finally {
      setIsSending(false)
    }
  }

  const handleClose = () => {
    setResults([])
    setConfirmSend(false)
    onOpenChange(false)
  }

  const totalAmount = eligibleFees.reduce((sum, fee) => sum + fee.amount, 0)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" />
            청구서 발송
          </DialogTitle>
          <DialogDescription>
            선택한 학원비에 대해 결제선생(PaysSam)을 통해 청구서를 발송합니다.
          </DialogDescription>
        </DialogHeader>

        {results.length === 0 ? (
          <>
            {/* 발송 가능 항목 */}
            {eligibleFees.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm text-green-700">
                    발송 가능 ({eligibleFees.length}건)
                  </h4>
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                    총 {totalAmount.toLocaleString()}원
                  </Badge>
                </div>
                <ScrollArea className="h-48 border rounded-lg">
                  <div className="p-3 space-y-2">
                    {eligibleFees.map((fee) => (
                      <div
                        key={fee.id}
                        className="flex items-center justify-between py-2 px-3 bg-green-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <div>
                            <span className="font-medium">{fee.studentName}</span>
                            <span className="text-gray-500 ml-2 text-sm">
                              ({fee.className})
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {fee.amount.toLocaleString()}원
                          </div>
                          <div className="text-xs text-gray-500">
                            {fee.year}년 {fee.month}월
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* 발송 불가 항목 */}
            {ineligibleFees.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-orange-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  발송 불가 ({ineligibleFees.length}건)
                </h4>
                <ScrollArea className="h-32 border border-orange-200 rounded-lg">
                  <div className="p-3 space-y-2">
                    {ineligibleFees.map((fee) => (
                      <div
                        key={fee.id}
                        className="flex items-center justify-between py-2 px-3 bg-orange-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <AlertCircle className="w-4 h-4 text-orange-500" />
                          <div>
                            <span className="font-medium">{fee.studentName}</span>
                            <span className="text-gray-500 ml-2 text-sm">
                              ({fee.className})
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant="outline"
                            className={
                              fee.paymentStatus === "완납"
                                ? "text-green-600 border-green-200"
                                : fee.paysSamRequestStatus === "sent"
                                ? "text-blue-600 border-blue-200"
                                : fee.paysSamRequestStatus === "paid"
                                ? "text-green-600 border-green-200"
                                : "text-gray-600 border-gray-200"
                            }
                          >
                            {fee.paymentStatus === "완납"
                              ? "이미 완납"
                              : fee.paysSamRequestStatus === "sent"
                              ? "발송됨"
                              : fee.paysSamRequestStatus === "paid"
                              ? "결제완료"
                              : fee.paymentStatus}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* 발송 확인 체크박스 */}
            {eligibleFees.length > 0 && (
              <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Checkbox
                  id="confirm-send"
                  checked={confirmSend}
                  onCheckedChange={(checked) =>
                    setConfirmSend(checked === true)
                  }
                />
                <label
                  htmlFor="confirm-send"
                  className="text-sm leading-relaxed cursor-pointer"
                >
                  <span className="font-medium text-blue-700">
                    총 {eligibleFees.length}건, {totalAmount.toLocaleString()}원
                  </span>
                  의 청구서를 발송합니다.
                  <br />
                  <span className="text-blue-600 text-xs">
                    발송 후에는 청구서 파기 또는 결제 취소만 가능합니다.
                  </span>
                </label>
              </div>
            )}
          </>
        ) : (
          /* 발송 결과 표시 */
          <div className="space-y-3">
            <h4 className="font-medium text-sm">발송 결과</h4>
            <ScrollArea className="h-64 border rounded-lg">
              <div className="p-3 space-y-2">
                {results.map((result) => (
                  <div
                    key={result.tuitionFeeId}
                    className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                      result.success ? "bg-green-50" : "bg-red-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {result.success ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="font-medium">{result.studentName}</span>
                    </div>
                    <div className="text-right">
                      {result.success ? (
                        <Badge
                          variant="outline"
                          className="text-green-600 border-green-200"
                        >
                          발송 완료
                        </Badge>
                      ) : (
                        <span className="text-xs text-red-600">
                          {result.error || "발송 실패"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {results.length > 0 ? "닫기" : "취소"}
          </Button>
          {results.length === 0 && eligibleFees.length > 0 && (
            <Button
              onClick={handleSend}
              disabled={isSending || !confirmSend}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  발송 중...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  청구서 발송
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
