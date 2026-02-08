"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Banknote,
  TrendingDown,
  Hash,
  Save,
  Users,
  Loader2,
} from "lucide-react"
import clsx from "clsx"
import { toast } from "sonner"
import type { SessionGenerationResult, GeneratedSession } from "@/types/tuition-session"
import { saveTuitionFeesWithSessions } from "@/services/tuition-session-service"

interface StudentInfo {
  id: string
  name: string
}

interface Props {
  className: string
  classId: string | null
  result: SessionGenerationResult | null
  students: StudentInfo[]
  periodStartDate: string
  isSidebarOpen: boolean
  onToggleSidebar: () => void
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; dot: string }
> = {
  scheduled: {
    label: "예정",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  closure: {
    label: "휴원",
    color: "bg-slate-50 text-slate-500 border-slate-200",
    dot: "bg-slate-400",
  },
}

function SessionRow({
  session,
  index,
  billableIndex,
}: {
  session: GeneratedSession
  index: number
  billableIndex: number | null
}) {
  const config = STATUS_CONFIG[session.status]
  const isClosure = session.status === "closure"

  return (
    <tr
      className={clsx(
        "border-b border-slate-100 transition-colors",
        isClosure ? "bg-slate-50/50" : "hover:bg-blue-50/30"
      )}
    >
      <td className="px-4 py-3 text-sm text-slate-400 tabular-nums">
        {index + 1}
      </td>
      <td className="px-4 py-3">
        <span
          className={clsx(
            "text-sm tabular-nums",
            isClosure ? "text-slate-400" : "text-slate-800 font-medium"
          )}
        >
          {session.date}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-sm text-slate-600">{session.dayOfWeek}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <span
          className={clsx(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
            config.color
          )}
        >
          <span className={clsx("w-1.5 h-1.5 rounded-full", config.dot)} />
          {config.label}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        {billableIndex !== null ? (
          <span className="text-sm font-semibold text-blue-700 tabular-nums">
            {billableIndex}회
          </span>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {session.closureReason && (
          <span className="text-xs text-slate-500">
            {session.closureReason}
          </span>
        )}
      </td>
    </tr>
  )
}

export function SessionTable({
  className,
  classId,
  result,
  students,
  periodStartDate,
  isSidebarOpen,
  onToggleSidebar,
}: Props) {
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)

  const toggleAll = () => {
    if (selectedStudentIds.size === students.length) {
      setSelectedStudentIds(new Set())
    } else {
      setSelectedStudentIds(new Set(students.map(s => s.id)))
    }
  }

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev)
      if (next.has(studentId)) {
        next.delete(studentId)
      } else {
        next.add(studentId)
      }
      return next
    })
  }

  const handleSave = async () => {
    if (!classId || !result || selectedStudentIds.size === 0) {
      toast.error("학생을 선택하세요")
      return
    }

    setIsSaving(true)
    try {
      const { created, skipped } = await saveTuitionFeesWithSessions(
        classId,
        Array.from(selectedStudentIds),
        result,
        periodStartDate
      )

      if (created > 0) {
        toast.success(`${created}명 수강료+세션 저장 완료${skipped > 0 ? ` (${skipped}명 스킵)` : ""}`)
      } else {
        toast.info(`이미 모든 학생의 수강료가 생성되어 있습니다 (${skipped}명 스킵)`)
      }
      setSelectedStudentIds(new Set())
    } catch (error: unknown) {
      const err = error as Error
      toast.error(err.message || "저장 실패")
    } finally {
      setIsSaving(false)
    }
  }

  if (!result) {
    return (
      <Card className="bg-white rounded-xl shadow border overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b bg-gradient-to-r from-slate-50 to-gray-50">
          {!isSidebarOpen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="h-8 w-8 p-0 bg-white border shadow-sm hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
          <h2 className="text-lg font-bold text-slate-800">수업료 계산</h2>
          <Badge className="bg-teal-100 text-teal-700 border-teal-200 text-xs font-bold">
            베타
          </Badge>
        </div>
        <div className="p-16 text-center">
          <CalendarDays className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-600 mb-2">
            회차 기반 수업료 계산
          </h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
            왼쪽에서 반을 선택하고 시작일/목표 회차를 설정한 뒤
            <br />
            <strong>세션 생성</strong> 버튼을 클릭하세요.
            <br />
            휴원일은 자동으로 건너뜁니다.
          </p>
        </div>
      </Card>
    )
  }

  let billableCounter = 0
  const allSelected = students.length > 0 && selectedStudentIds.size === students.length

  return (
    <Card className="bg-white rounded-xl shadow border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-slate-50 to-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="h-8 w-8 p-0 bg-white border shadow-sm hover:bg-gray-50"
            >
              {isSidebarOpen ? (
                <ChevronLeft className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{className}</h2>
              <div className="text-xs text-slate-500">세션 미리보기</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-teal-100 text-teal-700 border-teal-200 text-xs font-bold">
              베타
            </Badge>
            {students.length > 0 && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || selectedStudentIds.size === 0}
                className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 mr-1" />
                    저장 ({selectedStudentIds.size}명)
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="p-4 border-b bg-gradient-to-br from-slate-50/50 to-indigo-50/30">
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Hash className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs text-slate-500">청구 회차</span>
            </div>
            <div className="text-xl font-bold text-slate-800 tabular-nums">
              {result.billableCount}
              <span className="text-sm font-normal text-slate-400 ml-0.5">
                회
              </span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500">휴원일</span>
            </div>
            <div className="text-xl font-bold text-slate-800 tabular-nums">
              {result.closureDays}
              <span className="text-sm font-normal text-slate-400 ml-0.5">
                일
              </span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-xs text-slate-500">회당 단가</span>
            </div>
            <div className="text-xl font-bold text-slate-800 tabular-nums">
              {result.perSessionFee.toLocaleString()}
              <span className="text-sm font-normal text-slate-400 ml-0.5">
                원
              </span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-indigo-200 shadow-sm bg-gradient-to-br from-indigo-50 to-blue-50">
            <div className="flex items-center gap-2 mb-1">
              <Banknote className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-xs text-indigo-600">수업료</span>
            </div>
            <div className="text-xl font-bold text-indigo-700 tabular-nums">
              {result.calculatedAmount.toLocaleString()}
              <span className="text-sm font-normal text-indigo-500 ml-0.5">
                원
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
          <span>
            기간: {result.sessions[0]?.date} ~ {result.periodEndDate}
          </span>
          <span>총 {result.sessions.length}일</span>
        </div>
      </div>

      {/* Student Selection */}
      {students.length > 0 && (
        <div className="p-4 border-b bg-gradient-to-br from-indigo-50/30 to-slate-50/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-semibold text-slate-700">
                학생 선택
              </span>
              <Badge variant="outline" className="text-xs">
                {students.length}명
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAll}
              className="h-7 px-2 text-xs text-indigo-600 hover:text-indigo-700"
            >
              {allSelected ? "전체 해제" : "전체 선택"}
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {students.map((student) => (
              <label
                key={student.id}
                className={clsx(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                  selectedStudentIds.has(student.id)
                    ? "bg-indigo-50 border-indigo-300"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                )}
              >
                <Checkbox
                  checked={selectedStudentIds.has(student.id)}
                  onCheckedChange={() => toggleStudent(student.id)}
                />
                <span className="text-sm text-slate-700">{student.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Session Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-8">
                #
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-28">
                날짜
              </th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-14">
                요일
              </th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-20">
                상태
              </th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-16">
                회차
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                비고
              </th>
            </tr>
          </thead>
          <tbody>
            {result.sessions.map((session, idx) => {
              let bi: number | null = null
              if (session.status === "scheduled") {
                billableCounter++
                bi = billableCounter
              }
              return (
                <SessionRow
                  key={session.date + session.status}
                  session={session}
                  index={idx}
                  billableIndex={bi}
                />
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-3 border-t bg-slate-50/50">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            청구 대상{" "}
            <span className="font-semibold text-blue-700">
              {result.billableCount}회
            </span>
            {result.closureDays > 0 && (
              <>
                {" "}
                / 휴원{" "}
                <span className="font-semibold text-slate-600">
                  {result.closureDays}일
                </span>
              </>
            )}
          </span>
          <span className="font-semibold text-indigo-700">
            {result.calculatedAmount.toLocaleString()}원
          </span>
        </div>
      </div>
    </Card>
  )
}
