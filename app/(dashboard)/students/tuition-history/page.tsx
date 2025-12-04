// @ts-nocheck
"use client";
import React, { useState, useEffect } from "react";
import StudentClassTabs from "@/components/students/StudentClassTabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import type { Database } from "@/types/database";
import { Input } from "@/components/ui/input";
import { TuitionTable } from "@/components/tuition/tuition-table";
import { Save, Trash2, Download, Filter, Calendar, Send, RefreshCw, CreditCard } from "lucide-react";
import { toast } from "sonner";
import type { TuitionRow, PaymentStatus, ClassType, TuitionFeeInput } from "@/types/tuition";
import { exportTuitionToExcelWithPhone } from "@/lib/excel-export";
import { SendInvoiceModal, PointBalance } from "@/components/payssam";

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

  // PaysSam 관련 상태
  const [showSendInvoiceModal, setShowSendInvoiceModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  // isCreatingInvoices는 1단계 워크플로우 통합으로 제거됨 (isSendingInvoices로 대체)
  const [isSendingInvoices, setIsSendingInvoices] = useState(false);
  const [isProcessingOfflinePayment, setIsProcessingOfflinePayment] = useState(false);

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
        
        // 날짜 범위가 변경되면 선택된 학생 중 새로운 날짜 범위에 없는 학생만 제거
        setSelectedStudents(prev => prev.filter(id => uniqueStudents.has(id)));
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
          period_start_date,
          period_end_date,
          payssam_bill_id,
          payssam_request_status,
          payssam_short_url,
          payssam_sent_at,
          payssam_paid_at,
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
          periodStartDate: item.period_start_date || undefined,
          periodEndDate: item.period_end_date || undefined,
          // PaysSam 필드
          paysSamBillId: item.payssam_bill_id || null,
          paysSamRequestStatus: item.payssam_request_status || null,
          paysSamShortUrl: item.payssam_short_url || null,
          paysSamSentAt: item.payssam_sent_at || null,
          paysSamPaidAt: item.payssam_paid_at || null,
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
    // 변경사항이 있으면 경고
    if (hasUnsavedChanges) {
      const confirmChange = window.confirm("저장하지 않은 변경사항이 있습니다. 계속하시겠습니까?");
      if (!confirmChange) return;
    }
    
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
    
    // 필터 초기화 후 데이터 다시 불러오기
    fetchTuitionHistoryWithFilters();
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
        note: row.note || undefined,
        period_start_date: row.periodStartDate || undefined,
        period_end_date: row.periodEndDate || undefined
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

  // 이 페이지 전체 선택 핸들러
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      // 이 페이지의 모든 행을 선택 (global index 기준)
      const pageGlobalIndices = paginatedData.map(row => data.findIndex(item => item.id === row.id)).filter(i => i !== -1);
      setSelectedRows([...new Set([...selectedRows, ...pageGlobalIndices])]);
    } else {
      // 모든 선택 해제
      setSelectedRows([]);
    }
  };

  // 필터된 전체 데이터 선택 핸들러
  const handleSelectAllFiltered = () => {
    // filteredData의 모든 행을 선택 (global index 기준)
    const allFilteredIndices = filteredData.map(row => data.findIndex(item => item.id === row.id)).filter(i => i !== -1);
    setSelectedRows([...new Set(allFilteredIndices)]);
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
      // selectedRows는 data 배열의 global index를 저장하므로 data[index]로 접근
      const idsToDelete = selectedRows
        .map(index => data[index]?.id)
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

  // 엑셀 내보내기 핸들러
  const handleExport = async () => {
    try {
      // filteredData를 사용하여 현재 필터된 데이터만 내보내기
      const getPaymentPhone = async (studentId: string): Promise<{payment: string | null, parent: string | null}> => {
        const { data, error } = await supabase
          .from("students")
          .select("payment_phone, parent_phone")
          .eq("id", studentId)
          .single();

        if (error || !data) return { payment: null, parent: null };
        return {
          payment: data.payment_phone,
          parent: data.parent_phone
        };
      };

      // 파일명 생성 (날짜 범위 포함)
      let filename = "학원비_청구";
      if (dateRange?.from || dateRange?.to) {
        if (dateRange.from) {
          const [year, month] = dateRange.from.split('-');
          filename += `_${year}년${parseInt(month)}월`;
        }
        if (dateRange.to && dateRange.to !== dateRange.from) {
          const [year, month] = dateRange.to.split('-');
          filename += `-${year}년${parseInt(month)}월`;
        }
      }

      await exportTuitionToExcelWithPhone(filteredData, getPaymentPhone, filename);
      toast.success("엑셀 파일이 다운로드되었습니다.");
    } catch (error) {
      console.error("엑셀 내보내기 에러:", error);
      toast.error("엑셀 내보내기 중 오류가 발생했습니다.");
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
          note: row.note || undefined,
          period_start_date: row.periodStartDate || undefined,
          period_end_date: row.periodEndDate || undefined
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

  // PaysSam 일괄 상태 동기화 핸들러
  const handleBulkSync = async () => {
    // 발송된 청구서만 동기화 대상
    const syncTargets = filteredData.filter(
      row => row.paysSamRequestStatus === 'sent' || row.paysSamRequestStatus === 'paid'
    );

    if (syncTargets.length === 0) {
      toast.info("동기화할 청구서가 없습니다.");
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch("/api/payssam/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tuitionFeeIds: syncTargets.map(row => row.id)
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || `${data.data?.success || 0}건 동기화 완료`);
        fetchTuitionHistoryWithFilters(false); // 데이터 새로고침
      } else {
        toast.error(data.error || "동기화 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("동기화 중 오류가 발생했습니다.");
    } finally {
      setIsSyncing(false);
    }
  };

  // 청구서 일괄 발송 핸들러 (1단계 워크플로우: 결제선생 등록 + 카카오톡 발송)
  // PaysSam에서 "발송"이 곧 "등록"이므로 create API를 사용
  const handleBulkSendInvoices = async () => {
    // selectedRows는 data 배열의 global index를 저장하므로 data[index]로 접근
    const selectedFees = selectedRows
      .map(index => data[index])
      .filter(Boolean)
      .filter(row => !row.paysSamBillId && row.paymentStatus !== '완납'); // 미발송 & 미완납만

    if (selectedFees.length === 0) {
      toast.error("발송할 수 있는 청구서가 없습니다.\n(미발송 & 미완납 상태만 가능)");
      return;
    }

    const confirmSend = window.confirm(
      `선택한 ${selectedFees.length}건의 청구서를 발송하시겠습니까?\n\n` +
      `※ 카카오톡으로 청구서가 발송됩니다.\n` +
      `※ 쌤포인트가 차감됩니다.\n` +
      `※ 결제선생 앱에서 현장결제가 가능해집니다.`
    );

    if (!confirmSend) return;

    setIsSendingInvoices(true);
    try {
      const response = await fetch("/api/payssam/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tuitionFeeIds: selectedFees.map(fee => fee.id)
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || `${data.data?.success || 0}건 발송 완료`);
        setSelectedRows([]);
        fetchTuitionHistoryWithFilters(false);
      } else {
        toast.error(data.error || "청구서 발송 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("Send invoice error:", error);
      toast.error("청구서 발송 중 오류가 발생했습니다.");
    } finally {
      setIsSendingInvoices(false);
    }
  };

  // 현장결제 완료 처리 핸들러 (DB만 업데이트)
  const handleOfflinePaymentComplete = async () => {
    // selectedRows는 data 배열의 global index를 저장하므로 data[index]로 접근
    const selectedFees = selectedRows
      .map(index => data[index])
      .filter(Boolean)
      .filter(row =>
        row.paysSamRequestStatus === 'created' ||
        row.paysSamRequestStatus === 'sent'
      ); // created 또는 sent 상태만

    if (selectedFees.length === 0) {
      toast.error("현장결제 처리할 수 있는 항목이 없습니다.\n(생성됨 또는 청구됨 상태만 가능)");
      return;
    }

    const confirmPayment = window.confirm(
      `선택한 ${selectedFees.length}건을 현장결제 완료로 처리하시겠습니까?\n\n` +
      `※ PaysSam 앱에서 실제 결제를 먼저 진행해주세요.\n` +
      `※ DB에서 완납 처리만 됩니다 (PaysSam API 호출 없음).`
    );

    if (!confirmPayment) return;

    setIsProcessingOfflinePayment(true);
    try {
      const response = await fetch("/api/payssam/offline-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tuitionFeeIds: selectedFees.map(fee => fee.id)
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || `${data.data?.success || 0}건 완료 처리`);
        setSelectedRows([]);
        fetchTuitionHistoryWithFilters(false);
      } else {
        toast.error(data.error || "현장결제 처리 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("Offline payment error:", error);
      toast.error("현장결제 처리 중 오류가 발생했습니다.");
    } finally {
      setIsProcessingOfflinePayment(false);
    }
  };

  // 선택된 항목 중 발송/현장결제 가능한 건수 계산
  // PaysSam에서는 "발송"이 곧 "등록"이므로 1단계 워크플로우로 통합
  const getInvoiceActionCounts = () => {
    // selectedRows는 data 배열의 global index를 저장하고 있으므로
    // data[index]로 접근해야 함 (filteredData[index]가 아님)
    const selectedFees = selectedRows.map(index => data[index]).filter(Boolean);

    // 발송 가능: 청구서가 없고 완납이 아닌 건
    const sendableCount = selectedFees.filter(
      row => !row.paysSamBillId && row.paymentStatus !== '완납'
    ).length;

    // 현장결제 가능: 청구서가 발송된 상태 (sent)
    const offlinePayableCount = selectedFees.filter(
      row => row.paysSamRequestStatus === 'sent'
    ).length;

    return { sendableCount, offlinePayableCount };
  };

  // 선택된 행들의 TuitionRow 데이터 가져오기
  const getSelectedFeesForInvoice = (): TuitionRow[] => {
    // selectedRows는 data 배열의 global index를 저장하므로 data[index]로 접근
    return selectedRows
      .map(index => data[index])
      .filter(Boolean);
  };

  // 초기 데이터 로드 - 날짜 범위가 설정되면 한 번만 로드
  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      fetchTuitionHistoryWithFilters();
    }
  }, [dateRange.from, dateRange.to]);

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

      {/* PaysSam 관리 영역 */}
      <div className="flex items-center justify-between">
        <PointBalance compact />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkSync}
            disabled={isSyncing}
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? '동기화 중...' : '상태 동기화'}
          </Button>

          {/* 청구서 발송 (1단계 워크플로우: 결제선생 등록 + 카카오톡 발송) */}
          <Button
            size="sm"
            onClick={handleBulkSendInvoices}
            disabled={selectedRows.length === 0 || isSendingInvoices}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className={`w-4 h-4 mr-2 ${isSendingInvoices ? 'animate-pulse' : ''}`} />
            {isSendingInvoices ? '발송 중...' : `청구서 발송 (${getInvoiceActionCounts().sendableCount})`}
          </Button>

          {/* 현장결제 완료 */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleOfflinePaymentComplete}
            disabled={selectedRows.length === 0 || isProcessingOfflinePayment}
            className="text-green-600 border-green-200 hover:bg-green-50"
          >
            <CreditCard className={`w-4 h-4 mr-2 ${isProcessingOfflinePayment ? 'animate-pulse' : ''}`} />
            {isProcessingOfflinePayment ? '처리 중...' : `현장결제 완료 (${getInvoiceActionCounts().offlinePayableCount})`}
          </Button>
        </div>
      </div>

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
            totalFilteredCount={filteredData.length}
            onRowChange={handleRowChange}
            onRowDelete={handleRowDelete}
            onRowSave={handleRowSave}
            onSave={handleSave}
            isSaving={isSaving}
            selectedRows={paginatedData.map((row, idx) => {
              const globalIndex = data.findIndex(item => item.id === row.id);
              return selectedRows.includes(globalIndex) ? idx : -1;
            }).filter(i => i !== -1)}
            totalSelectedCount={selectedRows.length}
            onRowSelect={handleRowSelect}
            onSelectAll={handleSelectAll}
            onSelectAllFiltered={handleSelectAllFiltered}
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
            onSearch={handleSearch}
            onExport={handleExport}
            onRefresh={() => fetchTuitionHistoryWithFilters(false)}
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

      {/* 청구서 발송 모달 */}
      <SendInvoiceModal
        open={showSendInvoiceModal}
        onOpenChange={setShowSendInvoiceModal}
        selectedFees={getSelectedFeesForInvoice()}
        onSuccess={() => {
          setSelectedRows([]);
          fetchTuitionHistoryWithFilters(false);
        }}
      />
    </div>
  );
}