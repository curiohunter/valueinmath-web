"use client"

import { useState, useEffect, useCallback } from "react"
import { useWizard } from "./wizard-context"
import { WizardNavigation } from "./wizard-steps"
import { createClient } from "@/lib/supabase/client"
import {
  getPendingAssignments,
  getTextbooks,
  assignTextbook,
} from "@/services/textbook-service"
import type { TextbookAssignment, Textbook } from "@/types/textbook"
import type { AppliedTextbook } from "@/types/tuition"
import type { ClassSessionSegment } from "@/types/tuition-session"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { BookOpen, Check, Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface StepTextbookProps {
  selectedStudentsByClass: Map<string, Set<string>>
  studentsByClass: Map<string, { id: string; name: string; class_id: string; class_name: string }[]>
  segments: ClassSessionSegment[]
}

export function StepTextbook({ selectedStudentsByClass, studentsByClass, segments }: StepTextbookProps) {
  const { state, dispatch } = useWizard()
  const [isLoading, setIsLoading] = useState(true)

  // 반별 금액 맵
  const amountByClass = new Map<string, number>()
  for (const seg of segments) {
    if (!amountByClass.has(seg.classId)) {
      amountByClass.set(seg.classId, seg.calculatedAmount)
    }
  }

  // 전체 선택 학생 ID
  const allStudentIds = [...selectedStudentsByClass.values()].flatMap((ids) => [...ids])

  // 데이터 로드
  useEffect(() => {
    async function fetchTextbookData() {
      setIsLoading(true)
      const supabase = createClient()

      try {
        const res = await getPendingAssignments(supabase)
        if (res.success && res.data) {
          const byStudent: Record<string, TextbookAssignment[]> = {}
          for (const a of res.data) {
            if (!allStudentIds.includes(a.student_id)) continue
            if (!byStudent[a.student_id]) byStudent[a.student_id] = []
            byStudent[a.student_id].push(a)
          }
          dispatch({ type: "SET_PENDING_TEXTBOOKS", data: byStudent })
        }
      } catch (err) {
        console.error("교재 데이터 로드 실패:", err)
        toast.error("교재 데이터를 불러오지 못했습니다")
      } finally {
        setIsLoading(false)
      }
    }
    fetchTextbookData()
  }, [])

  const handleApplyTextbook = useCallback(
    (entryKey: string, assignment: TextbookAssignment) => {
      const textbook: AppliedTextbook = {
        assignmentId: assignment.id,
        textbookName: assignment.textbook_name_snapshot ?? "교재",
        amount: assignment.total_price,
        quantity: assignment.quantity,
      }
      dispatch({ type: "APPLY_TEXTBOOK", entryKey, textbook })
    },
    [dispatch],
  )

  const handlePrev = useCallback(() => dispatch({ type: "PREV_STEP" }), [dispatch])
  const handleNext = useCallback(() => dispatch({ type: "NEXT_STEP" }), [dispatch])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
        <span className="text-sm text-slate-500">교재 정보 로딩 중...</span>
      </div>
    )
  }

  const classEntries = [...selectedStudentsByClass.entries()].filter(([, ids]) => ids.size > 0)

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className="text-xs text-slate-500">
          학생별 대기 교재를 확인하고 학원비에 포함할 교재를 선택하세요. 건너뛰려면 &quot;다음&quot;을 클릭하세요.
        </p>

        {classEntries.map(([classId, studentIds]) => {
          const classStudents = studentsByClass.get(classId) ?? []
          const className = classStudents[0]?.class_name ?? ""
          const baseAmount = amountByClass.get(classId) ?? 0

          return (
            <div key={classId} className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700">{className}</h3>
              {[...studentIds].map((studentId) => {
                const student = classStudents.find((s) => s.id === studentId)
                if (!student) return null
                const entryKey = `${classId}:${studentId}`
                const discounts = state.discountsByEntry[entryKey] ?? []
                const totalDiscount = discounts.reduce((sum, d) => sum + d.amount, 0)
                const afterDiscount = baseAmount - totalDiscount

                return (
                  <StudentTextbookCard
                    key={entryKey}
                    entryKey={entryKey}
                    studentId={studentId}
                    studentName={student.name}
                    afterDiscountAmount={afterDiscount}
                    pendingAssignments={state.pendingTextbooksByStudent[studentId] ?? []}
                    appliedTextbooks={state.textbooksByEntry[entryKey] ?? []}
                    onApplyTextbook={handleApplyTextbook}
                    onRemoveTextbook={(assignmentId) =>
                      dispatch({ type: "REMOVE_TEXTBOOK", entryKey, assignmentId })
                    }
                    onAssignmentCreated={(assignment) => {
                      const current = state.pendingTextbooksByStudent[studentId] ?? []
                      dispatch({
                        type: "SET_PENDING_TEXTBOOKS",
                        data: {
                          ...state.pendingTextbooksByStudent,
                          [studentId]: [...current, assignment],
                        },
                      })
                    }}
                  />
                )
              })}
            </div>
          )
        })}
      </div>

      <WizardNavigation onPrev={handlePrev} onNext={handleNext} />
    </div>
  )
}

// --- 학생별 교재 카드 ---

interface StudentTextbookCardProps {
  entryKey: string
  studentId: string
  studentName: string
  afterDiscountAmount: number
  pendingAssignments: TextbookAssignment[]
  appliedTextbooks: AppliedTextbook[]
  onApplyTextbook: (entryKey: string, assignment: TextbookAssignment) => void
  onRemoveTextbook: (assignmentId: string) => void
  onAssignmentCreated: (assignment: TextbookAssignment) => void
}

