'use client'

import React, { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Edit, Trash2, UserCheck, Calendar, Eye } from "lucide-react"
import { MemoDetailModal } from "./MemoDetailModal"
import type { Database } from "@/types/database"

type EntranceTest = Database['public']['Tables']['entrance_tests']['Row']

export interface EntranceTestData extends EntranceTest {
  student_name?: string
  calendar_event_id?: string | null  // 로컬 calendar_events 테이블 참조
}

interface EntranceTestTableProps {
  entranceTests: EntranceTestData[]
  onEdit?: (test: EntranceTestData) => void
  onDelete?: (testId: number) => void
  onEnrollmentDecision?: (testId: number) => void
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

const formatTestDate = (dateString: string | null) => {
  if (!dateString) return '-'
  // 한국시간으로 직접 파싱
  const dateStr = dateString.slice(0, 19)
  const datePart = dateStr.slice(0, 10)
  const timePart = dateStr.slice(11, 16)
  
  const [year, month, day] = datePart.split('-')
  return `${month}/${day} ${timePart}`
}

const formatTestLevel = (level: string | null) => {
  if (!level) return '-'
  return level
}

const formatTestResult = (result: string | null) => {
  if (!result) return '-'
  switch (result) {
    case '합격':
      return <Badge className="bg-green-100 text-green-800 text-xs">합격</Badge>
    case '불합격':
      return <Badge className="bg-red-100 text-red-800 text-xs">불합격</Badge>
    default:
      return '-'
  }
}

export function EntranceTestTable({
  entranceTests,
  onEdit,
  onDelete,
  onEnrollmentDecision
}: EntranceTestTableProps) {
  const [memoModalOpen, setMemoModalOpen] = useState(false)
  const [selectedMemo, setSelectedMemo] = useState<{ title: string; content: string | null }>({ 
    title: '', 
    content: null 
  })

  const handleMemoClick = (studentName: string | undefined, memo: string | null) => {
    setSelectedMemo({ title: `${studentName || '미지정'} - 입학테스트 메모`, content: memo })
    setMemoModalOpen(true)
  }

  if (entranceTests.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        입학테스트 데이터가 없습니다
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table className="w-full">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[80px]">학생</TableHead>
            <TableHead className="w-[100px]">테스트일</TableHead>
            <TableHead className="w-[80px]">레벨</TableHead>
            <TableHead className="w-[60px]">점수</TableHead>
            <TableHead className="w-[70px]">결과</TableHead>
            <TableHead className="w-[90px]">상태</TableHead>
            <TableHead className="w-[40px]">메모</TableHead>
            <TableHead className="w-[50px] text-right">관리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entranceTests.map((test) => (
            <TableRow key={test.id} className="hover:bg-gray-50/50">
              <TableCell className="font-medium text-sm">
                {test.student_name || '미지정'}
              </TableCell>
              <TableCell className="text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatTestDate(test.test_date)}
                </div>
              </TableCell>
              <TableCell className="text-sm">
                <div className="space-y-0.5">
                  {test.test1_level && (
                    <div className="text-xs">1: {formatTestLevel(test.test1_level)}</div>
                  )}
                  {test.test2_level && (
                    <div className="text-xs text-gray-500">2: {formatTestLevel(test.test2_level)}</div>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-sm">
                <div className="space-y-0.5">
                  {test.test1_score !== null && (
                    <div className="text-xs font-medium">{test.test1_score}점</div>
                  )}
                  {test.test2_score !== null && (
                    <div className="text-xs text-gray-500">{test.test2_score}점</div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {formatTestResult(test.test_result)}
              </TableCell>
              <TableCell>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${getTestStatusColor(test.status || '')}`}
                >
                  {test.status}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <button
                  onClick={() => handleMemoClick(test.student_name, test.notes)}
                  className="inline-flex items-center justify-center p-1 hover:bg-gray-100 rounded"
                >
                  <Eye 
                    className={`h-4 w-4 ${test.notes ? 'text-blue-600' : 'text-gray-400'}`}
                  />
                </button>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(test)}>
                        <Edit className="mr-2 h-4 w-4" />
                        수정
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem 
                        onClick={() => onDelete(test.id)} 
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        삭제
                      </DropdownMenuItem>
                    )}
                    {onEnrollmentDecision && test.status === '결과상담완료' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onEnrollmentDecision(test.id)}>
                          <UserCheck className="mr-2 h-4 w-4" />
                          등록결정
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      <MemoDetailModal
        open={memoModalOpen}
        onOpenChange={setMemoModalOpen}
        title={selectedMemo.title}
        content={selectedMemo.content}
      />
    </div>
  )
}