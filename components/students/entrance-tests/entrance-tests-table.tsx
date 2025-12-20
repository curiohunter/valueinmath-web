"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Calendar,
  User,
  Award,
  FileText,
  Search,
  X
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { Database } from "@/types/database";

type EntranceTest = Database["public"]["Tables"]["entrance_tests"]["Row"];
type Student = Database["public"]["Tables"]["students"]["Row"];
type TestStatus = Database["public"]["Enums"]["test_status_enum"];
type TestResult = Database["public"]["Enums"]["test_result_enum"];
type TestLevel = Database["public"]["Enums"]["test_level_enum"];

interface EntranceTestsTableProps {
  entranceTests: EntranceTest[];
  students: Student[];
  loading: boolean;
  onDelete: (id: number) => void;
  onUpdate: (id: number, updates: Partial<EntranceTest>) => void;
}

export function EntranceTestsTable({
  entranceTests,
  students,
  loading,
  onDelete,
  onUpdate,
}: EntranceTestsTableProps) {
  const [sortField, setSortField] = useState<"test_date" | "student_id">("test_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<Partial<EntranceTest>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");

  // 학생 이름 찾기
  const getStudentName = (studentId: string | null) => {
    if (!studentId) return "미지정";
    const student = students.find(s => s.id === studentId);
    return student?.name || "알 수 없음";
  };

  // 검색 필터링된 데이터
  const filteredTests = useMemo(() => {
    if (!searchTerm.trim()) return entranceTests;
    const term = searchTerm.toLowerCase();
    return entranceTests.filter(test => {
      const studentName = getStudentName(test.student_id).toLowerCase();
      return studentName.includes(term);
    });
  }, [entranceTests, searchTerm, students]);

  // 정렬된 데이터
  const sortedTests = useMemo(() => {
    const sorted = [...filteredTests].sort((a, b) => {
      let aValue, bValue;

      if (sortField === "test_date") {
        aValue = a.test_date || "";
        bValue = b.test_date || "";
      } else {
        aValue = getStudentName(a.student_id);
        bValue = getStudentName(b.student_id);
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return sorted;
  }, [filteredTests, sortField, sortOrder]);

  // 페이지네이션 계산
  const totalPages = Math.ceil(sortedTests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTests = sortedTests.slice(startIndex, endIndex);

  // 페이지 변경 시 처음으로 스크롤
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  // 정렬 토글
  const handleSort = (field: "test_date" | "student_id") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // 상태 색상 - 커스텀 클래스
  const getStatusClass = (status: TestStatus | null) => {
    switch (status) {
      case "테스트예정":
        return "border-blue-200 bg-blue-50 text-blue-700";
      case "결과상담대기":
        return "border-amber-200 bg-amber-50 text-amber-700";
      case "결과상담완료":
        return "border-green-200 bg-green-50 text-green-700";
      default:
        return "border-gray-200 bg-gray-50 text-gray-700";
    }
  };

  // 결과 색상 - 커스텀 클래스
  const getResultClass = (result: TestResult | null) => {
    switch (result) {
      case "합격":
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
      case "불합격":
        return "border-rose-200 bg-rose-50 text-rose-700";
      default:
        return "border-gray-200 bg-gray-50 text-gray-700";
    }
  };

  // 날짜 포맷
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "yyyy-MM-dd (EEE)", { locale: ko });
    } catch {
      return dateString;
    }
  };

  // 편집 시작
  const startEdit = (test: EntranceTest) => {
    setEditingId(test.id);
    setEditingData(test);
  };

  // 편집 저장
  const saveEdit = () => {
    if (editingId && editingData) {
      onUpdate(editingId, editingData);
      setEditingId(null);
      setEditingData({});
    }
  };

  // 편집 취소
  const cancelEdit = () => {
    setEditingId(null);
    setEditingData({});
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (entranceTests.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500">등록된 입학테스트가 없습니다.</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border">
        {/* 학생 검색 */}
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="학생 이름 검색..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // 검색 시 첫 페이지로
              }}
              className="pl-9 pr-9"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="text-sm text-gray-500 mt-2">
              "{searchTerm}" 검색 결과: {filteredTests.length}건
            </p>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("student_id")}
                    className="h-auto p-0 font-semibold"
                  >
                    학생
                    {sortField === "student_id" && (
                      sortOrder === "asc" ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                    )}
                    {sortField !== "student_id" && <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />}
                  </Button>
                </TableHead>
                <TableHead className="w-[150px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("test_date")}
                    className="h-auto p-0 font-semibold"
                  >
                    테스트 날짜
                    {sortField === "test_date" && (
                      sortOrder === "asc" ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                    )}
                    {sortField !== "test_date" && <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />}
                  </Button>
                </TableHead>
                <TableHead>테스트1 레벨</TableHead>
                <TableHead>테스트1 점수</TableHead>
                <TableHead>테스트2 레벨</TableHead>
                <TableHead>테스트2 점수</TableHead>
                <TableHead>결과</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>추천 반</TableHead>
                <TableHead>메모</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTests.map((test) => (
                <TableRow key={test.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 text-gray-400" />
                      {editingId === test.id ? (
                        <Select
                          value={editingData.student_id || ""}
                          onValueChange={(value) => setEditingData({...editingData, student_id: value})}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="학생 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {students.map((student) => (
                              <SelectItem key={student.id} value={student.id}>
                                {student.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm">{getStudentName(test.student_id)}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {editingId === test.id ? (
                      <Input
                        type="datetime-local"
                        value={editingData.test_date?.slice(0, 16) || ""}
                        onChange={(e) => setEditingData({...editingData, test_date: e.target.value})}
                        className="h-8 text-sm"
                      />
                    ) : (
                      <span className="text-sm">{formatDate(test.test_date)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === test.id ? (
                      <Select
                        value={editingData.test1_level || ""}
                        onValueChange={(value) => setEditingData({...editingData, test1_level: value as TestLevel})}
                      >
                        <SelectTrigger className="h-8 text-sm w-[100px]">
                          <SelectValue placeholder="선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="초3-1">초3-1</SelectItem>
                          <SelectItem value="초3-2">초3-2</SelectItem>
                          <SelectItem value="초4-1">초4-1</SelectItem>
                          <SelectItem value="초4-2">초4-2</SelectItem>
                          <SelectItem value="초5-1">초5-1</SelectItem>
                          <SelectItem value="초5-2">초5-2</SelectItem>
                          <SelectItem value="초6-1">초6-1</SelectItem>
                          <SelectItem value="초6-2">초6-2</SelectItem>
                          <SelectItem value="중1-1">중1-1</SelectItem>
                          <SelectItem value="중1-2">중1-2</SelectItem>
                          <SelectItem value="중2-1">중2-1</SelectItem>
                          <SelectItem value="중2-2">중2-2</SelectItem>
                          <SelectItem value="중3-1">중3-1</SelectItem>
                          <SelectItem value="중3-2">중3-2</SelectItem>
                          <SelectItem value="공통수학1">공통수학1</SelectItem>
                          <SelectItem value="공통수학2">공통수학2</SelectItem>
                          <SelectItem value="대수">대수</SelectItem>
                          <SelectItem value="미적분">미적분</SelectItem>
                          <SelectItem value="확통">확통</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className="text-xs font-normal border-indigo-200 bg-indigo-50 text-indigo-700">
                        {test.test1_level || "-"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === test.id ? (
                      <Input
                        type="number"
                        value={editingData.test1_score || ""}
                        onChange={(e) => setEditingData({...editingData, test1_score: parseInt(e.target.value)})}
                        className="h-8 text-sm w-[80px]"
                        min="0"
                        max="100"
                      />
                    ) : (
                      <span className="text-sm font-mono">{test.test1_score || "-"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === test.id ? (
                      <Select
                        value={editingData.test2_level || ""}
                        onValueChange={(value) => setEditingData({...editingData, test2_level: value as TestLevel})}
                      >
                        <SelectTrigger className="h-8 text-sm w-[100px]">
                          <SelectValue placeholder="선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="초3-1">초3-1</SelectItem>
                          <SelectItem value="초3-2">초3-2</SelectItem>
                          <SelectItem value="초4-1">초4-1</SelectItem>
                          <SelectItem value="초4-2">초4-2</SelectItem>
                          <SelectItem value="초5-1">초5-1</SelectItem>
                          <SelectItem value="초5-2">초5-2</SelectItem>
                          <SelectItem value="초6-1">초6-1</SelectItem>
                          <SelectItem value="초6-2">초6-2</SelectItem>
                          <SelectItem value="중1-1">중1-1</SelectItem>
                          <SelectItem value="중1-2">중1-2</SelectItem>
                          <SelectItem value="중2-1">중2-1</SelectItem>
                          <SelectItem value="중2-2">중2-2</SelectItem>
                          <SelectItem value="중3-1">중3-1</SelectItem>
                          <SelectItem value="중3-2">중3-2</SelectItem>
                          <SelectItem value="공통수학1">공통수학1</SelectItem>
                          <SelectItem value="공통수학2">공통수학2</SelectItem>
                          <SelectItem value="대수">대수</SelectItem>
                          <SelectItem value="미적분">미적분</SelectItem>
                          <SelectItem value="확통">확통</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className="text-xs font-normal border-purple-200 bg-purple-50 text-purple-700">
                        {test.test2_level || "-"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === test.id ? (
                      <Input
                        type="number"
                        value={editingData.test2_score || ""}
                        onChange={(e) => setEditingData({...editingData, test2_score: parseInt(e.target.value)})}
                        className="h-8 text-sm w-[80px]"
                        min="0"
                        max="100"
                      />
                    ) : (
                      <span className="text-sm font-mono">{test.test2_score || "-"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === test.id ? (
                      <Select
                        value={editingData.test_result || ""}
                        onValueChange={(value) => setEditingData({...editingData, test_result: value as TestResult})}
                      >
                        <SelectTrigger className="h-8 text-sm w-[90px]">
                          <SelectValue placeholder="선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="합격">합격</SelectItem>
                          <SelectItem value="불합격">불합격</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className={`text-xs font-normal ${getResultClass(test.test_result)}`}>
                        {test.test_result || "-"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === test.id ? (
                      <Select
                        value={editingData.status || "테스트예정"}
                        onValueChange={(value) => setEditingData({...editingData, status: value as TestStatus})}
                      >
                        <SelectTrigger className="h-8 text-sm w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="테스트예정">테스트예정</SelectItem>
                          <SelectItem value="결과상담대기">결과상담대기</SelectItem>
                          <SelectItem value="결과상담완료">결과상담완료</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className={`text-xs font-normal ${getStatusClass(test.status)}`}>
                        {test.status || "테스트예정"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === test.id ? (
                      <Input
                        value={editingData.recommended_class || ""}
                        onChange={(e) => setEditingData({...editingData, recommended_class: e.target.value})}
                        className="h-8 text-sm w-[100px]"
                        placeholder="추천 반"
                      />
                    ) : (
                      <span className="text-sm">{test.recommended_class || "-"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === test.id ? (
                      <Textarea
                        value={editingData.notes || ""}
                        onChange={(e) => setEditingData({...editingData, notes: e.target.value})}
                        className="h-8 text-sm min-h-[32px] w-[150px]"
                        placeholder="메모"
                      />
                    ) : (
                      <span className="text-xs text-gray-600 block max-w-[150px] truncate" title={test.notes || ""}>
                        {test.notes || "-"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === test.id ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={saveEdit}
                          className="h-7 px-2 text-xs"
                        >
                          저장
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEdit}
                          className="h-7 px-2 text-xs"
                        >
                          취소
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(test)}
                          className="h-7 w-7 p-0"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteId(test.id)}
                          className="text-destructive hover:text-destructive h-7 w-7 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* 페이지네이션 */}
        {sortedTests.length > 0 && (
          <div className="flex items-center justify-between mt-4 px-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">페이지당</span>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10개</SelectItem>
                  <SelectItem value="20">20개</SelectItem>
                  <SelectItem value="50">50개</SelectItem>
                  <SelectItem value="100">100개</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-gray-600">
              {currentPage} / {totalPages} 페이지
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                처음
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                이전
              </Button>

              {/* 페이지 번호 표시 */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="min-w-[32px]"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                다음
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                마지막
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>입학테스트 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 입학테스트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  onDelete(deleteId);
                  setDeleteId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}