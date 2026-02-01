import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ClassSchedulePreview } from "./ClassSchedulePreview"

interface Schedule {
  day_of_week: string
  start_time: string
  end_time: string
}

interface Class {
  id: string
  name: string
  subject: string
  teacher_id: string | null
  monthly_fee?: number
  schedules?: Schedule[]
}
interface Teacher {
  id: string
  name: string
  role?: string
}
interface Student {
  id: string
  name: string
}

interface ClassesTableProps {
  classes: Class[]
  teachers: Teacher[]
  students: Student[]
  studentsCountMap: Record<string, number>
  studentNamesMap: Record<string, string[]>
  onDetail: (cls: Class) => void
  onDelete?: (classId: string) => Promise<void>
}

export function ClassesTable({ classes, teachers, students, studentsCountMap, studentNamesMap, onDetail, onDelete }: ClassesTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [classToDelete, setClassToDelete] = useState<Class | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteClick = (cls: Class) => {
    setClassToDelete(cls)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!classToDelete || !onDelete) return

    setIsDeleting(true)
    try {
      await onDelete(classToDelete.id)
      setDeleteDialogOpen(false)
      setClassToDelete(null)
    } catch (error) {
      // Error handling is done in the parent component
      console.error("Delete error in table:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full">
          <colgroup>
            <col style={{width: '12%'}} />
            <col style={{width: '20%'}} />
            <col style={{width: '15%'}} />
            <col style={{width: '8%'}} />
            <col style={{width: '12%'}} />
            <col style={{width: '10%'}} />
            <col style={{width: '8%'}} />
            <col style={{width: '15%'}} />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                반 이름
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                학생 미리보기
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                시간표
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                과목
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                담당 선생님
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                원비
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                학생 수
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                관리
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {classes.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-16 text-center">
                  <div className="text-gray-400 text-4xl mb-4">📚</div>
                  <div className="text-lg font-medium text-gray-500 mb-2">등록된 반이 없습니다</div>
                  <div className="text-sm text-gray-400">새 반을 만들어 보세요</div>
                </td>
              </tr>
            ) : (
              classes.map((c, idx) => {
                const teacher = teachers.find(t => t.id === c.teacher_id)
                const studentCount = studentsCountMap[c.id] || 0
                const formattedFee = c.monthly_fee ? c.monthly_fee.toLocaleString() + '원' : '-'
                
                // 학생 이름 프리뷰 생성 (최대 2명 + 나머지 인원)
                const studentNames = studentNamesMap[c.id] || []
                let studentPreview = ''
                if (studentNames.length === 0) {
                  studentPreview = '-'
                } else if (studentNames.length === 1) {
                  studentPreview = studentNames[0]
                } else if (studentNames.length === 2) {
                  studentPreview = `${studentNames[0]}, ${studentNames[1]}`
                } else {
                  // 이름 순으로 정렬하여 처음 2명 표시
                  const sortedNames = [...studentNames].sort((a, b) => a.localeCompare(b, 'ko'))
                  studentPreview = `${sortedNames[0]}, ${sortedNames[1]} 외 ${studentNames.length - 2}명`
                }
                
                return (
                  <tr 
                    key={c.id} 
                    className="bg-white hover:bg-gray-50/50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                        <div className="text-sm font-semibold text-gray-900">{c.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {studentNames.length > 2 ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-sm text-gray-600 cursor-help" style={{ maxWidth: '200px' }}>
                                {studentPreview}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-sm">
                              <div className="space-y-1">
                                <div className="font-semibold text-xs text-gray-500 mb-2">전체 학생 목록 ({studentNames.length}명)</div>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                  {[...studentNames].sort((a, b) => a.localeCompare(b, 'ko')).map((name, i) => (
                                    <div key={i} className="text-sm">{name}</div>
                                  ))}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <div className="text-sm text-gray-600" style={{ maxWidth: '200px' }}>
                          {studentPreview}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <ClassSchedulePreview schedules={c.schedules} subject={c.subject} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        c.subject === '수학'
                          ? 'bg-blue-100 text-blue-700'
                          : c.subject === '수학특강'
                          ? 'bg-violet-100 text-violet-700'
                          : c.subject === '과학'
                          ? 'bg-emerald-100 text-emerald-700'
                          : c.subject === '과학특강'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {c.subject}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm font-medium text-gray-900">
                        {teacher ? teacher.name : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm font-bold text-gray-900">
                        {formattedFee}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {studentCount}명
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => onDetail(c)}
                          className="hover:bg-gray-50 hover:border-gray-300 transition-colors duration-150"
                        >
                          수정
                        </Button>
                        {onDelete && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDeleteClick(c)}
                            className="hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors duration-150"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

    {/* 삭제 확인 다이얼로그 */}
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>반 삭제 확인</AlertDialogTitle>
          <AlertDialogDescription>
            {classToDelete && (
              <>
                <span className="font-semibold text-gray-900">{classToDelete.name}</span> 반을 삭제하시겠습니까?
                <br />
                <br />
                {studentsCountMap[classToDelete.id] > 0 && (
                  <span className="text-red-600 font-medium">
                    ⚠️ 이 반에는 {studentsCountMap[classToDelete.id]}명의 학생이 등록되어 있습니다.
                    <br />
                    반을 삭제하면 학생들의 반 정보가 사라집니다.
                  </span>
                )}
                <br />
                <br />
                이 작업은 되돌릴 수 없습니다.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? "삭제 중..." : "삭제"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}