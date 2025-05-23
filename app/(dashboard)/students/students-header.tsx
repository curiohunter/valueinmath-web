"use client"

import { PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { StudentFormModal } from "./student-form-modal"

export function StudentsHeader() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">학생 관리</h1>
        <p className="text-muted-foreground">학생 정보를 관리하고 새로운 학생을 등록하세요.</p>
      </div>
      <Button onClick={() => setIsModalOpen(true)}>
        <PlusCircle className="mr-2 h-4 w-4" />
        신규 학생 등록
      </Button>

      {isModalOpen && <StudentFormModal open={isModalOpen} onOpenChange={setIsModalOpen} />}
    </div>
  )
}
