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
import { Checkbox } from "@/components/ui/checkbox"
import { Check, ChevronsUpDown, Users, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Student {
  id: string
  name: string
  grade: number | null
  school: string | null
  status: string
  parent_phone: string | null
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
    student_names?: string[] | null
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
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [suggestedSiblings, setSuggestedSiblings] = useState<Student[]>([])
  const [isStudentSelectorOpen, setIsStudentSelectorOpen] = useState(false)
  const [studentSearchValue, setStudentSearchValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [studentsLoading, setStudentsLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      loadStudents()
      setSelectedStudentIds([])
      setSuggestedSiblings([])
    }
  }, [isOpen])

  useEffect(() => {
    // Pre-select students if student_names match
    if (students.length > 0) {
      const namesToMatch = approval.student_names || (approval.student_name ? [approval.student_name] : [])
      if (namesToMatch.length > 0) {
        const matchingIds = students
          .filter(s => namesToMatch.includes(s.name))
          .map(s => s.id)
        if (matchingIds.length > 0) {
          setSelectedStudentIds(matchingIds)
        }
      }
    }
  }, [approval.student_name, approval.student_names, students])

  // Auto-suggest siblings based on parent_phone when students are selected
  useEffect(() => {
    if (selectedStudentIds.length > 0 && students.length > 0) {
      // Get all parent_phones from selected students
      const selectedStudents = students.filter(s => selectedStudentIds.includes(s.id))
      const parentPhones = selectedStudents
        .map(s => s.parent_phone)
        .filter((phone): phone is string => !!phone)

      if (parentPhones.length > 0) {
        // Find all siblings with same parent_phone that aren't already selected
        const siblings = students.filter(
          s => s.parent_phone &&
               parentPhones.includes(s.parent_phone) &&
               !selectedStudentIds.includes(s.id)
        )
        setSuggestedSiblings(siblings)
      } else {
        setSuggestedSiblings([])
      }
    } else {
      setSuggestedSiblings([])
    }
  }, [selectedStudentIds, students])

  const loadStudents = async () => {
    setStudentsLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from("students")
      .select("id, name, grade, school, status, parent_phone")
      .in("status", ["재원", "퇴원"])
      .order("status", { ascending: true })
      .order("name", { ascending: true })

    if (error) {
      console.error("Failed to load students:", error)
      toast.error("학생 목록을 불러오는데 실패했습니다")
      setStudents([])
    } else {
      setStudents(data || [])
    }
    setStudentsLoading(false)
  }

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId)
      }
      if (prev.length >= 3) {
        toast.error("최대 3명까지 연결할 수 있습니다")
        return prev
      }
      return [...prev, studentId]
    })
  }

  const addSuggestedSibling = (studentId: string) => {
    if (selectedStudentIds.length >= 3) {
      toast.error("최대 3명까지 연결할 수 있습니다")
      return
    }
    setSelectedStudentIds(prev => [...prev, studentId])
  }

  const handleApprove = async () => {
    if (selectedStudentIds.length === 0) {
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

      // Update profiles with role, approval_status, and student_id if user exists
      if (approval.user_id) {
        // First student is primary - set to profiles.student_id for RLS
        const primaryStudentId = selectedStudentIds[0]

        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            approval_status: "approved",
            role: approval.role,
            student_id: primaryStudentId, // Required for RLS policy
          })
          .eq("id", approval.user_id)

        if (profileError) {
          throw profileError
        }

        // Insert into profile_students (1:N relationship)
        const profileStudentsData = selectedStudentIds.map((studentId, index) => ({
          profile_id: approval.user_id,
          student_id: studentId,
          is_primary: index === 0, // First selected student is primary
        }))

        const { error: profileStudentsError } = await supabase
          .from("profile_students")
          .insert(profileStudentsData)

        if (profileStudentsError) {
          throw profileStudentsError
        }
      }

      const studentCount = selectedStudentIds.length
      toast.success(`${approval.role === "student" ? "학생" : "학부모"} 계정이 승인되었습니다 (${studentCount}명 연결)`)
      setLoading(false)
      onSuccess()
    } catch (error: any) {
      console.error("Approval failed:", error)
      toast.error("승인에 실패했습니다: " + (error.message || ""))
      setLoading(false)
    }
  }

  const selectedStudents = students.filter(s => selectedStudentIds.includes(s.id))

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
              {(approval.student_names?.length || approval.student_name) && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">신청 학생:</span>
                  <span className="font-medium text-primary">
                    {approval.student_names?.join(", ") || approval.student_name}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Student Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>연결할 학생 * (최대 3명)</Label>
              {selectedStudentIds.length > 0 && (
                <Badge variant="secondary">{selectedStudentIds.length}명 선택</Badge>
              )}
            </div>

            {/* Selected Students Display */}
            {selectedStudents.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedStudents.map((student, index) => (
                  <Badge
                    key={student.id}
                    variant={index === 0 ? "default" : "secondary"}
                    className="flex items-center gap-1 px-3 py-1"
                  >
                    {index === 0 && <span className="text-[10px] mr-1">대표</span>}
                    {student.name} ({student.school?.replace(/학교$/, "") || ""}{student.grade || ""})
                    <button
                      type="button"
                      onClick={() => toggleStudent(student.id)}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Suggested Siblings */}
            {suggestedSiblings.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">형제/자매 발견 (같은 학부모 연락처)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestedSiblings.map((sibling) => (
                    <Button
                      key={sibling.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-blue-300 hover:bg-blue-100"
                      onClick={() => addSuggestedSibling(sibling.id)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {sibling.name} ({sibling.school?.replace(/학교$/, "") || ""}{sibling.grade || ""})
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Student Selector */}
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
                    : selectedStudentIds.length === 0
                    ? "학생 선택..."
                    : "학생 추가 선택..."}
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
                      {filteredStudents.map((student) => {
                        const isSelected = selectedStudentIds.includes(student.id)
                        return (
                          <CommandItem
                            key={student.id}
                            value={student.name}
                            onSelect={() => {
                              toggleStudent(student.id)
                              setStudentSearchValue("")
                            }}
                          >
                            <Checkbox
                              checked={isSelected}
                              className="mr-2"
                            />
                            {student.name} ({student.school?.replace(/학교$/, "") || ""}{student.grade || ""}) - {student.status}
                          </CommandItem>
                        )
                      })}
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
          <Button onClick={handleApprove} disabled={loading || selectedStudentIds.length === 0}>
            {loading ? "처리 중..." : `승인 (${selectedStudentIds.length}명 연결)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
