import { useState, useEffect } from "react";
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
import { Search, Edit, Trash2, Eye } from "lucide-react";
import { ConsultationAITags } from "./ConsultationAITags";
import { useDebounce } from "@/lib/hooks/use-debounce";
import type { Database } from "@/types/database";
import type { Consultation } from "@/types/consultation";

type Employee = Database['public']['Tables']['employees']['Row'];

interface ConsultationHistoryTabProps {
  consultations: Consultation[];
  employees: Employee[];
  onEdit: (consultation: Consultation) => void;
  onDelete: (consultation: Consultation) => void;
}

export function ConsultationHistoryTab({
  consultations,
  employees,
  onEdit,
  onDelete
}: ConsultationHistoryTabProps) {
  const [filteredConsultations, setFilteredConsultations] = useState<Consultation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [counselorFilter, setCounselorFilter] = useState("all");
  const [dateOrder, setDateOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedContent, setExpandedContent] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Filter consultations when search or filters change
  useEffect(() => {
    let filtered = [...consultations];

    // Apply search filter (using debounced value)
    if (debouncedSearchTerm) {
      filtered = filtered.filter(c =>
        c.student_name_snapshot?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(c => c.type === typeFilter);
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    // Apply counselor filter
    if (counselorFilter !== "all") {
      filtered = filtered.filter(c => c.counselor_id === counselorFilter);
    }

    // Apply date sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    setFilteredConsultations(filtered);
  }, [consultations, debouncedSearchTerm, typeFilter, statusFilter, counselorFilter, dateOrder]);

  // 필터 변경 시에만 첫 페이지로 (데이터 리로드 시에는 현재 페이지 유지)
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, typeFilter, statusFilter, counselorFilter]);

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredConsultations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedConsultations = filteredConsultations.slice(startIndex, endIndex);
  
  const toggleContentExpansion = (consultationId: string) => {
    const newExpanded = new Set(expandedContent);
    if (newExpanded.has(consultationId)) {
      newExpanded.delete(consultationId);
    } else {
      newExpanded.add(consultationId);
    }
    setExpandedContent(newExpanded);
  };
  
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "신규상담":
        return "bg-purple-100 text-purple-800";
      case "입테유도":
        return "bg-amber-100 text-amber-800";
      case "입테후상담":
        return "bg-blue-100 text-blue-800";
      case "등록유도":
        return "bg-indigo-100 text-indigo-800";
      case "정기상담":
        return "bg-teal-100 text-teal-800";
      case "퇴원상담":
        return "bg-red-100 text-red-800";
      case "입학후상담":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  const getStatusBadgeColor = (status: string) => {
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="상담 유형" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 유형</SelectItem>
              <SelectItem value="신규상담">신규상담</SelectItem>
              <SelectItem value="입테유도">입테유도</SelectItem>
              <SelectItem value="입테후상담">입테후상담</SelectItem>
              <SelectItem value="등록유도">등록유도</SelectItem>
              <SelectItem value="정기상담">정기상담</SelectItem>
              <SelectItem value="퇴원상담">퇴원상담</SelectItem>
              <SelectItem value="입학후상담">입학후상담</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
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
          
          <Select value={counselorFilter} onValueChange={setCounselorFilter}>
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
            onClick={() => setDateOrder(dateOrder === 'asc' ? 'desc' : 'asc')}
          >
            날짜 {dateOrder === 'desc' ? '↓' : '↑'}
          </Button>
        </div>
        
        {/* Consultations Table */}
        <div className="overflow-x-auto">
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
                <TableHead className="w-24">AI 분석</TableHead>
                <TableHead className="w-16">상태</TableHead>
                <TableHead className="w-24 text-right">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedConsultations.map((consultation) => {
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
                    <Badge className={getTypeBadgeColor(consultation.type)}>
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
                    <ConsultationAITags
                      hurdle={(consultation as any).ai_hurdle}
                      readiness={(consultation as any).ai_readiness}
                      decisionMaker={(consultation as any).ai_decision_maker}
                      sentiment={(consultation as any).ai_sentiment}
                      churnRisk={(consultation as any).ai_churn_risk}
                      analyzedAt={(consultation as any).ai_analyzed_at}
                      consultationType={consultation.type}
                      compact
                    />
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeColor(consultation.status)}>
                      {consultation.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEdit(consultation)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDelete(consultation)}
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
        </div>

        {/* 페이지네이션 */}
        {filteredConsultations.length > 0 && (
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
      </CardContent>
    </Card>
  );
}