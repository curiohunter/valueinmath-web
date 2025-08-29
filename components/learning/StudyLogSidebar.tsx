import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Users, ChevronDown, ChevronRight } from "lucide-react";

interface StudyLogSidebarProps {
  date: string;
  setDate: (date: string) => void;
  classes: any[];
  teachers: any[];
  rows: any[];
  openClassIds: string[];
  toggleClassAccordion: (classId: string) => void;
  handleAddAll: (classId: string) => void;
  handleAddStudent: (classId: string, student: { id: string; name: string }) => void;
  getClassStudents: (classId: string) => any[];
  onClassModalOpen: () => void;
}

export function StudyLogSidebar({
  date,
  setDate,
  classes,
  teachers,
  rows,
  openClassIds,
  toggleClassAccordion,
  handleAddAll,
  handleAddStudent,
  getClassStudents,
  onClassModalOpen,
}: StudyLogSidebarProps) {
  // 담당 선생님별로 반 그룹화
  const groupedClasses = classes.reduce((acc: { [key: string]: any[] }, cls) => {
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

  return (
    <div className="w-72 max-h-[800px] flex-shrink-0 space-y-4 overflow-y-auto">
      {/* 날짜 선택 카드 */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-gray-700">날짜 선택</span>
          </div>
          <input
            type="date"
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
          <div className="mt-2 text-xs text-blue-600 font-medium">
            {new Date(date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </Card>
      
      {/* 반 만들기 버튼 카드 */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="p-4">
          <Button
            onClick={onClassModalOpen}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium py-2.5 rounded-lg shadow-md transition-all duration-200 hover:shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            반 만들기
          </Button>
          <div className="mt-2 text-xs text-green-600 text-center">
            새로운 반을 생성합니다
          </div>
        </div>
      </Card>
      
      {/* 반별 학생 목록 */}
      <Card className="border-0 shadow-md">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-gray-600" />
            <span className="font-semibold text-gray-700">반별 추가</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {classes?.length || 0}개 반
            </Badge>
          </div>
          
          <div className="space-y-4">
            {sortedTeacherIds.map(teacherId => {
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
                    {teacherClasses.map(cls => {
                      const classStudentList = getClassStudents(cls.id);
                      const addedStudentIds = rows.filter(r => r.classId === cls.id).map(r => r.studentId);
                      const isOpen = openClassIds.includes(cls.id);
                      
                      return (
                        <div key={cls.id}>
                          <Card className="border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 cursor-pointer hover:shadow-md">
                            <div className="p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2 flex-1 min-w-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleClassAccordion(cls.id);
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
                                      <span>{classStudentList.length}명</span>
                                      {teacherId !== 'unassigned' && (
                                        <>
                                          <span>•</span>
                                          <span className="text-blue-600">{teacherName}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddAll(cls.id);
                                  }}
                                  size="sm"
                                  variant="ghost"
                                  className="w-8 h-8 p-0 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 shadow-sm transition-all duration-200 hover:shadow-md flex-shrink-0"
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                          
                          {isOpen && (
                            <div className="mt-2 ml-4 space-y-2">
                              {classStudentList
                                .filter(s => !addedStudentIds.includes(s.id))
                                .map(s => (
                                  <Card 
                                    key={s.id}
                                    className="border border-gray-100 hover:border-gray-200 transition-colors"
                                  >
                                    <div className="p-2">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <div className="w-2 h-2 bg-green-400 rounded-full" />
                                          <span className="text-sm font-medium text-gray-700">
                                            {s.name}
                                          </span>
                                        </div>
                                        <Button
                                          onClick={() => handleAddStudent(cls.id, s)}
                                          size="sm"
                                          variant="ghost"
                                          className="w-6 h-6 p-0 rounded-full hover:bg-blue-100 text-blue-600"
                                        >
                                          <Plus className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </Card>
                                ))}
                              
                              {classStudentList.filter(s => !addedStudentIds.includes(s.id)).length === 0 && (
                                <div className="text-center py-4 text-gray-400 text-sm">
                                  이미 모든 학생이 추가됨
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          
          {(!classes || classes.length === 0) && (
            <div className="text-center py-8 text-gray-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <div className="text-sm">등록된 반이 없습니다</div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}