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
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { calendarService } from "@/services/calendar";
import { analyzeConsultation, isAnalyzableConsultationType } from "@/services/consultation-ai-service";
import { getMarketingActivities, type MarketingActivity } from "@/services/marketing-service";
import { CHANNEL_LABELS, type MarketingChannel } from "@/types/b2b-saas";
// B2B SaaS: 퍼널 이벤트는 DB 트리거에서 자동 기록됨 (trg_funnel_consultation)
import type {
  ConsultationType,
  ConsultationMethod,
  ConsultationStatus,
  Consultation,
  ConsultationModalProps,
  formatDateToKST,
  formatDateTimeToKST
} from "@/types/consultation";

// Map consultation type to calendar event type - 그냥 한글 그대로 사용
const getEventTypeFromConsultationType = (consultationType: string): string => {
  // EventModal.tsx의 eventCategories와 동일한 value 사용
  const typeMapping: { [key: string]: string } = {
    '신규상담': 'new_consultation',
    '입테유도': 'test_guidance',
    '입테후상담': 'after_test_consultation',
    '등록유도': 'enrollment_guidance',
    '정기상담': 'regular_consultation',
    '퇴원상담': 'withdrawal_consultation',
    '입학후상담': 'after_enrollment_consultation',
  };
  return typeMapping[consultationType] || 'consultation';
};

// Import date utility functions
const formatDateToKST = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateTimeToKST = (date: Date, hour: string, minute: string): string => {
  const dateStr = formatDateToKST(date);
  return `${dateStr}T${hour}:${minute}:00`;
};

