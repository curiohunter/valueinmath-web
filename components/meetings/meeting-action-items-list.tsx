"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  CalendarDays,
  MoreHorizontal,
  Loader2,
  ListTodo,
  ChevronLeft,
  ChevronsRight,
} from "lucide-react"
import { toast } from "sonner"
import { ko } from "date-fns/locale"
import { createClient } from "@/lib/supabase/client"
import {
  toggleActionItemStatus,
  updateMeetingActionItem,
  setActionItemAssignees,
  deleteMeetingActionItem,
} from "@/services/meeting-service"
import { useAllActionItems, useCurrentEmployeeId } from "@/hooks/use-all-action-items"
import { AssigneePopover } from "./meeting-action-items-card"
import type {
  ActionItemStatus,
  MeetingActionItem,
} from "@/types/meeting"
import type { ActionItemWithMeeting } from "@/services/meeting-service"

// --- Constants ---

const STATUS_ORDER: ActionItemStatus[] = ["pending", "in_progress", "completed"]

const STATUS_CONFIG: Record<ActionItemStatus, {
  label: string
  color: string
  dotClass: string
}> = {
  pending: { label: "대기", color: "bg-amber-400", dotClass: "bg-amber-400" },
  in_progress: { label: "진행중", color: "bg-sky-500", dotClass: "bg-sky-500" },
  completed: { label: "완료", color: "bg-emerald-500", dotClass: "bg-emerald-500" },
}

const statusLabels: Record<string, string> = {
  pending: "대기",
  in_progress: "진행중",
  completed: "완료",
  cancelled: "취소",
}

// Status progression for ← → navigation
const STATUS_FLOW: ActionItemStatus[] = ["pending", "in_progress", "completed"]

function getPrevStatus(current: ActionItemStatus): ActionItemStatus | null {
  const idx = STATUS_FLOW.indexOf(current)
  return idx > 0 ? STATUS_FLOW[idx - 1] : null
}

function getNextStatus(current: ActionItemStatus): ActionItemStatus | null {
  const idx = STATUS_FLOW.indexOf(current)
  return idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null
}

interface Employee {
  id: string
  name: string
}

// --- Due Date Helpers ---

function getDueDateInfo(dueDate: string | null): {
  label: string
  className: string
} | null {
  if (!dueDate) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + "T00:00:00")
  const diffMs = due.getTime() - today.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return {
      label: `${Math.abs(diffDays)}일 지연`,
      className: "text-red-600 bg-red-50 border-red-200",
    }
  }
  if (diffDays === 0) {
    return { label: "오늘까지", className: "text-amber-700 bg-amber-50 border-amber-200" }
  }
  if (diffDays === 1) {
    return { label: "내일까지", className: "text-amber-600 bg-amber-50 border-amber-200" }
  }
  return {
    label: `D-${diffDays}`,
    className: "text-muted-foreground bg-muted/50 border-border",
  }
}

// --- DueDatePicker (shared) ---

