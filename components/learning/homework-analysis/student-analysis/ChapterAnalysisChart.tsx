"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ChapterAnalysisData } from "./useStudentAnalysis";

interface ChapterAnalysisChartProps {
  data: ChapterAnalysisData[];
}

export default function ChapterAnalysisChart({ data }: ChapterAnalysisChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-bold text-slate-800 mb-4">소단원별 오답 분포</h3>
        <div className="text-center py-8 text-slate-400">
          분석할 데이터가 없습니다.
        </div>
      </div>
    );
  }

  // 오답 많은 순 정렬 (이미 hook에서 정렬됨)
  const sortedData = data;
  const maxWrong = Math.max(...sortedData.map((d) => d.wrongCount), 1);
  const totalWrong = sortedData.reduce((sum, d) => sum + d.wrongCount, 0);

  const getBarColor = (count: number) => {
    if (count >= 5) return "bg-red-500";
    if (count >= 3) return "bg-orange-500";
    return "bg-amber-400";
  };

  const getTextColor = (count: number) => {
    if (count >= 5) return "text-red-600";
    if (count >= 3) return "text-orange-600";
    return "text-amber-600";
  };

  // 가장 오답이 많은 단원
  const worstChapter = sortedData[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* 헤더 */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-bold text-slate-800">소단원별 오답 분포</h3>
        <span className="text-xs text-slate-500">{data.length}개 소단원 / 총 {totalWrong}문제</span>
      </div>

      {/* 차트 */}
      <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
        {sortedData.map((item, idx) => (
          <div key={idx} className="group">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-slate-700 flex-1 truncate">
                {item.littleChapter}
              </span>
              {item.percentage > 0 && (
                <span className="text-xs text-slate-400">
                  {item.percentage}%
                </span>
              )}
              <span className={cn("text-sm font-bold tabular-nums", getTextColor(item.wrongCount))}>
                {item.wrongCount}문제
              </span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  getBarColor(item.wrongCount)
                )}
                style={{ width: `${(item.wrongCount / maxWrong) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 인사이트 */}
      {worstChapter && worstChapter.wrongCount >= 3 && (
        <div className="px-5 py-3 bg-red-50 border-t border-red-100">
          <p className="text-sm text-red-700">
            <span className="font-medium">"{worstChapter.littleChapter}"</span> 단원 집중 보강 필요 ({worstChapter.wrongCount}문제 오답)
          </p>
        </div>
      )}
    </div>
  );
}
