"use client";

import React, { useCallback, useEffect, useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClassInfo } from "../types";

interface Student {
  mathflat_student_id: string;
  student_name: string;
  // 선택적: 최근 성적 데이터
  recentCorrectRate?: number;
  recentTrend?: "up" | "down" | "stable";
}

interface StudentSelectorProps {
  classes: ClassInfo[];
  selectedClassId: string | null;
  onClassChange: (classId: string | null) => void;
  students: Student[];
  selectedStudentId: string | null;
  onStudentChange: (studentId: string | null) => void;
  isLoading?: boolean;
}

// 미니 트렌드 인디케이터
function TrendIndicator({ trend }: { trend?: "up" | "down" | "stable" }) {
  if (!trend) return null;

  const styles = {
    up: "text-emerald-500",
    down: "text-red-500",
    stable: "text-slate-400",
  };

  const icons = {
    up: "↗",
    down: "↘",
    stable: "→",
  };

  return (
    <span className={cn("text-xs font-bold", styles[trend])}>
      {icons[trend]}
    </span>
  );
}

// 성적 미니 바
function MiniScoreBar({ rate }: { rate?: number }) {
  if (rate === undefined) return null;

  const getColor = (r: number) => {
    if (r >= 80) return "bg-emerald-500";
    if (r >= 60) return "bg-blue-500";
    if (r >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="w-8 h-1 bg-slate-200 rounded-full overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all", getColor(rate))}
        style={{ width: `${rate}%` }}
      />
    </div>
  );
}

export default function StudentSelector({
  classes,
  selectedClassId,
  onClassChange,
  students,
  selectedStudentId,
  onStudentChange,
  isLoading,
}: StudentSelectorProps) {
  const chipsContainerRef = useRef<HTMLDivElement>(null);
  const selectedChipRef = useRef<HTMLButtonElement>(null);

  // 선택된 학생의 인덱스
  const selectedIndex = students.findIndex(
    (s) => s.mathflat_student_id === selectedStudentId
  );

  // 키보드 네비게이션
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedStudentId || students.length === 0) return;

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const direction = e.key === "ArrowLeft" ? -1 : 1;
        const newIndex = selectedIndex + direction;

        if (newIndex >= 0 && newIndex < students.length) {
          onStudentChange(students[newIndex].mathflat_student_id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedStudentId, selectedIndex, students, onStudentChange]);

  // 선택된 학생 칩으로 스크롤
  useEffect(() => {
    if (selectedChipRef.current && chipsContainerRef.current) {
      selectedChipRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [selectedStudentId]);

  // 이전/다음 학생
  const goToPrevStudent = useCallback(() => {
    if (selectedIndex > 0) {
      onStudentChange(students[selectedIndex - 1].mathflat_student_id);
    }
  }, [selectedIndex, students, onStudentChange]);

  const goToNextStudent = useCallback(() => {
    if (selectedIndex < students.length - 1) {
      onStudentChange(students[selectedIndex + 1].mathflat_student_id);
    }
  }, [selectedIndex, students, onStudentChange]);

  return (
    <div className="space-y-4">
      {/* 반 선택 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-slate-500">
          <Users className="w-4 h-4" />
          <span className="text-sm font-medium">반</span>
        </div>
        <Select
          value={selectedClassId || ""}
          onValueChange={(v) => onClassChange(v || null)}
        >
          <SelectTrigger className="w-[200px] bg-white">
            <SelectValue placeholder="반을 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 학생 선택 */}
      {selectedClassId && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">학생</span>
            {students.length > 0 && (
              <span className="text-xs text-slate-400">
                ← → 키로 이동 가능
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-10 w-20 bg-slate-200 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : students.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-sm bg-slate-50 rounded-xl">
              이 반에 등록된 학생이 없습니다
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* 이전 버튼 */}
              <button
                onClick={goToPrevStudent}
                disabled={selectedIndex <= 0}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  selectedIndex > 0
                    ? "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    : "text-slate-300 cursor-not-allowed"
                )}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* 학생 칩들 */}
              <div
                ref={chipsContainerRef}
                className="flex-1 overflow-x-auto scrollbar-none"
              >
                <div className="flex gap-2 py-1">
                  {students.map((student) => {
                    const isSelected =
                      student.mathflat_student_id === selectedStudentId;

                    return (
                      <button
                        key={student.mathflat_student_id}
                        ref={isSelected ? selectedChipRef : null}
                        onClick={() =>
                          onStudentChange(student.mathflat_student_id)
                        }
                        className={cn(
                          "relative flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium",
                          "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2",
                          isSelected
                            ? "bg-slate-800 text-white shadow-lg scale-105 focus:ring-slate-400"
                            : "bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 focus:ring-slate-300"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span>{student.student_name}</span>
                          <TrendIndicator trend={student.recentTrend} />
                        </div>
                        {/* 하단 미니 스코어 바 */}
                        {student.recentCorrectRate !== undefined && (
                          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2">
                            <MiniScoreBar rate={student.recentCorrectRate} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 다음 버튼 */}
              <button
                onClick={goToNextStudent}
                disabled={selectedIndex >= students.length - 1}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  selectedIndex < students.length - 1
                    ? "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    : "text-slate-300 cursor-not-allowed"
                )}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 현재 선택 표시 */}
          {selectedStudentId && students.length > 0 && (
            <div className="text-center text-xs text-slate-400">
              {selectedIndex + 1} / {students.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
