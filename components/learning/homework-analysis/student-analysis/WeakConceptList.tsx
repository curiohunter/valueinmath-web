"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { WeakConceptData } from "./useStudentAnalysis";

interface WeakConceptListProps {
  data: WeakConceptData[];
}

export default function WeakConceptList({ data }: WeakConceptListProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <h3 className="font-bold text-slate-800">취약 개념</h3>
        </div>
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-100 flex items-center justify-center">
            <span className="text-2xl">&#x1F389;</span>
          </div>
          <p className="text-emerald-600 font-medium">오답 데이터가 없습니다!</p>
          <p className="text-slate-400 text-sm mt-1">선택한 단원에서 틀린 문제가 없습니다</p>
        </div>
      </div>
    );
  }

  const maxWrong = Math.max(...data.map((d) => d.wrongCount), 1);

  const getWrongColor = (count: number) => {
    if (count >= 5) return "text-red-600 bg-red-50";
    if (count >= 3) return "text-orange-600 bg-orange-50";
    return "text-amber-600 bg-amber-50";
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* 헤더 */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-orange-500" />
        <h3 className="font-bold text-slate-800">취약 개념</h3>
        <span className="text-xs text-slate-500">(오답 많은 순)</span>
      </div>

      {/* 목록 */}
      <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
        {data.map((item, idx) => (
          <div
            key={item.conceptId}
            className="px-5 py-3 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-start gap-3">
              {/* 순위 */}
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-slate-600">{idx + 1}</span>
              </div>

              {/* 개념 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800 text-sm truncate">
                    {item.conceptName}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {item.littleChapter}
                </div>
              </div>

              {/* 오답 수 */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-400 rounded-full transition-all duration-300"
                    style={{ width: `${(item.wrongCount / maxWrong) * 100}%` }}
                  />
                </div>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-bold tabular-nums",
                    getWrongColor(item.wrongCount)
                  )}
                >
                  {item.wrongCount}문제
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 하단 인사이트 */}
      <div className="px-5 py-3 bg-amber-50 border-t border-amber-100">
        <p className="text-sm text-amber-700">
          오답이 많은 개념부터 순차적으로 복습하세요
        </p>
      </div>
    </div>
  );
}
