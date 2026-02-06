"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Bookmark, ChevronRight, Loader2, School, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { ChapterSelection } from "../types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";

interface School {
  id: string;
  name: string;
  school_type: string;
}

interface ExamRange {
  id: string;
  school_id: string;
  school: School;
  grade: number;
  exam_year: number;
  semester: number;
  exam_type: string;
  curriculum_key: string;
  big_chapters: string[];
  middle_chapters: string[];
  little_chapters: string[];
}

interface SavedRangesSelectorProps {
  selection: ChapterSelection;
  onSelectionChange: (selection: ChapterSelection) => void;
  disabled?: boolean;
  // 학생 정보 (학교/학년 기반 추천용)
  studentSchoolId?: string | null;
  studentGrade?: number | null;
}

const CURRENT_YEAR = new Date().getFullYear();

export default function SavedRangesSelector({
  selection,
  onSelectionChange,
  disabled,
  studentSchoolId,
  studentGrade,
}: SavedRangesSelectorProps) {
  const supabase = createClient();

  const [examRanges, setExamRanges] = useState<ExamRange[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Load exam ranges with school join
  const loadExamRanges = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("school_exam_ranges")
        .select(`
          *,
          school:schools!inner(id, name, school_type)
        `)
        .eq("exam_year", CURRENT_YEAR)
        .order("grade", { ascending: true })
        .order("semester", { ascending: true });

      if (error) throw error;
      setExamRanges((data as ExamRange[]) || []);
    } catch (err) {
      console.error("시험 범위 로드 실패:", err);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadExamRanges();
  }, [loadExamRanges]);

  // Group by school
  const groupedRanges = useMemo(() => {
    const groups = new Map<string, ExamRange[]>();

    // 학생 학교가 있으면 우선 표시
    if (studentSchoolId && studentGrade) {
      const studentRanges = examRanges.filter(
        (r) => r.school_id === studentSchoolId && r.grade === studentGrade
      );
      if (studentRanges.length > 0) {
        const schoolName = studentRanges[0].school?.name || "학교";
        groups.set(`⭐ ${schoolName} ${studentGrade}학년`, studentRanges);
      }
    }

    // 나머지 학교별 그룹화
    examRanges.forEach((r) => {
      // 이미 학생 학교로 추가된 경우 스킵
      if (studentSchoolId && r.school_id === studentSchoolId && r.grade === studentGrade) {
        return;
      }
      const schoolName = r.school?.name || "알 수 없는 학교";
      const key = `${schoolName} ${r.grade}학년`;
      const existing = groups.get(key) || [];
      existing.push(r);
      groups.set(key, existing);
    });

    return groups;
  }, [examRanges, studentSchoolId, studentGrade]);

  // Load range
  const handleLoad = (range: ExamRange) => {
    onSelectionChange({
      curriculum: range.curriculum_key,
      bigChapters: range.big_chapters,
      middleChapters: range.middle_chapters,
      littleChapters: range.little_chapters,
    });
    setIsOpen(false);
    const schoolName = range.school?.name || "학교";
    toast.success(
      `${schoolName} ${range.grade}학년 ${range.semester}학기 ${range.exam_type} 범위를 불러왔습니다`
    );
  };

  const hasRanges = examRanges.length > 0;
  const hasStudentMatch =
    studentSchoolId &&
    studentGrade &&
    examRanges.some(
      (r) => r.school_id === studentSchoolId && r.grade === studentGrade
    );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "gap-1.5 text-xs bg-white/90 border-white/50 hover:bg-white",
            hasStudentMatch && "border-yellow-300 bg-yellow-50"
          )}
        >
          <Bookmark className="w-3.5 h-3.5" />
          시험 범위
          {hasStudentMatch && (
            <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-medium">
              추천
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <School className="w-4 h-4 text-slate-500" />
            <h4 className="font-semibold text-slate-800 text-sm">학교 시험 범위</h4>
          </div>
          <Link
            href="/learning/school-exams?tab=ranges"
            className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            관리
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
              로드 중...
            </div>
          ) : !hasRanges ? (
            <div className="py-8 text-center">
              <School className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-slate-500 text-sm mb-3">
                등록된 시험 범위가 없습니다
              </p>
              <Link href="/learning/school-exams?tab=ranges">
                <Button variant="outline" size="sm" className="text-xs">
                  시험 범위 등록하기
                </Button>
              </Link>
            </div>
          ) : (
            <div className="p-2">
              {Array.from(groupedRanges.entries()).map(([schoolKey, ranges]) => (
                <div key={schoolKey} className="mb-3 last:mb-0">
                  <div className="text-xs font-medium text-slate-500 px-2 py-1">
                    {schoolKey}
                  </div>
                  <div className="space-y-1">
                    {ranges.map((range) => (
                      <button
                        key={range.id}
                        onClick={() => handleLoad(range)}
                        className={cn(
                          "w-full flex items-center justify-between p-2 rounded-lg text-left",
                          "hover:bg-indigo-50 transition-colors group"
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                              {range.semester}학기 {range.exam_type}
                            </span>
                            <span className="text-xs text-slate-500">
                              {range.curriculum_key}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 truncate">
                            {range.big_chapters.join(", ")}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
