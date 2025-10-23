"use client"

import { useState, Suspense } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, UserCheck } from "lucide-react"
import { EmployeesTable } from "./employees-table"
import { EmployeesHeader } from "./employees-header"
import { EmployeesFilters } from "./employees-filters"
import { ParentStudentApprovalSection } from "@/components/employees/parent-student-approval-section"

function TableSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  )
}

export function EmployeesPageClient() {
  const [activeTab, setActiveTab] = useState<string>("employees")

  return (
    <div className="space-y-6">
      <EmployeesHeader />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            직원 관리
          </TabsTrigger>
          <TabsTrigger value="approval" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            학부모/학생 승인
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="mt-6">
          <Card className="overflow-hidden">
            <EmployeesFilters />
            <CardContent className="p-0">
              <Suspense fallback={<TableSkeleton />}>
                <EmployeesTable />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approval" className="mt-6">
          <Suspense fallback={<TableSkeleton />}>
            <ParentStudentApprovalSection />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}
