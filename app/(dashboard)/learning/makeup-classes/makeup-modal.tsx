"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import { toast } from "sonner";

type MakeupClass = Database["public"]["Tables"]["makeup_classes"]["Row"];
type MakeupType = Database["public"]["Enums"]["makeup_type_enum"];
type AbsenceReason = Database["public"]["Enums"]["absence_reason_enum"];
type MakeupStatus = Database["public"]["Enums"]["makeup_status_enum"];

interface MakeupModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentInfo: {
    studentId: string;
    classId: string;
    studentName: string;
    className: string;
  };
  editingMakeup: MakeupClass | null;
}

// 한국 시간대(KST) 기준으로 오늘 날짜 가져오기
const getKoreanDate = () => {
  const now = new Date();
  const koreanTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  return koreanTime.toISOString().slice(0, 10);
};

export function MakeupModal({
  isOpen,
  onClose,
  studentInfo,
  editingMakeup,
}: MakeupModalProps) {
  const supabase = createClient();
  
  // 상태 관리
  const [makeupType, setMakeupType] = useState<MakeupType>("absence");
  const [absenceDates, setAbsenceDates] = useState<Date[]>([]);
  const [absenceReason, setAbsenceReason] = useState<AbsenceReason | "">("");
  const [makeupDate, setMakeupDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [content, setContent] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<MakeupStatus>("scheduled");
  const [loading, setLoading] = useState(false);
  
  // 다중 날짜 선택 모달
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // 편집 모드일 때 데이터 초기화
  useEffect(() => {
    if (editingMakeup) {
      setMakeupType(editingMakeup.makeup_type);
      if (editingMakeup.absence_date) {
        setAbsenceDates([new Date(editingMakeup.absence_date)]);
      }
      setAbsenceReason(editingMakeup.absence_reason || "");
      if (editingMakeup.makeup_date) {
        setMakeupDate(new Date(editingMakeup.makeup_date));
      }
      setStartTime(editingMakeup.start_time || "");
      setEndTime(editingMakeup.end_time || "");
      setContent(editingMakeup.content || "");
      setNotes(editingMakeup.notes || "");
      setStatus(editingMakeup.status);
    } else {
      // 새로 추가할 때 초기화
      setMakeupType("absence");
      setAbsenceDates([]);
      setAbsenceReason("");
      setMakeupDate(undefined);
      setStartTime("");
      setEndTime("");
      setContent("");
      setNotes("");
      setStatus("scheduled");
    }
  }, [editingMakeup]);

  // 저장 핸들러
  const handleSave = async () => {
    // 유효성 검사
    if (makeupType === "absence" && absenceDates.length === 0) {
      toast.error("결석일을 선택해주세요.");
      return;
    }
    
    if (!makeupDate && status === "completed") {
      toast.error("완료 상태는 보강일이 필요합니다.");
      return;
    }

    setLoading(true);
    
    try {
      // 현재 사용자 정보 가져오기
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("로그인이 필요합니다.");
        return;
      }

      // 직원 정보 가져오기
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (editingMakeup) {
        // 수정 모드
        const { error } = await supabase
          .from("makeup_classes")
          .update({
            makeup_type: makeupType,
            absence_date: makeupType === "absence" && absenceDates.length > 0 
              ? absenceDates[0].toISOString().slice(0, 10) 
              : null,
            absence_reason: makeupType === "absence" ? absenceReason || null : null,
            makeup_date: makeupDate ? makeupDate.toISOString().slice(0, 10) : null,
            start_time: startTime ? (startTime.length === 5 ? `${startTime}:00` : startTime) : null,
            end_time: endTime ? (endTime.length === 5 ? `${endTime}:00` : endTime) : null,
            content: content || null,
            notes: notes || null,
            status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingMakeup.id);

        if (error) throw error;
        toast.success("보강이 수정되었습니다.");
      } else {
        // 추가 모드 - 여러 날짜에 대해 각각 레코드 생성
        const datesToProcess = makeupType === "absence" ? absenceDates : [new Date()];
        
        for (const date of datesToProcess) {
          const { error } = await supabase
            .from("makeup_classes")
            .insert({
              student_id: studentInfo.studentId,
              class_id: studentInfo.classId,
              makeup_type: makeupType,
              absence_date: makeupType === "absence" ? date.toISOString().slice(0, 10) : null,
              absence_reason: makeupType === "absence" ? absenceReason || null : null,
              makeup_date: makeupDate ? makeupDate.toISOString().slice(0, 10) : null,
              start_time: startTime ? (startTime.length === 5 ? `${startTime}:00` : startTime) : null,
              end_time: endTime ? (endTime.length === 5 ? `${endTime}:00` : endTime) : null,
              content: content || null,
              notes: notes || null,
              status,
              created_by: employee?.id || null,
            });

          if (error) throw error;
        }
        
        toast.success(`보강 ${datesToProcess.length}건이 추가되었습니다.`);
      }

      onClose();
    } catch (error) {
      console.error("보강 저장 오류:", error);
      toast.error("보강 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingMakeup ? "보강 수정" : "보강 추가"}
          </DialogTitle>
          <DialogDescription>
            {studentInfo.studentName} ({studentInfo.className})
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* 보강 유형 */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              보강 유형
            </Label>
            <Select
              value={makeupType}
              onValueChange={(value) => setMakeupType(value as MakeupType)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="absence">결석 보강</SelectItem>
                <SelectItem value="additional">추가 수업</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 결석일 (결석 보강인 경우만) */}
          {makeupType === "absence" && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">결석일</Label>
                <div className="col-span-3">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {absenceDates.map((date, index) => (
                      <div key={index} className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1">
                        <span className="text-sm">
                          {format(date, "MM/dd (EEE)", { locale: ko })}
                        </span>
                        <button
                          onClick={() => {
                            setAbsenceDates(absenceDates.filter((_, i) => i !== index));
                          }}
                          className="text-gray-500 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {absenceDates.length > 0 
                          ? `${absenceDates.length}개 날짜 선택됨`
                          : "날짜 선택"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="multiple"
                        selected={absenceDates}
                        onSelect={(dates) => setAbsenceDates(dates || [])}
                        locale={ko}
                        initialFocus
                      />
                      <div className="p-3 border-t">
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => setIsDatePickerOpen(false)}
                        >
                          선택 완료
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* 결석 사유 */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reason" className="text-right">
                  결석 사유
                </Label>
                <Select
                  value={absenceReason}
                  onValueChange={(value) => setAbsenceReason(value as AbsenceReason)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sick">아픔</SelectItem>
                    <SelectItem value="travel">여행</SelectItem>
                    <SelectItem value="event">행사</SelectItem>
                    <SelectItem value="unauthorized">무단</SelectItem>
                    <SelectItem value="other">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* 보강일 */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">보강일</Label>
            <div className="col-span-3">
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !makeupDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {makeupDate ? (
                        format(makeupDate, "yyyy년 MM월 dd일 (EEE)", { locale: ko })
                      ) : (
                        <span>날짜 선택 (선택사항)</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={makeupDate}
                      onSelect={setMakeupDate}
                      locale={ko}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {makeupDate && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMakeupDate(undefined)}
                    className="h-10 w-10 text-gray-500 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* 시간 */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">시간</Label>
            <div className="col-span-3">
              <style>{`
                .time-input-field {
                  position: relative;
                }
                .time-input-field input[type="time"]::-webkit-calendar-picker-indicator {
                  position: absolute;
                  right: 8px;
                  width: 20px;
                  height: 20px;
                  cursor: pointer;
                  opacity: 0.7;
                }
                .time-input-field input[type="time"] {
                  padding-right: 36px;
                  width: 100%;
                }
              `}</style>
              <div className="flex gap-2 items-center">
                <div className="flex items-center gap-1 flex-1">
                  <div className="time-input-field flex-1">
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  {startTime && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setStartTime("")}
                      className="h-10 w-10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <span>~</span>
                <div className="flex items-center gap-1 flex-1">
                  <div className="time-input-field flex-1">
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  {endTime && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setEndTime("")}
                      className="h-10 w-10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">선택사항 - 비워두면 시간 미정 (직접 입력 가능)</p>
            </div>
          </div>

          {/* 상태 */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              상태
            </Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as MakeupStatus)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">예정</SelectItem>
                <SelectItem value="completed">완료</SelectItem>
                <SelectItem value="cancelled">취소</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 내용 */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="content" className="text-right mt-2">
              수업 내용
            </Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="col-span-3"
              placeholder="수업 내용을 입력하세요 (선택사항)"
              rows={3}
            />
          </div>

          {/* 메모 */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="notes" className="text-right mt-2">
              메모
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3"
              placeholder="추가 메모 (선택사항)"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}