"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { TeacherInfo, ClassInfo, formatDate } from "./types";
import ManualHomeworkCollector from "./ManualHomeworkCollector";

interface HomeworkAnalysisHeaderProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  teachers: TeacherInfo[];
  selectedTeacherId: string;
  onTeacherChange: (teacherId: string) => void;
  todayClasses: ClassInfo[];
}

export default function HomeworkAnalysisHeader({
  selectedDate,
  onDateChange,
  teachers,
  selectedTeacherId,
  onTeacherChange,
  todayClasses,
}: HomeworkAnalysisHeaderProps) {
  const dateInfo = formatDate(selectedDate);
  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  const moveDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    onDateChange(current.toISOString().split("T")[0]);
  };

  const goToToday = () => {
    onDateChange(new Date().toISOString().split("T")[0]);
  };

  return (
    <div className="rounded-2xl bg-gradient-to-r from-slate-800 to-slate-700 p-5 shadow-xl space-y-3">
      {/* 1줄: 날짜(좌) + 컨트롤(우) 고정 */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black tracking-tight text-white">
            {dateInfo.month}/{dateInfo.day}
          </span>
          <span className="text-xl font-medium text-slate-300">
            {dateInfo.dayOfWeek}요일
          </span>
          {isToday && (
            <Badge className="ml-1 bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
              오늘
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <ManualHomeworkCollector />

          <Select value={selectedTeacherId} onValueChange={onTeacherChange}>
            <SelectTrigger className="w-[140px] bg-white/10 border-white/20 text-white text-sm">
              <SelectValue placeholder="선생님 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 선생님</SelectItem>
              {teachers.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} {t.position === "원장" ? "(원장)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => moveDate(-1)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              오늘
            </button>
            <button
              onClick={() => moveDate(1)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="ml-1 px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
        </div>
      </div>

      {/* 2줄: 수업 반 뱃지 */}
      <div className="flex items-center gap-2 pt-1 border-t border-white/10">
        <span className="text-xs text-slate-400 shrink-0">수업 반</span>
        {todayClasses.length > 0 ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            {todayClasses.map((c) => (
              <Badge
                key={c.id}
                variant="outline"
                className="bg-white/10 text-white border-white/20 text-xs font-medium"
              >
                {c.name}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-xs text-slate-500">해당 요일 수업 없음</span>
        )}
      </div>
    </div>
  );
}
