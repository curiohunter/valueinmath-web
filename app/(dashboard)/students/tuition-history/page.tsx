// @ts-nocheck
"use client";
import React, { useState, useEffect } from "react";
import StudentClassTabs from "@/components/StudentClassTabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import type { Database } from "@/types/database";
import { Input } from "@/components/ui/input";
import { TuitionTable } from "@/components/tuition/tuition-table";
import { Save, Trash2, Download, Filter, Calendar } from "lucide-react";
import { toast } from "sonner";
import type { TuitionRow, PaymentStatus, ClassType, TuitionFeeInput } from "@/types/tuition";

// 금액 포맷팅 함수
const formatAmount = (amount: number) => {
  return amount.toLocaleString() + "원";
};

// 통계 계산 함수
const calculateStats = (data: TuitionRow[]) => {
  const totalCount = data.length;
  const totalAmount = data.reduce((sum, row) => sum + row.amount, 0);
  const paidRows = data.filter(row => row.paymentStatus === '완납');
  const unpaidRows = data.filter(row => row.paymentStatus === '미납');
  const partialRows = data.filter(row => row.paymentStatus === '부분납');
  
  return {
    totalCount,
    totalAmount,
    paidCount: paidRows.length,
    paidAmount: paidRows.reduce((sum, row) => sum + row.amount, 0),
    unpaidCount: unpaidRows.length,
    unpaidAmount: unpaidRows.reduce((sum, row) => sum + row.amount, 0),
    partialCount: partialRows.length,
    partialAmount: partialRows.reduce((sum, row) => sum + row.amount, 0)
  };
};

