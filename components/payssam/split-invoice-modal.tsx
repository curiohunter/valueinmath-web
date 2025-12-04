// @ts-nocheck
"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Minus, AlertCircle, CheckCircle2, Scissors } from "lucide-react"

interface SplitInvoiceModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (amounts: number[]) => Promise<void>
  originalAmount: number
  studentName: string
  yearMonth: string
  isLoading?: boolean
}

export function SplitInvoiceModal({
  open,
  onClose,
  onConfirm,
  originalAmount,
  studentName,
  yearMonth,
  isLoading = false,
}: SplitInvoiceModalProps) {
  // 분할 금액 배열 (최소 2개)
  const [amounts, setAmounts] = useState<number[]>([0, 0])
  const [error, setError] = useState<string | null>(null)

  // 합계 계산
  const totalAmount = amounts.reduce((sum, a) => sum + a, 0)
  const isValid = totalAmount === originalAmount && amounts.every(a => a > 0)
  const remaining = originalAmount - totalAmount

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (open) {
      // 기본값: 2등분
      const half = Math.floor(originalAmount / 2)
      setAmounts([half, originalAmount - half])
      setError(null)
    }
  }, [open, originalAmount])

  // 금액 변경 핸들러
  const handleAmountChange = (index: number, value: string) => {
    const numValue = parseInt(value.replace(/[^0-9]/g, "")) || 0
    const newAmounts = [...amounts]
    newAmounts[index] = numValue
    setAmounts(newAmounts)
    setError(null)
  }

  // 분할 추가 (최대 4개)
  const handleAddSplit = () => {
    if (amounts.length >= 4) return
    setAmounts([...amounts, 0])
  }

  // 분할 제거 (최소 2개 유지)
  const handleRemoveSplit = (index: number) => {
    if (amounts.length <= 2) return
    const newAmounts = amounts.filter((_, i) => i !== index)
    setAmounts(newAmounts)
  }

  // 균등 분할
  const handleEqualSplit = () => {
    const count = amounts.length
    const base = Math.floor(originalAmount / count)
    const remainder = originalAmount % count

    const newAmounts = amounts.map((_, i) =>
      i < remainder ? base + 1 : base
    )
    setAmounts(newAmounts)
  }

  // 확인
  const handleConfirm = async () => {
    if (!isValid) {
      setError("분할 금액의 합계가 원금과 일치해야 합니다.")
      return
    }

    if (amounts.some(a => a < 10000)) {
      setError("각 분할 금액은 최소 10,000원 이상이어야 합니다.")
      return
    }

    await onConfirm(amounts)
  }

  // 금액 포맷
  const formatAmount = (amount: number) => amount.toLocaleString()

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="w-5 h-5" />
            분할 청구
          </DialogTitle>
          <DialogDescription>
            {studentName}님의 {yearMonth} 학원비를 분할 청구합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 원금 정보 */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">원금</div>
            <div className="text-2xl font-bold">{formatAmount(originalAmount)}원</div>
          </div>

          {/* 분할 금액 입력 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>분할 금액</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleEqualSplit}
                className="text-xs"
              >
                균등 분할
              </Button>
            </div>

            {amounts.map((amount, index) => (
              <div key={index} className="flex items-center gap-2">
                <Badge variant="outline" className="w-16 justify-center">
                  {index + 1}회차
                </Badge>
                <div className="relative flex-1">
                  <Input
                    type="text"
                    value={formatAmount(amount)}
                    onChange={(e) => handleAmountChange(index, e.target.value)}
                    className="pr-8 text-right font-medium"
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    원
                  </span>
                </div>
                {amounts.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleRemoveSplit(index)}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}

            {/* 분할 추가 버튼 */}
            {amounts.length < 4 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleAddSplit}
              >
                <Plus className="w-4 h-4 mr-2" />
                분할 추가 (최대 4회)
              </Button>
            )}
          </div>

          {/* 합계 확인 */}
          <div className={`p-4 rounded-lg border-2 ${
            isValid ? "border-green-200 bg-green-50" :
            remaining === 0 ? "border-gray-200 bg-gray-50" :
            "border-orange-200 bg-orange-50"
          }`}>
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">합계</div>
              <div className={`text-xl font-bold ${
                isValid ? "text-green-600" : "text-gray-600"
              }`}>
                {formatAmount(totalAmount)}원
              </div>
            </div>
            {remaining !== 0 && (
              <div className="mt-2 text-sm text-orange-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {remaining > 0
                  ? `${formatAmount(remaining)}원 부족`
                  : `${formatAmount(Math.abs(remaining))}원 초과`
                }
              </div>
            )}
            {isValid && (
              <div className="mt-2 text-sm text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                금액이 일치합니다
              </div>
            )}
          </div>

          {/* 에러 메시지 */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 안내 메시지 */}
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-xs">
              분할 청구 시 원본 청구서는 파기되고, 분할된 금액으로 새 청구서들이 생성됩니다.
              각 청구서는 개별적으로 발송하거나 현장결제 처리할 수 있습니다.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            취소
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? "처리 중..." : `${amounts.length}건 분할 청구`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
