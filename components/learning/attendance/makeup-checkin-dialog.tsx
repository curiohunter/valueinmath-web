"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LogIn, Calendar, Clock, Search, Loader2, Check, X } from "lucide-react"
import clsx from "clsx"
import { toast } from "sonner"
import { ABSENCE_REASON_LABELS } from "@/types/attendance"
import type { AbsenceReason } from "@/types/attendance"
import {
  getTodayScheduledMakeups,
  getPendingMakeups,
  makeupCheckIn,
  additionalMakeupCheckIn,
} from "@/services/makeup-service"
import type { MakeupClassWithStudent } from "@/services/makeup-service"

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

interface MakeupCheckInDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  onSuccess: () => void
}

export function MakeupCheckInDialog({
  open,
  onOpenChange,
  date,
  onSuccess,
}: MakeupCheckInDialogProps) {
  const [scheduled, setScheduled] = useState<MakeupClassWithStudent[]>([])
  const [pending, setPending] = useState<MakeupClassWithStudent[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("scheduled")

  // 탭3: 자유 검색
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<{ id: string; name: string }[]>([])
  const [searchLoaded, setSearchLoaded] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null)
  const [studentClasses, setStudentClasses] = useState<{ id: string; name: string }[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)

  // 시간 입력 상태
  const [timeConfirmTarget, setTimeConfirmTarget] = useState<{
    type: "scheduled" | "additional"
    makeupId?: string
  } | null>(null)
  const [checkInTime, setCheckInTime] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [scheduledData, pendingData] = await Promise.all([
        getTodayScheduledMakeups(date),
        getPendingMakeups(),
      ])
      setScheduled(scheduledData)
      setPending(pendingData)

      // 기본 탭 설정
      if (scheduledData.length > 0) {
        setActiveTab("scheduled")
      } else if (pendingData.length > 0) {
        setActiveTab("pending")
      } else {
        setActiveTab("additional")
      }
    } catch (error) {
      console.error("보강 데이터 조회 실패:", error)
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    if (open) {
      fetchData()
      setSearchQuery("")
      setSearchResults([])
      setSearchLoaded(false)
      setSelectedStudent(null)
      setStudentClasses([])
      setSelectedClassId(null)
      setTimeConfirmTarget(null)
      setCheckInTime("")
    }
  }, [open, fetchData])

  // 학생 선택 시 해당 학생의 등록 반 목록 조회
  useEffect(() => {
    if (!selectedStudent) {
      setStudentClasses([])
      setSelectedClassId(null)
      return
    }
    let cancelled = false
    async function fetchClasses() {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { data } = await supabase
        .from("class_students")
        .select("class_id, classes:class_id (id, name)")
        .eq("student_id", selectedStudent!.id)
      if (cancelled) return
      const classList = (data ?? [])
        .map((d) => d.classes as unknown as { id: string; name: string })
        .filter(Boolean)
      setStudentClasses(classList)
      if (classList.length === 1) {
        setSelectedClassId(classList[0].id)
      } else {
        setSelectedClassId(null)
      }
    }
    fetchClasses()
    return () => { cancelled = true }
  }, [selectedStudent])

  // 학생 검색
  useEffect(() => {
    if (!open || searchQuery.length < 1) {
      setSearchResults([])
      setSearchLoaded(false)
      return
    }

    let cancelled = false
    setSearchLoaded(false)

    async function search() {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { data } = await supabase
        .from("students")
        .select("id, name")
        .ilike("name", `%${searchQuery}%`)
        .eq("status", "재원")
        .order("name")
        .limit(10)
      if (!cancelled) {
        setSearchResults(data ?? [])
        setSearchLoaded(true)
      }
    }

    search()
    return () => { cancelled = true }
  }, [open, searchQuery])

  const handleScheduledCheckIn = async (makeup: MakeupClassWithStudent, isoTime: string) => {
    setActionLoading(makeup.id)
    try {
      await makeupCheckIn({
        makeupClassId: makeup.id,
        date,
        checkInAt: isoTime,
      })
      toast.success(`${getStudentName(makeup)} 보강 등원 완료`)
      onSuccess()
      onOpenChange(false)
    } catch (error: unknown) {
      toast.error((error as Error).message || "보강 등원 실패")
    } finally {
      setActionLoading(null)
      setTimeConfirmTarget(null)
      setCheckInTime("")
    }
  }

  const handleAdditionalCheckIn = async (isoTime: string) => {
    if (!selectedStudent || !selectedClassId) return
    const selectedClass = studentClasses.find((c) => c.id === selectedClassId)
    if (!selectedClass) return
    setActionLoading("additional")
    try {
      await additionalMakeupCheckIn({
        studentId: selectedStudent.id,
        classId: selectedClassId,
        date,
        studentName: selectedStudent.name,
        className: selectedClass.name,
        checkInAt: isoTime,
      })
      toast.success(`${selectedStudent.name} 추가 보강 등원 완료`)
      onSuccess()
      onOpenChange(false)
    } catch (error: unknown) {
      toast.error((error as Error).message || "추가 보강 등원 실패")
    } finally {
      setActionLoading(null)
      setTimeConfirmTarget(null)
      setCheckInTime("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>보강 등원</DialogTitle>
          <DialogDescription>
            보강으로 참여하는 학생을 등원 처리합니다.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="scheduled" className="text-xs">
                보강 예정
                {scheduled.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {scheduled.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="pending" className="text-xs">
                보강 미정
                {pending.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {pending.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="additional" className="text-xs">
                추가 보강
              </TabsTrigger>
            </TabsList>

            {/* 탭1: 보강 예정 (오늘 날짜) */}
            <TabsContent value="scheduled" className="mt-3">
              {scheduled.length === 0 ? (
                <EmptyState text="오늘 보강 예정인 학생이 없습니다" />
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {scheduled.map((m) => (
                    <MakeupRow
                      key={m.id}
                      makeup={m}
                      loading={actionLoading === m.id}
                      onCheckIn={() => {
                        setTimeConfirmTarget({ type: "scheduled", makeupId: m.id })
                        setCheckInTime(getCurrentKSTTime())
                      }}
                      onTimeConfirm={(time) => handleScheduledCheckIn(m, buildISOFromTimeAndDate(time, date))}
                      onTimeCancel={() => { setTimeConfirmTarget(null); setCheckInTime("") }}
                      showTimeInput={timeConfirmTarget?.type === "scheduled" && timeConfirmTarget.makeupId === m.id}
                      timeValue={checkInTime}
                      onTimeChange={setCheckInTime}
                      badge={
                        m.start_time
                          ? <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />{m.start_time.substring(0, 5)}</span>
                          : null
                      }
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 탭2: 보강 미정 */}
            <TabsContent value="pending" className="mt-3">
              {pending.length === 0 ? (
                <EmptyState text="보강 미정인 학생이 없습니다" />
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {pending.map((m) => (
                    <MakeupRow
                      key={m.id}
                      makeup={m}
                      loading={actionLoading === m.id}
                      onCheckIn={() => {
                        setTimeConfirmTarget({ type: "scheduled", makeupId: m.id })
                        setCheckInTime(getCurrentKSTTime())
                      }}
                      onTimeConfirm={(time) => handleScheduledCheckIn(m, buildISOFromTimeAndDate(time, date))}
                      onTimeCancel={() => { setTimeConfirmTarget(null); setCheckInTime("") }}
                      showTimeInput={timeConfirmTarget?.type === "scheduled" && timeConfirmTarget.makeupId === m.id}
                      timeValue={checkInTime}
                      onTimeChange={setCheckInTime}
                      badge={
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          {m.absence_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {m.absence_date}
                            </span>
                          )}
                          {m.absence_reason && (
                            <span className="text-red-500">
                              {ABSENCE_REASON_LABELS[m.absence_reason as AbsenceReason] ?? m.absence_reason}
                            </span>
                          )}
                        </div>
                      }
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 탭3: 추가 보강 */}
            <TabsContent value="additional" className="mt-3 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className="w-full text-sm pl-9 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setSelectedStudent(null)
                  }}
                  placeholder="학생 이름 검색..."
                  autoFocus={activeTab === "additional"}
                />
              </div>

              {searchQuery.length >= 1 && searchLoaded && searchResults.length === 0 && (
                <div className="text-xs text-slate-400 py-2 text-center">
                  검색 결과가 없습니다
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto border rounded-md">
                  {searchResults.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStudent(s)}
                      className={clsx(
                        "w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b last:border-b-0",
                        selectedStudent?.id === s.id && "bg-purple-50 text-purple-700 font-medium"
                      )}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}

              {/* 반 선택 드롭다운 */}
              {selectedStudent && studentClasses.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">반 선택</label>
                  <Select
                    value={selectedClassId ?? ""}
                    onValueChange={setSelectedClassId}
                  >
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue placeholder="반을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {studentClasses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {selectedStudent && studentClasses.length === 0 && (
                <div className="text-xs text-slate-400 py-1 text-center">
                  등록된 반이 없습니다
                </div>
              )}

              {timeConfirmTarget?.type === "additional" ? (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="time"
                    className="flex-1 text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 h-9"
                    onClick={() => handleAdditionalCheckIn(buildISOFromTimeAndDate(checkInTime, date))}
                    disabled={!checkInTime || actionLoading === "additional"}
                  >
                    {actionLoading === "additional" ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9"
                    onClick={() => { setTimeConfirmTarget(null); setCheckInTime("") }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex justify-end pt-1">
                  <Button
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={() => {
                      setTimeConfirmTarget({ type: "additional" })
                      setCheckInTime(getCurrentKSTTime())
                    }}
                    disabled={!selectedStudent || !selectedClassId || actionLoading === "additional"}
                  >
                    {actionLoading === "additional" && (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    )}
                    <LogIn className="w-3 h-3 mr-1" />
                    보강 등원
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}

// --- 내부 컴포넌트 ---

function getStudentName(m: MakeupClassWithStudent): string {
  return m.student_name_snapshot
    ?? (m.students as { name: string } | null)?.name
    ?? "알 수 없음"
}

function MakeupRow({
  makeup,
  loading,
  onCheckIn,
  onTimeConfirm,
  onTimeCancel,
  showTimeInput,
  timeValue,
  onTimeChange,
  badge,
}: {
  makeup: MakeupClassWithStudent
  loading: boolean
  onCheckIn: () => void
  onTimeConfirm: (time: string) => void
  onTimeCancel: () => void
  showTimeInput: boolean
  timeValue: string
  onTimeChange: (v: string) => void
  badge: React.ReactNode
}) {
  const studentName = getStudentName(makeup)
  const className = makeup.class_name_snapshot
    ?? (makeup.classes as { name: string } | null)?.name

  return (
    <div className="flex items-center justify-between px-3 py-2 border rounded-lg bg-white">
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-800 truncate">
            {studentName}
          </span>
          {className && (
            <span className="text-xs text-slate-400 truncate">
              ({className})
            </span>
          )}
        </div>
        {badge}
      </div>
      {showTimeInput ? (
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          <input
            type="time"
            className="text-sm px-2 py-1 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 w-[100px]"
            value={timeValue}
            onChange={(e) => onTimeChange(e.target.value)}
            autoFocus
          />
          <Button
            size="sm"
            onClick={() => onTimeConfirm(timeValue)}
            disabled={loading || !timeValue}
            className="h-7 w-7 p-0 bg-purple-600 hover:bg-purple-700 text-white"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onTimeCancel}
            className="h-7 w-7 p-0"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          onClick={onCheckIn}
          disabled={loading}
          className="h-7 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium flex-shrink-0 ml-2"
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <>
              <LogIn className="w-3 h-3 mr-1" />
              등원
            </>
          )}
        </Button>
      )}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-6 text-sm text-slate-400">
      {text}
    </div>
  )
}
