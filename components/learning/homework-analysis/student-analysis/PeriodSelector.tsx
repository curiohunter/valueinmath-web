"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { PeriodSelection, PeriodPreset, PERIOD_PRESETS } from "../types";
import { ko } from "date-fns/locale";

interface PeriodSelectorProps {
  period: PeriodSelection;
  onPeriodChange: (period: PeriodSelection) => void;
}

// 시각적 타임라인 바
function TimelineBar({ startDate, endDate }: { startDate: string; endDate: string }) {
  const daysDiff = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }, [startDate, endDate]);

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <div className="mt-3 px-1">
      <div className="relative">
        {/* 타임라인 바 */}
        <div className="h-2 bg-gradient-to-r from-indigo-200 via-indigo-400 to-indigo-600 rounded-full" />

        {/* 마커들 */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between">
          <div className="w-3 h-3 rounded-full bg-indigo-300 border-2 border-white shadow" />
          <div className="w-3 h-3 rounded-full bg-indigo-600 border-2 border-white shadow" />
        </div>
      </div>

      {/* 날짜 레이블 */}
      <div className="flex justify-between mt-1.5 text-xs">
        <span className="text-slate-500">{formatShortDate(startDate)}</span>
        <span className="text-slate-400">{daysDiff}일</span>
        <span className="text-indigo-600 font-medium">{formatShortDate(endDate)}</span>
      </div>
    </div>
  );
}

export default function PeriodSelector({
  period,
  onPeriodChange,
}: PeriodSelectorProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  // 현재 기간의 날짜 범위 계산
  const dateRange = useMemo(() => {
    const today = new Date();
    const endDate = today.toISOString().split("T")[0];

    if (period.type === "custom" && period.customStart && period.customEnd) {
      return {
        startDate: period.customStart,
        endDate: period.customEnd,
      };
    }

    if (period.preset === "all") {
      const startDate = new Date(today);
      startDate.setFullYear(startDate.getFullYear() - 1);
      return {
        startDate: startDate.toISOString().split("T")[0],
        endDate,
      };
    }

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - period.preset);
    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate,
    };
  }, [period]);

  // 프리셋 선택
  const handlePresetSelect = useCallback(
    (preset: PeriodPreset) => {
      onPeriodChange({
        type: "preset",
        preset,
        customStart: null,
        customEnd: null,
      });
    },
    [onPeriodChange]
  );

  // 커스텀 날짜 변경
  const handleCustomDateChange = useCallback(
    (type: "start" | "end", dateStr: string) => {
      const newPeriod: PeriodSelection = {
        type: "custom",
        preset: period.preset,
        customStart:
          type === "start" ? dateStr : period.customStart || dateRange.startDate,
        customEnd:
          type === "end" ? dateStr : period.customEnd || dateRange.endDate,
      };
      onPeriodChange(newPeriod);
    },
    [period, dateRange, onPeriodChange]
  );

  // 날짜를 Date 객체로 변환
  const parseDate = (dateStr: string | null) => {
    if (!dateStr) return undefined;
    return new Date(dateStr);
  };

  return (
    <div className="space-y-3">
      {/* 프리셋 버튼들 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-slate-500 mr-2">기간</span>

        {PERIOD_PRESETS.map(({ value, label }) => {
          const isSelected =
            period.type === "preset" && period.preset === value;

          return (
            <button
              key={String(value)}
              onClick={() => handlePresetSelect(value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                "focus:outline-none focus:ring-2 focus:ring-offset-1",
                isSelected
                  ? "bg-slate-800 text-white shadow focus:ring-slate-400"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 focus:ring-slate-300"
              )}
            >
              {label}
            </button>
          );
        })}

        {/* 수동 지정 버튼 */}
        <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                "focus:outline-none focus:ring-2 focus:ring-offset-1",
                period.type === "custom"
                  ? "bg-indigo-600 text-white shadow focus:ring-indigo-400"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 focus:ring-slate-300"
              )}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>수동 지정</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-4 space-y-4">
              <div className="flex gap-4">
                {/* 시작일 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    시작일
                  </label>
                  <Calendar
                    mode="single"
                    selected={parseDate(
                      period.customStart || dateRange.startDate
                    )}
                    onSelect={(date) => {
                      if (date) {
                        handleCustomDateChange(
                          "start",
                          date.toISOString().split("T")[0]
                        );
                      }
                    }}
                    locale={ko}
                    disabled={(date) => date > new Date()}
                  />
                </div>

                {/* 종료일 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    종료일
                  </label>
                  <Calendar
                    mode="single"
                    selected={parseDate(period.customEnd || dateRange.endDate)}
                    onSelect={(date) => {
                      if (date) {
                        handleCustomDateChange(
                          "end",
                          date.toISOString().split("T")[0]
                        );
                      }
                    }}
                    locale={ko}
                    disabled={(date) => date > new Date()}
                  />
                </div>
              </div>

              {/* 선택된 범위 표시 */}
              <div className="pt-3 border-t border-slate-200 text-center text-sm text-slate-600">
                {period.customStart || dateRange.startDate} ~{" "}
                {period.customEnd || dateRange.endDate}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* 타임라인 바 */}
      <TimelineBar startDate={dateRange.startDate} endDate={dateRange.endDate} />
    </div>
  );
}
