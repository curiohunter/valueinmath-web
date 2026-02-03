"use client";

import React from "react";
import { CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChapterAnalysisData } from "./useStudentAnalysis";

interface ChapterAnalysisChartProps {
  data: ChapterAnalysisData[];
}

export default function ChapterAnalysisChart({ data }: ChapterAnalysisChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-bold text-slate-800 mb-4">소단원별 정답률</h3>
        <div className="text-center py-8 text-slate-400">
          분석할 데이터가 없습니다.
        </div>
      </div>
    );
  }

  // 정답률 기준 정렬 (낮은 순)
  const sortedData = [...data].sort((a, b) => a.correctRate - b.correctRate);

  const getStatusIcon = (status: "good" | "warning" | "critical") => {
    switch (status) {
      case "good":
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case "critical":
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getBarColor = (rate: number) => {
    if (rate >= 70) return "bg-emerald-500";
    if (rate >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  const getTextColor = (rate: number) => {
    if (rate >= 70) return "text-emerald-600";
    if (rate >= 50) return "text-amber-600";
    return "text-red-600";
  };

  // 가장 취약한 단원 찾기
  const weakestChapter = sortedData[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* 헤더 */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-bold text-slate-800">소단원별 정답률</h3>
        <span className="text-xs text-slate-500">{data.length}개 소단원</span>
      </div>

      {/* 차트 */}
      <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
        {sortedData.map((item, idx) => (
          <div key={idx} className="group">
            <div className="flex items-center gap-2 mb-1">
              {getStatusIcon(item.status)}
              <span className="text-sm font-medium text-slate-700 flex-1 truncate">
                {item.littleChapter}
              </span>
              <span className={cn("text-sm font-bold tabular-nums", getTextColor(item.correctRate))}>
                {item.correctRate}%
              </span>
              <span className="text-xs text-slate-400">({item.totalProblems}문제)</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  getBarColor(item.correctRate)
                )}
                style={{ width: `${item.correctRate}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 인사이트 */}
      {weakestChapter && weakestChapter.correctRate < 50 && (
        <div className="px-5 py-3 bg-red-50 border-t border-red-100">
          <p className="text-sm text-red-700">
            <span className="font-medium">"{weakestChapter.littleChapter}"</span> 단원 집중 보강 필요
          </p>
        </div>
      )}
    </div>
  );
}
