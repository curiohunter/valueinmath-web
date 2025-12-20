"use client"

import React, { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, ChevronDown, ChevronRight, Calendar, Users, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ClassWithStudents } from "@/types/tuition"
import type { Student } from "@/types/student"

interface TuitionSidebarProps {
  yearMonth: string
  onYearMonthChange: (value: string) => void
  classesWithStudents: ClassWithStudents[]
  teachers?: Array<{ id: string; name: string }>
  newConsultStudents?: Student[]
  onAddAll: (classId: string) => void
  onAddStudent: (classId: string, studentId: string) => void
  onAddNewConsultStudent?: (studentId: string) => void
  onGenerateMonthly: () => void
  isGenerating?: boolean
  selectedClassId?: string
  onClassSelect?: (classId: string) => void
}

export function TuitionSidebar({
  yearMonth,
  onYearMonthChange,
  classesWithStudents,
  teachers = [],
  newConsultStudents = [],
  onAddAll,
  onAddStudent,
  onAddNewConsultStudent,
  onGenerateMonthly,
  isGenerating = false,
  selectedClassId,
  onClassSelect
}: TuitionSidebarProps) {
  const [openClassIds, setOpenClassIds] = useState<string[]>([])
  const [isNewConsultOpen, setIsNewConsultOpen] = useState(false)

  const toggleClassAccordion = (classId: string) => {
    setOpenClassIds(prev =>
      prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
    )
  }

  const toggleNewConsult = () => {
    setIsNewConsultOpen(prev => !prev)
  }

  const formatYearMonth = (yearMonth: string) => {
    if (!yearMonth) return ""
    const [year, month] = yearMonth.split("-")
    return `${year}년 ${parseInt(month)}월`
  }

  return (
    <div className="w-72 max-h-[800px] flex-shrink-0 space-y-4 overflow-y-auto">
      {/* 날짜 선택 카드 */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-gray-700">날짜 선택</span>
          </div>
          
          {/* 단일 월 선택 */}
          <div className="flex gap-2">
            <input
              type="number"
              value={yearMonth.split('-')[0]}
              onChange={(e) => {
                const newYear = e.target.value
                const currentMonth = yearMonth.split('-')[1]
                if (newYear.length === 4) {
                  onYearMonthChange(`${newYear}-${currentMonth}`)
                }
              }}
              className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              placeholder="연도"
              min="2000"
              max="2100"
            />
            <select
              value={yearMonth.split('-')[1]}
              onChange={(e) => {
                const currentYear = yearMonth.split('-')[0]
                const newMonth = e.target.value
                onYearMonthChange(`${currentYear}-${newMonth}`)
              }}
              className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            >
              {Array.from({ length: 12 }, (_, i) => {
                const month = (i + 1).toString().padStart(2, '0')
                return (
                  <option key={month} value={month}>
                    {i + 1}월
                  </option>
                )
              })}
            </select>
          </div>
          {yearMonth && (
            <div className="mt-2 text-xs text-blue-600 font-medium">
              {formatYearMonth(yearMonth)} 학원비
            </div>
          )}
        </CardContent>
      </Card>

      {/* 월별 생성 버튼 */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-emerald-50">
        <CardContent className="p-4">
          <Button
            onClick={onGenerateMonthly}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium py-2.5 rounded-lg shadow-md transition-all duration-200 hover:shadow-lg"
          >
            {isGenerating ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                생성 중...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                월별 자동 생성
              </div>
            )}
          </Button>
          <div className="mt-2 text-xs text-green-600 text-center">
            모든 재원생의 학원비를 자동으로 생성합니다
          </div>
        </CardContent>
      </Card>

      {/* 반별 학생 목록 */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-gray-600" />
            <span className="font-semibold text-gray-700">반별 추가</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {classesWithStudents?.length || 0}개 반
            </Badge>
          </div>
          
          <div className="space-y-4">
            {/* 담당 선생님별로 반 그룹화 */}
            {(() => {
              // 담당 선생님별로 반 그룹화
              const groupedClasses = classesWithStudents.reduce((acc: { [key: string]: any[] }, cls) => {
                const teacherId = cls.teacher_id || 'unassigned';
                if (!acc[teacherId]) acc[teacherId] = [];
                acc[teacherId].push(cls);
                return acc;
              }, {});
              
              // 각 그룹 내에서 반 이름으로 정렬
              Object.values(groupedClasses).forEach(group => {
                group.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
              });
              
              // 선생님 ID 정렬 (미배정은 맨 아래)
              const sortedTeacherIds = Object.keys(groupedClasses).sort((a, b) => {
                if (a === 'unassigned') return 1;
                if (b === 'unassigned') return -1;
                const teacherA = teachers.find(t => t.id === a)?.name || a;
                const teacherB = teachers.find(t => t.id === b)?.name || b;
                return teacherA.localeCompare(teacherB, 'ko');
              });
              
              return sortedTeacherIds.map(teacherId => {
                const teacher = teachers.find(t => t.id === teacherId);
                const teacherName = teacher?.name || (teacherId === 'unassigned' ? '미배정' : teacherId);
                const teacherClasses = groupedClasses[teacherId];
                
                return (
                  <div key={teacherId} className="space-y-2">
                    {/* 담당 선생님 헤더 */}
                    <div className="px-2 py-1 bg-gray-100 rounded-md">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-semibold text-gray-700">
                          {teacherName} 담당
                        </span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {teacherClasses.length}개 반
                        </Badge>
                      </div>
                    </div>
                    
                    {/* 해당 선생님의 반 목록 */}
                    <div className="space-y-2 ml-2">
                      {teacherClasses.map((cls: any) => {
                        const isOpen = openClassIds.includes(cls.id)
                        const isSelected = selectedClassId === cls.id
                        const studentCount = cls.students.length
                        
                        return (
                          <div key={cls.id}>
                            {/* 반 헤더 - 카드형 디자인 */}
                            <Card 
                              className={cn(
                                "border-2 border-dashed transition-all duration-200 cursor-pointer hover:shadow-md",
                                isSelected 
                                  ? "border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50" 
                                  : "border-gray-200 hover:border-blue-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50"
                              )}
                              onClick={() => onClassSelect?.(cls.id)}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start gap-2 flex-1 min-w-0">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        toggleClassAccordion(cls.id)
                                      }}
                                      className="p-1 rounded-md hover:bg-white/50 transition-colors flex-shrink-0 mt-0.5"
                                    >
                                      {isOpen ? (
                                        <ChevronDown className="w-4 h-4 text-gray-500" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-gray-500" />
                                      )}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-sm text-gray-800 truncate">
                                        {cls.name}
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                        <span>{studentCount}명</span>
                                        {teacherId !== 'unassigned' && (
                                          <>
                                            <span>•</span>
                                            <span className="text-blue-600">{teacherName}</span>
                                          </>
                                        )}
                                      </div>
                                      {cls.monthly_fee && (
                                        <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                                          {cls.monthly_fee.toLocaleString()}원
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onAddAll(cls.id)
                                    }}
                                    size="sm"
                                    variant="ghost"
                                    className="w-8 h-8 p-0 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 shadow-sm transition-all duration-200 hover:shadow-md flex-shrink-0"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>

                            {/* 학생 목록 - 아코디언 */}
                            {isOpen && (
                              <div className="mt-2 ml-4 space-y-2">
                                {cls.students.map((student: any) => (
                                  <Card 
                                    key={student.id}
                                    className="border border-gray-100 hover:border-gray-200 transition-colors"
                                  >
                                    <CardContent className="p-2">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <div className="w-2 h-2 bg-green-400 rounded-full" />
                                          <span className="text-sm font-medium text-gray-700">
                                            {student.name}
                                          </span>
                                          {student.grade && (
                                            <Badge variant="secondary" className="text-xs">
                                              {student.grade}학년
                                            </Badge>
                                          )}
                                        </div>
                                        <Button
                                          onClick={() => onAddStudent(cls.id, student.id)}
                                          size="sm"
                                          variant="ghost"
                                          className="w-6 h-6 p-0 rounded-full hover:bg-blue-100 text-blue-600"
                                        >
                                          <Plus className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                                
                                {cls.students.length === 0 && (
                                  <div className="text-center py-4 text-gray-400 text-sm">
                                    재원 중인 학생이 없습니다
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {(!classesWithStudents || classesWithStudents.length === 0) && (
            <div className="text-center py-8 text-gray-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <div className="text-sm">등록된 반이 없습니다</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 신규상담 학생 목록 */}
      {newConsultStudents && newConsultStudents.length > 0 && (
        <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus className="w-4 h-4 text-orange-600" />
              <span className="font-semibold text-gray-700">신규상담</span>
              <Badge variant="secondary" className="ml-auto text-xs bg-orange-100 text-orange-700">
                {newConsultStudents.length}명
              </Badge>
            </div>
            
            {/* 신규상담 아코디언 */}
            <Card 
              className={cn(
                "border-2 border-dashed transition-all duration-200 cursor-pointer hover:shadow-md",
                isNewConsultOpen 
                  ? "border-orange-400 bg-gradient-to-r from-orange-50 to-amber-50" 
                  : "border-gray-200 hover:border-orange-300 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50"
              )}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <button
                      onClick={toggleNewConsult}
                      className="p-1 rounded-md hover:bg-white/50 transition-colors flex-shrink-0 mt-0.5"
                    >
                      {isNewConsultOpen ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-800">
                        입학테스트비
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <span>{newConsultStudents.length}명 대기 중</span>
                      </div>
                      <Badge variant="outline" className="text-xs px-1.5 py-0.5 border-orange-300 text-orange-700">
                        반 미등록 학생
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 신규상담 학생 목록 - 아코디언 */}
            {isNewConsultOpen && (
              <div className="mt-2 ml-4 space-y-2">
                {newConsultStudents.map((student) => (
                  <Card 
                    key={student.id}
                    className="border border-orange-100 hover:border-orange-200 transition-colors bg-white"
                  >
                    <CardContent className="p-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-orange-400 rounded-full" />
                          <span className="text-sm font-medium text-gray-700">
                            {student.name}
                          </span>
                          {student.grade && (
                            <Badge variant="secondary" className="text-xs">
                              {student.grade}학년
                            </Badge>
                          )}
                          {student.school && (
                            <span className="text-xs text-gray-500">
                              {student.school}
                            </span>
                          )}
                        </div>
                        <Button
                          onClick={() => onAddNewConsultStudent?.(student.id)}
                          size="sm"
                          variant="ghost"
                          className="w-6 h-6 p-0 rounded-full hover:bg-orange-100 text-orange-600"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {newConsultStudents.length === 0 && (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    신규상담 중인 학생이 없습니다
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-2 text-xs text-orange-600 text-center">
              입학테스트비 입력용
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}