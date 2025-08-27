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
import { calendarService } from "@/services/calendar";

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

// Date 객체를 한국 날짜 문자열로 변환 (YYYY-MM-DD)
const formatDateToKST = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  const [startHour, setStartHour] = useState<string | null>(null);
  const [startMinute, setStartMinute] = useState<string | null>(null);
  const [endHour, setEndHour] = useState<string | null>(null);
  const [endMinute, setEndMinute] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<MakeupStatus>("scheduled");
  const [loading, setLoading] = useState(false);
  
  // 시간 옵션 생성
  const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));
  
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
        
        // 보강일이 있을 때만 시간 설정
        if (editingMakeup.start_time) {
          const [hour, minute] = editingMakeup.start_time.split(':');
          setStartHour(hour || "14");
          setStartMinute(minute || "00");
        } else {
          setStartHour("14");
          setStartMinute("00");
        }
        
        if (editingMakeup.end_time) {
          const [hour, minute] = editingMakeup.end_time.split(':');
          setEndHour(hour || "15");
          setEndMinute(minute || "00");
        } else {
          setEndHour("15");
          setEndMinute("00");
        }
      } else {
        // 보강일이 없으면 시간도 null
        setStartHour(null);
        setStartMinute(null);
        setEndHour(null);
        setEndMinute(null);
      }
      
      setContent(editingMakeup.content || "");
      setNotes(editingMakeup.notes || "");
      setStatus(editingMakeup.status);
    } else {
      // 새로 추가할 때 초기화
      setMakeupType("absence");
      setAbsenceDates([]);
      setAbsenceReason("");
      setMakeupDate(undefined);
      setStartHour(null);
      setStartMinute(null);
      setEndHour(null);
      setEndMinute(null);
      setContent("");
      setNotes("");
      setStatus("scheduled");
    }
  }, [editingMakeup]);
  
  // 보강일 선택 시 시간 초기화
  useEffect(() => {
    if (makeupDate && !startHour && !startMinute) {
      // 보강일을 선택하고 시간이 아직 설정되지 않은 경우 기본값 설정
      setStartHour("14");
      setStartMinute("00");
      setEndHour("15");
      setEndMinute("00");
    } else if (!makeupDate) {
      // 보강일을 지우면 시간도 초기화
      setStartHour(null);
      setStartMinute(null);
      setEndHour(null);
      setEndMinute(null);
    }
  }, [makeupDate]);
  
  // 시작 시간 변경 시 종료 시간 자동 설정 (1시간 후)
  useEffect(() => {
    if (!editingMakeup && startHour && startMinute && makeupDate) {
      // 새 이벤트 생성 모드에서만 자동 설정
      const startH = parseInt(startHour);
      
      // 1시간 후 계산
      let endH = startH + 1;
      
      // 24시를 넘어가면 조정
      if (endH >= 24) {
        endH = endH - 24;
      }
      
      setEndHour(endH.toString().padStart(2, '0'));
      setEndMinute(startMinute);
    }
  }, [startHour, startMinute, editingMakeup, makeupDate]);

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
        const { data: updatedMakeup, error } = await supabase
          .from("makeup_classes")
          .update({
            makeup_type: makeupType,
            absence_date: makeupType === "absence" && absenceDates.length > 0 
              ? formatDateToKST(absenceDates[0]) 
              : null,
            absence_reason: makeupType === "absence" ? absenceReason || null : null,
            makeup_date: makeupDate ? formatDateToKST(makeupDate) : null,
            start_time: makeupDate && startHour && startMinute ? `${startHour}:${startMinute}:00` : null,
            end_time: makeupDate && endHour && endMinute ? `${endHour}:${endMinute}:00` : null,
            content: content || null,
            notes: notes || null,
            status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingMakeup.id)
          .select()
          .single();

        if (error) throw error;

        // 상태가 완료로 변경되고 결석일이 있는 경우, study_logs 업데이트
        if (status === "completed" && makeupType === "absence" && absenceDates.length > 0) {
          const absenceDate = formatDateToKST(absenceDates[0]);
          
          try {
            // 해당 날짜의 study_log 찾기
            const { data: studyLog } = await supabase
              .from("study_logs")
              .select("id, attendance_status, homework, focus")
              .eq("student_id", studentInfo.studentId)
              .eq("class_id", studentInfo.classId)
              .eq("date", absenceDate)
              .single();
            
            if (studyLog) {
              // 결석(1)이었던 경우 보강(2)으로 변경하고, 숙제와 집중도도 업데이트
              const updateData: any = {};
              
              // 출석 상태를 보강(2)으로 변경
              if (studyLog.attendance_status === 1) {
                updateData.attendance_status = 2;
              }
              
              // 숙제와 집중도가 결석(1)이었다면 정상(5)으로 변경
              if (studyLog.homework === 1) {
                updateData.homework = 5;
              }
              if (studyLog.focus === 1) {
                updateData.focus = 5;
              }
              
              // 변경사항이 있으면 업데이트
              if (Object.keys(updateData).length > 0) {
                updateData.last_modified_by = employee?.id || null;
                
                const { error: updateError } = await supabase
                  .from("study_logs")
                  .update(updateData)
                  .eq("id", studyLog.id);
                
                if (!updateError) {
                  console.log(`study_logs 업데이트 완료: ${absenceDate} - 보강 완료 처리`);
                } else {
                  console.error("study_logs 업데이트 실패:", updateError);
                }
              }
            }
          } catch (error) {
            console.error("study_logs 동기화 중 오류:", error);
          }
        }

        // 캘린더 이벤트 ID 업데이트를 위한 변수
        let newAbsenceEventId = editingMakeup.absence_calendar_event_id;
        let newMakeupEventId = editingMakeup.makeup_calendar_event_id;

        // 결석 이벤트 처리
        if (makeupType === "absence" && absenceDates.length > 0) {
          const absenceDate = formatDateToKST(absenceDates[0]);
          const absenceEventData = {
            title: `${studentInfo.studentName} 결석`,
            start_time: `${absenceDate}T09:00:00`,
            end_time: `${absenceDate}T10:00:00`,
            event_type: "absence",
            description: absenceReason ? `결석 사유: ${absenceReason}` : undefined,
            location: studentInfo.className,
          };

          if (editingMakeup.absence_calendar_event_id) {
            // 기존 이벤트 업데이트
            try {
              await calendarService.updateEvent(editingMakeup.absence_calendar_event_id, absenceEventData);
            } catch (error) {
              console.error("결석 이벤트 업데이트 실패:", error);
            }
          } else {
            // 새 이벤트 생성
            try {
              const newEvent = await calendarService.createEvent(absenceEventData);
              newAbsenceEventId = newEvent.id;
            } catch (error) {
              console.error("결석 이벤트 생성 실패:", error);
            }
          }
        } else {
          // 결석이 아니거나 결석일이 없으면 기존 결석 이벤트 삭제
          if (editingMakeup.absence_calendar_event_id) {
            try {
              await calendarService.deleteEvent(editingMakeup.absence_calendar_event_id);
              newAbsenceEventId = null;
            } catch (error) {
              console.error("결석 이벤트 삭제 실패:", error);
            }
          }
        }

        // 보강 이벤트 처리
        if (makeupDate) {
          const makeupDateStr = formatDateToKST(makeupDate);
          const title = makeupType === "additional" 
            ? `${studentInfo.studentName} 추가수업`
            : `${studentInfo.studentName} 결석보강`;
          
          const makeupEventData = {
            title,
            start_time: `${makeupDateStr}T${startHour}:${startMinute}:00`,
            end_time: `${makeupDateStr}T${endHour}:${endMinute}:00`,
            event_type: "makeup",
            description: content || undefined,
            location: studentInfo.className,
          };

          if (editingMakeup.makeup_calendar_event_id) {
            // 기존 이벤트 업데이트
            try {
              await calendarService.updateEvent(editingMakeup.makeup_calendar_event_id, makeupEventData);
            } catch (error) {
              console.error("보강 이벤트 업데이트 실패:", error);
            }
          } else {
            // 새 이벤트 생성
            try {
              const newEvent = await calendarService.createEvent(makeupEventData);
              newMakeupEventId = newEvent.id;
            } catch (error) {
              console.error("보강 이벤트 생성 실패:", error);
            }
          }
        } else {
          // 보강일이 없으면 기존 보강 이벤트 삭제
          if (editingMakeup.makeup_calendar_event_id) {
            try {
              await calendarService.deleteEvent(editingMakeup.makeup_calendar_event_id);
              newMakeupEventId = null;
            } catch (error) {
              console.error("보강 이벤트 삭제 실패:", error);
            }
          }
        }

        // 캘린더 이벤트 ID가 변경되었으면 DB 업데이트
        if (newAbsenceEventId !== editingMakeup.absence_calendar_event_id || 
            newMakeupEventId !== editingMakeup.makeup_calendar_event_id) {
          await supabase
            .from("makeup_classes")
            .update({
              absence_calendar_event_id: newAbsenceEventId,
              makeup_calendar_event_id: newMakeupEventId,
            })
            .eq("id", editingMakeup.id);
        }

        toast.success("보강이 수정되었습니다.");
      } else {
        // 추가 모드 - 여러 날짜에 대해 각각 레코드 생성
        const datesToProcess = makeupType === "absence" ? absenceDates : [new Date()];
        
        for (const date of datesToProcess) {
          // 먼저 보강 레코드 생성
          const { data: newMakeup, error: makeupError } = await supabase
            .from("makeup_classes")
            .insert({
              student_id: studentInfo.studentId,
              class_id: studentInfo.classId,
              makeup_type: makeupType,
              absence_date: makeupType === "absence" ? formatDateToKST(date) : null,
              absence_reason: makeupType === "absence" ? absenceReason || null : null,
              makeup_date: makeupDate ? formatDateToKST(makeupDate) : null,
              start_time: makeupDate && startHour && startMinute ? `${startHour}:${startMinute}:00` : null,
              end_time: makeupDate && endHour && endMinute ? `${endHour}:${endMinute}:00` : null,
              content: content || null,
              notes: notes || null,
              status,
              created_by: employee?.id || null,
            })
            .select()
            .single();

          if (makeupError) throw makeupError;

          // 새로 추가하면서 상태가 완료인 경우 study_logs 업데이트
          if (status === "completed" && makeupType === "absence" && newMakeup) {
            const absenceDate = formatDateToKST(date);
            
            try {
              // 해당 날짜의 study_log 찾기
              const { data: studyLog } = await supabase
                .from("study_logs")
                .select("id, attendance_status, homework, focus")
                .eq("student_id", studentInfo.studentId)
                .eq("class_id", studentInfo.classId)
                .eq("date", absenceDate)
                .single();
              
              if (studyLog) {
                // 결석(1)이었던 경우 보강(2)으로 변경하고, 숙제와 집중도도 업데이트
                const updateData: any = {};
                
                // 출석 상태를 보강(2)으로 변경
                if (studyLog.attendance_status === 1) {
                  updateData.attendance_status = 2;
                }
                
                // 숙제와 집중도가 결석(1)이었다면 정상(5)으로 변경
                if (studyLog.homework === 1) {
                  updateData.homework = 5;
                }
                if (studyLog.focus === 1) {
                  updateData.focus = 5;
                }
                
                // 변경사항이 있으면 업데이트
                if (Object.keys(updateData).length > 0) {
                  updateData.last_modified_by = employee?.id || null;
                  
                  const { error: updateError } = await supabase
                    .from("study_logs")
                    .update(updateData)
                    .eq("id", studyLog.id);
                  
                  if (!updateError) {
                    console.log(`study_logs 업데이트 완료: ${absenceDate} - 보강 완료 처리`);
                  } else {
                    console.error("study_logs 업데이트 실패:", updateError);
                  }
                }
              }
            } catch (error) {
              console.error("study_logs 동기화 중 오류:", error);
            }
          }

          // 캘린더 이벤트 자동 생성
          let absenceEventId = null;
          let makeupEventId = null;

          // 1. 결석 이벤트 생성 (결석 보강인 경우)
          if (makeupType === "absence" && newMakeup) {
            const absenceDateStr = formatDateToKST(date);
            try {
              const absenceEvent = await calendarService.createEvent({
                title: `${studentInfo.studentName} 결석`,
                start_time: `${absenceDateStr}T09:00:00`,
                end_time: `${absenceDateStr}T10:00:00`,
                event_type: "absence",
                description: absenceReason ? `결석 사유: ${absenceReason}` : undefined,
                location: studentInfo.className,
              });
              absenceEventId = absenceEvent.id;
            } catch (error) {
              console.error("결석 이벤트 생성 실패:", error);
            }
          }

          // 2. 보강 이벤트 생성 (보강일이 정해진 경우)
          if (makeupDate && newMakeup) {
            const makeupDateStr = formatDateToKST(makeupDate);
            const title = makeupType === "additional" 
              ? `${studentInfo.studentName} 추가수업`
              : `${studentInfo.studentName} 결석보강`;
            
            try {
              const makeupEvent = await calendarService.createEvent({
                title,
                start_time: `${makeupDateStr}T${startHour}:${startMinute}:00`,
                end_time: `${makeupDateStr}T${endHour}:${endMinute}:00`,
                event_type: "makeup",
                description: content || undefined,
                location: studentInfo.className,
              });
              makeupEventId = makeupEvent.id;
            } catch (error) {
              console.error("보강 이벤트 생성 실패:", error);
            }
          }

          // 3. 생성된 이벤트 ID를 보강 레코드에 업데이트
          if ((absenceEventId || makeupEventId) && newMakeup.id) {
            const updateData: any = {};
            if (absenceEventId) updateData.absence_calendar_event_id = absenceEventId;
            if (makeupEventId) updateData.makeup_calendar_event_id = makeupEventId;
            
            await supabase
              .from("makeup_classes")
              .update(updateData)
              .eq("id", newMakeup.id);
          }
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

          {/* 시간 - 보강일이 선택된 경우에만 표시 */}
          {makeupDate && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">시간</Label>
              <div className="col-span-3">
                <div className="grid grid-cols-2 gap-4">
                  {/* 시작 시간 */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-1">시작 시간</Label>
                    <div className="flex gap-2">
                      <Select value={startHour || "14"} onValueChange={setStartHour}>
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="시" />
                        </SelectTrigger>
                        <SelectContent>
                          {HOUR_OPTIONS.map(hour => (
                            <SelectItem key={hour} value={hour}>
                              {hour}시
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={startMinute || "00"} onValueChange={setStartMinute}>
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="분" />
                        </SelectTrigger>
                        <SelectContent>
                          {MINUTE_OPTIONS.map(minute => (
                            <SelectItem key={minute} value={minute}>
                              {minute}분
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* 종료 시간 */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-1">종료 시간</Label>
                    <div className="flex gap-2">
                      <Select value={endHour || "15"} onValueChange={setEndHour}>
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="시" />
                        </SelectTrigger>
                        <SelectContent>
                          {HOUR_OPTIONS.map(hour => (
                            <SelectItem key={hour} value={hour}>
                              {hour}시
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={endMinute || "00"} onValueChange={setEndMinute}>
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="분" />
                        </SelectTrigger>
                        <SelectContent>
                          {MINUTE_OPTIONS.map(minute => (
                            <SelectItem key={minute} value={minute}>
                              {minute}분
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">시작 시간을 선택하면 종료 시간이 자동으로 1시간 후로 설정됩니다</p>
              </div>
            </div>
          )}

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