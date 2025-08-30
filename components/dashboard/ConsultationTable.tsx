'use client'

import React, { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Edit, Trash2, Plus, Phone, Eye } from "lucide-react"
import { MemoDetailModal } from "./MemoDetailModal"
import type { Database } from "@/types/database"

type Student = Database['public']['Tables']['students']['Row']

interface ConsultationTableProps {
  consultations: Student[]
  onEdit?: (consultation: Student) => void
  onDelete?: (consultationId: string) => void
  onCreateTest?: (studentId: string) => void
}

const formatPhoneNumber = (phone: string | null) => {
  if (!phone) return '-'
  // 전화번호 포맷팅 (예: 010-1234-5678)
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`
  }
  return phone
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const formatSchoolGrade = (school: string | null, grade: number | null) => {
  if (!school && !grade) return '-'
  const schoolName = school ? school.replace(/학교$/, '') : ''
  return `${schoolName} ${grade || ''}`
}

export function ConsultationTable({
  consultations,
  onEdit,
  onDelete,
  onCreateTest
}: ConsultationTableProps) {
  const [memoModalOpen, setMemoModalOpen] = useState(false)
  const [selectedMemo, setSelectedMemo] = useState<{ title: string; content: string | null }>({ 
    title: '', 
    content: null 
  })

  const handleMemoClick = (name: string, memo: string | null) => {
    setSelectedMemo({ title: `${name} - 메모`, content: memo })
    setMemoModalOpen(true)
  }

  if (consultations.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        신규상담 데이터가 없습니다
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table className="w-full">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[80px]">이름</TableHead>
            <TableHead className="w-[100px]">학교/학년</TableHead>
            <TableHead className="w-[120px]">연락처</TableHead>
            <TableHead className="w-[80px]">상담일</TableHead>
            <TableHead className="w-[40px]">메모</TableHead>
            <TableHead className="w-[50px] text-right">관리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {consultations.map((consultation) => (
            <TableRow key={consultation.id} className="hover:bg-gray-50/50">
              <TableCell className="font-medium text-sm">
                {consultation.name}
              </TableCell>
              <TableCell className="text-sm text-gray-600">
                {formatSchoolGrade(consultation.school, consultation.grade)}
              </TableCell>
              <TableCell className="text-xs">
                {consultation.parent_phone && (
                  <a 
                    href={`tel:${consultation.parent_phone}`}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                  >
                    <Phone className="h-3 w-3" />
                    {formatPhoneNumber(consultation.parent_phone)}
                  </a>
                )}
              </TableCell>
              <TableCell className="text-sm text-gray-600">
                {formatDate(consultation.first_contact_date)}
              </TableCell>
              <TableCell className="text-center">
                <button
                  onClick={() => handleMemoClick(consultation.name, consultation.notes)}
                  className="inline-flex items-center justify-center p-1 hover:bg-gray-100 rounded"
                >
                  <Eye 
                    className={`h-4 w-4 ${consultation.notes ? 'text-blue-600' : 'text-gray-400'}`}
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
                    {onCreateTest && (
                      <DropdownMenuItem onClick={() => onCreateTest(consultation.id)}>
                        <Plus className="mr-2 h-4 w-4" />
                        입학테스트 생성
                      </DropdownMenuItem>
                    )}
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(consultation)}>
                        <Edit className="mr-2 h-4 w-4" />
                        수정
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem 
                        onClick={() => onDelete(consultation.id)} 
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        삭제
                      </DropdownMenuItem>
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