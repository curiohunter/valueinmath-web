"use client"

import { useState, useCallback } from "react"
import { useWizard } from "./wizard-context"
import { WizardNavigation } from "./wizard-steps"
import { createClient } from "@/lib/supabase/client"
import { saveStudentMonthlyPlan } from "@/services/tuition-session-service"
import { markRewardApplied } from "@/services/campaign-service"
import type { StudentMonthlyPlan, ClassSessionSegment } from "@/types/tuition-session"
import type { AppliedDiscount, AppliedTextbook } from "@/types/tuition"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Save, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

interface SegmentState {
  startDate: string
  previousEndDate: string | null
  isManualStartDate: boolean
  endDate: string | null
  isManualEndDate: boolean
  plan: StudentMonthlyPlan | null
}

interface StepReviewProps {
  selectedStudentsByClass: Map<string, Set<string>>
  studentsByClass: Map<string, { id: string; name: string; class_id: string; class_name: string }[]>
  segments: ClassSessionSegment[]
  segmentStates: Map<string, SegmentState>
  excludedDates: Set<string>
  addedDates: Map<string, string>
  onSaveComplete: () => void
}

export function StepReview({
  selectedStudentsByClass,
  studentsByClass,
  segments,
  segmentStates,
  excludedDates,
  addedDates,
  onSaveComplete,
}: StepReviewProps) {
  const { state, dispatch } = useWizard()
  const [isSaving, setIsSaving] = useState(false)

  // 반별 금액 맵
  const amountByClass = new Map<string, number>()
  for (const seg of segments) {
    if (!amountByClass.has(seg.classId)) {
      amountByClass.set(seg.classId, seg.calculatedAmount)
    }
  }

  // 요약 계산
  const entries: {
    classId: string
    className: string
    studentId: string
    studentName: string
    baseAmount: number
    discounts: AppliedDiscount[]
    textbooks: AppliedTextbook[]
    totalDiscount: number
    totalTextbook: number
    finalAmount: number
  }[] = []

  for (const [classId, studentIds] of selectedStudentsByClass) {
    const classStudents = studentsByClass.get(classId) ?? []
    const className = classStudents[0]?.class_name ?? ""
    const baseAmount = amountByClass.get(classId) ?? 0

    for (const studentId of studentIds) {
      const student = classStudents.find((s) => s.id === studentId)
      if (!student) continue
      const entryKey = `${classId}:${studentId}`
      const discounts = state.discountsByEntry[entryKey] ?? []
      const textbooks = state.textbooksByEntry[entryKey] ?? []
      const totalDiscount = discounts.reduce((sum, d) => sum + d.amount, 0)
      const totalTextbook = textbooks.reduce((sum, t) => sum + t.amount, 0)
      const finalAmount = baseAmount - totalDiscount + totalTextbook

      entries.push({
        classId,
        className,
        studentId,
        studentName: student.name,
        baseAmount,
        discounts,
        textbooks,
        totalDiscount,
        totalTextbook,
        finalAmount,
      })
    }
  }

  const totalStudents = entries.length
  const totalBaseAmount = entries.reduce((sum, e) => sum + e.baseAmount, 0)
  const totalDiscountSum = entries.reduce((sum, e) => sum + e.totalDiscount, 0)
  const totalTextbookSum = entries.reduce((sum, e) => sum + e.totalTextbook, 0)
  const grandTotal = entries.reduce((sum, e) => sum + e.finalAmount, 0)

  // 일괄 저장
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    const supabase = createClient()

    let totalCreated = 0
    let totalSkipped = 0

    try {
      for (const entry of entries) {
        const segState = segmentStates.get(entry.classId)
        if (!segState?.plan) continue

        const classStudents = studentsByClass.get(entry.classId) ?? []
        const studentName = classStudents.find((s) => s.id === entry.studentId)?.name ?? segState.plan.studentName

        // 세션 조정 (excluded/added 반영)
        const adjustedPlan: StudentMonthlyPlan = {
          ...segState.plan,
          studentId: entry.studentId,
          studentName,
          segments: segState.plan.segments.map((seg) => {
            const sessions = seg.sessions.map((s) =>
              excludedDates.has(s.date) && s.status === "scheduled"
                ? { ...s, status: "excluded" as const }
                : s,
            )
            const addedForClass = [...addedDates.entries()]
              .filter(([, cid]) => cid === seg.classId)
              .map(([date]) => {
                const d = new Date(date + "T00:00:00+09:00")
                const dayNames = ["일", "월", "화", "수", "목", "금", "토"]
                return { date, dayOfWeek: dayNames[d.getDay()], status: "scheduled" as const }
              })
            return { ...seg, sessions: [...sessions, ...addedForClass] }
          }),
        }

        // 확장된 saveStudentMonthlyPlan 호출
        const result = await saveStudentMonthlyPlan(adjustedPlan, {
          discounts: entry.discounts.length > 0 ? entry.discounts : undefined,
          textbooks: entry.textbooks.length > 0 ? entry.textbooks : undefined,
        })

        totalCreated += result.created
        totalSkipped += result.skipped

        // Phase B: 이벤트 보상 상태 업데이트
        if (result.created > 0) {
          for (const discount of entry.discounts) {
            if (discount.type === "event") {
              await markRewardApplied(supabase, discount.id)
            }
          }

          // 교재 배정 상태 업데이트
          for (const textbook of entry.textbooks) {
            await supabase
              .from("textbook_assignments")
              .update({
                status: "applied",
                applied_tuition_id: null, // tuition_fee_id는 saveStudentMonthlyPlan 내부에서 처리
                updated_at: new Date().toISOString(),
              })
              .eq("id", textbook.assignmentId)
          }
        }
      }

      if (totalCreated > 0) {
        toast.success(`${totalCreated}건 학원비가 생성되었습니다`)
      }
      if (totalSkipped > 0) {
        toast.info(`${totalSkipped}건은 이미 존재하여 건너뛰었습니다`)
      }

      dispatch({ type: "RESET" })
      onSaveComplete()
    } catch (err) {
      console.error("일괄 저장 실패:", err)
      toast.error("저장 중 오류가 발생했습니다")
    } finally {
      setIsSaving(false)
    }
  }, [entries, segmentStates, studentsByClass, excludedDates, addedDates, dispatch, onSaveComplete])

  const handlePrev = useCallback(() => dispatch({ type: "PREV_STEP" }), [dispatch])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 요약 카드 */}
        <Card className="bg-indigo-50 border-indigo-200">
          <CardContent className="py-3 px-4">
            <div className="grid grid-cols-5 gap-3 text-center">
              <div>
                <div className="text-lg font-bold text-indigo-700">{totalStudents}</div>
                <div className="text-[10px] text-indigo-500">학생수</div>
              </div>
              <div>
                <div className="text-lg font-bold text-slate-700">{totalBaseAmount.toLocaleString()}</div>
                <div className="text-[10px] text-slate-500">기본금액</div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-500">
                  {totalDiscountSum > 0 ? `-${totalDiscountSum.toLocaleString()}` : "0"}
                </div>
                <div className="text-[10px] text-red-400">할인</div>
              </div>
              <div>
                <div className="text-lg font-bold text-amber-600">
                  {totalTextbookSum > 0 ? `+${totalTextbookSum.toLocaleString()}` : "0"}
                </div>
                <div className="text-[10px] text-amber-500">교재비</div>
              </div>
              <div>
                <div className="text-lg font-bold text-indigo-700">{grandTotal.toLocaleString()}</div>
                <div className="text-[10px] text-indigo-500">최종 총액</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 학생별 상세 테이블 */}
        <div className="rounded-md border border-slate-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-slate-600">반</th>
                <th className="text-left px-3 py-2 font-medium text-slate-600">학생</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600">기본금액</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600">할인</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600">교재</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600">최종금액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((entry) => (
                <tr key={`${entry.classId}:${entry.studentId}`} className="hover:bg-slate-50">
                  <td className="px-3 py-1.5 text-slate-600">{entry.className}</td>
                  <td className="px-3 py-1.5 text-slate-800 font-medium">{entry.studentName}</td>
                  <td className="px-3 py-1.5 text-right text-slate-600">{entry.baseAmount.toLocaleString()}</td>
                  <td className="px-3 py-1.5 text-right">
                    {entry.totalDiscount > 0 ? (
                      <span className="text-red-500">-{entry.totalDiscount.toLocaleString()}</span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {entry.totalTextbook > 0 ? (
                      <span className="text-amber-600">+{entry.totalTextbook.toLocaleString()}</span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right font-semibold text-slate-800">
                    {entry.finalAmount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 할인/교재 상세 (있는 경우만) */}
        {entries.some((e) => e.discounts.length > 0 || e.textbooks.length > 0) && (
          <Card className="border-slate-200">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-xs font-medium text-slate-600">적용 내역 상세</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-2 space-y-2">
              {entries
                .filter((e) => e.discounts.length > 0 || e.textbooks.length > 0)
                .map((entry) => (
                  <div key={`${entry.classId}:${entry.studentId}`} className="text-xs">
                    <span className="font-medium text-slate-700">{entry.studentName}</span>
                    <div className="ml-3 space-y-0.5 mt-0.5">
                      {entry.discounts.map((d) => (
                        <div key={d.id} className="text-red-500">
                          - {d.title}: -{d.amount.toLocaleString()}원
                        </div>
                      ))}
                      {entry.textbooks.map((t) => (
                        <div key={t.assignmentId} className="text-amber-600">
                          + {t.textbookName} x{t.quantity}: +{t.amount.toLocaleString()}원
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* 하단: 이전 + 일괄 저장 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200">
        <Button variant="outline" size="sm" className="text-xs" onClick={handlePrev}>
          이전
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving || entries.length === 0}
          className="text-xs bg-indigo-600 hover:bg-indigo-700"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5 mr-1" />
              일괄 저장 ({entries.length}건)
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
