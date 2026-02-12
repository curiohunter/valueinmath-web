"use client";

import React from "react";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DifficultyBreakdown } from "./useStudentAnalysis";

interface DifficultyBreakdownChartProps {
  data: DifficultyBreakdown[];
}

const LEVEL_COLORS: Record<number, { bar: string; text: string; bg: string }> = {
  1: { bar: "bg-sky-400", text: "text-sky-600", bg: "bg-sky-50" },
  2: { bar: "bg-emerald-400", text: "text-emerald-600", bg: "bg-emerald-50" },
  3: { bar: "bg-amber-400", text: "text-amber-600", bg: "bg-amber-50" },
  4: { bar: "bg-orange-500", text: "text-orange-600", bg: "bg-orange-50" },
  5: { bar: "bg-rose-500", text: "text-rose-600", bg: "bg-rose-50" },
};

export default function DifficultyBreakdownChart({ data }: DifficultyBreakdownChartProps) {
  const hasData = data.some((d) => d.wrongCount > 0);

  if (!hasData) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-indigo-500" />
          <h3 className="font-bold text-slate-800">난이도별 오답 분포</h3>
        </div>
        <div className="text-center py-8 text-slate-400">
          단원을 선택하면 난이도별 분석이 표시됩니다.
        </div>
      </div>
    );
  }

  const maxWrong = Math.max(...data.map((d) => d.wrongCount), 1);
  const totalWrong = data.reduce((sum, d) => sum + d.wrongCount, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-500" />
          <h3 className="font-bold text-slate-800">난이도별 오답 분포</h3>
        </div>
        <span className="text-xs text-slate-400">총 {totalWrong}문제</span>
      </div>

      <div className="p-5 space-y-3">
        {data.map((item) => {
          const colors = LEVEL_COLORS[item.level] || LEVEL_COLORS[3];
          return (
            <div key={item.level}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-600">{item.label}</span>
                <div className="flex items-center gap-2">
                  {item.wrongCount > 0 && (
                    <span
                      className={cn(
                        "text-xs font-medium px-1.5 py-0.5 rounded",
                        colors.bg, colors.text
                      )}
                    >
                      {item.percentage}%
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-sm font-bold tabular-nums",
                      item.wrongCount > 0 ? colors.text : "text-slate-300"
                    )}
                  >
                    {item.wrongCount > 0 ? `${item.wrongCount}문제` : "-"}
                  </span>
                </div>
              </div>

              <div className="h-6 bg-slate-100 rounded overflow-hidden">
                {item.wrongCount > 0 && (
                  <div
                    className={cn(
                      "h-full rounded transition-all duration-300",
                      colors.bar
                    )}
                    style={{ width: `${(item.wrongCount / maxWrong) * 100}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}

        <div className="mt-2 pt-3 border-t border-slate-100 text-xs text-slate-400">
          오답이 집중된 난이도를 확인하세요
        </div>
      </div>
    </div>
  );
}
