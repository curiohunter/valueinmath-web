"use client";

import React, { useMemo } from "react";
import { Activity, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { PatternData } from "./useStudentAnalysis";

interface LearningPatternCardProps {
  data: PatternData;
}

const DAY_ORDER = ["월", "화", "수", "목", "금", "토", "일"];
const LEVEL_LABELS: Record<number, string> = {
  1: "Lv1 기본",
  2: "Lv2 표준",
  3: "Lv3 발전",
  4: "Lv4 심화",
  5: "Lv5 최고",
};
const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  CUSTOM: { label: "숙제", color: "bg-blue-500" },
  CHALLENGE: { label: "AI 추천", color: "bg-purple-500" },
  CHALLENGE_WRONG: { label: "오답 재풀이", color: "bg-orange-500" },
};

export default function LearningPatternCard({ data }: LearningPatternCardProps) {
  // 요일별 데이터 정렬
  const dayOfWeekData = useMemo(() => {
    return DAY_ORDER.map((day) => ({
      day,
      total: data.byDayOfWeek[day]?.total || 0,
      correct: data.byDayOfWeek[day]?.correct || 0,
    }));
  }, [data.byDayOfWeek]);

  const maxDayTotal = Math.max(...dayOfWeekData.map((d) => d.total), 1);

  // 난이도별 데이터
  const levelData = useMemo(() => {
    return [1, 2, 3, 4, 5].map((level) => {
      const stats = data.byLevel[level] || { total: 0, correct: 0 };
      return {
        level,
        label: LEVEL_LABELS[level],
        total: stats.total,
        correct: stats.correct,
        correctRate: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      };
    });
  }, [data.byLevel]);

  // 카테고리별 데이터
  const categoryData = useMemo(() => {
    const total = Object.values(data.byCategory).reduce((sum, v) => sum + v, 0);
    return Object.entries(data.byCategory)
      .filter(([_, count]) => count > 0)
      .map(([category, count]) => ({
        category,
        label: CATEGORY_LABELS[category]?.label || category,
        color: CATEGORY_LABELS[category]?.color || "bg-slate-500",
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [data.byCategory]);

  // 인사이트 생성
  const insights = useMemo(() => {
    const result: string[] = [];

    // 가장 많이 푼 요일
    const maxDay = dayOfWeekData.reduce((max, d) => (d.total > max.total ? d : max), dayOfWeekData[0]);
    if (maxDay.total > 0) {
      result.push(`${maxDay.day}요일 집중 학습 패턴`);
    }

    // 주말 학습량
    const weekendTotal = (data.byDayOfWeek["토"]?.total || 0) + (data.byDayOfWeek["일"]?.total || 0);
    const weekdayTotal = DAY_ORDER.slice(0, 5).reduce((sum, day) => sum + (data.byDayOfWeek[day]?.total || 0), 0);
    if (weekendTotal < weekdayTotal * 0.2 && weekendTotal > 0) {
      result.push("주말 학습량 저조");
    }

    // 고난도 정답률
    const highLevelStats = levelData.filter((l) => l.level >= 4);
    const highLevelAvg =
      highLevelStats.reduce((sum, l) => sum + l.correctRate * l.total, 0) /
      Math.max(highLevelStats.reduce((sum, l) => sum + l.total, 0), 1);
    if (highLevelAvg < 50 && highLevelStats.some((l) => l.total > 0)) {
      result.push("고난도(Lv4+) 추가 연습 권장");
    }

    return result;
  }, [dayOfWeekData, data.byDayOfWeek, levelData]);

  const hasData =
    dayOfWeekData.some((d) => d.total > 0) ||
    levelData.some((l) => l.total > 0) ||
    categoryData.length > 0;

  if (!hasData) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-violet-500" />
          <h3 className="font-bold text-slate-800">학습 패턴</h3>
        </div>
        <div className="text-center py-8 text-slate-400">분석할 데이터가 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* 헤더 */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <Activity className="w-5 h-5 text-violet-500" />
        <h3 className="font-bold text-slate-800">학습 패턴</h3>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 요일별 학습량 */}
        <div>
          <h4 className="text-sm font-medium text-slate-600 mb-3">요일별 학습량</h4>
          <div className="space-y-2">
            {dayOfWeekData.map(({ day, total }) => (
              <div key={day} className="flex items-center gap-2">
                <span className="w-6 text-xs text-slate-500">{day}</span>
                <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded transition-all duration-300"
                    style={{ width: `${(total / maxDayTotal) * 100}%` }}
                  />
                </div>
                <span className="w-12 text-xs text-slate-600 text-right tabular-nums">
                  {total}문제
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 난이도별 정답률 */}
        <div>
          <h4 className="text-sm font-medium text-slate-600 mb-3">난이도별 정답률</h4>
          <div className="space-y-2">
            {levelData.map(({ level, label, total, correctRate }) => (
              <div key={level} className="flex items-center gap-2">
                <span className="w-16 text-xs text-slate-500 truncate">{label}</span>
                <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded transition-all duration-300",
                      correctRate >= 70
                        ? "bg-emerald-500"
                        : correctRate >= 50
                        ? "bg-amber-500"
                        : total > 0
                        ? "bg-red-500"
                        : "bg-slate-200"
                    )}
                    style={{ width: total > 0 ? `${correctRate}%` : "0%" }}
                  />
                </div>
                <span
                  className={cn(
                    "w-10 text-xs text-right tabular-nums font-medium",
                    total === 0
                      ? "text-slate-300"
                      : correctRate >= 70
                      ? "text-emerald-600"
                      : correctRate >= 50
                      ? "text-amber-600"
                      : "text-red-600"
                  )}
                >
                  {total > 0 ? `${correctRate}%` : "-"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 학습 유형 분포 */}
        {categoryData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-600 mb-3">학습 유형 분포</h4>
            <div className="space-y-2">
              {categoryData.map(({ category, label, color, count, percentage }) => (
                <div key={category} className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", color)} />
                  <span className="w-20 text-xs text-slate-600">{label}</span>
                  <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden">
                    <div
                      className={cn("h-full rounded transition-all duration-300", color)}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-10 text-xs text-slate-600 text-right tabular-nums">
                    {percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 인사이트 */}
        {insights.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-600 mb-3">인사이트</h4>
            <div className="bg-slate-50 rounded-xl p-3 space-y-2">
              {insights.map((insight, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-slate-600">{insight}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
