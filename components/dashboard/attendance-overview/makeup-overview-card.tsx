"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LogIn, LogOut, UserPlus } from "lucide-react"
import clsx from "clsx"
import type { Attendance } from "@/types/attendance"
import type { MakeupClassWithStudent } from "@/services/makeup-service"

interface Props {
  makeupAttendances: Attendance[]
  scheduledMakeups: MakeupClassWithStudent[]
  onMakeupCheckIn: (makeupClassId: string, studentName: string) => void
  onMakeupCheckOut: (attendanceId: string, studentName: string) => void
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

export function MakeupOverviewCard({
  makeupAttendances,
  scheduledMakeups,
  onMakeupCheckIn,
  onMakeupCheckOut,
}: Props) {
  // Filter out already checked-in makeups from scheduled list
  const checkedInMakeupClassIds = useMemo(
    () => new Set(
      makeupAttendances
        .map((a) => a.makeup_class_id)
        .filter(Boolean) as string[]
    ),
    [makeupAttendances]
  )

  const pendingMakeups = useMemo(
    () => scheduledMakeups.filter((m) => !checkedInMakeupClassIds.has(m.id)),
    [scheduledMakeups, checkedInMakeupClassIds]
  )

  const totalCount = pendingMakeups.length + makeupAttendances.length
  if (totalCount === 0) return null

  return (
    <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-purple-50/60 border-b border-purple-100 flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-purple-500" />
        <span className="text-sm font-semibold text-purple-700">
          보강 학생 ({totalCount}명)
        </span>
      </div>

      <div className="divide-y divide-slate-100">
        {/* Pending makeups */}
        {pendingMakeups.length > 0 && (
          <div>
            <div className="px-4 py-1.5 bg-slate-50">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                예정
              </span>
            </div>
            {pendingMakeups.map((m) => {
              const studentName = m.student_name_snapshot
                ?? (m.students as { name: string } | null)?.name
                ?? "알 수 없음"
              const className = m.class_name_snapshot
                ?? (m.classes as { name: string } | null)?.name
                ?? ""

              return (
                <div
                  key={m.id}
                  className="px-4 py-2.5 flex items-center gap-3 hover:bg-purple-50/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-slate-800 truncate">
                        {studentName}
                      </span>
                      {className && (
                        <span className="text-xs text-slate-400">({className})</span>
                      )}
                      <Badge className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0 flex-shrink-0">
                        보강예정
                      </Badge>
                    </div>
                    {m.absence_date && (
                      <span className="text-[11px] text-slate-400">
                        결석일: {m.absence_date}
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onMakeupCheckIn(m.id, studentName)}
                    className="h-6 px-2.5 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-medium flex-shrink-0"
                  >
                    <LogIn className="w-3 h-3 mr-0.5" />
                    등원
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        {/* Checked-in makeups */}
        {makeupAttendances.length > 0 && (
          <div>
            <div className="px-4 py-1.5 bg-slate-50">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                등원 완료
              </span>
            </div>
            {makeupAttendances.map((ma) => {
              const studentName = ma.student_name_snapshot ?? "알 수 없음"
              const className = ma.class_name_snapshot ?? ""

              return (
                <div
                  key={ma.id}
                  className="px-4 py-2.5 flex items-center gap-3 bg-purple-50/20"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-slate-800 truncate">
                        {studentName}
                      </span>
                      {className && (
                        <span className="text-xs text-slate-400">({className})</span>
                      )}
                      <Badge className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0 flex-shrink-0">
                        보강
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span>등원 {formatTime(ma.check_in_at)}</span>
                      <span>하원 {formatTime(ma.check_out_at)}</span>
                    </div>
                  </div>
                  {ma.check_in_at && !ma.check_out_at && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onMakeupCheckOut(ma.id, studentName)}
                      className="h-6 px-2.5 border-slate-300 text-slate-700 text-[11px] font-medium flex-shrink-0"
                    >
                      <LogOut className="w-3 h-3 mr-0.5" />
                      하원
                    </Button>
                  )}
                  {ma.check_out_at && (
                    <Badge className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0">
                      완료
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
