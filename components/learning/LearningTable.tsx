import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Edit, Save, X, Trash2, Plus } from "lucide-react";
import type { Database } from "@/types/database";

type Class = Database["public"]["Tables"]["classes"]["Row"];
type Student = Database["public"]["Tables"]["students"]["Row"];
type AttendanceStatus = Database["public"]["Enums"]["attendance_status_enum"];
type ConsultationType = Database["public"]["Enums"]["consultation_type_enum"];

interface AttendanceWithDetails {
  id?: string;
  student_id: string;
  class_id: string;
  date: string;
  status: AttendanceStatus;
  notes?: string | null;
  absence_reason?: string | null;
  consultation_type?: ConsultationType | null;
  created_at?: string;
  updated_at?: string;
  student?: Student;
  class?: Class;
}

interface LearningTableProps {
  selectedStudent: { studentId: string; classId: string } | null;
  attendance: AttendanceWithDetails[];
  editingId: string | null;
  editForm: {
    status: AttendanceStatus;
    notes: string;
    absence_reason: string;
    consultation_type: ConsultationType | null;
  };
  isBulkEditMode: boolean;
  bulkEditData: AttendanceWithDetails[];
  selectedClass: Class | undefined;
  selectedStudentData: Student | undefined;
  date: Date | undefined;
  onEdit: (attendance: AttendanceWithDetails) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
  onBulkEdit: () => void;
  onBulkSave: () => void;
  onBulkCancel: () => void;
  onAddRow: () => void;
  onBulkDelete: (index: number) => void;
  onBulkEditChange: (index: number, field: string, value: any) => void;
  onEditFormChange: (field: string, value: any) => void;
}

export function LearningTable({
  selectedStudent,
  attendance,
  editingId,
  editForm,
  isBulkEditMode,
  bulkEditData,
  selectedClass,
  selectedStudentData,
  date,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onBulkEdit,
  onBulkSave,
  onBulkCancel,
  onAddRow,
  onBulkDelete,
  onBulkEditChange,
  onEditFormChange,
}: LearningTableProps) {
  const getStatusBadgeColor = (status: AttendanceStatus) => {
    switch (status) {
      case "출석":
        return "bg-green-100 text-green-800";
      case "결석":
        return "bg-red-100 text-red-800";
      case "지각":
        return "bg-yellow-100 text-yellow-800";
      case "조퇴":
        return "bg-orange-100 text-orange-800";
      case "보강":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getConsultationBadgeColor = (type: ConsultationType) => {
    switch (type) {
      case "학습상담":
        return "bg-purple-100 text-purple-800";
      case "진로상담":
        return "bg-indigo-100 text-indigo-800";
      case "생활상담":
        return "bg-pink-100 text-pink-800";
      case "기타":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  if (!selectedStudent) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">
            왼쪽 사이드바에서 학생을 선택해주세요
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isBulkEditMode) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {selectedClass?.name} - {selectedStudentData?.name} 출석 일괄 편집
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onAddRow}>
                <Plus className="h-4 w-4 mr-1" />
                행 추가
              </Button>
              <Button size="sm" onClick={onBulkSave}>
                <Save className="h-4 w-4 mr-1" />
                저장
              </Button>
              <Button size="sm" variant="outline" onClick={onBulkCancel}>
                <X className="h-4 w-4 mr-1" />
                취소
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">날짜</TableHead>
                <TableHead className="w-32">상태</TableHead>
                <TableHead className="w-40">결석 사유</TableHead>
                <TableHead className="w-32">상담 유형</TableHead>
                <TableHead>비고</TableHead>
                <TableHead className="w-20 text-center">삭제</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bulkEditData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => onBulkEditChange(index, 'date', e.target.value)}
                      className="w-full px-2 py-1 border rounded"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={row.status}
                      onValueChange={(value) => onBulkEditChange(index, 'status', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="출석">출석</SelectItem>
                        <SelectItem value="결석">결석</SelectItem>
                        <SelectItem value="지각">지각</SelectItem>
                        <SelectItem value="조퇴">조퇴</SelectItem>
                        <SelectItem value="보강">보강</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <input
                      type="text"
                      value={row.absence_reason || ''}
                      onChange={(e) => onBulkEditChange(index, 'absence_reason', e.target.value)}
                      className="w-full px-2 py-1 border rounded"
                      placeholder="결석 사유"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={row.consultation_type || ''}
                      onValueChange={(value) => onBulkEditChange(index, 'consultation_type', value || null)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">없음</SelectItem>
                        <SelectItem value="학습상담">학습상담</SelectItem>
                        <SelectItem value="진로상담">진로상담</SelectItem>
                        <SelectItem value="생활상담">생활상담</SelectItem>
                        <SelectItem value="기타">기타</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Textarea
                      value={row.notes || ''}
                      onChange={(e) => onBulkEditChange(index, 'notes', e.target.value)}
                      className="w-full min-h-[60px]"
                      placeholder="비고"
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onBulkDelete(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {selectedClass?.name} - {selectedStudentData?.name} 출석 기록
            {date && (
              <span className="ml-2 text-sm text-muted-foreground">
                ({date.toLocaleDateString('ko-KR')})
              </span>
            )}
          </CardTitle>
          <Button size="sm" onClick={onBulkEdit}>
            <Edit className="h-4 w-4 mr-1" />
            일괄 편집
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {attendance.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            출석 기록이 없습니다
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>날짜</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>결석 사유</TableHead>
                <TableHead>상담 유형</TableHead>
                <TableHead>비고</TableHead>
                <TableHead className="text-right">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{formatDate(record.date)}</TableCell>
                  <TableCell>
                    {editingId === record.id ? (
                      <Select
                        value={editForm.status}
                        onValueChange={(value) => onEditFormChange('status', value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="출석">출석</SelectItem>
                          <SelectItem value="결석">결석</SelectItem>
                          <SelectItem value="지각">지각</SelectItem>
                          <SelectItem value="조퇴">조퇴</SelectItem>
                          <SelectItem value="보강">보강</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={getStatusBadgeColor(record.status)}>
                        {record.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === record.id ? (
                      <input
                        type="text"
                        value={editForm.absence_reason}
                        onChange={(e) => onEditFormChange('absence_reason', e.target.value)}
                        className="w-full px-2 py-1 border rounded"
                      />
                    ) : (
                      record.absence_reason || '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === record.id ? (
                      <Select
                        value={editForm.consultation_type || ''}
                        onValueChange={(value) => onEditFormChange('consultation_type', value || null)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">없음</SelectItem>
                          <SelectItem value="학습상담">학습상담</SelectItem>
                          <SelectItem value="진로상담">진로상담</SelectItem>
                          <SelectItem value="생활상담">생활상담</SelectItem>
                          <SelectItem value="기타">기타</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : record.consultation_type ? (
                      <Badge className={getConsultationBadgeColor(record.consultation_type)}>
                        {record.consultation_type}
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === record.id ? (
                      <Textarea
                        value={editForm.notes}
                        onChange={(e) => onEditFormChange('notes', e.target.value)}
                        className="w-full min-h-[60px]"
                      />
                    ) : (
                      record.notes || '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === record.id ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={onSave}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={onCancel}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(record)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => record.id && onDelete(record.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}