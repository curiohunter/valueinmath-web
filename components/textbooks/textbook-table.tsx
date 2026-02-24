"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Edit, PackagePlus, ChevronDown, ChevronRight, Power } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { deactivateTextbook } from "@/services/textbook-service"
import { InventoryLogSection } from "./inventory-log-section"
import { AssignmentSection } from "./assignment-section"
import type { Textbook } from "@/types/textbook"

interface TextbookTableProps {
  textbooks: Textbook[]
  onEdit: (textbook: Textbook) => void
  onInventory: (textbook: Textbook) => void
  onRefresh: () => void
  onStockUpdate: (textbookId: string, stockDelta: number) => void
}

export function TextbookTable({
  textbooks,
  onEdit,
  onInventory,
  onRefresh,
  onStockUpdate,
}: TextbookTableProps) {
  const supabase = createClient()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const handleDeactivate = async (textbook: Textbook) => {
    const confirm = window.confirm(
      `"${textbook.name}" 교재를 비활성화하시겠습니까?\n\n비활성화하면 교재 목록에서 숨겨집니다.`
    )
    if (!confirm) return

    const result = await deactivateTextbook(supabase, textbook.id)
    if (result.success) {
      toast.success("교재가 비활성화되었습니다")
      onRefresh()
    } else {
      toast.error(result.error || "비활성화에 실패했습니다")
    }
  }

  const handleAssignmentChange = (textbookId: string, stockDelta: number) => {
    setRefreshKey((prev) => prev + 1)
    onStockUpdate(textbookId, stockDelta)
  }

  if (textbooks.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-slate-300 text-6xl mb-4">📚</div>
        <div className="text-lg font-medium text-slate-500 mb-2">
          등록된 교재가 없습니다
        </div>
        <div className="text-sm text-slate-400">
          교재를 등록하고 재고를 관리해보세요
        </div>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50">
          <TableHead className="w-14 text-center">배부</TableHead>
          <TableHead>교재명</TableHead>
          <TableHead>출판사</TableHead>
          <TableHead>카테고리</TableHead>
          <TableHead className="text-right">단가</TableHead>
          <TableHead className="text-center">현재 재고</TableHead>
          <TableHead className="text-center">상태</TableHead>
          <TableHead className="text-center">관리</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {textbooks.map((textbook) => {
          const isExpanded = expandedId === textbook.id
          return (
            <React.Fragment key={textbook.id}>
                <TableRow className="group hover:bg-blue-50/30 cursor-pointer">
                  <TableCell>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleToggle(textbook.id)}>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                  </TableCell>
                  <TableCell
                    className="font-medium"
                    onClick={() => handleToggle(textbook.id)}
                  >
                    {textbook.name}
                    {textbook.description && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({textbook.description})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {textbook.publisher || "-"}
                  </TableCell>
                  <TableCell>
                    {textbook.category ? (
                      <Badge variant="secondary">{textbook.category}</Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {textbook.price.toLocaleString()}원
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={
                        textbook.current_stock <= 0
                          ? "bg-red-50 text-red-700 border-red-200"
                          : textbook.current_stock <= 5
                          ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                          : "bg-green-50 text-green-700 border-green-200"
                      }
                    >
                      {textbook.current_stock}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={
                        textbook.is_active
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-gray-50 text-gray-500 border-gray-200"
                      }
                    >
                      {textbook.is_active ? "활성" : "비활성"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEdit(textbook)
                        }}
                        title="수정"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-blue-600"
                        onClick={(e) => {
                          e.stopPropagation()
                          onInventory(textbook)
                        }}
                        title="입출고"
                      >
                        <PackagePlus className="w-3.5 h-3.5" />
                      </Button>
                      {textbook.is_active && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-red-500"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeactivate(textbook)
                          }}
                          title="비활성화"
                        >
                          <Power className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>

                {isExpanded && (
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                    <TableCell colSpan={8} className="p-0">
                      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6 border-t">
                        {/* 입출고 이력 */}
                        <div>
                          <h3 className="text-sm font-semibold mb-3">입출고 이력</h3>
                          <InventoryLogSection
                            textbookId={textbook.id}
                            refreshKey={refreshKey}
                          />
                        </div>

                        {/* 배정 학생 */}
                        <div>
                          <AssignmentSection
                            textbookId={textbook.id}
                            textbookName={textbook.name}
                            textbookPrice={textbook.price}
                            currentStock={textbook.current_stock}
                            refreshKey={refreshKey}
                            onAssignmentChange={(stockDelta) =>
                              handleAssignmentChange(textbook.id, stockDelta)
                            }
                          />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
            </React.Fragment>
          )
        })}
      </TableBody>
    </Table>
  )
}
