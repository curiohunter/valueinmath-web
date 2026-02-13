"use client"

import { useState, useMemo, useCallback, forwardRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  LogIn,
  LogOut,
  UserX,
  Clock,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  UserCheck,
  StickyNote,
  Undo2,
  Pencil,
  CheckSquare,
  Users,
  X,
} from "lucide-react"
import clsx from "clsx"
import type { Attendance, AttendanceStatus, AbsenceReason } from "@/types/attendance"
import {
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_COLORS,
  ABSENCE_REASON_LABELS,
} from "@/types/attendance"
import type { ClassWithSchedule } from "@/hooks/use-all-attendance"

interface Props {
  cls: ClassWithSchedule
  attendances: Attendance[]
  isExpanded: boolean
  onToggle: () => void
  highlightedStudentId: string | null
  onCheckIn: (studentId: string, studentName: string, classId: string) => void
  onCheckOut: (attendanceId: string, studentName: string, isMakeup: boolean) => void
  onMarkAbsent: (studentId: string, studentName: string, classId: string, className: string) => void
  onRevertAbsent: (attendanceId: string, studentName: string) => void
  onTimeEdit: (attendanceId: string, studentName: string, field: "check_in" | "check_out", currentIso: string | null) => void
  onNoteEdit: (attendanceId: string, studentName: string, currentNote: string) => void
  onReasonChange: (attendanceId: string, studentName: string, currentReason: AbsenceReason | null) => void
  onRevertPending: (attendanceId: string, studentName: string) => void
  onBulkCheckIn: (classId: string, studentIds: string[]) => void
  onBulkCheckOut: (attendanceIds: string[]) => void
}

