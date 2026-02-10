"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  RotateCcw,
  Save,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Pencil,
  Undo2,
} from "lucide-react"
import { SessionCalendarGrid } from "./session-calendar-grid"
import { SessionSummary } from "./session-summary"
import type { ClassSessionSegment } from "@/types/tuition-session"

export interface SegmentStartConfig {
  classId: string
  className: string
  color: string
  startDate: string
  previousEndDate: string | null
  isManualStartDate: boolean
  endDate: string
  isManualEndDate: boolean
}

interface SessionPlannerMainProps {
  // 수강료 기준
  billingYear: number
  billingMonth: number
  onBillingChange: (year: number, month: number) => void
  // 세그먼트별 시작일/종료일
  segmentStartConfigs: SegmentStartConfig[]
  onSegmentStartDateChange: (classId: string, date: string) => void
  onToggleSegmentManualStartDate: (classId: string) => void
  onSegmentEndDateChange: (classId: string, date: string) => void
  onToggleSegmentManualEndDate: (classId: string) => void
  // 캘린더 뷰
  calendarYear: number
  calendarMonth: number
  onCalendarNavigate: (delta: number) => void
  // 세션 데이터
  segments: ClassSessionSegment[]
  excludedDates: Set<string>
  addedDates: Map<string, string>
  totalRecordCount: number
  isSaving: boolean
  onToggleDate: (date: string) => void
  onReset: () => void
  onSave: () => void
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i)

export function SessionPlannerMain({
  billingYear,
  billingMonth,
  onBillingChange,
  segmentStartConfigs,
  onSegmentStartDateChange,
  onToggleSegmentManualStartDate,
  onSegmentEndDateChange,
  onToggleSegmentManualEndDate,
  calendarYear,
  calendarMonth,
  onCalendarNavigate,
  segments,
  excludedDates,
  addedDates,
  totalRecordCount,
  isSaving,
  onToggleDate,
  onReset,
  onSave,
}: SessionPlannerMainProps) {
  const hasSegments = segments.length > 0
  const canSave = hasSegments && totalRecordCount > 0

  return (
    <div className="flex-1 flex flex-col gap-3 min-w-0">
      {/* 수강료 설정 영역 */}
      <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
        {/* 수강료 기준 월 */}
        <div className="flex items-center gap-2 flex-wrap">
          <CalendarDays className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-500">수강료:</span>
          <Select
            value={String(billingYear)}
            onValueChange={(v) => onBillingChange(Number(v), billingMonth)}
          >
            <SelectTrigger className="w-[90px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(billingMonth)}
            onValueChange={(v) => onBillingChange(billingYear, Number(v))}
          >
            <SelectTrigger className="w-[70px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {m}월
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 세그먼트별 시작일/종료일 */}
        {segmentStartConfigs.map((config) => (
          <div key={config.classId} className="space-y-1">
            {/* 시작일 */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: config.color }}
              />
              <span className="text-xs font-medium text-slate-600 max-w-[80px] truncate">
                {config.className}
              </span>
              <span className="text-xs text-slate-500">시작:</span>
              {config.isManualStartDate ? (
                <>
                  <Input
                    type="date"
                    value={config.startDate}
                    onChange={(e) =>
                      onSegmentStartDateChange(config.classId, e.target.value)
                    }
                    className="w-[140px] h-7 text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-blue-600"
                    onClick={() =>
                      onToggleSegmentManualStartDate(config.classId)
                    }
                  >
                    <Undo2 className="w-3 h-3 mr-1" />
                    자동
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-xs font-medium text-slate-700">
                    {config.startDate}
                  </span>
                  {config.previousEndDate ? (
                    <span className="text-[10px] text-slate-400">
                      (이전 만료일 {config.previousEndDate})
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">
                      (월초 기본값)
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-slate-500"
                    onClick={() =>
                      onToggleSegmentManualStartDate(config.classId)
                    }
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    변경
                  </Button>
                </>
              )}
            </div>

            {/* 종료일 */}
            <div className="flex items-center gap-2 flex-wrap pl-[18px]">
              <span className="text-xs text-slate-500">종료:</span>
              {config.isManualEndDate ? (
                <>
                  <Input
                    type="date"
                    value={config.endDate}
                    onChange={(e) =>
                      onSegmentEndDateChange(config.classId, e.target.value)
                    }
                    className="w-[140px] h-7 text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-blue-600"
                    onClick={() =>
                      onToggleSegmentManualEndDate(config.classId)
                    }
                  >
                    <Undo2 className="w-3 h-3 mr-1" />
                    자동
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-xs font-medium text-slate-700">
                    {config.endDate}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ({config.isManualEndDate ? "수동" : "회차 기반 자동"})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-slate-500"
                    onClick={() =>
                      onToggleSegmentManualEndDate(config.classId)
                    }
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    변경
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 캘린더 */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        {/* 캘린더 월 네비게이션 */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onCalendarNavigate(-1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold text-slate-700 min-w-[100px] text-center">
            {calendarYear}년 {calendarMonth}월
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onCalendarNavigate(1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {hasSegments ? (
          <SessionCalendarGrid
            year={calendarYear}
            month={calendarMonth}
            segments={segments}
            excludedDates={excludedDates}
            addedDates={addedDates}
            onToggleDate={onToggleDate}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <AlertCircle className="w-8 h-8 mb-2" />
            <p className="text-sm">사이드바에서 학생을 선택하면</p>
            <p className="text-sm">캘린더에 수업 세션이 표시됩니다</p>
          </div>
        )}
      </div>

      {/* 요약 + 액션바 */}
      {hasSegments && (
        <>
          <SessionSummary
            segments={segments}
            excludedDates={excludedDates}
            addedDates={addedDates}
            selectedStudentCount={totalRecordCount}
          />

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              disabled={isSaving}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              초기화
            </Button>
            <Button
              size="sm"
              onClick={onSave}
              disabled={!canSave || isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1" />
              )}
              선택한 {totalRecordCount}건 저장
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
