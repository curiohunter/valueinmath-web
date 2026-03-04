"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  ListTodo,
  Plus,
  Trash2,
  Check,
  CalendarDays,
  Users,
  ArrowUp,
  Minus,
  ArrowDown,
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import {
  addMeetingActionItem,
  updateMeetingActionItem,
  toggleActionItemStatus,
  deleteMeetingActionItem,
  setActionItemAssignees,
} from "@/services/meeting-service"
import type { MeetingActionItem, ActionItemStatus, ActionItemPriority } from "@/types/meeting"

interface MeetingActionItemsCardProps {
  meetingId: string
  actionItems: MeetingActionItem[]
  onUpdate: () => void
}

interface Employee {
  id: string
  name: string
}

const statusLabels: Record<ActionItemStatus, string> = {
  pending: "대기",
  in_progress: "진행중",
  completed: "완료",
  cancelled: "취소",
}

const priorityConfig: Record<ActionItemPriority, { label: string; icon: React.ReactNode; color: string }> = {
  high: { label: "높음", icon: <ArrowUp className="h-3 w-3" />, color: "text-red-600" },
  medium: { label: "보통", icon: <Minus className="h-3 w-3" />, color: "text-amber-600" },
  low: { label: "낮음", icon: <ArrowDown className="h-3 w-3" />, color: "text-blue-600" },
}

