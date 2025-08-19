"use client";

import React, { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit2, Trash2, Calendar, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/types/database";

type MakeupClass = Database["public"]["Tables"]["makeup_classes"]["Row"];
type Student = Database["public"]["Tables"]["students"]["Row"];
type Class = Database["public"]["Tables"]["classes"]["Row"];

interface MakeupTableProps {
  makeupClasses: MakeupClass[];
  students: Student[];
  classes: Class[];
  selectedTab: "pending" | "scheduled" | "completed" | "cancelled";
  onTabChange: (tab: "pending" | "scheduled" | "completed" | "cancelled") => void;
  onEdit: (makeup: MakeupClass) => void;
  onDelete: (id: string) => void;
  onStatusUpdate: (makeupId: string, newStatus: Database["public"]["Enums"]["makeup_status_enum"]) => void;
}

export function MakeupTable({
  makeupClasses,
  students,
  classes,
  selectedTab,
  onTabChange,
  onEdit,
  onDelete,
  onStatusUpdate,
}: MakeupTableProps) {
  const supabase = createClient();
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  // 탭별 데이터 필터링
  const filteredMakeups = makeupClasses.filter(makeup => {
    switch (selectedTab) {
      case "pending":
        return makeup.status === "scheduled" && !makeup.makeup_date;
      case "scheduled":
        return makeup.status === "scheduled" && makeup.makeup_date;
      case "completed":
        return makeup.status === "completed";
      case "cancelled":
        return makeup.status === "cancelled";
      default:
        return false;
    }
  });

  // 학생/반 이름 찾기 헬퍼 함수
  const getStudentName = (studentId: string) => {
    return students.find(s => s.id === studentId)?.name || "알 수 없음";
  };

  const getClassName = (classId: string) => {
    return classes.find(c => c.id === classId)?.name || "알 수 없음";
  };

  // 결석 사유 한글 변환 및 색상
  const getAbsenceReasonLabel = (reason: Database["public"]["Enums"]["absence_reason_enum"] | null) => {
    if (!reason) return "-";
    const labels = {
      sick: "아픔",
      travel: "여행",
      event: "행사",
      unauthorized: "무단",
      other: "기타"
    };
    return labels[reason] || reason;
  };

  // 결석 사유별 색상 클래스
  const getAbsenceReasonClass = (reason: Database["public"]["Enums"]["absence_reason_enum"] | null) => {
    if (!reason) return "";
    const classes = {
      sick: "border-orange-200 bg-orange-50 text-orange-700",      // 아픔 - 주황색
      travel: "border-green-200 bg-green-50 text-green-700",       // 여행 - 초록색
      event: "border-purple-200 bg-purple-50 text-purple-700",     // 행사 - 보라색
      unauthorized: "border-red-200 bg-red-50 text-red-700",       // 무단 - 빨간색
      other: "border-gray-200 bg-gray-50 text-gray-700"            // 기타 - 회색
    };
    return classes[reason] || "";
  };

  // 보강 유형 한글 변환
  const getMakeupTypeLabel = (type: Database["public"]["Enums"]["makeup_type_enum"]) => {
    const labels = {
      absence: "결석 보강",
      additional: "추가 수업"
    };
    return labels[type] || type;
  };

  // 날짜 포맷
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "MM/dd (EEE)", { locale: ko });
    } catch {
      return dateString;
    }
  };

  // 시간 포맷
  const formatTime = (startTime: string | null, endTime: string | null) => {
    // null이거나 00:00:00은 시간 미정으로 처리
    if (!startTime || !endTime || startTime === "00:00:00" || endTime === "00:00:00") {
      return "미정";
    }
    return `${startTime.slice(0, 5)}-${endTime.slice(0, 5)}`;
  };

  // 상태 변경 핸들러
  const handleStatusChange = async (makeupId: string, newStatus: Database["public"]["Enums"]["makeup_status_enum"]) => {
    setUpdatingStatus(makeupId);
    try {
      const { error } = await supabase
        .from("makeup_classes")
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", makeupId);

      if (error) throw error;
      
      toast.success("상태가 변경되었습니다.");
      // 상태만 업데이트하고 탭은 유지
      const updatedMakeup = makeupClasses.find(m => m.id === makeupId);
      if (updatedMakeup) {
        updatedMakeup.status = newStatus;
        // 부모 컴포넌트에 변경사항 알림
        onStatusUpdate(makeupId, newStatus);
      }
    } catch (error) {
      console.error("상태 변경 오류:", error);
      toast.error("상태 변경 중 오류가 발생했습니다.");
    } finally {
      setUpdatingStatus(null);
    }
  };

  // 상태별 색상
  const getStatusVariant = (status: Database["public"]["Enums"]["makeup_status_enum"]) => {
    switch (status) {
      case "scheduled":
        return "outline";
      case "completed":
        return "default";
      case "cancelled":
        return "secondary";
      default:
        return "outline";
    }
  };

  // 탭별 카운트
  const counts = {
    pending: makeupClasses.filter(m => m.status === "scheduled" && !m.makeup_date).length,
    scheduled: makeupClasses.filter(m => m.status === "scheduled" && m.makeup_date).length,
    completed: makeupClasses.filter(m => m.status === "completed").length,
    cancelled: makeupClasses.filter(m => m.status === "cancelled").length,
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <Tabs value={selectedTab} onValueChange={(value) => onTabChange(value as any)}>
        <div className="border-b">
          <TabsList className="w-full justify-start h-auto p-0 bg-transparent">
            <TabsTrigger 
              value="pending" 
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3"
            >
              보강 미정
              {counts.pending > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {counts.pending}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="scheduled"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3"
            >
              보강 예정
              {counts.scheduled > 0 && (
                <Badge variant="outline" className="ml-2">
                  {counts.scheduled}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="completed"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3"
            >
              보강 완료
              {counts.completed > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {counts.completed}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="cancelled"
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 py-3"
            >
              취소됨
              {counts.cancelled > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {counts.cancelled}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={selectedTab} className="mt-0">
          {filteredMakeups.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>해당하는 보강 내역이 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="py-2 px-3">학생</TableHead>
                    <TableHead className="py-2 px-3">반</TableHead>
                    <TableHead className="py-2 px-3">유형</TableHead>
                    <TableHead className="py-2 px-3">결석일</TableHead>
                    <TableHead className="py-2 px-3">사유</TableHead>
                    <TableHead className="py-2 px-3">보강일</TableHead>
                    <TableHead className="py-2 px-3">시간</TableHead>
                    <TableHead className="py-2 px-3">상태</TableHead>
                    <TableHead className="py-2 px-3">수업내용</TableHead>
                    <TableHead className="py-2 px-3 text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMakeups.map((makeup) => (
                    <TableRow key={makeup.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-medium py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="text-sm">{getStudentName(makeup.student_id)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-3 whitespace-nowrap">
                        <Badge variant="outline" className="font-normal text-xs">
                          {getClassName(makeup.class_id)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-3 whitespace-nowrap">
                        <Badge 
                          variant={makeup.makeup_type === "absence" ? "outline" : "default"}
                          className={makeup.makeup_type === "absence" ? "font-normal text-xs border-blue-200 bg-blue-50 text-blue-700" : "font-normal text-xs"}
                        >
                          {getMakeupTypeLabel(makeup.makeup_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-3 whitespace-nowrap">
                        <span className="text-sm">{formatDate(makeup.absence_date)}</span>
                      </TableCell>
                      <TableCell className="py-3 px-3 whitespace-nowrap">
                        {makeup.absence_reason ? (
                          <Badge 
                            variant="outline"
                            className={`font-normal text-xs ${getAbsenceReasonClass(makeup.absence_reason)}`}
                          >
                            {getAbsenceReasonLabel(makeup.absence_reason)}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-3 whitespace-nowrap">
                        {makeup.makeup_date ? (
                          <span className="text-sm">{formatDate(makeup.makeup_date)}</span>
                        ) : (
                          <Badge variant="destructive" className="font-normal text-xs">미정</Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        {formatTime(makeup.start_time, makeup.end_time) === "미정" ? (
                          <Badge variant="outline" className="font-normal text-xs">미정</Badge>
                        ) : (
                          <span className="text-xs font-mono">{formatTime(makeup.start_time, makeup.end_time)}</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-3 whitespace-nowrap">
                        <Select
                          value={makeup.status}
                          onValueChange={(value) => handleStatusChange(makeup.id, value as Database["public"]["Enums"]["makeup_status_enum"])}
                          disabled={updatingStatus === makeup.id}
                        >
                          <SelectTrigger className="h-7 text-xs w-[90px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scheduled">예정</SelectItem>
                            <SelectItem value="completed">완료</SelectItem>
                            <SelectItem value="cancelled">취소</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <span className="text-xs text-gray-600 block max-w-[150px] truncate" title={makeup.content || ""}>
                          {makeup.content || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-3 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEdit(makeup)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDelete(makeup.id)}
                            className="text-destructive hover:text-destructive h-7 w-7 p-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}