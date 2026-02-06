"use client";

import React from "react";
import { BookOpen, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { MaterialPerformance } from "./useStudentAnalysis";

interface MaterialPerformanceCardProps {
  data: MaterialPerformance[];
}

function getRateColor(rate: number): string {
  if (rate >= 85) return "text-emerald-600";
  if (rate >= 70) return "text-blue-600";
  if (rate >= 50) return "text-amber-600";
  return "text-red-600";
}

/** 교재 행: 문제수 강조, 정답률 보조 */
function WorkbookRow({ item }: { item: MaterialPerformance }) {
  return (
    <div className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-sm font-medium text-slate-800 truncate">{item.title}</span>
        {item.page && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 flex-shrink-0">
            p.{item.page}
          </span>
        )}
        {item.isHomework && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 flex-shrink-0">
            숙제
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2 ml-3 flex-shrink-0">
        <span className="text-sm font-bold text-slate-800 tabular-nums">
          {item.totalProblems}문제
        </span>
        <span className={cn("text-xs tabular-nums", getRateColor(item.correctRate))}>
          {item.correctRate}%
        </span>
      </div>
    </div>
  );
}

/** 학습지 행: 정답률 강조, 문제수 보조 */
function WorksheetRow({ item }: { item: MaterialPerformance }) {
  return (
    <div className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-sm font-medium text-slate-800 truncate">{item.title}</span>
        {item.isHomework && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 flex-shrink-0">
            숙제
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2 ml-3 flex-shrink-0">
        <span className="text-xs text-slate-500 tabular-nums">
          {item.totalProblems}문제
        </span>
        <span className={cn("text-sm font-bold tabular-nums w-10 text-right", getRateColor(item.correctRate))}>
          {item.correctRate}%
        </span>
      </div>
    </div>
  );
}

const MAX_ITEMS = 8;

export default function MaterialPerformanceCard({ data }: MaterialPerformanceCardProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-blue-500" />
          <h3 className="font-bold text-slate-800">교재/학습지 성적</h3>
        </div>
        <div className="text-center py-8 text-slate-400">데이터가 없습니다.</div>
      </div>
    );
  }

  const workbooks = data.filter((d) => d.workType === "WORKBOOK");
  const worksheets = data.filter((d) => d.workType === "WORKSHEET");

  return (
    <div className="space-y-4">
      {/* 교재 섹션 - 문제수 중심 */}
      {workbooks.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              <h3 className="font-bold text-slate-800">교재 학습 현황</h3>
            </div>
            <span className="text-xs text-slate-400">{workbooks.length}개</span>
          </div>
          <div className="divide-y divide-slate-50">
            {workbooks.slice(0, MAX_ITEMS).map((item, idx) => (
              <WorkbookRow key={idx} item={item} />
            ))}
          </div>
          {workbooks.length > MAX_ITEMS && (
            <div className="px-5 py-2 text-center text-xs text-slate-400 border-t border-slate-100">
              외 {workbooks.length - MAX_ITEMS}개 교재
            </div>
          )}
        </div>
      )}

      {/* 학습지 섹션 - 정답률 중심 */}
      {worksheets.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-violet-500" />
              <h3 className="font-bold text-slate-800">학습지 성적</h3>
            </div>
            <span className="text-xs text-slate-400">{worksheets.length}개</span>
          </div>
          <div className="divide-y divide-slate-50">
            {worksheets.slice(0, MAX_ITEMS).map((item, idx) => (
              <WorksheetRow key={idx} item={item} />
            ))}
          </div>
          {worksheets.length > MAX_ITEMS && (
            <div className="px-5 py-2 text-center text-xs text-slate-400 border-t border-slate-100">
              외 {worksheets.length - MAX_ITEMS}개 학습지
            </div>
          )}
        </div>
      )}
    </div>
  );
}
