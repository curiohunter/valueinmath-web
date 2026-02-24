"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Search, BookOpen, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getTextbooks } from "@/services/textbook-service"
import { TextbookTable } from "@/components/textbooks/textbook-table"
import { TextbookFormModal } from "@/components/textbooks/textbook-form-modal"
import { InventoryFormModal } from "@/components/textbooks/inventory-form-modal"
import { TEXTBOOK_CATEGORIES, type Textbook } from "@/types/textbook"

export default function TextbooksPage() {
  const supabase = createClient()

  const [textbooks, setTextbooks] = useState<Textbook[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [showInactive, setShowInactive] = useState(false)

  // 모달 상태
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingTextbook, setEditingTextbook] = useState<Textbook | null>(null)
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false)
  const [inventoryTarget, setInventoryTarget] = useState<Textbook | null>(null)

  const loadTextbooks = async () => {
    setLoading(true)
    try {
      const result = await getTextbooks(supabase, {
        activeOnly: !showInactive,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
      })
      if (result.success && result.data) {
        setTextbooks(result.data)
      }
    } catch (error) {
      console.error("교재 목록 로드 오류:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTextbooks()
  }, [showInactive, categoryFilter])

  // 검색 필터
  const filteredTextbooks = textbooks.filter((tb) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      tb.name.toLowerCase().includes(term) ||
      (tb.publisher && tb.publisher.toLowerCase().includes(term)) ||
      (tb.category && tb.category.toLowerCase().includes(term))
    )
  })

  // 통계
  const totalStock = textbooks.reduce((sum, tb) => sum + tb.current_stock, 0)

  const handleEdit = (textbook: Textbook) => {
    setEditingTextbook(textbook)
    setFormModalOpen(true)
  }

  const handleInventory = (textbook: Textbook) => {
    setInventoryTarget(textbook)
    setInventoryModalOpen(true)
  }

  const handleFormClose = () => {
    setFormModalOpen(false)
    setEditingTextbook(null)
  }

  const handleStockUpdate = (textbookId: string, stockDelta: number) => {
    setTextbooks((prev) =>
      prev.map((tb) =>
        tb.id === textbookId
          ? { ...tb, current_stock: tb.current_stock + stockDelta }
          : tb
      )
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            교재 관리
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            교재 카탈로그, 재고 관리, 학생 배정을 한 곳에서 관리합니다
          </p>
        </div>
        <Button onClick={() => setFormModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          교재 등록
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">전체 교재</div>
          <div className="text-2xl font-bold mt-1">{textbooks.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">총 재고</div>
          <div className="text-2xl font-bold mt-1 text-blue-600">
            {totalStock}
          </div>
        </Card>
      </div>

      {/* 필터 */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="교재명, 출판사 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="카테고리" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {TEXTBOOK_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={showInactive ? "default" : "outline"}
            size="sm"
            onClick={() => setShowInactive(!showInactive)}
          >
            {showInactive ? "비활성 포함" : "활성만"}
          </Button>
          {(searchTerm || categoryFilter !== "all") && (
            <Badge variant="secondary" className="text-xs">
              {filteredTextbooks.length} / {textbooks.length}건
            </Badge>
          )}
        </div>
      </Card>

      {/* 교재 테이블 */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <TextbookTable
            textbooks={filteredTextbooks}
            onEdit={handleEdit}
            onInventory={handleInventory}
            onRefresh={loadTextbooks}
            onStockUpdate={handleStockUpdate}
          />
        )}
      </Card>

      {/* 교재 등록/수정 모달 */}
      {formModalOpen && (
        <TextbookFormModal
          open={formModalOpen}
          onClose={handleFormClose}
          onSuccess={loadTextbooks}
          textbook={editingTextbook}
        />
      )}

      {/* 입출고 모달 */}
      {inventoryModalOpen && inventoryTarget && (
        <InventoryFormModal
          open={inventoryModalOpen}
          onClose={() => {
            setInventoryModalOpen(false)
            setInventoryTarget(null)
          }}
          onSuccess={loadTextbooks}
          textbookId={inventoryTarget.id}
          textbookName={inventoryTarget.name}
          currentStock={inventoryTarget.current_stock}
        />
      )}
    </div>
  )
}