function DueDatePicker({
  dueDate,
  dueDateRaw,
  isCompleted,
  onDateChange,
}: {
  dueDate: string | null
  dueDateRaw: string | null
  isCompleted: boolean
  onDateChange: (date: Date | undefined) => void
}) {
  const info = isCompleted ? null : getDueDateInfo(dueDate)

  if (dueDate) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center gap-1 text-[10px] rounded-full px-1.5 py-0.5 border font-medium ${
              info?.className || "text-muted-foreground bg-muted/50 border-border"
            }`}
          >
            <CalendarDays className="h-2.5 w-2.5" />
            {info?.label || new Date(dueDate).toLocaleDateString("ko-KR", {
              month: "short",
              day: "numeric",
            })}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={new Date(dueDate + "T00:00:00")}
            onSelect={onDateChange}
            locale={ko}
          />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground rounded-full px-1.5 py-0.5 border border-dashed border-border hover:border-foreground/30 transition-colors"
        >
          <CalendarDays className="h-2.5 w-2.5" />
          {dueDateRaw || "날짜 설정"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          onSelect={onDateChange}
          locale={ko}
        />
      </PopoverContent>
    </Popover>
  )
}

// --- Main Component ---

export function MeetingActionItemsList() {
  const router = useRouter()
  const { employeeId, isLoading: empLoading } = useCurrentEmployeeId()

  const [viewMode, setViewMode] = useState<"my" | "all">("my")
  const [filterAssignee, setFilterAssignee] = useState<string>("all")
  const [filterMeeting, setFilterMeeting] = useState<string>("all")

  const [employees, setEmployees] = useState<Employee[]>([])
  const [meetings, setMeetings] = useState<{ id: string; title: string }[]>([])

  const swrFilter = useMemo(() => {
    if (viewMode === "my") {
      return {
        assignee_id: employeeId || undefined,
      }
    }
    return {
      assignee_id: filterAssignee !== "all" ? filterAssignee : undefined,
      meeting_id: filterMeeting !== "all" ? filterMeeting : undefined,
    }
  }, [viewMode, employeeId, filterAssignee, filterMeeting])

  const { items, isLoading, mutate } = useAllActionItems(swrFilter)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const [empRes, meetRes] = await Promise.all([
        supabase.from("employees").select("id, name").eq("status", "재직").order("name"),
        supabase.from("meetings").select("id, title").order("meeting_date", { ascending: false }),
      ])
      setEmployees(empRes.data || [])
      setMeetings(meetRes.data || [])
    }
    load()
  }, [])

  const grouped = useMemo(() => {
    const result: Record<string, ActionItemWithMeeting[]> = {
      pending: [],
      in_progress: [],
      completed: [],
    }
    for (const item of items) {
      const key = item.status === "cancelled" ? "completed" : item.status
      if (result[key]) {
        result[key].push(item)
      }
    }
    return result
  }, [items])

  const stats = useMemo(() => {
    const total = items.length
    const pending = grouped.pending.length
    const inProgress = grouped.in_progress.length
    const completed = grouped.completed.length
    const unassigned = items.filter((i) => !i.assignees || i.assignees.length === 0).length
    return { total, pending, inProgress, completed, unassigned }
  }, [items, grouped])

  // --- Action Handlers ---

  const handleToggle = async (item: MeetingActionItem) => {
    try {
      const wasCompleted = item.status === "completed"
      await toggleActionItemStatus(item.id, item.status)
      mutate()

      if (!wasCompleted) {
        toast.success("완료 처리됨", {
          action: {
            label: "되돌리기",
            onClick: async () => {
              await toggleActionItemStatus(item.id, "completed")
              mutate()
            },
          },
        })
      }
    } catch (error: any) {
      toast.error(`상태 변경 실패: ${error.message}`)
    }
  }

  const handleStatusChange = async (id: string, status: ActionItemStatus) => {
    try {
      await updateMeetingActionItem(id, { status })
      mutate()
    } catch (error: any) {
      toast.error(`상태 변경 실패: ${error.message}`)
    }
  }

  const handleAssigneeToggle = async (
    actionItemId: string,
    currentAssigneeIds: string[],
    employeeIdToToggle: string
  ) => {
    try {
      const newIds = currentAssigneeIds.includes(employeeIdToToggle)
        ? currentAssigneeIds.filter((id) => id !== employeeIdToToggle)
        : [...currentAssigneeIds, employeeIdToToggle]
      await setActionItemAssignees(actionItemId, newIds)
      mutate()
    } catch (error: any) {
      toast.error(`담당자 변경 실패: ${error.message}`)
    }
  }

  const handleDueDateChange = async (id: string, date: Date | undefined) => {
    try {
      const due_date = date ? date.toISOString().split("T")[0] : null
      await updateMeetingActionItem(id, { due_date } as any)
      mutate()
      toast.success("마감일이 변경되었습니다.")
    } catch (error: any) {
      toast.error(`마감일 변경 실패: ${error.message}`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("이 실행항목을 삭제하시겠습니까?")) return
    try {
      await deleteMeetingActionItem(id)
      mutate()
      toast.success("삭제되었습니다.")
    } catch (error: any) {
      toast.error(`삭제 실패: ${error.message}`)
    }
  }

  if (empLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const sharedCardProps = {
    employees,
    onStatusChange: handleStatusChange,
    onToggle: handleToggle,
    onAssigneeToggle: handleAssigneeToggle,
    onDueDateChange: handleDueDateChange,
    onDelete: handleDelete,
    onMeetingClick: (id: string) => router.push(`/meetings/${id}`),
  }

  return (
    <div className="space-y-3">
      {/* Filter bar: view toggle + filters + stats */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex items-center rounded-md border bg-muted/40 p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("my")}
            className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              viewMode === "my"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ListTodo className="h-3 w-3" />
            내 할일
          </button>
          <button
            type="button"
            onClick={() => setViewMode("all")}
            className={`inline-flex items-center rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              viewMode === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            전체
          </button>
        </div>

        {viewMode === "all" && (
          <>
            <div className="h-4 w-px bg-border" />
            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger className="h-7 w-[110px] text-xs">
                <SelectValue placeholder="담당자" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">전체 담당자</SelectItem>
                {employeeId && (
                  <SelectItem value={employeeId} className="text-xs">나</SelectItem>
                )}
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id} className="text-xs">
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterMeeting} onValueChange={setFilterMeeting}>
              <SelectTrigger className="h-7 w-[140px] text-xs">
                <SelectValue placeholder="회의" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">전체 회의</SelectItem>
                {meetings.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs truncate">
                    {m.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        <div className="ml-auto text-[11px] text-muted-foreground flex items-center gap-2">
          <span>{stats.total}개</span>
          <span className="text-muted-foreground/30">|</span>
          <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />{stats.pending}</span>
          <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500" />{stats.inProgress}</span>
          <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />{stats.completed}</span>
          {stats.unassigned > 0 && (
            <span className="text-amber-600">미배정 {stats.unassigned}</span>
          )}
        </div>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">
            {viewMode === "my"
              ? "배정된 실행항목이 없습니다."
              : "조건에 맞는 실행항목이 없습니다."}
          </p>
        </div>
      )}

      {/* 3-column kanban board */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
          {STATUS_ORDER.map((status) => {
            const sectionItems = grouped[status]
            const config = STATUS_CONFIG[status]

            return (
              <div key={status} className="rounded-lg bg-muted/30 border border-border/50">
                {/* Column header */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
                  <div className={`h-3 w-1 rounded-full ${config.color}`} />
                  <h3 className="text-xs font-semibold text-muted-foreground">
                    {config.label}
                  </h3>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal ml-auto">
                    {sectionItems.length}
                  </Badge>
                </div>

                {/* Cards stack */}
                <div className="p-2 space-y-2 min-h-[80px]">
                  {sectionItems.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground/60 text-center py-4">
                      없음
                    </p>
                  ) : (
                    sectionItems.map((item) => (
                      <ActionItemCard
                        key={item.id}
                        item={item}
                        {...sharedCardProps}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// --- Action Item Card (compact kanban card) ---

function ActionItemCard({
  item,
  employees,
  onToggle,
  onStatusChange,
  onAssigneeToggle,
  onDueDateChange,
  onDelete,
  onMeetingClick,
}: {
  item: ActionItemWithMeeting
  employees: Employee[]
  onToggle: (item: MeetingActionItem) => void
  onStatusChange: (id: string, status: ActionItemStatus) => void
  onAssigneeToggle: (actionItemId: string, currentIds: string[], empId: string) => void
  onDueDateChange: (id: string, date: Date | undefined) => void
  onDelete: (id: string) => void
  onMeetingClick: (meetingId: string) => void
}) {
  const assigneeIds = (item.assignees || []).map((a) => a.employee_id)
  const isCompleted = item.status === "completed"
  const nextStatus = getNextStatus(item.status)
  const prevStatus = getPrevStatus(item.status)

  return (
    <div
      className={`group rounded-md border bg-card hover:shadow-sm transition-shadow ${
        isCompleted ? "opacity-50" : ""
      } ${item.priority === "high" ? "border-l-2 border-l-red-500" : ""}`}
    >
      {/* Content row */}
      <div className="flex items-start gap-1.5 px-2.5 pt-2 pb-1">
        <button
          type="button"
          onClick={() => onToggle(item)}
          className="mt-[3px] shrink-0"
          title={isCompleted ? "미완료로 변경" : "완료 처리"}
        >
          <span
            className={`block h-3 w-3 rounded-full border-[1.5px] transition-colors ${
              isCompleted
                ? "bg-emerald-500 border-emerald-500"
                : item.status === "in_progress"
                  ? "border-sky-400 bg-sky-400/20"
                  : "border-gray-300 hover:border-gray-400"
            }`}
          >
            {isCompleted && (
              <svg className="h-full w-full text-white" viewBox="0 0 14 14" fill="none">
                <path d="M3.5 7L6 9.5L10.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
        </button>

        <p
          className={`text-[13px] leading-snug line-clamp-2 flex-1 ${
            isCompleted ? "line-through text-muted-foreground" : "text-foreground"
          }`}
        >
          {item.content}
        </p>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity -mr-1"
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-28">
            {(["pending", "in_progress", "completed", "cancelled"] as ActionItemStatus[]).map(
              (s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => onStatusChange(item.id, s)}
                  className="text-xs"
                  disabled={item.status === s}
                >
                  {statusLabels[s]}
                </DropdownMenuItem>
              )
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(item.id)}
              className="text-xs text-destructive"
            >
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-1 px-2.5 pb-2 flex-wrap">
        <button
          type="button"
          onClick={() => onMeetingClick(item.meeting_id)}
          className="text-[10px] text-muted-foreground hover:text-foreground hover:underline truncate max-w-[120px]"
        >
          {item.meeting_title}
        </button>

        <DueDatePicker
          dueDate={item.due_date}
          dueDateRaw={item.due_date_raw}
          isCompleted={isCompleted}
          onDateChange={(date) => onDueDateChange(item.id, date)}
        />

        <AssigneePopover
          employees={employees}
          selectedIds={assigneeIds}
          onToggle={(empId) => onAssigneeToggle(item.id, assigneeIds, empId)}
        />

        {/* Status ← → */}
        {!isCompleted && (
          <div className="ml-auto flex items-center">
            <button
              type="button"
              onClick={() => prevStatus && onStatusChange(item.id, prevStatus)}
              disabled={!prevStatus}
              className="rounded p-0.5 hover:bg-muted disabled:opacity-15 transition-colors"
            >
              <ChevronLeft className="h-2.5 w-2.5" />
            </button>
            <button
              type="button"
              onClick={() => nextStatus && onStatusChange(item.id, nextStatus)}
              disabled={!nextStatus}
              className="rounded p-0.5 hover:bg-muted disabled:opacity-15 transition-colors"
            >
              <ChevronsRight className="h-2.5 w-2.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
