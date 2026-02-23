"use client"

import { useMemo, useState } from "react"
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  isBefore,
  startOfDay,
} from "date-fns"
import { ko } from "date-fns/locale"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type {
  CalendarDayData,
  CalendarDaySession,
  ClassSessionSegment,
  CalendarAttendanceSummary,
  CalendarMakeupSummary,
  AttendanceDetail,
  MakeupDetail,
} from "@/types/tuition-session"
import {
  ATTENDANCE_STATUS_LABELS,
  ABSENCE_REASON_LABELS,
  type AttendanceStatus,
  type AbsenceReason,
} from "@/types/attendance"

const WEEKDAY_HEADERS = ["일", "월", "화", "수", "목", "금", "토"]

const MAKEUP_STATUS_LABELS: Record<string, string> = {
  scheduled: "예정",
  completed: "완료",
  cancelled: "취소",
}

interface SessionCalendarGridProps {
  year: number
  month: number
  segments: ClassSessionSegment[]
  excludedDates: Set<string>
  addedDates: Map<string, string>
  onToggleDate: (date: string) => void
  attendancesByDate: Map<string, CalendarAttendanceSummary[]>
  makeupsByDate: Map<string, CalendarMakeupSummary>
}

export function SessionCalendarGrid({
  year,
  month,
  segments,
  excludedDates,
  addedDates,
  onToggleDate,
  attendancesByDate,
  makeupsByDate,
}: SessionCalendarGridProps) {
  const [popoverDate, setPopoverDate] = useState<string | null>(null)

  const todayDate = useMemo(() => startOfDay(new Date()), [])

  const calendarDays = useMemo(() => {
    const monthDate = new Date(year, month - 1, 1)
    const monthStart = startOfMonth(monthDate)
    const monthEnd = endOfMonth(monthDate)
    const calStart = startOfWeek(monthStart, { locale: ko })
    const calEnd = endOfWeek(monthEnd, { locale: ko })

    const days = eachDayOfInterval({ start: calStart, end: calEnd })

    // 세션을 날짜별로 인덱싱
    const sessionsByDate = new Map<string, CalendarDaySession[]>()
    for (const segment of segments) {
      for (const session of segment.sessions) {
        const existing = sessionsByDate.get(session.date) ?? []
        const isExcluded = excludedDates.has(session.date)

        existing.push({
          classId: segment.classId,
          color: segment.color,
          status: isExcluded ? "excluded" : session.status,
          closureReason: session.closureReason,
        })
        sessionsByDate.set(session.date, existing)
      }
    }

    // 수동 추가 날짜를 세션에 반영
    for (const [date, classId] of addedDates) {
      const seg = segments.find((s) => s.classId === classId)
      if (!seg) continue
      const existing = sessionsByDate.get(date) ?? []
      if (existing.some((s) => s.classId === classId)) continue
      existing.push({
        classId: seg.classId,
        color: seg.color,
        status: "added",
      })
      sessionsByDate.set(date, existing)
    }

    return days.map((day): CalendarDayData => {
      const dateStr = format(day, "yyyy-MM-dd")
      const dayOfWeek = WEEKDAY_HEADERS[day.getDay()]
      return {
        date: dateStr,
        dayOfWeek,
        isCurrentMonth: isSameMonth(day, monthDate),
        sessions: sessionsByDate.get(dateStr) ?? [],
      }
    })
  }, [year, month, segments, excludedDates, addedDates])

  const hasSegments = segments.length > 0

  function isPastDate(dateStr: string): boolean {
    const d = new Date(dateStr + "T00:00:00+09:00")
    return isBefore(d, todayDate) || isToday(d)
  }

  function handleCellClick(day: CalendarDayData) {
    if (!day.isCurrentMonth) return

    // 과거 날짜: 출석/보강 데이터가 있으면 Popover 열기
    if (isPastDate(day.date)) {
      const hasAttendance = attendancesByDate.has(day.date)
      const hasMakeup = makeupsByDate.has(day.date)
      if (hasAttendance || hasMakeup) {
        setPopoverDate((prev) => (prev === day.date ? null : day.date))
        return
      }
    }

    // 미래 날짜: 기존 토글 로직
    if (!hasSegments) return

    const hasAdded = day.sessions.some((s) => s.status === "added")
    if (hasAdded) {
      onToggleDate(day.date)
      return
    }

    if (day.sessions.length > 0) {
      if (day.sessions.every((s) => s.status === "closure")) return
      const hasToggleable = day.sessions.some(
        (s) => s.status === "scheduled" || s.status === "excluded"
      )
      if (hasToggleable) {
        onToggleDate(day.date)
        return
      }
    }

    onToggleDate(day.date)
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="select-none">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAY_HEADERS.map((day, i) => (
            <div
              key={day}
              className={
                "text-center text-xs font-medium py-1.5 " +
                (i === 0
                  ? "text-red-400"
                  : i === 6
                    ? "text-blue-400"
                    : "text-slate-400")
              }
            >
              {day}
            </div>
          ))}
        </div>

        {/* 캘린더 그리드 */}
        <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-lg overflow-hidden">
          {calendarDays.map((day) => {
            const past = day.isCurrentMonth && isPastDate(day.date)
            const attSummaries = past ? attendancesByDate.get(day.date) : undefined
            const mkSummary = past ? makeupsByDate.get(day.date) : undefined
            const isPopoverOpen = popoverDate === day.date

            return (
              <CalendarCell
                key={day.date}
                day={day}
                hasSegments={hasSegments}
                isPast={past}
                attendanceSummaries={attSummaries}
                makeupSummary={mkSummary}
                isPopoverOpen={isPopoverOpen}
                onPopoverChange={(open) => {
                  if (!open) setPopoverDate(null)
                }}
                onClick={() => handleCellClick(day)}
              />
            )
          })}
        </div>

        {/* 범례 */}
        {hasSegments && (
          <div className="flex items-center gap-3 mt-3 text-xs text-slate-500 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />
              수업
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded bg-slate-300" />
              휴원
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-300 line-through" />
              제외
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-blue-500" />
              추가
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1">
              <span className="text-green-600 font-bold">✓</span>
              출석
            </span>
            <span className="flex items-center gap-1">
              <span className="text-red-500 font-bold">✗</span>
              결석
            </span>
            <span className="flex items-center gap-1">
              <span className="text-purple-600 font-bold">◆</span>
              보강
            </span>
            {segments.length > 1 && (
              <>
                {segments.map((seg) => (
                  <span key={seg.classId} className="flex items-center gap-1">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: seg.color }}
                    />
                    {seg.className}
                  </span>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

// --- CalendarCell ---

function CalendarCell({
  day,
  hasSegments,
  isPast,
  attendanceSummaries,
  makeupSummary,
  isPopoverOpen,
  onPopoverChange,
  onClick,
}: {
  day: CalendarDayData
  hasSegments: boolean
  isPast: boolean
  attendanceSummaries?: CalendarAttendanceSummary[]
  makeupSummary?: CalendarMakeupSummary
  isPopoverOpen: boolean
  onPopoverChange: (open: boolean) => void
  onClick: () => void
}) {
  const today = isToday(new Date(day.date + "T00:00:00+09:00"))
  const isWeekend = day.dayOfWeek === "일" || day.dayOfWeek === "토"
  const hasSession = day.sessions.length > 0
  const hasAttendanceData = (attendanceSummaries?.length ?? 0) > 0
  const hasMakeupData =
    makeupSummary && (makeupSummary.scheduled + makeupSummary.completed + makeupSummary.cancelled) > 0

  const isClickable =
    day.isCurrentMonth &&
    (isPast
      ? hasAttendanceData || hasMakeupData
      : hasSegments &&
        (hasSession
          ? !day.sessions.every((s) => s.status === "closure")
          : true))

  const closureSession = day.sessions.find((s) => s.status === "closure")

  const cellContent = (
    <button
      type="button"
      onClick={onClick}
      disabled={!isClickable}
      className={
        "relative flex flex-col items-center justify-start p-1 min-h-[52px] transition-colors w-full " +
        (!day.isCurrentMonth
          ? "bg-slate-50 text-slate-300 "
          : isPast
            ? "bg-slate-50/70 "
            : "bg-white ") +
        (isClickable
          ? "hover:bg-slate-100 cursor-pointer "
          : "cursor-default ") +
        (today ? "ring-2 ring-inset ring-blue-400 " : "")
      }
    >
      {/* 날짜 숫자 */}
      <span
        className={
          "text-xs leading-none mb-0.5 " +
          (!day.isCurrentMonth
            ? "text-slate-300"
            : today
              ? "font-bold text-blue-600"
              : isWeekend && day.dayOfWeek === "일"
                ? "text-red-400"
                : isWeekend && day.dayOfWeek === "토"
                  ? "text-blue-400"
                  : isPast
                    ? "text-slate-400"
                    : "text-slate-600")
        }
      >
        {format(new Date(day.date + "T00:00:00+09:00"), "d")}
      </span>

      {/* 세션 도트/아이콘 */}
      {day.isCurrentMonth && hasSession && (
        <div className="flex items-center gap-0.5 mt-0.5">
          {day.sessions.map((session, i) => (
            <SessionDot key={`${session.classId}-${i}`} session={session} />
          ))}
        </div>
      )}

      {/* 출석 배지 (과거 날짜만) */}
      {isPast && hasAttendanceData && (
        <div className="mt-0.5 flex flex-col items-center gap-px">
          {attendanceSummaries!.map((summary) => (
            <AttendanceBadge key={summary.classId} summary={summary} />
          ))}
        </div>
      )}

      {/* 보강 배지 (과거 날짜만) */}
      {isPast && hasMakeupData && (
        <div className="mt-0.5">
          <MakeupBadge summary={makeupSummary!} />
        </div>
      )}
    </button>
  )

  // 과거 날짜 + 데이터 있음 → Popover 래핑
  if (isPast && (hasAttendanceData || hasMakeupData)) {
    return (
      <Popover open={isPopoverOpen} onOpenChange={onPopoverChange}>
        <PopoverTrigger asChild>{cellContent}</PopoverTrigger>
        <PopoverContent
          side="top"
          align="center"
          className="w-64 p-3 text-xs"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <AttendancePopoverContent
            date={day.date}
            dayOfWeek={day.dayOfWeek}
            attendanceSummaries={attendanceSummaries}
            makeupSummary={makeupSummary}
          />
        </PopoverContent>
      </Popover>
    )
  }

  // 휴원 사유 툴팁
  if (closureSession?.closureReason) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{cellContent}</TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          휴원: {closureSession.closureReason}
        </TooltipContent>
      </Tooltip>
    )
  }

  return cellContent
}

// --- SessionDot ---

function SessionDot({ session }: { session: CalendarDaySession }) {
  if (session.status === "closure") {
    return (
      <span className="inline-block w-3 h-3 rounded-sm bg-slate-300 text-slate-500 text-[8px] leading-3 text-center font-bold">
        H
      </span>
    )
  }

  if (session.status === "excluded") {
    return (
      <span
        className="inline-block w-3 h-3 rounded-full text-[9px] leading-3 text-center font-bold"
        style={{
          backgroundColor: `${session.color}20`,
          color: session.color,
        }}
      >
        x
      </span>
    )
  }

  if (session.status === "added") {
    return (
      <span
        className="inline-block w-3 h-3 rounded-full border-2 text-[8px] leading-[8px] text-center font-bold"
        style={{
          borderColor: session.color,
          color: session.color,
        }}
      >
        +
      </span>
    )
  }

  // scheduled
  return (
    <span
      className="inline-block w-3 h-3 rounded-full"
      style={{ backgroundColor: session.color }}
    />
  )
}

// --- AttendanceBadge ---

function AttendanceBadge({ summary }: { summary: CalendarAttendanceSummary }) {
  const total = summary.attended + summary.absent + summary.pending
  if (total === 0) return null

  return (
    <div className="flex items-center gap-0.5 text-[8px] leading-none font-medium">
      {summary.attended > 0 && (
        <span className="text-green-600">✓{summary.attended}</span>
      )}
      {summary.absent > 0 && (
        <span className="text-red-500">✗{summary.absent}</span>
      )}
      {summary.pending > 0 && (
        <span className="text-gray-400">-{summary.pending}</span>
      )}
    </div>
  )
}

// --- MakeupBadge ---

function MakeupBadge({ summary }: { summary: CalendarMakeupSummary }) {
  const total = summary.scheduled + summary.completed + summary.cancelled
  if (total === 0) return null

  return (
    <div className="flex items-center gap-0.5 text-[8px] leading-none font-medium">
      {summary.completed > 0 && (
        <span className="text-purple-600">◆{summary.completed}</span>
      )}
      {summary.scheduled > 0 && (
        <span className="text-blue-500">◇{summary.scheduled}</span>
      )}
      {summary.cancelled > 0 && (
        <span className="text-gray-400 line-through">◆{summary.cancelled}</span>
      )}
    </div>
  )
}

// --- AttendancePopoverContent ---

function AttendancePopoverContent({
  date,
  dayOfWeek,
  attendanceSummaries,
  makeupSummary,
}: {
  date: string
  dayOfWeek: string
  attendanceSummaries?: CalendarAttendanceSummary[]
  makeupSummary?: CalendarMakeupSummary
}) {
  const formattedDate = format(
    new Date(date + "T00:00:00+09:00"),
    "M/d",
  )

  return (
    <div className="space-y-2">
      <div className="font-semibold text-slate-700 text-xs border-b border-slate-100 pb-1.5">
        {formattedDate} ({dayOfWeek}) 출석 상세
      </div>

      {/* 반별 출석 상세 */}
      {attendanceSummaries?.map((summary) => (
        <div key={summary.classId} className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: summary.color }}
            />
            <span className="font-medium text-slate-600 truncate">
              {summary.className}
            </span>
            <span className="text-slate-400 ml-auto flex-shrink-0">
              {summary.attended + summary.absent + summary.pending}명
            </span>
          </div>
          <div className="space-y-0.5 pl-3.5">
            {summary.details.map((detail) => (
              <AttendanceDetailRow key={detail.studentId} detail={detail} />
            ))}
          </div>
        </div>
      ))}

      {/* 보강 상세 */}
      {makeupSummary && makeupSummary.details.length > 0 && (
        <div className="space-y-1 border-t border-slate-100 pt-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-purple-600 font-bold">◆</span>
            <span className="font-medium text-slate-600">보강</span>
          </div>
          <div className="space-y-0.5 pl-3.5">
            {makeupSummary.details.map((detail, i) => (
              <MakeupDetailRow key={`${detail.studentId}-${i}`} detail={detail} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// --- AttendanceDetailRow ---

function AttendanceDetailRow({ detail }: { detail: AttendanceDetail }) {
  const statusIcon = getStatusIcon(detail.status)
  const statusColor = getStatusColor(detail.status)
  const timeStr = formatTimeRange(detail.checkInAt, detail.checkOutAt)
  const statusLabel = ATTENDANCE_STATUS_LABELS[detail.status as AttendanceStatus]

  return (
    <div className="flex items-center gap-1 text-[11px]">
      <span className={statusColor}>{statusIcon}</span>
      <span className="text-slate-700 truncate max-w-[80px]">{detail.studentName}</span>
      {detail.isMakeup && (
        <span className="text-purple-500 text-[9px]">(보강)</span>
      )}
      <span className="text-slate-400 ml-auto flex-shrink-0">
        {detail.status === "absent" ? (
          <span className="text-red-400">
            {statusLabel}
            {detail.absenceReason && (
              <> ({ABSENCE_REASON_LABELS[detail.absenceReason as AbsenceReason]})</>
            )}
          </span>
        ) : detail.status === "pending" ? (
          <span className="text-gray-400">{statusLabel}</span>
        ) : (
          timeStr || statusLabel
        )}
      </span>
    </div>
  )
}

// --- MakeupDetailRow ---

function MakeupDetailRow({ detail }: { detail: MakeupDetail }) {
  const statusColor =
    detail.status === "completed"
      ? "text-purple-600"
      : detail.status === "scheduled"
        ? "text-blue-500"
        : "text-gray-400"

  const statusIcon =
    detail.status === "completed"
      ? "◆"
      : detail.status === "scheduled"
        ? "◇"
        : "◆"

  const timeStr =
    detail.startTime && detail.endTime
      ? `${detail.startTime.slice(0, 5)}~${detail.endTime.slice(0, 5)}`
      : null

  return (
    <div className="flex items-center gap-1 text-[11px]">
      <span className={statusColor + (detail.status === "cancelled" ? " line-through" : "")}>
        {statusIcon}
      </span>
      <span className="text-slate-700 truncate max-w-[80px]">{detail.studentName}</span>
      {detail.className && (
        <span className="text-slate-400 text-[9px] truncate max-w-[50px]">
          ({detail.className})
        </span>
      )}
      <span className={`ml-auto flex-shrink-0 ${statusColor}`}>
        {MAKEUP_STATUS_LABELS[detail.status]}
        {timeStr && <span className="text-slate-400 ml-0.5">{timeStr}</span>}
      </span>
    </div>
  )
}

// --- 헬퍼 함수 ---

function getStatusIcon(status: string): string {
  switch (status) {
    case "present": return "✓"
    case "late": return "△"
    case "early_leave": return "▽"
    case "absent": return "✗"
    default: return "-"
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "present": return "text-green-600"
    case "late": return "text-yellow-600"
    case "early_leave": return "text-orange-500"
    case "absent": return "text-red-500"
    default: return "text-gray-400"
  }
}

function formatTimeRange(checkIn: string | null, checkOut: string | null): string | null {
  if (!checkIn) return null
  const inTime = new Date(checkIn)
  const inStr = `${String(inTime.getHours()).padStart(2, "0")}:${String(inTime.getMinutes()).padStart(2, "0")}`
  if (!checkOut) return inStr
  const outTime = new Date(checkOut)
  const outStr = `${String(outTime.getHours()).padStart(2, "0")}:${String(outTime.getMinutes()).padStart(2, "0")}`
  return `${inStr}~${outStr}`
}
