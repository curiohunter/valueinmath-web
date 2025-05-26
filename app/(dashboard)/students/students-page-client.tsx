"use client"
import { Suspense, useState } from "react"
import { StudentsHeader } from "./students-header"
import { StudentsFilters } from "./students-filters"
import { StudentsTable } from "./students-table"
import { Card, CardContent } from "@/components/ui/card"
import { StudentFormModal } from "./student-form-modal"

export function StudentsPageClient() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="space-y-6">
      <StudentsHeader />
      <Card className="overflow-hidden">
        <StudentsFilters onNewStudent={() => setIsModalOpen(true)} />
        <CardContent className="p-0">
          <Suspense fallback={<TableSkeleton />}>
            <StudentsTable />
          </Suspense>
        </CardContent>
      </Card>
      {isModalOpen && <StudentFormModal open={isModalOpen} onOpenChange={setIsModalOpen} />}
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <div className="space-y-2">
        <div className="h-4 w-full bg-gray-200 rounded" />
        <div className="h-4 w-full bg-gray-200 rounded" />
        <div className="h-4 w-full bg-gray-200 rounded" />
        <div className="h-4 w-full bg-gray-200 rounded" />
        <div className="h-4 w-full bg-gray-200 rounded" />
      </div>
    </div>
  )
} 