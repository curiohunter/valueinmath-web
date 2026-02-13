"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Pencil, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { Student } from "@/types/student"

const StudentFormModal = dynamic(
  () => import("@/components/students/student-form-modal").then((m) => ({ default: m.StudentFormModal })),
  { ssr: false }
)

interface StudentDetailHeaderProps {
  student: Student
  onBack?: () => void
  showBackButton?: boolean
  onStudentUpdated: () => void
  onStudentDeleted: () => void
}

export function StudentDetailHeader({
  student,
  onBack,
  showBackButton,
  onStudentUpdated,
  onStudentDeleted,
}: StudentDetailHeaderProps) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("students")
        .update({ is_active: false })
        .eq("id", student.id)

      if (error) throw error
      toast.success(`${student.name} 학생이 삭제되었습니다.`)
      onStudentDeleted()
    } catch (error) {
      console.error("Failed to delete student:", error)
      toast.error("학생 삭제에 실패했습니다.")
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const statusColors: Record<string, string> = {
    "재원": "bg-green-50 text-green-700 border-green-200",
    "퇴원": "bg-gray-50 text-gray-500 border-gray-200",
    "휴원": "bg-yellow-50 text-yellow-700 border-yellow-200",
    "미등록": "bg-blue-50 text-blue-700 border-blue-200",
    "신규상담": "bg-purple-50 text-purple-700 border-purple-200",
  }

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 border-b">
        {showBackButton && (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold truncate">{student.name}</h2>
            <Badge variant="outline" className={statusColors[student.status] || ""}>
              {student.status}
            </Badge>
            {student.department && (
              <Badge variant="outline" className="text-xs">
                {student.department}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="sm" className="h-8" onClick={() => setIsEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1" />
            수정
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-destructive hover:text-destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            삭제
          </Button>
        </div>
      </div>

      {isEditOpen && (
        <StudentFormModal
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          student={student as any}
          onSuccess={() => {
            setIsEditOpen(false)
            onStudentUpdated()
          }}
        />
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>학생 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{student.name}</strong> 학생을 삭제하시겠습니까? 삭제된 학생은 비활성 처리됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
