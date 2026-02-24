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
import {
  createTextbook,
  updateTextbook,
} from "@/services/textbook-service"
import { TEXTBOOK_CATEGORIES, type Textbook } from "@/types/textbook"

interface TextbookFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  textbook?: Textbook | null
}

export function TextbookFormModal({
  open,
  onClose,
  onSuccess,
  textbook,
}: TextbookFormModalProps) {
  const supabase = createClient()
  const isEdit = !!textbook

  const [name, setName] = useState(textbook?.name || "")
  const [publisher, setPublisher] = useState(textbook?.publisher || "")
  const [price, setPrice] = useState(textbook?.price?.toString() || "")
  const [category, setCategory] = useState(textbook?.category || "")
  const [initialStock, setInitialStock] = useState(
    textbook?.initial_stock?.toString() || "0"
  )
  const [currentStock, setCurrentStock] = useState(
    textbook?.current_stock?.toString() || "0"
  )
  const [description, setDescription] = useState(textbook?.description || "")
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("교재명을 입력해주세요")
      return
    }
    if (!price || parseInt(price) <= 0) {
      toast.error("가격을 입력해주세요")
      return
    }

    setSaving(true)
    try {
      if (isEdit && textbook) {
        const result = await updateTextbook(supabase, textbook.id, {
          name: name.trim(),
          publisher: publisher.trim() || undefined,
          price: parseInt(price),
          category: category || undefined,
          description: description.trim() || undefined,
          current_stock: parseInt(currentStock) || 0,
        })
        if (result.success) {
          toast.success("교재가 수정되었습니다")
          onSuccess()
          onClose()
        } else {
          toast.error(result.error || "수정에 실패했습니다")
        }
      } else {
        const result = await createTextbook(supabase, {
          name: name.trim(),
          publisher: publisher.trim() || undefined,
          price: parseInt(price),
          category: category || undefined,
          initial_stock: parseInt(initialStock) || 0,
          description: description.trim() || undefined,
        })
        if (result.success) {
          toast.success("교재가 등록되었습니다")
          onSuccess()
          onClose()
        } else {
          toast.error(result.error || "등록에 실패했습니다")
        }
      }
    } catch (error) {
      toast.error("오류가 발생했습니다")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "교재 수정" : "교재 등록"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">교재명 *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="교재명을 입력하세요"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="publisher">출판사</Label>
              <Input
                id="publisher"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="출판사"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">카테고리</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  {TEXTBOOK_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">단가 (원) *</Label>
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                min="0"
              />
            </div>
            {isEdit ? (
              <div className="space-y-2">
                <Label htmlFor="currentStock">현재 재고</Label>
                <Input
                  id="currentStock"
                  type="number"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="initialStock">초기 재고</Label>
                <Input
                  id="initialStock"
                  type="number"
                  value={initialStock}
                  onChange={(e) => setInitialStock(e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="교재 설명 (선택사항)"
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
            {isEdit ? "수정" : "등록"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
