"use client";

import React, { useState, useEffect } from "react";
import LearningTabs from "@/components/learning/LearningTabs";
import { MakeupSidebar } from "@/components/learning/makeup-classes/makeup-sidebar";
import { MakeupTable } from "@/components/learning/makeup-classes/makeup-table";
import { MakeupStats } from "@/components/learning/makeup-classes/makeup-stats";
import { MakeupModal } from "@/components/learning/makeup-classes/makeup-modal";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import { toast } from "sonner";

type MakeupClass = Database["public"]["Tables"]["makeup_classes"]["Row"];
type Student = Database["public"]["Tables"]["students"]["Row"];
type Class = Database["public"]["Tables"]["classes"]["Row"];
type Employee = Database["public"]["Tables"]["employees"]["Row"];

// 한국 시간대(KST) 기준으로 오늘 날짜 가져오기
const getKoreanDate = () => {
  const now = new Date();
  const koreanTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  return koreanTime.toISOString().slice(0, 10);
};

export default function MakeupClassesPage() {
  const supabase = createClient();
  
  // 상태 관리
  const [makeupClasses, setMakeupClasses] = useState<MakeupClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"pending" | "scheduled" | "completed" | "cancelled">("pending");
  
  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{
    studentId: string;
    classId: string;
    studentName: string;
    className: string;
  } | null>(null);
  const [editingMakeup, setEditingMakeup] = useState<MakeupClass | null>(null);

  // 데이터 로딩
  const fetchData = async () => {
    setLoading(true);
    try {
      // 학생 데이터
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("*")
        .eq("status", "재원")
        .order("name");
      
      if (studentError) throw studentError;
      setStudents(studentData || []);

      // 반 데이터
      const { data: classData, error: classError } = await supabase
        .from("classes")
        .select("*")
        .order("name");
      
      if (classError) throw classError;
      setClasses(classData || []);

      // 선생님 데이터
      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .select("*")
        .order("name");
      
      if (employeeError) throw employeeError;
      setEmployees(employeeData || []);

      // 보강 데이터
      const { data: makeupData, error: makeupError } = await supabase
        .from("makeup_classes")
        .select("*")
        .order("makeup_date", { ascending: false });
      
      if (makeupError) throw makeupError;
      setMakeupClasses(makeupData || []);

    } catch (error) {
      console.error("데이터 로딩 오류:", error);
      toast.error("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 학생 선택 핸들러 (사이드바에서)
  const handleStudentSelect = (studentId: string, classId: string) => {
    const student = students.find(s => s.id === studentId);
    const classInfo = classes.find(c => c.id === classId);
    
    if (student && classInfo) {
      setSelectedStudent({
        studentId,
        classId,
        studentName: student.name,
        className: classInfo.name
      });
      setEditingMakeup(null);
      setIsModalOpen(true);
    }
  };

  // 보강 수정 핸들러
  const handleEditMakeup = (makeup: MakeupClass) => {
    const student = students.find(s => s.id === makeup.student_id);
    const classInfo = classes.find(c => c.id === makeup.class_id);

    // 반이 삭제되었어도 스냅샷이 있으면 수정 가능
    if (student && (classInfo || makeup.class_name_snapshot)) {
      setSelectedStudent({
        studentId: makeup.student_id,
        classId: makeup.class_id || '', // null이면 빈 문자열
        studentName: student.name,
        className: classInfo?.name || makeup.class_name_snapshot || '알 수 없음'
      });
      setEditingMakeup(makeup);
      setIsModalOpen(true);
    }
  };

  // 보강 삭제 핸들러
  const handleDeleteMakeup = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    
    try {
      const { error } = await supabase
        .from("makeup_classes")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      toast.success("보강이 삭제되었습니다.");
      await fetchData();
    } catch (error) {
      console.error("삭제 오류:", error);
      toast.error("삭제 중 오류가 발생했습니다.");
    }
  };

  // 모달 닫기 후 리프레시
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedStudent(null);
    setEditingMakeup(null);
    fetchData();
  };

  // 상태 업데이트 핸들러 (탭 이동 없이 상태만 변경)
  const handleStatusUpdate = (makeupId: string, newStatus: Database["public"]["Enums"]["makeup_status_enum"]) => {
    setMakeupClasses(prev => 
      prev.map(makeup => 
        makeup.id === makeupId 
          ? { ...makeup, status: newStatus, updated_at: new Date().toISOString() }
          : makeup
      )
    );
  };

  // 선생님별 보강 통계 계산 (최근 30일)
  const calculateTeacherStats = () => {
    const todayKST = getKoreanDate();
    const today = new Date(todayKST + 'T00:00:00');
    const monthAgo = new Date(today);
    monthAgo.setDate(today.getDate() - 30);
    
    // 반별 선생님 매핑
    const classTeacherMap = new Map<string, string>();
    classes.forEach(cls => {
      if (cls.teacher_id) {
        classTeacherMap.set(cls.id, cls.teacher_id);
      }
    });
    
    // 선생님별 보강 카운트
    const teacherMakeupCount = new Map<string, number>();
    
    makeupClasses.forEach(makeup => {
      if (makeup.makeup_date) {
        const makeupDate = new Date(makeup.makeup_date + 'T00:00:00');
        if (makeupDate >= monthAgo && makeupDate <= today && makeup.status === "completed") {
          const teacherId = classTeacherMap.get(makeup.class_id);
          if (teacherId) {
            teacherMakeupCount.set(teacherId, (teacherMakeupCount.get(teacherId) || 0) + 1);
          }
        }
      }
    });
    
    // 선생님 이름과 건수 매핑
    const teacherStats: { name: string; count: number }[] = [];
    teacherMakeupCount.forEach((count, teacherId) => {
      const teacher = employees.find(e => e.id === teacherId);
      if (teacher) {
        teacherStats.push({ name: teacher.name, count });
      }
    });
    
    // 건수 많은 순으로 정렬
    teacherStats.sort((a, b) => b.count - a.count);
    
    return teacherStats;
  };

  // 통계 계산 (한국 시간 기준)
  const stats = {
    weeklyAbsences: makeupClasses.filter(m => {
      if (!m.absence_date) return false;
      
      // 오늘 날짜 (한국 시간 기준)
      const todayKST = getKoreanDate();
      const today = new Date(todayKST + 'T00:00:00');
      
      // 이번 주의 시작 (일요일)과 끝 (토요일) 계산
      const dayOfWeek = today.getDay(); // 0 = 일요일, 6 = 토요일
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - dayOfWeek); // 이번주 일요일
      
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + (6 - dayOfWeek)); // 이번주 토요일
      
      // 결석일을 날짜 객체로 변환
      const absenceDate = new Date(m.absence_date + 'T00:00:00');
      
      // 이번주에 속하는지 확인
      const isInThisWeek = absenceDate >= startOfWeek && absenceDate <= endOfWeek;
      
      return isInThisWeek;
    }).length,
    pendingMakeups: makeupClasses.filter(m => m.status === "scheduled" && !m.makeup_date).length,
    weeklyScheduled: makeupClasses.filter(m => {
      if (!m.makeup_date) return false;
      
      const todayKST = getKoreanDate();
      const today = new Date(todayKST + 'T00:00:00');
      const weekLater = new Date(today);
      weekLater.setDate(today.getDate() + 7);
      
      const makeupDate = new Date(m.makeup_date + 'T00:00:00');
      return m.status === "scheduled" && makeupDate >= today && makeupDate <= weekLater;
    }).length,
    monthlyCompleted: makeupClasses.filter(m => {
      if (!m.makeup_date) return false;
      
      const todayKST = getKoreanDate();
      const today = new Date(todayKST + 'T00:00:00');
      const monthAgo = new Date(today);
      monthAgo.setDate(today.getDate() - 30);
      
      const makeupDate = new Date(m.makeup_date + 'T00:00:00');
      return m.status === "completed" && makeupDate >= monthAgo && makeupDate <= today;
    }).length,
    teacherStats: calculateTeacherStats()
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LearningTabs />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <LearningTabs />
      
      {/* 상단 통계 카드 */}
      <MakeupStats stats={stats} />
      
      {/* 사이드바와 테이블 - 5개 그리드와 동일한 구조 */}
      <div className="grid grid-cols-5 gap-4">
        {/* 왼쪽 사이드바 - 첫 번째 열 */}
        <div className="col-span-1">
          <MakeupSidebar
            students={students}
            classes={classes}
            makeupClasses={makeupClasses}
            onStudentSelect={handleStudentSelect}
          />
        </div>
        
        {/* 메인 테이블 - 나머지 4개 열 */}
        <div className="col-span-4">
          <MakeupTable
            makeupClasses={makeupClasses}
            students={students}
            classes={classes}
            selectedTab={selectedTab}
            onTabChange={setSelectedTab}
            onEdit={handleEditMakeup}
            onDelete={handleDeleteMakeup}
            onStatusUpdate={handleStatusUpdate}
          />
        </div>
      </div>
      
      {/* 보강 추가/수정 모달 */}
      {isModalOpen && selectedStudent && (
        <MakeupModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          studentInfo={selectedStudent}
          editingMakeup={editingMakeup}
        />
      )}
    </div>
  );
}