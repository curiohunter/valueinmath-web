"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ConsultationModal } from "@/components/consultations/ConsultationModal";
import { ConsultationStats } from "@/components/consultations/ConsultationStats";
import { StudentsTab } from "@/components/consultations/StudentsTab";
import { ConsultationHistoryTab } from "@/components/consultations/ConsultationHistoryTab";
import { calendarService } from "@/services/calendar";
import type { Database } from "@/types/database";
import type { Consultation } from "@/types/consultation";
import type { ConsultationPageStats, TeacherGroup, AtRiskSnapshot } from "@/types/at-risk";
import { atRiskSnapshotService } from "@/services/at-risk-snapshot-service";
import AtRiskStudentsCard from "@/components/dashboard/AtRiskStudentsCard";
import StudentDetailModal from "@/components/dashboard/StudentDetailModal";
import type { AtRiskStudent } from "@/types/at-risk";

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
  });
  
  // State for at-risk students
  const [atRiskStudents, setAtRiskStudents] = useState<TeacherGroup[]>([]);
  const [selectedAtRiskStudent, setSelectedAtRiskStudent] = useState<AtRiskStudent | null>(null);
  const [isStudentDetailModalOpen, setIsStudentDetailModalOpen] = useState(false);
  const [historicalSnapshots, setHistoricalSnapshots] = useState<AtRiskSnapshot[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
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
    loadAtRiskStudents();
  }, []);
  
  // Load historical snapshots when month changes
  useEffect(() => {
    if (selectedMonth && activeTab === 'atRisk') {
      loadHistoricalSnapshots();
    }
  }, [selectedMonth, activeTab]);
  
  const loadStudents = async () => {
    const { data, error } = await supabase
      .from("students")
      .select("*")
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
        .gte("first_contact_date", startOfMonth.toISOString().split('T')[0])
        .lte("first_contact_date", endOfMonth.toISOString().split('T')[0]);
      
      // 4. 이번달 입학테스트
      const { data: testsScheduled } = await supabase
        .from("entrance_tests")
        .select(`
          *,
          students!consultation_id(department)
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
      
      // 6. 위험 학생 수 계산
      // 주의: calculateAtRiskStudents()는 선생님별 상위 3명만 반환합니다
      const atRiskGroups = await atRiskSnapshotService.calculateAtRiskStudents();
      
      // 실제 화면에 표시되는 학생들과 동일하게 카운트
      // 고위험, 중위험, 주의를 분리하여 카운트
      const highRiskStudents = new Set<string>();
      const mediumRiskStudents = new Set<string>();
      const atRiskByDept: Record<string, number> = {};
      const uniqueStudentsByDept = new Map<string, Set<string>>();
      
      atRiskGroups.forEach(group => {
        group.students.forEach(student => {
          if (student.riskLevel === 'high') {
            highRiskStudents.add(student.studentId);
          } else if (student.riskLevel === 'medium') {
            mediumRiskStudents.add(student.studentId);
          }
          
          // 고위험과 중위험만 통계에 포함
          if (student.riskLevel === 'high' || student.riskLevel === 'medium') {
            const dept = student.department || '미분류';
            if (!uniqueStudentsByDept.has(dept)) {
              uniqueStudentsByDept.set(dept, new Set());
            }
            uniqueStudentsByDept.get(dept)!.add(student.studentId);
          }
        });
      });
      
      uniqueStudentsByDept.forEach((studentSet, dept) => {
        atRiskByDept[dept] = studentSet.size;
      });
      
      // 고위험 + 중위험 총합
      const atRiskCount = highRiskStudents.size + mediumRiskStudents.size;
      
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
        atRiskCount,
        atRiskByDept,
      });
    } catch (error) {
      console.error("Error loading statistics:", error);
      toast.error("통계 데이터를 불러오는데 실패했습니다.");
    }
  };
  
  const loadAtRiskStudents = async () => {
    try {
      const groups = await atRiskSnapshotService.calculateAtRiskStudents();
      setAtRiskStudents(groups);
    } catch (error) {
      console.error("Error loading at-risk students:", error);
      toast.error("위험 학생 데이터를 불러오는데 실패했습니다.");
    }
  };
  
  const loadHistoricalSnapshots = async () => {
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const snapshots = await atRiskSnapshotService.getHistoricalSnapshots(year, month);
      setHistoricalSnapshots(snapshots);
    } catch (error) {
      console.error("Error loading historical snapshots:", error);
      toast.error("과거 스냅샷 데이터를 불러오는데 실패했습니다.");
    }
  };
  
  const handleSaveSnapshot = async () => {
    if (!confirm("현재 위험 학생 데이터를 스냅샷으로 저장하시겠습니까?")) {
      return;
    }
    
    try {
      await atRiskSnapshotService.saveMonthlySnapshot();
      toast.success("위험 학생 스냅샷이 저장되었습니다.");
      await loadHistoricalSnapshots();
    } catch (error) {
      console.error("Error saving snapshot:", error);
      toast.error("스냅샷 저장에 실패했습니다.");
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">상담 관리</h1>
      </div>
      
      {/* Statistics Cards */}
      <ConsultationStats 
        stats={stats} 
        onAtRiskClick={() => setActiveTab('atRisk')} 
      />
      
      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="students">학생 목록</TabsTrigger>
          <TabsTrigger value="history">상담 이력</TabsTrigger>
          <TabsTrigger value="atRisk">위험 학생 관리</TabsTrigger>
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
        
        {/* At-Risk Students Tab */}
        <TabsContent value="atRisk" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    위험 학생 관리
                  </CardTitle>
                  <CardDescription>출석, 숙제, 집중도, 시험 점수 기준 관리 필요 학생</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="월 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const months = [];
                        const now = new Date();
                        for (let i = 0; i < 6; i++) {
                          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                          const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                          const label = `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
                          months.push({ value, label });
                        }
                        return months.map(m => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleSaveSnapshot}
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    스냅샷 저장
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="current" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="current">실시간 현황</TabsTrigger>
                  <TabsTrigger value="history">과거 스냅샷</TabsTrigger>
                </TabsList>
                
                <TabsContent value="current" className="mt-4">
                  <AtRiskStudentsCard 
                    teacherGroups={atRiskStudents}
                    loading={loading}
                    onStudentClick={(student) => {
                      setSelectedAtRiskStudent(student);
                      setIsStudentDetailModalOpen(true);
                    }}
                  />
                </TabsContent>
                
                <TabsContent value="history" className="mt-4">
                  {historicalSnapshots.length > 0 ? (
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        {selectedMonth}월 스냅샷 ({historicalSnapshots.length}명)
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>학생명</TableHead>
                            <TableHead>반</TableHead>
                            <TableHead>담당 선생님</TableHead>
                            <TableHead>위험도</TableHead>
                            <TableHead>종합 점수</TableHead>
                            <TableHead>출석</TableHead>
                            <TableHead>숙제</TableHead>
                            <TableHead>집중도</TableHead>
                            <TableHead>시험 점수</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {historicalSnapshots.map((snapshot) => (
                            <TableRow key={`${snapshot.student_id}_${snapshot.teacher_id}`}>
                              <TableCell className="font-medium">{snapshot.student_name}</TableCell>
                              <TableCell>{snapshot.class_names}</TableCell>
                              <TableCell>{snapshot.teacher_name}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    snapshot.risk_level === 'high' ? 'destructive' :
                                    snapshot.risk_level === 'medium' ? 'secondary' :
                                    'outline'
                                  }
                                >
                                  {snapshot.risk_level === 'high' ? '고위험' :
                                   snapshot.risk_level === 'medium' ? '중위험' : '주의'}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-bold">{snapshot.total_score.toFixed(2)}</TableCell>
                              <TableCell>{snapshot.attendance_avg?.toFixed(1) || '-'}</TableCell>
                              <TableCell>{snapshot.homework_avg?.toFixed(1) || '-'}</TableCell>
                              <TableCell>{snapshot.focus_avg?.toFixed(1) || '-'}</TableCell>
                              <TableCell>{snapshot.test_score?.toFixed(0) || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      선택한 월의 스냅샷 데이터가 없습니다.
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
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
      
      {/* Student Detail Modal */}
      <StudentDetailModal
        isOpen={isStudentDetailModalOpen}
        onClose={() => {
          setIsStudentDetailModalOpen(false);
          setSelectedAtRiskStudent(null);
        }}
        student={selectedAtRiskStudent}
      />
    </div>
  );
}