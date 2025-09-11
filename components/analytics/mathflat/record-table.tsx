"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit2, Trash2 } from "lucide-react"

interface MathflatRecord {
  id: string
  student_id: string
  date: string
  category: string
  problems_solved: number
  accuracy_rate: number
  student?: {
    name: string
    school: string
    grade: number
    class_students?: Array<{
      classes?: {
        name: string
      }
    }>
  }
}

interface RecordTableProps {
  records: MathflatRecord[]
  loading: boolean
  onEdit: (record: MathflatRecord) => void
  onDelete: (recordId: string) => void
}

export function RecordTable({ records, loading, onEdit, onDelete }: RecordTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  
  // 페이지네이션 계산
  const totalPages = Math.ceil(records.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRecords = records.slice(startIndex, endIndex)
  
  // 레코드가 변경되면 페이지를 1로 리셋
  useEffect(() => {
    setCurrentPage(1)
  }, [records])

  const getCategoryColor = (category: string) => {
    switch (category) {
      case '학습지':
        return 'bg-blue-100 text-blue-800'
      case '교재':
        return 'bg-green-100 text-green-800'
      case '오답/심화':
        return 'bg-purple-100 text-purple-800'
      case '챌린지':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

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
              <TableHead>학교</TableHead>
              <TableHead>담당반</TableHead>
              <TableHead>카테고리</TableHead>
              <TableHead className="text-right">문제 수</TableHead>
              <TableHead className="text-right">정답률</TableHead>
              <TableHead className="text-center">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  데이터가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              paginatedRecords.map((record) => {
                // 학교와 학년 조합
                const schoolGrade = record.student?.school && record.student?.grade 
                  ? `${record.student.school}${record.student.grade <= 6 ? record.student.grade : record.student.grade <= 9 ? record.student.grade - 6 : record.student.grade - 9}`
                  : '-';
                
                // 담당반 정보 추출
                const classNames = record.student?.class_students
                  ?.map(cs => cs.classes?.name)
                  .filter(Boolean)
                  .join(', ') || '-';
                
                return (
                  <TableRow key={record.id}>
                    <TableCell>
                      {new Date(record.date).toLocaleDateString('ko-KR')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {record.student?.name || '-'}
                    </TableCell>
                    <TableCell>
                      {schoolGrade}
                    </TableCell>
                    <TableCell>
                      {classNames}
                    </TableCell>
                    <TableCell>
                      <Badge className={getCategoryColor(record.category)}>
                        {record.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {record.problems_solved}문제
                    </TableCell>
                    <TableCell className={`text-right ${getAccuracyColor(record.accuracy_rate)}`}>
                      {record.accuracy_rate}%
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
            총 {records.length}개 중 {startIndex + 1}-{Math.min(endIndex, records.length)}
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              처음
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
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
                    onClick={() => setCurrentPage(pageNum)}
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
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              다음
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
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