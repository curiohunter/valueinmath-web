'use client'

import { useState } from "react"
import { StudentManagementList } from "@/components/dashboard/student-management-list"
import { PortalView } from "@/components/portal/portal-view"

interface StudentManagementTabProps {
  employeeId: string | null
}

export function StudentManagementTab({ employeeId }: StudentManagementTabProps) {
  const [selectedStudentForComment, setSelectedStudentForComment] = useState<any>(null)
  const [commentYear, setCommentYear] = useState(new Date().getFullYear())
  const [commentMonth, setCommentMonth] = useState(new Date().getMonth() + 1)
  const [commentListRefreshTrigger, setCommentListRefreshTrigger] = useState(0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 좌측: 학생 목록 (50%) */}
      <div>
        <StudentManagementList
          selectedYear={commentYear}
          selectedMonth={commentMonth}
          selectedStudentId={selectedStudentForComment?.id}
          onStudentSelect={(student) => {
            setSelectedStudentForComment(student)
          }}
          onYearMonthChange={(year, month) => {
            setCommentYear(year)
            setCommentMonth(month)
          }}
          onRefresh={() => {
            setCommentListRefreshTrigger(prev => prev + 1)
          }}
          refreshTrigger={commentListRefreshTrigger}
        />
      </div>

      {/* 우측: 포털 뷰 (50%) */}
      <div>
        {selectedStudentForComment ? (
          <PortalView
            studentId={selectedStudentForComment.id}
            viewerRole="employee"
            employeeId={employeeId || undefined}
            onRefresh={() => {
              // 목록 새로고침
              setCommentListRefreshTrigger(prev => prev + 1)
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-[60vh] border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">좌측에서 학생을 선택하세요</p>
              <p className="text-sm text-muted-foreground">
                학생의 전체 포털 뷰가 여기에 표시됩니다
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
