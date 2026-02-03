"use client";

import React from "react";
import { BookOpen, Target, AlertTriangle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnalysisOverviewData } from "./useStudentAnalysis";

interface AnalysisOverviewProps {
  data: AnalysisOverviewData;
  studentName: string;
  curriculum: string;
  periodLabel: string;
}

export default function AnalysisOverview({
  data,
  studentName,
  curriculum,
  periodLabel,
}: AnalysisOverviewProps) {
  const stats = [
    {
      label: "범위 내 풀이",
      value: `${data.totalProblems}문제`,
      icon: BookOpen,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "정답률",
      value: `${data.correctRate}%`,
      icon: Target,
      color:
        data.correctRate >= 70
          ? "text-emerald-600"
          : data.correctRate >= 50
          ? "text-amber-600"
          : "text-red-600",
      bgColor:
        data.correctRate >= 70
          ? "bg-emerald-50"
          : data.correctRate >= 50
          ? "bg-amber-50"
          : "bg-red-50",
    },
    {
      label: "취약 개념",
      value: `${data.weakConceptCount}개`,
      icon: AlertTriangle,
      color: data.weakConceptCount > 0 ? "text-orange-600" : "text-slate-600",
      bgColor: data.weakConceptCount > 0 ? "bg-orange-50" : "bg-slate-50",
    },
    {
      label: "정답/오답",
      value: `${data.correctCount}/${data.wrongCount}`,
      icon: TrendingUp,
      color: "text-violet-600",
      bgColor: "bg-violet-50",
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4">
        <h3 className="font-bold text-white text-lg">{studentName} 학습 분석</h3>
        <p className="text-slate-300 text-sm mt-0.5">
          {curriculum} • {periodLabel}
        </p>
      </div>

      {/* 통계 그리드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-100">
        {stats.map((stat, idx) => (
          <div key={idx} className="p-4 flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.bgColor)}>
              <stat.icon className={cn("w-5 h-5", stat.color)} />
            </div>
            <div>
              <div className={cn("text-xl font-bold", stat.color)}>{stat.value}</div>
              <div className="text-xs text-slate-500">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 정답률 바 */}
      <div className="px-5 pb-4">
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              data.correctRate >= 70
                ? "bg-emerald-500"
                : data.correctRate >= 50
                ? "bg-amber-500"
                : "bg-red-500"
            )}
            style={{ width: `${data.correctRate}%` }}
          />
        </div>
      </div>
    </div>
  );
}
