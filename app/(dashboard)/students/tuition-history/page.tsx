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
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("");
  const [selectedClassType, setSelectedClassType] = useState("");
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
  const [classTypeFilter, setClassTypeFilter] = useState("all");
  const [isSaving, setIsSaving] = useState(false);

  // 반/학생 이름 매핑 fetch
  useEffect(() => {
    async function fetchMeta() {
      const { data: classes } = await supabase.from("classes").select("id,name");
      const { data: students } = await supabase.from("students").select("id,name");
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

  // 데이터 페칭 함수
  async function fetchTuitionHistoryWithFilters() {
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
          classes!inner(name),
          students!inner(name)
        `);
      
      // 년월 범위 필터
      if (dateRange.from) {
        const [fromYear, fromMonth] = dateRange.from.split('-').map(Number);
        query = query.gte("year", fromYear);
        if (fromYear) {
          query = query.gte("month", fromMonth);
        }
      }
      if (dateRange.to) {
        const [toYear, toMonth] = dateRange.to.split('-').map(Number);
        query = query.lte("year", toYear);
        if (toYear) {
          query = query.lte("month", toMonth);
        }
      }
      
      // 반 필터
      if (filteredClassId) {
        query = query.eq("class_id", filteredClassId);
      }
      
      // 학생 필터
      if (filteredStudentId) {
        query = query.eq("student_id", filteredStudentId);
      }

      // 납부 상태 필터
      if (selectedPaymentStatus) {
        query = query.eq("payment_status", selectedPaymentStatus);
      }

      const { data, error } = await query.order("year", { ascending: false }).order("month", { ascending: false });
      
      if (error) throw error;

      // 데이터 변환
      // @ts-ignore - Supabase 복잡한 관계 타입 처리
      const transformedData: TuitionRow[] = (data || []).map((item: any) => ({
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

  // 검색 버튼 클릭 시
  function handleSearch() {
    // 반 검색어를 ID로 변환
    const classObj = classOptions.find(c => 
      classSearch ? c.name.toLowerCase().includes(classSearch.toLowerCase()) : false
    );
    
    // 학생 검색어를 ID로 변환
    const studentObj = studentOptions.find(s => 
      studentSearch ? s.name.toLowerCase().includes(studentSearch.toLowerCase()) : false
    );
    
    // 필터 ID 설정
    const newClassId = classObj?.id || "";
    const newStudentId = studentObj?.id || "";
    
    setFilteredClassId(newClassId);
    setFilteredStudentId(newStudentId);
    
    // 검색 실행
    setTimeout(() => {
      fetchTuitionHistoryWithFilters();
    }, 100);
  }

  // 초기화 버튼
  function resetFilters() {
    setClassSearch("");
    setStudentSearch("");
    setFilteredClassId("");
    setFilteredStudentId("");
    setSelectedPaymentStatus("");
    setSelectedClassType("");
    setSearchTerm("");
    setPaymentStatusFilter("all");
    setClassTypeFilter("all");
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

  // 개별 행 저장 핸들러
  const handleRowSave = async (index: number) => {
    const actualIndex = (page - 1) * pageSize + index;
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

      const { error } = await supabase
        .from("tuition_fees")
        .update(updateData)
        .eq("id", row.id);

      if (error) throw error;

      toast.success(`${row.studentName}의 학원비가 저장되었습니다.`);
      
      // 데이터 새로고침
      fetchTuitionHistoryWithFilters();
    } catch (error) {
      console.error("학원비 저장 에러:", error);
      toast.error("학원비 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // 개별 행 삭제 핸들러
  const handleRowDelete = async (index: number) => {
    const actualIndex = (page - 1) * pageSize + index;
    if (actualIndex >= filteredData.length) return;
    
    const row = filteredData[actualIndex];
    const confirmDelete = window.confirm(`정말로 ${row.studentName}의 ${row.year}년 ${row.month}월 학원비를 삭제하시겠습니까?`);
    
    if (!confirmDelete) return;
    
    try {
      const { error } = await supabase
        .from("tuition_fees")
        .delete()
        .eq("id", row.id);

      if (error) throw error;

      toast.success(`${row.studentName}의 학원비가 성공적으로 삭제되었습니다.`);

      // 데이터 새로고침
      fetchTuitionHistoryWithFilters();
    } catch (error) {
      console.error("학원비 삭제 에러:", error);
      toast.error("학원비 삭제 중 오류가 발생했습니다.");
    }
  };

  // 전체 저장 핸들러 (수정된 데이터 일괄 저장)
  const handleSave = async () => {
    if (paginatedData.length === 0) {
      toast.error("저장할 학원비 데이터가 없습니다.");
      return;
    }

    setIsSaving(true);
    try {
      // 수정된 데이터 일괄 저장
      for (const row of paginatedData) {
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

      toast.success(`${paginatedData.length}개의 학원비가 저장되었습니다.`);
      
      // 데이터 새로고침
      fetchTuitionHistoryWithFilters();
    } catch (error) {
      console.error("학원비 저장 에러:", error);
      toast.error("학원비 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    fetchTuitionHistoryWithFilters();
  }, [dateRange, filteredClassId, filteredStudentId, selectedPaymentStatus]);

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
    <div className="space-y-6 max-w-7xl mx-auto">
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