function StudentTextbookCard({
  entryKey,
  studentId,
  studentName,
  afterDiscountAmount,
  pendingAssignments,
  appliedTextbooks,
  onApplyTextbook,
  onRemoveTextbook,
  onAssignmentCreated,
}: StudentTextbookCardProps) {
  const totalTextbook = appliedTextbooks.reduce((sum, t) => sum + t.amount, 0)
  const appliedIds = new Set(appliedTextbooks.map((t) => t.assignmentId))

  return (
    <Card className="border-slate-200">
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium">{studentName}</CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">{afterDiscountAmount.toLocaleString()}원</span>
            {totalTextbook > 0 && (
              <span className="text-amber-600 font-medium">+{totalTextbook.toLocaleString()}원</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-2 space-y-1.5">
        {/* 대기 교재 목록 */}
        {pendingAssignments.map((assignment) => {
          const isApplied = appliedIds.has(assignment.id)
          const tbName = assignment.textbook_name_snapshot ?? "교재"
          return (
            <div key={assignment.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-3 h-3 text-amber-500" />
                <span className="text-slate-700">{tbName}</span>
                <span className="text-slate-400">x{assignment.quantity}</span>
                <span className="text-slate-400">+{assignment.total_price.toLocaleString()}원</span>
              </div>
              {isApplied ? (
                <button
                  onClick={() => onRemoveTextbook(assignment.id)}
                  className="flex items-center gap-0.5 text-xs text-green-600 hover:text-red-500 transition-colors"
                >
                  <Check className="w-3 h-3" />
                  <span>포함됨</span>
                </button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-[10px] text-amber-600 hover:text-amber-800"
                  onClick={() => onApplyTextbook(entryKey, assignment)}
                >
                  포함
                </Button>
              )}
            </div>
          )
        })}

        {/* 교재 신규 배정 */}
        <TextbookAssignPopover
          studentId={studentId}
          studentName={studentName}
          onAssignmentCreated={onAssignmentCreated}
        />

        {/* 교재 없을 때 안내 */}
        {pendingAssignments.length === 0 && appliedTextbooks.length === 0 && (
          <p className="text-[10px] text-slate-400 py-1">대기 중인 교재가 없습니다</p>
        )}
      </CardContent>
    </Card>
  )
}

// --- 교재 신규 배정 Popover ---

interface TextbookAssignPopoverProps {
  studentId: string
  studentName: string
  onAssignmentCreated: (assignment: TextbookAssignment) => void
}

function TextbookAssignPopover({ studentId, studentName, onAssignmentCreated }: TextbookAssignPopoverProps) {
  const [open, setOpen] = useState(false)
  const [textbooks, setTextbooks] = useState<Textbook[]>([])
  const [isLoadingTextbooks, setIsLoadingTextbooks] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTextbook, setSelectedTextbook] = useState<Textbook | null>(null)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (!open) return
    async function loadTextbooks() {
      setIsLoadingTextbooks(true)
      const supabase = createClient()
      const res = await getTextbooks(supabase, { activeOnly: true })
      if (res.success && res.data) {
        setTextbooks(res.data)
      }
      setIsLoadingTextbooks(false)
    }
    loadTextbooks()
  }, [open])

  const handleAssign = async () => {
    if (!selectedTextbook) return
    setIsSubmitting(true)
    const supabase = createClient()
    const result = await assignTextbook(supabase, selectedTextbook.id, studentId, quantity)

    if (result.success && result.data) {
      toast.success(`${studentName} - ${selectedTextbook.name} 배정 완료`)
      onAssignmentCreated(result.data)
      setOpen(false)
      setSelectedTextbook(null)
      setQuantity(1)
    } else {
      toast.error(result.error ?? "배정 실패")
    }
    setIsSubmitting(false)
  }

  return (
    <Popover open={open} onOpenChange={(v) => {
      setOpen(v)
      if (!v) { setSelectedTextbook(null); setQuantity(1) }
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-1.5 text-[10px] text-slate-500 hover:text-amber-600 w-fit"
        >
          <Plus className="w-3 h-3 mr-0.5" />
          교재 배정
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        {!selectedTextbook ? (
          <>
            <p className="text-xs font-medium text-slate-700 mb-2">교재 선택</p>
            {isLoadingTextbooks ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              </div>
            ) : textbooks.length === 0 ? (
              <p className="text-[10px] text-slate-400 py-2">등록된 교재가 없습니다</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {textbooks.map((tb) => (
                  <button
                    key={tb.id}
                    onClick={() => setSelectedTextbook(tb)}
                    className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-700">{tb.name}</span>
                      <span className="text-[10px] text-slate-400">재고 {tb.current_stock}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {tb.price.toLocaleString()}원
                      {tb.category && ` · ${tb.category}`}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-xs font-medium text-slate-700 mb-2">{selectedTextbook.name}</p>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-slate-500">수량:</span>
              <Input
                type="number"
                min={1}
                max={selectedTextbook.current_stock}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 h-7 text-xs"
              />
              <span className="text-[10px] text-slate-400">
                합계: {(selectedTextbook.price * quantity).toLocaleString()}원
              </span>
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="text-xs flex-1"
                onClick={() => setSelectedTextbook(null)}
              >
                뒤로
              </Button>
              <Button
                size="sm"
                className="text-xs flex-1"
                disabled={isSubmitting || quantity > selectedTextbook.current_stock}
                onClick={handleAssign}
              >
                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : "배정"}
              </Button>
            </div>
            {quantity > selectedTextbook.current_stock && (
              <p className="text-[10px] text-red-500 mt-1">재고 부족 (현재: {selectedTextbook.current_stock})</p>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
