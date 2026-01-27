"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ConsultationModal } from "@/components/consultations/ConsultationModal";
import { ConsultationStats } from "@/components/consultations/ConsultationStats";
import { StudentsTab } from "@/components/consultations/StudentsTab";
import { ConsultationHistoryTab } from "@/components/consultations/ConsultationHistoryTab";
import { ConsultationRequestsManagement } from "@/components/consultations/consultation-requests-management";
import { calendarService } from "@/services/calendar";
import { getConsultationRequests } from "@/services/consultation-requests";
import StudentClassTabs from "@/components/students/StudentClassTabs";
import type { Database } from "@/types/database";
import type { Consultation, ConsultationPageStats } from "@/types/consultation";

type Student = Database['public']['Tables']['students']['Row'];
type Employee = Database['public']['Tables']['employees']['Row'];

export default function ConsultationsPage() {
  const supabase = createClient();

  // State for tabs
  const [activeTab, setActiveTab] = useState("students");

  // State for data
  const [students, setStudents] = useState<Student[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);

  // State for statistics
  const [stats, setStats] = useState<ConsultationPageStats>({
    newStudentsThisMonth: 0,
    newStudentsByDept: {},
    newStudentsByDeptNames: {},
    consultationsThisMonth: 0,
    consultationsByDept: {},
    testConversionByDept: {},
    testConversionTotal: { consultations: 0, tests: 0 },
    enrollmentConversionByDept: {},
    enrollmentConversionTotal: { consultations: 0, enrollments: 0 },
    atRiskCount: 0,
    atRiskByDept: {},
    consultationRequestsTotal: 0,
    consultationRequestsPending: 0,
    consultationRequestsCompleted: 0,
  });

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingConsultation, setEditingConsultation] = useState<Consultation | null>(null);

  // Other state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    loadStudents();
    loadConsultations();
    loadEmployees();
    loadStatistics();
  }, []);

  const loadStudents = async () => {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) {
      toast.error("학생 목록을 불러오는데 실패했습니다.");
      return;
    }

    if (data) {
      setStudents(data);
    }
  };

  const loadConsultations = async () => {
    const { data, error } = await supabase
      .from("consultations")
      .select(`
        *,
        ai_hurdle,
        ai_readiness,
        ai_decision_maker,
        ai_sentiment,
        ai_analyzed_at,
        student:students(name, school, grade),
        counselor:employees(name, department)
      `)
      .order("date", { ascending: false });

    if (error) {
      toast.error("상담 이력을 불러오는데 실패했습니다.");
      return;
    }

    if (data) {
      setConsultations(data as any);
    }
  };

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("id, name, department")
      .eq("status", "재직")
      .order("name");

    if (error) {
      toast.error("직원 목록을 불러오는데 실패했습니다.");
      return;
    }

    if (data) {
      setEmployees(data);
    }
  };

  const loadStatistics = async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // 1. 이번달 신규생 (start_date가 이번달인 학생)
      const { data: newStudents } = await supabase
        .from("students")
        .select("*")
        .eq("is_active", true)
        .gte("start_date", startOfMonth.toISOString().split('T')[0])
        .lte("start_date", endOfMonth.toISOString().split('T')[0])
        .eq("status", "재원");

      // 2. 이번달 상담 수
      const { data: monthlyConsultations } = await supabase
        .from("consultations")
        .select("*")
        .gte("date", startOfMonth.toISOString())
        .lte("date", endOfMonth.toISOString());

      // 3. 이번달 신규상담 (first_contact_date 기준)
      const { data: newInquiries } = await supabase
        .from("students")
        .select("*")
        .eq("is_active", true)
        .gte("first_contact_date", startOfMonth.toISOString().split('T')[0])
        .lte("first_contact_date", endOfMonth.toISOString().split('T')[0]);

      // 4. 이번달 입학테스트
      const { data: testsScheduled } = await supabase
        .from("entrance_tests")
        .select(`
          *,
          students!student_id(department)
        `)
        .gte("created_at", startOfMonth.toISOString())
        .lte("created_at", endOfMonth.toISOString());

      // 5. 부서별 통계 계산
      const newStudentsByDept: Record<string, number> = {};
      const newStudentsByDeptNames: Record<string, string[]> = {};
      const consultationsByDept: Record<string, number> = {};
      const testConversionByDept: Record<string, number> = {};
      const enrollmentConversionByDept: Record<string, number> = {};

      // 부서별 신규생 계산 (이름 포함)
      newStudents?.forEach(student => {
        const dept = student.department || '미분류';
        newStudentsByDept[dept] = (newStudentsByDept[dept] || 0) + 1;
        if (!newStudentsByDeptNames[dept]) {
          newStudentsByDeptNames[dept] = [];
        }
        newStudentsByDeptNames[dept].push(student.name);
      });

      // 부서별 상담 계산
      const consultationDeptMap: Record<string, number> = {};
      newInquiries?.forEach(inquiry => {
        const dept = inquiry.department || '미분류';
        consultationDeptMap[dept] = (consultationDeptMap[dept] || 0) + 1;
        consultationsByDept[dept] = (consultationsByDept[dept] || 0) + 1;
      });

      // 부서별 입학테스트 전환율 계산
      const testsByDept: Record<string, number> = {};
      testsScheduled?.forEach(test => {
        const student = test.students as any;
        const dept = student?.department || '미분류';
        testsByDept[dept] = (testsByDept[dept] || 0) + 1;
      });

      // 전체 통계 계산
      const totalConsultations = Object.values(consultationDeptMap).reduce((sum, count) => sum + count, 0);
      const totalTests = Object.values(testsByDept).reduce((sum, count) => sum + count, 0);
      const totalEnrollments = newStudents?.length || 0;

      // 부서별 전환율 계산
      Object.keys(consultationDeptMap).forEach(dept => {
        const consultations = consultationDeptMap[dept];
        const tests = testsByDept[dept] || 0;
        const enrollments = newStudentsByDept[dept] || 0;

        testConversionByDept[dept] = consultations > 0
          ? Math.round((tests / consultations) * 100)
          : 0;

        enrollmentConversionByDept[dept] = consultations > 0
          ? Math.round((enrollments / consultations) * 100)
          : 0;
      });

      // 6. 상담요청 통계
      const consultationRequestsData = await getConsultationRequests();
      const consultationRequestsTotal = consultationRequestsData.length;
      const consultationRequestsPending = consultationRequestsData.filter(r => r.status === '대기중').length;
      const consultationRequestsCompleted = consultationRequestsData.filter(r => r.status === '완료').length;

      setStats({
        newStudentsThisMonth: newStudents?.length || 0,
        newStudentsByDept,
        newStudentsByDeptNames,
        consultationsThisMonth: totalConsultations,
        consultationsByDept,
        testConversionByDept,
        testConversionTotal: { consultations: totalConsultations, tests: totalTests },
        enrollmentConversionByDept,
        enrollmentConversionTotal: { consultations: totalConsultations, enrollments: totalEnrollments },
        atRiskCount: 0,
        atRiskByDept: {},
        consultationRequestsTotal,
        consultationRequestsPending,
        consultationRequestsCompleted,
      });
    } catch (error) {
      console.error("Error loading statistics:", error);
      toast.error("통계 데이터를 불러오는데 실패했습니다.");
    }
  };

  const handleOpenConsultationModal = (student?: Student) => {
    // 먼저 이전 데이터 초기화
    setEditingConsultation(null);
    setSelectedStudent(null);

    // 새 학생 정보 설정
    if (student) {
      setSelectedStudent(student);
    }

    // 약간의 딜레이 후 모달 열기 (React 렌더링 사이클 대응)
    setTimeout(() => {
      setModalOpen(true);
    }, 50);
  };

  const handleEditConsultation = (consultation: Consultation) => {
    // 먼저 이전 데이터 초기화
    setSelectedStudent(null);
    setEditingConsultation(null);

    // 약간의 딜레이 후 편집 데이터 설정 및 모달 열기
    setTimeout(() => {
      setEditingConsultation(consultation);
      setModalOpen(true);
    }, 50);
  };

  const handleDeleteConsultation = async (consultation: Consultation) => {
    if (!confirm("정말로 이 상담 기록을 삭제하시겠습니까?")) {
      return;
    }

    setLoading(true);

    try {
      // Delete associated calendar events
      if (consultation.calendar_event_id) {
        try {
          await calendarService.deleteEvent(consultation.calendar_event_id);
        } catch (error) {
          console.error("캘린더 이벤트 삭제 실패:", error);
        }
      }

      if (consultation.next_calendar_event_id) {
        try {
          await calendarService.deleteEvent(consultation.next_calendar_event_id);
        } catch (error) {
          console.error("후속 상담 캘린더 이벤트 삭제 실패:", error);
        }
      }

      // Delete consultation record
      const { error } = await supabase
        .from("consultations")
        .delete()
        .eq("id", consultation.id);

      if (error) throw error;

      toast.success("상담 기록이 삭제되었습니다.");
      loadConsultations();
      loadStatistics();
    } catch (error) {
      console.error("Error deleting consultation:", error);
      toast.error("상담 삭제 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Student Class Tabs */}
      <StudentClassTabs />

      {/* Statistics Cards */}
      <ConsultationStats
        stats={stats}
        onRequestsClick={() => setActiveTab('requests')}
      />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="students">학생 목록</TabsTrigger>
          <TabsTrigger value="history">상담 이력</TabsTrigger>
          <TabsTrigger value="requests">상담 요청</TabsTrigger>
        </TabsList>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-4">
          <StudentsTab
            students={students}
            onStudentSelect={handleOpenConsultationModal}
          />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <ConsultationHistoryTab
            consultations={consultations}
            employees={employees}
            onEdit={handleEditConsultation}
            onDelete={handleDeleteConsultation}
          />
        </TabsContent>

        {/* Consultation Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          <ConsultationRequestsManagement />
        </TabsContent>
      </Tabs>

      {/* Consultation Modal */}
      <ConsultationModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedStudent(null);
          setEditingConsultation(null);
        }}
        studentInfo={selectedStudent ? {
          studentId: selectedStudent.id,
          studentName: selectedStudent.name,
          school: selectedStudent.school || undefined,
          schoolType: selectedStudent.school_type || undefined,
          grade: selectedStudent.grade || undefined,
        } : undefined}
        editingConsultation={editingConsultation}
        onSuccess={() => {
          loadConsultations();
          loadStatistics();
        }}
      />
    </div>
  );
}
