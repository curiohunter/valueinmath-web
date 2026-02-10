"use client"

import { useMemo } from "react"
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
} from "date-fns"
import { ko } from "date-fns/locale"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type {
  CalendarDayData,
  CalendarDaySession,
  ClassSessionSegment,
} from "@/types/tuition-session"

const WEEKDAY_HEADERS = ["일", "월", "화", "수", "목", "금", "토"]

interface SessionCalendarGridProps {
  year: number
  month: number
  segments: ClassSessionSegment[]
  excludedDates: Set<string>
  addedDates: Map<string, string>
  onToggleDate: (date: string) => void
}

export function SessionCalendarGrid({
  year,
  month,
  segments,
  excludedDates,
  addedDates,
  onToggleDate,
}: SessionCalendarGridProps) {
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
      // 이미 같은 반의 세션이 있으면 추가하지 않음
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

  function handleCellClick(day: CalendarDayData) {
    if (!day.isCurrentMonth || !hasSegments) return

    // 수동 추가된 날짜 → 클릭하면 제거
    const hasAdded = day.sessions.some((s) => s.status === "added")
    if (hasAdded) {
      onToggleDate(day.date)
      return
    }

    // 기존 세션이 있는 경우
    if (day.sessions.length > 0) {
      // 휴원일만 있으면 토글 불가
      if (day.sessions.every((s) => s.status === "closure")) return

      // scheduled 또는 excluded 세션이 있으면 제외/복원 토글
      const hasToggleable = day.sessions.some(
        (s) => s.status === "scheduled" || s.status === "excluded"
      )
      if (hasToggleable) {
        onToggleDate(day.date)
        return
      }
    }

    // 빈 날짜 → 보강 세션 추가
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
          {calendarDays.map((day) => (
            <CalendarCell
              key={day.date}
              day={day}
              hasSegments={hasSegments}
              onClick={() => handleCellClick(day)}
            />
          ))}
        </div>

        {/* 범례 */}
        {hasSegments && (
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
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

function CalendarCell({
  day,
  hasSegments,
  onClick,
}: {
  day: CalendarDayData
  hasSegments: boolean
  onClick: () => void
}) {
  const today = isToday(new Date(day.date + "T00:00:00+09:00"))
  const isWeekend = day.dayOfWeek === "일" || day.dayOfWeek === "토"
  const hasSession = day.sessions.length > 0
  const isClickable =
    day.isCurrentMonth &&
    hasSegments &&
    (hasSession
      ? !day.sessions.every((s) => s.status === "closure")
      : true) // 빈 셀도 클릭 가능 (보강 추가용)

  const closureSession = day.sessions.find((s) => s.status === "closure")

  const cell = (
    <button
      type="button"
      onClick={onClick}
      disabled={!isClickable}
      className={
        "relative flex flex-col items-center justify-start bg-white p-1 min-h-[52px] transition-colors " +
        (!day.isCurrentMonth
          ? "bg-slate-50 text-slate-300 "
          : isClickable
            ? "hover:bg-slate-50 cursor-pointer "
            : "cursor-default ") +
        (today ? "ring-2 ring-inset ring-blue-400 " : "")
      }
    >
      {/* 날짜 숫자 */}
      <span
        className={
          "text-xs leading-none mb-1 " +
          (!day.isCurrentMonth
            ? "text-slate-300"
            : today
              ? "font-bold text-blue-600"
              : isWeekend && day.dayOfWeek === "일"
                ? "text-red-400"
                : isWeekend && day.dayOfWeek === "토"
                  ? "text-blue-400"
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
    </button>
  )

  if (closureSession?.closureReason) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{cell}</TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          휴원: {closureSession.closureReason}
        </TooltipContent>
      </Tooltip>
    )
  }

  return cell
}

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