function formatTime(isoString: string | null): string {
  if (!isoString) return "—"
  const d = new Date(isoString)
  return d.toLocaleTimeString("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

function StatusBadge({ status, absenceReason }: { status: AttendanceStatus; absenceReason?: AbsenceReason | null }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className={clsx(
          "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap",
          ATTENDANCE_STATUS_COLORS[status]
        )}
      >
        {ATTENDANCE_STATUS_LABELS[status]}
      </span>
      {status === "absent" && absenceReason && (
        <span className="text-[10px] text-red-400">
          {ABSENCE_REASON_LABELS[absenceReason]}
        </span>
      )}
    </div>
  )
}

export const ClassAttendanceCard = forwardRef<HTMLDivElement, Props>(function ClassAttendanceCard(
  {
    cls,
    attendances,
    isExpanded,
    onToggle,
    highlightedStudentId,
    onCheckIn,
    onCheckOut,
    onMarkAbsent,
    onRevertAbsent,
    onTimeEdit,
    onNoteEdit,
    onReasonChange,
    onRevertPending,
    onBulkCheckIn,
    onBulkCheckOut,
  },
  ref
) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const getAttendance = useCallback(
    (studentId: string): Attendance | undefined =>
      attendances.find((a) => a.student_id === studentId && !a.is_makeup),
    [attendances]
  )

  const stats = useMemo(() => {
    const total = cls.students.length
    let present = 0
    let late = 0
    let absent = 0
    for (const att of attendances) {
      if (att.is_makeup) continue
      if (att.status === "present" || att.status === "early_leave") present++
      else if (att.status === "late") late++
      else if (att.status === "absent") absent++
    }
    const processed = present + late + absent
    return { total, present, late, absent, processed }
  }, [cls.students.length, attendances])

  // Bulk selection computed values
  const pendingStudentIds = useMemo(
    () => cls.students.filter((s) => !getAttendance(s.id)).map((s) => s.id),
    [cls.students, getAttendance]
  )

  const checkedInNotOutIds = useMemo(
    () => cls.students.filter((s) => {
      const att = getAttendance(s.id)
      return att?.check_in_at && !att?.check_out_at && att?.status !== "absent"
    }).map((s) => s.id),
    [cls.students, getAttendance]
  )

  const selectedPendingCount = useMemo(
    () => [...selectedIds].filter((id) => pendingStudentIds.includes(id)).length,
    [selectedIds, pendingStudentIds]
  )

  const selectedCheckedInCount = useMemo(
    () => [...selectedIds].filter((id) => checkedInNotOutIds.includes(id)).length,
    [selectedIds, checkedInNotOutIds]
  )

  const toggleSelect = (studentId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === cls.students.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(cls.students.map((s) => s.id)))
    }
  }

  const handleBulkCheckIn = () => {
    const targetIds = [...selectedIds].filter((id) => pendingStudentIds.includes(id))
    if (targetIds.length > 0) {
      onBulkCheckIn(cls.id, targetIds)
    }
  }

  const handleBulkCheckOut = () => {
    const targetIds = [...selectedIds].filter((id) => checkedInNotOutIds.includes(id))
    const attendanceIds = targetIds
      .map((id) => getAttendance(id)?.id)
      .filter((id): id is string => !!id)
    if (attendanceIds.length > 0) {
      onBulkCheckOut(attendanceIds)
    }
  }

  // Clear selection when attendances change (after refresh)
  const prevAttLen = useMemo(() => attendances.length, [attendances])
  useMemo(() => {
    if (selectedIds.size > 0) {
      setSelectedIds(new Set())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevAttLen])

  const progressPercent = stats.total > 0 ? (stats.processed / stats.total) * 100 : 0
  const hasSelection = selectedIds.size > 0

  return (
    <div ref={ref} className="border rounded-lg bg-white shadow-sm overflow-hidden">
      {/* Header - always visible */}
      <button
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50/50 transition-colors text-left"
        onClick={onToggle}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-800 truncate">
              {cls.name}
            </span>
            <span className="text-xs text-slate-400">
              {cls.teacherName}
            </span>
            <span className="text-xs text-slate-400">
              {cls.schedule.start_time}~{cls.schedule.end_time}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[120px]">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 tabular-nums">
              {stats.processed}/{stats.total}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {stats.present > 0 && (
            <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px] px-1.5 py-0">
              출석{stats.present}
            </Badge>
          )}
          {stats.late > 0 && (
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-[10px] px-1.5 py-0">
              지각{stats.late}
            </Badge>
          )}
          {stats.absent > 0 && (
            <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px] px-1.5 py-0">
              결석{stats.absent}
            </Badge>
          )}
        </div>
      </button>

      {/* Expanded: student table */}
      {isExpanded && (
        <div className="border-t">
          <table className="min-w-full">
            <thead>
              <tr className="bg-slate-50 border-b text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-2 py-2 text-center w-[5%]">
                  <Checkbox
                    checked={cls.students.length > 0 && selectedIds.size === cls.students.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="전체 선택"
                  />
                </th>
                <th className="px-2 py-2 text-left w-[20%]">학생</th>
                <th className="px-2 py-2 text-center w-[12%]">상태</th>
                <th className="px-2 py-2 text-center w-[12%]">등원</th>
                <th className="px-2 py-2 text-center w-[12%]">하원</th>
                <th className="px-2 py-2 text-left w-[20%]">비고</th>
                <th className="px-3 py-2 text-right w-[19%]">액션</th>
              </tr>
            </thead>
            <tbody>
              {cls.students.map((student) => {
                const att = getAttendance(student.id)
                const hasCheckedIn = !!att?.check_in_at
                const hasCheckedOut = !!att?.check_out_at
                const isAbsent = att?.status === "absent"
                const isHighlighted = highlightedStudentId === student.id

                return (
                  <tr
                    key={student.id}
                    className={clsx(
                      "border-b border-slate-100 transition-colors",
                      isHighlighted && "bg-blue-50 ring-1 ring-blue-200 ring-inset",
                      !isHighlighted && isAbsent && "bg-red-50/40",
                      !isHighlighted && hasCheckedIn && !isAbsent && "bg-green-50/30",
                      !isHighlighted && !hasCheckedIn && !isAbsent && "hover:bg-slate-50/50"
                    )}
                  >
                    <td className="px-2 py-2.5 text-center">
                      <Checkbox
                        checked={selectedIds.has(student.id)}
                        onCheckedChange={() => toggleSelect(student.id)}
                        aria-label={`${student.name} 선택`}
                      />
                    </td>
                    <td className="px-2 py-2.5">
                      <span className="text-sm font-medium text-slate-800 truncate block">
                        {student.name}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      {att ? (
                        <StatusBadge status={att.status} absenceReason={att.absence_reason} />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <span className={clsx(
                        "text-sm tabular-nums",
                        hasCheckedIn ? "text-slate-700 font-medium" : "text-slate-300"
                      )}>
                        {formatTime(att?.check_in_at ?? null)}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <span className={clsx(
                        "text-sm tabular-nums",
                        hasCheckedOut ? "text-slate-700 font-medium" : "text-slate-300"
                      )}>
                        {formatTime(att?.check_out_at ?? null)}
                      </span>
                    </td>
                    <td className="px-2 py-2.5">
                      {att?.note ? (
                        <span className="text-xs text-slate-500 line-clamp-1">{att.note}</span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {/* Check-in button */}
                        {!hasCheckedIn && !isAbsent && (
                          <Button
                            size="sm"
                            onClick={() => onCheckIn(student.id, student.name, cls.id)}
                            className="h-6 px-2 bg-green-600 hover:bg-green-700 text-white text-[11px] font-medium"
                          >
                            <LogIn className="w-3 h-3 mr-0.5" />
                            등원
                          </Button>
                        )}

                        {/* Check-out button */}
                        {hasCheckedIn && !hasCheckedOut && !isAbsent && att && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onCheckOut(att.id, student.name, false)}
                            className="h-6 px-2 border-slate-300 text-slate-700 text-[11px] font-medium"
                          >
                            <LogOut className="w-3 h-3 mr-0.5" />
                            하원
                          </Button>
                        )}

                        {/* Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            {!att && (
                              <>
                                <DropdownMenuItem onClick={() => onCheckIn(student.id, student.name, cls.id)}>
                                  <LogIn className="w-3.5 h-3.5 mr-2" />
                                  등원 처리
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => onMarkAbsent(student.id, student.name, cls.id, cls.name)}
                                >
                                  <UserX className="w-3.5 h-3.5 mr-2" />
                                  결석 처리
                                </DropdownMenuItem>
                              </>
                            )}

                            {att && !isAbsent && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => onTimeEdit(att.id, student.name, "check_in", att.check_in_at)}
                                >
                                  <Clock className="w-3.5 h-3.5 mr-2" />
                                  등원시간 수정
                                </DropdownMenuItem>
                                {hasCheckedOut && (
                                  <DropdownMenuItem
                                    onClick={() => onTimeEdit(att.id, student.name, "check_out", att.check_out_at)}
                                  >
                                    <Clock className="w-3.5 h-3.5 mr-2" />
                                    하원시간 수정
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => onNoteEdit(att.id, student.name, att.note ?? "")}>
                                  <StickyNote className="w-3.5 h-3.5 mr-2" />
                                  메모
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => onMarkAbsent(student.id, student.name, cls.id, cls.name)}
                                >
                                  <UserX className="w-3.5 h-3.5 mr-2" />
                                  결석 처리
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-slate-500"
                                  onClick={() => onRevertPending(att.id, student.name)}
                                >
                                  <Undo2 className="w-3.5 h-3.5 mr-2" />
                                  대기로 되돌리기
                                </DropdownMenuItem>
                              </>
                            )}

                            {att && isAbsent && (
                              <>
                                <DropdownMenuItem onClick={() => onRevertAbsent(att.id, student.name)}>
                                  <UserCheck className="w-3.5 h-3.5 mr-2" />
                                  출석으로 변경
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onReasonChange(att.id, student.name, att.absence_reason)}>
                                  <Pencil className="w-3.5 h-3.5 mr-2" />
                                  결석사유 변경
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onNoteEdit(att.id, student.name, att.note ?? "")}>
                                  <StickyNote className="w-3.5 h-3.5 mr-2" />
                                  메모
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-slate-500"
                                  onClick={() => onRevertPending(att.id, student.name)}
                                >
                                  <Undo2 className="w-3.5 h-3.5 mr-2" />
                                  대기로 되돌리기
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {cls.students.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-slate-400 text-sm">
                    등록된 학생이 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Bulk Action Bar */}
          {cls.students.length > 0 && (
            <div className="border-t bg-slate-50/80 px-4 py-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {hasSelection ? (
                    <span className="text-xs font-medium text-slate-700">
                      <CheckSquare className="w-3.5 h-3.5 inline mr-1 text-blue-600" />
                      {selectedIds.size}명 선택
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">
                      <Users className="w-3.5 h-3.5 inline mr-1" />
                      빠른 선택
                    </span>
                  )}
                  <div className="flex items-center gap-1 ml-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedIds(new Set(pendingStudentIds))}
                      disabled={pendingStudentIds.length === 0}
                      className="h-6 px-1.5 text-[11px] text-slate-600"
                    >
                      미처리({pendingStudentIds.length})
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedIds(new Set(checkedInNotOutIds))}
                      disabled={checkedInNotOutIds.length === 0}
                      className="h-6 px-1.5 text-[11px] text-slate-600"
                    >
                      등원완료({checkedInNotOutIds.length})
                    </Button>
                    {hasSelection && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedIds(new Set())}
                        className="h-6 px-1.5 text-[11px] text-slate-500"
                      >
                        <X className="w-3 h-3 mr-0.5" />
                        해제
                      </Button>
                    )}
                  </div>
                </div>
                {hasSelection && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      onClick={handleBulkCheckIn}
                      disabled={selectedPendingCount === 0}
                      className="h-6 px-2.5 bg-green-600 hover:bg-green-700 text-white text-[11px] font-medium"
                    >
                      <LogIn className="w-3 h-3 mr-1" />
                      일괄 등원({selectedPendingCount})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBulkCheckOut}
                      disabled={selectedCheckedInCount === 0}
                      className="h-6 px-2.5 border-slate-300 text-slate-700 text-[11px] font-medium"
                    >
                      <LogOut className="w-3 h-3 mr-1" />
                      일괄 하원({selectedCheckedInCount})
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
})