export default function TuitionHistoryPage() {
  const supabase = createClient<Database>();
  const { user, loading: authLoading } = useAuth();
  
  // 필터 상태
  const [datePreset, setDatePreset] = useState("custom");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]); // 반별 중복선택
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]); // 학생 중복선택으로 변경
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("");
  const [selectedClassType, setSelectedClassType] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<TuitionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 반/학생 id→이름 매핑
  const [classMap, setClassMap] = useState<{ [id: string]: string }>({});
  const [studentMap, setStudentMap] = useState<{ [id: string]: string }>({});
  const [classOptions, setClassOptions] = useState<{id: string, name: string, teacher_id?: string | null}[]>([]);
  const [studentOptions, setStudentOptions] = useState<{id: string, name: string}[]>([]);
  const [classSearch, setClassSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [teachers, setTeachers] = useState<{id: string, name: string}[]>([]);
  
  // 테이블 상태
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [classTypeFilter, setClassTypeFilter] = useState("all");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  
  // 변경사항 추적
  const [originalData, setOriginalData] = useState<TuitionRow[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 반 이름 매핑 및 선생님 정보 fetch (초기 로드)
  useEffect(() => {
    async function fetchClassesAndTeachers() {
      // 반 정보 가져오기 (teacher_id 포함)
      const { data: classes } = await supabase.from("classes").select("id,name,teacher_id");
      setClassMap(Object.fromEntries((classes || []).map((c: any) => [c.id, c.name])));
      setClassOptions(classes || []);
      
      // 선생님 정보 가져오기 (재직 중인 직원)
      const { data: employeesData, error: employeesError } = await supabase
        .from("employees")
        .select("id, name")
        .eq("status", "재직");
      
      if (employeesError) {
        console.error("Error fetching employees:", employeesError);
      }
      
      setTeachers(employeesData || []);
    }
    fetchClassesAndTeachers();
  }, []);

  // 날짜 범위에 따른 학생 목록 동적 fetch
  useEffect(() => {
    async function fetchStudentsInDateRange() {
      if (!dateRange.from || !dateRange.to) return;

      const [fromYear, fromMonth] = dateRange.from.split('-').map(Number);
      const [toYear, toMonth] = dateRange.to.split('-').map(Number);

      // 날짜 범위에 해당하는 tuition_fees에서 unique한 student_id들을 가져오기
      let query = supabase
        .from("tuition_fees")
        .select("student_id, students!inner(id, name)")
        .order("students(name)", { ascending: true });

      // 날짜 범위 필터링
      if (fromYear && fromMonth && toYear && toMonth) {
        if (fromYear === toYear) {
          query = query
            .eq("year", fromYear)
            .gte("month", fromMonth)
            .lte("month", toMonth);
        } else {
          query = query.or(
            `and(year.eq.${fromYear},month.gte.${fromMonth}),` +
            `and(year.eq.${toYear},month.lte.${toMonth})` +
            (toYear - fromYear > 1 ? `,and(year.gt.${fromYear},year.lt.${toYear})` : '')
          );
        }
      }

      const { data, error } = await query;
      
      if (!error && data) {
        // 중복 제거하여 unique한 학생 목록 생성
        const uniqueStudents = new Map();
        data.forEach((item: any) => {
          if (item.students && !uniqueStudents.has(item.student_id)) {
            uniqueStudents.set(item.student_id, {
              id: item.student_id,
              name: item.students.name
            });
          }
        });

        const studentList = Array.from(uniqueStudents.values()).sort((a, b) => 
          a.name.localeCompare(b.name, 'ko')
        );
        
        setStudentOptions(studentList);
        setStudentMap(Object.fromEntries(studentList.map((s: any) => [s.id, s.name])));
        
        // 날짜 범위가 변경되면 선택된 학생 초기화 (새로운 날짜 범위에 없는 학생이 선택되어 있을 수 있으므로)
        setSelectedStudents([]);
      }
    }

    fetchStudentsInDateRange();
  }, [dateRange]);

  // 이번 달 기본 설정
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const firstDay = `${year}-${month.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const lastDayStr = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    setDateRange({ from: firstDay, to: lastDayStr });
  }, []);

  // 데이터 페칭 함수
  async function fetchTuitionHistoryWithFilters(resetPage: boolean = true) {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("tuition_fees")
        .select(`
          id,
          class_id,
          student_id,
          year,
          month,
          is_sibling,
          class_type,
          amount,
          note,
          payment_status,
          payment_date,
          classes!left(name),
          students!left(name, status)
        `);
      
      // 연월 범위 필터 - 정확한 필터링 로직
      if (dateRange.from && dateRange.to) {
        const [fromYear, fromMonth] = dateRange.from.split('-').map(Number);
        const [toYear, toMonth] = dateRange.to.split('-').map(Number);
        
        if (fromYear && fromMonth && toYear && toMonth) {
          if (fromYear === toYear) {
            // 같은 연도 내에서 월 범위
            query = query
              .eq("year", fromYear)
              .gte("month", fromMonth)
              .lte("month", toMonth);
          } else {
            // 연도를 넘나드는 범위
            query = query.or(
              `and(year.eq.${fromYear},month.gte.${fromMonth}),` +
              `and(year.eq.${toYear},month.lte.${toMonth})` +
              (toYear - fromYear > 1 ? `,and(year.gt.${fromYear},year.lt.${toYear})` : '')
            );
          }
        }
      } else if (dateRange.from) {
        const [fromYear, fromMonth] = dateRange.from.split('-').map(Number);
        if (fromYear && fromMonth) {
          query = query.or(`year.gt.${fromYear},and(year.eq.${fromYear},month.gte.${fromMonth})`);
        }
      } else if (dateRange.to) {
        const [toYear, toMonth] = dateRange.to.split('-').map(Number);
        if (toYear && toMonth) {
          query = query.or(`year.lt.${toYear},and(year.eq.${toYear},month.lte.${toMonth})`);
        }
      }
      
      // 반 필터 (중복선택 지원)
      if (selectedClasses.length > 0) {
        query = query.in("class_id", selectedClasses);
      }
      
      // 학생 필터 (중복선택 지원)
      if (selectedStudents.length > 0) {
        query = query.in("student_id", selectedStudents);
      }

      // 납부 상태 필터
      if (selectedPaymentStatus) {
        query = query.eq("payment_status", selectedPaymentStatus);
      }

      const { data, error } = await query.order("year", { ascending: false }).order("month", { ascending: false });
      
      if (error) throw error;

      // 데이터 변환
      // @ts-ignore - Supabase 복잡한 관계 타입 처리
      const transformedData: TuitionRow[] = (data || []).map((item: any) => {
        const studentStatus = (item.students as any)?.status || '';
        const studentName = (item.students as any)?.name || '(알 수 없음)';
        // class_type이 '입학테스트비'인지 확인 (공백 제거하여 비교)
        const isEntranceTest = item.class_type?.trim() === '입학테스트비';
        const isRetired = !isEntranceTest && studentStatus && !studentStatus.includes('재원');
        
        // 반명 처리: 입학테스트비인 경우 "입학테스트비", 아니면 기존 반명 또는 "(반 정보 없음)"
        const className = isEntranceTest ? '입학테스트비' : 
                         ((item.classes as any)?.name || '(반 정보 없음)');
        
        return {
          id: item.id,
          classId: item.class_id,
          className: className,
          studentId: item.student_id,
          studentName: isEntranceTest ? studentName : 
                       (isRetired ? `${studentName} (퇴원)` : studentName),
          year: item.year,
          month: item.month,
          isSibling: item.is_sibling || false,
          classType: item.class_type,
          amount: item.amount,
          note: item.note || '',
          paymentStatus: item.payment_status,
          paymentDate: item.payment_date || undefined
        };
      });

      // 클라이언트 사이드에서 반 이름으로 추가 정렬
      transformedData.sort((a, b) => {
        // 먼저 년도로 비교 (내림차순)
        if (a.year !== b.year) return b.year - a.year;
        // 같은 년도면 월로 비교 (내림차순)
        if (a.month !== b.month) return b.month - a.month;
        // 같은 년월이면 반 이름으로 비교 (오름차순)
        return a.className.localeCompare(b.className, 'ko');
      });

      setData(transformedData);
      setOriginalData(JSON.parse(JSON.stringify(transformedData))); // 깊은 복사
      setHasUnsavedChanges(false); // 데이터 로드 시 변경사항 없음
      
      // resetPage가 true일 때만 페이지를 1로 리셋
      if (resetPage) {
        setPage(1);
      }
    } catch (e) {
      console.error("데이터 fetch 에러:", e);
      setError("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // 검색 버튼 클릭 시
  function handleSearch() {
    // 변경사항이 있으면 경고
    if (hasUnsavedChanges) {
      const confirmChange = window.confirm("저장하지 않은 변경사항이 있습니다. 계속하시겠습니까?");
      if (!confirmChange) return;
    }
    
    // 검색 실행 (selectedClasses와 selectedStudents는 이미 state에 있으므로 자동으로 적용됨)
    fetchTuitionHistoryWithFilters();
  }

  // 초기화 버튼
  function resetFilters() {
    setClassSearch("");
    setStudentSearch("");
    setSelectedClasses([]); // 반별 중복선택 초기화
    setSelectedStudents([]); // 학생 중복선택 초기화
    setSelectedPaymentStatus("");
    setSelectedClassType("");
    setSearchTerm("");
    setPaymentStatusFilter("all");
    setClassTypeFilter("all");
    setDatePreset("custom");
    setSelectedRows([]);
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const firstDay = `${year}-${month.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const lastDayStr = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    setDateRange({ from: firstDay, to: lastDayStr });
  }

  // 페이지당 아이템 수
  const pageSize = 12;
  
  // 검색 및 필터링 적용
  const filteredData = data.filter(row => {
    // 검색어 필터
    const searchMatches = !searchTerm || 
      row.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (row.note && row.note.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // 납부 상태 필터
    const statusMatches = paymentStatusFilter === "all" || row.paymentStatus === paymentStatusFilter;
    
    // 수업 유형 필터
    const classTypeMatches = classTypeFilter === "all" || row.classType === classTypeFilter;
    
    return searchMatches && statusMatches && classTypeMatches;
  });
  
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = filteredData.slice(startIndex, endIndex);
  
  // 통계 계산
  const stats = calculateStats(filteredData);

  // 개별 행 수정 핸들러
  const handleRowChange = (index: number, field: keyof TuitionRow, value: any) => {
    // paginatedData의 index를 사용하여 직접 접근
    if (index < paginatedData.length) {
      const rowToUpdate = paginatedData[index];
      const originalDataIndex = data.findIndex(item => item.id === rowToUpdate.id);
      
      if (originalDataIndex !== -1) {
        setData(prev => prev.map((row, i) => 
          i === originalDataIndex ? { ...row, [field]: value } : row
        ));
      }
    }
  };

  // 개별 행 저장 핸들러
  const handleRowSave = async (index: number) => {
    if (index >= paginatedData.length) return;
    
    const row = paginatedData[index];
    
    setIsSaving(true);
    try {
      const updateData: Partial<TuitionFeeInput> = {
        year: row.year,
        month: row.month,
        class_type: row.classType,
        payment_status: row.paymentStatus,
        amount: row.amount,
        is_sibling: row.isSibling,
        note: row.note || undefined
      };

      const { error } = await supabase
        .from("tuition_fees")
        .update(updateData)
        .eq("id", row.id);

      if (error) throw error;

      toast.success(`${row.studentName}의 학원비가 저장되었습니다.`);
      
      // 데이터 새로고침 (페이지 유지)
      fetchTuitionHistoryWithFilters(false);
    } catch (error) {
      console.error("학원비 저장 에러:", error);
      toast.error("학원비 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // 개별 행 삭제 핸들러
  const handleRowDelete = async (index: number) => {
    if (index >= paginatedData.length) return;
    
    const row = paginatedData[index];
    const confirmDelete = window.confirm(`정말로 ${row.studentName}의 ${row.year}년 ${row.month}월 학원비를 삭제하시겠습니까?`);
    
    if (!confirmDelete) return;
    
    try {
      const { error } = await supabase
        .from("tuition_fees")
        .delete()
        .eq("id", row.id);

      if (error) throw error;

      toast.success(`${row.studentName}의 학원비가 성공적으로 삭제되었습니다.`);

      // 데이터 새로고침 (페이지 유지)
      fetchTuitionHistoryWithFilters(false);
    } catch (error) {
      console.error("학원비 삭제 에러:", error);
      toast.error("학원비 삭제 중 오류가 발생했습니다.");
    }
  };

  // 행 선택 핸들러
  const handleRowSelect = (index: number, selected: boolean) => {
    // paginatedData의 실제 row ID를 사용하여 선택 관리
    if (index >= paginatedData.length) return;
    
    const row = paginatedData[index];
    const globalIndex = data.findIndex(item => item.id === row.id);
    
    if (selected) {
      setSelectedRows([...selectedRows, globalIndex]);
    } else {
      setSelectedRows(selectedRows.filter(i => i !== globalIndex));
    }
  };

  // 전체 선택 핸들러
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const pageIndices = paginatedData.map((_, index) => (page - 1) * pageSize + index);
      setSelectedRows([...new Set([...selectedRows, ...pageIndices])]);
    } else {
      const pageStart = (page - 1) * pageSize;
      const pageEnd = pageStart + pageSize;
      setSelectedRows(selectedRows.filter(i => i < pageStart || i >= pageEnd));
    }
  };

  // 선택 삭제 핸들러
  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) {
      toast.error("선택된 항목이 없습니다.");
      return;
    }

    const confirmDelete = window.confirm(`선택한 ${selectedRows.length}개의 학원비를 삭제하시겠습니까?`);
    
    if (!confirmDelete) return;
    
    setIsSaving(true);
    try {
      // 선택된 행들의 ID 수집
      const idsToDelete = selectedRows
        .map(index => filteredData[index]?.id)
        .filter(id => id);

      if (idsToDelete.length === 0) {
        toast.error("삭제할 항목을 찾을 수 없습니다.");
        return;
      }

      // 일괄 삭제
      const { error } = await supabase
        .from("tuition_fees")
        .delete()
        .in("id", idsToDelete);

      if (error) throw error;

      toast.success(`${idsToDelete.length}개의 학원비가 삭제되었습니다.`);
      
      // 선택 초기화
      setSelectedRows([]);
      
      // 데이터 새로고침 (페이지 유지)
      fetchTuitionHistoryWithFilters(false);
    } catch (error) {
      console.error("일괄 삭제 에러:", error);
      toast.error("학원비 삭제 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // 전체 저장 핸들러 (모든 변경된 데이터 저장)
  const handleSave = async () => {
    // 변경된 데이터만 찾기
    const changedRows = data.filter((row, index) => {
      const originalRow = originalData[index];
      return JSON.stringify(row) !== JSON.stringify(originalRow);
    });

    if (changedRows.length === 0) {
      toast.info("변경된 데이터가 없습니다.");
      return;
    }

    setIsSaving(true);
    try {
      // 변경된 데이터 일괄 저장
      for (const row of changedRows) {
        const updateData: Partial<TuitionFeeInput> = {
          year: row.year,
          month: row.month,
          class_type: row.classType,
          payment_status: row.paymentStatus,
          amount: row.amount,
          is_sibling: row.isSibling,
          note: row.note || undefined
        };

        const { error } = await supabase
          .from("tuition_fees")
          .update(updateData)
          .eq("id", row.id);

        if (error) throw error;
      }

      toast.success(`${changedRows.length}개의 학원비가 저장되었습니다.`);
      
      // 데이터 새로고침 (페이지 유지)
      fetchTuitionHistoryWithFilters(false);
    } catch (error) {
      console.error("학원비 저장 에러:", error);
      toast.error("학원비 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // 초기 데이터 로드 - selectedClasses, selectedStudents 변경 시에도 자동으로 데이터를 다시 가져옴
  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      fetchTuitionHistoryWithFilters();
    }
  }, [dateRange, selectedClasses, selectedStudents, selectedPaymentStatus]);

  // 데이터 변경 감지
  useEffect(() => {
    const hasChanges = JSON.stringify(data) !== JSON.stringify(originalData);
    setHasUnsavedChanges(hasChanges);
  }, [data, originalData]);

  if (authLoading) return (
    <div className="p-8 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <div className="text-gray-400">로딩 중...</div>
    </div>
  );
  
  if (!user) return (
    <div className="p-8 text-center">
      <div className="text-red-400 text-4xl mb-4">🔒</div>
      <div className="text-red-500">로그인이 필요합니다</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <StudentClassTabs />
      
      {/* 통계 카드 */}
      {filteredData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="text-sm text-purple-700 font-medium">총 건수</div>
            <div className="text-2xl font-bold text-purple-800">{stats.totalCount}건</div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="text-sm text-purple-700 font-medium">총 금액</div>
            <div className="text-2xl font-bold text-purple-800">{formatAmount(stats.totalAmount)}</div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <div className="text-sm text-emerald-700 font-medium">완납 건수</div>
            <div className="text-2xl font-bold text-emerald-800">{stats.paidCount}건</div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <div className="text-sm text-emerald-700 font-medium">완납 금액</div>
            <div className="text-2xl font-bold text-emerald-800">{formatAmount(stats.paidAmount)}</div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="text-sm text-red-700 font-medium">미납 건수</div>
            <div className="text-2xl font-bold text-red-800">{stats.unpaidCount}건</div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="text-sm text-red-700 font-medium">미납 금액</div>
            <div className="text-2xl font-bold text-red-800">{formatAmount(stats.unpaidAmount)}</div>
          </Card>
        </div>
      )}

      {/* 저장 버튼 및 경고 메시지 */}
      {hasUnsavedChanges && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="text-amber-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-amber-800 font-medium">변경사항이 있습니다. 저장하지 않으면 변경사항이 사라집니다.</span>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
          >
            {isSaving ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                저장 중...
              </div>
            ) : (
              "전체 저장"
            )}
          </Button>
        </div>
      )}

      {/* 메인 테이블 */}
      {loading ? (
        <Card className="p-12">
          <div className="text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            로딩 중...
          </div>
        </Card>
      ) : error ? (
        <Card className="p-12">
          <div className="text-center text-red-500">
            <div className="text-red-400 text-4xl mb-4">⚠️</div>
            {error}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <TuitionTable
            rows={paginatedData}
            originalRows={filteredData}
            onRowChange={handleRowChange}
            onRowDelete={handleRowDelete}
            onRowSave={handleRowSave}
            onSave={handleSave}
            isSaving={isSaving}
            selectedRows={paginatedData.map((row, idx) => {
              const globalIndex = data.findIndex(item => item.id === row.id);
              return selectedRows.includes(globalIndex) ? idx : -1;
            }).filter(i => i !== -1)}
            onRowSelect={handleRowSelect}
            onSelectAll={handleSelectAll}
            onBulkDelete={handleBulkDelete}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            paymentStatusFilter={paymentStatusFilter}
            onPaymentStatusFilterChange={setPaymentStatusFilter}
            classTypeFilter={classTypeFilter}
            onClassTypeFilterChange={setClassTypeFilter}
            showSearchAndFilter={true}
            isReadOnly={false}
            isHistoryMode={true}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onResetFilters={resetFilters}
            classOptions={classOptions}
            selectedClasses={selectedClasses}
            onClassSelectionChange={setSelectedClasses}
            studentOptions={studentOptions}
            selectedStudents={selectedStudents}
            onStudentSelectionChange={setSelectedStudents}
            teachers={teachers}
          />
          
        </div>
      )}
      
      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p-1))} 
              disabled={page === 1}
            >
              이전
            </Button>
            {page > 2 && (
              <>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)} 
                  title="첫 페이지로"
                >
                  1
                </Button>
                {page > 3 && <span className="text-gray-400">...</span>}
              </>
            )}
            <div className="flex items-center space-x-1">
              {Array.from({length: Math.min(5, totalPages)}, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                if (pageNum > totalPages) return null;
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            {page < totalPages - 1 && (
              <>
                {page < totalPages - 2 && <span className="text-gray-400">...</span>}
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(totalPages)} 
                  title="마지막 페이지로"
                >
                  {totalPages}
                </Button>
              </>
            )}
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p+1))} 
              disabled={page === totalPages}
            >
              다음
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}