"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { addInventoryLog } from "@/services/textbook-service"
import {
  INVENTORY_REASON_LABELS,
  type InventoryLogType,
  type InventoryReason,
} from "@/types/textbook"

interface InventoryFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  textbookId: string
  textbookName: string
  currentStock: number
}

const IN_REASONS: InventoryReason[] = ["purchase", "return", "adjustment"]
const OUT_REASONS: InventoryReason[] = ["distribution", "damage", "adjustment"]

export function InventoryFormModal({
  open,
  onClose,
  onSuccess,
  textbookId,
  textbookName,
  currentStock,
}: InventoryFormModalProps) {
  const supabase = createClient()

  const [logType, setLogType] = useState<InventoryLogType>("in")
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)

  const reasons = logType === "in" ? IN_REASONS : OUT_REASONS

  const handleSubmit = async () => {
    const qty = parseInt(quantity)
    if (!qty || qty <= 0) {
      toast.error("수량을 입력해주세요")
      return
    }
    if (!reason) {
      toast.error("사유를 선택해주세요")
      return
    }
    if (logType === "out" && qty > currentStock) {
      toast.error(`재고가 부족합니다. (현재 재고: ${currentStock})`)
      return
    }

    setSaving(true)
    try {
      const result = await addInventoryLog(supabase, {
        textbook_id: textbookId,
        log_type: logType,
        quantity: qty,
        reason,
        note: note.trim() || undefined,
      })

      if (result.success) {
        toast.success(logType === "in" ? "입고가 등록되었습니다" : "출고가 등록되었습니다")
        onSuccess()
        onClose()
      } else {
        toast.error(result.error || "등록에 실패했습니다")
      }
    } catch (error) {
      toast.error("오류가 발생했습니다")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>입출고 등록</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            교재: <span className="font-medium text-foreground">{textbookName}</span>
            <span className="ml-2">(현재 재고: {currentStock})</span>
          </div>

          <div className="space-y-2">
            <Label>유형</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={logType === "in" ? "default" : "outline"}
                className={logType === "in" ? "bg-blue-600 hover:bg-blue-700" : ""}
                onClick={() => {
                  setLogType("in")
                  setReason("")
                }}
              >
                입고
              </Button>
              <Button
                type="button"
                variant={logType === "out" ? "default" : "outline"}
                className={logType === "out" ? "bg-orange-600 hover:bg-orange-700" : ""}
                onClick={() => {
                  setLogType("out")
                  setReason("")
                }}
              >
                출고
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">수량 *</Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label>사유 *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  {reasons.map((r) => (
                    <SelectItem key={r} value={r}>
                      {INVENTORY_REASON_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">메모</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="메모 (선택사항)"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            등록
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
