"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookOpen, Target, CalendarDays, TrendingUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStudentAnalysis } from "@/components/learning/homework-analysis/student-analysis/useStudentAnalysis";
import { PeriodSelector } from "@/components/learning/homework-analysis/student-analysis";
import { MaterialPerformanceCard } from "@/components/learning/homework-analysis/student-analysis";
import { SelfStudyAnalysisCard } from "@/components/learning/homework-analysis/student-analysis";
import { HomeworkProgressCard } from "@/components/learning/homework-analysis/student-analysis";
import type { PeriodSelection } from "@/components/learning/homework-analysis/types";

interface StudentLearningModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  mathflatStudentId: string;
}

const DEFAULT_PERIOD: PeriodSelection = {
  type: "preset",
  preset: 30,
  customStart: null,
  customEnd: null,
};

const EMPTY_CHAPTER_SELECTION = {
  curriculum: null as string | null,
  bigChapters: [] as string[],
  middleChapters: [] as string[],
  littleChapters: [] as string[],
};

function getPeriodLabel(period: PeriodSelection): string {
  if (period.type === "custom" && period.customStart && period.customEnd) {
    return `${period.customStart} ~ ${period.customEnd}`;
  }
  if (period.preset === "all") return "전체 기간";
  return `최근 ${period.preset}일`;
}

export default function StudentLearningModal({
  isOpen,
  onClose,
  studentName,
  mathflatStudentId,
}: StudentLearningModalProps) {
  const [period, setPeriod] = useState<PeriodSelection>(DEFAULT_PERIOD);

  const {
    activitySummary,
    materialPerformance,
    selfStudyAnalysis,
    homeworkProgress,
    isLoading,
    error,
  } = useStudentAnalysis({
    mathflatStudentId: isOpen ? mathflatStudentId : null,
    chapterSelection: EMPTY_CHAPTER_SELECTION,
    period,
  });

  const periodLabel = getPeriodLabel(period);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{studentName} 학습 분석</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pb-6">
          {/* 기간 선택 */}
          <div className="px-6 pt-6">
            <PeriodSelector period={period} onPeriodChange={setPeriod} />
          </div>

          {/* 로딩 */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-slate-500 text-sm">분석 데이터를 불러오는 중...</p>
            </div>
          )}

          {/* 에러 */}
          {!isLoading && error && (
            <div className="px-6 py-8 text-center">
              <div className="text-red-500 mb-2">오류가 발생했습니다</div>
              <p className="text-slate-500 text-sm">{error}</p>
            </div>
          )}

          {/* 데이터 없음 */}
          {!isLoading && !error && activitySummary.totalProblems === 0 && (
            <div className="px-6 py-12 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <CalendarDays className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-2">
                학습 기록이 없습니다
              </h3>
              <p className="text-slate-500 text-sm">
                선택한 기간에 학습 기록이 없습니다. 기간을 넓혀보세요.
              </p>
            </div>
          )}

          {/* 분석 결과 */}
          {!isLoading && !error && activitySummary.totalProblems > 0 && (
            <div className="space-y-4 px-6">
              {/* 학습 활동 요약 */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4">
                  <h3 className="font-bold text-white text-lg">
                    {studentName} 학습 분석
                  </h3>
                  <p className="text-slate-300 text-sm mt-0.5">{periodLabel}</p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-5 divide-x divide-y lg:divide-y-0 divide-slate-100">
                  <StatCell
                    icon={BookOpen}
                    label="총 풀이"
                    value={`${activitySummary.totalProblems}문제`}
                    color="text-blue-600"
                    bgColor="bg-blue-50"
                  />
                  <StatCell
                    icon={Target}
                    label="정답률"
                    value={`${activitySummary.overallCorrectRate}%`}
                    color={activitySummary.overallCorrectRate >= 70 ? "text-emerald-600" : activitySummary.overallCorrectRate >= 50 ? "text-amber-600" : "text-red-600"}
                    bgColor={activitySummary.overallCorrectRate >= 70 ? "bg-emerald-50" : activitySummary.overallCorrectRate >= 50 ? "bg-amber-50" : "bg-red-50"}
                  />
                  <StatCell
                    icon={CalendarDays}
                    label="학습일"
                    value={`${activitySummary.totalDays}일`}
                    color="text-violet-600"
                    bgColor="bg-violet-50"
                  />
                  <StatCell
                    icon={TrendingUp}
                    label="일평균"
                    value={`${activitySummary.dailyAverage}문제`}
                    color="text-indigo-600"
                    bgColor="bg-indigo-50"
                  />
                  <StatCell
                    icon={BookOpen}
                    label="숙제/자율"
                    value={`${activitySummary.homeworkRatio}% / ${100 - activitySummary.homeworkRatio}%`}
                    color="text-slate-600"
                    bgColor="bg-slate-50"
                  />
                </div>
              </div>

              <MaterialPerformanceCard data={materialPerformance} />
              <SelfStudyAnalysisCard data={selfStudyAnalysis} />
              <HomeworkProgressCard data={homeworkProgress} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatCell({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="p-4 flex items-center gap-3">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", bgColor)}>
        <Icon className={cn("w-5 h-5", color)} />
      </div>
      <div>
        <div className={cn("text-xl font-bold", color)}>{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}
