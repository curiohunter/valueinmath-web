"use client";

import React, { useState, useEffect, useRef } from "react";
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
import { CalendarIcon, Plus, X, History, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { calendarService } from "@/services/calendar";
import { markAbsent } from "@/services/attendance-service";
import { findLinkedAbsence, deleteAttendance } from "@/services/makeup-service";
import { ABSENCE_REASON_LABELS, type AbsenceReason as AbsenceReasonType } from "@/types/attendance";

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

// ================================================================
// study_logs 연동 — 2026-03 제거 예정
// 제거 시: 이 두 함수와 호출부(syncAbsenceStudyLog, syncMakeupStudyLog)를 삭제하면 됨
// ================================================================
async function syncAbsenceStudyLog(params: {
  supabase: SupabaseClient<Database>
  studentId: string
  classId: string
  absenceDate: string
  absenceReason: string | null
  employeeId: string | null
  studentName: string
  className: string
}): Promise<void> {
  const { supabase, studentId, classId, absenceDate, absenceReason, employeeId, studentName, className } = params

  const { data: existingLog } = await supabase
    .from("study_logs")
    .select("id")
    .eq("student_id", studentId)
    .eq("class_id", classId)
    .eq("date", absenceDate)
    .maybeSingle()

  if (!existingLog) {
    const { error } = await supabase
      .from("study_logs")
      .insert({
        student_id: studentId,
        class_id: classId,
        date: absenceDate,
        attendance_status: 1,
        homework: 1,
        focus: 1,
        note: absenceReason ? `결석 사유: ${absenceReason}` : '결석',
        created_by: employeeId,
        student_name_snapshot: studentName,
        class_name_snapshot: className,
      })
    if (error) {
      console.error("결석 study_log 생성 실패:", error)
    }
  }
}

async function syncMakeupStudyLog(params: {
  supabase: SupabaseClient<Database>
  studentId: string
  classId: string
  makeupDate: string
  absenceDate: string
  employeeId: string | null
  studentName: string
  className: string
}): Promise<{ created: boolean; error: boolean }> {
  const { supabase, studentId, classId, makeupDate, absenceDate, employeeId, studentName, className } = params

  try {
    const { error: insertError } = await supabase
      .from("study_logs")
      .insert({
        student_id: studentId,
        class_id: classId,
        date: makeupDate,
        attendance_status: 2,
        homework: 5,
        focus: 5,
        note: `${absenceDate} 결석 보강`,
        created_by: employeeId,
        student_name_snapshot: studentName,
        class_name_snapshot: className,
      })

    if (!insertError) {
      return { created: true, error: false }
    } else if (insertError.code === '23505') {
      return { created: true, error: false }
    } else {
      console.error("보강 study_log 생성 실패:", insertError)
      return { created: false, error: true }
    }
  } catch (err) {
    console.error("study_logs 동기화 중 오류:", err)
    return { created: false, error: true }
  }
}
// ================================================================

export function MakeupModal({
  isOpen,
  onClose,
  studentInfo,
  editingMakeup,
}: MakeupModalProps) {
  const supabase = getSupabaseBrowserClient(); // 싱글톤 사용

  // 중복 실행 방지 플래그
  const isSavingRef = useRef(false);

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

  // 이전 기록 관련 상태
  const [previousRecords, setPreviousRecords] = useState<Array<{
    id: number;
    makeup_date: string | null;
    start_time: string | null;
    end_time: string | null;
    content: string | null;
  }>>([]);
  const [loadingPrevRecords, setLoadingPrevRecords] = useState(false);
  const [showAllRecords, setShowAllRecords] = useState(false);
  const MAX_VISIBLE_RECORDS = 4;

  // 기존 결석일 출석 기록 정리 다이얼로그
  const [oldAbsenceCleanup, setOldAbsenceCleanup] = useState<{
    attendanceId: string
    oldDate: string
  } | null>(null);

  // 이전 보강 기록 조회 (모달 열릴 때)
  useEffect(() => {
    const fetchPreviousRecords = async () => {
      if (!isOpen || !studentInfo.studentId) return;

      setLoadingPrevRecords(true);
      setShowAllRecords(false); // 상태 초기화
      try {
        const { data, error } = await supabase
          .from("makeup_classes")
          .select("id, makeup_date, start_time, end_time, content")
          .eq("student_id", studentInfo.studentId)
          .not("start_time", "is", null)
          .order("makeup_date", { ascending: false })
          .limit(10);

        if (error) {
          console.error("이전 보강 기록 조회 실패:", error);
        } else {
          // 중복 제거 (시간+내용 조합 기준)
          const uniqueRecords = data?.reduce((acc, record) => {
            const key = `${record.start_time}-${record.end_time}-${record.content || ''}`;
            if (!acc.some((r: typeof record) => `${r.start_time}-${r.end_time}-${r.content || ''}` === key)) {
              acc.push(record);
            }
            return acc;
          }, [] as typeof data) || [];

          setPreviousRecords(uniqueRecords);
        }
      } catch (error) {
        console.error("이전 보강 기록 조회 오류:", error);
      } finally {
        setLoadingPrevRecords(false);
      }
    };

    fetchPreviousRecords();
  }, [isOpen, studentInfo.studentId, supabase]);

  // 이전 기록 선택 핸들러
  const handleSelectPreviousRecord = (record: typeof previousRecords[0]) => {
    if (record.start_time) {
      const [hour, minute] = record.start_time.split(':');
      setStartHour(hour);
      setStartMinute(minute);
    }
    if (record.end_time) {
      const [hour, minute] = record.end_time.split(':');
      setEndHour(hour);
      setEndMinute(minute);
    }
    if (record.content) {
      setContent(record.content);
    }
    toast.success("이전 기록이 적용되었습니다.");
  };

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

        // 보강일이 있을 때 시간 설정 (유효한 시간이 있는 경우에만)
        // null이거나 "00:00:00"인 경우는 시간 미정으로 처리
        if (editingMakeup.start_time && editingMakeup.start_time !== "00:00:00") {
          const [hour, minute] = editingMakeup.start_time.split(':');
          setStartHour(hour || null);
          setStartMinute(minute || null);
        } else {
          setStartHour(null);
          setStartMinute(null);
        }

        if (editingMakeup.end_time && editingMakeup.end_time !== "00:00:00") {
          const [hour, minute] = editingMakeup.end_time.split(':');
          setEndHour(hour || null);
          setEndMinute(minute || null);
        } else {
          setEndHour(null);
          setEndMinute(null);
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
  
  // 보강일 선택 시 시간 초기화 (새로 추가하는 경우에만)
  useEffect(() => {
    // 편집 모드가 아닐 때만 자동 설정
    if (!editingMakeup) {
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
    }
  }, [makeupDate, editingMakeup, startHour, startMinute]);
  
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
    // 중복 실행 방지
    if (isSavingRef.current) {
      return;
    }
    isSavingRef.current = true;
    setLoading(true);

    // 유효성 검사 (실패 시 플래그 초기화)
    if (makeupType === "absence" && absenceDates.length === 0) {
      isSavingRef.current = false;  // 실패 시 초기화
      setLoading(false);
      toast.error("결석일을 선택해주세요.");
      return;
    }

    if (!makeupDate && status === "completed") {
      isSavingRef.current = false;  // 실패 시 초기화
      setLoading(false);
      toast.error("완료 상태는 보강일이 필요합니다.");
      return;
    }
    
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
            student_name_snapshot: studentInfo.studentName,
            class_name_snapshot: studentInfo.className,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingMakeup.id)
          .select()
          .single();

        if (error) throw error;

        // study_logs 연동 (2026-03 제거 예정)
        let studyLogCreated = false;
        let studyLogError = false;
        if (status === "completed" && makeupDate && makeupType === "absence" && absenceDates.length > 0) {
          const result = await syncMakeupStudyLog({
            supabase,
            studentId: studentInfo.studentId,
            classId: studentInfo.classId,
            makeupDate: formatDateToKST(makeupDate),
            absenceDate: formatDateToKST(absenceDates[0]),
            employeeId: employee?.id || null,
            studentName: studentInfo.studentName,
            className: studentInfo.className,
          });
          studyLogCreated = result.created;
          studyLogError = result.error;
        }

        // 출석부 연동: 결석일에 attendance 생성/갱신
        if (makeupType === "absence" && absenceDates.length > 0) {
          const newAbsenceDate = formatDateToKST(absenceDates[0]);
          const oldAbsenceDate = editingMakeup.absence_date;

          // 새 결석일에 attendance 생성
          try {
            await markAbsent(
              studentInfo.studentId,
              studentInfo.classId,
              newAbsenceDate,
              absenceReason
                ? `결석 사유: ${ABSENCE_REASON_LABELS[absenceReason as keyof typeof ABSENCE_REASON_LABELS] ?? absenceReason}`
                : undefined,
              (absenceReason as AbsenceReasonType) || undefined
            );
          } catch (err) {
            console.error("출석부 결석 기록 생성 실패:", err);
          }

          // 결석일이 변경된 경우, 기존 결석일 attendance 정리 다이얼로그
          if (oldAbsenceDate && oldAbsenceDate !== newAbsenceDate) {
            const oldAttendance = await findLinkedAbsence(studentInfo.studentId, oldAbsenceDate);
            if (oldAttendance) {
              setOldAbsenceCleanup({
                attendanceId: oldAttendance.id,
                oldDate: oldAbsenceDate,
              });
            }
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

        // 메시지 표시 (학습일지 생성 결과 포함)
        if (studyLogCreated) {
          toast.success(`보강이 수정되었습니다. ${formatDateToKST(makeupDate)} 학습일지에 보강 기록이 추가되었습니다.`);
        } else if (studyLogError) {
          toast.warning("보강이 수정되었습니다. (학습일지는 수동으로 추가해주세요)");
        } else {
          toast.success("보강이 수정되었습니다.");
        }
      } else {
        // 추가 모드 - 여러 날짜에 대해 각각 레코드 생성
        const datesToProcess = makeupType === "absence" ? absenceDates : [new Date()];
        
        // 학습일지 생성 성공 여부 추적
        let studyLogCreated = false;
        let studyLogError = false;
        
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
              student_name_snapshot: studentInfo.studentName,
              class_name_snapshot: studentInfo.className,
            })
            .select()
            .single();

          if (makeupError) throw makeupError;

          // 출석부 연동: 결석 보강 생성 시 attendances에 결석 기록 생성
          if (makeupType === "absence" && newMakeup) {
            const absenceDateStr = formatDateToKST(date);
            try {
              await markAbsent(
                studentInfo.studentId,
                studentInfo.classId,
                absenceDateStr,
                absenceReason
                  ? `결석 사유: ${ABSENCE_REASON_LABELS[absenceReason as keyof typeof ABSENCE_REASON_LABELS] ?? absenceReason}`
                  : undefined,
                (absenceReason as AbsenceReasonType) || undefined
              );
            } catch (err) {
              console.error("출석부 결석 기록 생성 실패:", err);
            }
          }

          // study_logs 연동 (2026-03 제거 예정)
          if (makeupType === "absence" && newMakeup) {
            await syncAbsenceStudyLog({
              supabase,
              studentId: studentInfo.studentId,
              classId: studentInfo.classId,
              absenceDate: formatDateToKST(date),
              absenceReason: absenceReason || null,
              employeeId: employee?.id || null,
              studentName: studentInfo.studentName,
              className: studentInfo.className,
            });
          }
          if (status === "completed" && makeupDate && makeupType === "absence" && newMakeup) {
            const result = await syncMakeupStudyLog({
              supabase,
              studentId: studentInfo.studentId,
              classId: studentInfo.classId,
              makeupDate: formatDateToKST(makeupDate),
              absenceDate: formatDateToKST(date),
              employeeId: employee?.id || null,
              studentName: studentInfo.studentName,
              className: studentInfo.className,
            });
            studyLogCreated = result.created;
            studyLogError = result.error;
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
                makeup_class_id: newMakeup.id,
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
                makeup_class_id: newMakeup.id,
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
        
        // 메시지 표시 (학습일지 생성 결과 포함)
        let successMessage = `보강 ${datesToProcess.length}건이 추가되었습니다.`;
        if (studyLogCreated) {
          successMessage += ` ${formatDateToKST(makeupDate)} 학습일지에 보강 기록이 추가되었습니다.`;
          toast.success(successMessage);
        } else if (studyLogError && status === "completed" && makeupDate) {
          toast.warning(`보강 ${datesToProcess.length}건이 추가되었습니다. (학습일지는 수동으로 추가해주세요)`);
        } else {
          toast.success(successMessage);
        }
      }

      onClose();
    } catch (error) {
      console.error("보강 저장 오류:", error);
      toast.error("보강 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      isSavingRef.current = false; // 플래그 초기화
    }
  };

  return (
    <>
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
                  <Popover modal={true} open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
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
                <Popover modal={true}>
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
                {/* 이전 기록 선택 */}
                {previousRecords.length > 0 && (
                  <div className="mb-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-between text-gray-600">
                          <div className="flex items-center gap-2">
                            <History className="h-4 w-4" />
                            <span>이전 기록에서 선택</span>
                          </div>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-80 max-h-72 overflow-y-auto" align="start" side="bottom">
                        <DropdownMenuLabel>이전 보강 기록 (시간+내용 적용)</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {(showAllRecords ? previousRecords : previousRecords.slice(0, MAX_VISIBLE_RECORDS)).map((record) => (
                          <DropdownMenuItem
                            key={record.id}
                            onClick={() => handleSelectPreviousRecord(record)}
                            className="flex flex-col items-start py-2 cursor-pointer"
                          >
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <span>
                                {record.start_time?.slice(0, 5)} ~ {record.end_time?.slice(0, 5)}
                              </span>
                              {record.makeup_date && (
                                <span className="text-xs text-gray-500">
                                  ({record.makeup_date.slice(5, 10)})
                                </span>
                              )}
                            </div>
                            {record.content && (
                              <span className="text-xs text-gray-500 truncate w-full mt-0.5">
                                {record.content.length > 40
                                  ? record.content.slice(0, 40) + "..."
                                  : record.content}
                              </span>
                            )}
                          </DropdownMenuItem>
                        ))}
                        {previousRecords.length > MAX_VISIBLE_RECORDS && !showAllRecords && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.preventDefault();
                                setShowAllRecords(true);
                              }}
                              className="justify-center text-blue-600 text-sm py-2"
                            >
                              +{previousRecords.length - MAX_VISIBLE_RECORDS}개 더보기
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {/* 시작 시간 */}
                  <div>
                    <Label className="text-xs text-gray-500 mb-1">시작 시간</Label>
                    <div className="flex gap-2">
                      <Select value={startHour || undefined} onValueChange={setStartHour}>
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
                      <Select value={startMinute || undefined} onValueChange={setStartMinute}>
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
                      <Select value={endHour || undefined} onValueChange={setEndHour}>
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
                      <Select value={endMinute || undefined} onValueChange={setEndMinute}>
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
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* 기존 결석일 출석 기록 정리 확인 다이얼로그 */}
    <Dialog open={!!oldAbsenceCleanup} onOpenChange={() => setOldAbsenceCleanup(null)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>기존 결석 기록 처리</DialogTitle>
          <DialogDescription>
            기존 결석일({oldAbsenceCleanup?.oldDate?.slice(5)})의 출석 기록을 삭제할까요?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setOldAbsenceCleanup(null)}
          >
            유지
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              if (oldAbsenceCleanup) {
                try {
                  await deleteAttendance(oldAbsenceCleanup.attendanceId);
                  toast.success("기존 결석 기록이 삭제되었습니다.");
                } catch (err) {
                  console.error("기존 결석 기록 삭제 실패:", err);
                  toast.error("기존 결석 기록 삭제에 실패했습니다.");
                }
              }
              setOldAbsenceCleanup(null);
            }}
          >
            삭제
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}