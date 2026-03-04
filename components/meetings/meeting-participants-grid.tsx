"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Users, Plus, X } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import {
  addMeetingParticipant,
  deleteMeetingParticipant,
} from "@/services/meeting-service"
import type { MeetingParticipant } from "@/types/meeting"
import { cn } from "@/lib/utils"

interface MeetingParticipantsGridProps {
  meetingId: string
  participants: MeetingParticipant[]
  onUpdate: () => void
}

interface Employee {
  id: string
  name: string
}

export function MeetingParticipantsGrid({
  meetingId,
  participants,
  onUpdate,
}: MeetingParticipantsGridProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [addingExternal, setAddingExternal] = useState(false)
  const [externalName, setExternalName] = useState("")

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

  const participantEmployeeIds = new Set(
    participants.filter((p) => p.employee_id).map((p) => p.employee_id)
  )

  const handleToggleEmployee = async (employee: Employee) => {
    const existing = participants.find((p) => p.employee_id === employee.id)

    if (existing) {
      // Remove
      try {
        await deleteMeetingParticipant(existing.id)
        onUpdate()
      } catch (error: any) {
        toast.error(`삭제 실패: ${error.message}`)
      }
    } else {
      // Add
      try {
        await addMeetingParticipant(meetingId, {
          employee_id: employee.id,
          name: employee.name,
          is_external: false,
        })
        onUpdate()
      } catch (error: any) {
        toast.error(`추가 실패: ${error.message}`)
      }
    }
  }

  const handleAddExternal = async () => {
    if (!externalName.trim()) return
    try {
      await addMeetingParticipant(meetingId, {
        name: externalName.trim(),
        is_external: true,
      })
      setExternalName("")
      setAddingExternal(false)
      toast.success("외부 참석자가 추가되었습니다.")
      onUpdate()
    } catch (error: any) {
      toast.error(`추가 실패: ${error.message}`)
    }
  }

  const handleRemoveExternal = async (id: string) => {
    try {
      await deleteMeetingParticipant(id)
      onUpdate()
    } catch (error: any) {
      toast.error(`삭제 실패: ${error.message}`)
    }
  }

  const externalParticipants = participants.filter((p) => p.is_external)
  const selectedCount = participants.length

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4" />
          참석자 ({selectedCount}명)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Employee grid - click to toggle */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-1.5">
          {employees.map((emp) => {
            const isSelected = participantEmployeeIds.has(emp.id)
            return (
              <button
                key={emp.id}
                onClick={() => handleToggleEmployee(emp)}
                className={cn(
                  "px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all min-h-[36px]",
                  isSelected
                    ? "bg-blue-100 text-blue-700 border-blue-300 shadow-sm"
                    : "bg-white text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600"
                )}
              >
                {emp.name}
                {isSelected && " \u2713"}
              </button>
            )
          })}
        </div>

        {/* External participants */}
        {externalParticipants.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">외부 참석자</p>
            <div className="flex flex-wrap gap-1.5">
              {externalParticipants.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"
                >
                  {p.name}
                  <button
                    onClick={() => handleRemoveExternal(p.id)}
                    className="hover:bg-amber-200 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Add external */}
        {addingExternal ? (
          <div className="flex gap-1.5">
            <Input
              placeholder="이름 입력..."
              value={externalName}
              onChange={(e) => setExternalName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddExternal()}
              className="h-8 text-xs"
              autoFocus
            />
            <Button size="sm" className="h-8 text-xs shrink-0" onClick={handleAddExternal}>
              추가
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs shrink-0"
              onClick={() => setAddingExternal(false)}
            >
              취소
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-8 text-xs text-muted-foreground"
            onClick={() => setAddingExternal(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            외부 참석자 추가
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
