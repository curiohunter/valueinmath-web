"use client";

import React, { useState, useMemo, useEffect } from "react";
import { ChevronDown, ChevronRight, Plus, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type Student = Database["public"]["Tables"]["students"]["Row"];
type Class = Database["public"]["Tables"]["classes"]["Row"];
type MakeupClass = Database["public"]["Tables"]["makeup_classes"]["Row"];
type Employee = Database["public"]["Tables"]["employees"]["Row"];

interface MakeupSidebarProps {
  students: Student[];
  classes: Class[];
  makeupClasses: MakeupClass[];
  onStudentSelect: (studentId: string, classId: string) => void;
}

export function MakeupSidebar({
  students,
  classes,
  makeupClasses,
  onStudentSelect,
}: MakeupSidebarProps) {
  const supabase = createClient();
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<Employee[]>([]);

  // class_students 테이블 데이터 가져오기
  useEffect(() => {
    const fetchClassStudents = async () => {
      const { data: classStudentData } = await supabase
        .from("class_students")
        .select("class_id, student_id");
      
      const { data: teacherData } = await supabase
        .from("employees")
        .select("*");
      
      setClassStudents(classStudentData || []);
      setTeachers(teacherData || []);
    };
    
    fetchClassStudents();
  }, []);

  // 반별 학생 그룹핑 (class_students 테이블 기반)
  const classStudentMap = useMemo(() => {
    const map = new Map<string, Student[]>();
    
    // 모든 반 초기화
    classes.forEach(cls => {
      map.set(cls.id, []);
    });
    
    // class_students 테이블 기반으로 학생 그룹핑
    classStudents.forEach(cs => {
      const student = students.find(s => s.id === cs.student_id);
      if (student && student.status === "재원") {
        const current = map.get(cs.class_id) || [];
        current.push(student);
        map.set(cs.class_id, current);
      }
    });
    
    return map;
  }, [students, classes, classStudents]);

  // 학생별 보강 현황 계산
  const studentMakeupStatus = useMemo(() => {
    const statusMap = new Map<string, {
      pending: number;
      scheduled: number;
      completed: number;
    }>();
    
    students.forEach(student => {
      const studentMakeups = makeupClasses.filter(m => m.student_id === student.id);
      statusMap.set(student.id, {
        pending: studentMakeups.filter(m => m.status === "scheduled" && !m.makeup_date).length,
        scheduled: studentMakeups.filter(m => m.status === "scheduled" && m.makeup_date).length,
        completed: studentMakeups.filter(m => m.status === "completed").length,
      });
    });
    
    return statusMap;
  }, [students, makeupClasses]);

  // 반 토글 핸들러
  const toggleClass = (classId: string) => {
    const newExpanded = new Set(expandedClasses);
    if (newExpanded.has(classId)) {
      newExpanded.delete(classId);
    } else {
      newExpanded.add(classId);
    }
    setExpandedClasses(newExpanded);
  };

  // 선생님별로 반 그룹화 (가나다순 정렬)
  const classesByTeacher = useMemo(() => {
    const grouped = new Map<string, typeof classes>();
    
    classes.forEach(cls => {
      const teacherId = cls.teacher_id || "unassigned";
      if (!grouped.has(teacherId)) {
        grouped.set(teacherId, []);
      }
      grouped.get(teacherId)!.push(cls);
    });
    
    // 선생님 이름으로 정렬
    const sortedEntries = Array.from(grouped.entries()).sort((a, b) => {
      const teacherA = teachers.find(t => t.id === a[0]);
      const teacherB = teachers.find(t => t.id === b[0]);
      const nameA = teacherA?.name || "ㅎ담당 미지정"; // ㅎ을 앞에 붙여서 미지정을 뒤로
      const nameB = teacherB?.name || "ㅎ담당 미지정";
      return nameA.localeCompare(nameB, 'ko');
    });
    
    return new Map(sortedEntries);
  }, [classes, teachers]);

  return (
    <div className="w-full bg-white border rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-900">반별 학생 목록</h3>
        <p className="text-sm text-gray-500 mt-1">학생을 선택하여 보강 추가</p>
      </div>
      
      <div className="overflow-y-auto" style={{ height: "calc(100vh - 14rem)" }}>
        {Array.from(classesByTeacher.entries()).map(([teacherId, teacherClasses]) => {
          const teacher = teachers.find(t => t.id === teacherId);
          const teacherName = teacher?.name || "담당 미지정";
          
          return (
            <div key={teacherId} className="mb-2">
              {/* 선생님 헤더 */}
              <div className="px-4 py-2 bg-blue-50 border-y border-blue-100">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-900">{teacherName}</span>
                  <Badge variant="outline" className="text-xs bg-white">
                    {teacherClasses.length}개 반
                  </Badge>
                </div>
              </div>
              
              {/* 해당 선생님의 반 목록 */}
              {teacherClasses.map(cls => {
                const isExpanded = expandedClasses.has(cls.id);
                const classStudents = classStudentMap.get(cls.id) || [];
                
                return (
                  <div key={cls.id} className="border-b last:border-b-0">
                    {/* 반 헤더 */}
                    <button
                      onClick={() => toggleClass(cls.id)}
                      className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        )}
                        <span className="font-medium text-gray-900">{cls.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {classStudents.length}명
                        </Badge>
                      </div>
                    </button>
              
                    {/* 학생 목록 */}
                    {isExpanded && (
                      <div className="bg-gray-50/50">
                        {classStudents.length === 0 ? (
                          <div className="px-12 py-3 text-sm text-gray-500">
                            등록된 학생이 없습니다
                          </div>
                        ) : (
                          classStudents.map(student => {
                            const status = studentMakeupStatus.get(student.id);
                            const hasPending = status && status.pending > 0;
                            
                            return (
                              <div
                                key={`${cls.id}-${student.id}`}
                                className="px-12 py-2 flex items-center justify-between hover:bg-gray-100 transition-colors group"
                              >
                                <div className="flex items-center gap-2">
                                  <User className="w-3 h-3 text-gray-400" />
                                  <span className="text-sm text-gray-700">{student.name}</span>
                                  {student.grade && (
                                    <span className="text-xs text-gray-500">
                                      ({student.grade}학년)
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {/* 보강 현황 배지 */}
                                  {hasPending && (
                                    <Badge variant="destructive" className="text-xs">
                                      미정 {status.pending}
                                    </Badge>
                                  )}
                                  {status && status.scheduled > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      예정 {status.scheduled}
                                    </Badge>
                                  )}
                                  
                                  {/* 보강 추가 버튼 */}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 px-2"
                                    onClick={() => onStudentSelect(student.id, cls.id)}
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    보강
                                  </Button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      
      {/* 하단 요약 */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">전체</span>
          <div className="flex gap-3">
            <span className="text-gray-700">
              {classes.length}개 반
            </span>
            <span className="text-gray-700">
              {students.filter(s => s.status === "재원").length}명
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}