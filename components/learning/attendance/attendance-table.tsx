"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  LogIn,
  LogOut,
  UserX,
  Clock,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  UserCheck,
  Users,
  UserPlus,
  StickyNote,
  Undo2,
  Trash2,
  ExternalLink,
} from "lucide-react"
import clsx from "clsx"
import { toast } from "sonner"
import type { Attendance, AttendanceStatus, AbsenceReason } from "@/types/attendance"
import {
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_COLORS,
  ABSENCE_REASONS,
  ABSENCE_REASON_LABELS,
} from "@/types/attendance"
import {
  checkIn,
  checkOut,
  markAbsent,
  updateAttendance,
  updateAttendanceWithAutoStatus,
  revertAbsent,
} from "@/services/attendance-service"
import {
  makeupCheckIn,
  makeupCheckOut,
  createMakeupFromAbsence,
  findLinkedMakeup,
  deleteMakeupClass,
  deleteAttendance,
} from "@/services/makeup-service"
import type { MakeupClassWithStudent } from "@/services/makeup-service"
import { MakeupCheckInDialog } from "./makeup-checkin-dialog"

interface StudentInfo {
  id: string
  name: string
}

interface Props {
  date: string
  classId: string
  className: string
  scheduleStart: string
  scheduleEnd: string
  students: StudentInfo[]
  attendances: Attendance[]
  makeupAttendances: Attendance[]
  scheduledMakeups: MakeupClassWithStudent[]
  onRefresh: () => void
  isSidebarOpen: boolean
  onToggleSidebar: () => void
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

function extractHHMM(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleTimeString("en-US", {
    timeZone: "Asia/Seoul",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  })
}

function buildISOFromTimeAndDate(time: string, dateStr: string): string {
  return `${dateStr}T${time}:00+09:00`
}

function StatusBadge({ status, absenceReason }: { status: AttendanceStatus; absenceReason?: AbsenceReason | null }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className={clsx(
          "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap",
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

export function AttendanceTable({
  date,
  classId,
  className,
  scheduleStart,
  scheduleEnd,
  students,
  attendances,
  makeupAttendances,
  scheduledMakeups,
  onRefresh,
  isSidebarOpen,
  onToggleSidebar,
}: Props) {
  const router = useRouter()
  const [loadingStudentId, setLoadingStudentId] = useState<string | null>(null)

  // 결석 다이얼로그
  const [absentConfirm, setAbsentConfirm] = useState<{
    studentId: string
    studentName: string
  } | null>(null)
  const [absentReason, setAbsentReason] = useState<AbsenceReason>("sick")
  const [absentNote, setAbsentNote] = useState("")

  // 결석 복귀 다이얼로그
  const [revertConfirm, setRevertConfirm] = useState<{
    attendanceId: string
    studentName: string
  } | null>(null)
  const [revertTime, setRevertTime] = useState("")

  // 시간 수정 다이얼로그
  const [timeEditDialog, setTimeEditDialog] = useState<{
    attendanceId: string
    studentName: string
    field: "check_in" | "check_out"
    currentValue: string
  } | null>(null)
  const [editTimeValue, setEditTimeValue] = useState("")

  // 메모 다이얼로그
  const [noteDialog, setNoteDialog] = useState<{
    attendanceId: string
    studentName: string
    currentNote: string
  } | null>(null)
  const [editNote, setEditNote] = useState("")

  // 결석 사유 변경 다이얼로그
  const [reasonChange, setReasonChange] = useState<{
    attendanceId: string
    studentName: string
  } | null>(null)
  const [newReason, setNewReason] = useState<AbsenceReason>("sick")

  // 대기로 되돌리기 다이얼로그
  const [pendingRevert, setPendingRevert] = useState<{
    attendanceId: string
    studentName: string
  } | null>(null)

  // 연결된 보강 삭제 확인 다이얼로그
  const [linkedMakeupConfirm, setLinkedMakeupConfirm] = useState<{
    makeupId: string
    attendanceId: string
    studentName: string
    action: "revert_pending" | "revert_absent" // 어떤 동작에서 왔는지
  } | null>(null)

  // 보강 등원 다이얼로그
  const [makeupDialogOpen, setMakeupDialogOpen] = useState(false)

  const getAttendance = (studentId: string): Attendance | undefined =>
    attendances.find(
      (a) => a.student_id === studentId && !a.is_makeup
    )

  const handleCheckIn = useCallback(
    async (studentId: string) => {
      setLoadingStudentId(studentId)
      try {
        await checkIn({
          student_id: studentId,
          class_id: classId,
          attendance_date: date,
        })
        toast.success("등원 처리되었습니다")
        onRefresh()
      } catch (error: unknown) {
        const err = error as Error
        toast.error(err.message || "등원 처리 실패")
      } finally {
        setLoadingStudentId(null)
      }
    },
    [classId, date, onRefresh]
  )

  const handleCheckOut = useCallback(
    async (attendanceId: string) => {
      setLoadingStudentId(attendanceId)
      try {
        const att = attendances.find((a) => a.id === attendanceId)
          ?? makeupAttendances.find((a) => a.id === attendanceId)
        if (att?.is_makeup && att?.makeup_class_id) {
          await makeupCheckOut({ attendanceId })
          toast.success("보강 하원 처리되었습니다")
        } else {
          await checkOut({ attendance_id: attendanceId })
          toast.success("하원 처리되었습니다")
        }
        onRefresh()
      } catch (error: unknown) {
        const err = error as Error
        toast.error(err.message || "하원 처리 실패")
      } finally {
        setLoadingStudentId(null)
      }
    },
    [attendances, makeupAttendances, onRefresh]
  )

  const handleMarkAbsent = useCallback(async () => {
    if (!absentConfirm) return
    setLoadingStudentId(absentConfirm.studentId)
    try {
      await markAbsent(
        absentConfirm.studentId,
        classId,
        date,
        absentNote.trim() || undefined,
        absentReason
      )

      // 보강 예정 자동 생성
      await createMakeupFromAbsence({
        studentId: absentConfirm.studentId,
        classId,
        absenceDate: date,
        absenceReason: absentReason,
        studentName: absentConfirm.studentName,
        className,
      })

      toast.success("결석 처리 + 보강 예정이 생성되었습니다")
      onRefresh()
    } catch (error: unknown) {
      const err = error as Error
      toast.error(err.message || "결석 처리 실패")
    } finally {
      setLoadingStudentId(null)
      setAbsentConfirm(null)
      setAbsentReason("sick")
      setAbsentNote("")
    }
  }, [absentConfirm, absentReason, absentNote, classId, className, date, onRefresh])

  const handleRevertAbsent = useCallback(async () => {
    if (!revertConfirm || !revertTime) return
    setLoadingStudentId(revertConfirm.attendanceId)
    try {
      // 연결된 보강이 있는지 체크
      const att = attendances.find((a) => a.id === revertConfirm.attendanceId)
      if (att) {
        const linked = await findLinkedMakeup(att.student_id, att.attendance_date)
        if (linked) {
          setLinkedMakeupConfirm({
            makeupId: linked.id,
            attendanceId: revertConfirm.attendanceId,
            studentName: revertConfirm.studentName,
            action: "revert_absent",
          })
          setRevertConfirm(null)
          setLoadingStudentId(null)
          return
        }
      }

      const isoTime = buildISOFromTimeAndDate(revertTime, date)
      await revertAbsent(revertConfirm.attendanceId, isoTime)
      toast.success("출석으로 변경되었습니다")
      onRefresh()
    } catch (error: unknown) {
      const err = error as Error
      toast.error(err.message || "출석 변경 실패")
    } finally {
      setLoadingStudentId(null)
      setRevertConfirm(null)
      setRevertTime("")
    }
  }, [revertConfirm, revertTime, date, attendances, onRefresh])

  const handleTimeEdit = useCallback(async () => {
    if (!timeEditDialog || !editTimeValue) return
    try {
      const isoTime = buildISOFromTimeAndDate(editTimeValue, date)
      const updates = timeEditDialog.field === "check_in"
        ? { check_in_at: isoTime }
        : { check_out_at: isoTime }
      await updateAttendanceWithAutoStatus(timeEditDialog.attendanceId, updates)
      toast.success("시간이 수정되었습니다")
      onRefresh()
    } catch (error: unknown) {
      const err = error as Error
      toast.error(err.message || "시간 수정 실패")
    } finally {
      setTimeEditDialog(null)
      setEditTimeValue("")
    }
  }, [timeEditDialog, editTimeValue, date, onRefresh])

  const handleSaveNote = useCallback(async () => {
    if (!noteDialog) return
    try {
      await updateAttendance(noteDialog.attendanceId, { note: editNote })
      toast.success("메모가 저장되었습니다")
      onRefresh()
    } catch {
      toast.error("메모 저장 실패")
    } finally {
      setNoteDialog(null)
      setEditNote("")
    }
  }, [noteDialog, editNote, onRefresh])

  const handleReasonChange = useCallback(async () => {
    if (!reasonChange) return
    try {
      const { createClient: cc } = await import("@/lib/supabase/client")
      const supabase = cc()
      const { error } = await supabase
        .from("attendances")
        .update({ absence_reason: newReason })
        .eq("id", reasonChange.attendanceId)
      if (error) throw error
      toast.success("결석 사유가 변경되었습니다")
      onRefresh()
    } catch {
      toast.error("결석 사유 변경 실패")
    } finally {
      setReasonChange(null)
      setNewReason("sick")
    }
  }, [reasonChange, newReason, onRefresh])

  const handleRevertToPending = useCallback(async () => {
    if (!pendingRevert) return
    try {
      // 결석 상태면 연결된 보강이 있는지 체크
      const att = attendances.find((a) => a.id === pendingRevert.attendanceId)
      if (att?.status === "absent") {
        const linked = await findLinkedMakeup(att.student_id, att.attendance_date)
        if (linked) {
          setLinkedMakeupConfirm({
            makeupId: linked.id,
            attendanceId: pendingRevert.attendanceId,
            studentName: pendingRevert.studentName,
            action: "revert_pending",
          })
          setPendingRevert(null)
          return
        }
      }

      await deleteAttendance(pendingRevert.attendanceId)
      toast.success("대기 상태로 되돌렸습니다")
      onRefresh()
    } catch {
      toast.error("되돌리기 실패")
    } finally {
      setPendingRevert(null)
    }
  }, [pendingRevert, attendances, onRefresh])

  // 연결된 보강 삭제 확인 → 예 (보강도 삭제)
  const handleLinkedMakeupDeleteBoth = useCallback(async () => {
    if (!linkedMakeupConfirm) return
    try {
      if (linkedMakeupConfirm.action === "revert_pending") {
        await deleteAttendance(linkedMakeupConfirm.attendanceId)
      } else if (linkedMakeupConfirm.action === "revert_absent" && revertTime) {
        const isoTime = buildISOFromTimeAndDate(revertTime, date)
        await revertAbsent(linkedMakeupConfirm.attendanceId, isoTime)
      }
      await deleteMakeupClass(linkedMakeupConfirm.makeupId)
      toast.success("결석 + 보강 예정이 함께 삭제되었습니다")
      onRefresh()
    } catch {
      toast.error("처리 실패")
    } finally {
      setLinkedMakeupConfirm(null)
      setRevertTime("")
    }
  }, [linkedMakeupConfirm, revertTime, date, onRefresh])

  // 보강 출석 삭제
  const handleDeleteMakeupAttendance = useCallback(async (attendanceId: string) => {
    try {
      const att = makeupAttendances.find((a) => a.id === attendanceId)
      if (att?.makeup_class_id) {
        await deleteMakeupClass(att.makeup_class_id)
      } else {
        await deleteAttendance(attendanceId)
      }
      toast.success("보강 출석이 삭제되었습니다")
      onRefresh()
    } catch {
      toast.error("삭제 실패")
    }
  }, [makeupAttendances, onRefresh])

  // 보강 출석 삭제 확인 다이얼로그
  const [deleteMakeupConfirm, setDeleteMakeupConfirm] = useState<{
    attendanceId: string
    studentName: string
  } | null>(null)

  // 연결된 보강 삭제 확인 → 아니요 (결석만 처리)
  const handleLinkedMakeupKeep = useCallback(async () => {
    if (!linkedMakeupConfirm) return
    try {
      if (linkedMakeupConfirm.action === "revert_pending") {
        await deleteAttendance(linkedMakeupConfirm.attendanceId)
        toast.success("결석만 삭제되었습니다 (보강 예정은 유지)")
      } else if (linkedMakeupConfirm.action === "revert_absent" && revertTime) {
        const isoTime = buildISOFromTimeAndDate(revertTime, date)
        await revertAbsent(linkedMakeupConfirm.attendanceId, isoTime)
        toast.success("출석으로 변경되었습니다 (보강 예정은 유지)")
      }
      onRefresh()
    } catch {
      toast.error("처리 실패")
    } finally {
      setLinkedMakeupConfirm(null)
      setRevertTime("")
    }
  }, [linkedMakeupConfirm, revertTime, date, onRefresh])

  const openTimeEditDialog = (
    attendanceId: string,
    studentName: string,
    field: "check_in" | "check_out",
    currentIso: string | null
  ) => {
    setTimeEditDialog({ attendanceId, studentName, field, currentValue: currentIso ?? "" })
    setEditTimeValue(currentIso ? extractHHMM(currentIso) : "")
  }

  // Summary stats
  const totalStudents = students.length
  const checkedIn = attendances.filter(
    (a) => !a.is_makeup && a.check_in_at
  ).length
  const absentCount = attendances.filter(
    (a) => !a.is_makeup && a.status === "absent"
  ).length
  const lateCount = attendances.filter(
    (a) => !a.is_makeup && a.status === "late"
  ).length
  // 보강 통합 목록: 예정(미등원) + 등원완료
  // 이미 등원된 makeup_class_id Set
  const checkedInMakeupClassIds = new Set(
    makeupAttendances
      .map((a) => a.makeup_class_id)
      .filter(Boolean) as string[]
  )
  // 아직 등원 안 된 예정 보강
  const pendingScheduledMakeups = scheduledMakeups.filter(
    (m) => !checkedInMakeupClassIds.has(m.id)
  )
  const hasMakeupSection = pendingScheduledMakeups.length > 0 || makeupAttendances.length > 0

  // 보강 예정 등원 핸들러
  const handleMakeupScheduledCheckIn = useCallback(
    async (makeup: MakeupClassWithStudent) => {
      setLoadingStudentId(makeup.id)
      try {
        await makeupCheckIn({ makeupClassId: makeup.id, date })
        toast.success(`${makeup.student_name_snapshot ?? "학생"} 보강 등원 완료`)
        onRefresh()
      } catch (error: unknown) {
        toast.error((error as Error).message || "보강 등원 실패")
      } finally {
        setLoadingStudentId(null)
      }
    },
    [date, onRefresh]
  )

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
              <h2 className="text-lg font-bold text-slate-800">
                {className}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock className="w-3 h-3" />
                <span>
                  {scheduleStart}~{scheduleEnd}
                </span>
                <span className="text-slate-300">|</span>
                <span>{date}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMakeupDialogOpen(true)}
              className="h-7 px-2 text-xs"
            >
              <UserPlus className="w-3 h-3 mr-1" />
              보강
            </Button>
            <Badge variant="outline" className="text-xs bg-white">
              {totalStudents}명
            </Badge>
            {checkedIn > 0 && (
              <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                출석 {checkedIn}
              </Badge>
            )}
            {lateCount > 0 && (
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">
                지각 {lateCount}
              </Badge>
            )}
            {absentCount > 0 && (
              <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
                결석 {absentCount}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed">
          <colgroup>
            <col className="w-[4%]" />
            <col className="w-[14%]" />
            <col className="w-[11%]" />
            <col className="w-[11%]" />
            <col className="w-[11%]" />
            <col className="w-[25%]" />
            <col className="w-[24%]" />
          </colgroup>
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                #
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                학생
              </th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                상태
              </th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                등원
              </th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                하원
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                비고
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                액션
              </th>
            </tr>
          </thead>
          <tbody>
            {/* 보강 섹션 (위쪽) */}
            {hasMakeupSection && (
              <>
                <tr className="bg-purple-50/60 border-b border-purple-200">
                  <td colSpan={7} className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-3.5 h-3.5 text-purple-500" />
                      <span className="text-xs font-semibold text-purple-700">
                        보강 ({pendingScheduledMakeups.length + makeupAttendances.length}명)
                      </span>
                    </div>
                  </td>
                </tr>

                {/* 예정 보강 (아직 등원 안 함) */}
                {pendingScheduledMakeups.map((m) => {
                  const studentName = m.student_name_snapshot
                    ?? (m.students as { name: string } | null)?.name
                    ?? "알 수 없음"
                  const originalClassName = m.class_name_snapshot
                    ?? (m.classes as { name: string } | null)?.name
                  const isItemLoading = loadingStudentId === m.id

                  return (
                    <tr
                      key={`scheduled-${m.id}`}
                      className="border-b border-slate-100 bg-purple-50/20"
                    >
                      <td className="px-3 py-3 text-sm text-purple-400 tabular-nums">+</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-sm font-medium text-slate-800 truncate">
                            {studentName}
                          </span>
                          <Badge className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0 flex-shrink-0">
                            보강예정
                          </Badge>
                          {originalClassName && (
                            <span className="text-[10px] text-slate-400 flex-shrink-0">
                              ({originalClassName})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">
                          대기
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-sm tabular-nums text-slate-300">—</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-sm tabular-nums text-slate-300">—</span>
                      </td>
                      <td className="px-3 py-3">
                        {m.absence_date && (
                          <span className="text-xs text-slate-400">
                            결석일: {m.absence_date}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => handleMakeupScheduledCheckIn(m)}
                            disabled={isItemLoading}
                            className="h-7 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium"
                          >
                            <LogIn className="w-3 h-3 mr-1" />
                            등원
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                onClick={() => router.push(`/learning/makeup-classes?tab=scheduled`)}
                              >
                                <ExternalLink className="w-3.5 h-3.5 mr-2" />
                                보강수정
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {/* 등원 완료된 보강 */}
                {makeupAttendances.map((ma) => (
                  <tr
                    key={ma.id}
                    className="border-b border-slate-100 bg-purple-50/30"
                  >
                    <td className="px-3 py-3 text-sm text-purple-400 tabular-nums">+</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-sm font-medium text-slate-800 truncate">
                          {ma.student_name_snapshot ?? "알 수 없음"}
                        </span>
                        <Badge className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0 flex-shrink-0">
                          보강
                        </Badge>
                        {ma.class_name_snapshot && (
                          <span className="text-[10px] text-slate-400 flex-shrink-0">
                            ({ma.class_name_snapshot})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                        {ATTENDANCE_STATUS_LABELS[ma.status as AttendanceStatus] ?? ma.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-sm tabular-nums text-slate-700 font-medium">
                        {formatTime(ma.check_in_at)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={clsx(
                        "text-sm tabular-nums",
                        ma.check_out_at ? "text-slate-700 font-medium" : "text-slate-300"
                      )}>
                        {formatTime(ma.check_out_at)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {ma.note ? (
                        <span className="text-xs text-slate-500 line-clamp-1">{ma.note}</span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {ma.check_in_at && !ma.check_out_at && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCheckOut(ma.id)}
                            className="h-7 px-3 border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium"
                          >
                            <LogOut className="w-3 h-3 mr-1" />
                            하원
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            {ma.check_in_at && (
                              <DropdownMenuItem
                                onClick={() =>
                                  openTimeEditDialog(
                                    ma.id,
                                    ma.student_name_snapshot ?? "알 수 없음",
                                    "check_in",
                                    ma.check_in_at
                                  )
                                }
                              >
                                <Clock className="w-3.5 h-3.5 mr-2" />
                                등원시간 수정
                              </DropdownMenuItem>
                            )}
                            {ma.check_out_at && (
                              <DropdownMenuItem
                                onClick={() =>
                                  openTimeEditDialog(
                                    ma.id,
                                    ma.student_name_snapshot ?? "알 수 없음",
                                    "check_out",
                                    ma.check_out_at
                                  )
                                }
                              >
                                <Clock className="w-3.5 h-3.5 mr-2" />
                                하원시간 수정
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                setNoteDialog({
                                  attendanceId: ma.id,
                                  studentName: ma.student_name_snapshot ?? "알 수 없음",
                                  currentNote: ma.note ?? "",
                                })
                                setEditNote(ma.note ?? "")
                              }}
                            >
                              <StickyNote className="w-3.5 h-3.5 mr-2" />
                              메모
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                const tab = ma.check_out_at ? "completed" : "scheduled"
                                router.push(`/learning/makeup-classes?tab=${tab}`)
                              }}
                            >
                              <ExternalLink className="w-3.5 h-3.5 mr-2" />
                              보강수정
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() =>
                                setDeleteMakeupConfirm({
                                  attendanceId: ma.id,
                                  studentName: ma.student_name_snapshot ?? "알 수 없음",
                                })
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* 보강-정규 구분선 */}
                <tr className="bg-slate-100/50">
                  <td colSpan={7} className="px-3 py-1.5">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                      정규 수업
                    </span>
                  </td>
                </tr>
              </>
            )}

            {students.map((student, idx) => {
              const attendance = getAttendance(student.id)
              const isLoading = loadingStudentId === student.id || loadingStudentId === attendance?.id
              const hasCheckedIn = !!attendance?.check_in_at
              const hasCheckedOut = !!attendance?.check_out_at
              const isAbsent = attendance?.status === "absent"

              return (
                <tr
                  key={student.id}
                  className={clsx(
                    "border-b border-slate-100 transition-colors",
                    isAbsent
                      ? "bg-red-50/40"
                      : hasCheckedIn
                        ? "bg-green-50/30"
                        : "hover:bg-slate-50/50"
                  )}
                >
                  <td className="px-3 py-3 text-sm text-slate-400 tabular-nums">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-sm font-medium text-slate-800 truncate block">
                      {student.name}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {attendance ? (
                      <StatusBadge
                        status={attendance.status}
                        absenceReason={attendance.absence_reason}
                      />
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={clsx(
                        "text-sm tabular-nums",
                        hasCheckedIn ? "text-slate-700 font-medium" : "text-slate-300"
                      )}
                    >
                      {formatTime(attendance?.check_in_at ?? null)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={clsx(
                        "text-sm tabular-nums",
                        hasCheckedOut ? "text-slate-700 font-medium" : "text-slate-300"
                      )}
                    >
                      {formatTime(attendance?.check_out_at ?? null)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {attendance?.note ? (
                      <span className="text-xs text-slate-500 line-clamp-1">
                        {attendance.note}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>

                  {/* 액션 - 통일된 패턴: 주요 버튼 + ... 드롭다운 */}
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* 미처리: 등원 버튼 */}
                      {!hasCheckedIn && !isAbsent && (
                        <Button
                          size="sm"
                          onClick={() => handleCheckIn(student.id)}
                          disabled={isLoading}
                          className="h-7 px-3 bg-green-600 hover:bg-green-700 text-white text-xs font-medium"
                        >
                          <LogIn className="w-3 h-3 mr-1" />
                          등원
                        </Button>
                      )}

                      {/* 등원 완료 + 하원 미완: 하원 버튼 */}
                      {hasCheckedIn && !hasCheckedOut && !isAbsent && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => attendance && handleCheckOut(attendance.id)}
                          disabled={isLoading}
                          className="h-7 px-3 border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium"
                        >
                          <LogOut className="w-3 h-3 mr-1" />
                          하원
                        </Button>
                      )}

                      {/* 모든 행에 통일된 ... 드롭다운 */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {/* 미처리 상태 */}
                          {!attendance && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleCheckIn(student.id)}
                              >
                                <LogIn className="w-3.5 h-3.5 mr-2" />
                                등원 처리
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() =>
                                  setAbsentConfirm({
                                    studentId: student.id,
                                    studentName: student.name,
                                  })
                                }
                              >
                                <UserX className="w-3.5 h-3.5 mr-2" />
                                결석 처리
                              </DropdownMenuItem>
                            </>
                          )}

                          {/* 출석 중 (등원 완료) */}
                          {attendance && !isAbsent && (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  openTimeEditDialog(
                                    attendance.id,
                                    student.name,
                                    "check_in",
                                    attendance.check_in_at
                                  )
                                }
                              >
                                <Clock className="w-3.5 h-3.5 mr-2" />
                                등원시간 수정
                              </DropdownMenuItem>
                              {hasCheckedOut && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    openTimeEditDialog(
                                      attendance.id,
                                      student.name,
                                      "check_out",
                                      attendance.check_out_at
                                    )
                                  }
                                >
                                  <Clock className="w-3.5 h-3.5 mr-2" />
                                  하원시간 수정
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => {
                                  setNoteDialog({
                                    attendanceId: attendance.id,
                                    studentName: student.name,
                                    currentNote: attendance.note ?? "",
                                  })
                                  setEditNote(attendance.note ?? "")
                                }}
                              >
                                <StickyNote className="w-3.5 h-3.5 mr-2" />
                                메모
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() =>
                                  setAbsentConfirm({
                                    studentId: student.id,
                                    studentName: student.name,
                                  })
                                }
                              >
                                <UserX className="w-3.5 h-3.5 mr-2" />
                                결석 처리
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-slate-500"
                                onClick={() =>
                                  setPendingRevert({
                                    attendanceId: attendance.id,
                                    studentName: student.name,
                                  })
                                }
                              >
                                <Undo2 className="w-3.5 h-3.5 mr-2" />
                                대기로 되돌리기
                              </DropdownMenuItem>
                            </>
                          )}

                          {/* 결석 상태 */}
                          {attendance && isAbsent && (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  setRevertConfirm({
                                    attendanceId: attendance.id,
                                    studentName: student.name,
                                  })
                                }
                              >
                                <UserCheck className="w-3.5 h-3.5 mr-2" />
                                출석으로 변경
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setReasonChange({
                                    attendanceId: attendance.id,
                                    studentName: student.name,
                                  })
                                  setNewReason(attendance.absence_reason || "sick")
                                }}
                              >
                                <Pencil className="w-3.5 h-3.5 mr-2" />
                                결석사유 변경
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setNoteDialog({
                                    attendanceId: attendance.id,
                                    studentName: student.name,
                                    currentNote: attendance.note ?? "",
                                  })
                                  setEditNote(attendance.note ?? "")
                                }}
                              >
                                <StickyNote className="w-3.5 h-3.5 mr-2" />
                                메모
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-slate-500"
                                onClick={() =>
                                  setPendingRevert({
                                    attendanceId: attendance.id,
                                    studentName: student.name,
                                  })
                                }
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

            {students.length === 0 && !hasMakeupSection && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <div className="text-sm">이 반에 등록된 학생이 없습니다</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Summary */}
      <div className="p-3 border-t bg-slate-50/50">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            총 <span className="font-semibold text-slate-700">{totalStudents}</span>명
            {makeupAttendances.length > 0 && (
              <span className="ml-1 text-purple-600">
                (+보강 {makeupAttendances.length})
              </span>
            )}
          </span>
          <div className="flex items-center gap-3">
            <span>
              출석{" "}
              <span className="font-semibold text-green-700">
                {checkedIn - lateCount}
              </span>
            </span>
            <span>
              지각{" "}
              <span className="font-semibold text-yellow-700">{lateCount}</span>
            </span>
            <span>
              결석{" "}
              <span className="font-semibold text-red-700">{absentCount}</span>
            </span>
            <span>
              미처리{" "}
              <span className="font-semibold text-slate-700">
                {totalStudents - checkedIn - absentCount}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* === 다이얼로그들 === */}

      {/* 결석 처리 다이얼로그 */}
      <Dialog
        open={!!absentConfirm}
        onOpenChange={() => {
          setAbsentConfirm(null)
          setAbsentReason("sick")
          setAbsentNote("")
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>결석 처리</DialogTitle>
            <DialogDescription>
              <strong className="text-slate-700">{absentConfirm?.studentName}</strong> 학생을 결석 처리합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">결석 사유</label>
              <Select
                value={absentReason}
                onValueChange={(v) => setAbsentReason(v as AbsenceReason)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ABSENCE_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ABSENCE_REASON_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">메모 (선택)</label>
              <input
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={absentNote}
                onChange={(e) => setAbsentNote(e.target.value)}
                placeholder="추가 메모..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAbsentConfirm(null); setAbsentReason("sick"); setAbsentNote("") }}>
              취소
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleMarkAbsent}>
              결석 처리
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 결석 복귀 다이얼로그 */}
      <Dialog
        open={!!revertConfirm}
        onOpenChange={() => { setRevertConfirm(null); setRevertTime("") }}
      >
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>출석으로 변경</DialogTitle>
            <DialogDescription>
              <strong className="text-slate-700">{revertConfirm?.studentName}</strong> 학생의 등원 시간을 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium text-slate-700 block mb-2">등원 시간</label>
            <input
              type="time"
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={revertTime}
              onChange={(e) => setRevertTime(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRevertConfirm(null); setRevertTime("") }}>
              취소
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleRevertAbsent} disabled={!revertTime}>
              출석 처리
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 시간 수정 다이얼로그 */}
      <Dialog
        open={!!timeEditDialog}
        onOpenChange={() => { setTimeEditDialog(null); setEditTimeValue("") }}
      >
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>
              {timeEditDialog?.field === "check_in" ? "등원" : "하원"}시간 수정
            </DialogTitle>
            <DialogDescription>
              <strong className="text-slate-700">{timeEditDialog?.studentName}</strong> 학생의 시간을 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium text-slate-700 block mb-2">
              {timeEditDialog?.field === "check_in" ? "등원" : "하원"} 시간
            </label>
            <input
              type="time"
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={editTimeValue}
              onChange={(e) => setEditTimeValue(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTimeEditDialog(null); setEditTimeValue("") }}>
              취소
            </Button>
            <Button onClick={handleTimeEdit} disabled={!editTimeValue}>
              수정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 메모 다이얼로그 */}
      <Dialog
        open={!!noteDialog}
        onOpenChange={() => { setNoteDialog(null); setEditNote("") }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>메모</DialogTitle>
            <DialogDescription>
              <strong className="text-slate-700">{noteDialog?.studentName}</strong> 학생 메모
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <textarea
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              rows={3}
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="메모 입력..."
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNoteDialog(null); setEditNote("") }}>
              취소
            </Button>
            <Button onClick={handleSaveNote}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 결석 사유 변경 다이얼로그 */}
      <Dialog
        open={!!reasonChange}
        onOpenChange={() => { setReasonChange(null); setNewReason("sick") }}
      >
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>결석 사유 변경</DialogTitle>
            <DialogDescription>
              <strong className="text-slate-700">{reasonChange?.studentName}</strong> 학생의 결석 사유를 변경합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select
              value={newReason}
              onValueChange={(v) => setNewReason(v as AbsenceReason)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ABSENCE_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ABSENCE_REASON_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReasonChange(null); setNewReason("sick") }}>
              취소
            </Button>
            <Button onClick={handleReasonChange}>
              변경
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 보강 등원 다이얼로그 */}
      <MakeupCheckInDialog
        open={makeupDialogOpen}
        onOpenChange={setMakeupDialogOpen}
        date={date}
        onSuccess={onRefresh}
      />

      {/* 대기로 되돌리기 확인 다이얼로그 */}
      <Dialog
        open={!!pendingRevert}
        onOpenChange={() => setPendingRevert(null)}
      >
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>대기로 되돌리기</DialogTitle>
            <DialogDescription>
              <strong className="text-slate-700">{pendingRevert?.studentName}</strong> 학생의 출석 기록을 삭제하고 미처리 상태로 되돌립니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingRevert(null)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleRevertToPending}>
              되돌리기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 연결된 보강 삭제 확인 다이얼로그 */}
      <Dialog
        open={!!linkedMakeupConfirm}
        onOpenChange={() => { setLinkedMakeupConfirm(null); setRevertTime("") }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>연결된 보강 예정이 있습니다</DialogTitle>
            <DialogDescription>
              <strong className="text-slate-700">{linkedMakeupConfirm?.studentName}</strong> 학생에게 연결된 보강 예정 레코드가 있습니다. 보강 예정도 함께 삭제하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => { setLinkedMakeupConfirm(null); setRevertTime("") }}>
              취소
            </Button>
            <Button variant="secondary" onClick={handleLinkedMakeupKeep}>
              결석만 처리
            </Button>
            <Button variant="destructive" onClick={handleLinkedMakeupDeleteBoth}>
              보강도 함께 삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 보강 출석 삭제 확인 다이얼로그 */}
      <Dialog
        open={!!deleteMakeupConfirm}
        onOpenChange={() => setDeleteMakeupConfirm(null)}
      >
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>보강 출석 삭제</DialogTitle>
            <DialogDescription>
              <strong className="text-slate-700">{deleteMakeupConfirm?.studentName}</strong> 학생의 보강 출석 기록을 삭제합니다. 연결된 보강 수업 기록도 함께 삭제됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteMakeupConfirm(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (deleteMakeupConfirm) {
                  await handleDeleteMakeupAttendance(deleteMakeupConfirm.attendanceId)
                  setDeleteMakeupConfirm(null)
                }
              }}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