export function ConsultationModal({
  isOpen,
  onClose,
  studentInfo,
  editingConsultation,
  onSuccess,
}: ConsultationModalProps) {
  const supabase = createClient();
  
  // State management
  const [consultationType, setConsultationType] = useState<ConsultationType>("신규상담");
  const [consultationMethod, setConsultationMethod] = useState<ConsultationMethod>("대면");
  const [consultationDate, setConsultationDate] = useState<Date | undefined>();
  const [startHour, setStartHour] = useState<string>("14");
  const [startMinute, setStartMinute] = useState<string>("00");
  const [endHour, setEndHour] = useState<string>("15");
  const [endMinute, setEndMinute] = useState<string>("00");
  const [counselorId, setCounselorId] = useState<string>("");
  const [content, setContent] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Auto-set end time when start time changes (only for new consultations)
  useEffect(() => {
    // Skip auto-setting if editing existing consultation or on initial load
    if (editingConsultation || isInitialLoad) {
      return;
    }
    
    // Calculate end time as 1 hour after start time
    const startH = parseInt(startHour);
    const startM = parseInt(startMinute);
    
    let endH = startH + 1;
    let endM = startM;
    
    // Handle hour overflow
    if (endH >= 24) {
      endH = endH - 24;
    }
    
    setEndHour(endH.toString().padStart(2, '0'));
    setEndMinute(endM.toString().padStart(2, '0'));
  }, [startHour, startMinute, editingConsultation, isInitialLoad]);
  const [status, setStatus] = useState<ConsultationStatus>("예정");
  const [nextAction, setNextAction] = useState("");
  const [nextDate, setNextDate] = useState<Date | undefined>();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);

  // Marketing Activity Selection (신규상담 only)
  const [marketingActivities, setMarketingActivities] = useState<MarketingActivity[]>([]);
  const [selectedMarketingActivityId, setSelectedMarketingActivityId] = useState<string>("");
  
  // Time options
  const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));
  
  // Load employees for counselor selection
  useEffect(() => {
    const loadEmployees = async () => {
      const { data } = await supabase
        .from("employees")
        .select("id, name, department")
        .eq("status", "재직")
        .order("name");
      if (data) setEmployees(data);
    };
    loadEmployees();
  }, []);

  // Load active marketing activities (for 신규상담)
  useEffect(() => {
    const loadMarketingActivities = async () => {
      try {
        // 진행 중인 마케팅 활동 로드 (in_progress)
        const activities = await getMarketingActivities(supabase, { status: 'in_progress' });
        setMarketingActivities(activities);
      } catch (error) {
        console.error("마케팅 활동 로딩 실패:", error);
      }
    };
    loadMarketingActivities();
  }, []);
  
  // Initialize form data when modal opens
  useEffect(() => {
    if (!isOpen) return; // Skip if modal is closed
    
    setIsInitialLoad(true);
    
    if (editingConsultation) {
      setConsultationType(editingConsultation.type);
      setConsultationMethod(editingConsultation.method);
      setCounselorId(editingConsultation.counselor_id);
      setContent(editingConsultation.content || "");
      setStatus(editingConsultation.status);
      setNextAction(editingConsultation.next_action || "");
      
      // Parse date and time
      if (editingConsultation.date) {
        const date = new Date(editingConsultation.date);
        setConsultationDate(date);
        setStartHour(date.getHours().toString().padStart(2, '0'));
        setStartMinute(date.getMinutes().toString().padStart(2, '0'));
        
        // Set end time to 1 hour later by default
        const endDate = new Date(date);
        endDate.setHours(endDate.getHours() + 1);
        setEndHour(endDate.getHours().toString().padStart(2, '0'));
        setEndMinute(endDate.getMinutes().toString().padStart(2, '0'));
      }
      
      if (editingConsultation.next_date) {
        setNextDate(new Date(editingConsultation.next_date));
      }
    } else {
      // Reset form for new consultation
      setConsultationType("신규상담");
      setConsultationMethod("대면");
      setConsultationDate(new Date()); // Set today's date by default
      setStartHour("14");
      setStartMinute("00");
      setEndHour("15");
      setEndMinute("00");
      setCounselorId("");
      setContent("");
      setStatus("예정");
      setNextAction("");
      setNextDate(undefined);
      setSelectedMarketingActivityId(""); // Reset marketing activity selection
    }
    
    // Set initial load flag after form initialization
    setTimeout(() => setIsInitialLoad(false), 100);
  }, [isOpen, editingConsultation]); // Add isOpen to dependencies
  
  const handleSubmit = async () => {
    if (!consultationDate || !counselorId) {
      toast.error("필수 항목을 입력해주세요.");
      return;
    }
    
    if (!studentInfo && !editingConsultation) {
      toast.error("학생 정보가 없습니다.");
      return;
    }
    
    setLoading(true);
    
    try {
      // Get current user info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("로그인이 필요합니다.");
        return;
      }
      
      // Get counselor name for snapshot
      const counselor = employees.find(e => e.id === counselorId);
      const counselorName = counselor?.name || "";
      
      const consultationDateTime = formatDateTimeToKST(consultationDate, startHour, startMinute);
      const nextDateTime = nextDate ? formatDateTimeToKST(nextDate, "14", "00") : null;
      
      if (editingConsultation) {
        // Update mode
        const { data: updatedConsultation, error } = await supabase
          .from("consultations")
          .update({
            type: consultationType,
            method: consultationMethod,
            date: consultationDateTime,
            counselor_id: counselorId,
            content: content || null,
            status,
            next_action: nextAction || null,
            next_date: nextDateTime,
            counselor_name_snapshot: counselorName,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingConsultation.id)
          .select()
          .single();
          
        if (error) throw error;
        
        // Update calendar events
        let calendarEventId = editingConsultation.calendar_event_id;
        let nextCalendarEventId = editingConsultation.next_calendar_event_id;
        
        // Handle main consultation calendar event
        const consultationDateStr = formatDateToKST(consultationDate);
        const eventData = {
          title: `${editingConsultation.student_name_snapshot || studentInfo?.studentName} ${consultationType}`,
          start_time: `${consultationDateStr}T${startHour}:${startMinute}:00`,
          end_time: `${consultationDateStr}T${endHour}:${endMinute}:00`,
          event_type: getEventTypeFromConsultationType(consultationType) as any,
          description: `담당: ${counselorName}\n방법: ${consultationMethod}\n${content || ''}`,
          location: consultationMethod === "대면" ? "상담실" : consultationMethod,
        };
        
        if (calendarEventId) {
          // Update existing event
          try {
            await calendarService.updateEvent(calendarEventId, eventData);
          } catch (error) {
            console.error("상담 캘린더 이벤트 업데이트 실패:", error);
          }
        } else {
          // Create new event
          try {
            const newEvent = await calendarService.createEvent(eventData);
            calendarEventId = newEvent.id;
          } catch (error) {
            console.error("상담 캘린더 이벤트 생성 실패:", error);
          }
        }
        
        // Handle next consultation calendar event
        if (nextDate) {
          const nextDateStr = formatDateToKST(nextDate);
          const nextEventData = {
            title: `${editingConsultation.student_name_snapshot || studentInfo?.studentName} 후속 상담`,
            start_time: `${nextDateStr}T14:00:00`,
            end_time: `${nextDateStr}T15:00:00`,
            event_type: getEventTypeFromConsultationType(consultationType) as any,
            description: `이전 상담 후속 조치: ${nextAction || ''}`,
            location: "미정",
          };
          
          if (nextCalendarEventId) {
            try {
              await calendarService.updateEvent(nextCalendarEventId, nextEventData);
            } catch (error) {
              console.error("후속 상담 캘린더 이벤트 업데이트 실패:", error);
            }
          } else {
            try {
              const newEvent = await calendarService.createEvent(nextEventData);
              nextCalendarEventId = newEvent.id;
            } catch (error) {
              console.error("후속 상담 캘린더 이벤트 생성 실패:", error);
            }
          }
        } else if (nextCalendarEventId) {
          // Remove next consultation event if no next date
          try {
            await calendarService.deleteEvent(nextCalendarEventId);
            nextCalendarEventId = null;
          } catch (error) {
            console.error("후속 상담 캘린더 이벤트 삭제 실패:", error);
          }
        }
        
        // Update calendar event IDs if changed
        if (calendarEventId !== editingConsultation.calendar_event_id ||
            nextCalendarEventId !== editingConsultation.next_calendar_event_id) {
          await supabase
            .from("consultations")
            .update({
              calendar_event_id: calendarEventId,
              next_calendar_event_id: nextCalendarEventId,
            })
            .eq("id", editingConsultation.id);
        }

        // B2B SaaS: 퍼널 이벤트는 DB 트리거(trg_funnel_consultation)에서 자동 기록됨

        // AI 태깅 분석 (비동기 - fire and forget) - 퍼널 상담만
        if (content && content.trim().length >= 10 && isAnalyzableConsultationType(consultationType)) {
          analyzeConsultation(
            editingConsultation.id,
            content,
            consultationType,
            studentInfo?.studentName
          ).catch(console.error)
        }

        toast.success("상담이 수정되었습니다.");
      } else {
        // Create mode
        const insertData: any = {
          student_id: studentInfo!.studentId,
          type: consultationType,
          method: consultationMethod,
          date: consultationDateTime,
          counselor_id: counselorId,
          content: content || null,
          status,
          next_action: nextAction || null,
          next_date: nextDateTime,
          student_name_snapshot: studentInfo!.studentName,
          counselor_name_snapshot: counselorName,
        };

        // 신규상담일 때 마케팅 활동 연결
        if (consultationType === "신규상담" && selectedMarketingActivityId) {
          insertData.marketing_activity_id = selectedMarketingActivityId;
        }

        const { data: newConsultation, error } = await supabase
          .from("consultations")
          .insert(insertData)
          .select()
          .single();
          
        if (error) throw error;
        
        // Create calendar events
        let calendarEventId = null;
        let nextCalendarEventId = null;
        
        // Create main consultation calendar event
        if (newConsultation) {
          const consultationDateStr = formatDateToKST(consultationDate);
          try {
            const calendarEvent = await calendarService.createEvent({
              title: `${studentInfo!.studentName} ${consultationType}`,
              start_time: `${consultationDateStr}T${startHour}:${startMinute}:00`,
              end_time: `${consultationDateStr}T${endHour}:${endMinute}:00`,
              event_type: getEventTypeFromConsultationType(consultationType) as any,
              description: `담당: ${counselorName}\n방법: ${consultationMethod}\n${content || ''}`,
              location: consultationMethod === "대면" ? "상담실" : consultationMethod,
            });
            calendarEventId = calendarEvent.id;
          } catch (error) {
            console.error("상담 캘린더 이벤트 생성 실패:", error);
          }
        }
        
        // Create next consultation calendar event if needed
        if (nextDate && newConsultation) {
          const nextDateStr = formatDateToKST(nextDate);
          try {
            const nextCalendarEvent = await calendarService.createEvent({
              title: `${studentInfo!.studentName} 후속 상담`,
              start_time: `${nextDateStr}T14:00:00`,
              end_time: `${nextDateStr}T15:00:00`,
              event_type: getEventTypeFromConsultationType(consultationType) as any,
              description: `이전 상담 후속 조치: ${nextAction || ''}`,
              location: "미정",
            });
            nextCalendarEventId = nextCalendarEvent.id;
          } catch (error) {
            console.error("후속 상담 캘린더 이벤트 생성 실패:", error);
          }
        }
        
        // Update consultation record with calendar event IDs
        if ((calendarEventId || nextCalendarEventId) && newConsultation.id) {
          const updateData: any = {};
          if (calendarEventId) updateData.calendar_event_id = calendarEventId;
          if (nextCalendarEventId) updateData.next_calendar_event_id = nextCalendarEventId;

          await supabase
            .from("consultations")
            .update(updateData)
            .eq("id", newConsultation.id);
        }

        // B2B SaaS: 퍼널 이벤트는 DB 트리거(trg_funnel_consultation)에서 자동 기록됨

        // AI 태깅 분석 (비동기 - fire and forget) - 퍼널 상담만
        if (newConsultation && content && content.trim().length >= 10 && isAnalyzableConsultationType(consultationType)) {
          analyzeConsultation(
            newConsultation.id,
            content,
            consultationType,
            studentInfo?.studentName
          ).catch(console.error)
        }

        toast.success("상담이 등록되었습니다.");
      }
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Error:", error);
      toast.error("상담 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingConsultation ? "상담 수정" : "상담 등록"}
          </DialogTitle>
          <DialogDescription>
            {studentInfo && `${studentInfo.studentName} 학생의 상담 정보를 입력하세요.`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Row 1: Type and Method */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">상담 유형</Label>
              <Select value={consultationType} onValueChange={(v) => setConsultationType(v as ConsultationType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="신규상담">신규상담 (첫 상담)</SelectItem>
                  <SelectItem value="입테유도">입테유도 (테스트 전)</SelectItem>
                  <SelectItem value="입테후상담">입테후상담 (테스트 직후)</SelectItem>
                  <SelectItem value="등록유도">등록유도 (테스트 후)</SelectItem>
                  <SelectItem value="정기상담">정기상담 (재원생)</SelectItem>
                  <SelectItem value="퇴원상담">퇴원상담</SelectItem>
                  <SelectItem value="입학후상담">입학후상담 (기타)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">상담 방법</Label>
              <Select value={consultationMethod} onValueChange={(v) => setConsultationMethod(v as ConsultationMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="대면">대면</SelectItem>
                  <SelectItem value="전화">전화</SelectItem>
                  <SelectItem value="문자">문자</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 1.5: Marketing Activity Selection (신규상담 only) */}
          {consultationType === "신규상담" && !editingConsultation && marketingActivities.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="marketingActivity">
                유입 경로 (마케팅 활동)
                <span className="text-muted-foreground text-xs ml-2">선택사항</span>
              </Label>
              <Select
                value={selectedMarketingActivityId}
                onValueChange={setSelectedMarketingActivityId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="마케팅 활동을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">선택 안함</SelectItem>
                  {marketingActivities.map(activity => (
                    <SelectItem key={activity.id} value={activity.id}>
                      [{CHANNEL_LABELS[activity.channel as MarketingChannel] || activity.channel}] {activity.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                어떤 마케팅 활동을 통해 유입되었는지 선택하면 전환율 분석에 도움됩니다.
              </p>
            </div>
          )}
          
          {/* Row 2: Date and Time - Improved Layout */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>상담 날짜</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !consultationDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {consultationDate ? format(consultationDate, "yyyy-MM-dd") : "날짜 선택"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={consultationDate}
                    onSelect={setConsultationDate}
                    locale={ko}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>시작 시간</Label>
                <div className="flex gap-2">
                  <Select value={startHour} onValueChange={setStartHour}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOUR_OPTIONS.map(hour => (
                        <SelectItem key={hour} value={hour}>{hour}시</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={startMinute} onValueChange={setStartMinute}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MINUTE_OPTIONS.map(minute => (
                        <SelectItem key={minute} value={minute}>{minute}분</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>종료 시간</Label>
                <div className="flex gap-2">
                  <Select value={endHour} onValueChange={setEndHour}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOUR_OPTIONS.map(hour => (
                        <SelectItem key={hour} value={hour}>{hour}시</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={endMinute} onValueChange={setEndMinute}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MINUTE_OPTIONS.map(minute => (
                        <SelectItem key={minute} value={minute}>{minute}분</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          
          {/* Row 3: Counselor and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="counselor">담당자</Label>
              <Select value={counselorId} onValueChange={setCounselorId}>
                <SelectTrigger>
                  <SelectValue placeholder="담당자 선택" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} {emp.department && `(${emp.department})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">상태</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ConsultationStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="예정">예정</SelectItem>
                  <SelectItem value="완료">완료</SelectItem>
                  <SelectItem value="취소">취소</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Row 4: Content */}
          <div className="space-y-2">
            <Label htmlFor="content">상담 내용</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="상담 내용을 입력하세요..."
              className="min-h-[100px]"
            />
          </div>
          
          {/* Row 5: Next Action */}
          <div className="space-y-2">
            <Label htmlFor="nextAction">후속 조치</Label>
            <Input
              id="nextAction"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="다음 조치 사항을 입력하세요..."
            />
          </div>
          
          {/* Row 6: Next Date */}
          <div className="space-y-2">
            <Label>다음 상담 예정일</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !nextDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {nextDate ? format(nextDate, "yyyy-MM-dd") : "날짜 선택 (선택사항)"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={nextDate}
                  onSelect={setNextDate}
                  locale={ko}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "처리중..." : editingConsultation ? "수정" : "등록"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}