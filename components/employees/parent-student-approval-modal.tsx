"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Student {
  id: string
  name: string
  grade: number | null
  school: string | null
  status: string
}

interface ParentStudentApprovalModalProps {
  isOpen: boolean
  onClose: () => void
  approval: {
    id: string
    user_id: string | null
    email: string
    name: string
    role: string
    student_name: string | null
  }
  onSuccess: () => void
}

export function ParentStudentApprovalModal({
  isOpen,
  onClose,
  approval,
  onSuccess,
}: ParentStudentApprovalModalProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string>("")
  const [isStudentSelectorOpen, setIsStudentSelectorOpen] = useState(false)
  const [studentSearchValue, setStudentSearchValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [studentsLoading, setStudentsLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      loadStudents()
    }
  }, [isOpen])

  useEffect(() => {
    // Pre-select student if student_name matches
    if (approval.student_name && students.length > 0) {
      const matchingStudent = students.find(s => s.name === approval.student_name)
      if (matchingStudent) {
        setSelectedStudentId(matchingStudent.id)
      }
    }
  }, [approval.student_name, students])

  const loadStudents = async () => {
    setStudentsLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from("students")
      .select("id, name, grade, school, status")
      .in("status", ["재원", "퇴원"])
      .order("status", { ascending: true }) // 재원(ㅈ)이 퇴원(ㅌ)보다 먼저 (ㄱㄴㄷ순)
      .order("name", { ascending: true })   // 그 다음 이름 ㄱㄴㄷ순

    if (error) {
      console.error("Failed to load students:", error)
      toast.error("학생 목록을 불러오는데 실패했습니다")
      setStudents([])
    } else {
      setStudents(data || [])
    }
    setStudentsLoading(false)
  }

  const handleApprove = async () => {
    if (!selectedStudentId) {
      toast.error("연결할 학생을 선택해주세요")
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      // Update pending_registrations status
      const { error: pendingError } = await supabase
        .from("pending_registrations")
        .update({ status: "approved" })
        .eq("id", approval.id)

      if (pendingError) {
        throw pendingError
      }

      // Update profiles with role and student_id if user exists
      if (approval.user_id) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            approval_status: "approved",
            role: approval.role,
            student_id: selectedStudentId,
          })
          .eq("id", approval.user_id)

        if (profileError) {
          throw profileError
        }
      }

      toast.success(`${approval.role === "student" ? "학생" : "학부모"} 계정이 승인되었습니다`)
      setLoading(false)
      onSuccess()
    } catch (error: any) {
      console.error("Approval failed:", error)
      toast.error("승인에 실패했습니다")
      setLoading(false)
    }
  }

  const selectedStudent = students.find((s) => s.id === selectedStudentId)

  // Filter students (already sorted from DB query)
  const filteredStudents = students.filter((student) => {
    if (!studentSearchValue) return true
    return student.name.toLowerCase().includes(studentSearchValue.toLowerCase())
  })

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>학부모/학생 승인</DialogTitle>
          <DialogDescription>
            역할을 선택하고 연결할 학생을 지정해주세요
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* User Info */}
          <div className="space-y-2">
            <div className="text-sm font-medium">계정 정보</div>
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">이름:</span>
                <span className="font-medium">{approval.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">이메일:</span>
                <span>{approval.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">역할:</span>
                <Badge variant={approval.role === "student" ? "default" : "secondary"}>
                  {approval.role === "student" ? "학생" : "학부모"}
                </Badge>
              </div>
              {approval.student_name && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">신청 학생:</span>
                  <span className="font-medium text-primary">{approval.student_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Student Selection */}
          <div className="space-y-3">
            <Label>연결할 학생 *</Label>
            <Popover open={isStudentSelectorOpen} onOpenChange={setIsStudentSelectorOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isStudentSelectorOpen}
                  className="w-full justify-between"
                  disabled={studentsLoading}
                >
                  {studentsLoading
                    ? "로딩 중..."
                    : selectedStudent
                    ? `${selectedStudent.name} (${selectedStudent.school?.replace(/학교$/, "") || ""}${selectedStudent.grade || ""})`
                    : "학생 선택..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="학생 이름 검색..."
                    value={studentSearchValue}
                    onValueChange={setStudentSearchValue}
                  />
                  <CommandList
                    className="max-h-[300px] overflow-y-auto scroll-smooth"
                    onWheel={(e) => {
                      e.stopPropagation()
                    }}
                  >
                    <CommandEmpty>검색 결과가 없습니다</CommandEmpty>
                    <CommandGroup>
                      {filteredStudents.map((student) => (
                        <CommandItem
                          key={student.id}
                          value={student.name}
                          onSelect={() => {
                            setSelectedStudentId(student.id)
                            setIsStudentSelectorOpen(false)
                            setStudentSearchValue("")
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedStudentId === student.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {student.name} ({student.school?.replace(/학교$/, "") || ""}{student.grade || ""}) - {student.status}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            취소
          </Button>
          <Button onClick={handleApprove} disabled={loading || !selectedStudentId}>
            {loading ? "처리 중..." : "승인"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
