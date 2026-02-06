"use client";

import React from "react";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DifficultyBreakdown } from "./useStudentAnalysis";

interface DifficultyBreakdownChartProps {
  data: DifficultyBreakdown[];
}

const LEVEL_COLORS: Record<number, { bar: string; text: string }> = {
  1: { bar: "bg-sky-400", text: "text-sky-600" },
  2: { bar: "bg-emerald-400", text: "text-emerald-600" },
  3: { bar: "bg-amber-400", text: "text-amber-600" },
  4: { bar: "bg-orange-500", text: "text-orange-600" },
  5: { bar: "bg-rose-500", text: "text-rose-600" },
};

export default function DifficultyBreakdownChart({ data }: DifficultyBreakdownChartProps) {
  const hasData = data.some((d) => d.total > 0);

  if (!hasData) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-indigo-500" />
          <h3 className="font-bold text-slate-800">난이도별 정답률</h3>
        </div>
        <div className="text-center py-8 text-slate-400">
          단원을 선택하면 난이도별 분석이 표시됩니다.
        </div>
      </div>
    );
  }

  const maxTotal = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-indigo-500" />
        <h3 className="font-bold text-slate-800">난이도별 정답률</h3>
      </div>

      <div className="p-5 space-y-3">
        {data.map((item) => {
          const colors = LEVEL_COLORS[item.level] || LEVEL_COLORS[3];
          return (
            <div key={item.level}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-600">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{item.total}문제</span>
                  <span
                    className={cn(
                      "text-sm font-bold tabular-nums",
                      item.total > 0
                        ? item.correctRate >= 70 ? "text-emerald-600" :
                          item.correctRate >= 50 ? "text-amber-600" : "text-red-600"
                        : "text-slate-300"
                    )}
                  >
                    {item.total > 0 ? `${item.correctRate}%` : "-"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* 문제 수 바 */}
                <div className="flex-1 h-6 bg-slate-100 rounded overflow-hidden relative">
                  {item.total > 0 && (
                    <>
                      {/* 전체 문제 수 바 */}
                      <div
                        className={cn("h-full rounded transition-all duration-300 opacity-30", colors.bar)}
                        style={{ width: `${(item.total / maxTotal) * 100}%` }}
                      />
                      {/* 정답 수 바 */}
                      <div
                        className={cn("absolute top-0 left-0 h-full rounded transition-all duration-300", colors.bar)}
                        style={{ width: `${(item.correct / maxTotal) * 100}%` }}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* 범례 */}
        <div className="flex items-center gap-4 mt-2 pt-3 border-t border-slate-100 text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 bg-slate-400 rounded-sm" />
            <span>정답</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 bg-slate-400 rounded-sm opacity-30" />
            <span>전체</span>
          </div>
        </div>
      </div>
    </div>
  );
}