export function MeetingActionItemsCard({
  meetingId,
  actionItems,
  onUpdate,
}: MeetingActionItemsCardProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [adding, setAdding] = useState(false)
  const [newContent, setNewContent] = useState("")
  const [newAssigneeIds, setNewAssigneeIds] = useState<string[]>([])
  const [newDueDate, setNewDueDate] = useState("")

  useEffect(() => {
    const loadEmployees = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("employees")
        .select("id, name")
        .eq("status", "재직")
        .order("name")
      setEmployees(data || [])
    }
    loadEmployees()
  }, [])

  const handleToggle = async (item: MeetingActionItem) => {
    try {
      await toggleActionItemStatus(item.id, item.status)
      onUpdate()
    } catch (error: any) {
      toast.error(`상태 변경 실패: ${error.message}`)
    }
  }

  const handleStatusChange = async (id: string, status: ActionItemStatus) => {
    try {
      await updateMeetingActionItem(id, { status })
      onUpdate()
    } catch (error: any) {
      toast.error(`상태 변경 실패: ${error.message}`)
    }
  }

  const handleAssigneeToggle = async (actionItemId: string, currentAssigneeIds: string[], employeeId: string) => {
    try {
      const newIds = currentAssigneeIds.includes(employeeId)
        ? currentAssigneeIds.filter((id) => id !== employeeId)
        : [...currentAssigneeIds, employeeId]
      await setActionItemAssignees(actionItemId, newIds)
      onUpdate()
    } catch (error: any) {
      toast.error(`담당자 변경 실패: ${error.message}`)
    }
  }

  const handleAdd = async () => {
    if (!newContent.trim()) return
    try {
      await addMeetingActionItem(meetingId, {
        content: newContent.trim(),
        assignee_ids: newAssigneeIds.length > 0 ? newAssigneeIds : undefined,
        due_date: newDueDate || undefined,
      })
      setNewContent("")
      setNewAssigneeIds([])
      setNewDueDate("")
      setAdding(false)
      toast.success("실행항목이 추가되었습니다.")
      onUpdate()
    } catch (error: any) {
      toast.error(`추가 실패: ${error.message}`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("이 실행항목을 삭제하시겠습니까?")) return
    try {
      await deleteMeetingActionItem(id)
      toast.success("삭제되었습니다.")
      onUpdate()
    } catch (error: any) {
      toast.error(`삭제 실패: ${error.message}`)
    }
  }

  const completedCount = actionItems.filter((i) => i.status === "completed").length

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ListTodo className="h-4 w-4" />
          <span className="flex-1">
            실행항목 ({actionItems.length})
          </span>
          {completedCount > 0 && (
            <span className="text-xs text-muted-foreground font-normal">
              {completedCount}개 완료
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actionItems.length === 0 && !adding && (
          <p className="text-xs text-muted-foreground text-center py-4">
            실행항목이 없습니다.
          </p>
        )}

        {actionItems.map((item) => {
          const assigneeIds = (item.assignees || []).map((a) => a.employee_id)

          return (
            <div
              key={item.id}
              className={`border rounded-lg p-2.5 space-y-1.5 ${
                item.status === "completed" ? "opacity-50" : ""
              }`}
            >
              {/* Content row */}
              <div className="flex items-start gap-2">
                <Checkbox
                  checked={item.status === "completed"}
                  onCheckedChange={() => handleToggle(item)}
                  className="mt-0.5"
                />
                <p
                  className={`text-sm leading-relaxed flex-1 ${
                    item.status === "completed" ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {item.content}
                </p>
                {item.priority && item.priority !== "medium" && (
                  <span className={priorityConfig[item.priority].color}>
                    {priorityConfig[item.priority].icon}
                  </span>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-destructive shrink-0"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-1.5 pl-6 flex-wrap">
                <Select
                  value={item.status}
                  onValueChange={(v) => handleStatusChange(item.id, v as ActionItemStatus)}
                >
                  <SelectTrigger className="h-6 w-20 text-[11px] border-none bg-muted/50 px-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value} className="text-xs">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* 다중 담당자 — Popover 토글 */}
                <AssigneePopover
                  employees={employees}
                  selectedIds={assigneeIds}
                  onToggle={(empId) => handleAssigneeToggle(item.id, assigneeIds, empId)}
                />

                {(item.due_date || item.due_date_raw) && (
                  <Badge variant="outline" className="text-[10px] gap-0.5 h-5 px-1.5">
                    <CalendarDays className="h-2.5 w-2.5" />
                    {item.due_date
                      ? new Date(item.due_date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
                      : item.due_date_raw}
                  </Badge>
                )}
              </div>
            </div>
          )
        })}

        {/* Add form */}
        {adding ? (
          <div className="border border-dashed rounded-lg p-2.5 space-y-2">
            <Textarea
              placeholder="실행항목 내용..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={2}
              className="text-sm"
              autoFocus
            />
            <div className="space-y-1.5">
              <label className="text-[11px] text-muted-foreground">담당자 선택</label>
              <div className="flex gap-1 flex-wrap">
                {employees.map((emp) => {
                  const selected = newAssigneeIds.includes(emp.id)
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() =>
                        setNewAssigneeIds((prev) =>
                          selected
                            ? prev.filter((id) => id !== emp.id)
                            : [...prev, emp.id]
                        )
                      }
                      className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors ${
                        selected
                          ? "bg-blue-100 text-blue-700 border-blue-300"
                          : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {emp.name}
                    </button>
                  )
                })}
              </div>
            </div>
            <Input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="h-7 w-32 text-xs"
            />
            <div className="flex gap-1.5">
              <Button size="sm" className="h-7 text-xs" onClick={handleAdd}>
                <Check className="h-3 w-3 mr-1" /> 추가
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => { setAdding(false); setNewContent(""); setNewAssigneeIds([]) }}
              >
                취소
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={() => setAdding(true)}
          >
            <Plus className="h-3 w-3 mr-1" /> 실행항목 추가
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// --- 담당자 Popover (기존 항목용 + 실행항목 리스트에서도 재사용) ---

export interface AssigneePopoverEmployee {
  id: string
  name: string
}

export function AssigneePopover({
  employees,
  selectedIds,
  onToggle,
}: {
  employees: AssigneePopoverEmployee[]
  selectedIds: string[]
  onToggle: (employeeId: string) => void
}) {
  const selectedNames = employees
    .filter((e) => selectedIds.includes(e.id))
    .map((e) => e.name)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-0.5 h-6 px-1.5 rounded bg-muted/50 text-[11px] hover:bg-muted transition-colors"
        >
          <Users className="h-2.5 w-2.5" />
          {selectedNames.length > 0 ? (
            <span className="max-w-[100px] truncate">
              {selectedNames.join(", ")}
            </span>
          ) : (
            <span className="text-muted-foreground">담당자</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground mb-1.5">담당자 선택 (다중)</p>
          {employees.map((emp) => {
            const selected = selectedIds.includes(emp.id)
            return (
              <button
                key={emp.id}
                type="button"
                onClick={() => onToggle(emp.id)}
                className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${
                  selected
                    ? "bg-blue-100 text-blue-700"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                {selected && <Check className="h-3 w-3 inline mr-1" />}
                {emp.name}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
