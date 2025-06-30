"use client";
import React, { useState, useEffect } from "react";
import StudentClassTabs from "@/components/StudentClassTabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabaseClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { TuitionTable } from "@/components/tuition/tuition-table";
import { Save, Trash2, Download, Filter, Calendar } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
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
  // 필터 상태
  const [datePreset, setDatePreset] = useState("custom");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<TuitionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 반/학생 id→이름 매핑
  const [classMap, setClassMap] = useState<{ [id: string]: string }>({});
  const [studentMap, setStudentMap] = useState<{ [id: string]: string }>({});
  const [classOptions, setClassOptions] = useState<{id: string, name: string}[]>([]);
  const [studentOptions, setStudentOptions] = useState<{id: string, name: string}[]>([]);
  const [classSearch, setClassSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  
  // 실제 필터에 적용할 id
  const [filteredClassId, setFilteredClassId] = useState("");
  const [filteredStudentId, setFilteredStudentId] = useState("");
  
  // 테이블 상태
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [isSaving, setIsSaving] = useState(false);

  // 반/학생 이름 매핑 fetch
  useEffect(() => {
    async function fetchMeta() {
      const { data: classes } = await supabaseClient.from("classes").select("id,name");
      const { data: students } = await supabaseClient.from("students").select("id,name");
      setClassMap(Object.fromEntries((classes || []).map((c: any) => [c.id, c.name])));
      setStudentMap(Object.fromEntries((students || []).map((s: any) => [s.id, s.name])));
      setClassOptions(classes || []);
      setStudentOptions(students || []);
    }
    fetchMeta();
  }, []);

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

  // 날짜 프리셋 변경 시 실제 날짜 설정
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const ymd = (d: Date) => d.toISOString().slice(0, 10);
    
    switch (datePreset) {
      case "thisMonth":
        const firstDay = `${year}-${month.toString().padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const lastDayStr = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
        setDateRange({ from: firstDay, to: lastDayStr });
        break;
      case "lastMonth":
        const lastMonth = month === 1 ? 12 : month - 1;
        const lastMonthYear = month === 1 ? year - 1 : year;
        const lastMonthFirst = `${lastMonthYear}-${lastMonth.toString().padStart(2, '0')}-01`;
        const lastMonthLast = new Date(lastMonthYear, lastMonth, 0).getDate();
        const lastMonthLastStr = `${lastMonthYear}-${lastMonth.toString().padStart(2, '0')}-${lastMonthLast.toString().padStart(2, '0')}`;
        setDateRange({ from: lastMonthFirst, to: lastMonthLastStr });
        break;
      case "quarter":
        const quarterStart = new Date(year, Math.floor((month - 1) / 3) * 3, 1);
        const quarterEnd = new Date(year, Math.floor((month - 1) / 3) * 3 + 3, 0);
        setDateRange({ from: ymd(quarterStart), to: ymd(quarterEnd) });
        break;
      // custom의 경우 사용자가 직접 설정
    }
  }, [datePreset]);

  // 상태 변화에 따라 자동 fetch
  useEffect(() => {
    if (dateRange.from) {
      fetchTuitionHistory();
    }
    // eslint-disable-next-line
  }, [dateRange.from, filteredClassId, filteredStudentId, selectedPaymentStatus]);

  // fetchTuitionHistory 함수
  async function fetchTuitionHistory() {
    setLoading(true);
    setError(null);
    
    console.log("검색 조건:", {
      dateRange,
      filteredClassId,
      filteredStudentId,
      selectedPaymentStatus,
      classSearch,
      studentSearch
    });

    try {
      let query = supabaseClient
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
          classes!inner(name),
          students!inner(name)
        `);
      
      // 년월 범위 필터 (YYYY-MM 형식을 년/월로 변환)
      if (dateRange.from) {
        const [fromYear, fromMonth] = dateRange.from.split('-').map(Number);
        query = query.gte("year", fromYear);
        if (fromYear) {
          query = query.gte("month", fromMonth);
        }
        console.log("시작 년월 필터 적용:", fromYear, fromMonth);
      }
      if (dateRange.to) {
        const [toYear, toMonth] = dateRange.to.split('-').map(Number);
        query = query.lte("year", toYear);
        if (toYear) {
          query = query.lte("month", toMonth);
        }
        console.log("종료 년월 필터 적용:", toYear, toMonth);
      }
      
      // 반 필터
      if (filteredClassId) {
        query = query.eq("class_id", filteredClassId);
        console.log("반 필터 적용:", filteredClassId, classMap[filteredClassId]);
      }
      
      // 학생 필터
      if (filteredStudentId) {
        query = query.eq("student_id", filteredStudentId);
        console.log("학생 필터 적용:", filteredStudentId, studentMap[filteredStudentId]);
      }

      // 납부 상태 필터
      if (selectedPaymentStatus) {
        query = query.eq("payment_status", selectedPaymentStatus);
        console.log("납부 상태 필터 적용:", selectedPaymentStatus);
      }

      const { data, error } = await query.order("year", { ascending: false }).order("month", { ascending: false });
      
      console.log("쿼리 결과:", { data, error, count: data?.length });
      
      if (error) throw error;

      // 데이터 변환
      const transformedData: TuitionRow[] = (data || []).map(item => ({
        id: item.id,
        classId: item.class_id,
        className: (item.classes as any)?.name || '',
        studentId: item.student_id,
        studentName: (item.students as any)?.name || '',
        year: item.year,
        month: item.month,
        isSibling: item.is_sibling || false,
        classType: item.class_type,
        amount: item.amount,
        note: item.note || '',
        paymentStatus: item.payment_status,
        paymentDate: item.payment_date || undefined
      }));

      setData(transformedData);
      setPage(1); // 새 검색 시 첫 페이지로
    } catch (e) {
      console.error("데이터 fetch 에러:", e);
      setError("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // 검색 버튼 클릭 시 - 검색어를 ID로 변환 후 검색
  function handleSearch() {
    console.log("검색 버튼 클릭");
    console.log("검색어:", { classSearch, studentSearch });
    
    // 반 검색어를 ID로 변환
    const classObj = classOptions.find(c => 
      classSearch ? c.name.toLowerCase().includes(classSearch.toLowerCase()) : false
    );
    
    // 학생 검색어를 ID로 변환
    const studentObj = studentOptions.find(s => 
      studentSearch ? s.name.toLowerCase().includes(studentSearch.toLowerCase()) : false
    );
    
    console.log("찾은 결과:", { classObj, studentObj });
    
    // 필터 ID 설정
    const newClassId = classObj?.id || "";
    const newStudentId = studentObj?.id || "";
    
    setFilteredClassId(newClassId);
    setFilteredStudentId(newStudentId);
    
    console.log("설정된 필터 ID:", { newClassId, newStudentId });
    
    // 약간의 지연 후 검색 (상태 업데이트 완료 대기)
    setTimeout(() => {
      fetchTuitionHistoryWithFilters(newClassId, newStudentId);
    }, 100);
  }

  // 특정 필터로 직접 검색하는 함수
  async function fetchTuitionHistoryWithFilters(classId?: string, studentId?: string) {
    setLoading(true);
    setError(null);
    
    const useClassId = classId !== undefined ? classId : filteredClassId;
    const useStudentId = studentId !== undefined ? studentId : filteredStudentId;
    
    console.log("필터로 검색:", {
      dateRange,
      useClassId,
      useStudentId,
      selectedPaymentStatus
    });

    try {
      let query = supabaseClient
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
          classes!inner(name),
          students!inner(name)
        `);
      
      if (dateRange.from) {
        const [fromYear, fromMonth] = dateRange.from.split('-').map(Number);
        query = query.gte("year", fromYear).gte("month", fromMonth);
      }
      if (dateRange.to) {
        const [toYear, toMonth] = dateRange.to.split('-').map(Number);
        query = query.lte("year", toYear).lte("month", toMonth);
      }
      if (useClassId) query = query.eq("class_id", useClassId);
      if (useStudentId) query = query.eq("student_id", useStudentId);
      if (selectedPaymentStatus) query = query.eq("payment_status", selectedPaymentStatus);

      const { data, error } = await query.order("year", { ascending: false }).order("month", { ascending: false });
      
      if (error) throw error;

      // 데이터 변환
      const transformedData: TuitionRow[] = (data || []).map(item => ({
        id: item.id,
        classId: item.class_id,
        className: (item.classes as any)?.name || '',
        studentId: item.student_id,
        studentName: (item.students as any)?.name || '',
        year: item.year,
        month: item.month,
        isSibling: item.is_sibling || false,
        classType: item.class_type,
        amount: item.amount,
        note: item.note || '',
        paymentStatus: item.payment_status,
        paymentDate: item.payment_date || undefined
      }));

      setData(transformedData);
      setPage(1);
      
      console.log("검색 완료, 결과 개수:", transformedData.length);
    } catch (e) {
      console.error("검색 에러:", e);
      setError("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // 초기화 함수
  function resetFilters() {
    setClassSearch("");
    setStudentSearch("");
    setFilteredClassId("");
    setFilteredStudentId("");
    setSelectedPaymentStatus("");
    setDatePreset("custom");
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
    
    return searchMatches && statusMatches;
  });
  
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = filteredData.slice(startIndex, endIndex);
  
  // 통계 계산
  const stats = calculateStats(filteredData);

  // 개별 행 수정 핸들러
  const handleRowChange = (index: number, field: keyof TuitionRow, value: any) => {
    const actualIndex = (page - 1) * pageSize + index;
    if (actualIndex < filteredData.length) {
      const rowToUpdate = filteredData[actualIndex];
      const originalDataIndex = data.findIndex(item => item.id === rowToUpdate.id);
      
      if (originalDataIndex !== -1) {
        const newData = [...data];
        newData[originalDataIndex] = { ...newData[originalDataIndex], [field]: value };
        setData(newData);
      }
    }
  };

  // 개별 저장 핸들러 (행별 저장 버튼)
  const handleSaveRow = async (rowIndex: number) => {
    const actualIndex = (page - 1) * pageSize + rowIndex;
    if (actualIndex >= filteredData.length) return;
    
    const row = filteredData[actualIndex];
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

      const { error } = await supabaseClient
        .from("tuition_fees")
        .update(updateData)
        .eq("id", row.id);

      if (error) throw error;

      toast({
        title: "저장 완료",
        description: `${row.studentName}의 학원비가 성공적으로 저장되었습니다.`,
      });
      
      // 데이터 새로고침
      fetchTuitionHistoryWithFilters();
    } catch (error) {
      console.error("학원비 저장 에러:", error);
      toast({
        title: "저장 실패",
        description: "학원비 저장 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 개별 삭제 핸들러 (행별 삭제 버튼)
  const handleDeleteRow = async (rowIndex: number) => {
    const actualIndex = (page - 1) * pageSize + rowIndex;
    if (actualIndex >= filteredData.length) return;
    
    const row = filteredData[actualIndex];
    const confirmDelete = window.confirm(`정말로 ${row.studentName}의 ${row.year}년 ${row.month}월 학원비를 삭제하시겠습니까?`);
    
    if (!confirmDelete) return;
    
    try {
      const { error } = await supabaseClient
        .from("tuition_fees")
        .delete()
        .eq("id", row.id);

      if (error) throw error;

      toast({
        title: "삭제 완료",
        description: `${row.studentName}의 학원비가 성공적으로 삭제되었습니다.`,
      });

      // 데이터 새로고침
      fetchTuitionHistoryWithFilters();
    } catch (error) {
      console.error("학원비 삭제 에러:", error);
      toast({
        title: "삭제 실패",
        description: "학원비 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <StudentClassTabs />
      {/* 필터 카드 */}
      <div className="bg-white rounded-xl shadow border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 items-end">
          {/* 기간 드롭다운 */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-2">기간</label>
            <select
              className="h-10 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={datePreset}
              onChange={e => setDatePreset(e.target.value)}
            >
              <option value="thisMonth">이번 달</option>
              <option value="lastMonth">지난 달</option>
              <option value="quarter">분기별</option>
              <option value="custom">사용자 지정</option>
            </select>
          </div>
          
          {/* 시작일 */}
          {datePreset === "custom" && (
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-2">시작일</label>
              <input
                type="date"
                className="h-10 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={dateRange.from}
                onChange={e => setDateRange(r => ({ ...r, from: e.target.value }))}
              />
            </div>
          )}
          
          {/* 종료일 */}
          {datePreset === "custom" && (
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-2">종료일</label>
              <input
                type="date"
                className="h-10 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={dateRange.to}
                onChange={e => setDateRange(r => ({ ...r, to: e.target.value }))}
              />
            </div>
          )}
          
          {/* 반 검색 */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-2">반</label>
            <div className="relative">
              <Input
                value={classSearch}
                onChange={e => setClassSearch(e.target.value)}
                placeholder="반 이름 검색"
                className="h-10"
              />
              {classSearch && (
                <div className="absolute top-full left-0 mt-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded z-10">
                  {classOptions.filter(c => c.name.toLowerCase().includes(classSearch.toLowerCase())).length}개 결과
                </div>
              )}
            </div>
          </div>
          
          {/* 학생 검색 */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-2">학생</label>
            <div className="relative">
              <Input
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                placeholder="학생 이름 검색"
                className="h-10"
              />
              {studentSearch && (
                <div className="absolute top-full left-0 mt-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded z-10">
                  {studentOptions.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase())).length}개 결과
                </div>
              )}
            </div>
          </div>

          {/* 납부상태 필터 */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-2">납부상태</label>
            <select
              className="h-10 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedPaymentStatus}
              onChange={e => setSelectedPaymentStatus(e.target.value)}
            >
              <option value="">전체</option>
              <option value="완납">완납</option>
              <option value="미납">미납</option>
              <option value="부분납">부분납</option>
            </select>
          </div>
          
          {/* 검색 & 초기화 버튼 */}
          <div className="flex gap-2 md:col-span-2 lg:col-span-1">
            <Button onClick={handleSearch} className="h-10 flex-1">
              검색
            </Button>
            <Button onClick={resetFilters} variant="outline" className="h-10 flex-1">
              초기화
            </Button>
          </div>
        </div>
      </div>

      {/* 현재 필터 상태 표시 */}
      <div className="bg-blue-50 p-3 rounded-lg">
        <div className="text-sm text-blue-800">
          <strong>검색 조건:</strong> 
          {dateRange.from && ` ${dateRange.from}`}
          {dateRange.to && dateRange.to !== dateRange.from && ` ~ ${dateRange.to}`}
          {filteredClassId && ` | 반: ${classMap[filteredClassId]}`}
          {filteredStudentId && ` | 학생: ${studentMap[filteredStudentId]}`}
          {selectedPaymentStatus && ` | 납부상태: ${selectedPaymentStatus}`}
          {!filteredClassId && !filteredStudentId && !selectedPaymentStatus && ` | 전체`}
        </div>
      </div>
      
      {/* 표 Card */}
      <div className="bg-white rounded-xl shadow border overflow-hidden">
        {loading ? (
          <div className="text-center text-gray-400 py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            로딩 중...
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-12 px-4">
            <div className="text-red-400 text-4xl mb-4">⚠️</div>
            {error}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 w-24">반</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 w-24">학생</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700 w-20">년월</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700 w-20">수업유형</th>
                    <th className="px-4 py-4 text-right text-sm font-semibold text-gray-700 w-24">금액</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700 w-16">형제할인</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700 w-20">납부상태</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 w-32 max-w-[120px]">비고</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700 w-20">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                        <div className="text-gray-300 text-4xl mb-4">💰</div>
                        <div className="text-lg font-medium text-gray-500 mb-2">학원비 기록이 없습니다</div>
                        <div className="text-sm text-gray-400">검색 조건을 조정해보세요</div>
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((row, i) => (
                      <tr key={i} className="hover:bg-blue-50/50 transition-colors duration-150">
                        <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                          {row.className}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                          {row.studentName}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600 font-mono">
                          {`${row.year}-${row.month.toString().padStart(2, '0')}`}
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          <span className={`inline-block rounded px-2 py-1 text-xs font-semibold ${classTypeColor(row.classType)}`}>
                            {row.classType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-800 font-semibold">
                          {formatAmount(row.amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {row.isSibling ? (
                            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                              5%
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block rounded px-2 py-1 text-xs font-semibold ${paymentStatusColor(row.paymentStatus)}`}>
                            {row.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 cursor-pointer hover:text-gray-800 hover:bg-gray-50 rounded max-w-[120px] truncate"
                            onClick={() => handleCellClick("비고", row.note)}>
                          {row.note ? (
                            <div className="truncate" title={row.note}>
                              {row.note}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(row)}>
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">수정</span>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                  <span className="sr-only">삭제</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>학원비 기록 삭제</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    정말로 이 학원비 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>취소</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(row)} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    {isDeleting ? "삭제 중..." : "삭제"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* 페이지네이션 */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  총 <span className="font-semibold text-gray-800">{data.length}</span>개 중{' '}
                  <span className="font-semibold text-gray-800">
                    {((page-1)*pageSize)+1}-{Math.min(page*pageSize, data.length)}
                  </span>개 표시
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
                    onClick={() => setPage(p => Math.max(1, p-1))} 
                    disabled={page===1}
                  >
                    이전
                  </button>
                  <div className="flex items-center space-x-1">
                    {Array.from({length: Math.min(5, totalPages)}, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                      if (pageNum > totalPages) return null;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`px-3 py-2 text-sm rounded-md transition-colors ${
                            page === pageNum
                              ? 'bg-blue-500 text-white'
                              : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button 
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
                    onClick={() => setPage(p => Math.min(totalPages, p+1))} 
                    disabled={page===totalPages}
                  >
                    다음
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* 상세 보기 모달 */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modalTitle}</DialogTitle>
          </DialogHeader>
          <div className="whitespace-pre-wrap text-base p-2 break-words select-all">{modalContent || "내용 없음"}</div>
        </DialogContent>
      </Dialog>

      {/* 수정 모달 */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-gray-100">
            <DialogTitle className="text-xl text-gray-800 flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-600" />
              학원비 수정
            </DialogTitle>
            {editingRow && (
              <div className="text-sm text-gray-500 mt-1">
                {editingRow.className} • {editingRow.studentName}
              </div>
            )}
          </DialogHeader>
          {editingRow && (
            <div className="py-6 space-y-6">
              {/* 기본 정보 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  기본 정보
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">연도</label>
                      <Input 
                        type="number" 
                        value={editingRow.year || ""} 
                        onChange={e => setEditingRow(prev => prev ? { ...prev, year: parseInt(e.target.value) || 2025 } : null)}
                        className="h-11"
                        min="2020"
                        max="2030"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">월</label>
                      <Input 
                        type="number" 
                        value={editingRow.month || ""} 
                        onChange={e => setEditingRow(prev => prev ? { ...prev, month: parseInt(e.target.value) || 1 } : null)}
                        className="h-11"
                        min="1"
                        max="12"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 학원비 정보 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  학원비 정보
                </div>
                <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">수업유형</label>
                      <select 
                        className="w-full h-11 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        value={editingRow.classType || ""} 
                        onChange={e => setEditingRow(prev => prev ? { ...prev, classType: e.target.value as ClassType } : null)}
                      >
                        <option value="정규">정규</option>
                        <option value="특강">특강</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">납부상태</label>
                      <select 
                        className="w-full h-11 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        value={editingRow.paymentStatus || ""} 
                        onChange={e => setEditingRow(prev => prev ? { ...prev, paymentStatus: e.target.value as PaymentStatus } : null)}
                      >
                        <option value="미납">미납</option>
                        <option value="완납">완납</option>
                        <option value="부분납">부분납</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">금액</label>
                      <Input 
                        type="number"
                        value={editingRow.amount || ""} 
                        onChange={e => setEditingRow(prev => prev ? { ...prev, amount: parseInt(e.target.value) || 0 } : null)}
                        placeholder="금액 입력"
                        className="h-11"
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">형제할인</label>
                      <div className="flex items-center h-11">
                        <input
                          type="checkbox"
                          checked={editingRow.isSibling || false}
                          onChange={e => setEditingRow(prev => prev ? { ...prev, isSibling: e.target.checked } : null)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">형제할인 적용</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 비고 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  비고
                </div>
                <div className="bg-amber-50 rounded-lg p-4">
                  <textarea
                    className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    value={editingRow.note || ""} 
                    onChange={e => setEditingRow(prev => prev ? { ...prev, note: e.target.value } : null)}
                    placeholder="비고사항을 입력하세요..."
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="pt-6 border-t border-gray-100">
            <Button 
              variant="outline" 
              onClick={() => setIsEditModalOpen(false)}
              className="h-11 px-6"
              disabled={isSaving}
            >
              취소
            </Button>
            <Button 
              onClick={() => editingRow && handleSaveEdit(editingRow)} 
              disabled={!editingRow || isSaving}
              className="h-11 px-6 bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? "저장 중..." : "저장하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}