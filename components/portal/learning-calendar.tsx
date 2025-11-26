"use client"

import { useState } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  StudyLogItem,
  TestLogItem,
  MakeupClassItem,
  ConsultationItem,
  MathflatRecordItem,
} from "@/types/portal"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface LearningCalendarProps {
  study_logs: StudyLogItem[]
  test_logs: TestLogItem[]
  makeup_classes: MakeupClassItem[]
  consultations: ConsultationItem[]
  mathflat_records: MathflatRecordItem[]
}

interface EventDetailProps {
  type: "study" | "test" | "makeup" | "consultation" | "mathflat"
  data: StudyLogItem | TestLogItem | MakeupClassItem | ConsultationItem | MathflatRecordItem
}

const attendanceLabels: Record<number, string> = {
  5: "출석",
  4: "지각",
  3: "조퇴",
  2: "보강",
  1: "결석",
}

export function LearningCalendar({
  study_logs,
  test_logs,
  makeup_classes,
  consultations,
  mathflat_records,
}: LearningCalendarProps) {
  const [selectedEvent, setSelectedEvent] = useState<EventDetailProps | null>(null)

  // Convert data to FullCalendar events (calendar service 색상 참조)
  // 순서: 학습일지(1) > 테스트(2) > 매쓰플랫(3) > 보강(4) > 상담(5)
  const events = [
    // Study logs
    ...study_logs.map((log) => ({
      id: `study-${log.id}`,
      title: `📚 ${log.book1 || log.class_name || "학습일지"}${log.attendance_status ? `(${attendanceLabels[log.attendance_status]})` : ""}`,
      date: log.date,
      backgroundColor: "#10b981", // emerald-500
      borderColor: "#10b981",
      order: 1,
      extendedProps: {
        type: "study",
        data: log,
      },
    })),
    // Test logs
    ...test_logs.map((log) => ({
      id: `test-${log.id}`,
      title: `📝 ${log.test || "테스트"}${log.test_score !== null ? ` (${log.test_score}점)` : ""}`,
      date: log.date,
      backgroundColor: "#3b82f6", // blue-500
      borderColor: "#3b82f6",
      order: 2,
      extendedProps: {
        type: "test",
        data: log,
      },
    })),
    // Mathflat records
    ...mathflat_records.map((record) => ({
      id: `mathflat-${record.id}`,
      title: `📊 ${record.book_title || "매쓰플랫"} (${record.problem_solved || 0}문제, ${record.correct_rate?.toFixed(0) || 0}%)`,
      date: record.event_date || "",
      backgroundColor: "#f59e0b", // amber-500 (결석 색)
      borderColor: "#f59e0b",
      order: 3,
      extendedProps: {
        type: "mathflat",
        data: record,
      },
    })),
    // Makeup classes
    ...makeup_classes.map((cls) => ({
      id: `makeup-${cls.id}`,
      title: `🔄 ${cls.makeup_type === "absence" ? "결석보강" : "추가보강"}(${cls.class_name || "보강"})`,
      date: cls.makeup_date || cls.absence_date || "",
      backgroundColor: "#8b5cf6", // violet-500
      borderColor: "#8b5cf6",
      order: 4,
      extendedProps: {
        type: "makeup",
        data: cls,
      },
    })),
    // Consultations
    ...consultations.map((consult) => ({
      id: `consultation-${consult.id}`,
      title: `💬 상담`,
      date: consult.date,
      backgroundColor: "#ec4899", // pink-500
      borderColor: "#ec4899",
      order: 5,
      extendedProps: {
        type: "consultation",
        data: consult,
      },
    })),
  ]

  const handleEventClick = (info: any) => {
    setSelectedEvent({
      type: info.event.extendedProps.type,
      data: info.event.extendedProps.data,
    })
  }

  const renderEventDetail = () => {
    if (!selectedEvent) return null

    const { type, data } = selectedEvent

    if (type === "study") {
      const log = data as StudyLogItem
      return (
        <div className="space-y-3">
          <div>
            <span className="text-sm text-muted-foreground">반:</span>
            <p className="font-semibold">{log.class_name || "-"}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">출석:</span>
            <p className="font-semibold">
              {log.attendance_status ? attendanceLabels[log.attendance_status] : "-"}
            </p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">숙제:</span>
            <p className="font-semibold">{log.homework ? `${log.homework}점` : "-"}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">집중도:</span>
            <p className="font-semibold">{log.focus ? `${log.focus}점` : "-"}</p>
          </div>
          {log.note && (
            <div>
              <span className="text-sm text-muted-foreground">비고:</span>
              <p className="text-sm mt-1">{log.note}</p>
            </div>
          )}
        </div>
      )
    }

    if (type === "test") {
      const log = data as TestLogItem
      return (
        <div className="space-y-3">
          <div>
            <span className="text-sm text-muted-foreground">반:</span>
            <p className="font-semibold">{log.class_name || "-"}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">유형:</span>
            <p className="font-semibold">{log.test_type || "-"}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">점수:</span>
            <p className="font-semibold text-blue-600">
              {log.test_score !== null ? `${log.test_score}점` : "-"}
            </p>
          </div>
          {log.note && (
            <div>
              <span className="text-sm text-muted-foreground">비고:</span>
              <p className="text-sm mt-1">{log.note}</p>
            </div>
          )}
        </div>
      )
    }

    if (type === "makeup") {
      const cls = data as MakeupClassItem
      return (
        <div className="space-y-3">
          <div>
            <span className="text-sm text-muted-foreground">반:</span>
            <p className="font-semibold">{cls.class_name || "-"}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">유형:</span>
            <p className="font-semibold">{cls.makeup_type === "absence" ? "결석보강" : "추가보강"}</p>
          </div>
          {cls.makeup_type === "absence" && (
            <>
              <div>
                <span className="text-sm text-muted-foreground">결석일:</span>
                <p>{cls.absence_date || "-"}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">사유:</span>
                <p>{
                  cls.absence_reason === 'sick' ? '병결' :
                  cls.absence_reason === 'travel' ? '여행' :
                  cls.absence_reason === 'event' ? '행사' :
                  cls.absence_reason === 'other' ? '기타' :
                  cls.absence_reason || "-"
                }</p>
              </div>
            </>
          )}
          <div>
            <span className="text-sm text-muted-foreground">상태:</span>
            <p className="font-semibold">{cls.status}</p>
          </div>
          {cls.content && (
            <div>
              <span className="text-sm text-muted-foreground">내용:</span>
              <p className="text-sm mt-1">{cls.content}</p>
            </div>
          )}
        </div>
      )
    }

    if (type === "consultation") {
      const consult = data as ConsultationItem
      return (
        <div className="space-y-3">
          <div>
            <span className="text-sm text-muted-foreground">유형:</span>
            <p className="font-semibold">{consult.type}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">방법:</span>
            <p>{consult.method}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">상담자:</span>
            <p>{consult.counselor_name || "-"}</p>
          </div>
          {consult.content && (
            <div>
              <span className="text-sm text-muted-foreground">내용:</span>
              <p className="text-sm mt-1 whitespace-pre-wrap">{consult.content}</p>
            </div>
          )}
        </div>
      )
    }

    if (type === "mathflat") {
      const record = data as MathflatRecordItem
      return (
        <div className="space-y-3">
          <div>
            <span className="text-sm text-muted-foreground">유형:</span>
            <p className="font-semibold">{record.mathflat_type || "-"}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">교재명:</span>
            <p>{record.book_title || "-"}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">푼 문제수:</span>
            <p className="font-semibold text-pink-600">
              {record.problem_solved !== null ? `${record.problem_solved}문제` : "-"}
            </p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">정답률:</span>
            <p className="font-semibold text-pink-600">
              {record.correct_rate !== null ? `${record.correct_rate.toFixed(1)}%` : "-"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t">
            <div>
              <span className="text-xs text-muted-foreground">정답:</span>
              <p className="text-sm font-semibold text-blue-600">{record.correct_count || 0}개</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">오답:</span>
              <p className="text-sm font-semibold text-red-600">{record.wrong_count || 0}개</p>
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">학습 캘린더</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Color Legend */}
          <div className="flex flex-wrap gap-4 mb-4 pb-4 border-b">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#10b981]"></div>
              <span className="text-sm text-gray-700">학습일지</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#3b82f6]"></div>
              <span className="text-sm text-gray-700">테스트</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#f59e0b]"></div>
              <span className="text-sm text-gray-700">매쓰플랫</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#8b5cf6]"></div>
              <span className="text-sm text-gray-700">보강수업</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#ec4899]"></div>
              <span className="text-sm text-gray-700">상담</span>
            </div>
          </div>

          <div className="portal-calendar">
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              events={events}
              eventClick={handleEventClick}
              eventOrder="order"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "",
              }}
              height="auto"
              locale="ko"
              buttonText={{
                today: "오늘",
              }}
              eventDisplay="block"
              eventTimeFormat={{
                hour: "2-digit",
                minute: "2-digit",
                meridiem: false,
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedEvent?.type === "study" && "학습일지"}
              {selectedEvent?.type === "test" && "테스트"}
              {selectedEvent?.type === "makeup" && "보강수업"}
              {selectedEvent?.type === "consultation" && "상담"}
              {selectedEvent?.type === "mathflat" && "매쓰플랫"}
            </DialogTitle>
          </DialogHeader>
          {renderEventDetail()}
        </DialogContent>
      </Dialog>

      {/* Minimal Calendar Styling */}
      <style jsx global>{`
        .portal-calendar .fc {
          font-family: inherit;
        }
        .portal-calendar .fc-toolbar-title {
          font-size: 1.25rem;
          font-weight: 600;
        }
        .portal-calendar .fc-button {
          background-color: hsl(var(--background)) !important;
          border: 1px solid hsl(var(--border)) !important;
          color: hsl(var(--foreground)) !important;
          font-size: 0.875rem !important;
          padding: 0.375rem 0.75rem !important;
          border-radius: 0.375rem !important;
        }
        .portal-calendar .fc-button:hover {
          background-color: hsl(var(--muted)) !important;
        }
        .portal-calendar .fc-button-active {
          background-color: hsl(var(--primary)) !important;
          color: hsl(var(--primary-foreground)) !important;
        }
        .portal-calendar .fc-event {
          cursor: pointer;
          font-size: 0.75rem;
          padding: 2px 4px;
        }
        .portal-calendar .fc-daygrid-day-number {
          padding: 4px;
          font-size: 0.875rem;
        }
      `}</style>
    </>
  )
}
