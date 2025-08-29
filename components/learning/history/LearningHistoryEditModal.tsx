import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, BookOpen, FileText, AlertCircle, Users, School } from "lucide-react";

interface LearningHistoryEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingRow: any;
  setEditingRow: (row: any) => void;
  onSave: () => void;
  isSaving: boolean;
  classOptions: { id: string; name: string }[];
  studentOptions: { id: string; name: string }[];
}

export function LearningHistoryEditModal({
  isOpen,
  onClose,
  editingRow,
  setEditingRow,
  onSave,
  isSaving,
  classOptions,
  studentOptions,
}: LearningHistoryEditModalProps) {
  const scoreOptions = [
    { value: "1", label: "1 - 매우 부족", color: "text-red-600 bg-red-50" },
    { value: "2", label: "2 - 부족", color: "text-orange-600 bg-orange-50" },
    { value: "3", label: "3 - 보통", color: "text-yellow-600 bg-yellow-50" },
    { value: "4", label: "4 - 양호", color: "text-blue-600 bg-blue-50" },
    { value: "5", label: "5 - 우수", color: "text-green-600 bg-green-50" },
  ];

  if (!editingRow) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            학습 기록 수정
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 기본 정보 섹션 */}
          <div className="bg-blue-50 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <School className="h-4 w-4" />
              기본 정보
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline h-3 w-3 mr-1" />
                  날짜
                </label>
                <Input
                  type="date"
                  value={editingRow.date || ""}
                  onChange={(e) => setEditingRow({ ...editingRow, date: e.target.value })}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <School className="inline h-3 w-3 mr-1" />
                  반
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={editingRow.class_id || ""}
                  onChange={(e) => setEditingRow({ ...editingRow, class_id: e.target.value })}
                >
                  <option value="">선택하세요</option>
                  {classOptions.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Users className="inline h-3 w-3 mr-1" />
                  학생
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={editingRow.student_id || ""}
                  onChange={(e) => setEditingRow({ ...editingRow, student_id: e.target.value })}
                >
                  <option value="">선택하세요</option>
                  {studentOptions.map(student => (
                    <option key={student.id} value={student.id}>{student.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 평가 점수 섹션 */}
          <div className="bg-green-50 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              평가 점수
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">출결</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={editingRow.attendance_status || ""}
                  onChange={(e) => setEditingRow({ ...editingRow, attendance_status: e.target.value })}
                >
                  <option value="">선택</option>
                  {scoreOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">숙제</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={editingRow.homework || ""}
                  onChange={(e) => setEditingRow({ ...editingRow, homework: e.target.value })}
                >
                  <option value="">선택</option>
                  {scoreOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">집중도</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={editingRow.focus || ""}
                  onChange={(e) => setEditingRow({ ...editingRow, focus: e.target.value })}
                >
                  <option value="">선택</option>
                  {scoreOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 교재 및 진도 섹션 */}
          <div className="bg-purple-50 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              교재 및 진도
            </h3>
            
            <div className="space-y-4">
              {/* 교재 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">교재1</label>
                  <Input
                    value={editingRow.book1 || ""}
                    onChange={(e) => setEditingRow({ ...editingRow, book1: e.target.value })}
                    placeholder="교재명 입력"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">진도1</label>
                  <Input
                    value={editingRow.book1log || ""}
                    onChange={(e) => setEditingRow({ ...editingRow, book1log: e.target.value })}
                    placeholder="진도 입력"
                    className="w-full"
                  />
                </div>
              </div>
              
              {/* 교재 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">교재2</label>
                  <Input
                    value={editingRow.book2 || ""}
                    onChange={(e) => setEditingRow({ ...editingRow, book2: e.target.value })}
                    placeholder="교재명 입력"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">진도2</label>
                  <Input
                    value={editingRow.book2log || ""}
                    onChange={(e) => setEditingRow({ ...editingRow, book2log: e.target.value })}
                    placeholder="진도 입력"
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 특이사항 섹션 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              특이사항
            </label>
            <Textarea
              value={editingRow.note || ""}
              onChange={(e) => setEditingRow({ ...editingRow, note: e.target.value })}
              placeholder="특이사항을 입력하세요"
              className="w-full min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline" disabled={isSaving}>
            취소
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}