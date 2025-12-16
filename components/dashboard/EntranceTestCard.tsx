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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, MoreHorizontal, Edit, Trash2, UserCheck } from "lucide-react"
import type { Database } from "@/types/database"

type Student = Database['public']['Tables']['students']['Row']
type EntranceTest = Database['public']['Tables']['entrance_tests']['Row']

interface EntranceTestData extends EntranceTest {
  student_name?: string
}

interface EntranceTestCardProps {
  entranceTest: EntranceTestData
  student?: Student
  isExpanded?: boolean
  onToggle?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onCreateCalendarEvent?: (test: EntranceTestData) => void
  onEnrollmentDecision?: (testId: number) => void
  className?: string
}

const getTestStatusColor = (status: string) => {
  switch (status) {
    case "테스트예정":
      return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300"
    case "결과상담대기":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
    case "결과상담완료":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
  }
}

const getIndicatorColor = (status: string) => {
  switch (status) {
    case "테스트예정":
      return "#0ea5e9" // sky-500
    case "결과상담대기":
      return "#f59e0b" // amber-500
    case "결과상담완료":
      return "#10b981" // emerald-500
    default:
      return "#6b7280" // gray-500
  }
}

const formatTestLevel = (level: string | null) => {
  if (!level) return '-'
  return level
}

const formatTestDate = (dateString: string | null) => {
  if (!dateString) return '-'
  // 한국시간으로 직접 파싱
  const dateStr = dateString.slice(0, 19) // YYYY-MM-DDTHH:mm:ss 부분만
  const datePart = dateStr.slice(0, 10) // YYYY-MM-DD
  const timePart = dateStr.slice(11, 16) // HH:mm
  
  const [year, month, day] = datePart.split('-')
  return `${month}월 ${day}일 ${timePart}`
}

const EntranceTestCard = memo<EntranceTestCardProps>(({
  entranceTest,
  student,
  isExpanded = false,
  onToggle,
  onEdit,
  onDelete,
  onCreateCalendarEvent,
  onEnrollmentDecision,
  className = ""
}) => {
  const studentName = student?.name || entranceTest.student_name || '미지정'
  
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <Card className={`transition-all duration-200 hover:shadow-md overflow-hidden ${className}`}>
        <div 
          className="h-1 w-full" 
          style={{ backgroundColor: getIndicatorColor(entranceTest.status || '') }}
        />
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">{studentName}</span>
                    <Badge variant="secondary" className={getTestStatusColor(entranceTest.status || '')}>
                      {entranceTest.status}
                    </Badge>
                  </div>
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
                      <DropdownMenuSeparator />
                      {onEnrollmentDecision && (
                        <DropdownMenuItem onClick={() => onEnrollmentDecision(entranceTest.id)}>
                          <UserCheck className="mr-2 h-4 w-4" />
                          등록결정
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>테스트 일정: {formatTestDate(entranceTest.test_date)}</div>
                  <div className="flex items-center space-x-2">
                    {entranceTest.test1_level && (
                      <span>1교시: {formatTestLevel(entranceTest.test1_level)}</span>
                    )}
                    {entranceTest.test2_level && (
                      <span>2교시: {formatTestLevel(entranceTest.test2_level)}</span>
                    )}
                  </div>
                </div>

                <CollapsibleContent>
                  <div className="mt-3 pt-3 border-t space-y-2">
                    {(entranceTest.test1_score || entranceTest.test2_score) && (
                      <div className="text-xs space-y-1">
                        <span className="font-medium text-muted-foreground">테스트 점수:</span>
                        <div className="flex space-x-4">
                          {entranceTest.test1_score && (
                            <span>1교시: {entranceTest.test1_score}점</span>
                          )}
                          {entranceTest.test2_score && (
                            <span>2교시: {entranceTest.test2_score}점</span>
                          )}
                        </div>
                      </div>
                    )}
                    {entranceTest.test_result && (
                      <div className="text-xs">
                        <span className="font-medium text-muted-foreground">결과:</span>
                        <Badge variant="outline" className="ml-1">
                          {entranceTest.test_result}
                        </Badge>
                      </div>
                    )}
                    {entranceTest.recommended_class && (
                      <div className="text-xs">
                        <span className="font-medium text-muted-foreground">추천반:</span>
                        <span className="ml-1 text-muted-foreground">{entranceTest.recommended_class}</span>
                      </div>
                    )}
                    {entranceTest.notes && (
                      <div className="text-xs">
                        <span className="font-medium text-muted-foreground">비고:</span>
                        <p className="mt-1 text-muted-foreground">{entranceTest.notes}</p>
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

EntranceTestCard.displayName = 'EntranceTestCard'

export default EntranceTestCard