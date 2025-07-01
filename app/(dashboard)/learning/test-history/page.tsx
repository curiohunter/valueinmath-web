"use client";
import React, { useState, useEffect } from "react";
import LearningTabs from "@/components/LearningTabs";
import { Button } from "@/components/ui/button";
import { supabaseClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Edit, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";

// 점수 색상 스타일 함수 (시험 점수용)
const scoreColor = (score: number) => {
  if (score >= 90) return "bg-green-100 text-green-800 border-green-200";
  if (score >= 80) return "bg-blue-100 text-blue-800 border-blue-200";
  if (score >= 70) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  if (score >= 60) return "bg-orange-100 text-orange-800 border-orange-200";
  return "bg-red-100 text-red-800 border-red-200";
};

// 시험유형 색상 매핑
const testTypeColor = (type: string) => {
  const typeMap: { [key: string]: string } = {
    "과정총괄테스트": "bg-blue-100 text-blue-700",
    "내용암기테스트": "bg-yellow-100 text-yellow-700",
    "단원테스트": "bg-green-100 text-green-700",
    "모의고사": "bg-purple-100 text-purple-700",
    "서술형평가": "bg-pink-100 text-pink-700",
    "수학경시대회": "bg-orange-100 text-orange-700",
    "오답테스트": "bg-red-100 text-red-700",
    "내신기출유사": "bg-gray-100 text-gray-700",
    "내신기출": "bg-black text-white",
    "학교시험점수": "bg-cyan-100 text-cyan-700",
  };
  return typeMap[type] || "bg-gray-100 text-gray-600";
};

// 시험유형 옵션 목록
const TEST_TYPE_OPTIONS = [
  "과정총괄테스트",
  "내용암기테스트",
  "단원테스트",
  "모의고사",
  "서술형평가",
  "수학경시대회",
  "오답테스트",
  "내신기출유사",
  "내신기출",
  "학교시험점수"
];

export default function TestHistoryPage() {
  // 필터 상태
  const [datePreset, setDatePreset] = useState("custom");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 반/학생 id→이름 매핑
  const [classMap, setClassMap] = useState<{ [id: string]: string }>({});
  const [studentMap, setStudentMap] = useState<{ [id: string]: string }>({});
  const [classOptions, setClassOptions] = useState<{id: string, name: string}[]>([]);
  const [studentOptions, setStudentOptions] = useState<{id: string, name: string}[]>([]);
  const [classSearch, setClassSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [testTypeFilter, setTestTypeFilter] = useState("");
  
  // 실제 필터에 적용할 id
  const [filteredClassId, setFilteredClassId] = useState("");
  const [filteredStudentId, setFilteredStudentId] = useState("");
  
  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalContent, setModalContent] = useState("");

  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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

  // 어제 날짜 디폴트 설정
  useEffect(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const ymd = (d: Date) => d.toISOString().slice(0, 10);
    setDateRange({ from: ymd(yesterday), to: ymd(yesterday) });
  }, []);

  // 날짜 프리셋 변경 시 실제 날짜 설정
  useEffect(() => {
    const today = new Date();
    const ymd = (d: Date) => d.toISOString().slice(0, 10);
    
    switch (datePreset) {
      case "week":
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        setDateRange({ from: ymd(weekAgo), to: ymd(today) });
        break;
      case "month":
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        setDateRange({ from: ymd(monthAgo), to: ymd(today) });
        break;
      // custom의 경우 사용자가 직접 설정
    }
  }, [datePreset]);

  // 상태 변화에 따라 자동 fetch
  useEffect(() => {
    if (dateRange.from) {
      fetchLogs();
    }
    // eslint-disable-next-line
  }, [dateRange.from, filteredClassId, filteredStudentId, testTypeFilter]);

  // fetchLogs 함수
  async function fetchLogs() {
    setLoading(true);
    setError(null);
    
    console.log("검색 조건:", {
      dateRange,
      filteredClassId,
      filteredStudentId,
      classSearch,
      studentSearch
    });

    try {
      let query = supabaseClient
        .from("test_logs")
        .select("class_id,student_id,date,test,test_type,test_score,note");
      
      // 날짜 필터
      if (dateRange.from) {
        query = query.gte("date", dateRange.from);
        console.log("날짜 시작 필터 적용:", dateRange.from);
      }
      if (dateRange.to) {
        query = query.lte("date", dateRange.to);
        console.log("날짜 종료 필터 적용:", dateRange.to);
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
      
      // 시험유형 필터
      if (testTypeFilter) {
        // @ts-ignore - Supabase 타입 복잡성 해결을 위한 임시 처리
        query = query.eq("test_type", testTypeFilter as any);
        console.log("시험유형 필터 적용:", testTypeFilter);
      }

      // 날짜순 정렬 추가 (오래된 것이 위로)
      query = query.order("date", { ascending: true });
      
      const { data, error } = await query;
      
      console.log("쿼리 결과:", { data, error, count: data?.length });
      
      if (error) throw error;
      setData(data || []);
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
      fetchLogsWithFilters(newClassId, newStudentId);
    }, 100);
  }

  // 특정 필터로 직접 검색하는 함수
  async function fetchLogsWithFilters(classId?: string, studentId?: string) {
    setLoading(true);
    setError(null);
    
    const useClassId = classId !== undefined ? classId : filteredClassId;
    const useStudentId = studentId !== undefined ? studentId : filteredStudentId;
    
    console.log("필터로 검색:", {
      dateRange,
      useClassId,
      useStudentId
    });

    try {
      let query = supabaseClient
        .from("test_logs")
        .select("class_id,student_id,date,test,test_type,test_score,note");
      
      if (dateRange.from) query = query.gte("date", dateRange.from);
      if (dateRange.to) query = query.lte("date", dateRange.to);
      if (useClassId) query = query.eq("class_id", useClassId);
      if (useStudentId) query = query.eq("student_id", useStudentId);
      if (testTypeFilter) {
        // @ts-ignore - Supabase 타입 복잡성 해결을 위한 임시 처리
        query = query.eq("test_type", testTypeFilter as any);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setData(data || []);
      setPage(1);
      
      console.log("검색 완료, 결과 개수:", data?.length);
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
    setTestTypeFilter("");
    setDatePreset("custom");
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const ymd = (d: Date) => d.toISOString().slice(0, 10);
    setDateRange({ from: ymd(yesterday), to: ymd(yesterday) });
  }

  // 반별로 데이터 그룹화 및 페이지네이션
  const groupedData = data.reduce((groups: { [className: string]: any[] }, item) => {
    const className = classMap[item.class_id] || item.class_id || '클래스 없음';
    if (!groups[className]) {
      groups[className] = [];
    }
    groups[className].push(item);
    return groups;
  }, {});
  
  // 각 그룹의 날짜 범위 계산
  const groupsWithDateRange = Object.entries(groupedData).map(([className, items]) => {
    const dates = items.map(item => item.date).filter(Boolean).sort();
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];
    return {
      className,
      items,
      startDate,
      endDate,
      displayName: startDate && endDate && startDate !== endDate 
        ? `${className} [${startDate}] → [${endDate}]`
        : startDate 
        ? `${className} [${startDate}]`
        : className
    };
  }).sort((a, b) => {
    // 시작 날짜로 그룹 정렬 (오래된 것이 위로)
    if (a.startDate && b.startDate) {
      return a.startDate.localeCompare(b.startDate);
    }
    return a.className.localeCompare(b.className);
  });
  
  const pageSize = 50; // 그룹화로 인해 더 많이 표시
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const paginatedData = data.slice((page-1)*pageSize, page*pageSize);
  
  // 페이지네이션된 데이터를 반별로 그룹화
  const paginatedGroupedData = paginatedData.reduce((groups: { [className: string]: any[] }, item) => {
    const className = classMap[item.class_id] || item.class_id || '클래스 없음';
    if (!groups[className]) {
      groups[className] = [];
    }
    groups[className].push(item);
    return groups;
  }, {});
  
  // 그룹 정보와 함께 데이터 준비
  const groupsToDisplay = Object.entries(paginatedGroupedData).map(([className, items]) => {
    const dates = items.map(item => item.date).filter(Boolean).sort();
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];
    const displayName = startDate && endDate && startDate !== endDate 
      ? `${className} [${startDate}] → [${endDate}]`
      : startDate 
      ? `${className} [${startDate}]`
      : className;
    return { className, items, displayName, startDate };
  }).sort((a, b) => {
    if (a.startDate && b.startDate) {
      return a.startDate.localeCompare(b.startDate);
    }
    return a.className.localeCompare(b.className);
  });

  function handleCellClick(title: string, content: string) {
    setModalTitle(title);
    setModalContent(content);
    setModalOpen(true);
  }

  // 수정 버튼 클릭
  function handleEdit(row: any) {
    setEditingRow({ ...row, originalDate: row.date });
    setIsEditModalOpen(true);
  }

  // 수정 저장 (실제 Supabase update)
  async function handleSaveEdit(edited: any) {
    setIsSaving(true);
    try {
      const { error } = await supabaseClient
        .from("test_logs")
        .update({
          date: edited.date,
          test: edited.test,
          test_type: edited.test_type,
          test_score: edited.test_score,
          note: edited.note,
        })
        .match({
          student_id: edited.student_id,
          date: edited.originalDate || edited.date,
          test: edited.test
        });
      if (error) throw error;
      toast({ title: "수정 완료", description: "시험 기록이 성공적으로 수정되었습니다." });
      setIsEditModalOpen(false);
      setEditingRow(null);
      fetchLogs();
    } catch (e) {
      toast({ title: "수정 실패", description: "DB 수정 중 오류가 발생했습니다.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  // 삭제 처리 (실제 Supabase delete)
  async function handleDelete(rowId: string, row: any) {
    setIsDeleting(true);
    try {
      const { error } = await supabaseClient
        .from("test_logs")
        .delete()
        .match({
          class_id: row.class_id,
          student_id: row.student_id,
          date: row.date
        });
      if (error) throw error;
      toast({ title: "삭제 완료", description: "시험 기록이 성공적으로 삭제되었습니다." });
      setIsEditModalOpen(false);
      setEditingRow(null);
      setPage(1);
      fetchLogs();
    } catch (e) {
      toast({ title: "삭제 실패", description: "DB 삭제 중 오류가 발생했습니다.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <LearningTabs />
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
              <option value="week">최근 일주일</option>
              <option value="month">최근 한달</option>
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
                <div className="absolute top-full left-0 mt-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
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
                <div className="absolute top-full left-0 mt-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  {studentOptions.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase())).length}개 결과
                </div>
              )}
            </div>
          </div>
          
          {/* 시험유형 필터 */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-2">시험유형</label>
            <select
              className="h-10 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={testTypeFilter}
              onChange={e => setTestTypeFilter(e.target.value)}
            >
              <option value="">전체</option>
              {TEST_TYPE_OPTIONS.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
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
          {testTypeFilter && ` | 시험유형: ${testTypeFilter}`}
          {!filteredClassId && !filteredStudentId && !testTypeFilter && ` | 전체`}
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
                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 w-32">반</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 w-24">학생</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700 w-28">날짜</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 w-44 max-w-[240px]">시험명</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 w-36 max-w-[180px]">시험유형</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700 w-20">점수</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 w-32 max-w-[120px]">특이사항</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700 w-20">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                        <div className="text-gray-300 text-4xl mb-4">📊</div>
                        <div className="text-lg font-medium text-gray-500 mb-2">시험 기록이 없습니다</div>
                        <div className="text-sm text-gray-400">검색 조건을 조정해보세요</div>
                      </td>
                    </tr>
                  ) : (
                    groupsToDisplay.map((group, groupIndex) => (
                      <React.Fragment key={group.className}>
                        {/* 반별 그룹 헤더 */}
                        <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-t-2 border-blue-200">
                          <td colSpan={8} className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-sm font-semibold text-blue-800">
                                {group.displayName}
                              </span>
                              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                {group.items.length}건
                              </span>
                            </div>
                          </td>
                        </tr>
                        {/* 그룹 내 데이터 */}
                        {group.items.map((row, i) => (
                          <tr key={`${group.className}-${i}`} className="hover:bg-blue-50/50 transition-colors duration-150">
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {/* 반 이름은 그룹 헤더에 있으므로 비우기 */}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                              {studentMap[row.student_id] || row.student_id}
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-gray-600 font-mono">
                              {row.date?.replace(/^2025-/, '') || row.date}
                            </td>
                            <td className="px-4 py-3 text-sm text-blue-600 hover:text-blue-800 cursor-pointer hover:underline font-medium max-w-[240px] truncate"
                                onClick={() => handleCellClick("시험명", row.test)}>
                              {row.test || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm max-w-[180px]">
                              {row.test_type ? (
                                <span className={`inline-block rounded px-2 py-1 text-xs font-semibold ${testTypeColor(row.test_type)}`}>
                                  {row.test_type}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {row.test_score !== null ? (
                                <span className={`inline-flex items-center justify-center px-2 py-1 text-sm font-semibold rounded-full border-2 ${scoreColor(row.test_score)}`}>
                                  {row.test_score}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 cursor-pointer hover:text-gray-800 hover:bg-gray-50 rounded max-w-[120px] truncate"
                                onClick={() => handleCellClick("특이사항", row.note)}>
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
                                      <AlertDialogTitle>시험 기록 삭제</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        정말로 이 시험 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>취소</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(row.class_id + row.student_id + row.date, row)} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        {isDeleting ? "삭제 중..." : "삭제"}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* 개선된 페이지네이션 */}
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
      
      {/* 모달 */}
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
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-gray-100">
            <DialogTitle className="text-xl text-gray-800 flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-600" />
              시험 기록 수정
            </DialogTitle>
            {editingRow && (
              <div className="text-sm text-gray-500 mt-1">
                {classMap[editingRow.class_id]} • {studentMap[editingRow.student_id]}
              </div>
            )}
          </DialogHeader>
          {editingRow && (
            <div className="py-6 space-y-6">
              {/* 기본 정보 섹션 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  기본 정보
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">시험 날짜</label>
                      <Input 
                        type="date" 
                        value={editingRow.date || ""} 
                        onChange={e => setEditingRow({ ...editingRow, date: e.target.value })}
                        className="h-11"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 시험 정보 섹션 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  시험 정보
                </div>
                <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">시험명</label>
                      <Input 
                        value={editingRow.test || ""} 
                        onChange={e => setEditingRow({ ...editingRow, test: e.target.value })}
                        placeholder="시험명을 입력하세요"
                        className="h-11"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">시험유형</label>
                      <select 
                        className="w-full h-11 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        value={editingRow.test_type || ""} 
                        onChange={e => setEditingRow({ ...editingRow, test_type: e.target.value })}
                      >
                        <option value="">시험유형 선택</option>
                        {TEST_TYPE_OPTIONS.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">점수</label>
                    <div className="flex items-center gap-4">
                      <Input 
                        type="number"
                        value={editingRow.test_score || ""} 
                        onChange={e => setEditingRow({ ...editingRow, test_score: parseInt(e.target.value) || null })}
                        placeholder="점수 입력"
                        className="h-11 w-32"
                        min={0}
                        max={100}
                      />
                      {editingRow.test_score !== null && editingRow.test_score !== "" && (
                        <span className={`inline-flex items-center justify-center px-3 py-2 text-sm font-semibold rounded-full border-2 ${scoreColor(editingRow.test_score)}`}>
                          {editingRow.test_score}점
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 특이사항 섹션 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  특이사항 및 메모
                </div>
                <div className="bg-amber-50 rounded-lg p-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">특이사항</label>
                    <textarea
                      className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      value={editingRow.note || ""} 
                      onChange={e => setEditingRow({ ...editingRow, note: e.target.value })}
                      placeholder="특이사항이나 추가 메모를 입력하세요..."
                    />
                  </div>
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
              onClick={() => handleSaveEdit(editingRow)} 
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