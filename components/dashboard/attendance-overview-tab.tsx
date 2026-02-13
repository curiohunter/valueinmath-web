"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ClipboardCheck } from "lucide-react"
import { useAllAttendance } from "@/hooks/use-all-attendance"
import { AttendanceSummaryBar } from "./attendance-overview/attendance-summary-bar"
import { ClassAttendanceCard } from "./attendance-overview/class-attendance-card"
import { MakeupOverviewCard } from "./attendance-overview/makeup-overview-card"
import {
  checkIn,
  checkOut,
  markAbsent,
  updateAttendance,
  updateAttendanceWithAutoStatus,
  revertAbsent,
  bulkCheckIn,
  bulkCheckOut,
} from "@/services/attendance-service"
import {
  makeupCheckIn,
  makeupCheckOut,
  createMakeupFromAbsence,
  findLinkedMakeup,
  deleteMakeupClass,
  deleteAttendance,
} from "@/services/makeup-service"
import type { AbsenceReason } from "@/types/attendance"
import { ABSENCE_REASONS, ABSENCE_REASON_LABELS } from "@/types/attendance"

function getCurrentKSTTime(): string {
  return new Date().toLocaleTimeString("en-US", {
    timeZone: "Asia/Seoul",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  })
}

function buildISOFromTimeAndDate(time: string, dateStr: string): string {
  return `${dateStr}T${time}:00+09:00`
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

export function AttendanceOverviewTab() {
  const {
    date,
    isLoading,
    todayClasses,
    attendancesByClass,
    makeupAttendances,
    scheduledMakeups,
    summaryStats,
    teacherGroups,
    currentClassIds,
    refresh,
  } = useAllAttendance()

  // Expanded state - initialize with current classes
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (!isLoading && !initialized && currentClassIds.size > 0) {
      setExpandedIds(new Set(currentClassIds))
      setInitialized(true)
    }
  }, [isLoading, initialized, currentClassIds])

  // Search highlight
  const [highlightedStudentId, setHighlightedStudentId] = useState<string | null>(null)
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const setCardRef = useCallback((classId: string, el: HTMLDivElement | null) => {
    if (el) {
      cardRefs.current.set(classId, el)
    } else {
      cardRefs.current.delete(classId)
    }
  }, [])

  // Time dialog (shared for check-in/check-out)
  const [checkTimeDialog, setCheckTimeDialog] = useState<{
    type: "checkin" | "checkout"
    studentId?: string
    attendanceId?: string
    studentName: string
    classId?: string
    isMakeup?: boolean
    makeupClassId?: string
  } | null>(null)
  const [checkTimeValue, setCheckTimeValue] = useState("")

  // Absent dialog
  const [absentConfirm, setAbsentConfirm] = useState<{
    studentId: string
    studentName: string
    classId: string
    className: string
  } | null>(null)
  const [absentReason, setAbsentReason] = useState<AbsenceReason>("sick")
  const [absentNote, setAbsentNote] = useState("")

  // Revert absent dialog
  const [revertConfirm, setRevertConfirm] = useState<{
    attendanceId: string
    studentName: string
  } | null>(null)
  const [revertTime, setRevertTime] = useState("")

  // Time edit dialog
  const [timeEditDialog, setTimeEditDialog] = useState<{
    attendanceId: string
    studentName: string
    field: "check_in" | "check_out"
  } | null>(null)
  const [editTimeValue, setEditTimeValue] = useState("")

  // Note dialog
  const [noteDialog, setNoteDialog] = useState<{
    attendanceId: string
    studentName: string
    currentNote: string
  } | null>(null)
  const [editNote, setEditNote] = useState("")

  // Reason change dialog
  const [reasonChange, setReasonChange] = useState<{
    attendanceId: string
    studentName: string
  } | null>(null)
  const [newReason, setNewReason] = useState<AbsenceReason>("sick")

  // Revert to pending dialog
  const [pendingRevert, setPendingRevert] = useState<{
    attendanceId: string
    studentName: string
  } | null>(null)

  // Linked makeup dialog
  const [linkedMakeupConfirm, setLinkedMakeupConfirm] = useState<{
    makeupId: string
    attendanceId: string
    studentName: string
    action: "revert_pending" | "revert_absent"
  } | null>(null)

  // Bulk time dialog
  const [bulkTimeDialog, setBulkTimeDialog] = useState<{
    type: "checkin" | "checkout"
    classId?: string
    studentIds?: string[]
    attendanceIds?: string[]
  } | null>(null)
  const [bulkTimeValue, setBulkTimeValue] = useState("")
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)

  // --- Toggle ---
  const toggleExpand = useCallback((classId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(classId)) next.delete(classId)
      else next.add(classId)
      return next
    })
  }, [])

  // --- Search select ---
  const handleStudentSelect = useCallback((classId: string, studentId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.add(classId)
      return next
    })
    setHighlightedStudentId(studentId)
    // Scroll to card
    setTimeout(() => {
      const el = cardRefs.current.get(classId)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }, 100)
    // Clear highlight after 3s
    setTimeout(() => setHighlightedStudentId(null), 3000)
  }, [])

  // --- Check-in ---
  const handleOpenCheckIn = useCallback((studentId: string, studentName: string, classId: string) => {
    setCheckTimeDialog({ type: "checkin", studentId, studentName, classId })
    setCheckTimeValue(getCurrentKSTTime())
  }, [])

  // --- Check-out ---
  const handleOpenCheckOut = useCallback((attendanceId: string, studentName: string, isMakeup: boolean) => {
    setCheckTimeDialog({ type: "checkout", attendanceId, studentName, isMakeup })
    setCheckTimeValue(getCurrentKSTTime())
  }, [])

  // --- Makeup check-in ---
  const handleOpenMakeupCheckIn = useCallback((makeupClassId: string, studentName: string) => {
    setCheckTimeDialog({ type: "checkin", makeupClassId, studentName, isMakeup: true })
    setCheckTimeValue(getCurrentKSTTime())
  }, [])

  // --- Time confirm handler ---
  const handleCheckTimeConfirm = useCallback(async () => {
    if (!checkTimeDialog || !checkTimeValue) return
    const isoTime = buildISOFromTimeAndDate(checkTimeValue, date)

    try {
      if (checkTimeDialog.type === "checkin") {
        if (checkTimeDialog.makeupClassId) {
          await makeupCheckIn({ makeupClassId: checkTimeDialog.makeupClassId, date, checkInAt: isoTime })
          toast.success("보강 등원 처리되었습니다")
        } else if (checkTimeDialog.studentId && checkTimeDialog.classId) {
          await checkIn({
            student_id: checkTimeDialog.studentId,
            class_id: checkTimeDialog.classId,
            attendance_date: date,
            check_in_at: isoTime,
          })
          toast.success("등원 처리되었습니다")
        }
      } else {
        if (checkTimeDialog.attendanceId) {
          if (checkTimeDialog.isMakeup) {
            await makeupCheckOut({ attendanceId: checkTimeDialog.attendanceId, checkOutAt: isoTime })
            toast.success("보강 하원 처리되었습니다")
          } else {
            await checkOut({ attendance_id: checkTimeDialog.attendanceId, check_out_at: isoTime })
            toast.success("하원 처리되었습니다")
          }
        }
      }
      refresh()
    } catch (error: unknown) {
      const err = error as Error
      toast.error(err.message || "처리 실패")
    } finally {
      setCheckTimeDialog(null)
      setCheckTimeValue("")
    }
  }, [checkTimeDialog, checkTimeValue, date, refresh])

  // --- Mark absent ---
  const handleMarkAbsent = useCallback(async () => {
    if (!absentConfirm) return
    try {
      await markAbsent(
        absentConfirm.studentId,
        absentConfirm.classId,
        date,
        absentNote.trim() || undefined,
        absentReason
      )
      await createMakeupFromAbsence({
        studentId: absentConfirm.studentId,
        classId: absentConfirm.classId,
        absenceDate: date,
        absenceReason: absentReason,
        studentName: absentConfirm.studentName,
        className: absentConfirm.className,
      })
      toast.success("결석 처리 + 보강 예정이 생성되었습니다")
      refresh()
    } catch (error: unknown) {
      const err = error as Error
      toast.error(err.message || "결석 처리 실패")
    } finally {
      setAbsentConfirm(null)
      setAbsentReason("sick")
      setAbsentNote("")
    }
  }, [absentConfirm, absentReason, absentNote, date, refresh])

  // --- Revert absent ---
  const handleRevertAbsent = useCallback(async () => {
    if (!revertConfirm || !revertTime) return
    try {
      const isoTime = buildISOFromTimeAndDate(revertTime, date)
      await revertAbsent(revertConfirm.attendanceId, isoTime)
      toast.success("출석으로 변경되었습니다")
      refresh()
    } catch (error: unknown) {
      const err = error as Error
      toast.error(err.message || "출석 변경 실패")
    } finally {
      setRevertConfirm(null)
      setRevertTime("")
    }
  }, [revertConfirm, revertTime, date, refresh])

  // --- Time edit ---
  const handleTimeEdit = useCallback(async () => {
    if (!timeEditDialog || !editTimeValue) return
    try {
      const isoTime = buildISOFromTimeAndDate(editTimeValue, date)
      const updates = timeEditDialog.field === "check_in"
        ? { check_in_at: isoTime }
        : { check_out_at: isoTime }
      await updateAttendanceWithAutoStatus(timeEditDialog.attendanceId, updates)
      toast.success("시간이 수정되었습니다")
      refresh()
    } catch (error: unknown) {
      const err = error as Error
      toast.error(err.message || "시간 수정 실패")
    } finally {
      setTimeEditDialog(null)
      setEditTimeValue("")
    }
  }, [timeEditDialog, editTimeValue, date, refresh])

  // --- Save note ---
  const handleSaveNote = useCallback(async () => {
    if (!noteDialog) return
    try {
      await updateAttendance(noteDialog.attendanceId, { note: editNote })
      toast.success("메모가 저장되었습니다")
      refresh()
    } catch {
      toast.error("메모 저장 실패")
    } finally {
      setNoteDialog(null)
      setEditNote("")
    }
  }, [noteDialog, editNote, refresh])

  // --- Reason change ---
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
      refresh()
    } catch {
      toast.error("결석 사유 변경 실패")
    } finally {
      setReasonChange(null)
      setNewReason("sick")
    }
  }, [reasonChange, newReason, refresh])

  // --- Revert to pending ---
  const handleRevertToPending = useCallback(async () => {
    if (!pendingRevert) return
    try {
      // Check for linked makeup if absent
      const allAtts = Object.values(attendancesByClass).flat()
      const att = allAtts.find((a) => a.id === pendingRevert.attendanceId)
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
      refresh()
    } catch {
      toast.error("되돌리기 실패")
    } finally {
      setPendingRevert(null)
    }
  }, [pendingRevert, attendancesByClass, refresh])

  // --- Linked makeup: delete both ---
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
      refresh()
    } catch {
      toast.error("처리 실패")
    } finally {
      setLinkedMakeupConfirm(null)
      setRevertTime("")
    }
  }, [linkedMakeupConfirm, revertTime, date, refresh])

  // --- Linked makeup: keep makeup ---
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
      refresh()
    } catch {
      toast.error("처리 실패")
    } finally {
      setLinkedMakeupConfirm(null)
      setRevertTime("")
    }
  }, [linkedMakeupConfirm, revertTime, date, refresh])

  // --- Bulk check-in ---
  const handleBulkCheckIn = useCallback((classId: string, studentIds: string[]) => {
    setBulkTimeDialog({ type: "checkin", classId, studentIds })
    setBulkTimeValue(getCurrentKSTTime())
  }, [])

  // --- Bulk check-out ---
  const handleBulkCheckOut = useCallback((attendanceIds: string[]) => {
    setBulkTimeDialog({ type: "checkout", attendanceIds })
    setBulkTimeValue(getCurrentKSTTime())
  }, [])

  // --- Bulk time confirm ---
  const handleBulkTimeConfirm = useCallback(async () => {
    if (!bulkTimeDialog || !bulkTimeValue) return
    const isoTime = buildISOFromTimeAndDate(bulkTimeValue, date)
    setIsBulkProcessing(true)

    try {
      if (bulkTimeDialog.type === "checkin" && bulkTimeDialog.classId && bulkTimeDialog.studentIds) {
        const result = await bulkCheckIn({
          student_ids: bulkTimeDialog.studentIds,
          class_id: bulkTimeDialog.classId,
          attendance_date: date,
          check_in_at: isoTime,
        })
        if (result.failed.length > 0) {
          toast.error(`${result.failed.length}명 실패: ${result.failed.map((f) => f.studentName).join(", ")}`)
        }
        if (result.succeeded > 0) {
          toast.success(`${result.succeeded}명 일괄 등원 완료`)
        }
      } else if (bulkTimeDialog.type === "checkout" && bulkTimeDialog.attendanceIds) {
        const result = await bulkCheckOut({
          attendance_ids: bulkTimeDialog.attendanceIds,
          check_out_at: isoTime,
        })
        if (result.failed.length > 0) {
          toast.error(`${result.failed.length}명 실패: ${result.failed.map((f) => f.studentName).join(", ")}`)
        }
        if (result.succeeded > 0) {
          toast.success(`${result.succeeded}명 일괄 하원 완료`)
        }
      }
      refresh()
    } catch (error: unknown) {
      const err = error as Error
      toast.error(err.message || "일괄 처리 실패")
    } finally {
      setBulkTimeDialog(null)
      setBulkTimeValue("")
      setIsBulkProcessing(false)
    }
  }, [bulkTimeDialog, bulkTimeValue, date, refresh])

  // --- Loading ---
  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500 mx-auto mb-4" />
        <div className="text-slate-400 text-sm">출석 데이터를 불러오는 중...</div>
      </div>
    )
  }

  if (todayClasses.length === 0) {
    return (
      <div className="p-12 text-center">
        <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-slate-300" />
        <h3 className="text-lg font-semibold text-slate-600 mb-2">오늘 수업이 없습니다</h3>
        <p className="text-sm text-slate-400">오늘은 예정된 수업이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <AttendanceSummaryBar
        date={date}
        stats={summaryStats}
        todayClasses={todayClasses}
        attendancesByClass={attendancesByClass}
        onStudentSelect={handleStudentSelect}
      />

      {/* Makeup card */}
      <MakeupOverviewCard
        makeupAttendances={makeupAttendances}
        scheduledMakeups={scheduledMakeups}
        onMakeupCheckIn={handleOpenMakeupCheckIn}
        onMakeupCheckOut={(attendanceId, studentName) =>
          handleOpenCheckOut(attendanceId, studentName, true)
        }
      />

      {/* Class cards grouped by teacher */}
      {teacherGroups.map((group) => (
        <div key={group.teacherName} className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-600 px-1">
            {group.teacherName}
          </h3>
          {group.classes.map((cls) => (
            <ClassAttendanceCard
              key={cls.id}
              ref={(el) => setCardRef(cls.id, el)}
              cls={cls}
              attendances={attendancesByClass[cls.id] || []}
              isExpanded={expandedIds.has(cls.id)}
              onToggle={() => toggleExpand(cls.id)}
              highlightedStudentId={highlightedStudentId}
              onCheckIn={handleOpenCheckIn}
              onCheckOut={(attendanceId, studentName) =>
                handleOpenCheckOut(attendanceId, studentName, false)
              }
              onMarkAbsent={(studentId, studentName, classId, className) =>
                setAbsentConfirm({ studentId, studentName, classId, className })
              }
              onRevertAbsent={(attendanceId, studentName) => {
                setRevertConfirm({ attendanceId, studentName })
                setRevertTime("")
              }}
              onTimeEdit={(attendanceId, studentName, field, currentIso) => {
                setTimeEditDialog({ attendanceId, studentName, field })
                setEditTimeValue(currentIso ? extractHHMM(currentIso) : "")
              }}
              onNoteEdit={(attendanceId, studentName, currentNote) => {
                setNoteDialog({ attendanceId, studentName, currentNote })
                setEditNote(currentNote)
              }}
              onReasonChange={(attendanceId, studentName, currentReason) => {
                setReasonChange({ attendanceId, studentName })
                setNewReason(currentReason || "sick")
              }}
              onRevertPending={(attendanceId, studentName) =>
                setPendingRevert({ attendanceId, studentName })
              }
              onBulkCheckIn={handleBulkCheckIn}
              onBulkCheckOut={handleBulkCheckOut}
            />
          ))}
        </div>
      ))}

      {/* === Dialogs === */}

      {/* Check-in / Check-out time dialog */}
      <Dialog
        open={!!checkTimeDialog}
        onOpenChange={() => { setCheckTimeDialog(null); setCheckTimeValue("") }}
      >
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>
              {checkTimeDialog?.type === "checkin" ? "등원" : "하원"} 시간 확인
            </DialogTitle>
            <DialogDescription>
              <strong className="text-slate-700">{checkTimeDialog?.studentName}</strong> 학생의{" "}
              {checkTimeDialog?.type === "checkin" ? "등원" : "하원"} 시간을 확인해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium text-slate-700 block mb-2">
              {checkTimeDialog?.type === "checkin" ? "등원" : "하원"} 시간
            </label>
            <input
              type="time"
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={checkTimeValue}
              onChange={(e) => setCheckTimeValue(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCheckTimeDialog(null); setCheckTimeValue("") }}>
              취소
            </Button>
            <Button
              onClick={handleCheckTimeConfirm}
              disabled={!checkTimeValue}
              className={checkTimeDialog?.type === "checkin" ? "bg-green-600 hover:bg-green-700" : ""}
            >
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Absent dialog */}
      <Dialog
        open={!!absentConfirm}
        onOpenChange={() => { setAbsentConfirm(null); setAbsentReason("sick"); setAbsentNote("") }}
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
              <Select value={absentReason} onValueChange={(v) => setAbsentReason(v as AbsenceReason)}>
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

      {/* Revert absent dialog */}
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

      {/* Time edit dialog */}
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

      {/* Note dialog */}
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

      {/* Reason change dialog */}
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
            <Select value={newReason} onValueChange={(v) => setNewReason(v as AbsenceReason)}>
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

      {/* Revert to pending dialog */}
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

      {/* Linked makeup confirm dialog */}
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

      {/* Bulk time dialog */}
      <Dialog
        open={!!bulkTimeDialog}
        onOpenChange={() => { setBulkTimeDialog(null); setBulkTimeValue("") }}
      >
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>
              일괄 {bulkTimeDialog?.type === "checkin" ? "등원" : "하원"} 시간 확인
            </DialogTitle>
            <DialogDescription>
              {bulkTimeDialog?.type === "checkin"
                ? `${bulkTimeDialog?.studentIds?.length ?? 0}명의 학생을 일괄 등원합니다.`
                : `${bulkTimeDialog?.attendanceIds?.length ?? 0}명의 학생을 일괄 하원합니다.`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium text-slate-700 block mb-2">
              {bulkTimeDialog?.type === "checkin" ? "등원" : "하원"} 시간
            </label>
            <input
              type="time"
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={bulkTimeValue}
              onChange={(e) => setBulkTimeValue(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBulkTimeDialog(null); setBulkTimeValue("") }}>
              취소
            </Button>
            <Button
              onClick={handleBulkTimeConfirm}
              disabled={!bulkTimeValue || isBulkProcessing}
              className={bulkTimeDialog?.type === "checkin" ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {isBulkProcessing ? "처리 중..." : "확인"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
