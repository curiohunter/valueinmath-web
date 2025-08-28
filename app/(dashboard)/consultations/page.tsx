"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { 
  Search, 
  Plus, 
  Calendar,
  Users,
  TrendingUp,
  ClipboardList,
  Edit,
  Trash2,
  ChevronUp,
  ChevronDown,
  FileText,
  Eye
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ConsultationModal } from "@/components/consultations/ConsultationModal";
import { calendarService } from "@/services/calendar";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";
import type { Consultation, ConsultationStats } from "@/types/consultation";
import type { ConsultationPageStats, TeacherGroup, AtRiskSnapshot } from "@/types/at-risk";
import { atRiskSnapshotService } from "@/services/at-risk-snapshot-service";
import AtRiskStudentsCard from "@/components/dashboard/AtRiskStudentsCard";
import StudentDetailModal from "@/components/dashboard/StudentDetailModal";
import type { AtRiskStudent } from "@/types/at-risk";
import { AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";

type Student = Database['public']['Tables']['students']['Row'];
type Employee = Database['public']['Tables']['employees']['Row'];

export default function ConsultationsPage() {
  const supabase = createClient();
  
  // State for tabs
  const [activeTab, setActiveTab] = useState("students");
  
  // State for student list
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState("신규상담");
  const [studentSchoolTypeFilter, setStudentSchoolTypeFilter] = useState("all");
  const [studentGradeFilter, setStudentGradeFilter] = useState("all");
  const [studentSortBy, setStudentSortBy] = useState<'name' | 'school_type' | 'grade' | 'school'>('name');
  const [studentSortOrder, setStudentSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // State for consultation history
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [filteredConsultations, setFilteredConsultations] = useState<Consultation[]>([]);
  const [consultationSearchTerm, setConsultationSearchTerm] = useState("");
  const [consultationTypeFilter, setConsultationTypeFilter] = useState("all");
  const [consultationStatusFilter, setConsultationStatusFilter] = useState("all");
  const [consultationCounselorFilter, setConsultationCounselorFilter] = useState("all");
  const [consultationDateOrder, setConsultationDateOrder] = useState<'asc' | 'desc'>('desc');
  
  // State for content preview
  const [expandedContent, setExpandedContent] = useState<Set<string>>(new Set());
  
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
  
  // Filter students when search or filters change
  useEffect(() => {
    let filtered = [...students];
    
    // Apply search filter
    if (studentSearchTerm) {
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(studentSearchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (studentStatusFilter !== "all") {
      filtered = filtered.filter(s => s.status === studentStatusFilter);
    }
    
    // Apply school type filter - map UI values to database values
    if (studentSchoolTypeFilter !== "all") {
      const schoolTypeMap: Record<string, string> = {
        "초등": "초등학교",
        "중등": "중학교", 
        "고등": "고등학교"
      };
      const dbSchoolType = schoolTypeMap[studentSchoolTypeFilter];
      filtered = filtered.filter(s => s.school_type === dbSchoolType);
    }
    
    // Apply grade filter
    if (studentGradeFilter !== "all") {
      filtered = filtered.filter(s => s.grade?.toString() === studentGradeFilter);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let compareValue = 0;
      
      switch (studentSortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name, 'ko');
          break;
        case 'school_type':
          compareValue = (a.school_type || '').localeCompare(b.school_type || '', 'ko');
          break;
        case 'grade':
          compareValue = (a.grade || 0) - (b.grade || 0);
          break;
        case 'school':
          compareValue = (a.school || '').localeCompare(b.school || '', 'ko');
          break;
      }
      
      return studentSortOrder === 'asc' ? compareValue : -compareValue;
    });
    
    setFilteredStudents(filtered);
  }, [students, studentSearchTerm, studentStatusFilter, studentSchoolTypeFilter, studentGradeFilter, studentSortBy, studentSortOrder]);
  
  // Filter consultations when search or filters change
  useEffect(() => {
    let filtered = [...consultations];
    
    // Apply search filter
    if (consultationSearchTerm) {
      filtered = filtered.filter(c => 
        c.student_name_snapshot?.toLowerCase().includes(consultationSearchTerm.toLowerCase())
      );
    }
    
    // Apply type filter
    if (consultationTypeFilter !== "all") {
      filtered = filtered.filter(c => c.type === consultationTypeFilter);
    }
    
    // Apply status filter
    if (consultationStatusFilter !== "all") {
      filtered = filtered.filter(c => c.status === consultationStatusFilter);
    }
    
    // Apply counselor filter
    if (consultationCounselorFilter !== "all") {
      filtered = filtered.filter(c => c.counselor_id === consultationCounselorFilter);
    }
    
    // Apply date sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return consultationDateOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    setFilteredConsultations(filtered);
  }, [consultations, consultationSearchTerm, consultationTypeFilter, consultationStatusFilter, consultationCounselorFilter, consultationDateOrder]);
  
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
    if (student) {
      setSelectedStudent(student);
    }
    setEditingConsultation(null);
    setModalOpen(true);
  };
  
  const handleEditConsultation = (consultation: Consultation) => {
    setEditingConsultation(consultation);
    setSelectedStudent(null);
    setModalOpen(true);
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
  
  const handleSortStudents = (column: 'name' | 'school_type' | 'grade' | 'school') => {
    if (studentSortBy === column) {
      setStudentSortOrder(studentSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setStudentSortBy(column);
      setStudentSortOrder('asc');
    }
  };
  
  const toggleContentExpansion = (consultationId: string) => {
    const newExpanded = new Set(expandedContent);
    if (newExpanded.has(consultationId)) {
      newExpanded.delete(consultationId);
    } else {
      newExpanded.add(consultationId);
    }
    setExpandedContent(newExpanded);
  };
  
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "재원":
        return "bg-green-100 text-green-800";
      case "신규상담":
        return "bg-blue-100 text-blue-800";
      case "퇴원":
        return "bg-gray-100 text-gray-800";
      case "휴원":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  const getConsultationTypeBadgeColor = (type: string) => {
    switch (type) {
      case "신규상담":
        return "bg-purple-100 text-purple-800";
      case "입학후상담":
        return "bg-blue-100 text-blue-800";
      case "등록유도":
        return "bg-indigo-100 text-indigo-800";
      case "적응상담":
        return "bg-green-100 text-green-800";
      case "정기상담":
        return "bg-teal-100 text-teal-800";
      case "퇴원상담":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  const getConsultationStatusBadgeColor = (status: string) => {
    switch (status) {
      case "예정":
        return "bg-yellow-100 text-yellow-800";
      case "완료":
        return "bg-green-100 text-green-800";
      case "취소":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">상담 관리</h1>
      </div>
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">이번달 신규생</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">{stats.newStudentsThisMonth}</span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-xs text-muted-foreground space-y-1 mt-2">
              {Object.entries(stats.newStudentsByDeptNames).map(([dept, names]) => (
                <div key={dept}>
                  <span className="font-semibold">{dept}: </span>
                  <span>{names.join(', ')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">이번달 신규상담</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">{stats.consultationsThisMonth}</span>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-xs text-muted-foreground space-y-1 mt-2">
              {Object.entries(stats.consultationsByDept).map(([dept, count]) => (
                <div key={dept}>{dept}: {count}건</div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">입학테스트 전환율</CardTitle>
            <CardDescription className="text-xs">
              전체: {stats.testConversionTotal.tests}/{stats.testConversionTotal.consultations}건
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xs space-y-1">
              {Object.entries(stats.testConversionByDept).map(([dept, rate]) => (
                <div key={dept} className="flex justify-between">
                  <span>{dept}:</span>
                  <span className={cn(
                    "font-bold",
                    rate >= 70 ? "text-green-600" :
                    rate >= 40 ? "text-amber-600" :
                    "text-red-600"
                  )}>
                    {rate}%
                  </span>
                </div>
              ))}
              {Object.keys(stats.testConversionByDept).length === 0 && (
                <span className="text-muted-foreground">데이터 없음</span>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">신규등원 전환율</CardTitle>
            <CardDescription className="text-xs">
              전체: {stats.enrollmentConversionTotal.enrollments}/{stats.enrollmentConversionTotal.consultations}건
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xs space-y-1">
              {Object.entries(stats.enrollmentConversionByDept).map(([dept, rate]) => (
                <div key={dept} className="flex justify-between">
                  <span>{dept}:</span>
                  <span className={cn(
                    "font-bold",
                    rate >= 50 ? "text-green-600" :
                    rate >= 25 ? "text-amber-600" :
                    "text-red-600"
                  )}>
                    {rate}%
                  </span>
                </div>
              ))}
              {Object.keys(stats.enrollmentConversionByDept).length === 0 && (
                <span className="text-muted-foreground">데이터 없음</span>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer transition-colors hover:bg-accent"
          onClick={() => setActiveTab('atRisk')}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              관리 필요 학생
            </CardTitle>
            <CardDescription className="text-xs">
              고위험 + 중위험 학생
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-orange-600">{stats.atRiskCount}</span>
              <TrendingDown className="h-4 w-4 text-orange-600" />
            </div>
            <div className="text-xs text-muted-foreground space-y-1 mt-2">
              {Object.entries(stats.atRiskByDept).map(([dept, count]) => (
                <div key={dept}>{dept}: {count}명</div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="students">학생 목록</TabsTrigger>
          <TabsTrigger value="history">상담 이력</TabsTrigger>
          <TabsTrigger value="atRisk">위험 학생 관리</TabsTrigger>
        </TabsList>
        
        {/* Students Tab */}
        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>학생 목록</CardTitle>
              <CardDescription>전체 학생 목록에서 상담을 등록할 수 있습니다.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="학생 이름 검색..."
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={studentStatusFilter} onValueChange={setStudentStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="상태 필터" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 상태</SelectItem>
                    <SelectItem value="재원">재원</SelectItem>
                    <SelectItem value="신규상담">신규상담</SelectItem>
                    <SelectItem value="퇴원">퇴원</SelectItem>
                    <SelectItem value="휴원">휴원</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={studentSchoolTypeFilter} onValueChange={setStudentSchoolTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="학교급 필터" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 학교급</SelectItem>
                    <SelectItem value="초등">초등</SelectItem>
                    <SelectItem value="중등">중등</SelectItem>
                    <SelectItem value="고등">고등</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={studentGradeFilter} onValueChange={setStudentGradeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="학년 필터" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 학년</SelectItem>
                    {[1, 2, 3, 4, 5, 6].map(grade => (
                      <SelectItem key={grade} value={grade.toString()}>
                        {grade}학년
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Students Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSortStudents('name')}
                    >
                      <div className="flex items-center">
                        이름
                        {studentSortBy === 'name' && (
                          studentSortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSortStudents('school_type')}
                    >
                      <div className="flex items-center">
                        학교급
                        {studentSortBy === 'school_type' && (
                          studentSortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSortStudents('grade')}
                    >
                      <div className="flex items-center">
                        학년
                        {studentSortBy === 'grade' && (
                          studentSortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSortStudents('school')}
                    >
                      <div className="flex items-center">
                        학교
                        {studentSortBy === 'school' && (
                          studentSortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.school_type || '-'}</TableCell>
                      <TableCell>{student.grade || '-'}</TableCell>
                      <TableCell>{student.school || '-'}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(student.status)}>
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleOpenConsultationModal(student)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          상담
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>상담 이력</CardTitle>
              <CardDescription>전체 상담 기록을 조회하고 관리합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="학생 이름 검색..."
                      value={consultationSearchTerm}
                      onChange={(e) => setConsultationSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={consultationTypeFilter} onValueChange={setConsultationTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="상담 유형" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 유형</SelectItem>
                    <SelectItem value="신규상담">신규상담</SelectItem>
                    <SelectItem value="입학후상담">입학후상담</SelectItem>
                    <SelectItem value="등록유도">등록유도</SelectItem>
                    <SelectItem value="적응상담">적응상담</SelectItem>
                    <SelectItem value="정기상담">정기상담</SelectItem>
                    <SelectItem value="퇴원상담">퇴원상담</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={consultationStatusFilter} onValueChange={setConsultationStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 상태</SelectItem>
                    <SelectItem value="예정">예정</SelectItem>
                    <SelectItem value="완료">완료</SelectItem>
                    <SelectItem value="취소">취소</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={consultationCounselorFilter} onValueChange={setConsultationCounselorFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="담당자" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 담당자</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConsultationDateOrder(consultationDateOrder === 'asc' ? 'desc' : 'asc')}
                >
                  날짜 {consultationDateOrder === 'desc' ? '↓' : '↑'}
                </Button>
              </div>
              
              {/* Consultations Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">날짜</TableHead>
                    <TableHead className="w-16">시간</TableHead>
                    <TableHead className="w-20">학생</TableHead>
                    <TableHead className="w-24">유형</TableHead>
                    <TableHead className="w-20">담당자</TableHead>
                    <TableHead className="w-20">방법</TableHead>
                    <TableHead className="w-32">내용</TableHead>
                    <TableHead className="w-16">상태</TableHead>
                    <TableHead className="w-24 text-right">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConsultations.map((consultation) => {
                    const date = new Date(consultation.date);
                    const dateStr = date.toLocaleDateString('ko-KR');
                    const timeStr = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                    const isExpanded = expandedContent.has(consultation.id);
                    const hasContent = consultation.content && consultation.content.trim().length > 0;
                    
                    return (
                      <TableRow key={consultation.id}>
                        <TableCell>{dateStr}</TableCell>
                        <TableCell>{timeStr}</TableCell>
                        <TableCell className="font-medium">
                          {consultation.student_name_snapshot || consultation.student?.name || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={getConsultationTypeBadgeColor(consultation.type)}>
                            {consultation.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {consultation.counselor_name_snapshot || consultation.counselor?.name || '-'}
                        </TableCell>
                        <TableCell>{consultation.method}</TableCell>
                        <TableCell className="w-32 max-w-[128px]">
                          {hasContent ? (
                            <div className="space-y-1">
                              <div 
                                className={`text-xs text-gray-600 break-words ${isExpanded ? '' : 'line-clamp-1'}`}
                                title={!isExpanded ? consultation.content : undefined}
                              >
                                {consultation.content}
                              </div>
                              {consultation.content.length > 30 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-1 text-xs text-blue-600 hover:text-blue-700"
                                  onClick={() => toggleContentExpansion(consultation.id)}
                                >
                                  <Eye className="h-3 w-3 mr-0.5" />
                                  {isExpanded ? '접기' : '더보기'}
                                </Button>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getConsultationStatusBadgeColor(consultation.status)}>
                            {consultation.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditConsultation(consultation)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteConsultation(consultation)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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