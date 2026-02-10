"use client"

import type { ClassSessionSegment } from "@/types/tuition-session"

interface SessionSummaryProps {
  segments: ClassSessionSegment[]
  excludedDates: Set<string>
  addedDates: Map<string, string>
  selectedStudentCount: number
}

export function SessionSummary({
  segments,
  excludedDates,
  addedDates,
  selectedStudentCount,
}: SessionSummaryProps) {
  if (segments.length === 0) return null

  // 반별 수동 추가 횟수 계산
  const addedCountByClass = new Map<string, number>()
  for (const [, classId] of addedDates) {
    addedCountByClass.set(classId, (addedCountByClass.get(classId) ?? 0) + 1)
  }

  // 제외된 날짜 + 수동 추가를 반영한 실제 금액 계산
  const adjustedSegments = segments.map((seg) => {
    const scheduledCount = seg.sessions.filter(
      (s) => s.status === "scheduled" && !excludedDates.has(s.date)
    ).length
    const addedCount = addedCountByClass.get(seg.classId) ?? 0
    const totalCount = scheduledCount + addedCount
    const amount = totalCount * seg.perSessionFee
    return { ...seg, adjustedBillable: totalCount, adjustedAmount: amount, addedCount }
  })

  const totalBillable = adjustedSegments.reduce(
    (sum, s) => sum + s.adjustedBillable,
    0
  )
  const totalAmount = adjustedSegments.reduce(
    (sum, s) => sum + s.adjustedAmount,
    0
  )
  const totalClosure = segments.reduce((sum, s) => sum + s.closureDays, 0)
  const totalExcluded = segments.reduce((sum, seg) => {
    return (
      sum +
      seg.sessions.filter(
        (s) => s.status === "scheduled" && excludedDates.has(s.date)
      ).length
    )
  }, 0)
  const totalAdded = addedDates.size

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <h4 className="text-sm font-semibold text-slate-700">요약</h4>

      {adjustedSegments.map((seg) => (
        <div
          key={seg.classId}
          className="flex items-center gap-2 text-xs text-slate-600"
        >
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: seg.color }}
          />
          <span className="flex-1 truncate">{seg.className}</span>
          <span className="tabular-nums text-slate-500">
            {seg.adjustedBillable}회
          </span>
          <span className="text-slate-400">x</span>
          <span className="tabular-nums text-slate-500">
            {seg.perSessionFee.toLocaleString()}원
          </span>
          <span className="text-slate-400">=</span>
          <span className="tabular-nums font-medium text-slate-700">
            {seg.adjustedAmount.toLocaleString()}원
          </span>
        </div>
      ))}

      <div className="border-t border-slate-100 pt-2 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">수업 횟수</span>
          <span className="font-medium text-slate-700">{totalBillable}회</span>
        </div>
        {totalClosure > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">휴원일</span>
            <span className="text-slate-500">{totalClosure}일</span>
          </div>
        )}
        {totalAdded > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">보강 추가</span>
            <span className="text-blue-600">+{totalAdded}회</span>
          </div>
        )}
        {totalExcluded > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">수동 제외</span>
            <span className="text-red-500">-{totalExcluded}회</span>
          </div>
        )}
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">선택 학생</span>
          <span className="font-medium text-slate-700">
            {selectedStudentCount}명
          </span>
        </div>
        <div className="flex justify-between text-sm pt-1 border-t border-slate-100">
          <span className="font-medium text-slate-700">인당 수강료</span>
          <span className="font-bold text-slate-900">
            {totalAmount.toLocaleString()}원
          </span>
        </div>
      </div>
    </div>
  )
}
