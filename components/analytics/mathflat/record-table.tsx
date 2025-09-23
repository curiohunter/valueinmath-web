"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit2, Trash2 } from "lucide-react"

import type { MathflatRecord } from "@/lib/mathflat/types"

interface RecordTableProps {
  records: MathflatRecord[]
  loading: boolean
  onEdit: (record: MathflatRecord) => void
  onDelete: (recordId: string) => void
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  getTypeColor: (type: string) => string
}

export function RecordTable({
  records,
  loading,
  onEdit,
  onDelete,
  currentPage,
  totalPages,
  onPageChange,
  getTypeColor
}: RecordTableProps) {
  const [itemsPerPage, setItemsPerPage] = useState(20)
  
  // 페이지네이션 계산 - records는 이미 페이지네이션된 데이터


  const getAccuracyColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600 font-semibold'
    if (rate >= 70) return 'text-blue-600'
    if (rate >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return <div className="text-center py-8">로딩 중...</div>
  }

  return (
    <>
      <div className="relative overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>날짜</TableHead>
              <TableHead>학생</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>교재명</TableHead>
              <TableHead className="text-right">푼 문제수</TableHead>
              <TableHead className="text-right">정답</TableHead>
              <TableHead className="text-right">오답</TableHead>
              <TableHead className="text-right">정답률</TableHead>
              <TableHead className="text-center">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  데이터가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => {
                return (
                  <TableRow key={record.id}>
                    <TableCell>
                      {new Date(record.event_date).toLocaleDateString('ko-KR')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {record.student_name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={getTypeColor(record.mathflat_type || '')}>
                        {record.mathflat_type || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {record.book_title || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {record.problem_solved || 0}문제
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {record.correct_count || 0}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {record.wrong_count || 0}
                    </TableCell>
                    <TableCell className={`text-right ${getAccuracyColor(record.correct_rate || 0)}`}>
                      {record.correct_rate || 0}%
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onEdit(record)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          onClick={() => onDelete(record.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* 페이지네이션 */}
      {records.length > 0 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">페이지당</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number(value))
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10개</SelectItem>
                <SelectItem value="20">20개</SelectItem>
                <SelectItem value="50">50개</SelectItem>
                <SelectItem value="100">100개</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-gray-600">
            {currentPage} / {totalPages} 페이지
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
            >
              처음
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              이전
            </Button>
            
            {/* 페이지 번호 표시 */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(pageNum)}
                    className="min-w-[32px]"
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              다음
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              마지막
            </Button>
          </div>
        </div>
      )}
    </>
  )
}