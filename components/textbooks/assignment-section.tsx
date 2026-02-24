"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Loader2, Plus, X, UserPlus, Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import {
  getTextbookAssignments,
  assignTextbook,
  cancelAssignment,
} from "@/services/textbook-service"
import {
  ASSIGNMENT_STATUS_LABELS,
  type TextbookAssignment,
  type AssignmentStatus,
} from "@/types/textbook"

interface AssignmentSectionProps {
  textbookId: string
  textbookName: string
  currentStock: number
  refreshKey?: number
  onAssignmentChange?: () => void
}

const STATUS_COLORS: Record<AssignmentStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  applied: "bg-blue-100 text-blue-700 border-blue-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
}

export function AssignmentSection({
  textbookId,
  textbookName,
  currentStock,
  refreshKey,
  onAssignmentChange,
}: AssignmentSectionProps) {
  const supabase = createClient()
  const [assignments, setAssignments] = useState<TextbookAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  // 배정 모달 상태
  const [students, setStudents] = useState<Array<{ id: string; name: string }>>([])
  const [selectedStudent, setSelectedStudent] = useState("")
  const [studentPopoverOpen, setStudentPopoverOpen] = useState(false)
  const [quantity, setQuantity] = useState("1")
  const [assigning, setAssigning] = useState(false)

  const loadAssignments = async () => {
    setLoading(true)
    try {
      const result = await getTextbookAssignments(supabase, textbookId)
      if (result.success && result.data) {
        setAssignments(result.data)
      }
    } catch (error) {
      console.error("배정 목록 로드 오류:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadStudents = async () => {
    const { data } = await supabase
      .from("students")
      .select("id, name")
      .eq("status", "재원")
      .eq("is_active", true)
      .order("name")

    setStudents(data || [])
  }

  useEffect(() => {
    loadAssignments()
  }, [textbookId, refreshKey])

  const handleOpenModal = () => {
    setSelectedStudent("")
    setQuantity("1")
    loadStudents()
    setShowModal(true)
  }

  const handleAssign = async () => {
    if (!selectedStudent) {
      toast.error("학생을 선택해주세요")
      return
    }
    const qty = parseInt(quantity)
    if (!qty || qty <= 0) {
      toast.error("수량을 입력해주세요")
      return
    }

    setAssigning(true)
    try {
      const result = await assignTextbook(supabase, textbookId, selectedStudent, qty)
      if (result.success) {
        toast.success("교재가 배정되었습니다")
        setShowModal(false)
        loadAssignments()
        onAssignmentChange?.()
      } else {
        toast.error(result.error || "배정에 실패했습니다")
      }
    } catch (error) {
      toast.error("오류가 발생했습니다")
    } finally {
      setAssigning(false)
    }
  }

  const handleCancel = async (assignmentId: string) => {
    const confirm = window.confirm("이 배정을 취소하시겠습니까? 재고가 복원됩니다.")
    if (!confirm) return

    setActionLoading(assignmentId)
    try {
      const result = await cancelAssignment(supabase, assignmentId)
      if (result.success) {
        toast.success("배정이 취소되었습니다")
        loadAssignments()
        onAssignmentChange?.()
      } else {
        toast.error(result.error || "취소에 실패했습니다")
      }
    } catch (error) {
      toast.error("오류가 발생했습니다")
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          배정 학생
          {loading && <Loader2 className="w-3 h-3 animate-spin" />}
        </h3>
        <Button variant="outline" size="sm" onClick={handleOpenModal}>
          <Plus className="w-3 h-3 mr-1" />
          배정
        </Button>
      </div>

      {assignments.length === 0 && !loading ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          배정된 학생이 없습니다
        </div>
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {(a.student as any)?.name || a.student_name_snapshot || "알 수 없음"}
                </span>
                <span className="text-muted-foreground">x{a.quantity}</span>
                <Badge variant="outline" className={STATUS_COLORS[a.status as AssignmentStatus]}>
                  {ASSIGNMENT_STATUS_LABELS[a.status as AssignmentStatus]}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{a.total_price.toLocaleString()}원</span>
                {a.status === "pending" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleCancel(a.id)}
                    disabled={actionLoading === a.id}
                  >
                    {actionLoading === a.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <X className="w-3 h-3" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 배정 모달 */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>교재 배정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground">
              교재: <span className="font-medium text-foreground">{textbookName}</span>
              <span className="ml-2">(재고: {currentStock})</span>
            </div>
            <div className="space-y-2">
              <Label>학생 *</Label>
              <Popover open={studentPopoverOpen} onOpenChange={setStudentPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={studentPopoverOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedStudent
                      ? students.find((s) => s.id === selectedStudent)?.name
                      : "학생 검색..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="학생 이름 검색..." />
                    <CommandList>
                      <CommandEmpty>검색 결과가 없습니다</CommandEmpty>
                      <CommandGroup>
                        {students.map((s) => (
                          <CommandItem
                            key={s.id}
                            value={s.name}
                            onSelect={() => {
                              setSelectedStudent(s.id)
                              setStudentPopoverOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedStudent === s.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {s.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>수량</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                max={currentStock}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={assigning}>
              취소
            </Button>
            <Button onClick={handleAssign} disabled={assigning}>
              {assigning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              배정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
