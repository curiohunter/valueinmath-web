'use client'

import React, { memo } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, MoreHorizontal, Edit, Trash2, Phone, Plus } from "lucide-react"
import type { Database } from "@/types/database"
import { formatSchoolGrade } from "@/lib/schools/format"

type Student = Database['public']['Tables']['students']['Row']

interface ConsultationCardProps {
  student: Student
  isExpanded?: boolean
  onToggle?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onCreateTest?: (studentId: string) => void
  className?: string
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "재원":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
    case "퇴원":
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    case "휴원":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
    case "미등록":
      return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
    case "신규상담":
      return "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
  }
}

const getIndicatorColor = (status: string) => {
  switch (status) {
    case "재원":
      return "#10b981" // emerald-500
    case "퇴원":
      return "#6b7280" // gray-500
    case "휴원":
      return "#f59e0b" // amber-500
    case "미등록":
      return "#64748b" // slate-500
    case "신규상담":
      return "#8b5cf6" // violet-500
    default:
      return "#6b7280" // gray-500
  }
}

const ConsultationCard = memo<ConsultationCardProps>(({
  student,
  isExpanded = false,
  onToggle,
  onEdit,
  onDelete,
  onCreateTest,
  className = ""
}) => {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <Card className={`transition-all duration-200 hover:shadow-md overflow-hidden ${className}`}>
        <div 
          className="h-1 w-full" 
          style={{ backgroundColor: getIndicatorColor(student.status) }}
        />
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">{student.name}</span>
                    <Badge variant="secondary" className={getStatusColor(student.status)}>
                      {student.status}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-1">
                    {onCreateTest && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          onCreateTest(student.id)
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={onEdit}>
                          <Edit className="mr-2 h-4 w-4" />
                          수정
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onDelete} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                <div className="space-y-1 text-xs text-muted-foreground">
                  {student.parent_phone && (
                    <div className="flex items-center space-x-1">
                      <Phone className="h-3 w-3" />
                      <span>{student.parent_phone}</span>
                    </div>
                  )}
                  {(student.school || student.grade) && (
                    <div>{formatSchoolGrade(student.school, student.grade)}</div>
                  )}
                </div>

                <CollapsibleContent>
                  <div className="mt-3 pt-3 border-t space-y-2">
                    {student.notes && (
                      <div className="text-xs">
                        <span className="font-medium text-muted-foreground">상담 내용:</span>
                        <p className="mt-1 text-muted-foreground">{student.notes}</p>
                      </div>
                    )}
                    {student.lead_source && (
                      <div className="text-xs">
                        <span className="font-medium text-muted-foreground">유입 경로:</span>
                        <span className="ml-1 text-muted-foreground">{student.lead_source}</span>
                      </div>
                    )}
                    {student.first_contact_date && (
                      <div className="text-xs">
                        <span className="font-medium text-muted-foreground">첫 상담일:</span>
                        <span className="ml-1 text-muted-foreground">
                          {new Date(student.first_contact_date).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
          </CardContent>
        </CollapsibleTrigger>
      </Card>
    </Collapsible>
  )
})

ConsultationCard.displayName = 'ConsultationCard'

export default ConsultationCard